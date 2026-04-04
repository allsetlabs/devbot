import { mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';

const defaultDbDir = join(homedir(), '.devbot');
mkdirSync(defaultDbDir, { recursive: true });
const dbPath = process.env.DB_LAWN_CARE_PATH || join(defaultDbDir, 'lawn-care.db');

console.log('[DB] Initializing lawn-care database at:', dbPath);

const sqliteDb = new BetterSqlite3(dbPath);
sqliteDb.pragma('foreign_keys = ON');

export const lawnCareDb = drizzle(sqliteDb, { schema });
export type LawnCareDb = typeof lawnCareDb;

/** Initialize lawn-care database tables */
export function initializeLawnCareDatabase(): void {
  console.log('[DB] Initializing lawn-care database schema...');

  lawnCareDb.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS lawn_care_profiles (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      grass_type TEXT NOT NULL,
      sqft INTEGER,
      climate_zone TEXT,
      sun_exposure TEXT CHECK(sun_exposure IN ('full_sun', 'partial_shade', 'full_shade')),
      application_method TEXT CHECK(application_method IN ('spreader', 'sprayer')),
      equipment_model TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      settings TEXT
    )
  `)
  );

  lawnCareDb.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS lawn_care_plans (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      chat_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('generating', 'completed', 'failed')),
      plan_data TEXT,
      error_message TEXT,
      generated_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      settings TEXT
    )
  `)
  );

  lawnCareDb.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS lawn_care_photos (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      application_order INTEGER,
      file_path TEXT NOT NULL,
      caption TEXT,
      taken_at TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      settings TEXT
    )
  `)
  );

  console.log('[DB] Lawn-care database schema initialized successfully');
}
