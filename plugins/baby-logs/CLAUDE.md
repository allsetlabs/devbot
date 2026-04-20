# Baby Logs Plugin

A DevBot plugin for tracking baby activities — feedings, diapers, sleep, milestones — across one or more baby profiles. Designed for quick one-tap logging on mobile by a tired parent, and for Claude to read/summarize patterns on demand.

The plugin is a self-contained module: its own SQLite database (`baby-logs.db`), its own Express router, its own frontend pages imported by the DevBot app. It has no independent lifecycle — the DevBot backend mounts its router and the app imports its pages.

## Structure

```
backend/
├── schema.ts           # Drizzle tables: baby_logs_logs, baby_logs_profiles
├── db.ts               # Initializes baby-logs.db on first use
├── routes.ts           # export default function getRouter(db) — mounted at /api/plugins/baby-logs
├── handlers/
│   ├── logs.ts         # CRUD for log entries
│   └── profiles.ts     # CRUD for baby profiles
├── types.ts            # TypeScript types derived from schema
└── index.ts            # Barrel export

frontend/
├── api.ts              # API client for the plugin's backend routes
├── pages/              # Route-level screens imported by the DevBot app
├── components/         # Plugin-specific UI
├── lib/
└── index.ts            # Barrel export
```

## Conventions

- **Table prefix** — all tables are prefixed `baby_logs_` to prevent collisions if databases are ever merged.
- **Standard columns** — `created_by` / `updated_by` / `created_at` / `updated_at` / `settings` on every table, per root CLAUDE.md. Set `created_by` to `'user'`, `'AI'`, or a specific source when inserting.
- **Flexible fields go in `settings`** — prefer pushing new optional fields into the JSON `settings` column over adding schema columns. Avoids migrations + backend restarts during dev.
- **Router factory** — `routes.ts` exports a `getRouter(db)` function; the backend imports and mounts it. Don't create an Express app here.
