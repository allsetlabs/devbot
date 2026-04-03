import { Router } from 'express';
import { eq, desc, inArray } from 'drizzle-orm';
import { coreDb, module_plans } from '../lib/db/core.js';
import type { ModulePlanRow } from '../lib/db/types.js';
import {
  asyncHandler,
  sendNotFound,
  requireString,
  validateOptionalString,
  generateId,
  getOneById,
  requireEnum,
} from '../lib/route-helpers.js';

const router = Router();

export interface ModulePlan {
  id: string;
  title: string;
  description: string;
  route: string;
  source: string | null;
  sourceUrl: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  steps: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

function rowToPlan(row: ModulePlanRow): ModulePlan {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    route: row.route,
    source: row.source,
    sourceUrl: row.source_url,
    priority: row.priority,
    status: row.status,
    steps: row.steps || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// List all plans (optionally filter by status)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const statusFilter = req.query.status as string | undefined;

    let rows;
    if (
      statusFilter &&
      ['pending', 'in_progress', 'completed', 'dismissed'].includes(statusFilter)
    ) {
      rows = await coreDb
        .select()
        .from(module_plans)
        .where(
          eq(
            module_plans.status,
            statusFilter as 'pending' | 'in_progress' | 'completed' | 'dismissed'
          )
        )
        .orderBy(desc(module_plans.created_at));
    } else {
      rows = await coreDb.select().from(module_plans).orderBy(desc(module_plans.created_at));
    }

    res.json(rows.map(rowToPlan));
  }, 'list plans')
);

// Get plan count
router.get(
  '/count',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb
      .select()
      .from(module_plans)
      .where(inArray(module_plans.status, ['pending', 'in_progress']));

    res.json({ count: rows.length });
  }, 'count plans')
);

// Get single plan
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await getOneById(coreDb, module_plans, req.params.id, 'Plan', res);
    if (!row) return;
    res.json(rowToPlan(row));
  }, 'get plan')
);

// Create new plan
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, description, route, source, sourceUrl, priority, steps } = req.body;

    if (!requireString(res, title, 'Title')) return;
    if (!requireString(res, description, 'Description')) return;
    if (!requireString(res, route, 'Route')) return;

    const id = generateId();
    const result = await coreDb
      .insert(module_plans)
      .values({
        id,
        title: title.trim(),
        description: description.trim(),
        route: route.trim(),
        source: source?.trim() || null,
        source_url: sourceUrl?.trim() || null,
        priority: (priority || 'medium') as 'low' | 'medium' | 'high',
        steps: steps || [],
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    if (!result || result.length === 0) {
      throw new Error('Failed to insert plan');
    }

    res.status(201).json(rowToPlan(result[0]));
  }, 'create plan')
);

// Update plan
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { title, description, route, source, sourceUrl, priority, status, steps } = req.body;
    const updates: Partial<typeof module_plans.$inferInsert> = { updated_by: 'user' };

    if (!validateOptionalString(res, title, 'title')) return;
    if (title !== undefined) updates.title = title.trim();

    if (!validateOptionalString(res, description, 'description')) return;
    if (description !== undefined) updates.description = description.trim();

    if (route !== undefined) updates.route = route.trim();
    if (source !== undefined) updates.source = source?.trim() || null;
    if (sourceUrl !== undefined) updates.source_url = sourceUrl?.trim() || null;

    if (priority !== undefined) {
      if (!requireEnum(res, priority, ['low', 'medium', 'high'] as const, 'priority')) return;
      updates.priority = priority;
    }

    if (status !== undefined) {
      if (
        !requireEnum(
          res,
          status,
          ['pending', 'in_progress', 'completed', 'dismissed'] as const,
          'status'
        )
      )
        return;
      updates.status = status;
    }

    if (steps !== undefined) updates.steps = steps;

    const result = await coreDb
      .update(module_plans)
      .set(updates)
      .where(eq(module_plans.id, req.params.id))
      .returning();

    if (!result || result.length === 0) {
      sendNotFound(res, 'Plan');
      return;
    }

    res.json(rowToPlan(result[0]));
  }, 'update plan')
);

// Delete plan
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await coreDb.delete(module_plans).where(eq(module_plans.id, req.params.id));
    res.json({ success: true });
  }, 'delete plan')
);

export { router as plansRouter };
