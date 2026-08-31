/**
 * Window state persistence — remembers position, size, and maximized state
 * across app restarts. Stores to a JSON file in the user data directory.
 */

import { app } from 'electron';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1200,
  height: 800,
  maximized: false,
};

const STATE_FILE = 'window-state.json';

function getStatePath(): string {
  const dir = app.getPath('userData');
  return join(dir, STATE_FILE);
}

export function loadWindowState(): WindowState {
  try {
    const raw = readFileSync(getStatePath(), 'utf-8');
    const state = JSON.parse(raw) as Partial<WindowState>;
    return {
      x: state.x,
      y: state.y,
      width: state.width ?? DEFAULT_STATE.width,
      height: state.height ?? DEFAULT_STATE.height,
      maximized: state.maximized ?? DEFAULT_STATE.maximized,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveWindowState(state: WindowState): void {
  try {
    const dir = app.getPath('userData');
    mkdirSync(dir, { recursive: true });
    writeFileSync(getStatePath(), JSON.stringify(state, null, 2));
  } catch {
    // Non-critical — silently fail
  }
}
