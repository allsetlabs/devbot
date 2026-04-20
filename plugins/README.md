# DevBot Plugin Architecture

This directory contains isolated plugin modules that extend DevBot functionality. Each plugin is a self-contained module with its own database, schema, types, and API routes.

## Architecture Overview

- **Isolated Databases**: Each plugin has its own SQLite database (e.g., `baby-logs.db`, `lawn-care.db`)
- **Schema Isolation**: Tables are prefixed by plugin name (e.g., `baby_logs_logs`, `lawn_care_profiles`)
- **Self-Initializing**: Each plugin creates and initializes its own database on startup
- **Factory Pattern**: Each plugin exports a `getRouter()` factory function (no db parameter needed)
- **Standard Columns**: All tables include `created_by`, `created_at`, `updated_by`, `updated_at`, `settings` (JSONB)

## Plugins

### Baby Logs

Location: `plugins/baby-logs/`
Database: `baby-logs.db` (env: `DB_BABY_LOGS_PATH`)

**Tables:**

- `baby_logs_logs` - Baby activity logs (feeding, diaper, measurements)
- `baby_logs_profiles` - Baby profile information

**API Routes** (mounted at `/api/plugins/baby-logs`):

- `GET/POST /logs` - List and create logs
- `GET/PATCH/DELETE /logs/:id` - Get, update, delete log
- `GET/POST /profiles` - List and create profiles
- `GET/PATCH/DELETE /profiles/:id` - Get, update, delete profile

**Exports:**

```typescript
import { getBabyLogsRouter, babyLogsTable, babyProfilesTable } from '@devbot/baby-logs';
```

### Lawn Care

Location: `plugins/lawn-care/`
Database: `lawn-care.db` (env: `DB_LAWN_CARE_PATH`)

**Tables:**

- `lawn_care_profiles` - Lawn profile information
- `lawn_care_plans` - Lawn treatment plans (generated or manual)
- `lawn_care_photos` - Progress photos with metadata

**API Routes** (mounted at `/api/plugins/lawn-care`):

- `GET/POST /profiles` - List and create profiles
- `GET/PATCH/DELETE /profiles/:id` - Get, update, delete profile
- `GET/POST /plans` - List and create plans
- `GET /plans/:id/status` - Check generation status
- `POST /plans/generate` - Generate new plan via AI
- `GET/PATCH/DELETE /plans/:id` - Get, update, delete plan
- `GET /photos` - List photos for a profile
- `POST /photos` - Upload photo
- `PATCH/DELETE /photos/:id` - Update or delete photo

**Exports:**

```typescript
import {
  getLawnCareRouter,
  lawnProfilesTable,
  lawnPlansTable,
  lawnPhotosTable,
} from '@devbot/lawn-care';
```

## Plugin Structure

```
plugin-name/
├── package.json              # Plugin dependencies
└── src/
    ├── backend/
    │   ├── db.ts             # Plugin database initialization
    │   ├── schema.ts         # Drizzle schema tables
    │   ├── types.ts          # API response types
    │   ├── routes.ts         # getRouter() factory
    │   └── handlers/
    │       ├── resource.ts   # Route handlers for resource
    │       └── ...
    └── index.ts              # Barrel exports
```

## Creating a New Plugin

1. Create plugin directory: `plugins/plugin-name/`

2. Create `package.json`:

```json
{
  "name": "@devbot/plugin-name",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "better-sqlite3": "11.8.1",
    "drizzle-orm": "0.33.0",
    "express": "4.21.2",
    "uuid": "11.1.0"
  }
}
```

3. Create `src/backend/db.ts` with database initialization:

```typescript
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';

const dbPath = process.env.DB_PLUGIN_NAME_PATH;
if (!dbPath) {
  console.error('[ENV] Missing required environment variable: DB_PLUGIN_NAME_PATH');
  process.exit(1);
}
const sqliteDb = new BetterSqlite3(dbPath);
sqliteDb.pragma('foreign_keys = ON');

export const pluginNameDb = drizzle(sqliteDb, { schema });
export type PluginNameDb = typeof pluginNameDb;

export function initializePluginNameDatabase(): void {
  // CREATE TABLE IF NOT EXISTS statements...
}
```

4. Create Drizzle schema with prefixed tables in `src/backend/schema.ts`

5. Create API types in `src/backend/types.ts`

6. Create handlers in `src/backend/handlers/` (one file per resource)

7. Export router factory in `src/backend/routes.ts`:

```typescript
import { Router } from 'express';
import { pluginNameDb, initializePluginNameDatabase } from './db.js';

export default function getPluginNameRouter(): Router {
  initializePluginNameDatabase();
  const router = Router();
  // Mount handlers using pluginNameDb...
  return router;
}
```

8. Export from `src/index.ts`:

```typescript
export { default as getPluginNameRouter } from './backend/routes.js';
export * from './backend/schema.js';
export * from './backend/types.js';
export * from './backend/db.js';
```

9. Register plugin in backend `src/index.ts`:

```typescript
import { getPluginNameRouter } from '@devbot/plugin-name';
// ...
app.use('/api/plugins/plugin-name', getPluginNameRouter());
```

10. Add env var to `.env`:

```
DB_PLUGIN_NAME_PATH=./plugin-name.db
```

## Standard Columns

All plugin tables should include these standard columns:

| Column       | Type                           | Purpose                               |
| ------------ | ------------------------------ | ------------------------------------- |
| `id`         | TEXT PRIMARY KEY               | Unique identifier (uuid.slice(0, 12)) |
| `created_by` | TEXT NULL                      | User ID who created the record        |
| `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | Creation timestamp                    |
| `updated_by` | TEXT NULL                      | User ID who last updated              |
| `updated_at` | TEXT DEFAULT CURRENT_TIMESTAMP | Last update timestamp                 |
| `settings`   | BLOB JSON NULL                 | Plugin-specific metadata              |

## Naming Conventions

- **Table Names**: `plugin_name_resource_name` (snake_case with plugin prefix)
- **Column Names**: `snake_case` in schema, `camelCase` in API responses
- **API Routes**: Relative paths mounted at `/api/plugins/plugin-name`
- **Exports**: `getPluginNameRouter`, `pluginNameTable`, etc.
- **Database Files**: `plugin-name.db` (kebab-case)
- **Env Vars**: `DB_PLUGIN_NAME_PATH` (SCREAMING_SNAKE_CASE)

## Testing

```bash
# Install all plugin dependencies
make install

# Run backend with plugins
make start

# Test plugin API (requires API_KEY header)
curl -H "X-API-Key: your-key" http://localhost:3100/api/plugins/baby-logs/logs
```

## Notes

- Plugins do NOT have their own servers; they integrate into the main DevBot backend
- Each plugin owns and manages its own SQLite database file
- Plugin database corruption won't affect the core `devbot.db` or other plugins
- All mutations should track `created_by` and `updated_by` (if user context is available)
- Use Drizzle ORM for all database access (no Supabase queries in plugins)
- Plugin routes should return consistent error messages
- Photos/files use the `.tmp/devbot-uploads/` directory shared with core backend
