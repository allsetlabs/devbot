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

function optional(name: string): string {
  return (import.meta.env[name] as string) || '';
}

export const VITE_BACKEND_PORT = required('VITE_BACKEND_PORT');
export const VITE_DEVBOT_PROJECTS_DIR = required('VITE_DEVBOT_PROJECTS_DIR');

// API key is optional when Google OAuth is configured
export const VITE_API_KEY = optional('VITE_API_KEY');
