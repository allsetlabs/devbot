/**
 * CLI Provider parsers — reads session data from Claude Code, OpenAI Codex,
 * Kimi Code, and Cursor local data stores.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

export type CLIProvider = 'claude' | 'codex' | 'kimi' | 'cursor';

export interface ProviderInfo {
  id: CLIProvider;
  name: string;
  available: boolean;
  sessionCount: number;
  dataDir: string;
  model?: string;
}

export interface ProviderSession {
  sessionId: string;
  provider: CLIProvider;
  preview: string;
  createdAt: string;
  updatedAt: string;
  cwd: string;
  messageCount: number;
  model?: string;
  projectDir?: string;
}

export interface ProviderMessage {
  uuid: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ProviderSessionDetail {
  messages: ProviderMessage[];
  sessionId: string;
  provider: CLIProvider;
  cwd: string;
  gitBranch: string;
  model?: string;
}

// ─── Paths ──────────────────────────────────────────────────────────

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const CLAUDE_PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
const CODEX_DIR = path.join(os.homedir(), '.codex');
const CODEX_SESSIONS_DIR = path.join(CODEX_DIR, 'sessions');
const KIMI_DIR = path.join(os.homedir(), '.kimi-code');
const KIMI_SESSIONS_DIR = path.join(KIMI_DIR, 'sessions');
const CURSOR_DIR = path.join(os.homedir(), '.cursor');
const CURSOR_DB_PATH = path.join(CURSOR_DIR, 'ai-tracking', 'ai-code-tracking.db');

// ─── Helpers ────────────────────────────────────────────────────────

function safeReadLines(filePath: string): string[] {
  try {
    return fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function safeParseJson(line: string): Record<string, unknown> | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function parseTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: { type?: string }) => c.type === 'text')
      .map((c: { text?: string }) => c.text ?? '')
      .join('');
  }
  return '';
}

// ─── Claude Code ────────────────────────────────────────────────────

function getClaudeSessions(): ProviderSession[] {
  if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) return [];

  const sessions: ProviderSession[] = [];
  let projectDirs: fs.Dirent[];
  try {
    projectDirs = fs.readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory());
  } catch {
    return [];
  }

  for (const projDir of projectDirs) {
    const dirPath = path.join(CLAUDE_PROJECTS_DIR, projDir.name);
    let files: string[];
    try {
      files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.jsonl'));
    } catch {
      continue;
    }

    for (const file of files) {
      const sessionId = file.replace('.jsonl', '');
      const filePath = path.join(dirPath, file);

      try {
        const stat = fs.statSync(filePath);
        const lines = safeReadLines(filePath);

        let firstUserMessage = '';
        let firstTimestamp = stat.birthtime.toISOString();
        let lastTimestamp = stat.mtime.toISOString();
        let cwd = '';
        let messageCount = 0;
        let firstTimestampSet = false;

        for (const line of lines) {
          const entry = safeParseJson(line);
          if (!entry) continue;

          if (entry.timestamp && typeof entry.timestamp === 'string') {
            if (!firstTimestampSet) {
              firstTimestamp = entry.timestamp;
              firstTimestampSet = true;
            }
            lastTimestamp = entry.timestamp;
          }
          if (entry.cwd && !cwd) cwd = entry.cwd as string;
          if (entry.type === 'user' || entry.type === 'assistant') messageCount++;
          if (!firstUserMessage && entry.type === 'user') {
            const msg = entry.message as { content?: unknown } | undefined;
            if (msg?.content) firstUserMessage = parseTextContent(msg.content);
          }
        }

        if (messageCount > 0) {
          sessions.push({
            sessionId,
            provider: 'claude',
            preview: firstUserMessage.slice(0, 200).trim(),
            createdAt: firstTimestamp,
            updatedAt: lastTimestamp,
            cwd,
            messageCount,
            projectDir: projDir.name,
          });
        }
      } catch { /* skip unreadable files */ }
    }
  }

  return sessions;
}

function getClaudeSessionMessages(sessionId: string, projectDir?: string): ProviderSessionDetail | null {
  const searchDirs = projectDir
    ? [path.join(CLAUDE_PROJECTS_DIR, projectDir)]
    : fs.existsSync(CLAUDE_PROJECTS_DIR)
      ? fs.readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => path.join(CLAUDE_PROJECTS_DIR, e.name))
      : [];

  for (const dirPath of searchDirs) {
    const filePath = path.join(dirPath, `${sessionId}.jsonl`);
    if (!fs.existsSync(filePath)) continue;

    const lines = safeReadLines(filePath);
    const messages: ProviderMessage[] = [];
    let cwd = '';
    let gitBranch = '';

    for (const line of lines) {
      const entry = safeParseJson(line);
      if (!entry) continue;

      if (entry.cwd && !cwd) cwd = entry.cwd as string;
      if (entry.gitBranch && !gitBranch) gitBranch = entry.gitBranch as string;
      if (entry.type !== 'user' && entry.type !== 'assistant') continue;

      const msg = entry.message as { content?: unknown } | undefined;
      const text = msg?.content ? parseTextContent(msg.content) : '';
      if (!text.trim()) continue;

      messages.push({
        uuid: (entry.uuid as string) ?? '',
        type: entry.type as 'user' | 'assistant',
        text: text.trim(),
        timestamp: (entry.timestamp as string) ?? '',
      });
    }

    return { messages, sessionId, provider: 'claude', cwd, gitBranch };
  }

  return null;
}

// ─── OpenAI Codex ───────────────────────────────────────────────────

function walkCodexSessionFiles(): string[] {
  const files: string[] = [];
  if (!fs.existsSync(CODEX_SESSIONS_DIR)) return files;

  function walk(dir: string) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.jsonl')) {
          files.push(fullPath);
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  walk(CODEX_SESSIONS_DIR);

  // Also check archived_sessions
  const archivedDir = path.join(CODEX_DIR, 'archived_sessions');
  if (fs.existsSync(archivedDir)) walk(archivedDir);

  return files;
}

function getCodexSessions(): ProviderSession[] {
  const sessionFiles = walkCodexSessionFiles();
  const sessions: ProviderSession[] = [];

  for (const filePath of sessionFiles) {
    try {
      const lines = safeReadLines(filePath);
      if (lines.length === 0) continue;

      let sessionId = '';
      let cwd = '';
      let firstTimestamp = '';
      let lastTimestamp = '';
      let firstUserMessage = '';
      let messageCount = 0;
      let model = '';

      for (const line of lines) {
        const entry = safeParseJson(line);
        if (!entry) continue;

        const ts = entry.timestamp as string | undefined;
        if (ts) {
          if (!firstTimestamp) firstTimestamp = ts;
          lastTimestamp = ts;
        }

        const type = entry.type as string;

        if (type === 'session_meta') {
          const payload = entry.payload as Record<string, unknown> | undefined;
          if (payload) {
            sessionId = (payload.session_id as string) ?? '';
            cwd = (payload.cwd as string) ?? '';
            model = (payload.model_provider as string) ?? '';
          }
        }

        if (type === 'event_msg') {
          const payload = entry.payload as Record<string, unknown> | undefined;
          if (payload) {
            const msgType = payload.type as string;
            if (msgType === 'user_message' || msgType === 'agent_message') {
              messageCount++;
              if (!firstUserMessage && msgType === 'user_message') {
                firstUserMessage = (payload.message as string) ?? '';
              }
            }
          }
        }
      }

      if (!sessionId) {
        // Fallback: extract from filename (rollout-<ts>-<sessionId>.jsonl)
        const basename = path.basename(filePath, '.jsonl');
        const parts = basename.split('-');
        sessionId = parts.length > 2 ? parts.slice(2).join('-') : basename;
      }

      if (messageCount > 0) {
        const stat = fs.statSync(filePath);
        sessions.push({
          sessionId,
          provider: 'codex',
          preview: firstUserMessage.slice(0, 200).trim(),
          createdAt: firstTimestamp || stat.birthtime.toISOString(),
          updatedAt: lastTimestamp || stat.mtime.toISOString(),
          cwd,
          messageCount,
          model: model || 'openai',
        });
      }
    } catch { /* skip unreadable */ }
  }

  return sessions;
}

function getCodexSessionMessages(sessionId: string): ProviderSessionDetail | null {
  const sessionFiles = walkCodexSessionFiles();

  for (const filePath of sessionFiles) {
    const lines = safeReadLines(filePath);
    let matchedSessionId = '';
    let cwd = '';
    let model = '';

    // Check session_meta first
    for (const line of lines) {
      const entry = safeParseJson(line);
      if (!entry) continue;
      if (entry.type === 'session_meta') {
        const payload = entry.payload as Record<string, unknown> | undefined;
        matchedSessionId = (payload?.session_id as string) ?? '';
        cwd = (payload?.cwd as string) ?? '';
        model = (payload?.model_provider as string) ?? '';
        break;
      }
    }

    // Fallback: match by filename
    if (!matchedSessionId) {
      const basename = path.basename(filePath, '.jsonl');
      const parts = basename.split('-');
      matchedSessionId = parts.length > 2 ? parts.slice(2).join('-') : basename;
    }

    if (matchedSessionId !== sessionId) continue;

    // Parse messages
    const messages: ProviderMessage[] = [];
    for (const line of lines) {
      const entry = safeParseJson(line);
      if (!entry) continue;

      const type = entry.type as string;
      const ts = (entry.timestamp as string) ?? '';

      if (type === 'event_msg') {
        const payload = entry.payload as Record<string, unknown> | undefined;
        if (!payload) continue;

        const msgType = payload.type as string;
        if (msgType === 'user_message') {
          messages.push({
            uuid: `codex-user-${messages.length}`,
            type: 'user',
            text: ((payload.message as string) ?? '').trim(),
            timestamp: ts,
          });
        } else if (msgType === 'agent_message') {
          const text = ((payload.message as string) ?? '').trim();
          if (text) {
            messages.push({
              uuid: `codex-asst-${messages.length}`,
              type: 'assistant',
              text,
              timestamp: ts,
            });
          }
        }
      }
    }

    return { messages, sessionId, provider: 'codex', cwd, gitBranch: '', model };
  }

  return null;
}

// ─── Kimi Code ──────────────────────────────────────────────────────

function walkKimiSessionFiles(): { filePath: string; sessionDir: string }[] {
  const results: { filePath: string; sessionDir: string }[] = [];
  if (!fs.existsSync(KIMI_SESSIONS_DIR)) return results;

  try {
    // Structure: sessions/wd_<project>_<hash>/session_<UUID>/agents/main/wire.jsonl
    for (const wdEntry of fs.readdirSync(KIMI_SESSIONS_DIR, { withFileTypes: true })) {
      if (!wdEntry.isDirectory()) continue;
      const wdPath = path.join(KIMI_SESSIONS_DIR, wdEntry.name);

      try {
        for (const sessEntry of fs.readdirSync(wdPath, { withFileTypes: true })) {
          if (!sessEntry.isDirectory() || !sessEntry.name.startsWith('session_')) continue;
          const sessPath = path.join(wdPath, sessEntry.name);

          // Main agent wire.jsonl
          const wirePath = path.join(sessPath, 'agents', 'main', 'wire.jsonl');
          if (fs.existsSync(wirePath)) {
            results.push({ filePath: wirePath, sessionDir: sessEntry.name });
          }
        }
      } catch { /* skip unreadable project dirs */ }
    }
  } catch { /* skip unreadable sessions dir */ }

  return results;
}

function getKimiSessions(): ProviderSession[] {
  const sessionFiles = walkKimiSessionFiles();
  const sessions: ProviderSession[] = [];

  for (const { filePath, sessionDir } of sessionFiles) {
    try {
      const lines = safeReadLines(filePath);
      if (lines.length === 0) continue;

      const sessionId = sessionDir.replace('session_', '');
      let firstTimestamp = '';
      let lastTimestamp = '';
      let firstUserMessage = '';
      let messageCount = 0;
      let cwd = '';

      for (const line of lines) {
        const entry = safeParseJson(line);
        if (!entry) continue;

        const time = entry.time as number | undefined;
        if (time) {
          const ts = new Date(time).toISOString();
          if (!firstTimestamp) firstTimestamp = ts;
          lastTimestamp = ts;
        }

        const type = entry.type as string;

        if (type === 'turn.prompt') {
          messageCount++;
          if (!firstUserMessage) {
            const input = entry.input as { type?: string; text?: string }[] | undefined;
            if (Array.isArray(input)) {
              const textBlock = input.find((i) => i.type === 'text');
              firstUserMessage = textBlock?.text ?? '';
            }
          }
        }

        if (type === 'context.append_message') {
          const message = entry.message as { role?: string } | undefined;
          if (message?.role === 'assistant') messageCount++;
        }

        // Try to get cwd from metadata
        if (type === 'metadata' && !cwd) {
          const payload = entry as Record<string, unknown>;
          if (payload.cwd) cwd = payload.cwd as string;
        }
      }

      if (messageCount > 0) {
        const stat = fs.statSync(filePath);
        sessions.push({
          sessionId,
          provider: 'kimi',
          preview: firstUserMessage.slice(0, 200).trim(),
          createdAt: firstTimestamp || stat.birthtime.toISOString(),
          updatedAt: lastTimestamp || stat.mtime.toISOString(),
          cwd,
          messageCount,
          model: 'kimi',
        });
      }
    } catch { /* skip unreadable */ }
  }

  return sessions;
}

function getKimiSessionMessages(sessionId: string): ProviderSessionDetail | null {
  const sessionFiles = walkKimiSessionFiles();

  for (const { filePath, sessionDir } of sessionFiles) {
    const thisId = sessionDir.replace('session_', '');
    if (thisId !== sessionId) continue;

    const lines = safeReadLines(filePath);
    const messages: ProviderMessage[] = [];
    let cwd = '';

    for (const line of lines) {
      const entry = safeParseJson(line);
      if (!entry) continue;

      const type = entry.type as string;
      const time = entry.time as number | undefined;
      const ts = time ? new Date(time).toISOString() : '';

      if (type === 'metadata' && !cwd) {
        const payload = entry as Record<string, unknown>;
        if (payload.cwd) cwd = payload.cwd as string;
      }

      if (type === 'turn.prompt') {
        const input = entry.input as { type?: string; text?: string }[] | undefined;
        if (Array.isArray(input)) {
          const text = input
            .filter((i) => i.type === 'text')
            .map((i) => i.text ?? '')
            .join('\n');
          if (text.trim()) {
            messages.push({
              uuid: `kimi-user-${messages.length}`,
              type: 'user',
              text: text.trim(),
              timestamp: ts,
            });
          }
        }
      }

      if (type === 'context.append_message') {
        const message = entry.message as { role?: string; content?: unknown } | undefined;
        if (message?.role === 'assistant' && message?.content) {
          const text = parseTextContent(message.content);
          if (text.trim()) {
            messages.push({
              uuid: `kimi-asst-${messages.length}`,
              type: 'assistant',
              text: text.trim(),
              timestamp: ts,
            });
          }
        }
      }
    }

    return { messages, sessionId, provider: 'kimi', cwd, gitBranch: '' };
  }

  return null;
}

// ─── Cursor ─────────────────────────────────────────────────────────

function getCursorSessions(): ProviderSession[] {
  if (!fs.existsSync(CURSOR_DB_PATH)) return [];

  const sessions: ProviderSession[] = [];

  try {
    // Dynamic import to avoid hard dependency on better-sqlite3
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3');
    const db = new Database(CURSOR_DB_PATH, { readonly: true });

    const rows = db.prepare(`
      SELECT conversationId, title, tldr, overview, model, timestamp
      FROM conversation_summaries
      ORDER BY timestamp DESC
    `).all() as {
      conversationId: string;
      title: string | null;
      tldr: string | null;
      overview: string | null;
      model: string | null;
      timestamp: number | null;
    }[];

    for (const row of rows) {
      const preview = row.title || row.tldr || row.overview || '';
      const ts = row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString();

      sessions.push({
        sessionId: row.conversationId,
        provider: 'cursor',
        preview: preview.slice(0, 200).trim(),
        createdAt: ts,
        updatedAt: ts,
        cwd: '',
        messageCount: 1,
        model: row.model || 'cursor',
      });
    }

    db.close();
  } catch { /* SQLite not available or DB locked */ }

  return sessions;
}

function getCursorSessionMessages(sessionId: string): ProviderSessionDetail | null {
  if (!fs.existsSync(CURSOR_DB_PATH)) return null;

  try {
    const Database = require('better-sqlite3');
    const db = new Database(CURSOR_DB_PATH, { readonly: true });

    const row = db.prepare(`
      SELECT conversationId, title, tldr, overview, summaryBullets, model
      FROM conversation_summaries
      WHERE conversationId = ?
    `).get(sessionId) as {
      conversationId: string;
      title: string | null;
      tldr: string | null;
      overview: string | null;
      summaryBullets: string | null;
      model: string | null;
    } | undefined;

    db.close();

    if (!row) return null;

    // Cursor doesn't store full message history — show what we have
    const messages: ProviderMessage[] = [];

    if (row.title) {
      messages.push({
        uuid: 'cursor-title',
        type: 'user',
        text: row.title,
        timestamp: '',
      });
    }

    const summaryParts: string[] = [];
    if (row.tldr) summaryParts.push(`**TL;DR:** ${row.tldr}`);
    if (row.overview) summaryParts.push(row.overview);
    if (row.summaryBullets) {
      try {
        const bullets = JSON.parse(row.summaryBullets);
        if (Array.isArray(bullets)) {
          summaryParts.push(bullets.map((b: string) => `• ${b}`).join('\n'));
        }
      } catch {
        summaryParts.push(row.summaryBullets);
      }
    }

    if (summaryParts.length > 0) {
      messages.push({
        uuid: 'cursor-summary',
        type: 'assistant',
        text: summaryParts.join('\n\n'),
        timestamp: '',
      });
    }

    return {
      messages,
      sessionId,
      provider: 'cursor',
      cwd: '',
      gitBranch: '',
      model: row.model || 'cursor',
    };
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────

const PROVIDER_NAMES: Record<CLIProvider, string> = {
  claude: 'Claude Code',
  codex: 'OpenAI Codex',
  kimi: 'Kimi Code',
  cursor: 'Cursor',
};

const PROVIDER_DATA_DIRS: Record<CLIProvider, string> = {
  claude: CLAUDE_DIR,
  codex: CODEX_DIR,
  kimi: KIMI_DIR,
  cursor: CURSOR_DIR,
};

export function listProviders(): ProviderInfo[] {
  const providers: ProviderInfo[] = [];

  for (const id of ['claude', 'codex', 'kimi', 'cursor'] as CLIProvider[]) {
    const dataDir = PROVIDER_DATA_DIRS[id];
    const available = fs.existsSync(dataDir);

    let sessionCount = 0;
    if (available) {
      try {
        switch (id) {
          case 'claude': sessionCount = getClaudeSessions().length; break;
          case 'codex': sessionCount = getCodexSessions().length; break;
          case 'kimi': sessionCount = getKimiSessions().length; break;
          case 'cursor': sessionCount = getCursorSessions().length; break;
        }
      } catch { /* count stays 0 */ }
    }

    providers.push({
      id,
      name: PROVIDER_NAMES[id],
      available,
      sessionCount,
      dataDir,
    });
  }

  return providers;
}

// Cache to avoid re-reading everything on every request
let sessionCache: { sessions: ProviderSession[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 10_000; // 10 seconds

function getAllSessionsCached(): ProviderSession[] {
  const now = Date.now();
  if (sessionCache && now - sessionCache.timestamp < CACHE_TTL_MS) {
    return sessionCache.sessions;
  }

  const sessions: ProviderSession[] = [];

  try { sessions.push(...getClaudeSessions()); } catch { /* skip */ }
  try { sessions.push(...getCodexSessions()); } catch { /* skip */ }
  try { sessions.push(...getKimiSessions()); } catch { /* skip */ }
  try { sessions.push(...getCursorSessions()); } catch { /* skip */ }

  // Sort by most recent first
  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  sessionCache = { sessions, timestamp: now };
  return sessions;
}

export function listAllSessions(provider?: CLIProvider, limit = 100): ProviderSession[] {
  let sessions = getAllSessionsCached();

  if (provider) {
    sessions = sessions.filter((s) => s.provider === provider);
  }

  return sessions.slice(0, limit);
}

export function getSessionDetail(provider: CLIProvider, sessionId: string, projectDir?: string): ProviderSessionDetail | null {
  switch (provider) {
    case 'claude': return getClaudeSessionMessages(sessionId, projectDir);
    case 'codex': return getCodexSessionMessages(sessionId);
    case 'kimi': return getKimiSessionMessages(sessionId);
    case 'cursor': return getCursorSessionMessages(sessionId);
    default: return null;
  }
}

export function searchAllSessions(query: string, provider?: CLIProvider): ProviderSession[] {
  const q = query.toLowerCase();
  let sessions = getAllSessionsCached();

  if (provider) {
    sessions = sessions.filter((s) => s.provider === provider);
  }

  return sessions.filter((s) =>
    s.preview.toLowerCase().includes(q) ||
    s.cwd.toLowerCase().includes(q) ||
    s.sessionId.toLowerCase().includes(q)
  );
}

export function invalidateSessionCache(): void {
  sessionCache = null;
}
