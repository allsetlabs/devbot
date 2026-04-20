import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { asyncHandler, sendBadRequest } from '../lib/route-helpers.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const dir = req.query.dir as string;
    if (!dir) return sendBadRequest(res, 'dir query param required');

    const filePath = path.join(dir, 'CLAUDE.md');
    if (!fs.existsSync(filePath)) {
      res.json({ content: null, path: filePath, exists: false });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content, path: filePath, exists: true });
  }, 'read CLAUDE.md')
);

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const { dir, content } = req.body;
    if (!dir) return sendBadRequest(res, 'dir is required');
    if (typeof content !== 'string') return sendBadRequest(res, 'content must be a string');

    const filePath = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({ success: true, path: filePath });
  }, 'write CLAUDE.md')
);

export { router as claudeMdRouter };
