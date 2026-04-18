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

## Autonomy

DevBot sessions are automated — the user is often away or multitasking. **Minimize questions.** Use your best intuition, make a decision, and run. Only ask when a wrong guess would cause real damage (e.g., deleting data, picking the wrong module entirely). For ambiguous choices — file structure, naming, implementation approach — pick the best option and move forward. The user will correct you if needed.

## Every Module Must Have a CLAUDE.md

Every module MUST have a `CLAUDE.md` at its root. The CLAUDE.md should:

- **Explain what the project is about** — what it does, who it's for, and how it works. This is the most important part. The AI agent needs to understand the project's purpose and vision to make good decisions.
- **Document module-specific patterns** — architecture, database schemas, plugin systems, or anything unique to that module that an agent needs to know.
- **NOT repeat information from the root CLAUDE.md** — do not duplicate standard Makefile commands (`make setup`, `make install`, `make start`), port tables, lint/test commands, or code standards. Those are defined once at the root and apply everywhere.
- **Keep it lean** — do not add minor, non-important things. Every line in a CLAUDE.md consumes context. Only include information that changes how an agent works on the module.

## Required Makefile with Three Commands

Every module MUST have a `Makefile` at its root with exactly these three targets:

| Target         | Purpose                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `make setup`   | Install **system-level** dependencies (e.g., Go, Python, PostgreSQL, Redis, tmux). Check if each dependency already exists before installing. |
| `make install` | Install **project-level** dependencies (e.g., `npm install`, `pip install`, `cargo build`).                                                   |
| `make start`   | Start **all services** the module needs (frontend, backend, DB, workers, etc.) in a single command.                                           |

`make setup` should be idempotent — safe to run multiple times. It checks for the presence of each tool (e.g., `command -v python3`) and only installs what's missing. If the module requires specific skills or tools beyond standard packages, `setup` installs those too.

`make install` handles language-level package managers only — `npm install`, `pip install -r requirements.txt`, `bundle install`, etc.

`make start` is the single entry point to run the entire module locally. It goes into the necessary subdirectories and starts each service. Use tmux sessions for multi-service modules so everything runs in one command.

## Port Hardcoding Rules

Every module MUST hardcode its ports as **Makefile variables** at the top of the Makefile, and pass them to start commands via CLI flags. This keeps port assignments visible, centralized, and overridable.

**Where to hardcode:**

- **Frontend (Node/Vite):** In `package.json` start script or passed as `--port=XXXX` flag from the Makefile
- **Backend (Node):** Pass as CLI argument in the start command (e.g., `node src/index.ts --port=XXXX` or via the Makefile's start target)
- **Backend (Python):** Pass as `--port=XXXX` to uvicorn/gunicorn from the Makefile
- **Database:** Use the standard port or define in the Makefile variable

**NEVER hardcode ports in `.env` files or config files.** The Makefile is the single source of truth for ports. If someone needs to override, they change the Makefile variable — not hunt through env files.

**Example Makefile pattern:**

```makefile
# === Port Configuration ===
APP_PORT    := 4005
BACKEND_PORT := 3100

.PHONY: setup install start stop

setup:
	@echo "Checking system dependencies..."
	@command -v node >/dev/null 2>&1 || { echo "Installing Node.js..."; brew install node; }
	@command -v tmux >/dev/null 2>&1 || { echo "Installing tmux..."; brew install tmux; }

install:
	cd app && npm install
	cd backend && npm install

start:
	@echo "Starting services on ports $(APP_PORT) and $(BACKEND_PORT)..."
	# Kill existing processes on these ports
	@lsof -ti:$(APP_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti:$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	# Start in tmux
	tmux new-session -d -s mymodule -n backend "cd backend && npm run dev -- --port=$(BACKEND_PORT)"
	tmux new-window -t mymodule -n app "cd app && npm run dev -- --port=$(APP_PORT)"
	tmux attach -t mymodule

stop:
	@lsof -ti:$(APP_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti:$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@tmux kill-session -t mymodule 2>/dev/null || true
```

## Shared Component Library

**All frontend modules MUST use components from `reusables`.**

Refer to the reusables module's own `CLAUDE.md` and documentation for usage instructions, available styles, and how to create new components.

## Code Standards

**All rules, forbidden patterns, detection methods, and auto-fix instructions live in the `coding-standards` skill** (`.claude/skills/coding-standards/SKILL.md`). Read that skill before writing or reviewing code.

Run `/fix-coding-standards` to auto-fix violations across all modules.

## After Every Change

Run validation from the module's root:

```bash
npm run lint         # Fix linting errors
npm run type-check   # Fix TypeScript errors
```

### Visual Testing in Chrome

**Only when your change affects something visually testable** — a UI component, a page layout, a styling change, a new screen, or a user-facing interaction. Do NOT test for backend-only changes, config changes, schema changes, utility functions, or anything that has no visible output in a browser.

When visual testing applies, use the Chrome MCP tools (`mcp__claude-in-chrome__*`) to:

1. Navigate to the affected page
2. Take a screenshot and verify the UI renders correctly
3. Click buttons and interact with the feature
4. Confirm the expected behavior works end-to-end

This catches runtime errors, styling issues, and integration bugs that linting/type-checking miss.

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
