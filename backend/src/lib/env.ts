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
export const DEVBOT_PROJECTS_DIR = required('DEVBOT_PROJECTS_DIR');
export const BACKEND_PORT = requiredInt('BACKEND_PORT');
export const BACKEND_HOST = required('BACKEND_HOST');
export const API_KEY: string | undefined = process.env.API_KEY;

// Google OAuth (optional — if not set, falls back to API key auth)
export const GOOGLE_CLIENT_ID: string | undefined = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET: string | undefined = process.env.GOOGLE_CLIENT_SECRET;
export const ALLOWED_EMAIL: string =
  process.env.ALLOWED_EMAIL || 'subbiah2806@gmail.com';
export const SESSION_SECRET: string =
  process.env.SESSION_SECRET || API_KEY || 'devbot-dev-secret';

// Database paths
export const DB_CORE_PATH = required('DB_CORE_PATH');
export const DB_BABY_LOGS_PATH = required('DB_BABY_LOGS_PATH');
export const DB_LAWN_CARE_PATH = required('DB_LAWN_CARE_PATH');

// Terminal port ranges
export const XTERM_BASE_PORT = requiredInt('XTERM_BASE_PORT');
export const XTERM_MAX_PORT = requiredInt('XTERM_MAX_PORT');
