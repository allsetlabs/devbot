/** Trip Planner Plugin — shared types. */

export interface TripActivity {
  id: string;
  /** Time of day, e.g. "09:00" or "morning" */
  time: string;
  title: string;
  description: string;
  /** Address or place name */
  location: string;
  lat?: number;
  lng?: number;
  /** Human-readable, e.g. "2 hours" */
  duration: string;
  category: TripActivityCategory;
  /** Cost in trip currency */
  cost?: number;
  notes?: string;
  booked: boolean;
  bookingRef?: string;
}

export type TripActivityCategory =
  | 'transport'
  | 'food'
  | 'activity'
  | 'lodging'
  | 'shopping'
  | 'other';

export interface TripDay {
  id: string;
  /** ISO date string, e.g. "2026-12-25" */
  date: string;
  /** Friendly label, e.g. "Day 1 — Arrival" */
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

export type TripStatus = 'planning' | 'booked' | 'in-progress' | 'completed';

export interface TripRecord {
  id: string;
  name: string;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  coverEmoji: string;
  days: TripDay[];
  expenses: TripExpense[];
  budget: number;
  currency: string;
  tags: string[];
  notes: string;
  travelers: string[];
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}
