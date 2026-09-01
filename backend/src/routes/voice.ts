import { Router } from 'express';
import { asyncHandler, sendBadRequest, sendInternalError, generateId } from '../lib/route-helpers.js';
import {
  voiceTranscriptsStore,
  type VoiceTranscriptMessage,
} from '../lib/stores/voice-transcripts.js';

export const voiceRouter = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Raw STT output before corrections (user messages only) */
  rawStt?: string;
  timestamp: string;
}

interface VoiceSession {
  id: string;
  messages: VoiceMessage[];
  systemPrompt: string;
  createdAt: string;
  lastActiveAt: string;
}

// ---------------------------------------------------------------------------
// In-memory store (voice chats are ephemeral — no database needed)
// ---------------------------------------------------------------------------

const sessions = new Map<string, VoiceSession>();

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful voice assistant. Keep responses concise and conversational — they will be spoken aloud. Avoid markdown formatting, bullet points, code blocks, or any visual formatting. Use natural spoken language. When listing items, use phrases like "first, second, third" rather than numbered lists. Keep responses under 3 sentences unless the user asks for detail.';

// ---------------------------------------------------------------------------
// Model mapping
// ---------------------------------------------------------------------------

const MODEL_MAP: Record<string, string> = {
  sonnet: 'claude-sonnet-4-20250514',
  haiku: 'claude-haiku-4-5-20251001',
  opus: 'claude-opus-4-20250514',
};

function resolveModel(shortName?: string): string {
  const key = shortName ?? 'sonnet';
  return MODEL_MAP[key] ?? MODEL_MAP.sonnet;
}

// ---------------------------------------------------------------------------
// Transcript persistence helper
// ---------------------------------------------------------------------------

async function saveTranscript(session: VoiceSession): Promise<void> {
  if (session.messages.length === 0) return;

  const startTime = new Date(session.createdAt).getTime();
  const endTime = new Date(session.lastActiveAt).getTime();
  const durationSeconds = Math.max(0, Math.round((endTime - startTime) / 1000));

  const transcriptMessages: VoiceTranscriptMessage[] = session.messages.map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.rawStt ? { rawStt: m.rawStt } : {}),
    timestamp: m.timestamp,
  }));

  try {
    await voiceTranscriptsStore.create({
      sessionId: session.id,
      messages: transcriptMessages,
      messageCount: session.messages.length,
      durationSeconds,
      sessionStartedAt: session.createdAt,
      sessionEndedAt: session.lastActiveAt,
      analyzed: false,
      analysisSummary: '',
      created_by: 'voice',
      updated_by: 'voice',
      settings: {},
    } as Parameters<typeof voiceTranscriptsStore.create>[0]);
    console.log(
      `[voice] Saved transcript for session ${session.id} (${session.messages.length} messages, ${durationSeconds}s)`
    );
  } catch (err) {
    console.error(`[voice] Failed to save transcript for session ${session.id}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Session cleanup — remove sessions older than 1 hour, every 5 minutes
// Save transcripts before cleanup.
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

setInterval(async () => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - new Date(session.lastActiveAt).getTime() > SESSION_TTL_MS) {
      await saveTranscript(session);
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/voice/sessions — list active voice sessions
voiceRouter.get(
  '/sessions',
  asyncHandler(async (_req, res) => {
    const list = Array.from(sessions.values()).map((s) => ({
      id: s.id,
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
    }));
    res.json(list);
  }, 'list voice sessions')
);

// POST /api/voice/sessions — create a new voice session
voiceRouter.post(
  '/sessions',
  asyncHandler(async (req, res) => {
    const { systemPrompt } = req.body as { systemPrompt?: string };
    const now = new Date().toISOString();
    const session: VoiceSession = {
      id: generateId(),
      messages: [],
      systemPrompt: systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
      createdAt: now,
      lastActiveAt: now,
    };
    sessions.set(session.id, session);
    res.json({ id: session.id, systemPrompt: session.systemPrompt, createdAt: session.createdAt });
  }, 'create voice session')
);

// GET /api/voice/sessions/:id — get session state
voiceRouter.get(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Not found', message: 'Voice session not found' });
      return;
    }
    res.json(session);
  }, 'get voice session')
);

// DELETE /api/voice/sessions/:id — end a voice session (saves transcript)
voiceRouter.delete(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Not found', message: 'Voice session not found' });
      return;
    }

    // Save transcript before deleting
    await saveTranscript(session);
    sessions.delete(req.params.id);

    res.json({ deleted: true });
  }, 'delete voice session')
);

// POST /api/voice/sessions/:id/respond — send user text, get AI response
voiceRouter.post(
  '/sessions/:id/respond',
  asyncHandler(async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Not found', message: 'Voice session not found' });
      return;
    }

    const { text, rawStt, model } = req.body as { text?: string; rawStt?: string; model?: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return sendBadRequest(res, 'text is required');
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'Service unavailable',
        message:
          'ANTHROPIC_API_KEY is not set. Set it in your environment to enable voice responses.',
      });
      return;
    }

    // Build messages array from session history + new user message
    const claudeMessages = [
      ...session.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text.trim() },
    ];

    const resolvedModel = resolveModel(model);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: resolvedModel,
          max_tokens: 300,
          system: session.systemPrompt,
          messages: claudeMessages,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[voice] Anthropic API error:', response.status, errorBody);
        return sendInternalError(
          res,
          `Anthropic API returned ${response.status}: ${errorBody}`,
          'get AI response'
        );
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text?: string }>;
      };

      const assistantText =
        data.content
          ?.filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('') || '';

      const now = new Date().toISOString();

      // Add user message to history (preserve rawStt for transcript logging)
      session.messages.push({
        role: 'user',
        content: text.trim(),
        ...(rawStt && rawStt !== text.trim() ? { rawStt } : {}),
        timestamp: now,
      });

      // Add assistant response to history
      session.messages.push({ role: 'assistant', content: assistantText, timestamp: now });

      session.lastActiveAt = now;

      res.json({ text: assistantText, messageIndex: session.messages.length - 1 });
    } catch (err) {
      return sendInternalError(res, err, 'get AI response');
    }
  }, 'voice respond')
);

// POST /api/voice/sessions/:id/clear — clear conversation history
voiceRouter.post(
  '/sessions/:id/clear',
  asyncHandler(async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Not found', message: 'Voice session not found' });
      return;
    }

    // Save transcript before clearing (don't lose the conversation)
    await saveTranscript(session);

    session.messages = [];
    session.lastActiveAt = new Date().toISOString();
    res.json({ cleared: true });
  }, 'clear voice session')
);
