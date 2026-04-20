import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { asyncHandler, sendBadRequest, sendNotFound } from '../lib/route-helpers.js';

const router = Router();

const CLAUDE_PROJECTS_DIR = path.join(
  process.env.HOME || '',
  '.claude',
  'projects'
);

export interface MemoryFile {
  project: string;
  filename: string;
  name: string;
  description: string;
  type: string;
  content: string;
}

export interface MemoriesResponse {
  memories: MemoryFile[];
  basePath: string;
}

function parseMemoryFile(filePath: string): { name: string; description: string; type: string; content: string } | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) return { name: '', description: '', type: '', content: raw };

    const frontmatter = frontmatterMatch[1];
    const content = frontmatterMatch[2].trim();
    const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim() || '';
    const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim() || '';
    const type = frontmatter.match(/^type:\s*(.+)$/m)?.[1]?.trim() || '';

    return { name, description, type, content };
  } catch {
    return null;
  }
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const memories: MemoryFile[] = [];

    if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) {
      res.json({ memories, basePath: CLAUDE_PROJECTS_DIR });
      return;
    }

    const projects = fs.readdirSync(CLAUDE_PROJECTS_DIR).filter((p) => {
      const memDir = path.join(CLAUDE_PROJECTS_DIR, p, 'memory');
      return fs.existsSync(memDir) && fs.statSync(memDir).isDirectory();
    });

    for (const project of projects) {
      const memDir = path.join(CLAUDE_PROJECTS_DIR, project, 'memory');
      const files = fs.readdirSync(memDir).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md');

      for (const filename of files) {
        const parsed = parseMemoryFile(path.join(memDir, filename));
        if (parsed) {
          memories.push({ project, filename, ...parsed });
        }
      }
    }

    res.json({ memories, basePath: CLAUDE_PROJECTS_DIR });
  }, 'list memories')
);

router.put(
  '/:project/:filename',
  asyncHandler(async (req, res) => {
    const { project, filename } = req.params;
    const { content } = req.body;

    if (content === undefined || typeof content !== 'string') {
      sendBadRequest(res, 'content is required');
      return;
    }

    const filePath = path.join(CLAUDE_PROJECTS_DIR, project, 'memory', filename);
    if (!fs.existsSync(filePath)) {
      sendNotFound(res, 'memory file');
      return;
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({ success: true });
  }, 'update memory')
);

router.delete(
  '/:project/:filename',
  asyncHandler(async (req, res) => {
    const { project, filename } = req.params;
    const filePath = path.join(CLAUDE_PROJECTS_DIR, project, 'memory', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  }, 'delete memory')
);

export { router as memoriesRouter };
