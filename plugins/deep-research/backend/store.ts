/**
 * Deep Research Store — FileStore-backed research sessions with
 * CRUD endpoints plus custom routes for starting research, viewing
 * reports, and getting session stats.
 */

import path from 'path';
import { FileStore } from '../../../backend/src/lib/file-store.js';
import { createFileStoreRouter } from '../../../backend/src/lib/file-store-router.js';
import { DEVBOT_PROJECTS_DIR } from '../../../backend/src/lib/env.js';
import { Router } from 'express';
import {
  executeResearch,
  type ResearchSession,
  type SessionUpdater,
} from './research-engine.js';

export type { ResearchSession } from './research-engine.js';

// ---------------------------------------------------------------------------
// Store instance
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(DEVBOT_PROJECTS_DIR, '.data', 'file-stores');

export const deepResearchStore = new FileStore<ResearchSession>({
  filePath: path.join(DATA_DIR, 'deep-research.json'),
  name: 'deep-research',
  autoCommit: false,
  commitPrefix: 'data',
});

// ---------------------------------------------------------------------------
// CRUD router
// ---------------------------------------------------------------------------

const crudRouter = createFileStoreRouter(deepResearchStore, {
  requiredFields: ['topic'],
  beforeCreate: (data) => ({
    ...data,
    description: data.description ?? '',
    strategy: data.strategy ?? 'breadth',
    status: 'queued' as const,
    queries: [],
    sources: [],
    report: '',
    error: '',
    started_at: '',
    completed_at: '',
    duration_ms: 0,
    stats: { total_sources: 0, sources_analyzed: 0, queries_executed: 0 },
  }),
});

// ---------------------------------------------------------------------------
// In-flight tracking — prevents duplicate runs
// ---------------------------------------------------------------------------

const activeResearch = new Set<string>();

// ---------------------------------------------------------------------------
// Session updater — writes partial updates to the store
// ---------------------------------------------------------------------------

const updateSession: SessionUpdater = async (id, updates) => {
  const current = await deepResearchStore.get(id);
  if (!current) return;
  await deepResearchStore.update(id, { ...current, ...updates, updated_by: 'research-engine' });
};

// ---------------------------------------------------------------------------
// Custom routes
// ---------------------------------------------------------------------------

function customRouter(): Router {
  const router = Router();

  // POST /start/:id — kick off research for a queued session
  router.post('/start/:id', async (req, res) => {
    try {
      const session = await deepResearchStore.get(req.params.id);
      if (!session) {
        res.status(404).json({ error: 'Research session not found' });
        return;
      }

      if (session.status !== 'queued' && session.status !== 'failed') {
        res.status(400).json({
          error: `Cannot start research — session is "${session.status}". Only queued or failed sessions can be started.`,
        });
        return;
      }

      if (activeResearch.has(session.id)) {
        res.status(409).json({ error: 'Research is already running for this session' });
        return;
      }

      // Reset failed session state
      if (session.status === 'failed') {
        await deepResearchStore.update(session.id, {
          ...session,
          status: 'queued',
          error: '',
          sources: [],
          queries: [],
          report: '',
          stats: { total_sources: 0, sources_analyzed: 0, queries_executed: 0 },
          updated_by: 'user',
        });
      }

      // Start research in the background
      activeResearch.add(session.id);

      const freshSession = (await deepResearchStore.get(session.id))!;
      executeResearch(freshSession, updateSession).finally(() => {
        activeResearch.delete(session.id);
      });

      res.json({ started: true, id: session.id });
    } catch (err) {
      res.status(500).json({ error: 'Failed to start research', detail: String(err) });
    }
  });

  // POST /quick — create + immediately start a research session
  router.post('/quick', async (req, res) => {
    try {
      const { topic, description, strategy } = req.body as {
        topic?: string;
        description?: string;
        strategy?: 'breadth' | 'depth';
      };

      if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        res.status(400).json({ error: 'topic is required' });
        return;
      }

      const session = await deepResearchStore.create({
        topic: topic.trim(),
        description: description?.trim() ?? '',
        strategy: strategy ?? 'breadth',
        status: 'queued',
        queries: [],
        sources: [],
        report: '',
        error: '',
        started_at: '',
        completed_at: '',
        duration_ms: 0,
        stats: { total_sources: 0, sources_analyzed: 0, queries_executed: 0 },
        created_by: 'user',
        updated_by: 'user',
        settings: {},
      } as Omit<ResearchSession, 'id' | 'created_at' | 'updated_at'>);

      // Start immediately
      activeResearch.add(session.id);
      executeResearch(session, updateSession).finally(() => {
        activeResearch.delete(session.id);
      });

      res.status(201).json(session);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create research session', detail: String(err) });
    }
  });

  // GET /report/:id — get just the report markdown
  router.get('/report/:id', async (req, res) => {
    try {
      const session = await deepResearchStore.get(req.params.id);
      if (!session) {
        res.status(404).json({ error: 'Research session not found' });
        return;
      }

      if (!session.report) {
        res.status(404).json({ error: 'No report available yet', status: session.status });
        return;
      }

      const format = req.query.format;
      if (format === 'raw') {
        res.setHeader('Content-Type', 'text/markdown');
        res.send(session.report);
        return;
      }

      res.json({
        id: session.id,
        topic: session.topic,
        status: session.status,
        report: session.report,
        sources: session.sources.filter((s) => s.used_in_report),
        stats: session.stats,
        completed_at: session.completed_at,
        duration_ms: session.duration_ms,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get report', detail: String(err) });
    }
  });

  // GET /stats — aggregate stats across all research sessions
  router.get('/stats/summary', async (_req, res) => {
    try {
      const sessions = await deepResearchStore.list();
      const completed = sessions.filter((s) => s.status === 'completed');
      const totalSources = completed.reduce((sum, s) => sum + s.stats.total_sources, 0);
      const totalQueries = completed.reduce((sum, s) => sum + s.stats.queries_executed, 0);
      const avgDuration =
        completed.length > 0
          ? Math.round(completed.reduce((sum, s) => sum + s.duration_ms, 0) / completed.length)
          : 0;

      res.json({
        totalSessions: sessions.length,
        completed: completed.length,
        inProgress: sessions.filter((s) => s.status === 'researching' || s.status === 'compiling')
          .length,
        failed: sessions.filter((s) => s.status === 'failed').length,
        queued: sessions.filter((s) => s.status === 'queued').length,
        totalSources,
        totalQueries,
        avgDurationMs: avgDuration,
      });
    } catch (err) {
      res.status(500).json({ error: 'Stats failed', detail: String(err) });
    }
  });

  // POST /cancel/:id — cancel an in-progress research session
  router.post('/cancel/:id', async (req, res) => {
    try {
      const session = await deepResearchStore.get(req.params.id);
      if (!session) {
        res.status(404).json({ error: 'Research session not found' });
        return;
      }

      if (session.status !== 'researching' && session.status !== 'compiling') {
        res.status(400).json({ error: `Cannot cancel — session is "${session.status}"` });
        return;
      }

      // Note: this doesn't actually stop the background fetch/compile process,
      // but marks the session as failed so no further updates are written.
      activeResearch.delete(session.id);
      await deepResearchStore.update(session.id, {
        ...session,
        status: 'failed',
        error: 'Cancelled by user',
        completed_at: new Date().toISOString(),
        updated_by: 'user',
      });

      res.json({ cancelled: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to cancel', detail: String(err) });
    }
  });

  // GET /active — list currently running research session IDs
  router.get('/active', (_req, res) => {
    res.json({ active: Array.from(activeResearch) });
  });

  return router;
}

// ---------------------------------------------------------------------------
// Combined router
// ---------------------------------------------------------------------------

export function getDeepResearchRouter(): Router {
  const router = Router();
  router.use('/', customRouter());
  router.use('/', crudRouter);
  return router;
}
