import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeCoreDatabase } from './lib/db/init-core.js';
import { sessionsRouter } from './routes/sessions.js';
import { uploadRouter } from './routes/upload.js';
import { schedulersRouter } from './routes/schedulers.js';
import { interactiveChatRouter } from './routes/interactive-chat.js';
import { birthTimesRouter } from './routes/birth-times.js';
import { plansRouter } from './routes/plans.js';
import { logsRouter } from './routes/logs.js';
import { remotionVideosRouter } from './routes/remotion-videos.js';
import { weatherRouter } from './routes/weather.js';
import { commandsRouter } from './routes/commands.js';
import { filesRouter } from './routes/files.js';
import { workingDirectoriesRouter, seedDefaultWorkingDirectories } from './routes/working-directories.js';
import { getBabyLogsRouter } from '@devbot/plugin-baby-logs';
import { getLawnCareRouter } from '@devbot/plugin-lawn-care';
import { startSchedulerWorker, getRunningTasks } from './lib/scheduler-worker.js';

import {
  recoverSessions,
  recoverInteractiveChats,
  recoverTaskRuns,
} from './lib/session-recovery.js';

// Unset CLAUDECODE so child processes (Claude Code sessions, schedulers) can spawn without
// "cannot be launched inside another Claude Code session" errors
delete process.env.CLAUDECODE;

const app = express();

import { BACKEND_PORT, BACKEND_HOST, API_KEY, CLAUDE_WORK_DIR } from './lib/env.js';

const PORT = BACKEND_PORT;
const HOST = BACKEND_HOST;

// Middleware
app.use(cors());
app.use(express.json());

// API Key authentication middleware
app.use('/api', (req, res, next) => {
  const providedKey = req.headers['x-api-key'] || req.query.key;

  if (API_KEY && providedKey !== API_KEY) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid API key' });
    return;
  }

  next();
});

// Health check
app.get('/health', (_req, res) => {
  const uptime = process.uptime();
  res.json({
    status: 'ok',
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    runningScheduledTasks: getRunningTasks().length,
  });
});

// Serve uploaded files (photos, documents, etc.)
const uploadsDir = path.join(
  CLAUDE_WORK_DIR,
  '.tmp',
  'devbot-uploads'
);
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/schedulers', schedulersRouter);
app.use('/api/interactive-chats', interactiveChatRouter);
app.use('/api/birth-times', birthTimesRouter);
app.use('/api/plans', plansRouter);
app.use('/api/logs', logsRouter);
app.use('/api/remotion-videos', remotionVideosRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/commands', commandsRouter);
app.use('/api/files', filesRouter);
app.use('/api/working-directories', workingDirectoriesRouter);

// Plugin routes
app.use('/api/plugins/baby-logs', getBabyLogsRouter());
app.use('/api/plugins/lawn-care', getLawnCareRouter());

// Start server
const server = app.listen(PORT, HOST, async () => {
  console.log(`DevBot backend running at http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  if (!API_KEY) {
    console.warn('Warning: No API_KEY set. API authentication is disabled.');
  }

  // Initialize databases
  await initializeCoreDatabase();

  // Seed default working directories
  await seedDefaultWorkingDirectories();

  // Recover existing sessions (restart WebSocket servers for active tmux sessions)
  await recoverSessions();

  // Recover interrupted interactive chats and orphaned task runs
  await recoverInteractiveChats();
  await recoverTaskRuns();

  // Start the scheduler worker
  startSchedulerWorker().catch((err) => {
    console.error('Failed to start scheduler worker:', err);
  });
});

// Graceful shutdown — required for vite-node --watch hot reload.
// Without this, the old process holds port 3100 when vite-node restarts
// on file changes, causing the new instance to fail silently.
const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
