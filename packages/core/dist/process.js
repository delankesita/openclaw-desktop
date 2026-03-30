"use strict";
/**
 * OpenClaw Manager - Process Service
 * Manages OpenClaw instance processes
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const net = __importStar(require("net"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const types_1 = require("./types");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function httpGet(url, timeout = 5000) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok)
            return { data: null };
        const data = await response.json();
        return { data };
    }
    catch {
        return { data: null };
    }
}
class ProcessManager {
    config;
    processes = new Map();
    reservedPorts = new Set();
    callbacks = [];
    constructor(config) {
        this.config = config;
    }
    // ==================== Event System ====================
    onEvent(callback) {
        this.callbacks.push(callback);
    }
    emit(type, instanceId, data) {
        const event = { type, instanceId, data, timestamp: new Date() };
        this.callbacks.forEach(cb => cb(event));
    }
    // ==================== Process Control ====================
    async start(instance) {
        if (instance.status === types_1.InstanceStatus.Running) {
            throw new Error('Instance is already running');
        }
        const stateDir = instance.stateDir;
        const port = instance.port;
        fs.mkdirSync(stateDir, { recursive: true });
        const available = await this.isPortAvailable(port);
        if (!available) {
            throw new Error(`Port ${port} is already in use`);
        }
        this.config.setInstanceStatus(instance.id, types_1.InstanceStatus.Starting);
        this.emit('status:changed', instance.id, { status: types_1.InstanceStatus.Starting });
        try {
            const proc = (0, child_process_1.spawn)('openclaw', ['--log-level', 'error', 'gateway', 'run'], {
                cwd: stateDir,
                env: {
                    ...process.env,
                    OPENCLAW_CONFIG_PATH: path.join(stateDir, 'openclaw.json')
                },
                detached: false,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            this.processes.set(instance.id, proc);
            proc.on('exit', (code) => {
                this.processes.delete(instance.id);
                this.config.setInstanceStatus(instance.id, types_1.InstanceStatus.Stopped);
                this.emit('instance:stopped', instance.id, { code });
            });
            proc.on('error', (err) => {
                console.error(`Process error for ${instance.id}:`, err);
                this.config.setInstanceStatus(instance.id, types_1.InstanceStatus.Error);
                this.emit('status:changed', instance.id, { status: types_1.InstanceStatus.Error, error: err.message });
            });
            await this.waitForGateway(port, 30000);
            this.config.setInstanceStatus(instance.id, types_1.InstanceStatus.Running, proc.pid);
            this.emit('instance:started', instance.id, { pid: proc.pid });
        }
        catch (err) {
            this.config.setInstanceStatus(instance.id, types_1.InstanceStatus.Error);
            this.emit('status:changed', instance.id, { status: types_1.InstanceStatus.Error });
            throw err;
        }
    }
    async stop(instance) {
        if (instance.status !== types_1.InstanceStatus.Running)
            return;
        this.config.setInstanceStatus(instance.id, types_1.InstanceStatus.Stopping);
        this.emit('status:changed', instance.id, { status: types_1.InstanceStatus.Stopping });
        try {
            const proc = this.processes.get(instance.id);
            if (proc) {
                proc.kill('SIGTERM');
                await new Promise((resolve) => {
                    proc.on('exit', () => resolve());
                    setTimeout(() => {
                        proc.kill('SIGKILL');
                        resolve();
                    }, 5000);
                });
                this.processes.delete(instance.id);
            }
            try {
                await execAsync('openclaw --log-level error gateway stop', {
                    cwd: instance.stateDir,
                    env: { ...process.env, OPENCLAW_CONFIG_PATH: path.join(instance.stateDir, 'openclaw.json') },
                    timeout: 5000
                });
            }
            catch { }
            this.config.setInstanceStatus(instance.id, types_1.InstanceStatus.Stopped);
            this.emit('instance:stopped', instance.id);
        }
        catch (err) {
            console.error('Stop error:', err);
            this.config.setInstanceStatus(instance.id, types_1.InstanceStatus.Error);
            this.emit('status:changed', instance.id, { status: types_1.InstanceStatus.Error });
            throw err;
        }
    }
    async restart(instance) {
        await this.stop(instance);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.start(instance);
    }
    // ==================== Health Check ====================
    async healthCheck(instance) {
        const health = {
            status: 'error',
            cpu: 0,
            memory: 0,
            uptime: 0,
            lastCheck: new Date()
        };
        if (instance.status !== types_1.InstanceStatus.Running) {
            health.message = 'Instance not running';
            return health;
        }
        try {
            const { data } = await httpGet(`http://localhost:${instance.port}/health`, 5000);
            if (data) {
                health.status = 'ok';
                health.cpu = data.cpu || 0;
                health.memory = data.memory || 0;
                health.uptime = data.uptime || 0;
            }
        }
        catch {
            health.status = 'error';
            health.message = 'Connection failed';
        }
        this.config.setInstanceHealth(instance.id, health);
        this.emit('health:updated', instance.id, health);
        return health;
    }
    // ==================== Port Management ====================
    isPortAvailable(port) {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            server.listen(port, '127.0.0.1');
        });
    }
    async findAvailablePort(startPort, usedPorts) {
        let port = startPort;
        while (true) {
            if (!usedPorts.has(port) && !this.reservedPorts.has(port)) {
                const available = await this.isPortAvailable(port);
                if (available) {
                    this.reservedPorts.add(port);
                    return port;
                }
            }
            port++;
        }
    }
    releasePort(port) {
        this.reservedPorts.delete(port);
    }
    // ==================== Wait for Gateway ====================
    waitForGateway(port, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = async () => {
                try {
                    const { data } = await httpGet(`http://localhost:${port}/health`, 1000);
                    if (data) {
                        resolve();
                    }
                    else {
                        throw new Error('No response');
                    }
                }
                catch {
                    if (Date.now() - startTime > timeout) {
                        reject(new Error('Gateway did not start within timeout'));
                    }
                    else {
                        setTimeout(check, 500);
                    }
                }
            };
            check();
        });
    }
    // ==================== Cleanup ====================
    dispose() {
        this.processes.forEach((proc) => {
            try {
                proc.kill('SIGTERM');
            }
            catch { }
        });
        this.processes.clear();
    }
}
exports.ProcessManager = ProcessManager;
//# sourceMappingURL=process.js.map