import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { OpenClawManager, InstanceStatus } from '@openclaw/desktop-core';

let mainWindow: BrowserWindow | null = null;
let manager: OpenClawManager | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'OpenClaw Desktop',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load renderer
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize manager
function initManager(): void {
  const stateDir = path.join(app.getPath('userData'), 'instances');
  manager = new OpenClawManager(stateDir);

  manager.onChange(() => {
    if (mainWindow) {
      mainWindow.webContents.send('state-update', manager!.getInstances());
    }
  });
}

// IPC Handlers

ipcMain.handle('get-instances', async () => {
  return manager?.getInstances() || [];
});

ipcMain.handle('get-instance', async (_event, id: string) => {
  return manager?.getInstance(id);
});

ipcMain.handle('create-instance', async (_event, options) => {
  return manager?.create(options);
});

ipcMain.handle('delete-instance', async (_event, id: string) => {
  return manager?.delete(id);
});

ipcMain.handle('clone-instance', async (_event, id: string, name?: string) => {
  return manager?.clone(id, name);
});

ipcMain.handle('start-instance', async (_event, id: string) => {
  await manager?.start(id);
  return true;
});

ipcMain.handle('stop-instance', async (_event, id: string) => {
  await manager?.stop(id);
  return true;
});

ipcMain.handle('restart-instance', async (_event, id: string) => {
  await manager?.restart(id);
  return true;
});

ipcMain.handle('health-check', async (_event, id: string) => {
  return manager?.healthCheck(id);
});

ipcMain.handle('get-templates', async () => {
  return manager?.getTemplates() || [];
});

ipcMain.handle('backup-instance', async (_event, id: string, includeSecrets?: boolean) => {
  const backup = manager?.backup(id, includeSecrets);

  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: `openclaw-${id}-backup-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (result.filePath && backup) {
    const fs = await import('fs');
    fs.writeFileSync(result.filePath, JSON.stringify(backup, null, 2));
    return true;
  }
  return false;
});

ipcMain.handle('restore-instance', async (_event, id: string) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (result.filePaths.length > 0) {
    const fs = await import('fs');
    const backup = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
    manager?.restore(id, backup);
    return true;
  }
  return false;
});

ipcMain.handle('open-dashboard', async (_event, id: string) => {
  const instance = manager?.getInstance(id);
  if (instance) {
    await shell.openExternal(`http://localhost:${instance.port}`);
  }
});

ipcMain.handle('open-config', async (_event, id: string) => {
  const instance = manager?.getInstance(id);
  if (instance) {
    const configPath = path.join(instance.stateDir, 'openclaw.json');
    await shell.openPath(configPath);
  }
});

ipcMain.handle('open-logs', async (_event, id: string) => {
  const instance = manager?.getInstance(id);
  if (instance) {
    const logsPath = path.join(instance.stateDir, 'logs');
    await shell.openPath(logsPath);
  }
});

// App lifecycle

app.whenReady().then(() => {
  initManager();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  manager?.dispose();
});
