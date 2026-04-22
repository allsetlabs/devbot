import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import https from 'https';
import { execSync } from 'child_process';
import fs from 'fs';
import { loadDevCert } from './lib/https-cert.js';
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
import { companiesRouter } from './routes/companies.js';
import { mcpServersRouter } from './routes/mcp-servers.js';
import { hooksRouter } from './routes/hooks.js';
import { keybindingsRouter } from './routes/keybindings.js';
import { gitStatusRouter } from './routes/git-status.js';
import { memoriesRouter } from './routes/memories.js';
import { claudeMdRouter } from './routes/claude-md.js';
import { worktreesRouter } from './routes/worktrees.js';
import { seedSystemSchedulers } from './lib/schedulers-seed.js';
import { getBabyLogsRouter } from '@devbot/plugin-baby-logs/backend/routes.js';
import { getLawnCareRouter } from '@devbot/plugin-lawn-care/backend/routes.js';
import type { LawnProfile } from '@devbot/plugin-lawn-care/backend/schema.js';
import { spawnClaudeStructured, getActiveSessionCount } from './lib/claude-spawn.js';
import type { LawnPlanData } from '@devbot/plugin-lawn-care/backend/types.js';
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

import { BACKEND_PORT, BACKEND_HOST, API_KEY, DEVBOT_PROJECTS_DIR } from './lib/env.js';

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
    activeSessions: getActiveSessionCount(),
    defaultWorkingDirectory: DEVBOT_PROJECTS_DIR,
  });
});

// Doctor — comprehensive backend diagnostics
app.get('/api/doctor', (_req, res) => {
  const checks: Record<string, { status: 'pass' | 'warn' | 'fail'; label: string; value?: string; detail?: string }> = {};

  // Backend status
  const uptime = Math.floor(process.uptime());
  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const s = uptime % 60;
  const uptimeStr = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  checks.backend = { status: 'pass', label: 'Backend', value: 'Running', detail: `Uptime ${uptimeStr}` };

  // Claude CLI version
  try {
    const version = execSync('claude --version', { timeout: 3000, encoding: 'utf8' }).trim().split('\n')[0];
    checks.claudeCLI = { status: 'pass', label: 'Claude CLI', value: version };
  } catch {
    checks.claudeCLI = { status: 'fail', label: 'Claude CLI', value: 'Not found', detail: 'claude CLI is not installed or not in PATH' };
  }

  // Active sessions
  const sessions = getActiveSessionCount();
  checks.activeSessions = { status: 'pass', label: 'Active Sessions', value: String(sessions) };

  // Working directory
  try {
    const exists = fs.existsSync(DEVBOT_PROJECTS_DIR);
    checks.workingDirectory = {
      status: exists ? 'pass' : 'warn',
      label: 'Working Directory',
      value: exists ? 'Exists' : 'Missing',
      detail: DEVBOT_PROJECTS_DIR,
    };
  } catch {
    checks.workingDirectory = { status: 'fail', label: 'Working Directory', value: 'Error', detail: DEVBOT_PROJECTS_DIR };
  }

  // Disk space
  try {
    const dfOut = execSync(`df -k "${DEVBOT_PROJECTS_DIR}" 2>/dev/null || df -k /`, { timeout: 3000, encoding: 'utf8' });
    const lines = dfOut.trim().split('\n');
    const parts = lines[lines.length - 1].trim().split(/\s+/);
    const totalKb = parseInt(parts[1], 10);
    const usedKb = parseInt(parts[2], 10);
    const pctStr = parts[4] || '';
    const pct = parseInt(pctStr, 10) || 0;
    const freeGb = ((totalKb - usedKb) / 1024 / 1024).toFixed(1);
    const totalGb = (totalKb / 1024 / 1024).toFixed(1);
    checks.diskSpace = {
      status: pct >= 90 ? 'fail' : pct >= 80 ? 'warn' : 'pass',
      label: 'Disk Space',
      value: `${freeGb}GB free / ${totalGb}GB`,
      detail: `${pct}% used`,
    };
  } catch {
    checks.diskSpace = { status: 'warn', label: 'Disk Space', value: 'Unknown' };
  }

  // Memory usage
  const mem = process.memoryUsage();
  const rss = (mem.rss / 1024 / 1024).toFixed(0);
  const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(0);
  const heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(0);
  const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  checks.memory = {
    status: heapPct >= 90 ? 'fail' : heapPct >= 70 ? 'warn' : 'pass',
    label: 'Memory',
    value: `${rss}MB RSS`,
    detail: `Heap: ${heapUsed}/${heapTotal}MB (${heapPct}%)`,
  };

  res.json({ checks, timestamp: new Date().toISOString() });
});

// Serve uploaded files (photos, documents, etc.)
const uploadsDir = path.join(
  DEVBOT_PROJECTS_DIR,
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
app.use('/api/companies', companiesRouter);
app.use('/api/mcp-servers', mcpServersRouter);
app.use('/api/hooks', hooksRouter);
app.use('/api/keybindings', keybindingsRouter);
app.use('/api/git-status', gitStatusRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/claude-md', claudeMdRouter);
app.use('/api/worktrees', worktreesRouter);

// Plugin routes
app.use('/api/plugins/baby-logs', getBabyLogsRouter());
app.use('/api/plugins/lawn-care', getLawnCareRouter({
  generatePlan: async (_planId: string, profile: LawnProfile) => {
    const addressParts = [profile.address, profile.city, profile.state, profile.zipCode].filter(Boolean);
    const prompt = `You are a lawn care expert. Create a detailed annual lawn care plan for this property:

Address: ${addressParts.join(', ')}
Grass Type: ${profile.grassType}
${profile.sqft ? `Lawn Size: ${profile.sqft} sq ft` : ''}
${profile.applicationMethod ? `Application Method: ${profile.applicationMethod}` : ''}
${profile.equipmentModel ? `Equipment: ${profile.equipmentModel}` : ''}
${profile.sunExposure ? `Sun Exposure: ${profile.sunExposure.replace(/_/g, ' ')}` : ''}
${profile.notes ? `Special Notes: ${profile.notes}` : ''}

Research the USDA climate zone for this zip code. Create a seasonal plan with 3-5 applications per year. For each application, recommend specific products available at Home Depot or Lowe's with real prices. Include spreader/sprayer settings specific to their equipment model. Calculate the per-application cost (product price divided by number of applications the bag covers for their lawn size).`;

    const schema = {
      name: 'lawn_care_plan',
      schema: {
        type: 'object',
        required: ['summary', 'totalCost', 'store', 'applications'],
        properties: {
          summary: { type: 'string', description: 'Brief 1-2 sentence plan summary' },
          totalCost: { type: 'number', description: 'Total annual cost' },
          store: { type: 'string', description: 'Primary store for products' },
          applications: {
            type: 'array',
            items: {
              type: 'object',
              required: ['order', 'date', 'name', 'description', 'product', 'amount', 'howToApply', 'applicationCost'],
              properties: {
                order: { type: 'number' },
                date: { type: 'string', description: 'Date range like "Feb 28 – Mar 15"' },
                name: { type: 'string', description: 'Short name like "Pre-Emergent + Fertilizer"' },
                description: { type: 'string', description: 'Purpose of this application' },
                product: { type: 'string', description: 'Specific product name' },
                productUrl: { type: 'string', description: 'URL to product page' },
                store: { type: 'string', description: 'Store name' },
                productCovers: { type: 'number', description: 'Number of applications one bag covers for this lawn size' },
                productPrice: { type: 'number', description: 'Full bag price' },
                applicationCost: { type: 'number', description: 'Cost per application' },
                howToApply: { type: 'string', description: 'Spreader/sprayer setting' },
                walkingPace: { type: 'string' },
                overlap: { type: 'string' },
                amount: { type: 'string', description: 'Amount to apply' },
                tips: { type: 'string' },
                watering: { type: 'string', description: 'Watering instructions after application' },
                warnings: { type: 'string', description: 'Important warnings' },
              },
            },
          },
        },
      },
    };

    return spawnClaudeStructured<LawnPlanData>({
      prompt,
      model: 'sonnet',
      outputSchema: schema,
      timeoutMs: 120_000,
      maxTurns: 3,
    });
  },
}));

// Start server (HTTPS if dev cert is present, otherwise plain HTTP)
const devCert = loadDevCert();
const httpServer = devCert
  ? https.createServer(devCert, app)
  : http.createServer(app);
const scheme = devCert ? 'https' : 'http';

const server = httpServer.listen(PORT, HOST, async () => {
  console.log(`DevBot backend running at ${scheme}://${HOST}:${PORT}`);
  console.log(`Health check: ${scheme}://${HOST}:${PORT}/health`);
  if (!API_KEY) {
    console.warn('Warning: No API_KEY set. API authentication is disabled.');
  }

  // Initialize databases
  await initializeCoreDatabase();

  // Seed default working directories
  await seedDefaultWorkingDirectories();

  // Seed built-in system schedulers
  await seedSystemSchedulers();

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
// on file changes, causing the new instance to fail with EADDRINUSE.
// server.close() alone waits for in-flight connections to drain, but xterm
// WebSockets and long-lived Claude workers never close on their own, so we
// must forcibly drop connections and hard-exit on a timeout.
let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;

  const forceExit = setTimeout(() => {
    console.warn('[shutdown] forcing exit after 3s timeout');
    process.exit(1);
  }, 3000);
  forceExit.unref();

  server.close(() => {
    clearTimeout(forceExit);
    process.exit(0);
  });
  server.closeAllConnections?.();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

