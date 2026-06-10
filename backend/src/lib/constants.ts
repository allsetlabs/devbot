import { homedir } from 'os';
import { join } from 'path';

/** Core SQLite database path */
export const DB_CORE_PATH = join(homedir(), '.devbot', 'devbot.db');

/** Xterm WebSocket port range — one port per terminal session */
export const XTERM_BASE_PORT = 7750;
export const XTERM_MAX_PORT = 7799;
