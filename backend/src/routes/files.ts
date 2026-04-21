import { Router } from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { DEVBOT_PROJECTS_DIR } from '../lib/env.js';

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
    const workDir = (req.query.workingDir as string) || DEVBOT_PROJECTS_DIR;

    const allFiles = getTrackedFiles(workDir);

    let results: FileItem[];

    if (query) {
      const segments = query.split('/').filter(Boolean);
      const normalizeWs = (s: string) => s.replace(/\s+/g, ' ');
      results = allFiles.filter((f) => {
        const lowerPath = normalizeWs(f.path.toLowerCase());
        return segments.every((seg) => lowerPath.includes(normalizeWs(seg)));
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

// GET /api/files/read?path=relative/path&workingDir=/abs/path — read file contents
filesRouter.get('/read', (req, res) => {
  try {
    const filePath = req.query.path as string;
    const workDir = (req.query.workingDir as string) || DEVBOT_PROJECTS_DIR;
    if (!filePath) {
      res.status(400).json({ error: 'path is required' });
      return;
    }
    const absPath = path.resolve(workDir, filePath);
    if (!absPath.startsWith(path.resolve(workDir))) {
      res.status(403).json({ error: 'Path traversal not allowed' });
      return;
    }
    if (!fs.existsSync(absPath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      res.status(400).json({ error: 'Cannot read a directory' });
      return;
    }
    if (stat.size > 1024 * 1024) {
      res.status(413).json({ error: 'File too large (>1MB)' });
      return;
    }
    const content = fs.readFileSync(absPath, 'utf8');
    res.json({ content, size: stat.size, path: filePath });
  } catch (err) {
    console.error('Error reading file:', err);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// PUT /api/files/write — write file contents
filesRouter.put('/write', (req, res) => {
  try {
    const { path: filePath, content, workingDir } = req.body as {
      path: string;
      content: string;
      workingDir?: string;
    };
    const workDir = workingDir || DEVBOT_PROJECTS_DIR;
    if (!filePath || content === undefined) {
      res.status(400).json({ error: 'path and content are required' });
      return;
    }
    const absPath = path.resolve(workDir, filePath);
    if (!absPath.startsWith(path.resolve(workDir))) {
      res.status(403).json({ error: 'Path traversal not allowed' });
      return;
    }
    fs.writeFileSync(absPath, content, 'utf8');
    res.json({ success: true, path: filePath });
  } catch (err) {
    console.error('Error writing file:', err);
    res.status(500).json({ error: 'Failed to write file' });
  }
});
