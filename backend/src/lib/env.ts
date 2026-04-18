/**
 * Centralized environment variable validation.
 * All required env vars are validated at import time — if any are missing, the process exits.
 */

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    console.error(`[ENV] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function requiredInt(name: string): number {
  const raw = required(name);
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    console.error(`[ENV] Environment variable ${name} must be an integer, got: ${raw}`);
    process.exit(1);
  }
  return parsed;
}

// Core
export const CLAUDE_WORK_DIR = required('CLAUDE_WORK_DIR');
export const BACKEND_PORT = requiredInt('BACKEND_PORT');
export const BACKEND_HOST = required('BACKEND_HOST');
export const API_KEY = process.env.API_KEY ?? '';

// Database paths
export const DB_CORE_PATH = required('DB_CORE_PATH');
export const DB_BABY_LOGS_PATH = required('DB_BABY_LOGS_PATH');
export const DB_LAWN_CARE_PATH = required('DB_LAWN_CARE_PATH');

// Terminal port ranges
export const XTERM_BASE_PORT = requiredInt('XTERM_BASE_PORT');
export const XTERM_MAX_PORT = requiredInt('XTERM_MAX_PORT');

// Superrepo root directory (for companies/modules)
export const SUPERREPO_DIR =
  process.env.SUPERREPO_DIR ?? '/Users/subbiahchandramouli/devbot-superrepo';
