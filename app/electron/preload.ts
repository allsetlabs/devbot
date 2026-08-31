/**
 * Electron preload script — exposes safe IPC APIs to the renderer
 * via contextBridge so the React app can interact with native features
 * without needing nodeIntegration.
 *
 * The renderer accesses these via `window.electronAPI`.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Platform info ──────────────────────────────────────────────────────
  platform: process.platform,
  isElectron: true,

  // ── Badge / notifications ──────────────────────────────────────────────
  setBadgeCount: (count: number) => ipcRenderer.send('set-badge-count', count),
  showNotification: (title: string, body: string, data?: Record<string, unknown>) =>
    ipcRenderer.send('show-notification', { title, body, data }),

  // ── Window controls ────────────────────────────────────────────────────
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // ── App lifecycle ──────────────────────────────────────────────────────
  getVersion: () => ipcRenderer.invoke('get-version'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),

  // ── Event listeners ────────────────────────────────────────────────────
  onNotificationClicked: (callback: (data: Record<string, unknown>) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: Record<string, unknown>) =>
      callback(data);
    ipcRenderer.on('notification-clicked', handler);
    return () => ipcRenderer.removeListener('notification-clicked', handler);
  },
});
