#!/usr/bin/env node
"use strict";
/**
 * OpenClaw Manager CLI
 * Command-line interface for managing OpenClaw instances
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
const fs = __importStar(require("fs"));
const manager_core_1 = require("@openclaw/manager-core");
const manager = new manager_core_1.OpenClawManager();
// Colors
const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    bold: '\x1b[1m'
};
function color(text, c) {
    return `${COLORS[c]}${text}${COLORS.reset}`;
}
function print(text = '') {
    process.stdout.write(text + '\n');
}
function error(text) {
    process.stderr.write(color(text, 'red') + '\n');
}
function success(text) {
    print(color('✓', 'green') + ' ' + text);
}
function getStatusColor(status) {
    switch (status) {
        case manager_core_1.InstanceStatus.Running: return 'green';
        case manager_core_1.InstanceStatus.Stopped: return 'gray';
        case manager_core_1.InstanceStatus.Error: return 'red';
        default: return 'yellow';
    }
}
// ==================== Commands ====================
async function listCommand() {
    const instances = manager.getInstances();
    if (instances.length === 0) {
        print(color('No instances found', 'yellow'));
        print('');
        print('Create one with: openclaw-manager create');
        return;
    }
    print('');
    print(color('INSTANCES', 'cyan'));
    print('─'.repeat(90));
    for (const instance of instances) {
        const status = color(instance.status, getStatusColor(instance.status));
        const model = instance.model || 'default';
        const health = instance.health?.status === 'ok' ? color('●', 'green') :
            instance.health?.status === 'error' ? color('●', 'red') : '○';
        print(`  ${instance.id.padEnd(20)} ${instance.name.padEnd(20)} port:${String(instance.port).padStart(5)}  ${status.padEnd(10)} ${health} ${model}`);
    }
    print('');
}
async function createCommand(args) {
    const name = args[0] || `shrimp-${Date.now()}`;
    const template = args.find(a => a.startsWith('-t='))?.slice(3) || args.find(a => a.startsWith('--template='))?.slice(11);
    const model = args.find(a => a.startsWith('-m='))?.slice(3) || args.find(a => a.startsWith('--model='))?.slice(8);
    print(`Creating instance "${name}"...`);
    try {
        const instance = await manager.create({ name, template, model });
        success(`Instance created: ${instance.name} (port ${instance.port})`);
        print('');
        print('Start with: openclaw-manager start ' + instance.id);
    }
    catch (err) {
        error(`Failed: ${err.message}`);
    }
}
async function deleteCommand(args) {
    const id = args[0];
    if (!id) {
        error('Usage: delete <id>');
        return;
    }
    const instance = manager.getInstance(id);
    if (!instance) {
        error(`Instance "${id}" not found`);
        return;
    }
    try {
        await manager.delete(id);
        success(`Instance "${instance.name}" deleted`);
    }
    catch (err) {
        error(`Failed: ${err.message}`);
    }
}
async function cloneCommand(args) {
    const id = args[0];
    const newName = args[1];
    if (!id) {
        error('Usage: clone <id> [new_name]');
        return;
    }
    try {
        const instance = await manager.clone(id, newName);
        success(`Cloned to: ${instance.name} (port ${instance.port})`);
    }
    catch (err) {
        error(`Failed: ${err.message}`);
    }
}
async function startCommand(args) {
    const id = args[0];
    if (!id) {
        error('Usage: start <id>');
        return;
    }
    print(`Starting instance "${id}"...`);
    try {
        await manager.start(id);
        success(`Instance "${id}" started`);
    }
    catch (err) {
        error(`Failed: ${err.message}`);
    }
}
async function stopCommand(args) {
    const id = args[0];
    if (!id) {
        error('Usage: stop <id>');
        return;
    }
    print(`Stopping instance "${id}"...`);
    try {
        await manager.stop(id);
        success(`Instance "${id}" stopped`);
    }
    catch (err) {
        error(`Failed: ${err.message}`);
    }
}
async function restartCommand(args) {
    const id = args[0];
    if (!id) {
        error('Usage: restart <id>');
        return;
    }
    print(`Restarting instance "${id}"...`);
    try {
        await manager.restart(id);
        success(`Instance "${id}" restarted`);
    }
    catch (err) {
        error(`Failed: ${err.message}`);
    }
}
async function healthCommand(args) {
    const id = args[0];
    if (!id) {
        error('Usage: health <id>');
        return;
    }
    const health = await manager.healthCheck(id);
    if (!health) {
        error('Instance not found');
        return;
    }
    print('');
    print(color('HEALTH STATUS', 'cyan'));
    print('─'.repeat(50));
    print(`  Status:  ${health.status === 'ok' ? color('OK', 'green') : color('ERROR', 'red')}`);
    print(`  CPU:     ${health.cpu}%`);
    print(`  Memory:  ${(health.memory / 1024 / 1024).toFixed(2)} MB`);
    print(`  Uptime:  ${Math.floor(health.uptime / 60)} minutes`);
    if (health.message) {
        print(`  Message: ${health.message}`);
    }
    print('');
}
async function templatesCommand() {
    const templates = manager.getTemplates();
    print('');
    print(color('TEMPLATES', 'cyan'));
    print('─'.repeat(80));
    const categories = {
        basic: [],
        development: [],
        production: [],
        specialized: []
    };
    for (const t of templates) {
        categories[t.category].push(t);
    }
    for (const [category, items] of Object.entries(categories)) {
        if (items.length > 0) {
            print(`\n  ${color(category.toUpperCase(), 'bold')}`);
            for (const t of items) {
                print(`    ${t.icon} ${t.name.padEnd(22)} ${t.description}`);
            }
        }
    }
    print('');
}
async function backupCommand(args) {
    const id = args[0];
    const output = args.find(a => !a.startsWith('-'));
    const includeSecrets = args.includes('-s') || args.includes('--secrets');
    if (!id) {
        error('Usage: backup <id> [output_file] [-s|--secrets]');
        return;
    }
    try {
        const backup = manager.backup(id, includeSecrets);
        const outputPath = output || `${id}-backup-${Date.now()}.json`;
        fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2));
        success(`Backup saved to ${outputPath}`);
        if (!includeSecrets) {
            print(color('  (secrets not included, use -s to include)', 'gray'));
        }
    }
    catch (err) {
        error(`Failed: ${err.message}`);
    }
}
async function restoreCommand(args) {
    const id = args[0];
    const file = args[1];
    if (!id || !file) {
        error('Usage: restore <id> <backup_file>');
        return;
    }
    print(`Restoring instance "${id}"...`);
    try {
        const backup = JSON.parse(fs.readFileSync(file, 'utf-8'));
        manager.restore(id, backup);
        success(`Instance "${id}" restored`);
    }
    catch (err) {
        error(`Failed: ${err.message}`);
    }
}
async function exportCommand(args) {
    const output = args[0] || `openclaw-instances-${new Date().toISOString().split('T')[0]}.json`;
    try {
        const data = manager.exportAll();
        fs.writeFileSync(output, JSON.stringify(data, null, 2));
        success(`Exported ${data.instances.length} instances to ${output}`);
    }
    catch (err) {
        error(`Failed: ${err.message}`);
    }
}
async function importCommand(args) {
    const file = args[0];
    if (!file) {
        error('Usage: import <file>');
        return;
    }
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const count = manager.importAll(data);
        success(`Imported ${count} instances`);
    }
    catch (err) {
        error(`Failed: ${err.message}`);
    }
}
function helpCommand() {
    print('');
    print(color('OpenClaw Manager', 'cyan') + ' - Manage OpenClaw instances');
    print('');
    print(color('USAGE', 'bold'));
    print('  openclaw-manager <command> [args] [options]');
    print('');
    print(color('INSTANCES', 'bold'));
    print('  list, ls                  List all instances');
    print('  create [name]             Create a new instance');
    print('  delete <id>               Delete an instance');
    print('  clone <id> [name]         Clone an instance');
    print('');
    print(color('PROCESS', 'bold'));
    print('  start <id>                Start an instance');
    print('  stop <id>                 Stop an instance');
    print('  restart <id>              Restart an instance');
    print('  health <id>               Check instance health');
    print('');
    print(color('CONFIGURATION', 'bold'));
    print('  templates                 List available templates');
    print('  config <id>               Show config path');
    print('  logs <id>                 Show logs path');
    print('');
    print(color('BACKUP', 'bold'));
    print('  backup <id> [file] [-s]   Backup instance (use -s for secrets)');
    print('  restore <id> <file>       Restore instance from backup');
    print('  export [file]             Export all instances');
    print('  import <file>             Import instances');
    print('');
    print(color('CREATE OPTIONS', 'bold'));
    print('  -t, --template=<id>       Template to use');
    print('  -m, --model=<model>       Default model');
    print('');
    print(color('EXAMPLES', 'bold'));
    print('  openclaw-manager create my-bot -t=chatbot');
    print('  openclaw-manager start my-bot');
    print('  openclaw-manager backup my-bot -s');
    print('');
}
// ==================== Main ====================
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const cmdArgs = args.slice(1);
    switch (command) {
        case 'list':
        case 'ls':
            await listCommand();
            break;
        case 'create':
        case 'new':
            await createCommand(cmdArgs);
            break;
        case 'delete':
        case 'rm':
            await deleteCommand(cmdArgs);
            break;
        case 'clone':
            await cloneCommand(cmdArgs);
            break;
        case 'start':
            await startCommand(cmdArgs);
            break;
        case 'stop':
            await stopCommand(cmdArgs);
            break;
        case 'restart':
            await restartCommand(cmdArgs);
            break;
        case 'health':
        case 'status':
            await healthCommand(cmdArgs);
            break;
        case 'templates':
            await templatesCommand();
            break;
        case 'backup':
            await backupCommand(cmdArgs);
            break;
        case 'restore':
            await restoreCommand(cmdArgs);
            break;
        case 'export':
            await exportCommand(cmdArgs);
            break;
        case 'import':
            await importCommand(cmdArgs);
            break;
        case 'config': {
            const id = cmdArgs[0];
            if (id) {
                const configPath = manager.openConfig(id);
                if (configPath)
                    print(configPath);
                else
                    error('Instance not found');
            }
            break;
        }
        case 'logs': {
            const id = cmdArgs[0];
            if (id) {
                const logsPath = manager.viewLogs(id);
                if (logsPath)
                    print(logsPath);
                else
                    error('Instance not found');
            }
            break;
        }
        case 'help':
        case '--help':
        case '-h':
            helpCommand();
            break;
        default:
            error(`Unknown command: ${command}`);
            helpCommand();
    }
    manager.dispose();
}
main().catch(err => {
    error(err.message);
    process.exit(1);
});
//# sourceMappingURL=index.js.map