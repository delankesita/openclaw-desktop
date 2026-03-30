#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { OpenClawManager, InstanceStatus } from '@openclaw/desktop-core';

const manager = new OpenClawManager();

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function color(text: string, c: keyof typeof COLORS): string {
  return `${COLORS[c]}${text}${COLORS.reset}`;
}

function print(text: string): void {
  process.stdout.write(text + '\n');
}

function error(text: string): void {
  process.stderr.write(color(text, 'red') + '\n');
}

function success(text: string): void {
  print(color('✓', 'green') + ' ' + text);
}

function getStatusColor(status: InstanceStatus): keyof typeof COLORS {
  switch (status) {
    case InstanceStatus.Running: return 'green';
    case InstanceStatus.Stopped: return 'gray';
    case InstanceStatus.Error: return 'red';
    default: return 'yellow';
  }
}

async function listCommand(): Promise<void> {
  const instances = manager.getInstances();
  
  if (instances.length === 0) {
    print(color('No instances found', 'yellow'));
    return;
  }

  print('');
  print(color('INSTANCES', 'cyan'));
  print('─'.repeat(80));
  
  for (const instance of instances) {
    const status = color(instance.status, getStatusColor(instance.status));
    print(`  ${instance.id.padEnd(20)} ${instance.name.padEnd(25)} port:${instance.port.toString().padStart(5)}  ${status}`);
  }
  print('');
}

async function createCommand(args: string[]): Promise<void> {
  const name = args[0] || `shrimp-${Date.now()}`;
  
  print(`Creating instance "${name}"...`);
  
  try {
    const instance = await manager.create({ name });
    success(`Instance created: ${instance!.name} (port ${instance!.port})`);
  } catch (err) {
    error(`Failed: ${(err as Error).message}`);
  }
}

async function deleteCommand(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    error('Usage: delete <id>');
    return;
  }
  
  try {
    await manager.delete(id);
    success(`Instance "${id}" deleted`);
  } catch (err) {
    error(`Failed: ${(err as Error).message}`);
  }
}

async function startCommand(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    error('Usage: start <id>');
    return;
  }
  
  print(`Starting instance "${id}"...`);
  
  try {
    await manager.start(id);
    success(`Instance "${id}" started`);
  } catch (err) {
    error(`Failed: ${(err as Error).message}`);
  }
}

async function stopCommand(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    error('Usage: stop <id>');
    return;
  }
  
  print(`Stopping instance "${id}"...`);
  
  try {
    await manager.stop(id);
    success(`Instance "${id}" stopped`);
  } catch (err) {
    error(`Failed: ${(err as Error).message}`);
  }
}

async function restartCommand(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    error('Usage: restart <id>');
    return;
  }
  
  print(`Restarting instance "${id}"...`);
  
  try {
    await manager.restart(id);
    success(`Instance "${id}" restarted`);
  } catch (err) {
    error(`Failed: ${(err as Error).message}`);
  }
}

async function healthCommand(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    error('Usage: health <id>');
    return;
  }
  
  const health = await manager.healthCheck(id);
  
  if (!health) {
    error('Health check failed');
    return;
  }
  
  print('');
  print(color('HEALTH STATUS', 'cyan'));
  print('─'.repeat(40));
  print(`  Status:  ${health.status === 'ok' ? color('OK', 'green') : color('ERROR', 'red')}`);
  print(`  CPU:     ${health.cpu}%`);
  print(`  Memory:  ${(health.memory / 1024 / 1024).toFixed(2)} MB`);
  print(`  Uptime:  ${Math.floor(health.uptime / 60)} minutes`);
  if (health.message) {
    print(`  Message: ${health.message}`);
  }
  print('');
}

async function templatesCommand(): Promise<void> {
  const templates = manager.getTemplates();
  
  print('');
  print(color('TEMPLATES', 'cyan'));
  print('─'.repeat(80));
  
  for (const t of templates) {
    print(`  ${t.icon} ${t.name.padEnd(20)} [${t.category.padEnd(12)}] ${t.description}`);
  }
  print('');
}

async function backupCommand(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    error('Usage: backup <id> [output_file]');
    return;
  }
  
  try {
    const backup = manager.backup(id);
    const outputPath = args[1] || `${id}-backup-${Date.now()}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2));
    success(`Backup saved to ${outputPath}`);
  } catch (err) {
    error(`Failed: ${(err as Error).message}`);
  }
}

async function restoreCommand(args: string[]): Promise<void> {
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
  } catch (err) {
    error(`Failed: ${(err as Error).message}`);
  }
}

function helpCommand(): void {
  print('');
  print(color('OpenClaw Desktop', 'cyan') + ' - Manage OpenClaw instances');
  print('');
  print('USAGE');
  print('  openclaw-desktop <command> [args]');
  print('');
  print('COMMANDS');
  print('  list, ls              List all instances');
  print('  create [name]         Create a new instance');
  print('  delete <id>           Delete an instance');
  print('  start <id>            Start an instance');
  print('  stop <id>             Stop an instance');
  print('  restart <id>          Restart an instance');
  print('  health <id>           Check instance health');
  print('  templates             List available templates');
  print('  backup <id> [file]    Backup instance configuration');
  print('  restore <id> <file>   Restore instance from backup');
  print('  help                  Show this help message');
  print('');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const cmdArgs = args.slice(1);

  switch (command) {
    case 'list':
    case 'ls':
      await listCommand();
      break;
    case 'create':
      await createCommand(cmdArgs);
      break;
    case 'delete':
    case 'rm':
      await deleteCommand(cmdArgs);
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
    case 'help':
    case '--help':
    case '-h':
      helpCommand();
      break;
    default:
      error(`Unknown command: ${command}`);
      helpCommand();
  }
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
