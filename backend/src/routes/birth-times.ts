import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { coreDb, birth_time_entries } from '../lib/db/core.js';
import type { BirthTimeEntryRow } from '../lib/db/types.js';
import { asyncHandler, sendBadRequest, sendNotFound, generateId } from '../lib/route-helpers.js';

const router = Router();

interface BirthTimeEntry {
  id: string;
  recordedAt: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  fullAddress: string | null;
  name: string | null;
  description: string | null;
  note: string | null;
  createdAt: string;
}

function rowToEntry(row: BirthTimeEntryRow): BirthTimeEntry {
  return {
    id: row.id,
    recordedAt: row.recorded_at,
    timezone: row.timezone,
    latitude: row.latitude,
    longitude: row.longitude,
    locationName: row.location_name,
    city: row.city,
    state: row.state,
    country: row.country,
    fullAddress: row.full_address,
    name: row.name,
    description: row.description,
    note: row.note,
    createdAt: row.created_at,
  };
}

// List all birth time entries
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb
      .select()
      .from(birth_time_entries)
      .orderBy(desc(birth_time_entries.recorded_at));

    res.json(rows.map(rowToEntry));
  }, 'fetch birth time entries')
);

// Create a birth time entry
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      recordedAt,
      timezone,
      latitude,
      longitude,
      locationName,
      city,
      state,
      country,
      fullAddress,
    } = req.body;

    if (!recordedAt || !timezone) {
      sendBadRequest(res, 'recordedAt and timezone are required');
      return;
    }

    const id = generateId();
    const result = await coreDb
      .insert(birth_time_entries)
      .values({
        id,
        recorded_at: recordedAt,
        timezone,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        location_name: locationName ?? null,
        city: city ?? null,
        state: state ?? null,
        country: country ?? null,
        full_address: fullAddress ?? null,
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    if (!result || result.length === 0) {
      throw new Error('Failed to insert entry');
    }

    res.status(201).json(rowToEntry(result[0]));
  }, 'create birth time entry')
);

// Update a birth time entry (name, description)
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    const result = await coreDb
      .update(birth_time_entries)
      .set({
        name: name ?? null,
        description: description ?? null,
        updated_by: 'user',
      })
      .where(eq(birth_time_entries.id, req.params.id))
      .returning();

    if (!result || result.length === 0) {
      sendNotFound(res, 'Birth time entry');
      return;
    }

    res.json(rowToEntry(result[0]));
  }, 'update birth time entry')
);

// Delete a birth time entry
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await coreDb.delete(birth_time_entries).where(eq(birth_time_entries.id, req.params.id));
    res.json({ success: true });
  }, 'delete birth time entry')
);

export const birthTimesRouter = router;
