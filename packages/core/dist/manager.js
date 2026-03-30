"use strict";
/**
 * OpenClaw Manager - Core Manager
 * Unified manager for all frontends
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
exports.OpenClawManager = exports.getTemplate = exports.templates = exports.InstanceStatus = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("./types");
Object.defineProperty(exports, "InstanceStatus", { enumerable: true, get: function () { return types_1.InstanceStatus; } });
const config_1 = require("./config");
const process_1 = require("./process");
const templates_1 = require("./templates");
Object.defineProperty(exports, "templates", { enumerable: true, get: function () { return templates_1.templates; } });
Object.defineProperty(exports, "getTemplate", { enumerable: true, get: function () { return templates_1.getTemplate; } });
class OpenClawManager {
    config;
    process;
    callbacks = [];
    healthCheckInterval;
    constructor(customStateDir) {
        this.config = new config_1.ConfigManager(customStateDir);
        this.process = new process_1.ProcessManager(this.config);
        // Forward events
        this.config.onEvent((event) => this.emit(event));
        this.process.onEvent((event) => this.emit(event));
    }
    // ==================== Event System ====================
    onEvent(callback) {
        this.callbacks.push(callback);
    }
    emit(event) {
        this.callbacks.forEach(cb => cb(event));
    }
    // ==================== Instance Management ====================
    async create(options) {
        let templateId = options?.template;
        if (!templateId) {
            templateId = 'basic';
        }
        const template = (0, templates_1.getTemplate)(templateId);
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
    async delete(id) {
        const instance = this.config.getInstance(id);
        if (!instance)
            return false;
        if (instance.status === types_1.InstanceStatus.Running) {
            await this.process.stop(instance);
        }
        const instanceDir = path.dirname(instance.stateDir);
        if (fs.existsSync(instanceDir)) {
            fs.rmSync(instanceDir, { recursive: true, force: true });
        }
        return this.config.deleteInstance(id);
    }
    async clone(id, newName) {
        const source = this.config.getInstance(id);
        if (!source)
            return;
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
            config.gateway.port = port;
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
    async start(id) {
        const instance = this.config.getInstance(id);
        if (!instance)
            throw new Error('Instance not found');
        await this.process.start(instance);
    }
    async stop(id) {
        const instance = this.config.getInstance(id);
        if (!instance)
            return;
        await this.process.stop(instance);
    }
    async restart(id) {
        const instance = this.config.getInstance(id);
        if (!instance)
            return;
        await this.process.restart(instance);
    }
    async startAll() {
        const instances = this.config.getInstances().filter(i => i.autoStart);
        for (const instance of instances) {
            if (instance.status === types_1.InstanceStatus.Stopped) {
                await this.start(instance.id);
            }
        }
    }
    async stopAll() {
        const instances = this.config.getInstances().filter(i => i.status === types_1.InstanceStatus.Running);
        for (const instance of instances) {
            await this.stop(instance.id);
        }
    }
    // ==================== Health Check ====================
    async healthCheck(id) {
        const instance = this.config.getInstance(id);
        if (!instance)
            return;
        return this.process.healthCheck(instance);
    }
    startHealthCheck(interval = 30000) {
        this.stopHealthCheck();
        this.healthCheckInterval = setInterval(async () => {
            for (const instance of this.config.getInstances()) {
                if (instance.status === types_1.InstanceStatus.Running) {
                    await this.process.healthCheck(instance);
                }
            }
        }, interval);
    }
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }
    }
    // ==================== Configuration ====================
    openConfig(id) {
        const instance = this.config.getInstance(id);
        if (!instance)
            return;
        return path.join(instance.stateDir, 'openclaw.json');
    }
    viewLogs(id) {
        const instance = this.config.getInstance(id);
        if (!instance)
            return;
        return path.join(instance.stateDir, 'logs');
    }
    configureChannel(id, channelType, config) {
        this.config.updateChannelConfig(id, channelType, config);
    }
    setModel(id, model) {
        this.config.updateModelConfig(id, model);
    }
    setAutoStart(id, autoStart) {
        this.config.updateInstance(id, { autoStart });
    }
    // ==================== Backup & Restore ====================
    backup(id, includeSecrets = false) {
        const instance = this.config.getInstance(id);
        if (!instance)
            throw new Error('Instance not found');
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
    restore(id, backupData) {
        const instance = this.config.getInstance(id);
        if (!instance)
            throw new Error('Instance not found');
        if (instance.status === types_1.InstanceStatus.Running) {
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
    exportAll() {
        return {
            version: '1.0',
            instances: this.config.exportInstances(),
            exportedAt: new Date().toISOString()
        };
    }
    importAll(data) {
        const instances = Array.isArray(data) ? data : (data.instances || [data]);
        return this.config.importInstances(instances);
    }
    // ==================== Getters ====================
    getInstances() {
        return this.config.getInstances();
    }
    getInstance(id) {
        return this.config.getInstance(id);
    }
    getTemplates() {
        return templates_1.templates;
    }
    getTemplate(id) {
        return (0, templates_1.getTemplate)(id);
    }
    // ==================== Helpers ====================
    generateConfig(template, port, model) {
        const baseConfig = {
            meta: { lastTouchedVersion: '2026.3.24', lastTouchedAt: new Date().toISOString() },
            gateway: { port, mode: 'local', bind: 'loopback', controlUi: { enabled: true }, auth: { mode: 'token' } },
            agents: { list: [{ id: 'main', model: model || 'default' }] }
        };
        const merged = this.deepMerge(baseConfig, template.config);
        merged.gateway.port = port;
        if (merged.agents && Array.isArray(merged.agents.list)) {
            const list = merged.agents.list;
            if (list.length > 0) {
                list[0].model = model || 'default';
            }
        }
        return merged;
    }
    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) &&
                typeof result[key] === 'object' && result[key] !== null) {
                result[key] = this.deepMerge(result[key], source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
    // ==================== Cleanup ====================
    dispose() {
        this.stopHealthCheck();
        this.process.dispose();
    }
}
exports.OpenClawManager = OpenClawManager;
//# sourceMappingURL=manager.js.map