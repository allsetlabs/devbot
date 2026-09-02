/**
 * Health Tracker Store — file-based backend for family health records,
 * medication tracking, and appointment scheduling.
 *
 * Three FileStores: members, medications, appointments.
 * Uses the FileStore + createFileStoreRouter framework for zero-boilerplate CRUD.
 */

import path from 'path';
import { Router } from 'express';
import { FileStore } from '../../../backend/src/lib/file-store.js';
import { createFileStoreRouter } from '../../../backend/src/lib/file-store-router.js';
import type { FileStoreRecord } from '../../../backend/src/lib/file-store.js';
import { DEVBOT_PROJECTS_DIR } from '../../../backend/src/lib/env.js';

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------

export interface MemberRecord extends FileStoreRecord {
  name: string;
  relationship: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodType: string;
  height: string;
  weight: string;
  allergies: string[];
  conditions: string[];
  emergencyContact: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  primaryDoctor: string;
  notes: string;
}

export interface MedicationRecord extends FileStoreRecord {
  memberId: string;
  memberName: string;
  name: string;
  dosage: string;
  frequency: 'daily' | 'twice_daily' | 'three_times_daily' | 'weekly' | 'monthly' | 'as_needed';
  timeOfDay: string[];
  prescribedBy: string;
  startDate: string;
  endDate: string;
  refillDate: string;
  pharmacy: string;
  purpose: string;
  sideEffects: string;
  active: boolean;
  notes: string;
}

export interface AppointmentRecord extends FileStoreRecord {
  memberId: string;
  memberName: string;
  type: 'checkup' | 'specialist' | 'dental' | 'vision' | 'vaccination' | 'lab_work' | 'therapy' | 'emergency' | 'follow_up' | 'other';
  doctorName: string;
  facility: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  reason: string;
  diagnosis: string;
  prescriptions: string;
  followUpDate: string;
  reminderDays: number;
  cost: number;
  insuranceCovered: boolean;
  notes: string;
}

// ---------------------------------------------------------------------------
// Store instances
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(DEVBOT_PROJECTS_DIR, '.data', 'file-stores');

export const memberStore = new FileStore<MemberRecord>({
  filePath: path.join(DATA_DIR, 'health-tracker-members.json'),
  name: 'health-tracker-members',
  autoCommit: false,
  commitPrefix: 'data',
});

export const medicationStore = new FileStore<MedicationRecord>({
  filePath: path.join(DATA_DIR, 'health-tracker-medications.json'),
  name: 'health-tracker-medications',
  autoCommit: false,
  commitPrefix: 'data',
});

export const appointmentStore = new FileStore<AppointmentRecord>({
  filePath: path.join(DATA_DIR, 'health-tracker-appointments.json'),
  name: 'health-tracker-appointments',
  autoCommit: false,
  commitPrefix: 'data',
});

// ---------------------------------------------------------------------------
// CRUD routers
// ---------------------------------------------------------------------------

const memberCrudRouter = createFileStoreRouter(memberStore, {
  requiredFields: ['name', 'relationship', 'dateOfBirth'],
  beforeCreate: (data) => ({
    ...data,
    gender: data.gender ?? 'other',
    bloodType: data.bloodType ?? '',
    height: data.height ?? '',
    weight: data.weight ?? '',
    allergies: data.allergies ?? [],
    conditions: data.conditions ?? [],
    emergencyContact: data.emergencyContact ?? '',
    insuranceProvider: data.insuranceProvider ?? '',
    insurancePolicyNumber: data.insurancePolicyNumber ?? '',
    primaryDoctor: data.primaryDoctor ?? '',
    notes: data.notes ?? '',
  }),
});

const medicationCrudRouter = createFileStoreRouter(medicationStore, {
  requiredFields: ['memberId', 'memberName', 'name', 'dosage', 'frequency'],
  beforeCreate: (data) => ({
    ...data,
    timeOfDay: data.timeOfDay ?? ['morning'],
    prescribedBy: data.prescribedBy ?? '',
    startDate: data.startDate ?? new Date().toISOString().split('T')[0],
    endDate: data.endDate ?? '',
    refillDate: data.refillDate ?? '',
    pharmacy: data.pharmacy ?? '',
    purpose: data.purpose ?? '',
    sideEffects: data.sideEffects ?? '',
    active: data.active ?? true,
    notes: data.notes ?? '',
  }),
});

const appointmentCrudRouter = createFileStoreRouter(appointmentStore, {
  requiredFields: ['memberId', 'memberName', 'type', 'doctorName', 'date', 'time'],
  beforeCreate: (data) => ({
    ...data,
    facility: data.facility ?? '',
    duration: data.duration ?? 30,
    status: data.status ?? 'scheduled',
    reason: data.reason ?? '',
    diagnosis: data.diagnosis ?? '',
    prescriptions: data.prescriptions ?? '',
    followUpDate: data.followUpDate ?? '',
    reminderDays: data.reminderDays ?? 1,
    cost: data.cost ?? 0,
    insuranceCovered: data.insuranceCovered ?? false,
    notes: data.notes ?? '',
  }),
});

// ---------------------------------------------------------------------------
// Custom routes
// ---------------------------------------------------------------------------

function customRoutes(): Router {
  const router = Router();

  // ---- Dashboard summary ----
  router.get('/dashboard', async (_req, res) => {
    try {
      const members = await memberStore.list();
      const medications = await medicationStore.list();
      const appointments = await appointmentStore.list();

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Active medications count
      const activeMedications = medications.filter((m) => m.active);

      // Upcoming appointments (future + scheduled)
      const upcomingAppointments = appointments
        .filter((a) => a.date >= todayStr && a.status === 'scheduled')
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

      // Medications needing refill (refillDate within 7 days)
      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

      const refillsDue = activeMedications.filter(
        (m) => m.refillDate && m.refillDate <= sevenDaysStr && m.refillDate >= todayStr
      );

      // Appointments by type breakdown
      const appointmentsByType: Record<string, number> = {};
      appointments.forEach((a) => {
        appointmentsByType[a.type] = (appointmentsByType[a.type] ?? 0) + 1;
      });

      // Member summary with their medication & appointment counts
      const memberSummaries = members.map((member) => ({
        id: member.id,
        name: member.name,
        relationship: member.relationship,
        activeMedications: activeMedications.filter((m) => m.memberId === member.id).length,
        upcomingAppointments: upcomingAppointments.filter((a) => a.memberId === member.id).length,
        conditionsCount: member.conditions.length,
        allergiesCount: member.allergies.length,
      }));

      res.json({
        totalMembers: members.length,
        totalActiveMedications: activeMedications.length,
        totalUpcomingAppointments: upcomingAppointments.length,
        refillsDueCount: refillsDue.length,
        upcomingAppointments: upcomingAppointments.slice(0, 5),
        refillsDue,
        appointmentsByType,
        memberSummaries,
      });
    } catch (err) {
      res.status(500).json({ error: 'Dashboard failed', detail: String(err) });
    }
  });

  // ---- Get records for a specific member ----
  router.get('/member/:memberId/summary', async (req, res) => {
    try {
      const { memberId } = req.params;

      const member = await memberStore.get(memberId);
      if (!member) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      const medications = await medicationStore.list();
      const appointments = await appointmentStore.list();

      const memberMedications = medications.filter((m) => m.memberId === memberId);
      const memberAppointments = appointments
        .filter((a) => a.memberId === memberId)
        .sort((a, b) => b.date.localeCompare(a.date));

      res.json({
        member,
        medications: memberMedications,
        appointments: memberAppointments,
      });
    } catch (err) {
      res.status(500).json({ error: 'Member summary failed', detail: String(err) });
    }
  });

  // ---- Today's medication schedule ----
  router.get('/medications/today', async (_req, res) => {
    try {
      const medications = await medicationStore.list();
      const todayStr = new Date().toISOString().split('T')[0];

      const todaysMeds = medications.filter((m) => {
        if (!m.active) return false;
        if (m.startDate && m.startDate > todayStr) return false;
        if (m.endDate && m.endDate < todayStr) return false;
        return true;
      });

      // Group by time of day
      const schedule: Record<string, typeof todaysMeds> = {};
      todaysMeds.forEach((med) => {
        (med.timeOfDay ?? ['morning']).forEach((time) => {
          if (!schedule[time]) schedule[time] = [];
          schedule[time].push(med);
        });
      });

      res.json({ date: todayStr, schedule, totalMeds: todaysMeds.length });
    } catch (err) {
      res.status(500).json({ error: 'Today schedule failed', detail: String(err) });
    }
  });

  return router;
}

// ---------------------------------------------------------------------------
// Combined router
// ---------------------------------------------------------------------------

export function getHealthTrackerRouter(): Router {
  const router = Router();
  router.use('/', customRoutes());
  router.use('/members', memberCrudRouter);
  router.use('/medications', medicationCrudRouter);
  router.use('/appointments', appointmentCrudRouter);
  return router;
}
