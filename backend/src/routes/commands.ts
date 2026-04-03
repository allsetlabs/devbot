import { Router } from 'express';
import { asc } from 'drizzle-orm';
import { coreDb, commands } from '../lib/db/core.js';
import { asyncHandler } from '../lib/route-helpers.js';

export const commandsRouter = Router();

// GET /api/commands — list all commands
commandsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb
      .select({
        id: commands.id,
        name: commands.name,
        description: commands.description,
        type: commands.type,
      })
      .from(commands)
      .orderBy(asc(commands.type), asc(commands.name));

    res.json(rows);
  }, 'list commands')
);
