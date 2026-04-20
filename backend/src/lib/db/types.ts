/**
 * Type inference from Drizzle schema
 * These are auto-inferred from the schema tables
 */

import * as schema from './schema';

// Core table types
export type SessionRow = typeof schema.sessions.$inferSelect;
export type SessionInsert = typeof schema.sessions.$inferInsert;

export type ScheduledTaskRow = typeof schema.scheduled_tasks.$inferSelect;
export type ScheduledTaskInsert = typeof schema.scheduled_tasks.$inferInsert;

export type TaskRunRow = typeof schema.task_runs.$inferSelect;
export type TaskRunInsert = typeof schema.task_runs.$inferInsert;

export type TaskMessageRow = typeof schema.task_messages.$inferSelect;
export type TaskMessageInsert = typeof schema.task_messages.$inferInsert;

export type InteractiveChatRow = typeof schema.interactive_chats.$inferSelect;
export type InteractiveChatInsert = typeof schema.interactive_chats.$inferInsert;

export type ChatMessageRow = typeof schema.chat_messages.$inferSelect;
export type ChatMessageInsert = typeof schema.chat_messages.$inferInsert;

export type ChatUploadRow = typeof schema.chat_uploads.$inferSelect;
export type ChatUploadInsert = typeof schema.chat_uploads.$inferInsert;

export type BirthTimeEntryRow = typeof schema.birth_time_entries.$inferSelect;
export type BirthTimeEntryInsert = typeof schema.birth_time_entries.$inferInsert;

export type ModulePlanRow = typeof schema.module_plans.$inferSelect;
export type ModulePlanInsert = typeof schema.module_plans.$inferInsert;

export type RemotionVideoRow = typeof schema.remotion_videos.$inferSelect;
export type RemotionVideoInsert = typeof schema.remotion_videos.$inferInsert;

export type CommandRow = typeof schema.commands.$inferSelect;
export type CommandInsert = typeof schema.commands.$inferInsert;

export type CompanyRow = typeof schema.companies.$inferSelect;
export type CompanyInsert = typeof schema.companies.$inferInsert;

// Type aliases for compatibility with old code
export type PermissionMode = 'plan' | 'auto-accept' | 'dangerous';
export type ClaudeModel = 'opus' | 'sonnet' | 'haiku';

// Shape of the JSONB `settings` column on scheduled_tasks
export interface SchedulerSettings {
  workingDir?: string;
  model?: ClaudeModel;
  isSystem?: boolean;
  maxRetries?: number;
}

// Shape of the JSONB `settings` column on interactive_chats
export interface ChatSettings {
  workingDir?: string;
  task_id?: string;
}
