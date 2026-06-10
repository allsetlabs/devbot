# DevBot

## Purpose

Personal assistant mobile app that acts as a Claude Code terminal proxy — trigger development tasks from your phone anywhere.

## Mental Model

Users open the DevBot mobile app to launch a web-based terminal (xterm.js) connected to a Node.js backend that manages Claude Code sessions via tmux. The backend supports a plugin system where each plugin (baby-logs, lawn-care, etc.) is self-contained with its own SQLite database, routes, and schema. Sessions are persisted via Supabase.

## Where Things Go

```
devbot/
├── app/         # Web app (Vite + React + xterm.js terminal UI)
├── backend/     # Node.js session manager (xterm-ws + tmux + Claude Code runner)
├── reusables/   # Shared component library (@allsetlabs/reusable symlink)
├── supabase/    # Local Supabase (session persistence + migrations)
├── intro-video/ # Remotion intro video project
└── plugins/     # Plugin modules (baby-logs, lawn-care, etc.)
```

Stack: Vite + React + TypeScript (app), Node.js + TypeScript + Express (backend), Drizzle ORM + SQLite (per-plugin DBs), Supabase (session storage).

## Development Commands

- `make setup` — install/check system dependencies
- `make install` — install app, backend, plugin, reusable, and intro-video dependencies
- `make start` — start DevBot through the managed tmux entry point
- `make stop` — stop DevBot only when explicitly approved
- `npm run type-check` from `app/`, `backend/`, and `reusables/` — verify TypeScript changes
- `npm run test` from `app/` — run app tests

## Current Capabilities

Core terminal proxy is functional. Plugin system is live with baby-logs and lawn-care. Scheduler system runs automated Claude tasks. Interactive chats with message queuing are implemented.

## Testing Expectations

Run the relevant package `type-check` command after code changes. For app UI changes, visually test the affected page and check the browser console. For backend/session changes, do not restart the running DevBot process unless the user approves it.

## Autonomy

DevBot sessions are automated — the user is often away. **Minimize questions.** Make a decision and run. Only ask when a wrong guess would cause real damage (deleting data, wrong module). For ambiguous choices, pick the best option and move forward.

## Critical: Do Not Restart DevBot

**Never restart DevBot without explicit user permission.** No `kill`, no `tmux send-keys C-c`, no manual `npm run dev`. Active Claude workers and chats will be dropped. The only safe restart is `make start` from the repo root, run in an external Terminal.

## Database Architecture

Uses **Drizzle ORM + SQLite** with a database-per-plugin pattern:

- **`devbot.db`** — Core features (sessions, chats, schedulers, plans)
- **`baby-logs.db`** — Baby Logs plugin
- **`lawn-care.db`** — Lawn Care plugin

Each plugin owns its SQLite file and self-initializes via `db.ts`.

### Standard Columns (All Tables)

Every table MUST include:

```ts
created_by: text('created_by').notNull().default('user');
created_at: text('created_at').notNull().$defaultFn(() => new Date().toISOString());
updated_by: text('updated_by').notNull().default('user');
updated_at: text('updated_at').notNull().$defaultFn(() => new Date().toISOString());
settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({});
```

### JSONB `settings` Column Strategy

Push optional/flexible fields into `settings` instead of adding new columns — avoids schema migrations and backend restarts:

```ts
// Good: no migration needed
settings: { model: 'sonnet', temperature: 0.7 }
// Access: chat.settings.model ?? 'sonnet'
```

## Plugin Architecture

**Location:** `plugins/{plugin-name}/`

**Table naming:** All plugin tables MUST be prefixed with `{plugin_name}_` (e.g., `baby_logs_logs`, `lawn_care_plans`).

**Structure:**
```
plugins/{plugin-name}/
├── src/
│   ├── backend/
│   │   ├── schema.ts    # Drizzle schema with prefixed table names
│   │   ├── handlers/    # API handlers split by domain
│   │   ├── routes.ts    # export default function getRouter(db): Router
│   │   └── types.ts     # TypeScript types from schema
│   └── index.ts         # Barrel export
└── package.json
```

**Router factory pattern:**
```ts
export default function getBabyLogsRouter(db: DrizzleInstance): Router {
  const router = Router();
  router.get('/logs', async (req, res) => { ... });
  return router;
}
```

Plugin registration in backend `index.ts`:
```ts
app.use('/api/plugins/baby-logs', getBabyLogsRouter());
```

### Mutation Best Practices

Always set `created_by`/`updated_by` to identify the source on insert/update:
```ts
await db.insert(table).values({ ..., created_by: 'user', updated_by: 'user', settings: {} });
await db.update(table).set({ updated_by: 'AI' }).where(eq(table.id, id));
```

### Migration Notes

- Schema defined in TypeScript (Drizzle), not SQL
- Databases auto-initialize on startup via `initializeCoreDatabase()`
- No separate migration files during development
- Foreign keys enabled: `PRAGMA foreign_keys = ON`
