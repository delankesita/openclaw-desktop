import * as fs from 'fs';
import { Instance, InstanceStatus, InstanceHealth, InstanceConfig, InstanceTemplate, ChannelConfig } from './types';
import { ConfigManager } from './config';
import { ProcessManager } from './process';
import { templates, getTemplate } from './templates';

export { Instance, InstanceStatus, InstanceHealth, InstanceConfig, InstanceTemplate, ChannelConfig };
export { ConfigManager, ProcessManager, templates, getTemplate };

export class OpenClawManager {
  private config: ConfigManager;
  private process: ProcessManager;
  private onChangeCallbacks: (() => void)[] = [];

  constructor(stateDir?: string) {
    this.config = new ConfigManager(stateDir);
    this.process = new ProcessManager(this.config);
    
    this.config.onChange(() => this.notifyChange());
    this.process.onChange(() => this.notifyChange());
  }

  onChange(callback: () => void): void {
    this.onChangeCallbacks.push(callback);
  }

  private notifyChange(): void {
    this.onChangeCallbacks.forEach(cb => cb());
  }

  // Instance Management
  async create(options?: { name?: string; port?: number; template?: string; model?: string }): Promise<Instance | undefined> {
    let templateId = options?.template;
    if (!templateId) {
      templateId = 'basic';
    }

    const template = getTemplate(templateId);
    if (!template) return;

    const name = options?.name || `shrimp-${Date.now()}`;
    const id = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const usedPorts = new Set(this.config.getInstances().map(i => i.port));
    const port = options?.port || await this.process.findAvailablePort(5000, usedPorts);

    const model = options?.model;

    const stateDir = this.config.getInstanceStateDir(id);
    fs.mkdirSync(stateDir, { recursive: true });

    const openclawConfig = this.generateConfig(template, port, model);
    this.config.writeOpenClawConfig(stateDir, openclawConfig);

    const instance = this.config.createInstance({
      id,
      name,
      port,
      stateDir,
      model,
      channels: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return instance;
  }

  async delete(id: string): Promise<boolean> {
    const instance = this.config.getInstance(id);
    if (!instance) return false;

    if (instance.status === InstanceStatus.Running) {
      await this.process.stop(instance);
    }

    const instanceDir = require('path').dirname(instance.stateDir);
    if (fs.existsSync(instanceDir)) {
      fs.rmSync(instanceDir, { recursive: true, force: true });
    }

    return this.config.deleteInstance(id);
  }

  async clone(id: string, newName?: string): Promise<Instance | undefined> {
    const source = this.config.getInstance(id);
    if (!source) return;

    const name = newName || `${source.name}-clone`;
    const newId = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const usedPorts = new Set(this.config.getInstances().map(i => i.port));
    const port = await this.process.findAvailablePort(source.port + 1, usedPorts);

    const stateDir = this.config.getInstanceStateDir(newId);
    fs.mkdirSync(stateDir, { recursive: true });

    if (fs.existsSync(source.stateDir)) {
      fs.cpSync(source.stateDir, stateDir, { recursive: true });
    }

    const config = this.config.readOpenClawConfig(stateDir);
    if (config) {
      (config.gateway as Record<string, unknown>).port = port;
      this.config.writeOpenClawConfig(stateDir, config);
    }

    return this.config.createInstance({
      id: newId,
      name,
      port,
      stateDir,
      model: source.model,
      channels: { ...source.channels },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Process Control
  async start(id: string): Promise<void> {
    const instance = this.config.getInstance(id);
    if (!instance) throw new Error('Instance not found');
    await this.process.start(instance);
  }

  async stop(id: string): Promise<void> {
    const instance = this.config.getInstance(id);
    if (!instance) return;
    await this.process.stop(instance);
  }

  async restart(id: string): Promise<void> {
    const instance = this.config.getInstance(id);
    if (!instance) return;
    await this.process.restart(instance);
  }

  async healthCheck(id: string): Promise<InstanceHealth | undefined> {
    const instance = this.config.getInstance(id);
    if (!instance) return;
    return this.process.healthCheck(instance);
  }

  // Configuration
  openConfig(id: string): void {
    const instance = this.config.getInstance(id);
    if (!instance) return;
    const configPath = require('path').join(instance.stateDir, 'openclaw.json');
    console.log(`Config file: ${configPath}`);
  }

  viewLogs(id: string): void {
    const instance = this.config.getInstance(id);
    if (!instance) return;
    const logDir = require('path').join(instance.stateDir, 'logs');
    console.log(`Logs directory: ${logDir}`);
  }

  configureChannel(id: string, channelType: string, config: ChannelConfig): void {
    this.config.updateChannelConfig(id, channelType, config);
  }

  setModel(id: string, model: string): void {
    this.config.updateModelConfig(id, model);
  }

  // Backup & Restore
  backup(id: string, includeSecrets: boolean = false): Record<string, unknown> {
    const instance = this.config.getInstance(id);
    if (!instance) throw new Error('Instance not found');

    const config = this.config.readOpenClawConfig(instance.stateDir);
    const secrets = includeSecrets ? this.config.getSecrets(id) : {};

    return {
      version: '1.0',
      instance: {
        id: instance.id,
        name: instance.name,
        port: instance.port,
        model: instance.model,
        channels: instance.channels
      },
      config,
      secrets,
      createdAt: new Date().toISOString()
    };
  }

  restore(id: string, backupData: Record<string, unknown>): void {
    const instance = this.config.getInstance(id);
    if (!instance) throw new Error('Instance not found');

    if (instance.status === InstanceStatus.Running) {
      this.process.stop(instance);
    }

    const backup = backupData as { config: Record<string, unknown>; instance?: { model?: string; channels?: Record<string, ChannelConfig> }; secrets?: Record<string, string> };

    this.config.writeOpenClawConfig(instance.stateDir, backup.config);

    if (backup.instance?.model) {
      this.config.updateModelConfig(id, backup.instance.model);
    }

    if (backup.instance?.channels) {
      Object.entries(backup.instance.channels).forEach(([channel, config]) => {
        this.config.updateChannelConfig(id, channel, config);
      });
    }

    if (backup.secrets) {
      Object.entries(backup.secrets).forEach(([key, value]) => {
        this.config.setSecret(id, key, value);
      });
    }
  }

  // Import & Export
  exportAll(): Record<string, unknown> {
    return {
      version: '1.0',
      instances: this.config.exportInstances(),
      exportedAt: new Date().toISOString()
    };
  }

  importAll(data: Record<string, unknown>): number {
    const instances = (data.instances || [data]) as InstanceConfig[];
    let imported = 0;

    for (const config of instances) {
      if (!this.config.getInstance(config.id)) {
        const stateDir = this.config.getInstanceStateDir(config.id);
        fs.mkdirSync(stateDir, { recursive: true });

        const openclawConfig = {
          meta: { lastTouchedVersion: '2026.3.24', lastTouchedAt: new Date().toISOString() },
          gateway: { port: config.port, mode: 'local', bind: 'loopback', controlUi: { enabled: true }, auth: { mode: 'token' } },
          agents: { list: [{ id: 'main', model: config.model || 'default' }] },
          channels: config.channels || {}
        };
        this.config.writeOpenClawConfig(stateDir, openclawConfig);
        this.config.createInstance({ ...config, stateDir });
        imported++;
      }
    }

    return imported;
  }

  // Getters
  getInstances(): Instance[] {
    return this.config.getInstances();
  }

  getInstance(id: string): Instance | undefined {
    return this.config.getInstance(id);
  }

  getTemplates(): InstanceTemplate[] {
    return templates;
  }

  private generateConfig(template: InstanceTemplate, port: number, model?: string): Record<string, unknown> {
    const baseConfig = {
      meta: { lastTouchedVersion: '2026.3.24', lastTouchedAt: new Date().toISOString() },
      gateway: { port, mode: 'local', bind: 'loopback', controlUi: { enabled: true }, auth: { mode: 'token' } },
      agents: { list: [{ id: 'main', model: model || 'default' }] }
    };

    const merged = this.deepMerge(baseConfig, template.config);

    (merged.gateway as Record<string, unknown>).port = port;
    if (merged.agents && Array.isArray((merged.agents as Record<string, unknown>).list)) {
      const list = (merged.agents as Record<string, unknown>).list as Array<Record<string, unknown>>;
      if (list.length > 0) {
        list[0].model = model || 'default';
      }
    }

    return merged;
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) &&
        typeof result[key] === 'object' && result[key] !== null
      ) {
        result[key] = this.deepMerge(result[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  dispose(): void {
    this.process.dispose();
  }
}
