"use strict";
/**
 * OpenClaw Manager - Configuration Service
 * Manages instance configurations, secrets, and persistence
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
exports.ConfigManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const types_1 = require("./types");
const STATE_FILE = 'instances.json';
const SECRETS_FILE = 'secrets.json';
class ConfigManager {
    stateDir;
    instancesFile;
    secretsFile;
    instances = new Map();
    secrets = new Map();
    callbacks = [];
    constructor(customStateDir) {
        this.stateDir = customStateDir || path.join(os.homedir(), '.openclaw-manager');
        this.instancesFile = path.join(this.stateDir, STATE_FILE);
        this.secretsFile = path.join(this.stateDir, SECRETS_FILE);
        this.ensureDir();
        this.load();
    }
    // ==================== Event System ====================
    onEvent(callback) {
        this.callbacks.push(callback);
    }
    emit(type, instanceId, data) {
        const event = { type, instanceId, data, timestamp: new Date() };
        this.callbacks.forEach(cb => cb(event));
    }
    // ==================== Persistence ====================
    ensureDir() {
        if (!fs.existsSync(this.stateDir)) {
            fs.mkdirSync(this.stateDir, { recursive: true });
        }
    }
    load() {
        // Load instances
        if (fs.existsSync(this.instancesFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.instancesFile, 'utf-8'));
                Object.entries(data).forEach(([id, config]) => {
                    this.instances.set(id, {
                        ...config,
                        status: types_1.InstanceStatus.Stopped,
                        createdAt: new Date(config.createdAt),
                        updatedAt: new Date(config.updatedAt)
                    });
                });
            }
            catch (err) {
                console.error('Failed to load instances:', err);
            }
        }
        // Load secrets
        if (fs.existsSync(this.secretsFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.secretsFile, 'utf-8'));
                Object.entries(data).forEach(([id, secrets]) => {
                    this.secrets.set(id, secrets);
                });
            }
            catch (err) {
                console.error('Failed to load secrets:', err);
            }
        }
    }
    save() {
        // Save instances (without runtime state)
        const data = {};
        this.instances.forEach((instance, id) => {
            const { status, health, pid, ...config } = instance;
            data[id] = config;
        });
        fs.writeFileSync(this.instancesFile, JSON.stringify(data, null, 2));
        // Save secrets
        const secretsData = {};
        this.secrets.forEach((secrets, id) => {
            secretsData[id] = secrets;
        });
        fs.writeFileSync(this.secretsFile, JSON.stringify(secretsData, null, 2));
    }
    // ==================== Instance CRUD ====================
    createInstance(config) {
        const instance = {
            ...config,
            status: types_1.InstanceStatus.Stopped,
            createdAt: config.createdAt || new Date(),
            updatedAt: new Date()
        };
        this.instances.set(instance.id, instance);
        this.save();
        this.emit('instance:created', instance.id, instance);
        return instance;
    }
    updateInstance(id, updates) {
        const instance = this.instances.get(id);
        if (!instance)
            return;
        Object.assign(instance, updates, { updatedAt: new Date() });
        this.save();
        this.emit('instance:updated', id, instance);
        return instance;
    }
    deleteInstance(id) {
        const instance = this.instances.get(id);
        if (!instance)
            return false;
        this.instances.delete(id);
        this.secrets.delete(id);
        this.save();
        this.emit('instance:deleted', id);
        return true;
    }
    getInstance(id) {
        return this.instances.get(id);
    }
    getInstances() {
        return Array.from(this.instances.values());
    }
    // ==================== Runtime State ====================
    setInstanceStatus(id, status, pid) {
        const instance = this.instances.get(id);
        if (instance) {
            instance.status = status;
            instance.pid = pid;
            instance.updatedAt = new Date();
            this.emit('status:changed', id, { status, pid });
        }
    }
    setInstanceHealth(id, health) {
        const instance = this.instances.get(id);
        if (instance) {
            instance.health = health;
            this.emit('health:updated', id, health);
        }
    }
    // ==================== Secrets Management ====================
    setSecret(instanceId, key, value) {
        let secrets = this.secrets.get(instanceId);
        if (!secrets) {
            secrets = {};
            this.secrets.set(instanceId, secrets);
        }
        secrets[key] = value;
        this.save();
    }
    getSecret(instanceId, key) {
        return this.secrets.get(instanceId)?.[key];
    }
    getSecrets(instanceId) {
        const secrets = this.secrets.get(instanceId);
        return secrets ? { ...secrets } : {};
    }
    deleteSecret(instanceId, key) {
        const secrets = this.secrets.get(instanceId);
        if (secrets) {
            delete secrets[key];
            this.save();
        }
    }
    // ==================== OpenClaw Config File ====================
    readOpenClawConfig(stateDir) {
        const configPath = path.join(stateDir, 'openclaw.json');
        if (!fs.existsSync(configPath))
            return null;
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
        catch {
            return null;
        }
    }
    writeOpenClawConfig(stateDir, config) {
        const configPath = path.join(stateDir, 'openclaw.json');
        fs.mkdirSync(stateDir, { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
    updateOpenClawConfig(stateDir, updates) {
        const config = this.readOpenClawConfig(stateDir) || {};
        const merged = this.deepMerge(config, updates);
        this.writeOpenClawConfig(stateDir, merged);
    }
    // ==================== Channel Config ====================
    updateChannelConfig(instanceId, channelType, config) {
        const instance = this.instances.get(instanceId);
        if (!instance)
            return;
        instance.channels = instance.channels || {};
        instance.channels[channelType] = config;
        instance.updatedAt = new Date();
        // Update openclaw.json
        this.updateOpenClawConfig(instance.stateDir, { channels: instance.channels });
        // Store secrets separately
        const secretFields = ['appSecret', 'clientSecret', 'secret', 'botToken', 'apiKey', 'appToken'];
        for (const field of secretFields) {
            const value = config[field];
            if (typeof value === 'string') {
                this.setSecret(instanceId, `${channelType}.${field}`, value);
            }
        }
        this.save();
        this.emit('instance:updated', instanceId, instance);
    }
    // ==================== Model Config ====================
    updateModelConfig(instanceId, model) {
        const instance = this.instances.get(instanceId);
        if (!instance)
            return;
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
    exportInstances() {
        return this.getInstances().map(({ status, health, pid, ...config }) => config);
    }
    importInstances(configs) {
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
    getInstanceStateDir(id) {
        return path.join(this.stateDir, id, 'state');
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
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config.js.map