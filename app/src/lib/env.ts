/**
 * Centralized environment variable validation for the frontend.
 * All required env vars are validated at import time.
 */

function required(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (value === undefined || value === '') {
    throw new Error(`[ENV] Missing required environment variable: ${name}. Check your .env file.`);
  }
  return value;
}

export const VITE_BACKEND_PORT = required('VITE_BACKEND_PORT');
export const VITE_API_KEY = required('VITE_API_KEY');
export const VITE_CLAUDE_WORK_DIR = required('VITE_CLAUDE_WORK_DIR');
