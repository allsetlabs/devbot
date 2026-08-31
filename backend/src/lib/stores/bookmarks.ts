/**
 * Bookmarks Store — demo of the File-Based Backend Framework.
 *
 * Stores bookmarks (URL + title + optional tags/notes) in a JSON file.
 * Demonstrates how any plugin can use FileStore + createFileStoreRouter
 * to get full CRUD with zero boilerplate.
 */

import path from 'path';
import { FileStore } from '../file-store.js';
import { createFileStoreRouter } from '../file-store-router.js';
import type { FileStoreRecord } from '../file-store.js';
import { DEVBOT_PROJECTS_DIR } from '../env.js';

// ---------------------------------------------------------------------------
// Record type
// ---------------------------------------------------------------------------

export interface BookmarkRecord extends FileStoreRecord {
  title: string;
  url: string;
  description: string;
  tags: string[];
  favicon: string;
  pinned: boolean;
}

// ---------------------------------------------------------------------------
// Store instance
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(DEVBOT_PROJECTS_DIR, '.data', 'file-stores');

export const bookmarksStore = new FileStore<BookmarkRecord>({
  filePath: path.join(DATA_DIR, 'bookmarks.json'),
  name: 'bookmarks',
  autoCommit: false, // .data dir is typically gitignored; keep commits off by default
  commitPrefix: 'data',
});

// ---------------------------------------------------------------------------
// Router (ready to mount)
// ---------------------------------------------------------------------------

export const bookmarksRouter = createFileStoreRouter(bookmarksStore, {
  requiredFields: ['title', 'url'],
  beforeCreate: (data) => ({
    ...data,
    tags: data.tags ?? [],
    description: data.description ?? '',
    favicon: data.favicon ?? '',
    pinned: data.pinned ?? false,
  }),
});
