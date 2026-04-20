import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { lawnPhotosTable, type LawnPhoto } from '../schema.js';
import { LawnPhotoAPI } from '../types.js';
import { type PluginsDb, pluginAsyncHandler, pluginNotFound, pluginBadRequest } from '../types.js';

export function createPhotosHandlers(db: PluginsDb): Router {
  const router = Router();

  function getUploadDir(): string {
    const workDir = process.env.DEVBOT_PROJECTS_DIR;
    if (!workDir) {
      console.error('[ENV] Missing required environment variable: DEVBOT_PROJECTS_DIR');
      process.exit(1);
    }
    const uploadDir = path.join(workDir, '.tmp', 'devbot-uploads', 'lawn-care');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
  }

  function filePathToUrl(filePath: string): string {
    const uploadDir = getUploadDir();
    const relative = path.relative(uploadDir, filePath);
    return `/uploads/${relative}`;
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, getUploadDir());
    },
    filename: (_req, file, cb) => {
      const id = uuidv4().slice(0, 8);
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `lawn-${id}${ext}`);
    },
  });

  const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Only image files are allowed. Got: ${file.mimetype}`));
      }
    },
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  function rowToPhoto(row: LawnPhoto): LawnPhotoAPI {
    return {
      id: row.id,
      profileId: row.profileId,
      applicationOrder: row.applicationOrder,
      fileUrl: filePathToUrl(row.filePath),
      caption: row.caption,
      takenAt: row.takenAt,
      createdAt: row.createdAt,
    };
  }

  router.get(
    '/',
    pluginAsyncHandler(async (req, res) => {
      const profileId = req.query.profile_id as string | undefined;
      if (!profileId) {
        pluginBadRequest(res, 'profile_id is required');
        return;
      }

      const rows = await db
        .select()
        .from(lawnPhotosTable)
        .where(eq(lawnPhotosTable.profileId, profileId));

      res.json(rows.map(rowToPhoto));
    }, 'list lawn photos')
  );

  router.post(
    '/',
    upload.single('photo'),
    pluginAsyncHandler(async (req, res) => {
      const file = req.file;
      if (!file) {
        pluginBadRequest(res, 'No photo uploaded');
        return;
      }

      const { profileId, applicationOrder, caption, takenAt } = req.body;
      if (!profileId) {
        pluginBadRequest(res, 'profileId is required');
        return;
      }

      const id = uuidv4().slice(0, 12);
      const newPhoto = await db
        .insert(lawnPhotosTable)
        .values({
          id,
          profileId,
          applicationOrder: applicationOrder ? parseInt(applicationOrder, 10) : null,
          filePath: file.path,
          caption: caption || null,
          takenAt: takenAt || new Date().toISOString(),
        })
        .returning();

      res.status(201).json(rowToPhoto(newPhoto[0]));
    }, 'upload lawn photo')
  );

  router.patch(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const { caption, applicationOrder } = req.body;

      const updates: Record<string, unknown> = {};
      if (caption !== undefined) updates.caption = caption;
      if (applicationOrder !== undefined) updates.applicationOrder = applicationOrder;
      updates.updatedAt = new Date().toISOString();

      const updated = await db
        .update(lawnPhotosTable)
        .set(updates)
        .where(eq(lawnPhotosTable.id, req.params.id as string))
        .returning();

      if (updated.length === 0) {
        pluginNotFound(res, 'Lawn photo');
        return;
      }

      res.json(rowToPhoto(updated[0]));
    }, 'update lawn photo')
  );

  router.delete(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const rows = await db
        .select({ filePath: lawnPhotosTable.filePath })
        .from(lawnPhotosTable)
        .where(eq(lawnPhotosTable.id, req.params.id as string));

      const deleted = await db
        .delete(lawnPhotosTable)
        .where(eq(lawnPhotosTable.id, req.params.id as string))
        .returning();

      if (deleted.length === 0) {
        pluginNotFound(res, 'Lawn photo');
        return;
      }

      if (rows[0]?.filePath && fs.existsSync(rows[0].filePath)) {
        fs.unlinkSync(rows[0].filePath);
      }

      res.json({ success: true });
    }, 'delete lawn photo')
  );

  return router;
}
