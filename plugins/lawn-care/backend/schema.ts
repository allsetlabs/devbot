import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Lawn profiles table
export const lawnProfilesTable = sqliteTable('lawn_care_profiles', {
  id: text('id').primaryKey(),
  address: text('address').notNull(),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  grassType: text('grass_type').notNull(),
  sqft: integer('sqft'),
  climateZone: text('climate_zone'),
  sunExposure: text('sun_exposure', { enum: ['full_sun', 'partial_shade', 'full_shade'] }),
  applicationMethod: text('application_method', { enum: ['spreader', 'sprayer'] }),
  equipmentModel: text('equipment_model'),
  notes: text('notes'),
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

// Lawn plans table
export const lawnPlansTable = sqliteTable('lawn_care_plans', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  chatId: text('chat_id'),
  status: text('status', { enum: ['generating', 'completed', 'failed'] }).notNull(),
  planData: blob('plan_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  errorMessage: text('error_message'),
  generatedAt: text('generated_at'),
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

// Lawn photos table
export const lawnPhotosTable = sqliteTable('lawn_care_photos', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  applicationOrder: integer('application_order'),
  filePath: text('file_path').notNull(),
  caption: text('caption'),
  takenAt: text('taken_at').notNull(),
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

export type LawnProfile = typeof lawnProfilesTable.$inferSelect;
export type LawnProfileInsert = typeof lawnProfilesTable.$inferInsert;
export type LawnPlan = typeof lawnPlansTable.$inferSelect;
export type LawnPlanInsert = typeof lawnPlansTable.$inferInsert;
export type LawnPhoto = typeof lawnPhotosTable.$inferSelect;
export type LawnPhotoInsert = typeof lawnPhotosTable.$inferInsert;
