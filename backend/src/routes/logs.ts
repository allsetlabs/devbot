import { Router } from 'express';
import { readFile, stat, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { asyncHandler, sendBadRequest } from '../lib/route-helpers.js';

const router = Router();

const LOG_DIR = resolve(import.meta.dirname, '../../../logs');

const LOG_FILES: Record<string, string> = {
  frontend: resolve(LOG_DIR, 'frontend.log'),
  backend: resolve(LOG_DIR, 'backend.log'),
};

// GET /api/logs?source=frontend|backend&lines=200
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const source = (req.query.source as string) || 'backend';
    const lines = Math.min(parseInt(req.query.lines as string, 10) || 200, 5000);

    const logFile = LOG_FILES[source];
    if (!logFile) {
      sendBadRequest(res, `Invalid source. Use: ${Object.keys(LOG_FILES).join(', ')}`);
      return;
    }

    // Check if file exists
    try {
      await stat(logFile);
    } catch {
      res.json({ source, lines: 0, content: '', lastModified: null });
      return;
    }

    const content = await readFile(logFile, 'utf-8');
    const allLines = content.split('\n');
    const tailLines = allLines.slice(-lines).join('\n');

    const fileStat = await stat(logFile);

    res.json({
      source,
      lines: Math.min(allLines.length, lines),
      totalLines: allLines.length,
      content: tailLines,
      lastModified: fileStat.mtime.toISOString(),
    });
  }, 'read logs')
);

// DELETE /api/logs?source=frontend|backend - Clear log file
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const source = (req.query.source as string) || '';
    const logFile = LOG_FILES[source];
    if (!logFile) {
      sendBadRequest(res, `Invalid source. Use: ${Object.keys(LOG_FILES).join(', ')}`);
      return;
    }

    await writeFile(logFile, '');
    res.json({ success: true, source });
  }, 'clear logs')
);

export const logsRouter = router;
