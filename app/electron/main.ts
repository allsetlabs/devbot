/**
 * DevBot Electron main process.
 *
 * Creates the browser window, sets up the system tray, handles IPC,
 * and manages native notifications and badge counts.
 *
 * In development: loads the Vite dev server at https://localhost:4005
 * In production:  loads the built app from dist/index.html
 */

import {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  shell,
  type BrowserWindowConstructorOptions,
} from 'electron';
import { join } from 'node:path';
import { loadWindowState, saveWindowState } from './window-state';
import { createTray, setBadgeCount, destroyTray } from './tray';
import { createAppIcon } from './icon';

// ──────────────────────────── Constants ──────────────────────────────────────

const IS_DEV = !app.isPackaged;
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'https://localhost:4005';
const BACKEND_PORT = process.env.BACKEND_PORT || '3100';

// ──────────────────────────── Window creation ───────────────────────────────

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const state = loadWindowState();

  const opts: BrowserWindowConstructorOptions = {
    width: state.width,
    height: state.height,
    minWidth: 400,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS: hides title bar, shows traffic lights
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#09090b', // zinc-950 — matches app background
    icon: createAppIcon(),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow self-signed certs in dev
      ...(IS_DEV ? {} : {}),
    },
    show: false, // Show when ready to prevent flash
  };

  // Restore position if saved
  if (state.x !== undefined && state.y !== undefined) {
    opts.x = state.x;
    opts.y = state.y;
  }

  mainWindow = new BrowserWindow(opts);

  // Restore maximized state
  if (state.maximized) {
    mainWindow.maximize();
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (IS_DEV) {
    mainWindow.loadURL(DEV_SERVER_URL);
    // Ignore self-signed certificate errors in development
    mainWindow.webContents.session.setCertificateVerifyProc((_request, callback) => {
      callback(0); // 0 = success
    });
  } else {
    mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'));
  }

  // Inject backend port as env for the renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.executeJavaScript(`
      window.__ELECTRON_BACKEND_PORT__ = '${BACKEND_PORT}';
    `);
  });

  // Save window state on move/resize
  const saveState = () => {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    saveWindowState({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized: mainWindow.isMaximized(),
    });
  };

  mainWindow.on('resize', saveState);
  mainWindow.on('move', saveState);
  mainWindow.on('maximize', saveState);
  mainWindow.on('unmaximize', saveState);

  // Hide to tray instead of closing on macOS
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create system tray
  createTray(mainWindow);
}

// ──────────────────────────── IPC handlers ───────────────────────────────────

function setupIPC(): void {
  // Badge count
  ipcMain.on('set-badge-count', (_event, count: number) => {
    if (mainWindow) {
      setBadgeCount(count, mainWindow);
    }
  });

  // Native notifications
  ipcMain.on(
    'show-notification',
    (_event, { title, body, data }: { title: string; body: string; data?: Record<string, unknown> }) => {
      if (!Notification.isSupported()) return;

      const notification = new Notification({
        title,
        body,
        silent: false,
      });

      notification.on('click', () => {
        // Show and focus the window
        mainWindow?.show();
        mainWindow?.focus();
        // Forward the click event with data to the renderer
        mainWindow?.webContents.send('notification-clicked', data || {});
      });

      notification.show();
    }
  );

  // Window controls
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow?.close());
  ipcMain.on('window-toggle-fullscreen', () => {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);
  ipcMain.handle('get-version', () => app.getVersion());

  // Open external URLs
  ipcMain.on('open-external', (_event, url: string) => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
    }
  });
}

// ──────────────────────────── App lifecycle ──────────────────────────────────

// Flag to distinguish "close to tray" from "actually quit" on macOS
let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

app.whenReady().then(() => {
  setupIPC();
  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray();
    app.quit();
  }
});

// Security: prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});
