import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('openclaw', {
  getInstances: () => ipcRenderer.invoke('get-instances'),
  getInstance: (id: string) => ipcRenderer.invoke('get-instance', id),
  createInstance: (options: Record<string, unknown>) => ipcRenderer.invoke('create-instance', options),
  deleteInstance: (id: string) => ipcRenderer.invoke('delete-instance', id),
  cloneInstance: (id: string, name?: string) => ipcRenderer.invoke('clone-instance', id, name),
  startInstance: (id: string) => ipcRenderer.invoke('start-instance', id),
  stopInstance: (id: string) => ipcRenderer.invoke('stop-instance', id),
  restartInstance: (id: string) => ipcRenderer.invoke('restart-instance', id),
  healthCheck: (id: string) => ipcRenderer.invoke('health-check', id),
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  backupInstance: (id: string, includeSecrets?: boolean) => ipcRenderer.invoke('backup-instance', id, includeSecrets),
  restoreInstance: (id: string) => ipcRenderer.invoke('restore-instance', id),
  openDashboard: (id: string) => ipcRenderer.invoke('open-dashboard', id),
  openConfig: (id: string) => ipcRenderer.invoke('open-config', id),
  openLogs: (id: string) => ipcRenderer.invoke('open-logs', id),

  onStateUpdate: (callback: (instances: unknown[]) => void) => {
    ipcRenderer.on('state-update', (_event, instances) => callback(instances));
  }
});
