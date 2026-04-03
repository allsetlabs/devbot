import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Baby logs table
export const babyLogsTable = sqliteTable('baby_logs_logs', {
  id: text('id').primaryKey(),
  logType: text('log_type', {
    enum: ['feeding', 'diaper', 'weight', 'height', 'head_circumference'],
  }).notNull(),
  feedingType: text('feeding_type', { enum: ['bottle', 'breast'] }),
  feedingDurationMin: integer('feeding_duration_min'),
  feedingMl: real('feeding_ml'),
  breastSide: text('breast_side', { enum: ['left', 'right', 'both'] }),
  diaperWetPct: integer('diaper_wet_pct'),
  diaperPoop: text('diaper_poop', { enum: ['small', 'large'] }),
  fedBy: text('fed_by'),
  note: text('note'),
  weightKg: real('weight_kg'),
  heightCm: real('height_cm'),
  headCircumferenceCm: real('head_circumference_cm'),
  loggedAt: text('logged_at').notNull(),
  createdBy: text('created_by'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text('updated_by'),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  settings: blob('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
});

// Baby profiles table
export const babyProfilesTable = sqliteTable('baby_logs_profiles', {
  id: text('id').primaryKey(),
  firstName: text('first_name').notNull(),
  middleName: text('middle_name'),
  lastName: text('last_name').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  timeOfBirth: text('time_of_birth'),
  gender: text('gender', { enum: ['male', 'female'] }).notNull(),
  bloodType: text('blood_type'),
  placeOfBirth: text('place_of_birth'),
  cityOfBirth: text('city_of_birth'),
  stateOfBirth: text('state_of_birth'),
  countryOfBirth: text('country_of_birth'),
  citizenship: text('citizenship'),
  fatherName: text('father_name'),
  motherName: text('mother_name'),
  birthWeightKg: real('birth_weight_kg'),
  birthHeightCm: real('birth_height_cm'),
  gestationalWeek: integer('gestational_week'),
  note: text('note'),
  createdBy: text('created_by'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text('updated_by'),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  settings: blob('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
});

export type BabyLog = typeof babyLogsTable.$inferSelect;
export type BabyLogInsert = typeof babyLogsTable.$inferInsert;
export type BabyProfile = typeof babyProfilesTable.$inferSelect;
export type BabyProfileInsert = typeof babyProfilesTable.$inferInsert;
