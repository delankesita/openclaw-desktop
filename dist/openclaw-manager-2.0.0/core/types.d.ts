/**
 * OpenClaw Manager - Type Definitions
 * Unified types for all frontends (CLI, Web, VS Code, Electron)
 */
export declare enum InstanceStatus {
    Stopped = "stopped",
    Starting = "starting",
    Running = "running",
    Stopping = "stopping",
    Error = "error"
}
export interface InstanceHealth {
    status: 'ok' | 'warning' | 'error';
    cpu: number;
    memory: number;
    uptime: number;
    lastCheck: Date;
    message?: string;
}
export interface ChannelConfig {
    enabled: boolean;
    mode?: 'websocket' | 'stream' | 'webhook';
    appId?: string;
    appSecret?: string;
    clientId?: string;
    clientSecret?: string;
    corpId?: string;
    agentId?: string;
    secret?: string;
    botToken?: string;
    appToken?: string;
    [key: string]: unknown;
}
export interface Instance {
    id: string;
    name: string;
    port: number;
    stateDir: string;
    status: InstanceStatus;
    health?: InstanceHealth;
    pid?: number;
    model?: string;
    channels?: Record<string, ChannelConfig>;
    autoStart?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export type InstanceConfig = Omit<Instance, 'status' | 'health' | 'pid'>;
export interface InstanceTemplate {
    id: string;
    name: string;
    description: string;
    category: 'basic' | 'development' | 'production' | 'specialized';
    icon: string;
    config: {
        gateway?: Record<string, unknown>;
        agents?: Record<string, unknown>;
        channels?: Record<string, unknown>;
        models?: Record<string, unknown>;
        tools?: Record<string, unknown>;
    };
    channels?: string[];
    tags: string[];
}
export type EventType = 'instance:created' | 'instance:deleted' | 'instance:started' | 'instance:stopped' | 'instance:updated' | 'status:changed' | 'health:updated';
export interface ManagerEvent {
    type: EventType;
    instanceId?: string;
    data?: unknown;
    timestamp: Date;
}
export type EventCallback = (event: ManagerEvent) => void;
export interface CreateOptions {
    name?: string;
    port?: number;
    template?: string;
    model?: string;
}
export interface BackupData {
    version: string;
    instance: {
        id: string;
        name: string;
        port: number;
        model?: string;
        channels?: Record<string, ChannelConfig>;
    };
    config: Record<string, unknown>;
    secrets?: Record<string, string>;
    createdAt: string;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
//# sourceMappingURL=types.d.ts.map