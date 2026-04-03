import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { babyProfilesTable, type BabyProfile } from '../schema.js';
import { BabyProfileAPI } from '../types.js';
import { type PluginsDb, pluginAsyncHandler, pluginNotFound, pluginBadRequest } from '../types.js';

export function createProfilesHandlers(db: PluginsDb): Router {
  const router = Router();

  function rowToProfile(row: BabyProfile): BabyProfileAPI {
    return {
      id: row.id,
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
      dateOfBirth: row.dateOfBirth,
      timeOfBirth: row.timeOfBirth,
      gender: row.gender as BabyProfileAPI['gender'],
      bloodType: row.bloodType,
      placeOfBirth: row.placeOfBirth,
      cityOfBirth: row.cityOfBirth,
      stateOfBirth: row.stateOfBirth,
      countryOfBirth: row.countryOfBirth,
      citizenship: row.citizenship,
      fatherName: row.fatherName,
      motherName: row.motherName,
      birthWeightKg: row.birthWeightKg,
      birthHeightCm: row.birthHeightCm,
      gestationalWeek: row.gestationalWeek,
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  router.get(
    '/',
    pluginAsyncHandler(async (_req, res) => {
      const rows = await db.select().from(babyProfilesTable);
      res.json(rows.map(rowToProfile));
    }, 'list baby profiles')
  );

  router.get(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const rows = await db
        .select()
        .from(babyProfilesTable)
        .where(eq(babyProfilesTable.id, req.params.id as string));

      if (rows.length === 0) {
        pluginNotFound(res, 'Baby profile');
        return;
      }

      res.json(rowToProfile(rows[0]));
    }, 'get baby profile')
  );

  router.post(
    '/',
    pluginAsyncHandler(async (req, res) => {
      const {
        firstName,
        middleName,
        lastName,
        dateOfBirth,
        timeOfBirth,
        gender,
        bloodType,
        placeOfBirth,
        cityOfBirth,
        stateOfBirth,
        countryOfBirth,
        citizenship,
        fatherName,
        motherName,
        birthWeightKg,
        birthHeightCm,
        gestationalWeek,
        note,
      } = req.body;

      if (!firstName || !lastName || !dateOfBirth || !gender) {
        pluginBadRequest(res, 'firstName, lastName, dateOfBirth, and gender are required');
        return;
      }

      if (!['male', 'female'].includes(gender)) {
        pluginBadRequest(res, 'gender must be "male" or "female"');
        return;
      }

      const id = uuidv4().slice(0, 12);
      const newProfile = await db
        .insert(babyProfilesTable)
        .values({
          id,
          firstName,
          middleName: middleName ?? null,
          lastName,
          dateOfBirth,
          timeOfBirth: timeOfBirth ?? null,
          gender: gender as BabyProfile['gender'],
          bloodType: bloodType ?? null,
          placeOfBirth: placeOfBirth ?? null,
          cityOfBirth: cityOfBirth ?? null,
          stateOfBirth: stateOfBirth ?? null,
          countryOfBirth: countryOfBirth ?? null,
          citizenship: citizenship ?? null,
          fatherName: fatherName ?? null,
          motherName: motherName ?? null,
          birthWeightKg: birthWeightKg ?? null,
          birthHeightCm: birthHeightCm ?? null,
          gestationalWeek: gestationalWeek ?? null,
          note: note ?? null,
        })
        .returning();

      res.status(201).json(rowToProfile(newProfile[0]));
    }, 'create baby profile')
  );

  router.patch(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const {
        firstName,
        middleName,
        lastName,
        dateOfBirth,
        timeOfBirth,
        gender,
        bloodType,
        placeOfBirth,
        cityOfBirth,
        stateOfBirth,
        countryOfBirth,
        citizenship,
        fatherName,
        motherName,
        birthWeightKg,
        birthHeightCm,
        gestationalWeek,
        note,
      } = req.body;

      const updates: Record<string, unknown> = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (middleName !== undefined) updates.middleName = middleName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
      if (timeOfBirth !== undefined) updates.timeOfBirth = timeOfBirth;
      if (gender !== undefined) updates.gender = gender;
      if (bloodType !== undefined) updates.bloodType = bloodType;
      if (placeOfBirth !== undefined) updates.placeOfBirth = placeOfBirth;
      if (cityOfBirth !== undefined) updates.cityOfBirth = cityOfBirth;
      if (stateOfBirth !== undefined) updates.stateOfBirth = stateOfBirth;
      if (countryOfBirth !== undefined) updates.countryOfBirth = countryOfBirth;
      if (citizenship !== undefined) updates.citizenship = citizenship;
      if (fatherName !== undefined) updates.fatherName = fatherName;
      if (motherName !== undefined) updates.motherName = motherName;
      if (birthWeightKg !== undefined) updates.birthWeightKg = birthWeightKg;
      if (birthHeightCm !== undefined) updates.birthHeightCm = birthHeightCm;
      if (gestationalWeek !== undefined) updates.gestationalWeek = gestationalWeek;
      if (note !== undefined) updates.note = note;
      updates.updatedAt = new Date().toISOString();

      const updated = await db
        .update(babyProfilesTable)
        .set(updates)
        .where(eq(babyProfilesTable.id, req.params.id as string))
        .returning();

      if (updated.length === 0) {
        pluginNotFound(res, 'Baby profile');
        return;
      }

      res.json(rowToProfile(updated[0]));
    }, 'update baby profile')
  );

  router.delete(
    '/:id',
    pluginAsyncHandler(async (req, res) => {
      const deleted = await db
        .delete(babyProfilesTable)
        .where(eq(babyProfilesTable.id, req.params.id as string))
        .returning();

      if (deleted.length === 0) {
        pluginNotFound(res, 'Baby profile');
        return;
      }

      res.json({ success: true });
    }, 'delete baby profile')
  );

  return router;
}
