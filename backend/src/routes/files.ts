import { Router } from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { CLAUDE_WORK_DIR } from '../lib/env.js';

export const filesRouter = Router();

interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

const CACHE_TTL_MS = 10_000;

const dirCache = new Map<string, { files: FileItem[]; timestamp: number }>();

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.cache']);

function listFilesRecursive(baseDir: string, currentDir: string, maxDepth: number): string[] {
  if (maxDepth <= 0) return [];
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      if (entry.isFile()) {
        results.push(relativePath);
      } else if (entry.isDirectory()) {
        results.push(...listFilesRecursive(baseDir, fullPath, maxDepth - 1));
      }
    }
  } catch {
    // Permission errors, etc.
  }
  return results;
}

function getTrackedFiles(workDir: string): FileItem[] {
  const now = Date.now();
  const cached = dirCache.get(workDir);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.files;
  }

  const run = (cmd: string): string[] => {
    try {
      return execSync(cmd, { cwd: workDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  // Check if this is a git repo
  const isGitRepo = run('git rev-parse --is-inside-work-tree')[0] === 'true';

  let allFilePaths: string[];
  if (isGitRepo) {
    const tracked = run('git ls-files');
    const untracked = run('git ls-files --others --exclude-standard');
    allFilePaths = Array.from(new Set([...tracked, ...untracked]));
  } else {
    // Non-git directory: list files recursively (max depth 4, skip hidden/node_modules)
    allFilePaths = listFilesRecursive(workDir, workDir, 4);
  }

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

  const files = [...fileItems, ...dirItems];
  dirCache.set(workDir, { files, timestamp: now });
  return files;
}

function scoreItem(item: FileItem, segments: string[]): number {
  const itemSegments = item.path.toLowerCase().split('/');
  let exactMatches = 0;
  for (const seg of segments) {
    if (itemSegments.some((s) => s === seg)) exactMatches++;
  }
  return exactMatches;
}

// GET /api/files/browse?q=search&offset=0&limit=50&workingDir=/path — list git-tracked files in working directory
filesRouter.get('/browse', (req, res) => {
  try {
    const query = ((req.query.q as string) || '').toLowerCase().trim();
    const offset = Math.max(0, parseInt((req.query.offset as string) || '0', 10) || 0);
    const limit = Math.max(1, parseInt((req.query.limit as string) || '50', 10) || 50);
    const workDir = (req.query.workingDir as string) || CLAUDE_WORK_DIR;

    const allFiles = getTrackedFiles(workDir);

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
