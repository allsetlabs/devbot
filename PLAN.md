# DevBot - Personal Assistant Bot

## Project Plan

---

## 1. Vision

A mobile app that gives you direct access to Claude Code running on your personal server. You type on your phone, Claude Code executes in a real terminal with full filesystem access, MCP tools, and the ability to modify its own codebase. Think: ChatGPT mobile, but backed by a full development environment instead of just an API.

**Core principle:** The mobile app is a terminal proxy. The backend is just a pipe. Claude Code is the brain.

---

## 2. Architecture

### High-Level Overview

```
+------------------+                        +----------------------------------+
|   Mobile App     |                        |        Your Server               |
|  (Capacitor +    |       WebSocket        |                                  |
|   Vite + React)  |<---------------------->|   Node.js Manager (~50 lines)   |
|                  |                        |          |                       |
|  +------------+  |                        |    +-----v-----+                |
|  |  xterm.js  |  |   bidirectional pipe   |    |   ttyd    |                |
|  |  terminal  |  |<---------------------->|    |  :7681    |                |
|  +------------+  |                        |    +-----+-----+                |
|                  |                        |          |                       |
|  Chat List UI    |         REST           |    +-----v-----+                |
|  New Chat btn ---|----------------------->|    |   tmux    |                |
|  Delete Chat btn |                        |    |  session  |                |
|                  |                        |    |    |      |                |
|  [keyboard]      |                        |    |  claude   |  <- full access|
|  [custom bar]    |                        |    |  code     |    to monorepo |
+------------------+                        |    +-----------+                |
                                            +----------------------------------+
```

### Data Flow

```
User types on phone
      |
      v
xterm.js captures keystroke
      |
      v
WebSocket sends raw bytes to server
      |
      v
ttyd receives bytes -> pipes to tmux session stdin
      |
      v
Claude Code receives input (exactly like typing on laptop)
      |
      v
Claude Code processes, uses MCP tools, generates response
      |
      v
stdout output goes to tmux -> ttyd -> WebSocket -> xterm.js
      |
      v
User sees response stream on phone in real-time
```

### Why This Architecture

We evaluated several approaches and landed on the simplest possible design:

| Approach                                   | Complexity    | Why Rejected/Chosen                                              |
| ------------------------------------------ | ------------- | ---------------------------------------------------------------- |
| Claude API SDK                             | $$$ expensive | Costs money per token, no filesystem access                      |
| Claude Code `-p` per message               | Medium        | Stateless, MCP reinitializes each call, slow startup             |
| Claude Code `--resume`                     | Medium        | Good but untested, may not preserve MCP state                    |
| Interactive Claude + file watcher + parser | High          | Complex output parsing, debouncing, state management             |
| **Terminal proxy via ttyd**                | **Low**       | **Chosen. ~50 lines backend. Full interactivity. Zero parsing.** |

---

## 3. Tech Stack

### Mobile App

| Technology                | Purpose                                        |
| ------------------------- | ---------------------------------------------- |
| **Vite**                  | Build tool (fast, no SSR baggage like Next.js) |
| **React + TypeScript**    | UI framework (leverages existing skills)       |
| **Capacitor**             | Wraps web app as native iOS/Android app        |
| **xterm.js**              | Terminal emulator in the browser/WebView       |
| **xterm-addon-fit**       | Auto-resize terminal to container              |
| **xterm-addon-web-links** | Clickable URLs in terminal output              |
| **@capacitorjs/keyboard** | Handle mobile keyboard events                  |

### Backend / Server

| Technology            | Purpose                                         |
| --------------------- | ----------------------------------------------- |
| **Node.js + Express** | Thin management layer (~50 lines)               |
| **ttyd**              | Terminal sharing over WebSocket (single binary) |
| **tmux**              | Session management, persistence, multiplexing   |
| **Claude Code CLI**   | The AI brain                                    |

### Infrastructure

| Technology                        | Purpose                                 |
| --------------------------------- | --------------------------------------- |
| **Drizzle + SQLite**              | Chat history persistence + search       |
| **Tailscale / Cloudflare Tunnel** | Secure remote access without open ports |
| **Let's Encrypt**                 | SSL/TLS for HTTPS and WSS               |

---

## 4. Module Structure

```
devbot/
├── PLAN.md                         # This file
├── .env.example                    # Environment template
│
├── mobile/                         # Vite + React + Capacitor
│   ├── package.json
│   ├── vite.config.ts
│   ├── capacitor.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx                 # Main app with routing
│   │   ├── main.tsx                # Entry point
│   │   ├── index.css               # Tailwind imports
│   │   ├── pages/
│   │   │   ├── ChatList.tsx        # List of active sessions
│   │   │   └── ChatView.tsx        # Terminal view (xterm.js)
│   │   ├── components/
│   │   │   ├── Terminal.tsx        # xterm.js wrapper component
│   │   │   ├── KeyBar.tsx          # Custom key bar (Tab, arrows, Ctrl+C)
│   │   │   └── ChatItem.tsx        # Single chat in the list
│   │   ├── lib/
│   │   │   └── api.ts              # REST calls to backend manager
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript types
│   │   └── hooks/
│   │       └── useTerminal.ts      # Terminal hook
│   ├── ios/                        # Generated by Capacitor
│   └── android/                    # Generated by Capacitor
│
└── backend/                        # Node.js session manager
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts                # Express server
    │   ├── routes/
    │   │   └── sessions.ts         # CRUD for tmux/ttyd sessions
    │   └── lib/
    │       ├── ttyd.ts             # Spawn/kill ttyd instances
    │       └── tmux.ts             # tmux session management
```

---

## 5. How Multiple Chats Work

Each chat is a separate tmux session with its own ttyd instance on a unique port.

```
Chat 1: tmux session "devbot_chat1" <-> ttyd on port 7681
Chat 2: tmux session "devbot_chat2" <-> ttyd on port 7682
Chat 3: tmux session "devbot_chat3" <-> ttyd on port 7683

Mobile switches chats = xterm.js disconnects from one ttyd, connects to another.
Same app, different WebSocket URL.
```

### Session Lifecycle

```
New Chat:
  1. POST /api/sessions/create
  2. Backend: tmux new-session -s devbot_{id} claude
  3. Backend: ttyd -p {next_port} tmux attach -t devbot_{id}
  4. Returns: { id, ws_url: "ws://server:{port}/ws" }
  5. Mobile: xterm.js connects to ws_url

Switch Chat:
  1. Mobile: xterm.js disconnects from current ws_url
  2. Mobile: xterm.js connects to new chat's ws_url
  3. tmux session stays alive (Claude keeps running)

Delete Chat:
  1. POST /api/sessions/{id}/delete
  2. Backend: kill ttyd process for that port
  3. Backend: tmux kill-session -t devbot_{id}
  4. Cleanup

App Closed + Reopened:
  1. GET /api/sessions/list
  2. Returns all active tmux sessions
  3. User picks one -> xterm.js connects
  4. tmux preserved full scrollback -> user sees history
```

### Port Management

```
Base port: 7681
Max concurrent chats: 20 (7681-7700)
Port allocation: next available from pool
On session kill: port returned to pool
```

---

## 6. Security

### Layers

```
Layer 1: Network - No open ports
  - Tailscale mesh VPN (recommended)
  - OR Cloudflare Tunnel
  - Phone and server on same private network.

Layer 2: Transport - TLS encryption
  - ttyd --ssl --ssl-cert cert.pem --ssl-key key.pem

Layer 3: Authentication - API key
  - ttyd --credential user:{strong_password}
  - Backend manager validates X-API-Key header on REST endpoints.

Layer 4: Device binding (optional)
  - Store a device-specific UUID on first app launch.
  - Send as header on every request.
  - Backend rejects unknown devices.
```

---

## 7. Backend API (Node.js Manager)

The manager is a thin REST API that creates/destroys ttyd+tmux sessions.

### Endpoints

```
POST   /api/sessions/create
  -> Creates tmux session + starts ttyd on next available port
  -> Returns: { id, port, ws_url, created_at }

GET    /api/sessions/list
  -> Lists all active sessions
  -> Returns: [{ id, port, ws_url, created_at, name }]

GET    /api/sessions/:id
  -> Get single session info
  -> Returns: { id, port, ws_url, created_at, name }

DELETE /api/sessions/:id
  -> Kills ttyd process + tmux session
  -> Returns: { success: true }

POST   /api/sessions/:id/rename
  -> Renames a session (for chat list display)
  -> Body: { name: "Hotel Booking" }

GET    /health
  -> Returns: { status: "ok", active_sessions: 3, uptime: 12345 }
```

---

## 8. Implementation Phases

### Phase 1: Working Prototype

**Goal:** Type on phone -> Claude Code responds.

```
Day 1:
  - Install ttyd on server
  - Install tmux
  - Test manually: ttyd -p 7681 tmux new-session claude
  - Open phone browser -> http://server:7681 -> verify terminal works

  - Scaffold Vite + React + Capacitor project
  - Add xterm.js + xterm-addon-fit + xterm-addon-attach
  - Create Terminal.tsx component that connects to ttyd WebSocket
  - Create ChatView page with terminal
  - Test on phone browser (before Capacitor)

Day 2:
  - Build Node.js session manager (Express, ~50 lines)
  - Endpoints: create, list, delete sessions
  - Port pool management (7681-7700)
  - Add API key authentication

  - Create ChatList page
  - Wire up: new chat -> create session -> navigate to terminal
  - Wire up: delete chat -> kill session
  - Add custom key bar (Tab, arrows, Ctrl+C)
  - Test full flow on phone
```

### Phase 2: Polish

- Add Tailscale for secure remote access
- Add ttyd SSL + authentication
- Terminal theming (dark mode, font selection)
- Session auto-naming (based on first message)
- Handle keyboard show/hide properly on mobile
- Add Capacitor build for iOS and/or Android
- App icon, splash screen
- Reconnection handling when WebSocket drops

### Phase 3: Persistence (Drizzle + SQLite) — COMPLETED

- Set up Drizzle ORM with SQLite (devbot.db + plugins.db)
- Created chats, messages, schedulers, plans tables
- Auto-initialization on startup via `initializeCoreDatabase()`
- Search across old chats in mobile UI

### Phase 4: MCP Tools

- Calendar MCP (Google Calendar)
- Email MCP (Gmail)
- Hotel booking MCP
- Smart home MCP
- Custom tools as needed

---

## 9. Environment Variables

### Backend (.env)

```bash
API_KEY=your-secret-api-key-here
TTYD_BASE_PORT=7681
TTYD_MAX_PORT=7700
TTYD_CREDENTIAL=user:strongpassword
TTYD_SSL_CERT=/path/to/cert.pem
TTYD_SSL_KEY=/path/to/key.pem
CLAUDE_WORK_DIR=/home/user/personal
SERVER_PORT=3100
```

### Mobile (.env)

```bash
VITE_BACKEND_URL=http://100.64.x.x:3100
VITE_API_KEY=your-secret-api-key-here
VITE_TTYD_CREDENTIAL=user:strongpassword
```
