# DevBot

DevBot is a personal assistant mobile app that acts as a Claude Code terminal proxy. Users trigger development tasks globally via the DevBot mobile app, which opens a web-based terminal (xterm.js) connected to a Node.js backend that manages Claude Code sessions through tmux.

The app supports a plugin system where each plugin (baby-logs, lawn-care, etc.) is a self-contained module with its own SQLite database, routes, and schema.

## Structure

```
devbot/
├── app/         # Web app (Vite + React + xterm.js)
├── backend/     # Node.js session manager (xterm-ws + tmux)
├── supabase/    # Local Supabase (session persistence + migrations)
├── intro-video/ # Remotion intro video project
└── plugins/     # Plugin modules (baby-logs, lawn-care, etc.)
```

## AI-Native Database Standards

DevBot uses **Drizzle ORM + SQLite** for persistence with a focus on AI-native features.

### Database-Per-Plugin Architecture

- **`devbot.db`** - Core DevBot features (sessions, chats, schedulers, plans)
- **`baby-logs.db`** - Baby Logs plugin data
- **`lawn-care.db`** - Lawn Care plugin data

Each plugin owns its own SQLite database file. This prevents plugin errors from affecting core functionality or other plugins. Plugins self-initialize their database via `db.ts`.

### Standard Columns (All Tables)

Every table MUST include these columns:

```ts
created_by: text('created_by').notNull().default('user');
// Any string identifying the entry source: 'user', 'AI', 'plugin:baby-logs', 'system', 'api', etc.

created_at: text('created_at')
  .notNull()
  .$defaultFn(() => new Date().toISOString());
// ISO timestamp when entry was created

updated_by: text('updated_by').notNull().default('user');
// Any string identifying who/what last modified this entry

updated_at: text('updated_at')
  .notNull()
  .$defaultFn(() => new Date().toISOString());
// ISO timestamp of last update

settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({});
// Flexible JSONB column for optional/evolving fields - avoids schema migrations
```

### JSONB `settings` Column Strategy

To prevent backend restarts during development, push optional/flexible fields into `settings` instead of adding new columns:

**Bad (requires migration + restart):**

```ts
// Adding new columns forces schema changes
chat_model: text('chat_model'),     // New column
temperature: real('temperature'),   // New column
```

**Good (no restart needed):**

```ts
settings: jsonb('settings').default({});
// Contains: { model: 'sonnet', temperature: 0.7, ... }
```

Application code accesses settings: `chat.settings.model` or with fallback: `chat.settings.model ?? 'sonnet'`

### Plugin Architecture

**Location:** `plugins/{plugin-name}/`

**Table Naming:** All plugin tables MUST be prefixed with `{plugin_name}_`:

- `baby_logs_logs` - Baby Logs entries
- `baby_logs_profiles` - Baby profiles
- `lawn_care_profiles` - Lawn profiles
- `lawn_care_plans` - Lawn care plans
- `lawn_care_photos` - Lawn photos

Prevents collisions in shared `plugins.db`.

**Structure:**

```
plugins/{plugin-name}/
├── src/
│   ├── backend/
│   │   ├── schema.ts        # Drizzle schema with prefixed table names
│   │   ├── handlers/        # API handlers split by domain
│   │   ├── routes.ts        # export default function getRouter(db): Router
│   │   └── types.ts         # TypeScript types from schema
│   └── index.ts             # Barrel export
└── package.json
```

**Router Factory Pattern:**

```ts
// Each plugin exports: (db) => Express.Router
export default function getBabyLogsRouter(db: DrizzleInstance): Router {
  const router = Router();
  router.get('/logs', async (req, res) => {
    const rows = await db.select().from(baby_logs_logs);
    res.json(rows);
  });
  return router;
}
```

Plugin registration in backend `index.ts`:

```ts
import { getBabyLogsRouter } from '@devbot/plugin-baby-logs';

app.use('/api/plugins/baby-logs', getBabyLogsRouter());
```

### Mutation Best Practices

When inserting or updating, always set `created_by`/`updated_by` to identify the source:

```ts
// Create entry
await db.insert(interactive_chats).values({
  id: uuidv4(),
  name: 'New Chat',
  created_by: 'user',
  updated_by: 'user',
  settings: {},
});

// Update entry
await db
  .update(interactive_chats)
  .set({
    name: 'Updated',
    updated_by: 'AI',
  })
  .where(eq(interactive_chats.id, chatId));
```

### Migration Notes

- Drizzle schema is defined in TypeScript (not SQL)
- SQLite databases auto-initialize on first startup via `initializeCoreDatabase()`
- No separate migration files needed during development
- Foreign key constraints enabled: `PRAGMA foreign_keys = ON`
