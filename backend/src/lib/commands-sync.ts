import fs from 'fs';
import path from 'path';
import { coreDb, commands } from './db/core.js';

interface CommandRecord {
  id: string;
  name: string;
  description: string;
  type: 'skill' | 'builtin' | 'command';
}

const BUILTIN_COMMANDS: CommandRecord[] = [
  { id: '/help', name: 'help', description: 'Get help with using Claude Code', type: 'builtin' },
  { id: '/clear', name: 'clear', description: 'Clear conversation history', type: 'builtin' },
  {
    id: '/compact',
    name: 'compact',
    description: 'Compact conversation to save context',
    type: 'builtin',
  },
  { id: '/cost', name: 'cost', description: 'Show token usage and cost', type: 'builtin' },
  {
    id: '/doctor',
    name: 'doctor',
    description: 'Check Claude Code installation health',
    type: 'builtin',
  },
  { id: '/exit', name: 'exit', description: 'Exit the current session', type: 'builtin' },
  { id: '/init', name: 'init', description: 'Initialize a new CLAUDE.md file', type: 'builtin' },
  { id: '/login', name: 'login', description: 'Log in to your Anthropic account', type: 'builtin' },
  {
    id: '/logout',
    name: 'logout',
    description: 'Log out of your Anthropic account',
    type: 'builtin',
  },
  { id: '/model', name: 'model', description: 'Switch the AI model', type: 'builtin' },
  { id: '/pr_comments', name: 'pr_comments', description: 'Review PR comments', type: 'builtin' },
  {
    id: '/release-notes',
    name: 'release-notes',
    description: 'Generate release notes',
    type: 'builtin',
  },
  { id: '/review', name: 'review', description: 'Review code changes', type: 'builtin' },
  { id: '/status', name: 'status', description: 'Show current session status', type: 'builtin' },
  { id: '/terminal', name: 'terminal', description: 'Open a terminal session', type: 'builtin' },
  { id: '/vim', name: 'vim', description: 'Toggle vim keybindings', type: 'builtin' },
];

function parseSkillFrontmatter(content: string): { name: string; description: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = match[1];
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  if (!nameMatch || !descMatch) return null;

  return {
    name: nameMatch[1].trim(),
    description: descMatch[1].trim(),
  };
}

function readSkills(skillsDir: string): CommandRecord[] {
  if (!fs.existsSync(skillsDir)) return [];

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skills: CommandRecord[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;

    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const parsed = parseSkillFrontmatter(content);
    if (!parsed) continue;

    skills.push({
      id: `/${parsed.name}`,
      name: parsed.name,
      description: parsed.description,
      type: 'skill',
    });
  }

  return skills;
}

function parseCommandDescription(content: string): string {
  // Try YAML frontmatter first: ---\ndescription: ...\n---
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
    if (descMatch) return descMatch[1].trim();
  }
  // Try markdown header pattern: ## description: ...
  const headerMatch = content.match(/^##\s*description:\s*(.+)$/m);
  if (headerMatch) return headerMatch[1].trim();
  // Fallback: first non-empty, non-heading line
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

    cmds.push({
      id: `/${name}`,
      name,
      description: description || name,
      type: 'command',
    });
  }

  return cmds;
}

export async function syncCommands(): Promise<void> {
  const workDir = process.env.CLAUDE_WORK_DIR || process.cwd();
  const skillsDir = path.join(workDir, '.claude', 'skills');
  const commandsDir = path.join(workDir, '.claude', 'commands');

  const skills = readSkills(skillsDir);
  const cmds = readCommands(commandsDir);
  const allCommands = [...skills, ...cmds, ...BUILTIN_COMMANDS];

  const now = new Date().toISOString();

  for (const cmd of allCommands) {
    await coreDb
      .insert(commands)
      .values({
        id: cmd.id,
        name: cmd.name,
        description: cmd.description,
        type: cmd.type,
        created_by: 'system',
        updated_by: 'system',
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: commands.id,
        set: {
          name: cmd.name,
          description: cmd.description,
          type: cmd.type,
          updated_by: 'system',
          updated_at: now,
        },
      });
  }

  console.log(
    `[CommandsSync] Synced ${allCommands.length} commands (${skills.length} skills, ${cmds.length} commands, ${BUILTIN_COMMANDS.length} builtins)`
  );
}
