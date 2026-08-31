/**
 * File Stores management API.
 *
 * Provides a meta-layer on top of individual FileStore instances so the
 * frontend can discover what stores exist and browse their data.
 *
 * Endpoints (mounted at /api/file-stores):
 *   GET  /                — list all registered stores with metadata
 *   GET  /:name           — get info + records for a specific store
 *   GET  /:name/records   — list records for a store (proxies query params)
 *   GET  /:name/records/:id — get a single record from a store
 */

import { Router } from 'express';
import { getRegisteredStores } from '../lib/file-store.js';
import type { FileStoreRecord } from '../lib/file-store.js';

const router = Router();

/** GET / — list all registered file stores with metadata. */
router.get('/', async (_req, res) => {
  try {
    const stores = getRegisteredStores();
    const infos = await Promise.all(
      Array.from(stores.values()).map((store) => store.info())
    );
    res.json(infos);
  } catch (err) {
    console.error('Error listing file stores:', err);
    res.status(500).json({ error: 'Internal error', message: 'Failed to list file stores' });
  }
});

/** GET /:name — get info + all records for a named store. */
router.get('/:name', async (req, res) => {
  try {
    const stores = getRegisteredStores();
    const store = stores.get(req.params.name);
    if (!store) {
      res.status(404).json({ error: 'Not found', message: `Store "${req.params.name}" not found` });
      return;
    }

    const [info, records] = await Promise.all([store.info(), store.list()]);
    res.json({ ...info, records });
  } catch (err) {
    console.error(`Error getting store ${req.params.name}:`, err);
    res.status(500).json({ error: 'Internal error', message: 'Failed to get store' });
  }
});

/** GET /:name/records — list records for a store with query params. */
router.get('/:name/records', async (req, res) => {
  try {
    const stores = getRegisteredStores();
    const store = stores.get(req.params.name);
    if (!store) {
      res.status(404).json({ error: 'Not found', message: `Store "${req.params.name}" not found` });
      return;
    }

    // Pass through query params for filtering/sorting
    const listOpts: {
      sort?: keyof FileStoreRecord;
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
      search?: string;
      filter?: Partial<FileStoreRecord>;
    } = {};

    if (req.query.sort) listOpts.sort = String(req.query.sort) as keyof FileStoreRecord;
    if (req.query.order) listOpts.order = String(req.query.order) as 'asc' | 'desc';
    if (req.query.limit) listOpts.limit = parseInt(String(req.query.limit), 10);
    if (req.query.offset) listOpts.offset = parseInt(String(req.query.offset), 10);
    if (req.query.search) listOpts.search = String(req.query.search);

    const records = await store.list(listOpts);
    res.json(records);
  } catch (err) {
    console.error(`Error listing records for ${req.params.name}:`, err);
    res.status(500).json({ error: 'Internal error', message: 'Failed to list records' });
  }
});

/** GET /:name/records/:id — get a single record from a store. */
router.get('/:name/records/:id', async (req, res) => {
  try {
    const stores = getRegisteredStores();
    const store = stores.get(req.params.name);
    if (!store) {
      res.status(404).json({ error: 'Not found', message: `Store "${req.params.name}" not found` });
      return;
    }

    const record = await store.get(req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Not found', message: 'Record not found' });
      return;
    }
    res.json(record);
  } catch (err) {
    console.error(`Error getting record from ${req.params.name}:`, err);
    res.status(500).json({ error: 'Internal error', message: 'Failed to get record' });
  }
});

export const fileStoresRouter = router;
