/**
 * OpenClaw Manager - Type Definitions
 * Unified types for all frontends (CLI, Web, VS Code, Electron)
 */

// ==================== Instance Status ====================

export enum InstanceStatus {
  Stopped = 'stopped',
  Starting = 'starting',
  Running = 'running',
  Stopping = 'stopping',
  Error = 'error'
}

// ==================== Instance Health ====================

export interface InstanceHealth {
  status: 'ok' | 'warning' | 'error';
  cpu: number;
  memory: number;
  uptime: number;
  lastCheck: Date;
  message?: string;
}

// ==================== Channel Configuration ====================

export interface ChannelConfig {
  enabled: boolean;
  mode?: 'websocket' | 'stream' | 'webhook';
  
  // Feishu
  appId?: string;
  appSecret?: string;
  
  // DingTalk
  clientId?: string;
  clientSecret?: string;
  
  // WeCom
  corpId?: string;
  agentId?: string;
  secret?: string;
  
  // Discord/Slack
  botToken?: string;
  appToken?: string;
  
  // Allow additional fields
  [key: string]: unknown;
}

// ==================== Instance ====================

export interface Instance {
  id: string;
  name: string;
  port: number;
  stateDir: string;
  
  // Runtime state
  status: InstanceStatus;
  health?: InstanceHealth;
  pid?: number;
  
  // Configuration
  model?: string;
  channels?: Record<string, ChannelConfig>;
  autoStart?: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Persisted config (without runtime state)
export type InstanceConfig = Omit<Instance, 'status' | 'health' | 'pid'>;

// ==================== Templates ====================

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

// ==================== Events ====================

export type EventType = 
  | 'instance:created'
  | 'instance:deleted'
  | 'instance:started'
  | 'instance:stopped'
  | 'instance:updated'
  | 'status:changed'
  | 'health:updated';

export interface ManagerEvent {
  type: EventType;
  instanceId?: string;
  data?: unknown;
  timestamp: Date;
}

export type EventCallback = (event: ManagerEvent) => void;

// ==================== Options ====================

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

// ==================== API Response ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
