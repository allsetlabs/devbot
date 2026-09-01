/**
 * Trip Planner Store — file-based backend for trip planning.
 *
 * Stores trips (itineraries, expenses, travelers) in a JSON file.
 * Uses the FileStore + createFileStoreRouter framework for zero-boilerplate CRUD.
 */

import path from 'path';
import { FileStore } from '../../../backend/src/lib/file-store.js';
import { createFileStoreRouter } from '../../../backend/src/lib/file-store-router.js';
import type { FileStoreRecord } from '../../../backend/src/lib/file-store.js';
import { DEVBOT_PROJECTS_DIR } from '../../../backend/src/lib/env.js';
import { Router } from 'express';

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------

export interface TripActivity {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  lat?: number;
  lng?: number;
  duration: string;
  category: 'transport' | 'food' | 'activity' | 'lodging' | 'shopping' | 'other';
  cost?: number;
  notes?: string;
  booked: boolean;
  bookingRef?: string;
}

export interface TripDay {
  id: string;
  date: string;
  title: string;
  activities: TripActivity[];
  notes?: string;
}

export interface TripExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  paidBy: string;
}

export interface TripRecord extends FileStoreRecord {
  name: string;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'booked' | 'in-progress' | 'completed';
  coverEmoji: string;
  days: TripDay[];
  expenses: TripExpense[];
  budget: number;
  currency: string;
  tags: string[];
  notes: string;
  travelers: string[];
}

// ---------------------------------------------------------------------------
// Store instance
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(DEVBOT_PROJECTS_DIR, '.data', 'file-stores');

export const tripPlannerStore = new FileStore<TripRecord>({
  filePath: path.join(DATA_DIR, 'trip-planner.json'),
  name: 'trip-planner',
  autoCommit: false,
  commitPrefix: 'data',
});

// ---------------------------------------------------------------------------
// Router — CRUD + custom endpoints
// ---------------------------------------------------------------------------

const crudRouter = createFileStoreRouter(tripPlannerStore, {
  requiredFields: ['name', 'destination'],
  beforeCreate: (data) => ({
    ...data,
    description: data.description ?? '',
    startDate: data.startDate ?? '',
    endDate: data.endDate ?? '',
    status: data.status ?? 'planning',
    coverEmoji: data.coverEmoji ?? '✈️',
    days: data.days ?? [],
    expenses: data.expenses ?? [],
    budget: data.budget ?? 0,
    currency: data.currency ?? 'USD',
    tags: data.tags ?? [],
    notes: data.notes ?? '',
    travelers: data.travelers ?? [],
  }),
});

/** Export a single trip as a standalone shareable JSON file. */
function exportRouter(): Router {
  const router = Router();

  router.get('/:id/export', async (req, res) => {
    try {
      const trip = await tripPlannerStore.get(String(req.params.id));
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }

      // Strip internal FileStore fields for a clean export
      const exportData = {
        name: trip.name,
        destination: trip.destination,
        description: trip.description,
        startDate: trip.startDate,
        endDate: trip.endDate,
        status: trip.status,
        coverEmoji: trip.coverEmoji,
        days: trip.days,
        expenses: trip.expenses,
        budget: trip.budget,
        currency: trip.currency,
        tags: trip.tags,
        notes: trip.notes,
        travelers: trip.travelers,
        exportedAt: new Date().toISOString(),
        source: 'devbot-trip-planner',
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${trip.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.trip.json"`
      );
      res.json(exportData);
    } catch (err) {
      res.status(500).json({ error: 'Export failed', detail: String(err) });
    }
  });

  /** Import a trip from a shareable JSON file. */
  router.post('/import', async (req, res) => {
    try {
      const data = req.body;
      if (!data || !data.name || !data.destination) {
        res.status(400).json({ error: 'Invalid trip file: name and destination are required' });
        return;
      }

      const trip = await tripPlannerStore.create({
        name: data.name,
        destination: data.destination,
        description: data.description ?? '',
        startDate: data.startDate ?? '',
        endDate: data.endDate ?? '',
        status: 'planning', // Always start as planning on import
        coverEmoji: data.coverEmoji ?? '✈️',
        days: data.days ?? [],
        expenses: data.expenses ?? [],
        budget: data.budget ?? 0,
        currency: data.currency ?? 'USD',
        tags: [...(data.tags ?? []), 'imported'],
        notes: data.notes ?? '',
        travelers: data.travelers ?? [],
        created_by: 'import',
        updated_by: 'import',
        settings: {},
      } as Omit<TripRecord, 'id' | 'created_at' | 'updated_at'>);

      res.status(201).json(trip);
    } catch (err) {
      res.status(500).json({ error: 'Import failed', detail: String(err) });
    }
  });

  /** Get trip stats — summary across all trips. */
  router.get('/stats/summary', async (_req, res) => {
    try {
      const trips = await tripPlannerStore.list();
      const totalExpenses = trips.reduce(
        (sum, t) => sum + t.expenses.reduce((s, e) => s + e.amount, 0),
        0
      );
      const totalBudget = trips.reduce((sum, t) => sum + t.budget, 0);
      const totalDays = trips.reduce((sum, t) => sum + t.days.length, 0);
      const totalActivities = trips.reduce(
        (sum, t) => sum + t.days.reduce((s, d) => s + d.activities.length, 0),
        0
      );

      const byStatus = {
        planning: trips.filter((t) => t.status === 'planning').length,
        booked: trips.filter((t) => t.status === 'booked').length,
        'in-progress': trips.filter((t) => t.status === 'in-progress').length,
        completed: trips.filter((t) => t.status === 'completed').length,
      };

      res.json({
        totalTrips: trips.length,
        totalExpenses,
        totalBudget,
        totalDays,
        totalActivities,
        byStatus,
      });
    } catch (err) {
      res.status(500).json({ error: 'Stats failed', detail: String(err) });
    }
  });

  return router;
}

// ---------------------------------------------------------------------------
// Combined router
// ---------------------------------------------------------------------------

export function getTripPlannerRouter(): Router {
  const router = Router();
  router.use('/', exportRouter());
  router.use('/', crudRouter);
  return router;
}
