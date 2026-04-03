import { Router } from 'express';
import { createReadStream, statSync } from 'fs';
import { resolve } from 'path';
import { eq, desc } from 'drizzle-orm';
import { coreDb, remotion_videos } from '../lib/db/core.js';
import type { RemotionVideoRow } from '../lib/db/types.js';
import { asyncHandler, sendNotFound, sendBadRequest, generateId } from '../lib/route-helpers.js';

const router = Router();

interface RemotionVideo {
  id: string;
  name: string;
  videoPath: string;
  chatId: string;
  status: 'generating' | 'completed' | 'failed';
  createdAt: string;
}

function rowToVideo(row: RemotionVideoRow): RemotionVideo {
  return {
    id: row.id,
    name: row.name,
    videoPath: row.video_path,
    chatId: row.chat_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

// List all videos
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb
      .select()
      .from(remotion_videos)
      .orderBy(desc(remotion_videos.created_at));

    res.json(rows.map(rowToVideo));
  }, 'list videos')
);

// Get single video
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(remotion_videos)
      .where(eq(remotion_videos.id, req.params.id))
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Video');
      return;
    }
    res.json(rowToVideo(rows[0]));
  }, 'get video')
);

// Create video record
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, videoPath, chatId } = req.body as {
      name: string;
      videoPath: string;
      chatId: string;
    };

    if (!name || !chatId) {
      sendBadRequest(res, 'name and chatId are required');
      return;
    }

    const id = generateId();
    const result = await coreDb
      .insert(remotion_videos)
      .values({
        id,
        name,
        video_path: videoPath || '',
        chat_id: chatId,
        status: 'generating',
        created_by: 'system',
        updated_by: 'system',
      })
      .returning();

    if (!result || result.length === 0) {
      throw new Error('Failed to insert video');
    }
    res.status(201).json(rowToVideo(result[0]));
  }, 'create video')
);

// Update video record (status, name, videoPath)
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name, videoPath, status } = req.body as {
      name?: string;
      videoPath?: string;
      status?: 'generating' | 'completed' | 'failed';
    };

    if (name === undefined && videoPath === undefined && status === undefined) {
      sendBadRequest(res, 'No fields to update');
      return;
    }

    const updates: Partial<typeof remotion_videos.$inferInsert> = { updated_by: 'system' };
    if (name !== undefined) updates.name = name;
    if (videoPath !== undefined) updates.video_path = videoPath;
    if (status !== undefined) updates.status = status;

    const result = await coreDb
      .update(remotion_videos)
      .set(updates)
      .where(eq(remotion_videos.id, req.params.id))
      .returning();

    if (!result || result.length === 0) {
      sendNotFound(res, 'Video');
      return;
    }
    res.json(rowToVideo(result[0]));
  }, 'update video')
);

// Delete video record
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await coreDb.delete(remotion_videos).where(eq(remotion_videos.id, req.params.id));
    res.json({ success: true });
  }, 'delete video')
);

// Stream video file by video ID
router.get(
  '/:id/stream',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select({ video_path: remotion_videos.video_path })
      .from(remotion_videos)
      .where(eq(remotion_videos.id, req.params.id))
      .limit(1);

    if (!rows || rows.length === 0 || !rows[0].video_path) {
      sendNotFound(res, 'Video');
      return;
    }

    const videoPath = rows[0].video_path;
    const projectRoot = resolve(import.meta.dirname, '../../../../..');
    const filePath = resolve(projectRoot, videoPath);

    let fileStat;
    try {
      fileStat = statSync(filePath);
    } catch {
      res.status(404).json({ message: 'Video file not found on disk' });
      return;
    }

    const fileSize = fileStat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });
      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      createReadStream(filePath).pipe(res);
    }
  }, 'stream video')
);

export const remotionVideosRouter = router;
