import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { lawnPlansTable, lawnProfilesTable, type LawnPlan, type LawnProfile } from '../schema.js';
import { LawnPlanAPI, LawnPlanData } from '../types.js';
import { type PluginsDb, pluginAsyncHandler, pluginNotFound, pluginBadRequest } from '../types.js';
import type { GeneratePlanFn } from '../routes.js';

export function createPlansHandlers(db: PluginsDb, generatePlanFn?: GeneratePlanFn): Router {
  const router = Router();

  function transformPlanData(raw: Record<string, unknown> | null): LawnPlanData | null {
    if (!raw) return null;

    const applications = raw.applications as Array<Record<string, unknown>> | undefined;
    if (!applications || !Array.isArray(applications)) return null;

    return {
      summary: (raw.summary as string) || '',
      totalCost: (raw.total_cost as number) ?? (raw.totalCost as number) ?? 0,
      store: (raw.store as string) || '',
      applications: applications.map((app) => ({
        order: (app.order as number) || 0,
        date: (app.date as string) || '',
        name: (app.name as string) || '',
        description: (app.description as string) || '',
        product: (app.product as string) || '',
        productUrl: (app.product_url as string) ?? (app.productUrl as string) ?? '',
        store: (app.store as string) || '',
        productCovers: (app.product_covers as number) ?? (app.productCovers as number) ?? 1,
        productPrice: (app.product_price as number) ?? (app.productPrice as number) ?? 0,
        applicationCost: (app.application_cost as number) ?? (app.applicationCost as number) ?? 0,
        howToApply: (app.how_to_apply as string) ?? (app.howToApply as string) ?? '',
        walkingPace: (app.walking_pace as string) ?? (app.walkingPace as string) ?? '',
        overlap: (app.overlap as string) ?? '',
        amount: (app.amount as string) || '',
        tips: (app.tips as string) || '',
        watering: (app.watering as string) || '',
        warnings: (app.warnings as string) || '',
      })),
    };
  }

  function rowToPlan(row: LawnPlan): LawnPlanAPI {
    return {
      id: row.id,
      profileId: row.profileId,
      chatId: row.chatId,
      status: row.status as LawnPlanAPI['status'],
      planData: row.status === 'completed' ? transformPlanData(row.planData) : null,
      errorMessage: row.errorMessage,
      generatedAt: row.generatedAt,
      createdAt: row.createdAt,
    };
  }

  router.get(
    '/',
    pluginAsyncHandler(async (req, res) => {
      const profileId = req.query.profile_id as string | undefined;

      let query = db.select().from(lawnPlansTable);
      if (profileId) {
        query = query.where(eq(lawnPlansTable.profileId, profileId));
      }

      const rows = await query;
      res.json(rows.map(rowToPlan));
    }, 'list lawn plans')
  );

  router.get(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const rows = await db
        .select()
        .from(lawnPlansTable)
        .where(eq(lawnPlansTable.id, req.params.id as string));

      if (rows.length === 0) {
        pluginNotFound(res, 'Lawn plan');
        return;
      }

      res.json(rowToPlan(rows[0]));
    }, 'get lawn plan')
  );

  router.get(
    '/:id/status',
    pluginAsyncHandler(async (req, res) => {
      const rows = await db
        .select({
          id: lawnPlansTable.id,
          status: lawnPlansTable.status,
          errorMessage: lawnPlansTable.errorMessage,
          chatId: lawnPlansTable.chatId,
        })
        .from(lawnPlansTable)
        .where(eq(lawnPlansTable.id, req.params.id as string));

      if (rows.length === 0) {
        pluginNotFound(res, 'Lawn plan');
        return;
      }

      const row = rows[0];
      res.json({
        id: row.id,
        status: row.status,
        isGenerating: row.status === 'generating',
        chatId: row.chatId,
        errorMessage: row.errorMessage,
      });
    }, 'check lawn plan status')
  );

  router.post(
    '/generate',
    pluginAsyncHandler(async (req, res) => {
      const { profileId } = req.body;

      if (!profileId) {
        pluginBadRequest(res, 'profileId is required');
        return;
      }

      const profiles = await db
        .select()
        .from(lawnProfilesTable)
        .where(eq(lawnProfilesTable.id, profileId));

      if (profiles.length === 0) {
        pluginNotFound(res, 'Lawn profile');
        return;
      }

      const profile = profiles[0] as LawnProfile;
      const id = uuidv4().slice(0, 12);
      const newPlan = await db
        .insert(lawnPlansTable)
        .values({
          id,
          profileId,
          status: 'generating',
        })
        .returning();

      res.status(201).json(rowToPlan(newPlan[0]));

      if (generatePlanFn) {
        generatePlanFn(id, profile)
          .then((planData) => {
            db.update(lawnPlansTable)
              .set({
                status: 'completed',
                planData: planData as unknown as Record<string, unknown>,
                generatedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                updatedBy: 'AI',
              })
              .where(eq(lawnPlansTable.id, id))
              .run();
            console.log(`[LawnCare] Plan ${id} generated successfully`);
          })
          .catch((err) => {
            console.error(`[LawnCare] Plan ${id} generation failed:`, err);
            db.update(lawnPlansTable)
              .set({
                status: 'failed',
                errorMessage: err instanceof Error ? err.message : 'Unknown error',
                updatedAt: new Date().toISOString(),
                updatedBy: 'system',
              })
              .where(eq(lawnPlansTable.id, id))
              .run();
          });
      }
    }, 'generate lawn plan')
  );

  router.delete(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const deleted = await db
        .delete(lawnPlansTable)
        .where(eq(lawnPlansTable.id, req.params.id as string))
        .returning();

      if (deleted.length === 0) {
        pluginNotFound(res, 'Lawn plan');
        return;
      }

      res.json({ success: true });
    }, 'delete lawn plan')
  );

  return router;
}
