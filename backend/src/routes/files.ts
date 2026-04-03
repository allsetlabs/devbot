import { Router } from 'express';
import { execSync } from 'child_process';
import path from 'path';

export const filesRouter = Router();

interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

const PROJECT_ROOT = process.env.CLAUDE_WORK_DIR ?? path.resolve(process.cwd(), '../../..');

let cachedFiles: FileItem[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10_000;

function getTrackedFiles(): FileItem[] {
  const now = Date.now();
  if (cachedFiles && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedFiles;
  }

  const run = (cmd: string): string[] => {
    try {
      return execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  const tracked = run('git ls-files');
  const untracked = run('git ls-files --others --exclude-standard');
  const allFilePaths = Array.from(new Set([...tracked, ...untracked]));

  const fileItems: FileItem[] = allFilePaths.map((relativePath) => ({
    id: relativePath,
    name: path.basename(relativePath),
    path: relativePath,
    type: 'file' as const,
  }));

  const dirSet = new Set<string>();
  for (const relativePath of allFilePaths) {
    let dir = path.dirname(relativePath);
    while (dir && dir !== '.') {
      dirSet.add(dir);
      dir = path.dirname(dir);
    }
  }

  const dirItems: FileItem[] = Array.from(dirSet).map((relativePath) => ({
    id: relativePath,
    name: path.basename(relativePath),
    path: relativePath,
    type: 'directory' as const,
  }));

  cachedFiles = [...fileItems, ...dirItems];
  cacheTimestamp = now;
  return cachedFiles;
}

function scoreItem(item: FileItem, segments: string[]): number {
  const itemSegments = item.path.toLowerCase().split('/');
  let exactMatches = 0;
  for (const seg of segments) {
    if (itemSegments.some((s) => s === seg)) exactMatches++;
  }
  return exactMatches;
}

// GET /api/files/browse?q=search&offset=0&limit=50 — list git-tracked files in project directory
filesRouter.get('/browse', (req, res) => {
  try {
    const query = ((req.query.q as string) || '').toLowerCase().trim();
    const offset = Math.max(0, parseInt((req.query.offset as string) || '0', 10) || 0);
    const limit = Math.max(1, parseInt((req.query.limit as string) || '50', 10) || 50);

    const allFiles = getTrackedFiles();

    let results: FileItem[];

    if (query) {
      const segments = query.split('/').filter(Boolean);
      results = allFiles.filter((f) => {
        const lowerPath = f.path.toLowerCase();
        return segments.every((seg) => lowerPath.includes(seg));
      });

      const lowerQuery = query.toLowerCase();
      results = results.sort((a, b) => {
        // Exact path match ranks first
        const aExact = a.path.toLowerCase() === lowerQuery ? 1 : 0;
        const bExact = b.path.toLowerCase() === lowerQuery ? 1 : 0;
        if (bExact !== aExact) return bExact - aExact;
        // Directories before files (directories are navigable targets)
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        const scoreA = scoreItem(a, segments);
        const scoreB = scoreItem(b, segments);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.path.localeCompare(b.path);
      });
    } else {
      results = [...allFiles].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.path.localeCompare(b.path);
      });
    }

    const total = results.length;
    const items = results.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    res.json({ items, total, hasMore });
  } catch (err) {
    console.error('Error browsing files:', err);
    res.status(500).json({ error: 'Failed to browse files' });
  }
});
