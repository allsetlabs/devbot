import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { babyLogsTable, type BabyLog } from '../schema.js';
import { BabyLogAPI } from '../types.js';
import { type PluginsDb, pluginAsyncHandler, pluginNotFound, pluginBadRequest } from '../types.js';

export function createLogsHandlers(db: PluginsDb): Router {
  const router = Router();

  function rowToLog(row: BabyLog): BabyLogAPI {
    return {
      id: row.id,
      logType: row.logType as BabyLogAPI['logType'],
      feedingType: row.feedingType as BabyLogAPI['feedingType'],
      feedingDurationMin: row.feedingDurationMin,
      feedingMl: row.feedingMl,
      breastSide: row.breastSide as BabyLogAPI['breastSide'],
      diaperWetPct: row.diaperWetPct as BabyLogAPI['diaperWetPct'],
      diaperPoop: row.diaperPoop as BabyLogAPI['diaperPoop'],
      fedBy: row.fedBy,
      note: row.note,
      weightKg: row.weightKg,
      heightCm: row.heightCm,
      headCircumferenceCm: row.headCircumferenceCm,
      loggedAt: row.loggedAt,
      createdAt: row.createdAt,
    };
  }

  router.get(
    '/',
    pluginAsyncHandler(async (req, res) => {
      const type = req.query.type as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      let query = db.select().from(babyLogsTable);

      if (type === 'feeding') {
        query = query.where(eq(babyLogsTable.logType, 'feeding'));
      } else if (type === 'wet' || type === 'poop') {
        query = query.where(eq(babyLogsTable.logType, 'diaper'));
      } else if (type === 'weight') {
        query = query.where(eq(babyLogsTable.logType, 'weight'));
      } else if (type === 'height') {
        query = query.where(eq(babyLogsTable.logType, 'height'));
      } else if (type === 'head_circumference') {
        query = query.where(eq(babyLogsTable.logType, 'head_circumference'));
      }

      const rows = await query.limit(limit).offset(offset);
      res.json(rows.map(rowToLog));
    }, 'list baby logs')
  );

  router.get(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const rows = await db
        .select()
        .from(babyLogsTable)
        .where(eq(babyLogsTable.id, req.params.id as string));

      if (rows.length === 0) {
        pluginNotFound(res, 'Baby log');
        return;
      }

      res.json(rowToLog(rows[0]));
    }, 'get baby log')
  );

  router.post(
    '/',
    pluginAsyncHandler(async (req, res) => {
      const {
        logType,
        feedingType,
        feedingDurationMin,
        feedingMl,
        breastSide,
        diaperWetPct,
        diaperPoop,
        fedBy,
        note,
        weightKg,
        heightCm,
        headCircumferenceCm,
        loggedAt,
      } = req.body;

      if (
        !logType ||
        !['feeding', 'diaper', 'weight', 'height', 'head_circumference'].includes(logType)
      ) {
        pluginBadRequest(
          res,
          'logType must be "feeding", "diaper", "weight", "height", or "head_circumference"'
        );
        return;
      }

      const id = uuidv4().slice(0, 12);
      const newLog = await db
        .insert(babyLogsTable)
        .values({
          id,
          logType: logType as BabyLog['logType'],
          feedingType: feedingType ?? null,
          feedingDurationMin: feedingDurationMin ?? null,
          feedingMl: feedingMl ?? null,
          breastSide: breastSide ?? null,
          diaperWetPct: diaperWetPct ?? null,
          diaperPoop: diaperPoop ?? null,
          fedBy: fedBy ?? null,
          note: note ?? null,
          weightKg: weightKg ?? null,
          heightCm: heightCm ?? null,
          headCircumferenceCm: headCircumferenceCm ?? null,
          loggedAt: loggedAt ?? new Date().toISOString(),
        })
        .returning();

      res.status(201).json(rowToLog(newLog[0]));
    }, 'create baby log')
  );

  router.patch(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const {
        feedingType,
        feedingDurationMin,
        feedingMl,
        breastSide,
        diaperWetPct,
        diaperPoop,
        fedBy,
        note,
        weightKg,
        heightCm,
        headCircumferenceCm,
        loggedAt,
      } = req.body;

      const updates: Record<string, unknown> = {};
      if (feedingType !== undefined) updates.feedingType = feedingType;
      if (feedingDurationMin !== undefined) updates.feedingDurationMin = feedingDurationMin;
      if (feedingMl !== undefined) updates.feedingMl = feedingMl;
      if (breastSide !== undefined) updates.breastSide = breastSide;
      if (diaperWetPct !== undefined) updates.diaperWetPct = diaperWetPct;
      if (diaperPoop !== undefined) updates.diaperPoop = diaperPoop;
      if (fedBy !== undefined) updates.fedBy = fedBy;
      if (note !== undefined) updates.note = note;
      if (weightKg !== undefined) updates.weightKg = weightKg;
      if (heightCm !== undefined) updates.heightCm = heightCm;
      if (headCircumferenceCm !== undefined) updates.headCircumferenceCm = headCircumferenceCm;
      if (loggedAt !== undefined) updates.loggedAt = loggedAt;
      updates.updatedAt = new Date().toISOString();

      const updated = await db
        .update(babyLogsTable)
        .set(updates)
        .where(eq(babyLogsTable.id, req.params.id as string))
        .returning();

      if (updated.length === 0) {
        pluginNotFound(res, 'Baby log');
        return;
      }

      res.json(rowToLog(updated[0]));
    }, 'update baby log')
  );

  router.delete(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const deleted = await db
        .delete(babyLogsTable)
        .where(eq(babyLogsTable.id, req.params.id as string))
        .returning();

      if (deleted.length === 0) {
        pluginNotFound(res, 'Baby log');
        return;
      }

      res.json({ success: true });
    }, 'delete baby log')
  );

  return router;
}
