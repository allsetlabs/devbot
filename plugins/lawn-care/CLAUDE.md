# Lawn Care Plugin

A DevBot plugin for managing a home lawn — tracking lawn profiles (grass type, zone, irrigation), capturing photos over time, and letting Claude generate seasonal care plans. The plan-generation worker calls Claude with the profile + recent photos and writes a structured plan back to the database.

The plugin is a self-contained module: its own SQLite database (`lawn-care.db`), its own Express router, its own frontend pages imported by the DevBot app. It has no independent lifecycle — the DevBot backend mounts its router and the app imports its pages.

## Structure

```
backend/
├── schema.ts           # Drizzle tables: lawn_care_profiles, lawn_care_plans, lawn_care_photos
├── db.ts               # Initializes lawn-care.db on first use
├── routes.ts           # export default function getRouter(db) — mounted at /api/plugins/lawn-care
├── handlers/
│   ├── profiles.ts     # CRUD for lawn profiles
│   ├── plans.ts        # Plan generation + retrieval (triggers Claude worker)
│   └── photos.ts       # Photo uploads + listing
├── types.ts            # TypeScript types derived from schema
└── index.ts            # Barrel export

frontend/
├── api.ts              # API client for the plugin's backend routes
├── pages/              # Route-level screens imported by the DevBot app
└── index.ts            # Barrel export
```

## Conventions

- **Table prefix** — all tables are prefixed `lawn_care_` to prevent collisions.
- **Standard columns** — `created_by` / `updated_by` / `created_at` / `updated_at` / `settings` on every table, per root CLAUDE.md.
- **Flexible fields go in `settings`** — prefer pushing new optional fields into the JSON `settings` column over adding schema columns.
- **Plan generation** — `plans.ts` spawns a Claude worker that reads the profile + photos and writes a plan back. Follow the worker patterns enforced by the `devbot-worker-patterns` skill (stream-json parsing, incremental persistence, cleanup).
- **Photos** — stored on disk via the backend's upload route; the DB row holds the file reference plus EXIF/metadata in `settings`.
- **Router factory** — `routes.ts` exports a `getRouter(db)` function; the backend imports and mounts it.
