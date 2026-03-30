/**
 * OpenClaw Manager - Core Manager
 * Unified manager for all frontends
 */
import { Instance, InstanceStatus, InstanceHealth, InstanceConfig, InstanceTemplate, ChannelConfig, CreateOptions, BackupData, EventCallback } from './types';
import { templates, getTemplate } from './templates';
export { Instance, InstanceStatus, InstanceHealth, InstanceConfig, InstanceTemplate, ChannelConfig };
export { templates, getTemplate };
export declare class OpenClawManager {
    private config;
    private process;
    private callbacks;
    private healthCheckInterval?;
    constructor(customStateDir?: string);
    onEvent(callback: EventCallback): void;
    private emit;
    create(options?: CreateOptions): Promise<Instance | undefined>;
    delete(id: string): Promise<boolean>;
    clone(id: string, newName?: string): Promise<Instance | undefined>;
    start(id: string): Promise<void>;
    stop(id: string): Promise<void>;
    restart(id: string): Promise<void>;
    startAll(): Promise<void>;
    stopAll(): Promise<void>;
    healthCheck(id: string): Promise<InstanceHealth | undefined>;
    startHealthCheck(interval?: number): void;
    stopHealthCheck(): void;
    openConfig(id: string): string | undefined;
    viewLogs(id: string): string | undefined;
    configureChannel(id: string, channelType: string, config: ChannelConfig): void;
    setModel(id: string, model: string): void;
    setAutoStart(id: string, autoStart: boolean): void;
    backup(id: string, includeSecrets?: boolean): BackupData;
    restore(id: string, backupData: BackupData): void;
    exportAll(): {
        version: string;
        instances: InstanceConfig[];
        exportedAt: string;
    };
    importAll(data: {
        instances?: InstanceConfig[];
    } | InstanceConfig[]): number;
    getInstances(): Instance[];
    getInstance(id: string): Instance | undefined;
    getTemplates(): InstanceTemplate[];
    getTemplate(id: string): InstanceTemplate | undefined;
    private generateConfig;
    private deepMerge;
    dispose(): void;
}
//# sourceMappingURL=manager.d.ts.map