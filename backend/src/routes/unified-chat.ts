import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { eq } from 'drizzle-orm';
import { asyncHandler, generateId } from '../lib/route-helpers.js';
import { DB_CORE_PATH } from '../lib/env.js';
import { coreDb, interactive_chats, unified_favorites } from '../lib/db/core.js';
import { listProviders, listAllSessions, getSessionDetail, searchAllSessions, invalidateSessionCache } from '../lib/cli-providers.js';
import type { CLIProvider } from '../lib/cli-providers.js';

const router = Router();

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const SETTINGS_PATH = path.join(path.dirname(DB_CORE_PATH), 'unified-chat-settings.json');

interface UnifiedSettings {
  defaultDir: string | null;
}

function loadSettings(): UnifiedSettings {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {
    return { defaultDir: null };
  }
}

function saveSettings(settings: UnifiedSettings): void {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

// Heuristic decode: replace hyphens with slashes for display
function decodeDir(encoded: string): string {
  return ('/' + encoded.replace(/-/g, '/')).replace(/\/+/g, '/');
}

function parseFirstUserText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const textBlock = content.find((c: { type?: string }) => c.type === 'text');
    return textBlock?.text ?? '';
  }
  return '';
}

function parseAssistantText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: { type?: string }) => c.type === 'text')
      .map((c: { text?: string }) => c.text ?? '')
      .join('');
  }
  return '';
}

// GET /api/unified-chat/dirs
router.get(
  '/dirs',
  asyncHandler(async (_req, res) => {
    if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) {
      res.json({ dirs: [], defaultDir: null });
      return;
    }

    const entries = fs.readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => {
        const dirPath = path.join(CLAUDE_PROJECTS_DIR, e.name);
        const sessionCount = fs
          .readdirSync(dirPath)
          .filter((f) => f.endsWith('.jsonl')).length;
        return { encoded: e.name, displayPath: decodeDir(e.name), sessionCount };
      })
      .filter((d) => d.sessionCount > 0)
      .sort((a, b) => b.sessionCount - a.sessionCount);

    const settings = loadSettings();
    res.json({ dirs, defaultDir: settings.defaultDir });
  }, 'list unified dirs')
);

// GET /api/unified-chat/dirs/:encoded/sessions
router.get(
  '/dirs/:encoded/sessions',
  asyncHandler(async (req, res) => {
    const dirPath = path.join(CLAUDE_PROJECTS_DIR, req.params.encoded);
    if (!fs.existsSync(dirPath)) {
      res.status(404).json({ error: 'Directory not found', message: 'Claude project directory not found' });
      return;
    }

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.jsonl'));
    const sessions = [];

    for (const file of files) {
      const sessionId = file.replace('.jsonl', '');
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      let firstUserMessage = '';
      let firstTimestamp = stat.birthtime.toISOString();
      let lastTimestamp = stat.mtime.toISOString();
      let cwd = '';
      let messageCount = 0;

      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const lines = raw.split('\n').filter(Boolean);
        let firstSet = false;

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (!firstSet && entry.timestamp) {
              firstTimestamp = entry.timestamp;
              firstSet = true;
            }
            if (entry.cwd && !cwd) cwd = entry.cwd;
            if (entry.type === 'user' || entry.type === 'assistant') messageCount++;
            if (!firstUserMessage && entry.type === 'user' && entry.message?.content) {
              firstUserMessage = parseFirstUserText(entry.message.content);
            }
            if (entry.timestamp) lastTimestamp = entry.timestamp;
          } catch {}
        }
      } catch {}

      sessions.push({
        sessionId,
        preview: firstUserMessage.slice(0, 200).trim(),
        createdAt: firstTimestamp,
        updatedAt: lastTimestamp,
        cwd,
        messageCount,
      });
    }

    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json(sessions);
  }, 'list unified sessions')
);

// GET /api/unified-chat/dirs/:encoded/sessions/:sessionId
router.get(
  '/dirs/:encoded/sessions/:sessionId',
  asyncHandler(async (req, res) => {
    const filePath = path.join(
      CLAUDE_PROJECTS_DIR,
      req.params.encoded,
      `${req.params.sessionId}.jsonl`
    );
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Session not found', message: 'Session file not found' });
      return;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    const messages: { uuid: string; type: 'user' | 'assistant'; text: string; timestamp: string }[] = [];
    let cwd = '';
    let gitBranch = '';

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.cwd && !cwd) cwd = entry.cwd;
        if (entry.gitBranch && !gitBranch) gitBranch = entry.gitBranch;
        if (entry.type !== 'user' && entry.type !== 'assistant') continue;

        let text = '';
        if (entry.type === 'user' && entry.message?.content) {
          text = parseFirstUserText(entry.message.content);
        } else if (entry.type === 'assistant' && entry.message?.content) {
          text = parseAssistantText(entry.message.content);
        }

        if (!text.trim()) continue;

        messages.push({
          uuid: entry.uuid ?? '',
          type: entry.type,
          text: text.trim(),
          timestamp: entry.timestamp ?? '',
        });
      } catch {}
    }

    res.json({ messages, sessionId: req.params.sessionId, cwd, gitBranch });
  }, 'get unified session messages')
);

// GET /api/unified-chat/default-dir
router.get(
  '/default-dir',
  asyncHandler(async (_req, res) => {
    res.json(loadSettings());
  }, 'get unified default dir')
);

// POST /api/unified-chat/open-session
// Finds or creates an interactive_chat linked to a JSONL session so it can be continued.
router.post(
  '/open-session',
  asyncHandler(async (req, res) => {
    const { sessionId, cwd, name } = req.body;
    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'Bad request', message: 'sessionId is required' });
      return;
    }

    // Return existing chat if already linked to this session
    const existing = await coreDb
      .select()
      .from(interactive_chats)
      .where(eq(interactive_chats.claude_session_id, sessionId))
      .limit(1);

    if (existing.length > 0) {
      res.json({ chatId: existing[0].id });
      return;
    }

    // Create a new interactive_chat linked to the JSONL session
    const id = generateId();
    const chatName: string =
      name && typeof name === 'string' ? name.slice(0, 120).trim() : 'Unified Session';
    const workingDir: string | null =
      cwd && typeof cwd === 'string' ? cwd.trim() : null;

    await coreDb.insert(interactive_chats).values({
      id,
      name: chatName,
      type: 'Unified',
      status: 'active',
      permission_mode: 'dangerous',
      model: 'sonnet',
      system_prompt: null,
      claude_session_id: sessionId,
      settings: workingDir ? { workingDir } : {},
      created_by: 'user',
      updated_by: 'user',
    });

    res.status(201).json({ chatId: id });
  }, 'open unified session')
);

// GET /api/unified-chat/dirs/:encoded/search?q=query
router.get(
  '/dirs/:encoded/search',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string ?? '').trim().toLowerCase();
    if (!q) { res.json([]); return; }

    const dirPath = path.join(CLAUDE_PROJECTS_DIR, req.params.encoded);
    if (!fs.existsSync(dirPath)) { res.json([]); return; }

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.jsonl'));
    const results = [];

    for (const file of files) {
      const sessionId = file.replace('.jsonl', '');
      const filePath = path.join(dirPath, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const lines = raw.split('\n').filter(Boolean);
        let firstTimestamp = '';
        let lastTimestamp = '';
        let firstUserMessage = '';
        let cwd = '';
        let matchCount = 0;

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (!firstTimestamp && entry.timestamp) firstTimestamp = entry.timestamp;
            if (entry.timestamp) lastTimestamp = entry.timestamp;
            if (entry.cwd && !cwd) cwd = entry.cwd;

            let text = '';
            if (entry.type === 'user' && entry.message?.content) {
              text = parseFirstUserText(entry.message.content);
              if (!firstUserMessage) firstUserMessage = text;
            } else if (entry.type === 'assistant' && entry.message?.content) {
              text = parseAssistantText(entry.message.content);
            }
            if (text && text.toLowerCase().includes(q)) matchCount++;
          } catch {}
        }

        if (matchCount > 0) {
          results.push({
            sessionId,
            preview: firstUserMessage.slice(0, 200).trim(),
            createdAt: firstTimestamp,
            updatedAt: lastTimestamp,
            cwd,
            messageCount: matchCount,
          });
        }
      } catch {}
    }

    results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json(results);
  }, 'search unified sessions')
);

// GET /api/unified-chat/favorites
router.get(
  '/favorites',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb.select().from(unified_favorites);
    res.json({ sessionIds: rows.map((r) => r.session_id) });
  }, 'list unified favorites')
);

// POST /api/unified-chat/favorites/:sessionId/toggle
router.post(
  '/favorites/:sessionId/toggle',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const existing = await coreDb
      .select()
      .from(unified_favorites)
      .where(eq(unified_favorites.session_id, sessionId))
      .limit(1);

    if (existing.length > 0) {
      await coreDb.delete(unified_favorites).where(eq(unified_favorites.session_id, sessionId));
      res.json({ favorited: false });
    } else {
      await coreDb.insert(unified_favorites).values({
        session_id: sessionId,
        created_by: 'user',
        updated_by: 'user',
      });
      res.json({ favorited: true });
    }
  }, 'toggle unified favorite')
);

// DELETE /api/unified-chat/dirs/:encoded/sessions/:sessionId
router.delete(
  '/dirs/:encoded/sessions/:sessionId',
  asyncHandler(async (req, res) => {
    const filePath = path.join(
      CLAUDE_PROJECTS_DIR,
      req.params.encoded,
      `${req.params.sessionId}.jsonl`
    );
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Session not found', message: 'Session file not found' });
      return;
    }

    fs.unlinkSync(filePath);

    // Also remove any linked interactive_chat row
    await coreDb
      .delete(interactive_chats)
      .where(eq(interactive_chats.claude_session_id, req.params.sessionId));

    res.json({ success: true });
  }, 'delete unified session')
);

// POST /api/unified-chat/default-dir
router.post(
  '/default-dir',
  asyncHandler(async (req, res) => {
    const settings = loadSettings();
    settings.defaultDir = req.body.encoded ?? null;
    saveSettings(settings);
    res.json(settings);
  }, 'set unified default dir')
);

// ─── Multi-Provider Endpoints ───────────────────────────────────────

const VALID_PROVIDERS = ['claude', 'codex', 'kimi', 'cursor'];

// GET /api/unified-chat/providers
router.get(
  '/providers',
  asyncHandler(async (_req, res) => {
    const providers = listProviders();
    res.json({ providers });
  }, 'list CLI providers')
);

// GET /api/unified-chat/all-sessions?provider=&limit=&q=
router.get(
  '/all-sessions',
  asyncHandler(async (req, res) => {
    const provider = req.query.provider as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 200, 500);
    const q = (req.query.q as string ?? '').trim();

    if (provider && !VALID_PROVIDERS.includes(provider)) {
      res.status(400).json({ error: 'Bad request', message: `Invalid provider: ${provider}. Valid: ${VALID_PROVIDERS.join(', ')}` });
      return;
    }

    let sessions;
    if (q) {
      sessions = searchAllSessions(q, provider as CLIProvider | undefined);
    } else {
      sessions = listAllSessions(provider as CLIProvider | undefined, limit);
    }

    res.json({ sessions, total: sessions.length });
  }, 'list all CLI sessions')
);

// GET /api/unified-chat/session/:provider/:sessionId
router.get(
  '/session/:provider/:sessionId',
  asyncHandler(async (req, res) => {
    const { provider, sessionId } = req.params;

    if (!VALID_PROVIDERS.includes(provider)) {
      res.status(400).json({ error: 'Bad request', message: `Invalid provider: ${provider}` });
      return;
    }

    const projectDir = req.query.projectDir as string | undefined;
    const detail = getSessionDetail(provider as CLIProvider, sessionId, projectDir);

    if (!detail) {
      res.status(404).json({ error: 'Not found', message: 'Session not found' });
      return;
    }

    res.json(detail);
  }, 'get CLI session detail')
);

// POST /api/unified-chat/refresh-cache
router.post(
  '/refresh-cache',
  asyncHandler(async (_req, res) => {
    invalidateSessionCache();
    res.json({ success: true });
  }, 'refresh CLI session cache')
);

export { router as unifiedChatRouter };
