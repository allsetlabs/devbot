import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { coreDb, sessions } from '../lib/db/core.js';
import { DEVBOT_PROJECTS_DIR } from '../lib/env.js';
import type { SessionRow } from '../lib/db/types.js';
import { createTmuxSession, killTmuxSession, listTmuxSessions } from '../lib/tmux.js';
import { startXtermWs, stopXtermWs, getXtermPort } from '../lib/xterm-ws.js';
import {
  asyncHandler,
  sendNotFound,
  requireString,
  generateId,
  getOneById,
} from '../lib/route-helpers.js';

const router = Router();

interface Session {
  id: string;
  port: number;
  wsUrl: string;
  name: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    port: row.port,
    wsUrl: row.ws_url,
    name: row.name,
    createdAt: row.created_at,
    status: row.status,
  };
}

// List all sessions
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb.select().from(sessions).orderBy(desc(sessions.created_at));

    // Sync with actual tmux sessions
    const tmuxSessions = await listTmuxSessions();
    const activeTmuxIds = new Set(tmuxSessions);

    const sessionsList: Session[] = [];
    for (const row of rows) {
      const tmuxId = `devbot_${row.id}`;
      const status = activeTmuxIds.has(tmuxId) ? 'active' : 'inactive';

      if (status !== row.status) {
        await coreDb.update(sessions).set({ status }).where(eq(sessions.id, row.id));
      }

      sessionsList.push(rowToSession({ ...row, status }));
    }

    res.json(sessionsList);
  }, 'list sessions')
);

// Get single session
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await getOneById(coreDb, sessions, req.params.id, 'Session', res);
    if (!row) return;
    res.json(rowToSession(row));
  }, 'get session')
);

// Create new session
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const id = generateId();
    const tmuxSessionName = `devbot_${id}`;
    const workDir = DEVBOT_PROJECTS_DIR;

    await createTmuxSession(tmuxSessionName, workDir);

    const port = await getXtermPort();
    if (!port) {
      await killTmuxSession(tmuxSessionName);
      res.status(503).json({ error: 'No ports available', message: 'Maximum sessions reached' });
      return;
    }
    await startXtermWs(port, tmuxSessionName);

    const wsUrl = `ws://${req.hostname}:${port}`;
    const result = await coreDb
      .insert(sessions)
      .values({
        id,
        name: 'New Chat',
        port,
        ws_url: wsUrl,
        status: 'active',
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    if (!result || result.length === 0) {
      await stopXtermWs(port);
      await killTmuxSession(tmuxSessionName);
      throw new Error('Failed to insert session');
    }

    res.status(201).json(rowToSession(result[0]));
  }, 'create session')
);

// Delete session
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(sessions)
      .where(eq(sessions.id, req.params.id))
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Session');
      return;
    }

    const row = rows[0];
    const tmuxSessionName = `devbot_${req.params.id}`;

    await stopXtermWs(row.port);

    await killTmuxSession(tmuxSessionName);
    await coreDb.delete(sessions).where(eq(sessions.id, req.params.id));

    res.json({ success: true });
  }, 'delete session')
);

// Rename session
router.post(
  '/:id/rename',
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!requireString(res, name, 'Name')) return;

    const result = await coreDb
      .update(sessions)
      .set({ name: name.trim(), updated_by: 'user' })
      .where(eq(sessions.id, req.params.id))
      .returning();

    if (!result || result.length === 0) {
      sendNotFound(res, 'Session');
      return;
    }

    res.json(rowToSession(result[0]));
  }, 'rename session')
);

export { router as sessionsRouter };
