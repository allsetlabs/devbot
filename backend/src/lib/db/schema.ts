/* eslint-disable @typescript-eslint/no-explicit-any */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Core DevBot Tables
 * All tables include standard columns: created_by, created_at, updated_by, updated_at, settings (JSONB)
 */

// Sessions table - xterm terminal sessions
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default('New Chat'),
  port: integer('port').notNull(),
  ws_url: text('ws_url').notNull(),
  status: text('status', { enum: ['active', 'inactive'] })
    .notNull()
    .default('active'),
  created_by: text('created_by').notNull().default('user'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('user'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Scheduled tasks
export const scheduled_tasks = sqliteTable('scheduled_tasks', {
  id: text('id').primaryKey(),
  prompt: text('prompt').notNull(),
  name: text('name'),
  interval_minutes: integer('interval_minutes').notNull(),
  status: text('status', { enum: ['active', 'paused', 'deleted'] })
    .notNull()
    .default('active'),
  last_run_at: text('last_run_at'),
  next_run_at: text('next_run_at'),
  run_count: integer('run_count').notNull().default(0),
  max_runs: integer('max_runs'),
  created_by: text('created_by').notNull().default('user'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('user'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Task runs (specific executions of scheduled tasks)
export const task_runs = sqliteTable('task_runs', {
  id: text('id').primaryKey(),
  task_id: text('task_id').notNull(),
  run_index: integer('run_index').notNull(),
  chat_id: text('chat_id'),
  started_at: text('started_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  completed_at: text('completed_at'),
  status: text('status', { enum: ['running', 'completed', 'failed'] })
    .notNull()
    .default('running'),
  output_file: text('output_file'),
  error_message: text('error_message'),
  created_by: text('created_by').notNull().default('system'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('system'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Task messages (message history for a task run)
export const task_messages = sqliteTable('task_messages', {
  id: text('id').primaryKey(),
  run_id: text('run_id').notNull(),
  sequence: integer('sequence').notNull(),
  type: text('type', {
    enum: ['user', 'assistant', 'tool_use', 'tool_result', 'system'],
  }).notNull(),
  content: text('content', { mode: 'json' }).$type<Record<string, any>>().notNull(),
  created_by: text('created_by').notNull().default('system'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('system'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Interactive chats (AI-powered conversations)
export const interactive_chats = sqliteTable('interactive_chats', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default('New Chat'),
  type: text('type').notNull().default('Manual'),
  claude_session_id: text('claude_session_id'),
  status: text('status', { enum: ['active', 'completed'] })
    .notNull()
    .default('active'),
  permission_mode: text('permission_mode', {
    enum: ['plan', 'auto-accept', 'dangerous'],
  })
    .notNull()
    .default('dangerous'),
  model: text('model', { enum: ['opus', 'sonnet', 'haiku'] })
    .notNull()
    .default('sonnet'),
  system_prompt: text('system_prompt'),
  is_executing: integer('is_executing', { mode: 'boolean' }).notNull().default(false),
  max_turns: integer('max_turns'),
  archived_at: text('archived_at'),
  created_by: text('created_by').notNull().default('user'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('user'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Chat messages (message history for interactive chats)
export const chat_messages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  chat_id: text('chat_id').notNull(),
  branch_id: text('branch_id').notNull().default('main'),
  sequence: integer('sequence').notNull(),
  type: text('type', {
    enum: ['user', 'assistant', 'tool_use', 'tool_result', 'system'],
  }).notNull(),
  content: text('content', { mode: 'json' }).$type<Record<string, any>>().notNull(),
  created_by: text('created_by').notNull().default('user'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('user'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Chat uploads (files uploaded to a chat)
export const chat_uploads = sqliteTable('chat_uploads', {
  id: text('id').primaryKey(),
  chat_id: text('chat_id').notNull(),
  file_path: text('file_path').notNull(),
  original_name: text('original_name'),
  created_by: text('created_by').notNull().default('user'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('user'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// OCR documents (images scanned/uploaded for text extraction)
export const ocr_documents = sqliteTable('ocr_documents', {
  id: text('id').primaryKey(),
  original_name: text('original_name').notNull(),
  image_path: text('image_path').notNull(),
  txt_path: text('txt_path'),
  extracted_text: text('extracted_text'),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] })
    .notNull()
    .default('pending'),
  created_by: text('created_by').notNull().default('user'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('user'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
});

// Birth time entries
export const birth_time_entries = sqliteTable('birth_time_entries', {
  id: text('id').primaryKey(),
  recorded_at: text('recorded_at').notNull(),
  timezone: text('timezone').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  location_name: text('location_name'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  full_address: text('full_address'),
  name: text('name'),
  description: text('description'),
  note: text('note'),
  created_by: text('created_by').notNull().default('user'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('user'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Module plans
export const module_plans = sqliteTable('module_plans', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  route: text('route').notNull().default(''),
  source: text('source'),
  source_url: text('source_url'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] })
    .notNull()
    .default('medium'),
  status: text('status', {
    enum: ['pending', 'in_progress', 'completed', 'dismissed'],
  })
    .notNull()
    .default('pending'),
  steps: text('steps', { mode: 'json' }).$type<Record<string, any>[]>().default([]),
  created_by: text('created_by').notNull().default('user'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('user'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Remotion videos
export const remotion_videos = sqliteTable('remotion_videos', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  video_path: text('video_path').notNull(),
  chat_id: text('chat_id').notNull(),
  status: text('status', {
    enum: ['generating', 'completed', 'failed'],
  })
    .notNull()
    .default('generating'),
  created_by: text('created_by').notNull().default('system'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('system'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Working directories (saved workspace paths)
export const working_directories = sqliteTable('working_directories', {
  id: text('id').primaryKey(),
  path: text('path').notNull().unique(),
  label: text('label'),
  source: text('source', { enum: ['env', 'auto', 'user'] })
    .notNull()
    .default('user'),
  is_default: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  created_by: text('created_by').notNull().default('user'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('user'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Companies (AI-managed projects)
export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  directory: text('directory').notNull(),
  master_chat_id: text('master_chat_id'),
  status: text('status', { enum: ['creating', 'active', 'archived'] })
    .notNull()
    .default('creating'),
  created_by: text('created_by').notNull().default('user'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('user'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Chat message queue (messages waiting to be sent when current execution completes)
export const chat_message_queue = sqliteTable('chat_message_queue', {
  id: text('id').primaryKey(),
  chat_id: text('chat_id').notNull(),
  branch_id: text('branch_id').notNull().default('main'),
  prompt: text('prompt').notNull(),
  position: integer('position').notNull(),
  created_by: text('created_by').notNull().default('user'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('user'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});

// Commands (synced from .claude/)
export const commands = sqliteTable('commands', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: text('type', { enum: ['skill', 'builtin', 'command'] }).notNull(),
  created_by: text('created_by').notNull().default('system'),
  created_at: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_by: text('updated_by').notNull().default('system'),
  updated_at: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}),
});
