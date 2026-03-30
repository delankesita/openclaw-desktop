/**
 * OpenClaw Manager - Process Service
 * Manages OpenClaw instance processes
 */
import { Instance, InstanceHealth, EventCallback } from './types';
import { ConfigManager } from './config';
export declare class ProcessManager {
    private config;
    private processes;
    private reservedPorts;
    private callbacks;
    constructor(config: ConfigManager);
    onEvent(callback: EventCallback): void;
    private emit;
    start(instance: Instance): Promise<void>;
    stop(instance: Instance): Promise<void>;
    restart(instance: Instance): Promise<void>;
    healthCheck(instance: Instance): Promise<InstanceHealth>;
    private isPortAvailable;
    findAvailablePort(startPort: number, usedPorts: Set<number>): Promise<number>;
    releasePort(port: number): void;
    private waitForGateway;
    dispose(): void;
}
//# sourceMappingURL=process.d.ts.map