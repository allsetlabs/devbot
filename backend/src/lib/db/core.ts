import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
// Database paths
const dbCorePath = process.env.DB_CORE_PATH || './devbot.db';

console.log('[DB] Initializing core database at:', dbCorePath);

// Initialize better-sqlite3
const sqliteDb = new BetterSqlite3(dbCorePath);

// Enable foreign keys
sqliteDb.pragma('foreign_keys = ON');

// Wrap with Drizzle ORM for type-safe queries
export const coreDb = drizzle(sqliteDb);

export type CoreDb = typeof coreDb;

// Export schema types for type-safe queries
export * from './schema';
