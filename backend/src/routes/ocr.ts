import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { coreDb, ocr_documents } from '../lib/db/core.js';
import { DEVBOT_PROJECTS_DIR } from '../lib/env.js';
import { sendNotFound, sendInternalError } from '../lib/route-helpers.js';

const router = Router();

const getOcrDir = (docId: string) => {
  const dir = path.join(DEVBOT_PROJECTS_DIR, '.tmp', 'ocr-uploads', docId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tmpDir = path.join(DEVBOT_PROJECTS_DIR, '.tmp', 'ocr-uploads', 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    cb(null, tmpDir);
  },
  filename: (_req, file, cb) => {
    const id = uuidv4().slice(0, 8);
    const ext = path.extname(file.originalname) || '.png';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${base}-${id}${ext}`);
  },
});

const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
];

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.tif'];
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Image type not supported: ${file.mimetype}`));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// GET / — list all OCR documents newest first
router.get('/', async (_req, res) => {
  try {
    const docs = await coreDb
      .select()
      .from(ocr_documents)
      .orderBy(desc(ocr_documents.created_at));
    res.json(docs);
  } catch (error) {
    sendInternalError(res, error, 'list OCR documents');
  }
});

// GET /:id — get single OCR document
router.get('/:id', async (req, res) => {
  try {
    const [doc] = await coreDb
      .select()
      .from(ocr_documents)
      .where(eq(ocr_documents.id, req.params.id));
    if (!doc) {
      sendNotFound(res, 'OCR document');
      return;
    }
    res.json(doc);
  } catch (error) {
    sendInternalError(res, error, 'get OCR document');
  }
});

// POST /upload — upload image, persist to .tmp/ocr-uploads/{id}/
router.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const id = uuidv4().slice(0, 8);
    const docDir = getOcrDir(id);
    const destPath = path.join(docDir, file.filename);
    fs.renameSync(file.path, destPath);

    const [doc] = await coreDb
      .insert(ocr_documents)
      .values({
        id,
        original_name: file.originalname,
        image_path: destPath,
        status: 'pending',
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    res.json({ success: true, doc });
  } catch (error) {
    sendInternalError(res, error, 'upload OCR image');
  }
});

// PATCH /:id/text — save extracted text and write .txt file
router.patch('/:id/text', async (req, res) => {
  const { text } = req.body as { text: string };
  if (typeof text !== 'string') {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  try {
    const [existing] = await coreDb
      .select()
      .from(ocr_documents)
      .where(eq(ocr_documents.id, req.params.id));

    if (!existing) {
      sendNotFound(res, 'OCR document');
      return;
    }

    const docDir = path.dirname(existing.image_path);
    const txtFilename = `${path.basename(existing.image_path, path.extname(existing.image_path))}.txt`;
    const txtPath = path.join(docDir, txtFilename);
    fs.writeFileSync(txtPath, text, 'utf8');

    const [updated] = await coreDb
      .update(ocr_documents)
      .set({
        extracted_text: text,
        txt_path: txtPath,
        status: 'completed',
        updated_by: 'user',
        updated_at: new Date().toISOString(),
      })
      .where(eq(ocr_documents.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (error) {
    sendInternalError(res, error, 'save OCR text');
  }
});

// DELETE /:id — delete document, image, and txt file
router.delete('/:id', async (req, res) => {
  try {
    const [doc] = await coreDb
      .select()
      .from(ocr_documents)
      .where(eq(ocr_documents.id, req.params.id));

    if (!doc) {
      sendNotFound(res, 'OCR document');
      return;
    }

    // Remove the whole document directory
    const docDir = path.dirname(doc.image_path);
    if (fs.existsSync(docDir)) fs.rmSync(docDir, { recursive: true, force: true });

    await coreDb.delete(ocr_documents).where(eq(ocr_documents.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    sendInternalError(res, error, 'delete OCR document');
  }
});

export { router as ocrRouter };
