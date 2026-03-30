/**
 * OpenClaw Manager - Core Manager
 * Unified manager for all frontends
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  Instance, InstanceStatus, InstanceHealth, InstanceConfig, InstanceTemplate, 
  ChannelConfig, CreateOptions, BackupData, EventCallback, ManagerEvent 
} from './types';
import { ConfigManager } from './config';
import { ProcessManager } from './process';
import { templates, getTemplate } from './templates';

export { Instance, InstanceStatus, InstanceHealth, InstanceConfig, InstanceTemplate, ChannelConfig };
export { templates, getTemplate };

export class OpenClawManager {
  private config: ConfigManager;
  private process: ProcessManager;
  private callbacks: EventCallback[] = [];
  private healthCheckInterval?: ReturnType<typeof setInterval>;

  constructor(customStateDir?: string) {
    this.config = new ConfigManager(customStateDir);
    this.process = new ProcessManager(this.config);

    // Forward events
    this.config.onEvent((event) => this.emit(event));
    this.process.onEvent((event) => this.emit(event));
  }

  // ==================== Event System ====================

  onEvent(callback: EventCallback): void {
    this.callbacks.push(callback);
  }

  private emit(event: ManagerEvent): void {
    this.callbacks.forEach(cb => cb(event));
  }

  // ==================== Instance Management ====================

  async create(options?: CreateOptions): Promise<Instance | undefined> {
    let templateId = options?.template;
    if (!templateId) {
      templateId = 'basic';
    }

    const template = getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

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

    const instanceDir = path.dirname(instance.stateDir);
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

  // ==================== Process Control ====================

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

  async startAll(): Promise<void> {
    const instances = this.config.getInstances().filter(i => i.autoStart);
    for (const instance of instances) {
      if (instance.status === InstanceStatus.Stopped) {
        await this.start(instance.id);
      }
    }
  }

  async stopAll(): Promise<void> {
    const instances = this.config.getInstances().filter(i => i.status === InstanceStatus.Running);
    for (const instance of instances) {
      await this.stop(instance.id);
    }
  }

  // ==================== Health Check ====================

  async healthCheck(id: string): Promise<InstanceHealth | undefined> {
    const instance = this.config.getInstance(id);
    if (!instance) return;
    return this.process.healthCheck(instance);
  }

  startHealthCheck(interval = 30000): void {
    this.stopHealthCheck();
    this.healthCheckInterval = setInterval(async () => {
      for (const instance of this.config.getInstances()) {
        if (instance.status === InstanceStatus.Running) {
          await this.process.healthCheck(instance);
        }
      }
    }, interval);
  }

  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  // ==================== Configuration ====================

  openConfig(id: string): string | undefined {
    const instance = this.config.getInstance(id);
    if (!instance) return;
    return path.join(instance.stateDir, 'openclaw.json');
  }

  viewLogs(id: string): string | undefined {
    const instance = this.config.getInstance(id);
    if (!instance) return;
    return path.join(instance.stateDir, 'logs');
  }

  configureChannel(id: string, channelType: string, config: ChannelConfig): void {
    this.config.updateChannelConfig(id, channelType, config);
  }

  setModel(id: string, model: string): void {
    this.config.updateModelConfig(id, model);
  }

  setAutoStart(id: string, autoStart: boolean): void {
    this.config.updateInstance(id, { autoStart });
  }

  // ==================== Backup & Restore ====================

  backup(id: string, includeSecrets = false): BackupData {
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
      config: config || {},
      secrets,
      createdAt: new Date().toISOString()
    };
  }

  restore(id: string, backupData: BackupData): void {
    const instance = this.config.getInstance(id);
    if (!instance) throw new Error('Instance not found');

    if (instance.status === InstanceStatus.Running) {
      this.process.stop(instance);
    }

    this.config.writeOpenClawConfig(instance.stateDir, backupData.config);

    if (backupData.instance?.model) {
      this.config.updateModelConfig(id, backupData.instance.model);
    }

    if (backupData.instance?.channels) {
      Object.entries(backupData.instance.channels).forEach(([channel, config]) => {
        this.config.updateChannelConfig(id, channel, config);
      });
    }

    if (backupData.secrets) {
      Object.entries(backupData.secrets).forEach(([key, value]) => {
        this.config.setSecret(id, key, value);
      });
    }
  }

  // ==================== Import & Export ====================

  exportAll(): { version: string; instances: InstanceConfig[]; exportedAt: string } {
    return {
      version: '1.0',
      instances: this.config.exportInstances(),
      exportedAt: new Date().toISOString()
    };
  }

  importAll(data: { instances?: InstanceConfig[] } | InstanceConfig[]): number {
    const instances = Array.isArray(data) ? data : (data.instances || [data as InstanceConfig]);
    return this.config.importInstances(instances);
  }

  // ==================== Getters ====================

  getInstances(): Instance[] {
    return this.config.getInstances();
  }

  getInstance(id: string): Instance | undefined {
    return this.config.getInstance(id);
  }

  getTemplates(): InstanceTemplate[] {
    return templates;
  }

  getTemplate(id: string): InstanceTemplate | undefined {
    return getTemplate(id);
  }

  // ==================== Helpers ====================

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

  // ==================== Cleanup ====================

  dispose(): void {
    this.stopHealthCheck();
    this.process.dispose();
  }
}
