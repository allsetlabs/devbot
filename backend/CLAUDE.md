# DevBot Backend

The DevBot backend — an Express + vite-node server that manages Claude Code sessions through tmux, streams terminal output to the app over WebSockets, persists session state in SQLite, and hosts the plugin router registry.

This is the process the mobile app talks to. It spawns `claude` CLI workers, runs schedulers on cron, records interactive chat streams, and delegates plugin-specific routes (baby logs, lawn care) to plugin modules.

## Structure

```
src/
├── index.ts                  # Express app + route + WebSocket setup
├── routes/                   # Core DevBot HTTP routes (sessions, chats, schedulers, plans, uploads…)
└── lib/
    ├── db/                   # Drizzle + better-sqlite3 setup (devbot.db + plugin DBs)
    ├── xterm-ws.ts           # WebSocket handler for xterm.js terminals (ports 7750–7799)
    ├── tmux.ts               # tmux session spawn/attach/kill helpers
    ├── claude-spawn.ts       # Claude CLI worker spawning
    ├── stream-parser.ts      # Parses Claude stream-json events
    ├── interactive-chat-worker.ts  # Long-running chat worker process
    ├── scheduler-worker.ts   # Cron-triggered Claude worker
    ├── session-recovery.ts   # Re-attach to orphaned tmux sessions on restart
    ├── https-cert.ts         # Loads mkcert certs for HTTPS
    └── route-helpers.ts      # Shared request/response helpers
```

## Key Patterns

- **Database-per-plugin** — `devbot.db` holds core tables; each plugin owns its own SQLite file (`baby-logs.db`, `lawn-care.db`). See root CLAUDE.md for schema conventions.
- **Plugin router mounting** — `index.ts` imports each plugin's `getRouter(db)` factory and mounts at `/api/plugins/<name>`. To add a plugin, wire it here.
- **Xterm WebSocket ports** — sessions grab a free port in `7750–7799`. The range is hardcoded; don't move it without updating `make start` cleanup.
- **Supabase queries must check errors** — enforced by the `devbot-supabase-safety` skill. Always destructure `{ data, error }` and handle `error` before using `data`.
- **Worker spawning contract** — Claude CLI workers are spawned with `--output-format=stream-json`; parse events with `stream-parser.ts` and persist messages incrementally. See `devbot-worker-patterns` skill.
- **Route file shape** — keep CRUD handlers in `routes/<domain>.ts`; follow the handler patterns enforced by `devbot-backend-crud-patterns`. Heavy business logic goes in `lib/`.
- **HTTPS in dev** — the backend listens over HTTPS using certs from `../certs/`. The app fetches the certs' host.
