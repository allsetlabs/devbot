import { Router } from 'express';
import fs from 'fs';
import { eq, desc, gt, isNull, isNotNull, and, lte, inArray } from 'drizzle-orm';
import { coreDb, interactive_chats, chat_messages, chat_uploads } from '../lib/db/core.js';
import type {
  InteractiveChatRow,
  ChatMessageRow,
  PermissionMode,
  ClaudeModel,
} from '../lib/db/types.js';
import { sendMessage, stopChatExecution, pauseChatExecution, resumeChatExecution, isChatPaused, isChatExecuting } from '../lib/interactive-chat-worker.js';
import {
  asyncHandler,
  sendNotFound,
  sendBadRequest,
  requireString,
  generateId,
  getOneById,
  requireEnum,
} from '../lib/route-helpers.js';

const router = Router();

interface InteractiveChat {
  id: string;
  name: string;
  type: string;
  claudeSessionId: string | null;
  status: 'active' | 'completed';
  permissionMode: PermissionMode;
  model: ClaudeModel;
  systemPrompt: string | null;
  maxTurns: number | null;
  effort: string | null;
  isRunning: boolean;
  createdAt: string;
  archivedAt: string | null;
  workingDir: string | null;
  allowedTools: string[] | null;
  fastMode: boolean;
}

interface ChatMessageResponse {
  id: string;
  chatId: string;
  branchId: string;
  sequence: number;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system';
  content: Record<string, unknown>;
  createdAt: string;
}

function rowToChat(row: InteractiveChatRow): InteractiveChat {
  const settings = (row.settings as Record<string, unknown>) ?? {};
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    claudeSessionId: row.claude_session_id,
    status: row.status,
    permissionMode: row.permission_mode,
    model: row.model,
    systemPrompt: row.system_prompt,
    maxTurns: row.max_turns,
    isRunning: row.is_executing ?? false,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
    workingDir: typeof settings.workingDir === 'string' ? settings.workingDir : null,
    effort: typeof settings.effort === 'string' ? settings.effort : null,
    allowedTools: Array.isArray(settings.allowedTools) ? (settings.allowedTools as string[]) : null,
    fastMode: settings.fastMode === true,
  };
}

function rowToMessage(row: ChatMessageRow): ChatMessageResponse {
  return {
    id: row.id,
    chatId: row.chat_id,
    branchId: row.branch_id,
    sequence: row.sequence,
    type: row.type,
    content: row.content,
    createdAt: row.created_at,
  };
}

/** Extract text content from a Claude message content object */
function extractText(content: Record<string, unknown>): string {
  const message = content.message as
    | { content?: Array<{ type: string; text?: string }> }
    | undefined;
  if (message?.content) {
    return message.content
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => (block.text ?? '').trim())
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

function extractThinking(content: Record<string, unknown>): string {
  const message = content.message as
    | { content?: Array<{ type: string; thinking?: string }> }
    | undefined;
  if (message?.content) {
    return message.content
      .filter((block) => block.type === 'thinking' && typeof block.thinking === 'string')
      .map((block) => (block.thinking ?? '').trim())
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

const MODE_LABELS: Record<string, string> = {
  plan: 'Plan',
  'auto-accept': 'Auto-Accept',
  dangerous: 'Full Auto',
};

/** Format export stats (tokens, cost, duration) - shared between plaintext and markdown */
function formatExportStats(content: Record<string, unknown>): string[] {
  const usage = content.usage as Record<string, number> | undefined;
  const cost = content.cost_usd as number | undefined;
  const duration = content.duration_ms as number | undefined;
  const stats: string[] = [];
  if (usage) {
    const input = usage.input_tokens ?? 0;
    const output = usage.output_tokens ?? 0;
    if (input + output > 0)
      stats.push(`Tokens: ${input.toLocaleString()} in / ${output.toLocaleString()} out`);
  }
  if (cost && cost > 0) stats.push(`Cost: $${cost.toFixed(4)}`);
  if (duration && duration > 0) {
    const secs = Math.round(duration / 1000);
    stats.push(`Duration: ${secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`}`);
  }
  return stats;
}

/** Build plaintext export from messages */
function buildPlaintextExport(
  chat: { name: string; permission_mode: string; system_prompt: string | null; created_at: string },
  messages: Array<{ type: string; content: Record<string, unknown>; created_at: string }>
): string {
  const createdDate = new Date(chat.created_at).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  let txt = `${chat.name}\n${'='.repeat(chat.name.length)}\n\n`;
  txt += `Mode: ${MODE_LABELS[chat.permission_mode] || chat.permission_mode}\n`;
  txt += `Created: ${createdDate}\n`;
  if (chat.system_prompt) txt += `System Prompt: ${chat.system_prompt}\n`;
  txt += `\n${'─'.repeat(60)}\n\n`;

  for (const msg of messages) {
    const content = msg.content as Record<string, unknown>;
    const timestamp = new Date(msg.created_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (msg.type === 'user') {
      const text = extractText(content);
      if (text) txt += `[${timestamp}] USER\n${text}\n\n`;
    } else if (msg.type === 'assistant') {
      const thinking = extractThinking(content);
      const text = extractText(content);
      txt += `[${timestamp}] ASSISTANT\n`;
      if (thinking) txt += `[THINKING]\n${thinking}\n\n`;
      if (text) txt += `${text}\n\n`;
    } else if (msg.type === 'tool_use') {
      const toolName = (content.tool_name as string) || 'Unknown Tool';
      txt += `[${timestamp}] TOOL: ${toolName}\n`;
      const toolInput = content.tool_input ? JSON.stringify(content.tool_input, null, 2) : '';
      if (toolInput) txt += `${toolInput}\n\n`;
    } else if (msg.type === 'tool_result') {
      const isError = content.subtype === 'error' || content.error;
      const result = content.result || content.error || '';
      const label = isError ? 'ERROR' : 'RESULT';
      const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      if (resultText) txt += `[${timestamp}] ${label}\n${resultText}\n\n`;
    } else if (msg.type === 'system') {
      if (content.type === 'result' && content.subtype === 'success') {
        txt += `[${timestamp}] TASK COMPLETED\n`;
        const stats = formatExportStats(content);
        if (stats.length > 0) txt += `${stats.join(' | ')}\n\n`;
      } else if (content.type === 'result' && content.subtype === 'error') {
        txt += `[${timestamp}] TASK FAILED\n${content.error || 'Unknown error'}\n\n`;
      }
    }
  }

  txt += `${'─'.repeat(60)}\n`;
  txt += `Exported from DevBot on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}\n`;
  return txt;
}

/** Build markdown export from messages */
function buildMarkdownExport(
  chat: { name: string; permission_mode: string; system_prompt: string | null; created_at: string },
  messages: Array<{ type: string; content: Record<string, unknown>; created_at: string }>
): string {
  const createdDate = new Date(chat.created_at).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  let md = `# ${chat.name}\n\n`;
  md += `**Mode:** ${MODE_LABELS[chat.permission_mode] || chat.permission_mode} | **Created:** ${createdDate}\n\n`;
  if (chat.system_prompt) md += `> **System Prompt:** ${chat.system_prompt}\n\n`;
  md += `---\n\n`;

  for (const msg of messages) {
    const content = msg.content as Record<string, unknown>;
    if (msg.type === 'user') {
      const text = extractText(content);
      if (text) md += `### User\n\n${text}\n\n`;
    } else if (msg.type === 'assistant') {
      const thinking = extractThinking(content);
      const text = extractText(content);
      if (thinking)
        md += `### Assistant\n\n<details>\n<summary>Thinking</summary>\n\n${thinking}\n\n</details>\n\n${text}\n\n`;
      else if (text) md += `### Assistant\n\n${text}\n\n`;
    } else if (msg.type === 'tool_use') {
      const toolName = (content.tool_name as string) || 'Unknown Tool';
      const toolInput = content.tool_input ? JSON.stringify(content.tool_input, null, 2) : '';
      md += `### Tool: ${toolName}\n\n`;
      if (toolInput) md += `\`\`\`json\n${toolInput}\n\`\`\`\n\n`;
    } else if (msg.type === 'tool_result') {
      const isError = content.subtype === 'error' || content.error;
      const result = content.result || content.error || '';
      const label = isError ? 'Error' : 'Result';
      const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      if (resultText) md += `**${label}:**\n\n\`\`\`\n${resultText}\n\`\`\`\n\n`;
    } else if (msg.type === 'system') {
      if (content.type === 'result' && content.subtype === 'success') {
        md += `---\n\n*Task completed*\n\n`;
        const stats = formatExportStats(content);
        if (stats.length > 0) md += `*${stats.join(' | ')}*\n\n`;
      } else if (content.type === 'result' && content.subtype === 'error') {
        md += `---\n\n*Task failed: ${content.error || 'Unknown error'}*\n\n`;
      }
    }
  }

  md += `---\n\n*Exported from DevBot on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}*\n`;
  return md;
}

// Export chat in multiple formats (must be before /:id to avoid matching "export" as an id)
router.get(
  '/:id/export',
  asyncHandler(async (req, res) => {
    const format = (req.query.format as string) || 'markdown';

    const chatRows = await coreDb
      .select()
      .from(interactive_chats)
      .where(eq(interactive_chats.id, req.params.id))
      .limit(1);

    const chat = chatRows[0];
    if (!chat) {
      sendNotFound(res, 'Chat');
      return;
    }

    const messageRows = await coreDb
      .select()
      .from(chat_messages)
      .where(eq(chat_messages.chat_id, req.params.id))
      .orderBy(chat_messages.sequence);

    const safeFilename = chat.name.replace(/[^a-zA-Z0-9-_ ]/g, '');

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.json"`);
      res.json(messageRows);
      return;
    }

    if (format === 'plaintext') {
      const txt = buildPlaintextExport(chat, messageRows);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.txt"`);
      res.send(txt);
      return;
    }

    // Default to Markdown
    const md = buildMarkdownExport(chat, messageRows);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.md"`);
    res.send(md);
  }, 'export chat')
);

// Fetch pinned messages across multiple chats (must be before /:id)
router.post(
  '/pinned-messages',
  asyncHandler(async (req, res) => {
    const pins = req.body?.pins as { chatId: string; messageIds: string[] }[] | undefined;
    if (!Array.isArray(pins) || pins.length === 0) {
      res.json([]);
      return;
    }

    const allMessageIds = pins.flatMap((p) => p.messageIds).filter(Boolean);
    if (allMessageIds.length === 0) {
      res.json([]);
      return;
    }

    const messageRows = await coreDb
      .select()
      .from(chat_messages)
      .where(inArray(chat_messages.id, allMessageIds));

    const chatIds = [...new Set(messageRows.map((m) => m.chat_id))];
    const chatRows = chatIds.length > 0
      ? await coreDb.select().from(interactive_chats).where(inArray(interactive_chats.id, chatIds))
      : [];

    const chatMap = Object.fromEntries(chatRows.map((c) => [c.id, c.name]));

    const grouped = chatIds.map((chatId) => ({
      chatId,
      chatName: (chatMap[chatId] as string) ?? 'Unknown Chat',
      messages: messageRows
        .filter((m) => m.chat_id === chatId)
        .sort((a, b) => a.sequence - b.sequence)
        .map(rowToMessage),
    }));

    res.json(grouped);
  }, 'fetch pinned messages across chats')
);

// Get distinct chat types (must be before /:id to avoid matching "types" as an id)
router.get(
  '/types',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb.select({ type: interactive_chats.type }).from(interactive_chats);
    const types = [...new Set(rows.map((r) => r.type))].sort();
    res.json(types);
  }, 'list chat types')
);

// List archived chats (must be before /:id to avoid matching "archived" as an id)
router.get(
  '/archived',
  asyncHandler(async (req, res) => {
    const typeFilter = req.query.type as string | undefined;

    const conditions = [isNotNull(interactive_chats.archived_at)];
    if (typeFilter) conditions.push(eq(interactive_chats.type, typeFilter));

    const rows = await coreDb
      .select()
      .from(interactive_chats)
      .where(and(...conditions))
      .orderBy(desc(interactive_chats.archived_at));

    res.json(rows.map(rowToChat));
  }, 'list archived chats')
);

// List all interactive chats (excludes archived)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const typeFilter = req.query.type as string | undefined;

    const conditions = [isNull(interactive_chats.archived_at)];
    if (typeFilter) conditions.push(eq(interactive_chats.type, typeFilter));

    const rows = await coreDb
      .select()
      .from(interactive_chats)
      .where(and(...conditions))
      .orderBy(desc(interactive_chats.created_at));

    res.json(rows.map(rowToChat));
  }, 'list chats')
);

// Get single chat
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await getOneById(coreDb, interactive_chats, req.params.id, 'Chat', res);
    if (!row) return;
    res.json(rowToChat(row));
  }, 'get chat')
);

// Create new interactive chat
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const id = generateId();
    const validModes: PermissionMode[] = ['plan', 'auto-accept', 'dangerous'];
    const permissionMode: PermissionMode = validModes.includes(req.body?.permissionMode)
      ? req.body.permissionMode
      : 'dangerous';

    const validModels: ClaudeModel[] = ['opus', 'sonnet', 'haiku'];
    const model: ClaudeModel = validModels.includes(req.body?.model) ? req.body.model : 'sonnet';

    const systemPrompt: string | null =
      req.body?.systemPrompt && typeof req.body.systemPrompt === 'string'
        ? req.body.systemPrompt.trim()
        : null;

    const maxTurns: number | null =
      req.body?.maxTurns && typeof req.body.maxTurns === 'number' && req.body.maxTurns > 0
        ? req.body.maxTurns
        : null;

    const chatType: string =
      req.body?.type && typeof req.body.type === 'string' ? req.body.type.trim() : 'Manual';

    const chatName: string =
      req.body?.name && typeof req.body.name === 'string' ? req.body.name.trim() : 'New Chat';

    const workingDir: string | null =
      req.body?.workingDir && typeof req.body.workingDir === 'string'
        ? req.body.workingDir.trim()
        : null;

    const result = await coreDb
      .insert(interactive_chats)
      .values({
        id,
        name: chatName,
        type: chatType,
        status: 'active',
        permission_mode: permissionMode,
        model,
        system_prompt: systemPrompt,
        max_turns: maxTurns,
        settings: workingDir ? { workingDir } : {},
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    if (!result || result.length === 0) {
      throw new Error('Failed to insert chat');
    }

    res.status(201).json(rowToChat(result[0]));
  }, 'create chat')
);

// Duplicate interactive chat (copy with same settings, empty messages)
router.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const sourceRows = await coreDb
      .select()
      .from(interactive_chats)
      .where(eq(interactive_chats.id, req.params.id))
      .limit(1);

    if (!sourceRows || sourceRows.length === 0) {
      sendNotFound(res, 'Source chat');
      return;
    }

    const sourceChat = sourceRows[0];
    const newId = generateId();

    const result = await coreDb
      .insert(interactive_chats)
      .values({
        id: newId,
        name: `${sourceChat.name} (Copy)`,
        type: sourceChat.type,
        status: 'active',
        permission_mode: sourceChat.permission_mode,
        model: sourceChat.model,
        system_prompt: sourceChat.system_prompt,
        max_turns: sourceChat.max_turns,
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    if (!result || result.length === 0) {
      throw new Error('Failed to create duplicate chat');
    }

    res.status(201).json(rowToChat(result[0]));
  }, 'duplicate chat')
);

// Delete interactive chat
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    stopChatExecution(req.params.id);

    // Delete uploaded files from disk before cascade removes DB rows
    const uploads = await coreDb
      .select({ file_path: chat_uploads.file_path })
      .from(chat_uploads)
      .where(eq(chat_uploads.chat_id, req.params.id));

    for (const row of uploads) {
      try {
        fs.unlinkSync(row.file_path);
      } catch {
        // File may already be gone
      }
    }

    await coreDb.delete(interactive_chats).where(eq(interactive_chats.id, req.params.id));
    res.json({ success: true });
  }, 'delete chat')
);

// Send a message to the chat
router.post(
  '/:id/send',
  asyncHandler(async (req, res) => {
    const { prompt, branch } = req.body;

    if (!requireString(res, prompt, 'Prompt')) return;

    const chatId = req.params.id;
    const branchId = (branch as string) || 'main';

    if (isChatExecuting(chatId)) {
      stopChatExecution(chatId);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    sendMessage(chatId, prompt.trim(), branchId).catch((err) => {
      console.error(`[InteractiveChat] Error sending message for chat ${chatId}:`, err);
    });

    res.json({ success: true });
  }, 'send message')
);

// Truncate messages after a given sequence (for edit-and-rerun)
router.post(
  '/:id/truncate-after',
  asyncHandler(async (req, res) => {
    const { sequence, branch } = req.body;
    if (typeof sequence !== 'number') {
      res.status(400).json({ error: 'sequence is required (number)' });
      return;
    }
    const chatId = req.params.id;
    const branchId = (branch as string) || 'main';

    const deleted = await coreDb
      .delete(chat_messages)
      .where(
        and(
          eq(chat_messages.chat_id, chatId),
          eq(chat_messages.branch_id, branchId),
          gt(chat_messages.sequence, sequence)
        )
      );

    res.json({ success: true, deletedCount: deleted.changes ?? 0 });
  }, 'truncate messages after sequence')
);

// Stop chat execution
router.post(
  '/:id/stop',
  asyncHandler(async (req, res) => {
    const stopped = stopChatExecution(req.params.id);
    res.json({ success: true, wasStopped: stopped });
  }, 'stop chat')
);

// Get chat status
router.get(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select({ is_executing: interactive_chats.is_executing })
      .from(interactive_chats)
      .where(eq(interactive_chats.id, req.params.id))
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Chat');
      return;
    }

    res.json({ isRunning: rows[0].is_executing ?? false, isPaused: isChatPaused(req.params.id) });
  }, 'get status')
);

// Pause chat execution
router.post(
  '/:id/pause',
  asyncHandler(async (req, res) => {
    const paused = pauseChatExecution(req.params.id);
    res.json({ success: true, wasPaused: paused });
  }, 'pause chat')
);

// Resume chat execution
router.post(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    const resumed = resumeChatExecution(req.params.id);
    res.json({ success: true, wasResumed: resumed });
  }, 'resume chat')
);

// Get messages for a chat (optionally filtered by branch)
router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const afterSequence = parseInt(req.query.afterSequence as string) || 0;
    const branch = (req.query.branch as string) || 'main';

    const rows = await coreDb
      .select()
      .from(chat_messages)
      .where(
        and(
          eq(chat_messages.chat_id, req.params.id),
          eq(chat_messages.branch_id, branch),
          gt(chat_messages.sequence, afterSequence)
        )
      )
      .orderBy(chat_messages.sequence);

    res.json(rows.map(rowToMessage));
  }, 'list messages')
);

/** Helper for single-field chat updates */
async function updateChatField(
  chatId: string,
  updates: Partial<typeof interactive_chats.$inferInsert>,
  res: import('express').Response
) {
  const result = await coreDb
    .update(interactive_chats)
    .set({ ...updates, updated_by: 'user' })
    .where(eq(interactive_chats.id, chatId))
    .returning();

  if (!result || result.length === 0) {
    sendNotFound(res, 'Chat');
    return;
  }

  res.json(rowToChat(result[0]));
}

// Rename chat
router.post(
  '/:id/rename',
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!requireString(res, name, 'Name')) return;
    await updateChatField(req.params.id, { name: name.trim() }, res);
  }, 'rename chat')
);

// Change permission mode
router.post(
  '/:id/mode',
  asyncHandler(async (req, res) => {
    const { permissionMode } = req.body;
    if (
      !requireEnum(
        res,
        permissionMode,
        ['plan', 'auto-accept', 'dangerous'] as const,
        'permissionMode'
      )
    )
      return;

    const currentRows = await coreDb
      .select({ permission_mode: interactive_chats.permission_mode })
      .from(interactive_chats)
      .where(eq(interactive_chats.id, req.params.id))
      .limit(1);

    if (!currentRows || currentRows.length === 0) {
      sendNotFound(res, 'Chat');
      return;
    }

    if (currentRows[0].permission_mode !== 'dangerous' && permissionMode === 'dangerous') {
      sendBadRequest(res, 'Cannot escalate to dangerous mode from plan or auto-accept');
      return;
    }

    await updateChatField(req.params.id, { permission_mode: permissionMode }, res);
  }, 'change mode')
);

// Change model
router.post(
  '/:id/model',
  asyncHandler(async (req, res) => {
    const { model } = req.body;
    if (!requireEnum(res, model, ['opus', 'sonnet', 'haiku'] as const, 'model')) return;

    await updateChatField(req.params.id, { model }, res);
  }, 'change model')
);

// Update system prompt
router.post(
  '/:id/system-prompt',
  asyncHandler(async (req, res) => {
    const { systemPrompt } = req.body;
    const value =
      systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim().length > 0
        ? systemPrompt.trim()
        : null;

    await updateChatField(req.params.id, { system_prompt: value }, res);
  }, 'update system prompt')
);

// Change max turns
router.post(
  '/:id/max-turns',
  asyncHandler(async (req, res) => {
    const { maxTurns } = req.body;

    const value =
      maxTurns === null || maxTurns === undefined || maxTurns === 0
        ? null
        : typeof maxTurns === 'number' && maxTurns > 0 && Number.isInteger(maxTurns)
          ? maxTurns
          : undefined;

    if (value === undefined) {
      sendBadRequest(res, 'maxTurns must be a positive integer or null');
      return;
    }

    await updateChatField(req.params.id, { max_turns: value }, res);
  }, 'change max turns')
);

// Change effort level
router.post(
  '/:id/effort',
  asyncHandler(async (req, res) => {
    const { effort } = req.body;
    const validLevels = ['low', 'medium', 'high', 'xhigh', 'max'];

    if (effort !== null && !validLevels.includes(effort)) {
      sendBadRequest(res, `effort must be one of: ${validLevels.join(', ')} or null`);
      return;
    }

    const chatRows = await coreDb
      .select()
      .from(interactive_chats)
      .where(eq(interactive_chats.id, req.params.id));

    if (!chatRows.length) {
      sendNotFound(res, 'Chat');
      return;
    }

    const existingSettings = (chatRows[0].settings as Record<string, unknown>) ?? {};
    const newSettings = { ...existingSettings };
    if (effort === null) {
      delete newSettings.effort;
    } else {
      newSettings.effort = effort;
    }

    await updateChatField(req.params.id, { settings: newSettings }, res);
  }, 'change effort level')
);

// Toggle fast mode
router.post(
  '/:id/fast-mode',
  asyncHandler(async (req, res) => {
    const chatRows = await coreDb
      .select()
      .from(interactive_chats)
      .where(eq(interactive_chats.id, req.params.id));

    if (!chatRows.length) {
      sendNotFound(res, 'Chat');
      return;
    }

    const existingSettings = (chatRows[0].settings as Record<string, unknown>) ?? {};
    const newSettings = { ...existingSettings, fastMode: !existingSettings.fastMode };

    await updateChatField(req.params.id, { settings: newSettings }, res);
  }, 'toggle fast mode')
);

// Change allowed tools
router.post(
  '/:id/allowed-tools',
  asyncHandler(async (req, res) => {
    const { allowedTools } = req.body;

    if (allowedTools !== null && !Array.isArray(allowedTools)) {
      sendBadRequest(res, 'allowedTools must be an array of tool names or null');
      return;
    }

    const chatRows = await coreDb
      .select()
      .from(interactive_chats)
      .where(eq(interactive_chats.id, req.params.id));

    if (!chatRows.length) {
      sendNotFound(res, 'Chat');
      return;
    }

    const existingSettings = (chatRows[0].settings as Record<string, unknown>) ?? {};
    const newSettings = { ...existingSettings };
    if (allowedTools === null) {
      delete newSettings.allowedTools;
    } else {
      newSettings.allowedTools = allowedTools;
    }

    await updateChatField(req.params.id, { settings: newSettings }, res);
  }, 'change allowed tools')
);

// Change working directory
router.post(
  '/:id/working-dir',
  asyncHandler(async (req, res) => {
    const { workingDir } = req.body;
    if (workingDir !== null && (typeof workingDir !== 'string' || !workingDir.trim())) {
      sendBadRequest(res, 'workingDir must be a non-empty string or null');
      return;
    }

    const chatRows = await coreDb
      .select()
      .from(interactive_chats)
      .where(eq(interactive_chats.id, req.params.id));

    if (!chatRows.length) {
      sendNotFound(res, 'Chat');
      return;
    }

    const existingSettings = (chatRows[0].settings as Record<string, unknown>) ?? {};
    const newSettings = { ...existingSettings };
    if (workingDir === null) {
      delete newSettings.workingDir;
    } else {
      newSettings.workingDir = workingDir.trim();
    }

    await updateChatField(req.params.id, { settings: newSettings }, res);
  }, 'change working directory')
);

// Archive a chat
router.post(
  '/:id/archive',
  asyncHandler(async (req, res) => {
    stopChatExecution(req.params.id);
    await updateChatField(req.params.id, { archived_at: new Date().toISOString() }, res);
  }, 'archive chat')
);

// Unarchive a chat
router.post(
  '/:id/unarchive',
  asyncHandler(async (req, res) => {
    await updateChatField(req.params.id, { archived_at: null }, res);
  }, 'unarchive chat')
);

// List branches for a chat
router.get(
  '/:id/branches',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select({ branch_id: chat_messages.branch_id })
      .from(chat_messages)
      .where(eq(chat_messages.chat_id, req.params.id))
      .groupBy(chat_messages.branch_id)
      .orderBy(chat_messages.branch_id);

    const branches = rows.map((r) => r.branch_id);
    res.json(branches);
  }, 'list branches')
);

// Create a branch from a specific message sequence
router.post(
  '/:id/branch',
  asyncHandler(async (req, res) => {
    const { fromSequence, branchName } = req.body;
    const chatId = req.params.id;
    const sourceBranch = (req.body.sourceBranch as string) || 'main';

    if (typeof fromSequence !== 'number' || fromSequence < 1) {
      sendBadRequest(res, 'fromSequence must be a positive number');
      return;
    }

    const name = branchName || `branch-${Date.now().toString(36)}`;

    // Check branch doesn't already exist
    const existing = await coreDb
      .select({ branch_id: chat_messages.branch_id })
      .from(chat_messages)
      .where(and(eq(chat_messages.chat_id, chatId), eq(chat_messages.branch_id, name)))
      .limit(1);

    if (existing.length > 0) {
      sendBadRequest(res, `Branch "${name}" already exists`);
      return;
    }

    // Copy messages up to (and including) fromSequence into the new branch
    const messagesToCopy = await coreDb
      .select()
      .from(chat_messages)
      .where(
        and(
          eq(chat_messages.chat_id, chatId),
          eq(chat_messages.branch_id, sourceBranch),
          lte(chat_messages.sequence, fromSequence)
        )
      )
      .orderBy(chat_messages.sequence);

    for (const msg of messagesToCopy) {
      coreDb
        .insert(chat_messages)
        .values({
          id: generateId(),
          chat_id: chatId,
          branch_id: name,
          sequence: msg.sequence,
          type: msg.type,
          content: msg.content,
          created_by: msg.created_by,
          updated_by: 'system',
        })
        .run();
    }

    res.json({ branchId: name, messagesCopied: messagesToCopy.length });
  }, 'create branch')
);

export { router as interactiveChatRouter };
