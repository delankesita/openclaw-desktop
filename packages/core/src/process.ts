import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { Instance, InstanceStatus, InstanceHealth } from './types';
import { ConfigManager } from './config';

const execAsync = promisify(exec);

async function httpGet(url: string, timeout = 5000): Promise<{ data: Record<string, unknown> | null }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return { data: null };
    const data = await response.json() as Record<string, unknown>;
    return { data };
  } catch {
    return { data: null };
  }
}

export class ProcessManager {
  private config: ConfigManager;
  private processes: Map<string, ChildProcess> = new Map();
  private reservedPorts: Set<number> = new Set();
  private onChangeCallbacks: (() => void)[] = [];

  constructor(config: ConfigManager) {
    this.config = config;
  }

  onChange(callback: () => void): void {
    this.onChangeCallbacks.push(callback);
  }

  private notifyChange(): void {
    this.onChangeCallbacks.forEach(cb => cb());
  }

  async start(instance: Instance): Promise<void> {
    if (instance.status === InstanceStatus.Running) {
      throw new Error('Instance is already running');
    }

    const stateDir = instance.stateDir;
    const port = instance.port;

    fs.mkdirSync(stateDir, { recursive: true });

    const available = await this.isPortAvailable(port);
    if (!available) {
      throw new Error(`Port ${port} is already in use`);
    }

    this.config.setInstanceStatus(instance.id, InstanceStatus.Starting);
    this.notifyChange();

    try {
      const proc = spawn('openclaw', ['--log-level', 'error', 'gateway', 'run'], {
        cwd: stateDir,
        env: {
          ...process.env,
          OPENCLAW_CONFIG_PATH: path.join(stateDir, 'openclaw.json')
        },
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.processes.set(instance.id, proc);

      proc.on('exit', () => {
        this.processes.delete(instance.id);
        this.config.setInstanceStatus(instance.id, InstanceStatus.Stopped);
        this.notifyChange();
      });

      proc.on('error', (err) => {
        console.error(`Process error for ${instance.id}:`, err);
        this.config.setInstanceStatus(instance.id, InstanceStatus.Error);
        this.notifyChange();
      });

      await this.waitForGateway(port, 30000);

      this.config.setInstanceStatus(instance.id, InstanceStatus.Running, proc.pid);
      this.notifyChange();

    } catch (err) {
      this.config.setInstanceStatus(instance.id, InstanceStatus.Error);
      this.notifyChange();
      throw err;
    }
  }

  async stop(instance: Instance): Promise<void> {
    if (instance.status !== InstanceStatus.Running) return;

    this.config.setInstanceStatus(instance.id, InstanceStatus.Stopping);
    this.notifyChange();

    try {
      const proc = this.processes.get(instance.id);
      if (proc) {
        proc.kill('SIGTERM');
        await new Promise<void>((resolve) => {
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
      } catch {}

      this.config.setInstanceStatus(instance.id, InstanceStatus.Stopped);
      this.notifyChange();

    } catch (err) {
      console.error('Stop error:', err);
      this.config.setInstanceStatus(instance.id, InstanceStatus.Error);
      this.notifyChange();
      throw err;
    }
  }

  async restart(instance: Instance): Promise<void> {
    await this.stop(instance);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start(instance);
  }

  async healthCheck(instance: Instance): Promise<InstanceHealth> {
    const health: InstanceHealth = {
      status: 'error',
      cpu: 0,
      memory: 0,
      uptime: 0,
      lastCheck: new Date()
    };

    if (instance.status !== InstanceStatus.Running) {
      health.message = 'Instance not running';
      return health;
    }

    try {
      const { data } = await httpGet(`http://localhost:${instance.port}/health`, 5000);
      if (data) {
        health.status = 'ok';
        health.cpu = (data.cpu as number) || 0;
        health.memory = (data.memory as number) || 0;
        health.uptime = (data.uptime as number) || 0;
      }
    } catch {
      health.status = 'error';
      health.message = 'Connection failed';
    }

    this.config.setInstanceHealth(instance.id, health);
    return health;
  }

  private isPortAvailable(port: number): Promise<boolean> {
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

  private waitForGateway(port: number, timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = async () => {
        try {
          const { data } = await httpGet(`http://localhost:${port}/health`, 1000);
          if (data) {
            resolve();
          } else {
            throw new Error('No response');
          }
        } catch {
          if (Date.now() - startTime > timeout) {
            reject(new Error('Gateway did not start within timeout'));
          } else {
            setTimeout(check, 500);
          }
        }
      };
      check();
    });
  }

  async findAvailablePort(startPort: number, usedPorts: Set<number>): Promise<number> {
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

  releasePort(port: number): void {
    this.reservedPorts.delete(port);
  }

  dispose(): void {
    this.processes.forEach((proc) => {
      try {
        proc.kill('SIGTERM');
      } catch {}
    });
    this.processes.clear();
  }
}
