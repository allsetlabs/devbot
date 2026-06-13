import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { coreDb, working_directories } from '../lib/db/core.js';
import { asyncHandler, sendBadRequest, generateId } from '../lib/route-helpers.js';
import { DEVBOT_PROJECTS_DIR } from '../lib/env.js';

const router = Router();

interface WorkingDirectory {
  id: string;
  path: string;
  label: string | null;
  source: 'env' | 'auto' | 'user';
  isDefault: boolean;
  isRootDirectory: boolean;
  createdAt: string;
}

type WorkingDirectoryRow = typeof working_directories.$inferSelect;

/**
 * The repo root `make start` runs from (one directory above the backend's CWD).
 * A directory matching this path is flagged as the root directory.
 */
function getRootDirectory(): string {
  return path.resolve(process.cwd(), '..');
}

/**
 * The configured projects directory (DEVBOT_PROJECTS_DIR).
 * A directory matching this path is flagged as the default directory.
 */
function getDefaultDirectory(): string {
  return path.resolve(DEVBOT_PROJECTS_DIR);
}

function rowToWorkingDir(
  row: WorkingDirectoryRow,
  rootDir: string,
  defaultDir: string
): WorkingDirectory {
  return {
    id: row.id,
    path: row.path,
    label: row.label,
    source: row.source,
    isDefault: row.path === defaultDir,
    isRootDirectory: row.path === rootDir,
    createdAt: row.created_at,
  };
}

// List all working directories
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb.select().from(working_directories).all();
    const rootDir = getRootDirectory();
    const defaultDir = getDefaultDirectory();
    res.json(rows.map((row) => rowToWorkingDir(row, rootDir, defaultDir)));
  }, 'list working directories')
);

// Validate a directory path exists
router.post(
  '/validate',
  asyncHandler(async (req, res) => {
    const dirPath = req.body?.path;
    if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
      sendBadRequest(res, 'path is required');
      return;
    }

    const resolved = resolvePath(dirPath.trim());
    const exists = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory();
    res.json({ valid: exists, resolvedPath: resolved });
  }, 'validate directory')
);

// Create a new working directory (validates existence first)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const dirPath = req.body?.path;
    const label = req.body?.label || null;

    if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
      sendBadRequest(res, 'path is required');
      return;
    }

    const resolved = resolvePath(dirPath.trim());

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      sendBadRequest(res, `Directory does not exist: ${resolved}`);
      return;
    }

    const rootDir = getRootDirectory();
    const defaultDir = getDefaultDirectory();

    // Check if already exists
    const existing = await coreDb
      .select()
      .from(working_directories)
      .where(eq(working_directories.path, resolved))
      .get();

    if (existing) {
      res.json(rowToWorkingDir(existing, rootDir, defaultDir));
      return;
    }

    const result = await coreDb
      .insert(working_directories)
      .values({
        id: generateId(),
        path: resolved,
        label: label && typeof label === 'string' ? label.trim() : null,
        source: 'user',
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    res.status(201).json(rowToWorkingDir(result[0], rootDir, defaultDir));
  }, 'create working directory')
);

// Delete a working directory (blocks the default/root directories)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await coreDb
      .select()
      .from(working_directories)
      .where(eq(working_directories.id, req.params.id))
      .get();

    if (!row) {
      res.json({ success: true });
      return;
    }

    if (row.path === getDefaultDirectory() || row.path === getRootDirectory()) {
      sendBadRequest(res, 'Cannot delete a default directory');
      return;
    }

    await coreDb.delete(working_directories).where(eq(working_directories.id, req.params.id));
    res.json({ success: true });
  }, 'delete working directory')
);

/**
 * Resolve ~ and relative paths
 */
function resolvePath(p: string): string {
  if (p.startsWith('~')) {
    const home = process.env.HOME;
    if (!home) {
      throw new Error('HOME environment variable is not set; cannot resolve ~ paths');
    }
    p = path.join(home, p.slice(1));
  }
  return path.resolve(p);
}

/**
 * Seed default working directories on startup.
 * Called once from index.ts after DB init.
 */
export async function seedDefaultWorkingDirectories(): Promise<void> {
  // 1. From .env DEVBOT_PROJECTS_DIR
  await upsertDefault(DEVBOT_PROJECTS_DIR, 'Default (env)', 'env');

  // 2. One directory above backend CWD (the devbot repo root — where `make start` runs)
  const autoDir = getRootDirectory();
  if (fs.existsSync(autoDir) && fs.statSync(autoDir).isDirectory()) {
    await upsertDefault(autoDir, 'Root', 'auto');
  }
}

async function upsertDefault(
  dirPath: string,
  label: string,
  source: 'env' | 'auto'
): Promise<void> {
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) return;

  const existing = await coreDb
    .select()
    .from(working_directories)
    .where(eq(working_directories.path, resolved))
    .get();

  if (!existing) {
    await coreDb.insert(working_directories).values({
      id: generateId(),
      path: resolved,
      label,
      source,
      created_by: 'system',
      updated_by: 'system',
    });
    console.log(`[WorkingDirs] Seeded: ${resolved} (${source})`);
  }
}

export { router as workingDirectoriesRouter };
