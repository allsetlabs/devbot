import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { lawnProfilesTable, type LawnProfile } from '../schema.js';
import { LawnProfileAPI } from '../types.js';
import { type PluginsDb, pluginAsyncHandler, pluginNotFound, pluginBadRequest } from '../types.js';

export function createProfilesHandlers(db: PluginsDb): Router {
  const router = Router();

  function rowToProfile(row: LawnProfile): LawnProfileAPI {
    return {
      id: row.id,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zipCode,
      grassType: row.grassType,
      sqft: row.sqft,
      climateZone: row.climateZone,
      sunExposure: row.sunExposure as LawnProfileAPI['sunExposure'],
      applicationMethod: row.applicationMethod as LawnProfileAPI['applicationMethod'],
      equipmentModel: row.equipmentModel,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  router.get(
    '/',
    pluginAsyncHandler(async (_req, res) => {
      const rows = await db.select().from(lawnProfilesTable);
      res.json(rows.map(rowToProfile));
    }, 'list lawn profiles')
  );

  router.get(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const rows = await db
        .select()
        .from(lawnProfilesTable)
        .where(eq(lawnProfilesTable.id, req.params.id as string));

      if (rows.length === 0) {
        pluginNotFound(res, 'Lawn profile');
        return;
      }

      res.json(rowToProfile(rows[0]));
    }, 'get lawn profile')
  );

  router.post(
    '/',
    pluginAsyncHandler(async (req, res) => {
      const {
        address,
        city,
        state,
        zipCode,
        grassType,
        sqft,
        climateZone,
        sunExposure,
        applicationMethod,
        equipmentModel,
        notes,
      } = req.body;

      if (!address || !grassType) {
        pluginBadRequest(res, 'address and grassType are required');
        return;
      }

      const id = uuidv4().slice(0, 12);
      const newProfile = await db
        .insert(lawnProfilesTable)
        .values({
          id,
          address,
          city: city ?? null,
          state: state ?? null,
          zipCode: zipCode ?? null,
          grassType,
          sqft: sqft ?? null,
          climateZone: climateZone ?? null,
          sunExposure: sunExposure ?? null,
          applicationMethod: applicationMethod ?? null,
          equipmentModel: equipmentModel ?? null,
          notes: notes ?? null,
        })
        .returning();

      res.status(201).json(rowToProfile(newProfile[0]));
    }, 'create lawn profile')
  );

  router.patch(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const {
        address,
        city,
        state,
        zipCode,
        grassType,
        sqft,
        climateZone,
        sunExposure,
        applicationMethod,
        equipmentModel,
        notes,
      } = req.body;

      const updates: Record<string, unknown> = {};
      if (address !== undefined) updates.address = address;
      if (city !== undefined) updates.city = city;
      if (state !== undefined) updates.state = state;
      if (zipCode !== undefined) updates.zipCode = zipCode;
      if (grassType !== undefined) updates.grassType = grassType;
      if (sqft !== undefined) updates.sqft = sqft;
      if (climateZone !== undefined) updates.climateZone = climateZone;
      if (sunExposure !== undefined) updates.sunExposure = sunExposure;
      if (applicationMethod !== undefined) updates.applicationMethod = applicationMethod;
      if (equipmentModel !== undefined) updates.equipmentModel = equipmentModel;
      if (notes !== undefined) updates.notes = notes;
      updates.updatedAt = new Date().toISOString();

      const updated = await db
        .update(lawnProfilesTable)
        .set(updates)
        .where(eq(lawnProfilesTable.id, req.params.id as string))
        .returning();

      if (updated.length === 0) {
        pluginNotFound(res, 'Lawn profile');
        return;
      }

      res.json(rowToProfile(updated[0]));
    }, 'update lawn profile')
  );

  router.delete(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const deleted = await db
        .delete(lawnProfilesTable)
        .where(eq(lawnProfilesTable.id, req.params.id as string))
        .returning();

      if (deleted.length === 0) {
        pluginNotFound(res, 'Lawn profile');
        return;
      }

      res.json({ success: true });
    }, 'delete lawn profile')
  );

  return router;
}
