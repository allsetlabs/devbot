import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { coreDb, working_directories } from '../lib/db/core.js';
import {
  asyncHandler,
  sendBadRequest,
  generateId,
} from '../lib/route-helpers.js';
import { CLAUDE_WORK_DIR } from '../lib/env.js';

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

interface WorkingDirectorySettings {
  isRootDirectory?: boolean;
}

function rowToWorkingDir(row: WorkingDirectoryRow): WorkingDirectory {
  const settings: WorkingDirectorySettings =
    typeof row.settings === 'object' && row.settings ? (row.settings as WorkingDirectorySettings) : {};
  return {
    id: row.id,
    path: row.path,
    label: row.label,
    source: row.source,
    isDefault: !!row.is_default,
    isRootDirectory: !!settings.isRootDirectory,
    createdAt: row.created_at,
  };
}

// List all working directories
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb.select().from(working_directories).all();
    res.json(rows.map(rowToWorkingDir));
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

    // Check if already exists
    const existing = await coreDb
      .select()
      .from(working_directories)
      .where(eq(working_directories.path, resolved))
      .get();

    if (existing) {
      res.json(rowToWorkingDir(existing));
      return;
    }

    const result = await coreDb
      .insert(working_directories)
      .values({
        id: generateId(),
        path: resolved,
        label: label && typeof label === 'string' ? label.trim() : null,
        source: 'user',
        is_default: false,
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    res.status(201).json(rowToWorkingDir(result[0]));
  }, 'create working directory')
);

// Delete a working directory (blocks default directories)
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

    if (row.is_default) {
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
  // 1. From .env CLAUDE_WORK_DIR
  await upsertDefault(CLAUDE_WORK_DIR, 'Default (env)', 'env', {});

  // 2. One directory above backend CWD (the devbot repo root — where `make start` runs)
  const autoDir = path.resolve(process.cwd(), '..');
  if (fs.existsSync(autoDir) && fs.statSync(autoDir).isDirectory()) {
    await upsertDefault(autoDir, 'Root', 'auto', { isRootDirectory: true });
  }
}

async function upsertDefault(
  dirPath: string,
  label: string,
  source: 'env' | 'auto',
  settings: WorkingDirectorySettings
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
      is_default: true,
      settings,
      created_by: 'system',
      updated_by: 'system',
    });
    console.log(`[WorkingDirs] Seeded: ${resolved} (${source})`);
  } else if (!existing.is_default) {
    // Upgrade existing row to default
    await coreDb
      .update(working_directories)
      .set({ is_default: true, settings, label, source, updated_by: 'system' })
      .where(eq(working_directories.id, existing.id));
    console.log(`[WorkingDirs] Upgraded to default: ${resolved} (${source})`);
  }
}

export { router as workingDirectoriesRouter };
