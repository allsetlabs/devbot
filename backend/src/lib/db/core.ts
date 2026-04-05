import { mkdirSync } from 'fs';
import { dirname } from 'path';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { DB_CORE_PATH } from '../env.js';

// Ensure parent directory exists
mkdirSync(dirname(DB_CORE_PATH), { recursive: true });

console.log('[DB] Initializing core database at:', DB_CORE_PATH);

// Initialize better-sqlite3
const sqliteDb = new BetterSqlite3(DB_CORE_PATH);

// Enable foreign keys
sqliteDb.pragma('foreign_keys = ON');

// Wrap with Drizzle ORM for type-safe queries
export const coreDb = drizzle(sqliteDb);

export type CoreDb = typeof coreDb;

// Export schema types for type-safe queries
export * from './schema';
