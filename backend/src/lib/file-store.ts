/**
 * File-Based Backend Framework
 *
 * A generic JSON file storage pattern for plugins. Human-readable JSON files,
 * auto-git-commit on changes, shareable by copying the file. Replaces SQLite
 * for simple plugins that don't need relational queries.
 *
 * Usage:
 *   const store = new FileStore<BookmarkRecord>({
 *     filePath: '/path/to/bookmarks.json',
 *     name: 'bookmarks',
 *   });
 *   const all = await store.list();
 *   const one = await store.create({ title: 'Example', url: 'https://...' });
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Standard columns every file-store record must include. */
export interface FileStoreRecord {
  id: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

/** Options for creating a FileStore instance. */
export interface FileStoreOptions {
  /** Absolute path to the JSON file. Created if missing. */
  filePath: string;
  /** Human-readable name for commit messages and the registry. */
  name: string;
  /** Auto-commit changes to git. Default: true. */
  autoCommit?: boolean;
  /** Prefix for git commit messages. Default: 'data'. */
  commitPrefix?: string;
  /** Length of generated IDs. Default: 8. */
  idLength?: number;
}

/** Sort/filter options for list(). */
export interface ListOptions<T> {
  /** Only return records matching all specified field values. */
  filter?: Partial<T>;
  /** Field to sort by. Default: 'created_at'. */
  sort?: keyof T;
  /** Sort direction. Default: 'desc'. */
  order?: 'asc' | 'desc';
  /** Max records to return. */
  limit?: number;
  /** Number of records to skip (for pagination). */
  offset?: number;
  /** Free-text search — matches if any string field contains the query (case-insensitive). */
  search?: string;
}

/** Info about a registered file store (exposed via the management API). */
export interface FileStoreInfo {
  name: string;
  filePath: string;
  recordCount: number;
  fileSize: number;
  lastModified: string | null;
  autoCommit: boolean;
}

// ---------------------------------------------------------------------------
// Registry — tracks all FileStore instances for the management API
// ---------------------------------------------------------------------------

const registry = new Map<string, FileStore<FileStoreRecord>>();

export function getRegisteredStores(): Map<string, FileStore<FileStoreRecord>> {
  return registry;
}

// ---------------------------------------------------------------------------
// FileStore class
// ---------------------------------------------------------------------------

export class FileStore<T extends FileStoreRecord> {
  readonly filePath: string;
  readonly name: string;
  private autoCommit: boolean;
  private commitPrefix: string;
  private idLength: number;

  /** In-memory cache. Invalidated when the file's mtime changes. */
  private cache: T[] | null = null;
  private cacheMtime: number = 0;

  constructor(options: FileStoreOptions) {
    this.filePath = options.filePath;
    this.name = options.name;
    this.autoCommit = options.autoCommit ?? true;
    this.commitPrefix = options.commitPrefix ?? 'data';
    this.idLength = options.idLength ?? 8;

    // Register this store
    registry.set(this.name, this as unknown as FileStore<FileStoreRecord>);
  }

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  /** List records with optional filter, sort, search, and pagination. */
  async list(options?: ListOptions<T>): Promise<T[]> {
    let records = await this.read();

    // Filter
    if (options?.filter) {
      const filter = options.filter;
      records = records.filter((r) =>
        Object.entries(filter).every(
          ([key, value]) => r[key as keyof T] === value
        )
      );
    }

    // Search (case-insensitive across all string fields)
    if (options?.search) {
      const q = options.search.toLowerCase();
      records = records.filter((r) =>
        Object.values(r).some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(q)
        )
      );
    }

    // Sort
    const sortKey = (options?.sort ?? 'created_at') as string;
    const sortOrder = options?.order ?? 'desc';
    records.sort((a, b) => {
      const aVal = a[sortKey as keyof T];
      const bVal = b[sortKey as keyof T];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    // Pagination
    if (options?.offset) {
      records = records.slice(options.offset);
    }
    if (options?.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  }

  /** Get a single record by ID. */
  async get(id: string): Promise<T | undefined> {
    const records = await this.read();
    return records.find((r) => r.id === id);
  }

  /** Create a new record. Returns the created record with generated id + timestamps. */
  async create(
    data: Omit<T, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Promise<T> {
    const records = await this.read();
    const now = new Date().toISOString();
    const record = {
      ...data,
      id: data.id ?? this.generateId(),
      created_by: (data as Partial<T>).created_by ?? 'user',
      updated_by: (data as Partial<T>).updated_by ?? 'user',
      settings: (data as Partial<T>).settings ?? {},
      created_at: now,
      updated_at: now,
    } as unknown as T;

    records.push(record);
    await this.write(records);
    await this.commit(`${this.commitPrefix}(${this.name}): create ${record.id}`);
    return record;
  }

  /** Update a record by ID. Returns the updated record, or undefined if not found. */
  async update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T | undefined> {
    const records = await this.read();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return undefined;

    const now = new Date().toISOString();
    records[index] = {
      ...records[index],
      ...data,
      id, // never overwrite id
      created_at: records[index].created_at, // never overwrite created_at
      updated_at: now,
      updated_by: (data as Partial<T>).updated_by ?? 'user',
    };

    await this.write(records);
    await this.commit(`${this.commitPrefix}(${this.name}): update ${id}`);
    return records[index];
  }

  /** Delete a record by ID. Returns true if found and deleted, false if not found. */
  async delete(id: string): Promise<boolean> {
    const records = await this.read();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return false;

    records.splice(index, 1);
    await this.write(records);
    await this.commit(`${this.commitPrefix}(${this.name}): delete ${id}`);
    return true;
  }

  /** Bulk create multiple records. Returns the created records. */
  async bulkCreate(
    items: Array<Omit<T, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<T[]> {
    const records = await this.read();
    const now = new Date().toISOString();
    const created: T[] = [];

    for (const data of items) {
      const record = {
        ...data,
        id: this.generateId(),
        created_by: (data as Partial<T>).created_by ?? 'user',
        updated_by: (data as Partial<T>).updated_by ?? 'user',
        settings: (data as Partial<T>).settings ?? {},
        created_at: now,
        updated_at: now,
      } as unknown as T;
      records.push(record);
      created.push(record);
    }

    await this.write(records);
    await this.commit(
      `${this.commitPrefix}(${this.name}): bulk create ${created.length} records`
    );
    return created;
  }

  /** Count records, optionally with a filter. */
  async count(filter?: Partial<T>): Promise<number> {
    const records = await this.list({ filter });
    return records.length;
  }

  // -------------------------------------------------------------------------
  // Store info (for management API)
  // -------------------------------------------------------------------------

  /** Get metadata about this store (for the management API). */
  async info(): Promise<FileStoreInfo> {
    let fileSize = 0;
    let lastModified: string | null = null;
    let recordCount = 0;

    try {
      const stat = await fs.stat(this.filePath);
      fileSize = stat.size;
      lastModified = stat.mtime.toISOString();
      const records = await this.read();
      recordCount = records.length;
    } catch {
      // File doesn't exist yet — that's fine
    }

    return {
      name: this.name,
      filePath: this.filePath,
      recordCount,
      fileSize,
      lastModified,
      autoCommit: this.autoCommit,
    };
  }

  // -------------------------------------------------------------------------
  // File I/O
  // -------------------------------------------------------------------------

  /** Read all records from the JSON file. Uses an mtime-based cache. */
  async read(): Promise<T[]> {
    try {
      const stat = await fs.stat(this.filePath);
      const mtime = stat.mtimeMs;

      // Return cache if the file hasn't changed
      if (this.cache !== null && mtime === this.cacheMtime) {
        // Return a shallow copy so callers can't corrupt the cache
        return [...this.cache];
      }

      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        console.warn(
          `[file-store:${this.name}] Expected an array in ${this.filePath}, got ${typeof parsed}. Starting fresh.`
        );
        this.cache = [];
        this.cacheMtime = mtime;
        return [];
      }

      this.cache = parsed as T[];
      this.cacheMtime = mtime;
      return [...this.cache];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist yet — initialize it
        await this.ensureDir();
        await fs.writeFile(this.filePath, '[\n]\n', 'utf-8');
        this.cache = [];
        this.cacheMtime = Date.now();
        return [];
      }
      throw err;
    }
  }

  /** Write all records to the JSON file (pretty-printed). */
  private async write(records: T[]): Promise<void> {
    await this.ensureDir();
    const json = JSON.stringify(records, null, 2) + '\n';
    await fs.writeFile(this.filePath, json, 'utf-8');

    // Update cache
    this.cache = [...records];
    try {
      const stat = await fs.stat(this.filePath);
      this.cacheMtime = stat.mtimeMs;
    } catch {
      this.cacheMtime = Date.now();
    }
  }

  /** Ensure the parent directory exists. */
  private async ensureDir(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  // -------------------------------------------------------------------------
  // Git integration
  // -------------------------------------------------------------------------

  /** Commit the file to git if autoCommit is enabled. */
  private async commit(message: string): Promise<void> {
    if (!this.autoCommit) return;

    try {
      const dir = path.dirname(this.filePath);
      const file = path.basename(this.filePath);
      execSync(`git add "${file}"`, { cwd: dir, stdio: 'pipe' });
      execSync(`git commit -m "${message}" --no-verify`, {
        cwd: dir,
        stdio: 'pipe',
      });
    } catch (err) {
      // Git commit can fail if there are no changes or if we're not in a repo.
      // This is non-fatal — the data was still written successfully.
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('nothing to commit')) {
        console.warn(`[file-store:${this.name}] git commit skipped: ${msg.slice(0, 120)}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Generate a short UUID. */
  private generateId(): string {
    return uuidv4().slice(0, this.idLength);
  }
}
