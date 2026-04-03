import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';

const dbPath = process.env.DB_BABY_LOGS_PATH || './baby-logs.db';

console.log('[DB] Initializing baby-logs database at:', dbPath);

const sqliteDb = new BetterSqlite3(dbPath);
sqliteDb.pragma('foreign_keys = ON');

export const babyLogsDb = drizzle(sqliteDb, { schema });
export type BabyLogsDb = typeof babyLogsDb;

/** Initialize baby-logs database tables */
export function initializeBabyLogsDatabase(): void {
  console.log('[DB] Initializing baby-logs database schema...');

  babyLogsDb.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS baby_logs_logs (
      id TEXT PRIMARY KEY,
      log_type TEXT NOT NULL CHECK(log_type IN ('feeding', 'diaper', 'weight', 'height', 'head_circumference')),
      feeding_type TEXT CHECK(feeding_type IN ('bottle', 'breast')),
      feeding_duration_min INTEGER,
      feeding_ml REAL,
      breast_side TEXT CHECK(breast_side IN ('left', 'right', 'both')),
      diaper_wet_pct INTEGER,
      diaper_poop TEXT CHECK(diaper_poop IN ('small', 'large')),
      fed_by TEXT,
      note TEXT,
      weight_kg REAL,
      height_cm REAL,
      head_circumference_cm REAL,
      logged_at TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      settings TEXT
    )
  `)
  );

  babyLogsDb.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS baby_logs_profiles (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      time_of_birth TEXT,
      gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
      blood_type TEXT,
      place_of_birth TEXT,
      city_of_birth TEXT,
      state_of_birth TEXT,
      country_of_birth TEXT,
      citizenship TEXT,
      father_name TEXT,
      mother_name TEXT,
      birth_weight_kg REAL,
      birth_height_cm REAL,
      gestational_week INTEGER,
      note TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      settings TEXT
    )
  `)
  );

  console.log('[DB] Baby-logs database schema initialized successfully');
}
