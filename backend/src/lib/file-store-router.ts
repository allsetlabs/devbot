/**
 * File Store Router Factory
 *
 * Creates a standard REST router for any FileStore instance. Provides CRUD
 * endpoints out of the box — no boilerplate needed per plugin.
 *
 * Usage:
 *   const store = new FileStore<BookmarkRecord>({ ... });
 *   const router = createFileStoreRouter(store);
 *   app.use('/api/bookmarks', router);
 *
 * Endpoints created:
 *   GET    /           — list records (query: sort, order, limit, offset, search, + any field filter)
 *   GET    /:id        — get a single record
 *   POST   /           — create a record
 *   PUT    /:id        — full update
 *   PATCH  /:id        — partial update
 *   DELETE /:id        — delete a record
 *   POST   /bulk       — bulk create
 *   GET    /meta/info  — store metadata (name, path, count, size)
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { FileStore, FileStoreRecord, ListOptions } from './file-store.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileStoreRouterOptions<T extends FileStoreRecord> {
  /** Disallow mutations (POST/PUT/PATCH/DELETE). */
  readOnly?: boolean;
  /** Transform data before creating a record. */
  beforeCreate?: (data: Record<string, unknown>, req: Request) => Record<string, unknown>;
  /** Transform data before updating a record. */
  beforeUpdate?: (data: Record<string, unknown>, req: Request) => Record<string, unknown>;
  /** Called after a record is created. */
  afterCreate?: (record: T) => void;
  /** Called after a record is updated. */
  afterUpdate?: (record: T) => void;
  /** Called after a record is deleted. */
  afterDelete?: (id: string) => void;
  /** Fields that are required on create. Validated before beforeCreate. */
  requiredFields?: (keyof T)[];
}

// ---------------------------------------------------------------------------
// Async handler wrapper (same pattern as route-helpers.ts)
// ---------------------------------------------------------------------------

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  context: string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error(`Error ${context}:`, error);
      res.status(500).json({ error: 'Internal error', message: `Failed to ${context}` });
    });
  };
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createFileStoreRouter<T extends FileStoreRecord>(
  store: FileStore<T>,
  options?: FileStoreRouterOptions<T>
): Router {
  const router = Router();
  const opts = options ?? {};

  // -----------------------------------------------------------------------
  // GET /meta/info — store metadata (must be before /:id to avoid conflict)
  // -----------------------------------------------------------------------
  router.get(
    '/meta/info',
    asyncHandler(async (_req, res) => {
      const info = await store.info();
      res.json(info);
    }, `get ${store.name} info`)
  );

  // -----------------------------------------------------------------------
  // GET / — list records
  // -----------------------------------------------------------------------
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const listOpts: ListOptions<T> = {};

      // Pagination & sort from query params
      if (req.query.sort) listOpts.sort = String(req.query.sort) as keyof T;
      if (req.query.order) listOpts.order = String(req.query.order) as 'asc' | 'desc';
      if (req.query.limit) listOpts.limit = parseInt(String(req.query.limit), 10);
      if (req.query.offset) listOpts.offset = parseInt(String(req.query.offset), 10);
      if (req.query.search) listOpts.search = String(req.query.search);

      // Any other query params become field filters
      const reserved = new Set(['sort', 'order', 'limit', 'offset', 'search']);
      const filter: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (!reserved.has(key) && value !== undefined) {
          filter[key] = String(value);
        }
      }
      if (Object.keys(filter).length > 0) {
        listOpts.filter = filter as Partial<T>;
      }

      const records = await store.list(listOpts);
      res.json(records);
    }, `list ${store.name}`)
  );

  // -----------------------------------------------------------------------
  // GET /:id — get one record
  // -----------------------------------------------------------------------
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const record = await store.get(String(req.params.id));
      if (!record) {
        res.status(404).json({ error: 'Not found', message: `${store.name} not found` });
        return;
      }
      res.json(record);
    }, `get ${store.name}`)
  );

  // -----------------------------------------------------------------------
  // POST / — create a record
  // -----------------------------------------------------------------------
  if (!opts.readOnly) {
    router.post(
      '/',
      asyncHandler(async (req, res) => {
        let data = req.body;
        if (!data || typeof data !== 'object') {
          res.status(400).json({ error: 'Bad request', message: 'Request body is required' });
          return;
        }

        // Validate required fields
        if (opts.requiredFields) {
          for (const field of opts.requiredFields) {
            const val = data[field as string];
            if (val === undefined || val === null || val === '') {
              res.status(400).json({
                error: 'Bad request',
                message: `${String(field)} is required`,
              });
              return;
            }
          }
        }

        if (opts.beforeCreate) {
          data = opts.beforeCreate(data, req);
        }

        const record = await store.create(data);
        opts.afterCreate?.(record);
        res.status(201).json(record);
      }, `create ${store.name}`)
    );

    // ---------------------------------------------------------------------
    // POST /bulk — bulk create
    // ---------------------------------------------------------------------
    router.post(
      '/bulk',
      asyncHandler(async (req, res) => {
        const items = req.body;
        if (!Array.isArray(items) || items.length === 0) {
          res
            .status(400)
            .json({ error: 'Bad request', message: 'Expected a non-empty array' });
          return;
        }
        const records = await store.bulkCreate(items);
        res.status(201).json(records);
      }, `bulk create ${store.name}`)
    );

    // ---------------------------------------------------------------------
    // PUT /:id — full update
    // ---------------------------------------------------------------------
    router.put(
      '/:id',
      asyncHandler(async (req, res) => {
        let data = req.body;
        if (!data || typeof data !== 'object') {
          res.status(400).json({ error: 'Bad request', message: 'Request body is required' });
          return;
        }

        if (opts.beforeUpdate) {
          data = opts.beforeUpdate(data, req);
        }

        const record = await store.update(String(req.params.id), data);
        if (!record) {
          res.status(404).json({ error: 'Not found', message: `${store.name} not found` });
          return;
        }
        opts.afterUpdate?.(record);
        res.json(record);
      }, `update ${store.name}`)
    );

    // ---------------------------------------------------------------------
    // PATCH /:id — partial update
    // ---------------------------------------------------------------------
    router.patch(
      '/:id',
      asyncHandler(async (req, res) => {
        let data = req.body;
        if (!data || typeof data !== 'object') {
          res.status(400).json({ error: 'Bad request', message: 'Request body is required' });
          return;
        }

        if (opts.beforeUpdate) {
          data = opts.beforeUpdate(data, req);
        }

        const record = await store.update(String(req.params.id), data);
        if (!record) {
          res.status(404).json({ error: 'Not found', message: `${store.name} not found` });
          return;
        }
        opts.afterUpdate?.(record);
        res.json(record);
      }, `patch ${store.name}`)
    );

    // ---------------------------------------------------------------------
    // DELETE /:id
    // ---------------------------------------------------------------------
    router.delete(
      '/:id',
      asyncHandler(async (req, res) => {
        const deleted = await store.delete(String(req.params.id));
        if (!deleted) {
          res.status(404).json({ error: 'Not found', message: `${store.name} not found` });
          return;
        }
        opts.afterDelete?.(String(req.params.id));
        res.json({ ok: true, id: String(req.params.id) });
      }, `delete ${store.name}`)
    );
  }

  return router;
}
