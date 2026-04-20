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

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface McpServersResponse {
  servers: Record<string, McpServerConfig>;
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
    const servers = (settings.mcpServers as Record<string, McpServerConfig>) || {};
    res.json({ servers, settingsPath: CLAUDE_SETTINGS_PATH });
  }, 'list MCP servers')
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, command, args, env, cwd } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      sendBadRequest(res, 'name is required');
      return;
    }
    if (!command || typeof command !== 'string' || !command.trim()) {
      sendBadRequest(res, 'command is required');
      return;
    }

    const settings = readSettings();
    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }

    const config: McpServerConfig = { command: command.trim() };
    if (args && Array.isArray(args)) config.args = args;
    if (env && typeof env === 'object') config.env = env;
    if (cwd && typeof cwd === 'string') config.cwd = cwd.trim();

    (settings.mcpServers as Record<string, McpServerConfig>)[name.trim()] = config;
    writeSettings(settings);

    res.status(201).json({ success: true, name: name.trim(), config });
  }, 'add MCP server')
);

router.delete(
  '/:name',
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    const settings = readSettings();
    const servers = (settings.mcpServers as Record<string, McpServerConfig>) || {};

    if (!(name in servers)) {
      res.json({ success: true });
      return;
    }

    delete servers[name];
    settings.mcpServers = servers;
    writeSettings(settings);

    res.json({ success: true });
  }, 'delete MCP server')
);

export { router as mcpServersRouter };
