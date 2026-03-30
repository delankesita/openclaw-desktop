/**
 * OpenClaw Manager - Configuration Service
 * Manages instance configurations, secrets, and persistence
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Instance, InstanceConfig, InstanceStatus, ChannelConfig, EventCallback, ManagerEvent } from './types';

const STATE_FILE = 'instances.json';
const SECRETS_FILE = 'secrets.json';

export class ConfigManager {
  private stateDir: string;
  private instancesFile: string;
  private secretsFile: string;
  private instances: Map<string, Instance> = new Map();
  private secrets: Map<string, Record<string, string>> = new Map();
  private callbacks: EventCallback[] = [];

  constructor(customStateDir?: string) {
    this.stateDir = customStateDir || path.join(os.homedir(), '.openclaw-manager');
    this.instancesFile = path.join(this.stateDir, STATE_FILE);
    this.secretsFile = path.join(this.stateDir, SECRETS_FILE);
    
    this.ensureDir();
    this.load();
  }

  // ==================== Event System ====================

  onEvent(callback: EventCallback): void {
    this.callbacks.push(callback);
  }

  private emit(type: ManagerEvent['type'], instanceId?: string, data?: unknown): void {
    const event: ManagerEvent = { type, instanceId, data, timestamp: new Date() };
    this.callbacks.forEach(cb => cb(event));
  }

  // ==================== Persistence ====================

  private ensureDir(): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  private load(): void {
    // Load instances
    if (fs.existsSync(this.instancesFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.instancesFile, 'utf-8'));
        Object.entries(data).forEach(([id, config]) => {
          this.instances.set(id, {
            ...(config as InstanceConfig),
            status: InstanceStatus.Stopped,
            createdAt: new Date((config as InstanceConfig).createdAt),
            updatedAt: new Date((config as InstanceConfig).updatedAt)
          });
        });
      } catch (err) {
        console.error('Failed to load instances:', err);
      }
    }

    // Load secrets
    if (fs.existsSync(this.secretsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.secretsFile, 'utf-8'));
        Object.entries(data).forEach(([id, secrets]) => {
          this.secrets.set(id, secrets as Record<string, string>);
        });
      } catch (err) {
        console.error('Failed to load secrets:', err);
      }
    }
  }

  private save(): void {
    // Save instances (without runtime state)
    const data: Record<string, InstanceConfig> = {};
    this.instances.forEach((instance, id) => {
      const { status, health, pid, ...config } = instance;
      data[id] = config;
    });
    fs.writeFileSync(this.instancesFile, JSON.stringify(data, null, 2));

    // Save secrets
    const secretsData: Record<string, Record<string, string>> = {};
    this.secrets.forEach((secrets, id) => {
      secretsData[id] = secrets;
    });
    fs.writeFileSync(this.secretsFile, JSON.stringify(secretsData, null, 2));
  }

  // ==================== Instance CRUD ====================

  createInstance(config: InstanceConfig): Instance {
    const instance: Instance = {
      ...config,
      status: InstanceStatus.Stopped,
      createdAt: config.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.instances.set(instance.id, instance);
    this.save();
    this.emit('instance:created', instance.id, instance);
    return instance;
  }

  updateInstance(id: string, updates: Partial<InstanceConfig>): Instance | undefined {
    const instance = this.instances.get(id);
    if (!instance) return;

    Object.assign(instance, updates, { updatedAt: new Date() });
    this.save();
    this.emit('instance:updated', id, instance);
    return instance;
  }

  deleteInstance(id: string): boolean {
    const instance = this.instances.get(id);
    if (!instance) return false;

    this.instances.delete(id);
    this.secrets.delete(id);
    this.save();
    this.emit('instance:deleted', id);
    return true;
  }

  getInstance(id: string): Instance | undefined {
    return this.instances.get(id);
  }

  getInstances(): Instance[] {
    return Array.from(this.instances.values());
  }

  // ==================== Runtime State ====================

  setInstanceStatus(id: string, status: InstanceStatus, pid?: number): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.status = status;
      instance.pid = pid;
      instance.updatedAt = new Date();
      this.emit('status:changed', id, { status, pid });
    }
  }

  setInstanceHealth(id: string, health: Instance['health']): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.health = health;
      this.emit('health:updated', id, health);
    }
  }

  // ==================== Secrets Management ====================

  setSecret(instanceId: string, key: string, value: string): void {
    let secrets = this.secrets.get(instanceId);
    if (!secrets) {
      secrets = {};
      this.secrets.set(instanceId, secrets);
    }
    secrets[key] = value;
    this.save();
  }

  getSecret(instanceId: string, key: string): string | undefined {
    return this.secrets.get(instanceId)?.[key];
  }

  getSecrets(instanceId: string): Record<string, string> {
    const secrets = this.secrets.get(instanceId);
    return secrets ? { ...secrets } : {};
  }

  deleteSecret(instanceId: string, key: string): void {
    const secrets = this.secrets.get(instanceId);
    if (secrets) {
      delete secrets[key];
      this.save();
    }
  }

  // ==================== OpenClaw Config File ====================

  readOpenClawConfig(stateDir: string): Record<string, unknown> | null {
    const configPath = path.join(stateDir, 'openclaw.json');
    if (!fs.existsSync(configPath)) return null;
    
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  writeOpenClawConfig(stateDir: string, config: Record<string, unknown>): void {
    const configPath = path.join(stateDir, 'openclaw.json');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  updateOpenClawConfig(stateDir: string, updates: Record<string, unknown>): void {
    const config = this.readOpenClawConfig(stateDir) || {};
    const merged = this.deepMerge(config, updates);
    this.writeOpenClawConfig(stateDir, merged);
  }

  // ==================== Channel Config ====================

  updateChannelConfig(instanceId: string, channelType: string, config: ChannelConfig): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    instance.channels = instance.channels || {};
    instance.channels[channelType] = config;
    instance.updatedAt = new Date();

    // Update openclaw.json
    this.updateOpenClawConfig(instance.stateDir, { channels: instance.channels });

    // Store secrets separately
    const secretFields = ['appSecret', 'clientSecret', 'secret', 'botToken', 'apiKey', 'appToken'];
    for (const field of secretFields) {
      const value = (config as Record<string, unknown>)[field];
      if (typeof value === 'string') {
        this.setSecret(instanceId, `${channelType}.${field}`, value);
      }
    }

    this.save();
    this.emit('instance:updated', instanceId, instance);
  }

  // ==================== Model Config ====================

  updateModelConfig(instanceId: string, model: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    instance.model = model;
    instance.updatedAt = new Date();

    // Update openclaw.json
    this.updateOpenClawConfig(instance.stateDir, {
      agents: { list: [{ id: 'main', model }] }
    });

    this.save();
    this.emit('instance:updated', instanceId, instance);
  }

  // ==================== Import/Export ====================

  exportInstances(): InstanceConfig[] {
    return this.getInstances().map(({ status, health, pid, ...config }) => config);
  }

  importInstances(configs: InstanceConfig[]): number {
    let imported = 0;
    for (const config of configs) {
      if (!this.instances.has(config.id)) {
        this.createInstance(config);
        imported++;
      }
    }
    return imported;
  }

  // ==================== Helpers ====================

  getInstanceStateDir(id: string): string {
    return path.join(this.stateDir, id, 'state');
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
}
