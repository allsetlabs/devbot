import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { coreDb, chat_uploads } from '../lib/db/core.js';

const router = Router();

// Create uploads directory scoped by chatId
const getUploadDir = (chatId?: string) => {
  const workDir = process.env.CLAUDE_WORK_DIR || process.cwd();
  const uploadDir = chatId
    ? path.join(workDir, '.tmp', 'devbot-uploads', chatId)
    : path.join(workDir, '.tmp', 'devbot-uploads', 'unsorted');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return uploadDir;
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadDir());
  },
  filename: (_req, file, cb) => {
    const id = uuidv4().slice(0, 8);
    const ext = path.extname(file.originalname) || '.bin';
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${baseName}-${id}${ext}`);
  },
});

// Allowed MIME types for common files Claude can read
const ALLOWED_MIME_TYPES = [
  // Images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  // Text/Code
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
  'text/xml',
  // Archives (for reference)
  'application/zip',
];

// Also allow by extension for files where MIME type detection may fail
const ALLOWED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
  '.md',
  '.html',
  '.css',
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.toml',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.sh',
  '.zip',
];

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not supported: ${file.mimetype} (${ext})`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
});

// Upload endpoint - accepts multiple files, optional chatId to track ownership
router.post('/', upload.any(), async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const chatId = req.body.chatId as string | undefined;

  // Move files from unsorted to chatId folder if chatId provided
  const mapped = files.map((f) => {
    if (chatId) {
      const destDir = getUploadDir(chatId);
      const destPath = path.join(destDir, f.filename);
      fs.renameSync(f.path, destPath);
      return { path: destPath, filename: f.filename, originalName: f.originalname };
    }
    return { path: f.path, filename: f.filename, originalName: f.originalname };
  });

  // Store file paths in DB if chatId is provided
  if (chatId) {
    const rows = mapped.map((f) => ({
      id: uuidv4(),
      chat_id: chatId,
      file_path: f.path,
      original_name: f.originalName,
      created_by: 'user',
      updated_by: 'user',
    }));
    try {
      await coreDb.insert(chat_uploads).values(rows);
    } catch (error) {
      console.error('[Upload] Error storing file paths:', error);
    }
  }

  // Return all files, plus top-level fields from the first file for backward compat
  res.json({
    success: true,
    path: mapped[0].path,
    filename: mapped[0].filename,
    originalName: mapped[0].originalName,
    files: mapped,
  });
});

export { router as uploadRouter };
