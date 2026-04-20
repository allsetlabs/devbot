import { sql } from 'drizzle-orm';
import { coreDb } from './core.js';

/**
 * Helper to run raw SQL with Drizzle (better-sqlite3 is synchronous)
 */
async function runSQL(sqlString: string): Promise<void> {
  try {
    // better-sqlite3 with Drizzle uses run() for raw SQL
    coreDb.run(sql.raw(sqlString));
  } catch (err) {
    console.error('[DB] SQL Error:', err);
    throw err;
  }
}

/**
 * Initialize core database schema
 * Creates tables if they don't exist
 */
export async function initializeCoreDatabase() {
  try {
    console.log('[DB] Initializing core database schema...');

    // Create sessions table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'New Chat',
        port INTEGER NOT NULL,
        ws_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_by TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'user',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}'
      )
    `
    );

    // Create scheduled_tasks table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        name TEXT,
        interval_minutes INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'deleted')),
        last_run_at TEXT,
        next_run_at TEXT,
        run_count INTEGER NOT NULL DEFAULT 0,
        max_runs INTEGER,
        created_by TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'user',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}'
      )
    `
    );

    // Create task_runs table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS task_runs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        run_index INTEGER NOT NULL,
        chat_id TEXT,
        started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
        output_file TEXT,
        error_message TEXT,
        created_by TEXT NOT NULL DEFAULT 'system',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'system',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}',
        UNIQUE(task_id, run_index)
      )
    `
    );

    // Create task_messages table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS task_messages (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('user', 'assistant', 'tool_use', 'tool_result', 'system')),
        content TEXT NOT NULL,
        created_by TEXT NOT NULL DEFAULT 'system',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'system',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}',
        UNIQUE(run_id, sequence)
      )
    `
    );

    // Create interactive_chats table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS interactive_chats (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'New Chat',
        type TEXT NOT NULL DEFAULT 'Manual',
        claude_session_id TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
        permission_mode TEXT NOT NULL DEFAULT 'dangerous' CHECK(permission_mode IN ('plan', 'auto-accept', 'dangerous')),
        model TEXT NOT NULL DEFAULT 'sonnet' CHECK(model IN ('opus', 'sonnet', 'haiku')),
        system_prompt TEXT,
        is_executing INTEGER NOT NULL DEFAULT 0,
        max_turns INTEGER,
        archived_at TEXT,
        created_by TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'user',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}'
      )
    `
    );

    // Create chat_messages table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('user', 'assistant', 'tool_use', 'tool_result', 'system')),
        content TEXT NOT NULL,
        created_by TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'user',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}',
        UNIQUE(chat_id, sequence)
      )
    `
    );

    // Create chat_uploads table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS chat_uploads (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        original_name TEXT,
        created_by TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'user',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}'
      )
    `
    );

    // Create birth_time_entries table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS birth_time_entries (
        id TEXT PRIMARY KEY,
        recorded_at TEXT NOT NULL,
        timezone TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        location_name TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        full_address TEXT,
        name TEXT,
        description TEXT,
        note TEXT,
        created_by TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'user',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}'
      )
    `
    );

    // Create module_plans table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS module_plans (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        route TEXT NOT NULL DEFAULT '',
        source TEXT,
        source_url TEXT,
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'dismissed')),
        steps TEXT DEFAULT '[]',
        created_by TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'user',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}'
      )
    `
    );

    // Create remotion_videos table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS remotion_videos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        video_path TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'generating' CHECK(status IN ('generating', 'completed', 'failed')),
        created_by TEXT NOT NULL DEFAULT 'system',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'system',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}'
      )
    `
    );

    // Create working_directories table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS working_directories (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        label TEXT,
        source TEXT NOT NULL DEFAULT 'user' CHECK(source IN ('env', 'auto', 'user')),
        is_default INTEGER NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'user',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}'
      )
    `
    );

    // Migrate: add is_default column if missing
    try {
      coreDb.run(sql.raw(`ALTER TABLE working_directories ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0`));
    } catch {
      // Column already exists
    }

    // Create commands table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS commands (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('skill', 'builtin', 'command')),
        created_by TEXT NOT NULL DEFAULT 'system',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'system',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}'
      )
    `
    );

    // Create companies table
    await runSQL(
      `
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        directory TEXT NOT NULL,
        master_chat_id TEXT,
        status TEXT NOT NULL DEFAULT 'creating' CHECK(status IN ('creating', 'active', 'archived')),
        created_by TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL DEFAULT 'user',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}'
      )
    `
    );

    console.log('[DB] Core database schema initialized successfully');
  } catch (err) {
    console.error('[DB] Failed to initialize core database:', err);
    throw err;
  }
}
