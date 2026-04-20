import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { eq, ne, desc } from 'drizzle-orm';
import { coreDb, companies, interactive_chats } from '../lib/db/core.js';
import type { CompanyRow } from '../lib/db/types.js';
import { sendMessage } from '../lib/interactive-chat-worker.js';
import {
  asyncHandler,
  sendNotFound,
  sendBadRequest,
  requireString,
  generateId,
  getOneById,
} from '../lib/route-helpers.js';
import { DEVBOT_PROJECTS_DIR } from '../lib/env.js';

const router = Router();

export interface Company {
  id: string;
  name: string;
  directory: string;
  masterChatId: string | null;
  status: 'creating' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackEntry {
  id: string;
  prompt: string;
  status: 'pending';
  createdAt: string;
}

export interface FeedbackDocument {
  document: string;
  entries: FeedbackEntry[];
}

function rowToCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    directory: row.directory,
    masterChatId: row.master_chat_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function feedbackFilePath(directory: string, type: string): string {
  return path.join(directory, '.board', `${type}-feedback.json`);
}

function readFeedbackFile(filePath: string, type: string): FeedbackDocument {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as FeedbackDocument;
  } catch {
    return { document: `${type}-feedback`, entries: [] };
  }
}

// List all non-archived companies
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb
      .select()
      .from(companies)
      .where(ne(companies.status, 'archived'))
      .orderBy(desc(companies.created_at));

    res.json(rows.map(rowToCompany));
  }, 'list companies')
);

// Get single company
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await getOneById(coreDb, companies, req.params.id, 'Company', res);
    if (!row) return;
    res.json(rowToCompany(row));
  }, 'get company')
);

// Create company
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, idea } = req.body;

    if (!requireString(res, name, 'Name')) return;
    if (!requireString(res, idea, 'Idea')) return;

    const slug = slugify(name.trim());
    if (!slug) {
      sendBadRequest(res, 'Name must contain at least one alphanumeric character');
      return;
    }

    const directory = path.join(DEVBOT_PROJECTS_DIR, 'modules', slug);
    const companyId = generateId();

    // Insert company row with status 'creating'
    const companyResult = await coreDb
      .insert(companies)
      .values({
        id: companyId,
        name: name.trim(),
        directory,
        status: 'creating',
        created_by: 'user',
        updated_by: 'user',
        settings: {},
      })
      .returning();

    if (!companyResult || companyResult.length === 0) {
      throw new Error('Failed to insert company');
    }

    // Create the master interactive chat
    const chatId = generateId();
    const chatResult = await coreDb
      .insert(interactive_chats)
      .values({
        id: chatId,
        name: `${name.trim()} — Project Chat`,
        type: 'Company',
        status: 'active',
        permission_mode: 'dangerous',
        model: 'sonnet',
        system_prompt: null,
        max_turns: null,
        settings: { workingDir: DEVBOT_PROJECTS_DIR },
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    if (!chatResult || chatResult.length === 0) {
      throw new Error('Failed to insert interactive chat');
    }

    // Link company to master chat
    await coreDb
      .update(companies)
      .set({ master_chat_id: chatId, updated_by: 'user' })
      .where(eq(companies.id, companyId));

    // Send the initial devbot-create-project prompt (fire-and-forget)
    const prompt = `Use the devbot-create-project skill with --name=${slug} --dir=${directory} --idea=${idea.trim()}`;
    sendMessage(chatId, prompt).catch((err) => {
      console.error(`[Companies] Failed to send initial prompt for company ${companyId}:`, err);
    });

    // Return the updated company
    const updatedRows = await coreDb
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    res.status(201).json(rowToCompany(updatedRows[0]));
  }, 'create company')
);

// Soft-delete company (archive)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(companies)
      .where(eq(companies.id, req.params.id))
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Company');
      return;
    }

    await coreDb
      .update(companies)
      .set({ status: 'archived', updated_by: 'user' })
      .where(eq(companies.id, req.params.id));

    res.json({ success: true });
  }, 'archive company')
);

// Get feedback document
router.get(
  '/:id/feedback/:type',
  asyncHandler(async (req, res) => {
    const { type } = req.params;
    if (type !== 'user' && type !== 'investor') {
      sendBadRequest(res, 'type must be "user" or "investor"');
      return;
    }

    const row = await getOneById(coreDb, companies, req.params.id, 'Company', res);
    if (!row) return;

    const filePath = feedbackFilePath(row.directory, type);
    const doc = readFeedbackFile(filePath, type);
    res.json(doc);
  }, 'get feedback')
);

// Add feedback entry
router.post(
  '/:id/feedback/:type',
  asyncHandler(async (req, res) => {
    const { type } = req.params;
    if (type !== 'user' && type !== 'investor') {
      sendBadRequest(res, 'type must be "user" or "investor"');
      return;
    }

    const { prompt } = req.body;
    if (!requireString(res, prompt, 'Prompt')) return;

    const row = await getOneById(coreDb, companies, req.params.id, 'Company', res);
    if (!row) return;

    const filePath = feedbackFilePath(row.directory, type);
    const doc = readFeedbackFile(filePath, type);

    // Generate entry id: uf-XXX or if-XXX
    const prefix = type === 'user' ? 'uf' : 'if';
    const entryId = `${prefix}-${generateId().slice(0, 6)}`;

    const newEntry: FeedbackEntry = {
      id: entryId,
      prompt: prompt.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    doc.entries.push(newEntry);

    // Ensure directory exists and write back
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), 'utf-8');

    res.status(201).json(doc);
  }, 'add feedback entry')
);

export { router as companiesRouter };
