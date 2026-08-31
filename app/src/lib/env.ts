/**
 * Centralized environment variable validation for the frontend.
 *
 * In web mode, all required VITE_* env vars are validated at import time.
 * In native Capacitor mode, these vars may be baked in at build time or
 * overridden by runtime configuration (stored backend URL).
 * In Electron mode, env vars are optional — backend port is injected at runtime.
 */

import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const isElectron = !!(window as unknown as Record<string, unknown>).electronAPI;

/** Whether env vars can be deferred to runtime (native mobile or Electron desktop). */
const isRuntimeConfigured = isNative || isElectron;

function required(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (value === undefined || value === '') {
    // In native/Electron mode, some env vars are configured at runtime, not build time
    if (isRuntimeConfigured) return '';
    throw new Error(`[ENV] Missing required environment variable: ${name}. Check your .env file.`);
  }
  return value;
}

function optional(name: string): string {
  return (import.meta.env[name] as string) || '';
}

export const VITE_BACKEND_PORT = isRuntimeConfigured
  ? optional('VITE_BACKEND_PORT') || '3100'
  : required('VITE_BACKEND_PORT');

export const VITE_DEVBOT_PROJECTS_DIR = isRuntimeConfigured
  ? optional('VITE_DEVBOT_PROJECTS_DIR')
  : required('VITE_DEVBOT_PROJECTS_DIR');

// API key is optional when Google OAuth is configured
export const VITE_API_KEY = optional('VITE_API_KEY');

// Full backend URL override — used for Capacitor mobile builds
// Format: "https://192.168.1.100:3100"
export const VITE_BACKEND_URL = optional('VITE_BACKEND_URL');
