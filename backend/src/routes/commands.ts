import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DEVBOT_PROJECTS_DIR } from '../lib/env.js';

export const commandsRouter = Router();

interface CommandRecord {
  id: string;
  name: string;
  description: string;
  type: 'skill' | 'builtin' | 'command';
}

const BUILTIN_COMMANDS: CommandRecord[] = [
  { id: '/help', name: 'help', description: 'Get help with using Claude Code', type: 'builtin' },
  { id: '/clear', name: 'clear', description: 'Clear conversation history', type: 'builtin' },
  { id: '/compact', name: 'compact', description: 'Compact conversation to save context', type: 'builtin' },
  { id: '/cost', name: 'cost', description: 'Show token usage and cost', type: 'builtin' },
  { id: '/doctor', name: 'doctor', description: 'Check Claude Code installation health', type: 'builtin' },
  { id: '/exit', name: 'exit', description: 'Exit the current session', type: 'builtin' },
  { id: '/init', name: 'init', description: 'Initialize a new CLAUDE.md file', type: 'builtin' },
  { id: '/login', name: 'login', description: 'Log in to your Anthropic account', type: 'builtin' },
  { id: '/logout', name: 'logout', description: 'Log out of your Anthropic account', type: 'builtin' },
  { id: '/model', name: 'model', description: 'Switch the AI model', type: 'builtin' },
  { id: '/pr_comments', name: 'pr_comments', description: 'Review PR comments', type: 'builtin' },
  { id: '/release-notes', name: 'release-notes', description: 'Generate release notes', type: 'builtin' },
  { id: '/review', name: 'review', description: 'Review code changes', type: 'builtin' },
  { id: '/status', name: 'status', description: 'Show current session status', type: 'builtin' },
  { id: '/terminal', name: 'terminal', description: 'Open a terminal session', type: 'builtin' },
  { id: '/vim', name: 'vim', description: 'Toggle vim keybindings', type: 'builtin' },
];

// Cache per directory with 10s TTL
const cache = new Map<string, { commands: CommandRecord[]; timestamp: number }>();
const CACHE_TTL_MS = 10_000;

function parseSkillFrontmatter(content: string): { name: string; description: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const frontmatter = match[1];
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  if (!nameMatch || !descMatch) return null;
  return { name: nameMatch[1].trim(), description: descMatch[1].trim() };
}

function readSkills(skillsDir: string): CommandRecord[] {
  if (!fs.existsSync(skillsDir)) return [];
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skills: CommandRecord[] = [];
  for (const entry of entries) {
    // Support symlinked skill directories (e.g. ~/.claude/skills -> module's .claude/skills)
    const entryPath = path.join(skillsDir, entry.name);
    if (!entry.isDirectory() && !(entry.isSymbolicLink() && fs.statSync(entryPath).isDirectory())) continue;
    const skillMdPath = path.join(entryPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const parsed = parseSkillFrontmatter(content);
    if (!parsed) continue;
    skills.push({ id: `/${parsed.name}`, name: parsed.name, description: parsed.description, type: 'skill' });
  }
  return skills;
}

function parseCommandDescription(content: string): string {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
    if (descMatch) return descMatch[1].trim();
  }
  const headerMatch = content.match(/^##\s*description:\s*(.+)$/m);
  if (headerMatch) return headerMatch[1].trim();
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return trimmed.slice(0, 120);
    }
  }
  return '';
}

function readCommands(commandsDir: string): CommandRecord[] {
  if (!fs.existsSync(commandsDir)) return [];
  const entries = fs.readdirSync(commandsDir);
  const cmds: CommandRecord[] = [];
  for (const filename of entries) {
    if (!filename.endsWith('.md')) continue;
    const name = filename.replace(/\.md$/, '');
    const filePath = path.join(commandsDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const description = parseCommandDescription(content);
    cmds.push({ id: `/${name}`, name, description: description || name, type: 'command' });
  }
  return cmds;
}

const GLOBAL_CLAUDE_DIR = path.join(os.homedir(), '.claude');

function scanCommands(workDir: string): CommandRecord[] {
  const cached = cache.get(workDir);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.commands;
  }

  // Project-level commands/skills
  const skillsDir = path.join(workDir, '.claude', 'skills');
  const commandsDir = path.join(workDir, '.claude', 'commands');

  // Global commands/skills (~/.claude/)
  const globalSkillsDir = path.join(GLOBAL_CLAUDE_DIR, 'skills');
  const globalCommandsDir = path.join(GLOBAL_CLAUDE_DIR, 'commands');

  const skills = readSkills(skillsDir);
  const cmds = readCommands(commandsDir);
  const globalSkills = readSkills(globalSkillsDir);
  const globalCmds = readCommands(globalCommandsDir);

  // Merge: project-level overrides global (by id)
  const seen = new Set<string>();
  const merged: CommandRecord[] = [];
  for (const cmd of [...skills, ...cmds]) {
    seen.add(cmd.id);
    merged.push(cmd);
  }
  for (const cmd of [...globalSkills, ...globalCmds]) {
    if (!seen.has(cmd.id)) {
      seen.add(cmd.id);
      merged.push(cmd);
    }
  }
  const all = [...merged, ...BUILTIN_COMMANDS];

  // Sort by type (skill, command, builtin) then name
  all.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

  cache.set(workDir, { commands: all, timestamp: Date.now() });
  return all;
}

// GET /api/commands?dir=/path/to/project — scan filesystem for slash commands
commandsRouter.get('/', (req, res) => {
  try {
    const dir = typeof req.query.dir === 'string' && req.query.dir.trim()
      ? req.query.dir.trim()
      : DEVBOT_PROJECTS_DIR;

    // Validate directory exists
    if (!fs.existsSync(dir)) {
      res.json(scanCommands(DEVBOT_PROJECTS_DIR));
      return;
    }

    res.json(scanCommands(dir));
  } catch (err) {
    console.error('[Commands] Error scanning commands:', err);
    res.status(500).json({ error: 'Failed to scan commands' });
  }
});
