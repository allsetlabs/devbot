import { v4 as uuidv4 } from 'uuid';
import { coreDb, interactive_chats, chat_messages, remotion_videos } from './db/core.js';
import { sql, eq, and } from 'drizzle-orm';
import type { StreamParserConfig } from './stream-parser.js';
import type { ChatSettings } from './db/types.js';
import { generateName } from './generate-name.js';
import {
  spawnClaude,
  isExecuting,
  stopExecution,
  registerExecution,
  unregisterExecution,
  type ClaudeModel,
  type PermissionMode,
} from './claude-spawn.js';
import { DEVBOT_PROJECTS_DIR } from './env.js';

export type { ClaudeModel, PermissionMode };

const REMOTION_VIDEO_MARKER = 'REMOTION_VIDEO_RESULT:';

const SYSTEM_PROMPT =
  'This is a non-interactive session. You cannot ask the user questions during execution. If you need clarification or have a question, output the question clearly and end your response. The user will respond in a follow-up message. Do not use interactive tools that require user input.';

const PLAN_MODE_PROMPT =
  'You are in PLAN MODE. You may ONLY read files and analyze code. Do NOT create, edit, delete, or modify any files. Do NOT run bash commands that change state (no writes, no installs, no git commits). Only provide analysis, plans, and suggestions. If the user asks you to make changes, explain what you would do but do not execute.';

const AUTO_ACCEPT_PROMPT =
  'You are in AUTO-ACCEPT MODE. You may read and write files and run commands. Proceed with reasonable changes but be careful with destructive operations. Prefer safe, reversible actions.';

/**
 * Generate a descriptive chat name by spawning a separate Claude print-mode session.
 * Runs fire-and-forget — errors are logged but don't affect the main chat.
 */
async function generateChatName(chatId: string, userPrompt: string): Promise<void> {
  try {
    console.log(`[InteractiveChat] Spawning naming session for chat ${chatId}`);
    const name = await generateName(userPrompt);
    if (name) {
      coreDb
        .update(interactive_chats)
        .set({ name, updated_by: 'system', updated_at: new Date().toISOString() })
        .where(eq(interactive_chats.id, chatId))
        .run();
      console.log(`[InteractiveChat] Named chat ${chatId}: "${name}"`);
    } else {
      console.warn(`[InteractiveChat] No name generated for chat ${chatId}`);
    }
  } catch (err) {
    console.error(`[InteractiveChat] Failed to update chat name:`, err);
  }
}

/**
 * Check assistant messages for REMOTION_VIDEO_RESULT marker and update the video record.
 */
async function checkForRemotionVideoResult(
  chatId: string,
  data: Record<string, unknown>
): Promise<void> {
  if (data.type !== 'assistant') return;

  const message = data.message as { content?: Array<{ type: string; text?: string }> } | undefined;
  if (!message?.content) return;

  for (const block of message.content) {
    if (block.type !== 'text' || !block.text) continue;

    const markerIdx = block.text.indexOf(REMOTION_VIDEO_MARKER);
    if (markerIdx === -1) continue;

    try {
      const afterMarker = block.text.slice(markerIdx + REMOTION_VIDEO_MARKER.length).trim();
      const braceStart = afterMarker.indexOf('{');
      if (braceStart === -1) continue;
      let depth = 0;
      let braceEnd = -1;
      for (let i = braceStart; i < afterMarker.length; i++) {
        if (afterMarker[i] === '{') depth++;
        if (afterMarker[i] === '}') depth--;
        if (depth === 0) {
          braceEnd = i;
          break;
        }
      }
      if (braceEnd === -1) continue;
      const jsonStr = afterMarker.slice(braceStart, braceEnd + 1);
      const result = JSON.parse(jsonStr) as { name?: string; videoPath?: string };

      const video = coreDb
        .select({ id: remotion_videos.id })
        .from(remotion_videos)
        .where(and(eq(remotion_videos.chat_id, chatId), eq(remotion_videos.status, 'generating')))
        .limit(1)
        .get();

      if (video) {
        const updates: Record<string, unknown> = {
          status: 'completed',
          updated_by: 'system',
          updated_at: new Date().toISOString(),
        };
        if (result.name) updates.name = result.name;
        if (result.videoPath) updates.video_path = result.videoPath;

        coreDb.update(remotion_videos).set(updates).where(eq(remotion_videos.id, video.id)).run();
        console.log(
          `[InteractiveChat] Updated remotion video ${video.id} for chat ${chatId}: completed`
        );

        coreDb
          .update(interactive_chats)
          .set({
            archived_at: new Date().toISOString(),
            updated_by: 'system',
            updated_at: new Date().toISOString(),
          })
          .where(eq(interactive_chats.id, chatId))
          .run();
        console.log(`[InteractiveChat] Archived remotion video chat ${chatId}`);
      }
    } catch (err) {
      console.error(`[InteractiveChat] Failed to parse remotion video result:`, err);
    }
  }
}

function markChatNotExecuting(chatId: string): void {
  try {
    coreDb
      .update(interactive_chats)
      .set({ is_executing: false, updated_by: 'system', updated_at: new Date().toISOString() })
      .where(eq(interactive_chats.id, chatId))
      .run();
  } catch {
    /* ignore */
  }
}

/**
 * Send a message in an interactive chat session.
 * Uses the unified spawnClaude API.
 */
export async function sendMessage(chatId: string, prompt: string, branchId: string = 'main'): Promise<void> {
  const chat = coreDb
    .select()
    .from(interactive_chats)
    .where(eq(interactive_chats.id, chatId))
    .get();

  if (!chat) {
    throw new Error('Chat not found');
  }

  // Get current max sequence for this chat on this branch
  const maxSeqRow = coreDb
    .select({ sequence: chat_messages.sequence })
    .from(chat_messages)
    .where(and(eq(chat_messages.chat_id, chatId), eq(chat_messages.branch_id, branchId)))
    .orderBy(sql`sequence DESC`)
    .limit(1)
    .get();

  const currentMaxSequence = maxSeqRow?.sequence ?? 0;

  // Insert the user message
  const userMessageId = uuidv4().slice(0, 12);
  coreDb
    .insert(chat_messages)
    .values({
      id: userMessageId,
      chat_id: chatId,
      branch_id: branchId,
      sequence: currentMaxSequence + 1,
      type: 'user',
      content: {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
        },
      },
      created_by: 'user',
      updated_by: 'user',
    })
    .run();

  // Build system prompts
  const mode: PermissionMode = (chat.permission_mode as PermissionMode) || 'dangerous';
  const model: ClaudeModel = (chat.model as ClaudeModel) || 'sonnet';
  const systemPrompts = [SYSTEM_PROMPT];
  if (mode === 'plan') systemPrompts.push(PLAN_MODE_PROMPT);
  else if (mode === 'auto-accept') systemPrompts.push(AUTO_ACCEPT_PROMPT);
  if (chat.system_prompt) systemPrompts.push(chat.system_prompt as string);

  const workingDir: string =
    (chat.settings as ChatSettings | null | undefined)?.workingDir || DEVBOT_PROJECTS_DIR;

  // Auto-name on first message
  if (!chat.claude_session_id && chat.name === 'New Chat') {
    generateChatName(chatId, prompt).catch((err) => {
      console.error(`[InteractiveChat] Chat naming failed for ${chatId}:`, err);
    });
  }

  console.log(
    `[InteractiveChat] Spawning Claude for chat ${chatId}, resume: ${!!chat.claude_session_id}`
  );

  // Mark as executing
  coreDb
    .update(interactive_chats)
    .set({ is_executing: true, updated_by: 'system', updated_at: new Date().toISOString() })
    .where(eq(interactive_chats.id, chatId))
    .run();

  const persist: StreamParserConfig & { initialSequence: number } = {
    tableName: 'chat_messages',
    foreignKeyColumn: 'chat_id',
    foreignKeyValue: chatId,
    logPrefix: '[InteractiveChat]',
    skipUserMessages: true,
    branchId: branchId,
    initialSequence: currentMaxSequence + 1,
    onMessage: (messageType, data) => {
      if (messageType === 'assistant') {
        checkForRemotionVideoResult(chatId, data).catch((err) => {
          console.error(`[InteractiveChat] Remotion video check failed:`, err);
        });
      }
    },
  };

  spawnClaude({
    prompt,
    model,
    systemPrompts,
    workDir: workingDir,
    sessionId: (chat.claude_session_id as string) || undefined,
    maxTurns: (chat.max_turns as number) || undefined,
    effort: ((chat.settings as Record<string, unknown>)?.effort as string) || undefined,
    chrome: true,
    timeoutMs: 30 * 60 * 1000,
    trackAs: chatId,
    persist,
    onSessionId: (sid) => {
      coreDb
        .update(interactive_chats)
        .set({
          claude_session_id: sid,
          updated_by: 'system',
          updated_at: new Date().toISOString(),
        })
        .where(eq(interactive_chats.id, chatId))
        .run();
      console.log(`[InteractiveChat] Captured session ID for chat ${chatId}: ${sid}`);
    },
    onComplete: (code) => {
      markChatNotExecuting(chatId);
      console.log(`[InteractiveChat] Chat ${chatId} process exited with code ${code}`);
    },
  });
}

/**
 * Stop a running chat execution
 */
export function stopChatExecution(chatId: string): boolean {
  const stopped = stopExecution(chatId);
  if (stopped) {
    markChatNotExecuting(chatId);
    console.log(`[InteractiveChat] Stopped execution for chat ${chatId}`);
  }
  return stopped;
}

/**
 * Check if a chat is currently executing
 */
export function isChatExecuting(chatId: string): boolean {
  return isExecuting(chatId);
}

/**
 * Register an externally-spawned process (e.g. scheduler) as a chat execution,
 * so that isChatExecuting and stopChatExecution work for scheduler chats.
 */
export function registerChatExecution(
  chatId: string,
  proc: import('child_process').ChildProcess
): void {
  registerExecution(chatId, proc);
}

/**
 * Unregister an externally-spawned chat execution.
 */
export function unregisterChatExecution(chatId: string): void {
  unregisterExecution(chatId);
}
