import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { asyncHandler, sendBadRequest } from '../lib/route-helpers.js';

const router = Router();

const CLAUDE_SETTINGS_PATH = path.join(
  process.env.HOME || '',
  '.claude',
  'settings.json'
);

export interface HookEntry {
  type: 'command';
  command: string;
}

export interface HookMatcher {
  matcher: string;
  hooks: HookEntry[];
}

export type HookEvent = 'PreToolUse' | 'PostToolUse' | 'Notification' | 'Stop' | 'SubagentStop';

export interface HooksResponse {
  hooks: Record<string, HookMatcher[]>;
  settingsPath: string;
}

function readSettings(): Record<string, unknown> {
  if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
    return {};
  }
  const raw = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeSettings(settings: Record<string, unknown>): void {
  const dir = path.dirname(CLAUDE_SETTINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const settings = readSettings();
    const hooks = (settings.hooks as Record<string, HookMatcher[]>) || {};
    res.json({ hooks, settingsPath: CLAUDE_SETTINGS_PATH });
  }, 'list hooks')
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { event, matcher, command } = req.body;

    const validEvents: HookEvent[] = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop'];
    if (!event || !validEvents.includes(event)) {
      sendBadRequest(res, `event must be one of: ${validEvents.join(', ')}`);
      return;
    }
    if (!matcher || typeof matcher !== 'string' || !matcher.trim()) {
      sendBadRequest(res, 'matcher is required');
      return;
    }
    if (!command || typeof command !== 'string' || !command.trim()) {
      sendBadRequest(res, 'command is required');
      return;
    }

    const settings = readSettings();
    if (!settings.hooks) {
      settings.hooks = {};
    }

    const hooks = settings.hooks as Record<string, HookMatcher[]>;
    if (!hooks[event]) {
      hooks[event] = [];
    }

    hooks[event].push({
      matcher: matcher.trim(),
      hooks: [{ type: 'command', command: command.trim() }],
    });

    settings.hooks = hooks;
    writeSettings(settings);

    res.status(201).json({ success: true });
  }, 'add hook')
);

router.delete(
  '/:event/:index',
  asyncHandler(async (req, res) => {
    const { event, index } = req.params;
    const idx = parseInt(index, 10);

    const settings = readSettings();
    const hooks = (settings.hooks as Record<string, HookMatcher[]>) || {};

    if (!hooks[event] || idx < 0 || idx >= hooks[event].length) {
      res.json({ success: true });
      return;
    }

    hooks[event].splice(idx, 1);
    if (hooks[event].length === 0) {
      delete hooks[event];
    }
    settings.hooks = hooks;
    writeSettings(settings);

    res.json({ success: true });
  }, 'delete hook')
);

export { router as hooksRouter };
