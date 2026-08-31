/**
 * System tray management for DevBot desktop app.
 *
 * macOS: Template icon in the menu bar with dock badge support.
 * Context menu: Show/Hide window, badge count display, Quit.
 */

import { Tray, Menu, app, type BrowserWindow } from 'electron';
import { createTrayIcon } from './icon';

let tray: Tray | null = null;
let badgeCount = 0;

export function createTray(mainWindow: BrowserWindow): Tray {
  const icon = createTrayIcon();
  tray = new Tray(icon);

  tray.setToolTip('DevBot');

  // Click to show/hide window
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      if (mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  updateTrayMenu(mainWindow);
  return tray;
}

function updateTrayMenu(mainWindow: BrowserWindow): void {
  if (!tray) return;

  const menuItems: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Show DevBot',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
  ];

  if (badgeCount > 0) {
    menuItems.push({
      label: `${badgeCount} notification${badgeCount > 1 ? 's' : ''}`,
      enabled: false,
    });
    menuItems.push({ type: 'separator' });
  }

  menuItems.push({
    label: 'Quit DevBot',
    click: () => {
      app.quit();
    },
  });

  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

/**
 * Update the notification badge count.
 * On macOS, also updates the dock badge.
 */
export function setBadgeCount(count: number, mainWindow: BrowserWindow): void {
  badgeCount = count;

  // macOS dock badge
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setBadge(count > 0 ? String(count) : '');
  }

  // Update tray tooltip
  if (tray) {
    tray.setToolTip(count > 0 ? `DevBot (${count} notifications)` : 'DevBot');
    updateTrayMenu(mainWindow);
  }

  // Bounce dock icon on macOS for new notifications
  if (count > 0 && process.platform === 'darwin' && app.dock && !mainWindow.isFocused()) {
    app.dock.bounce('informational');
  }
}

export function getBadgeCount(): number {
  return badgeCount;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
