import { v4 as uuidv4 } from 'uuid';
import { coreDb, chat_messages, task_messages } from './db/core.js';
import type { ChatMessageInsert, TaskMessageInsert } from './db/types.js';

/** Message types supported by Claude stream-json output */
export type StreamMessageType = 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system';

/**
 * Map Claude stream-json output type to our message type.
 * Stream-json format includes: assistant, user, tool_use, tool_result, result, system
 */
export function mapClaudeTypeToMessageType(
  data: Record<string, unknown>
): StreamMessageType | null {
  const type = data.type as string;
  switch (type) {
    case 'user':
      return 'user';
    case 'assistant':
      return 'assistant';
    case 'tool_use':
      return 'tool_use';
    case 'tool_result':
      return 'tool_result';
    case 'system':
      return 'system';
    case 'result':
      return 'system';
    default:
      return null;
  }
}

/** Supported target table names for stream parser inserts */
export type StreamParserTableName = 'chat_messages' | 'task_messages';

export interface StreamParserConfig {
  /** Table name to insert messages into */
  tableName: StreamParserTableName;
  /** Foreign key column name (e.g., 'run_id' or 'chat_id') */
  foreignKeyColumn: string;
  /** Foreign key value */
  foreignKeyValue: string;
  /** Log prefix for console messages (e.g., '[Scheduler]') */
  logPrefix: string;
  /** Skip inserting user messages (set true when they are pre-inserted) */
  skipUserMessages?: boolean;
  /** Callback after a message is inserted */
  onMessage?: (messageType: StreamMessageType, data: Record<string, unknown>) => void;
}

export interface ParseStreamResult {
  isComplete: boolean;
  isError: boolean;
  sessionId: string | null;
}

/**
 * Parse a single line of Claude stream-json output and insert into database.
 * Shared between scheduler-worker and interactive-chat-worker.
 */
export async function parseStreamLine(
  line: string,
  sequenceRef: { value: number },
  config: StreamParserConfig
): Promise<ParseStreamResult> {
  const trimmed = line.trim();
  if (!trimmed) return { isComplete: false, isError: false, sessionId: null };

  try {
    const data = JSON.parse(trimmed);
    const messageType = mapClaudeTypeToMessageType(data);
    const sessionId = (data.session_id as string) || null;

    if (config.skipUserMessages && messageType === 'user') {
      return { isComplete: false, isError: false, sessionId };
    }

    if (messageType) {
      const messageId = uuidv4().slice(0, 12);
      sequenceRef.value++;

      try {
        const values: ChatMessageInsert | TaskMessageInsert = {
          id: messageId,
          [config.foreignKeyColumn]: config.foreignKeyValue,
          sequence: sequenceRef.value,
          type: messageType,
          content: data,
          created_by: 'system',
          updated_by: 'system',
        } as ChatMessageInsert | TaskMessageInsert;
        if (config.tableName === 'chat_messages') {
          await coreDb.insert(chat_messages).values(values as ChatMessageInsert);
        } else {
          await coreDb.insert(task_messages).values(values as TaskMessageInsert);
        }
      } catch (err) {
        console.error(`${config.logPrefix} Failed to insert message:`, err);
      }

      config.onMessage?.(messageType, data);
    }

    if (data.type === 'result') {
      return {
        isComplete: true,
        isError: data.subtype === 'error',
        sessionId,
      };
    }

    return { isComplete: false, isError: false, sessionId };
  } catch {
    return { isComplete: false, isError: false, sessionId: null };
  }
}
