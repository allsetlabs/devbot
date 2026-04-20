# DevBot App

The DevBot web/mobile app — a React + Vite SPA that acts as a remote control for the DevBot backend. Users trigger Claude Code sessions, view interactive chats, manage schedulers, browse plugin data (baby logs, lawn care, etc.), and interact with xterm.js terminals streamed from the backend over WebSockets.

The app is designed mobile-first: it's the interface the user reaches for while away from their desktop to kick off development tasks, monitor long-running AI workers, and read/write plugin entries.

## Structure

```
src/
├── App.tsx                 # Root component + router setup
├── main.tsx                # Entry — wraps in InitializeReusableChunks
├── pages/                  # Route-level screens (ChatList, ChatView, Dashboard, SchedulerList, etc.)
├── components/             # Shared UI (ChatMessage, XtermTerminal, SlideNav, drawers, widgets)
├── hooks/                  # Custom React hooks
├── lib/                    # API client + utilities
└── types/                  # App-wide TypeScript types
```

## Key Patterns

- **Shared components from `@allsetlabs/reusable`** — never re-implement buttons, dialogs, inputs, etc. Import from the reusables workspace.
- **Pages stay thin** — page files under `src/pages/` are capped at ~200 lines (enforced by `devbot-page-size-guard` skill). Extract heavy logic into components or hooks.
- **Xterm connection** — `XtermTerminal.tsx` attaches to a backend WebSocket on ports `7750–7799` (one per session). The backend picks the port; the app receives it from the session API.
- **Plugin frontends** — plugin UIs live in the plugin workspace (e.g. `plugins/baby-logs/frontend`) and are imported by this app. Don't duplicate plugin pages here.
- **Mobile clipboard + HTTPS** — the app is served over HTTPS (via mkcert certs in `../certs/`) so clipboard APIs work on mobile Chrome.
