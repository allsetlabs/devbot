/** Health Tracker Plugin — shared types. */

// ---------------------------------------------------------------------------
// Standard FileStore fields included in every record
// ---------------------------------------------------------------------------

interface BaseRecord {
  id: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Family Members
// ---------------------------------------------------------------------------

export type Gender = 'male' | 'female' | 'other';

export interface MemberRecord extends BaseRecord {
  name: string;
  relationship: string;
  dateOfBirth: string;
  gender: Gender;
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

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------

export type MedicationFrequency =
  | 'daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'weekly'
  | 'monthly'
  | 'as_needed';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'with_meals';

export interface MedicationRecord extends BaseRecord {
  memberId: string;
  memberName: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
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

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export type AppointmentType =
  | 'checkup'
  | 'specialist'
  | 'dental'
  | 'vision'
  | 'vaccination'
  | 'lab_work'
  | 'therapy'
  | 'emergency'
  | 'follow_up'
  | 'other';

export type AppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'no_show';

export interface AppointmentRecord extends BaseRecord {
  memberId: string;
  memberName: string;
  type: AppointmentType;
  doctorName: string;
  facility: string;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
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
// Dashboard & summaries
// ---------------------------------------------------------------------------

export interface MemberSummary {
  id: string;
  name: string;
  relationship: string;
  activeMedications: number;
  upcomingAppointments: number;
  conditionsCount: number;
  allergiesCount: number;
}

export interface DashboardData {
  totalMembers: number;
  totalActiveMedications: number;
  totalUpcomingAppointments: number;
  refillsDueCount: number;
  upcomingAppointments: AppointmentRecord[];
  refillsDue: MedicationRecord[];
  appointmentsByType: Record<string, number>;
  memberSummaries: MemberSummary[];
}

export interface TodaySchedule {
  date: string;
  schedule: Record<string, MedicationRecord[]>;
  totalMeds: number;
}
