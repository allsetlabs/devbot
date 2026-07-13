import express, { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Family Hierarchy plugin backend — NO database.
 * The whole family tree lives in a single JSON file at modules/memory/family_hierarchy.json.
 * Two endpoints (mounted at /api/plugins/family-hierarchy):
 *   GET  /tree  -> read + return the file
 *   PUT  /tree  -> overwrite the file with the posted tree (the app sends the whole JSON)
 */
const DEFAULT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../memory/family_hierarchy.json'
);
export const FAMILY_FILE = process.env.FAMILY_HIERARCHY_PATH || DEFAULT_PATH;

export default function getFamilyHierarchyRouter(): Router {
  const router = Router();
  // parse JSON bodies up to 16mb for this router (the whole tree is sent on save)
  router.use(express.json({ limit: '16mb' }));

  router.get('/tree', async (_req, res) => {
    try {
      const raw = await fs.readFile(FAMILY_FILE, 'utf-8');
      res.type('application/json').send(raw);
    } catch (err) {
      res
        .status(500)
        .json({ error: 'Could not read family hierarchy file', path: FAMILY_FILE, detail: String(err) });
    }
  });

  router.put('/tree', async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || !body.people || !body.rootId) {
      res.status(400).json({ error: 'Invalid tree: expected an object with { rootId, people }' });
      return;
    }
    try {
      await fs.writeFile(FAMILY_FILE, JSON.stringify(body, null, 2) + '\n', 'utf-8');
      res.json({ ok: true, people: Object.keys(body.people).length, path: FAMILY_FILE });
    } catch (err) {
      res
        .status(500)
        .json({ error: 'Could not write family hierarchy file', path: FAMILY_FILE, detail: String(err) });
    }
  });

  return router;
}
