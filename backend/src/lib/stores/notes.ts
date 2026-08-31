/**
 * Quick Notes Store — another File-Based Backend Framework demo.
 *
 * Simple notes with title + content + optional tags. Shows how a second
 * store can be created with just ~30 lines of code.
 */

import path from 'path';
import { FileStore } from '../file-store.js';
import { createFileStoreRouter } from '../file-store-router.js';
import type { FileStoreRecord } from '../file-store.js';
import { DEVBOT_PROJECTS_DIR } from '../env.js';

// ---------------------------------------------------------------------------
// Record type
// ---------------------------------------------------------------------------

export interface NoteRecord extends FileStoreRecord {
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  color: string;
}

// ---------------------------------------------------------------------------
// Store instance
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(DEVBOT_PROJECTS_DIR, '.data', 'file-stores');

export const notesStore = new FileStore<NoteRecord>({
  filePath: path.join(DATA_DIR, 'notes.json'),
  name: 'notes',
  autoCommit: false,
  commitPrefix: 'data',
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const notesRouter = createFileStoreRouter(notesStore, {
  requiredFields: ['title'],
  beforeCreate: (data) => ({
    ...data,
    content: data.content ?? '',
    tags: data.tags ?? [],
    pinned: data.pinned ?? false,
    color: data.color ?? 'default',
  }),
});
