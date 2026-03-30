/**
 * OpenClaw Manager - Configuration Service
 * Manages instance configurations, secrets, and persistence
 */
import { Instance, InstanceConfig, InstanceStatus, ChannelConfig, EventCallback } from './types';
export declare class ConfigManager {
    private stateDir;
    private instancesFile;
    private secretsFile;
    private instances;
    private secrets;
    private callbacks;
    constructor(customStateDir?: string);
    onEvent(callback: EventCallback): void;
    private emit;
    private ensureDir;
    private load;
    private save;
    createInstance(config: InstanceConfig): Instance;
    updateInstance(id: string, updates: Partial<InstanceConfig>): Instance | undefined;
    deleteInstance(id: string): boolean;
    getInstance(id: string): Instance | undefined;
    getInstances(): Instance[];
    setInstanceStatus(id: string, status: InstanceStatus, pid?: number): void;
    setInstanceHealth(id: string, health: Instance['health']): void;
    setSecret(instanceId: string, key: string, value: string): void;
    getSecret(instanceId: string, key: string): string | undefined;
    getSecrets(instanceId: string): Record<string, string>;
    deleteSecret(instanceId: string, key: string): void;
    readOpenClawConfig(stateDir: string): Record<string, unknown> | null;
    writeOpenClawConfig(stateDir: string, config: Record<string, unknown>): void;
    updateOpenClawConfig(stateDir: string, updates: Record<string, unknown>): void;
    updateChannelConfig(instanceId: string, channelType: string, config: ChannelConfig): void;
    updateModelConfig(instanceId: string, model: string): void;
    exportInstances(): InstanceConfig[];
    importInstances(configs: InstanceConfig[]): number;
    getInstanceStateDir(id: string): string;
    private deepMerge;
}
//# sourceMappingURL=config.d.ts.map