import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { asyncHandler, sendBadRequest } from '../lib/route-helpers.js';

const router = Router();

const KEYBINDINGS_PATH = path.join(
  process.env.HOME || '',
  '.claude',
  'keybindings.json'
);

export interface Keybinding {
  key: string;
  command: string;
  when?: string;
}

function readKeybindings(): Keybinding[] {
  if (!fs.existsSync(KEYBINDINGS_PATH)) {
    return [];
  }
  const raw = fs.readFileSync(KEYBINDINGS_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeKeybindings(bindings: Keybinding[]): void {
  const dir = path.dirname(KEYBINDINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(KEYBINDINGS_PATH, JSON.stringify(bindings, null, 2), 'utf-8');
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const keybindings = readKeybindings();
    res.json({ keybindings, path: KEYBINDINGS_PATH });
  }, 'list keybindings')
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { key, command, when } = req.body;

    if (!key || typeof key !== 'string' || !key.trim()) {
      sendBadRequest(res, 'key is required');
      return;
    }
    if (!command || typeof command !== 'string' || !command.trim()) {
      sendBadRequest(res, 'command is required');
      return;
    }

    const keybindings = readKeybindings();
    const entry: Keybinding = { key: key.trim(), command: command.trim() };
    if (when && typeof when === 'string' && when.trim()) {
      entry.when = when.trim();
    }
    keybindings.push(entry);
    writeKeybindings(keybindings);

    res.status(201).json({ success: true });
  }, 'add keybinding')
);

router.delete(
  '/:index',
  asyncHandler(async (req, res) => {
    const idx = parseInt(req.params.index, 10);
    const keybindings = readKeybindings();

    if (idx >= 0 && idx < keybindings.length) {
      keybindings.splice(idx, 1);
      writeKeybindings(keybindings);
    }

    res.json({ success: true });
  }, 'delete keybinding')
);

export { router as keybindingsRouter };
