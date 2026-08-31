/**
 * Electron desktop platform utilities.
 *
 * Detects whether the app is running inside Electron and provides
 * type-safe wrappers for the preload-exposed IPC APIs.
 * Gracefully degrades to no-ops when running in a browser or Capacitor.
 */

// ──────────────────────────── Type definitions ──────────────────────────────

export interface ElectronAPI {
  platform: string;
  isElectron: true;

  setBadgeCount: (count: number) => void;
  showNotification: (title: string, body: string, data?: Record<string, unknown>) => void;

  minimize: () => void;
  maximize: () => void;
  close: () => void;
  toggleFullscreen: () => void;
  isMaximized: () => Promise<boolean>;

  getVersion: () => Promise<string>;
  openExternal: (url: string) => void;

  onNotificationClicked: (callback: (data: Record<string, unknown>) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __ELECTRON_BACKEND_PORT__?: string;
  }
}

// ──────────────────────────── Detection ──────────────────────────────────────

/** Whether the app is running inside Electron. */
export const isElectron: boolean = !!window.electronAPI?.isElectron;

/** The Electron platform (darwin, win32, linux) or null if not in Electron. */
export const electronPlatform: string | null = isElectron
  ? window.electronAPI!.platform
  : null;

// ──────────────────────────── Badge API ──────────────────────────────────────

/**
 * Set the notification badge count on the dock/taskbar icon and system tray.
 * No-op in browser mode.
 */
export function setDesktopBadge(count: number): void {
  window.electronAPI?.setBadgeCount(count);
}

// ──────────────────────────── Notifications ──────────────────────────────────

/**
 * Show a native desktop notification via Electron.
 * Falls through to browser Notification API if not in Electron (handled by capacitor.ts).
 */
export function showDesktopNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): void {
  window.electronAPI?.showNotification(title, body, data);
}

/**
 * Listen for notification click events from Electron.
 * Returns a cleanup function. No-op in browser mode.
 */
export function onDesktopNotificationClicked(
  callback: (data: Record<string, unknown>) => void
): () => void {
  if (!window.electronAPI) return () => {};
  return window.electronAPI.onNotificationClicked(callback);
}

// ──────────────────────────── Window controls ───────────────────────────────

export function minimizeWindow(): void {
  window.electronAPI?.minimize();
}

export function maximizeWindow(): void {
  window.electronAPI?.maximize();
}

export function closeWindow(): void {
  window.electronAPI?.close();
}

export function toggleFullscreen(): void {
  window.electronAPI?.toggleFullscreen();
}

// ──────────────────────────── App info ───────────────────────────────────────

/** Get the Electron app version. Returns '0.0.0' in browser mode. */
export async function getDesktopVersion(): Promise<string> {
  if (!window.electronAPI) return '0.0.0';
  return window.electronAPI.getVersion();
}

/** Open a URL in the user's default browser. No-op in browser mode. */
export function openExternalUrl(url: string): void {
  window.electronAPI?.openExternal(url);
}

// ──────────────────────────── Backend URL ────────────────────────────────────

/**
 * Get the backend port injected by Electron's main process.
 * Returns null if not running in Electron.
 */
export function getElectronBackendPort(): string | null {
  if (!isElectron) return null;
  return window.__ELECTRON_BACKEND_PORT__ || null;
}
