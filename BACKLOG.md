# DevBot Master Backlog

> This file is the inter-session communication mechanism. Scheduled CEO sessions read this file to pick the next feature to implement. Each session implements ONE feature, then updates this file.

## How It Works

1. A system scheduler runs every 2 hours (the "CEO Scheduler")
2. It reads this file to find the next `[ ]` item marked `NEXT`
3. It implements that feature in a single session
4. It marks the item `[x]` and moves `NEXT` to the next priority item
5. It creates a DevBot chat session so the user can review the work

## Active Sprint

### Phase 1: Foundation (Current)
- [x] **Enhanced Scheduler System** — Cron expressions, event triggers, effort levels, priority, inter-session communication, model selection (opus/sonnet/haiku/fable). `COMPLETED 2026-08-29`
- [x] **Event Trigger System** — Stock price triggers (Yahoo Finance API), weather triggers (Open-Meteo API), file watch triggers (fs.stat), webhook triggers (external API), custom triggers. Event sources poll periodically and fire schedulers when conditions match. Full CRUD UI with type-specific config forms, test endpoint for dry-run evaluation, and task linking. News triggers stubbed (requires external API key). `COMPLETED 2026-08-29`
- [x] **Unified CLI Dashboard** — Multi-provider session browser showing Claude Code, OpenAI Codex, Kimi Code, and Cursor sessions in one unified view. Provider-specific JSONL/SQLite parsers, session cache with 10s TTL, provider filter pills, search, and per-provider session viewer with color-coded UI. `COMPLETED 2026-08-30`
- [x] **File-Based Backend Framework** — Generic FileStore<T> class with typed CRUD, mtime-based caching, auto-git-commit. createFileStoreRouter() factory for zero-boilerplate REST endpoints. Management API at /api/file-stores. Demo bookmarks + notes stores. Frontend page with store browser, search, JSON editor for adding records. `COMPLETED 2026-08-30`

### Phase 2: Platform
- [x] **Google OAuth Authentication** — Google OAuth2 flow with CSRF-protected state, single-user enforcement (ALLOWED_EMAIL whitelist), session cookies (30-day HttpOnly), Bearer API tokens for mobile/programmatic access, auth middleware on all /api/* routes, token CRUD API + Settings page UI for managing tokens, LoginPage with OAuth button, AuthGate wrapping all routes. Backward-compatible API key fallback and dev mode (no auth). `COMPLETED 2026-08-31`
- [x] **Capacitor Mobile App** — Capacitor 8 setup with Android platform. Native platform utilities (status bar, splash screen, haptics, back button, app lifecycle). Mobile-aware API with configurable backend URL (Capacitor Preferences + localStorage sync). Push notification integration (FCM device token registration, foreground local notifications, notification tap navigation). Backend push service with push_tokens table, register/unregister/list/test endpoints, FCM HTTP API sending with auto-cleanup. Settings page mobile section (platform indicator, backend URL config with test, push notification toggle, registered devices list, test push button). NativeLifecycle component for Android back button and app state refetch. Makefile targets (mobile-setup/build/sync/open/run/live). `COMPLETED 2026-08-31`
- [x] **Electron Desktop App** — Electron 44 macOS desktop wrapper with hidden title bar (traffic lights inset), system tray (programmatic template icon with context menu), dock badge counts, native macOS notifications, window state persistence (position/size/maximized across restarts), IPC bridge via contextBridge (badge, notifications, window controls, external URL opening), notification click → chat navigation, backend URL auto-resolution to localhost, Vite dev server support in dev mode, electron-builder config for .dmg packaging (arm64 + x64). Frontend: `isElectron` detection, Settings page desktop section (platform/version/badge test), notification.ts Electron path, env.ts runtime-configured mode. Makefile: `desktop-dev`, `desktop-build`, `desktop-package` targets. `COMPLETED 2026-08-31`
- [x] **Cloudflare Tunnel** — CloudflareTunnel process manager (quick + named modes), REST API (status/logs/start/stop), TunnelManager Settings UI with mode selector/public URL copy/uptime, Makefile targets (setup-cloudflared, tunnel-start/stop/status), health check + doctor integration, graceful shutdown. Zero-trust via Cloudflare Access with Google OAuth. `COMPLETED 2026-08-31`

### Phase 3: Voice & AI
- [x] **Voice Mode (OpenAI-style)** — Full duplex voice conversation. Whisper STT via existing /api/stt/transcribe, edge-tts for TTS (/api/tts/* routes with voice selection, MP3 streaming, settings persistence). Voice conversation sessions via Anthropic API direct (/api/voice/* routes with in-memory session management, voice-optimized system prompt). Full-screen mobile-first UI with animated state orb (idle/listening/transcribing/thinking/speaking), scrollable conversation transcript, mic/clear/end-call controls. useVoiceMode hook orchestrating full conversation loop (record → STT → AI → TTS → play). Voice Activity Detection (VAD) via AudioContext/AnalyserNode. Web Speech API live transcript preview. TTS voice selector in Settings page. `COMPLETED 2026-08-31`
- [x] **Voice Transcript Logger** — VoiceTranscriptsStore (FileStore) persists every voice session's messages, raw STT, duration, and analysis state. Auto-save on session end/clear/TTL cleanup. Analysis router with Ollama-powered STT error detection, corrections dictionary CRUD, app-specific term seeding. VoiceTranscriptsPage with search, stats cards, expandable transcript cards with STT diff annotations, analyze button. VoiceTranscriptDetail drawer. voiceTranscriptsApi client. `COMPLETED 2026-08-31`
- [x] **Local Model Integration** — Ollama model management API (list/pull/delete/show), recommended models catalog (Qwen 3 0.6B/1.7B/4B, Llama 3.2, Gemma 3, Phi 4), custom model creation with Modelfile generation and STT dictionary inheritance, generate and chat completion endpoints with performance metrics (tok/s, latency), Modelfile updated to Qwen 3 0.6B base. Frontend: Local Models page with tabbed UI (Models/Playground/Custom), Ollama connection status, model cards with pull/delete, recommended models with category badges (fast/balanced/capable), inference playground with system prompt and temperature controls, custom model builder with dictionary inheritance toggle. `COMPLETED 2026-08-31`

### Phase 4: Plugins & Apps
- [ ] `NEXT` **Trip Planner Plugin** — Wanderlog-style trip planning. File-based backend. Itinerary builder, map integration, expense tracking. Shareable trip files.
- [ ] **Baby Monitor Plugin** — RTSP camera feed + AI safety inference. Alert on unsafe positions. Local-only processing.
- [ ] **Personal Finance Plugin** — Track expenses, investments, gold (pavan units). Robinhood portfolio integration.
- [ ] **Health Tracker Plugin** — Family health records. Medication reminders. Appointment scheduling.

### Phase 5: Intelligence
- [ ] **Notification Service** — Mobile/desktop push notifications that SPEAK to the user via TTS. Stock alerts, scheduler completions, agent requests for human input. Wake screen + read aloud.
- [ ] **Personal Assistant Mode** — Any running terminal can request human attention. Sends notification to mobile. User opens app, sees the chat, replies. The terminal session receives the reply and continues.
- [ ] **Smart Scheduler** — ML-based scheduling. Learn from past run patterns. Auto-adjust intervals. Predict optimal run times. Budget-aware (track API costs per scheduler).
- [ ] **Cross-Session Memory** — Schedulers share context via structured JSON files. Each session reads previous session's output and builds on it. Dependency graphs between tasks.

## Feature Research Queue

> Top features from major AI platforms to evaluate and implement:

### From OpenAI (ChatGPT)
1. Voice mode with real-time conversation — **Planned (Phase 3)**
2. Memory across conversations — **Exists (brain skill)**
3. Canvas/Artifacts for code editing — **Evaluate**
4. Custom GPTs / Agents — **Partially exists (plugins)**
5. Web browsing integration — **Exists (Chrome MCP)**

### From Anthropic (Claude)
1. Projects with custom instructions — **Exists (CLAUDE.md)**
2. Extended thinking / chain of thought — **Exists (effort levels)**
3. MCP tool ecosystem — **Exists**
4. Artifacts — **Evaluate for DevBot**
5. Team sharing — **N/A (personal app)**

### From Google (Gemini)
1. Deep Research — **Implement as scheduler task**
2. Multimodal (image/video understanding) — **Evaluate**
3. Google Workspace integration — **Exists (Gmail/Calendar MCP)**
4. Real-time information — **Planned (event triggers)**

### From Cursor / Windsurf
1. Codebase-aware AI — **Exists (Claude Code)**
2. Multi-file editing — **Exists**
3. Background agents — **Exists (schedulers)**
4. Tab completion — **N/A (not an IDE)**

### From Others
1. **Perplexity** — Web search + citations → Implement as search plugin
2. **Replit** — Deploy from chat → Implement as deploy scheduler
3. **v0.dev** — UI generation → Exists via Claude Code
4. **Bolt.new** — Full-stack from prompt → Exists via Claude Code + schedulers

## Completed Features Log

| Date | Feature | Session |
|------|---------|---------|
| 2026-08-29 | Enhanced Scheduler System (cron, events, effort, priority, inter-session comm) | Manual |
| 2026-08-29 | Event Trigger System (stock/weather/file_watch/webhook evaluators, CRUD UI, test endpoint) | CEO Scheduler |
| 2026-08-30 | Unified CLI Dashboard (Claude/Codex/Kimi/Cursor multi-provider session browser, JSONL parsers, provider filters) | CEO Scheduler |
| 2026-08-30 | File-Based Backend Framework (FileStore class, REST router factory, management API, bookmarks+notes demo stores, frontend browser page) | CEO Scheduler |
| 2026-08-31 | Google OAuth Authentication (OAuth2 flow, session cookies, Bearer API tokens, auth middleware, token management UI, LoginPage, AuthGate) | CEO Scheduler |
| 2026-08-31 | Capacitor Mobile App (Android packaging, push notifications, native platform utils, mobile-aware API, backend URL config, Makefile targets) | CEO Scheduler |
| 2026-08-31 | Electron Desktop App (macOS wrapper, system tray, dock badges, native notifications, window state persistence, IPC bridge, electron-builder packaging, desktop Settings section) | CEO Scheduler |
| 2026-08-31 | Cloudflare Tunnel (CloudflareTunnel process manager, quick+named modes, REST API, TunnelManager Settings UI, Makefile targets, health/doctor integration, zero-trust Cloudflare Access) | CEO Scheduler |
| 2026-08-31 | Voice Mode (edge-tts TTS with voice selection, Anthropic API voice sessions, full-screen voice UI with animated orb, useVoiceMode hook with VAD, conversation loop STT→AI→TTS→play, TTS settings) | CEO Scheduler |
| 2026-08-31 | Voice Transcript Logger (FileStore persistence, auto-save on session end/clear/TTL, Ollama STT analysis, corrections dictionary, VoiceTranscriptsPage with search/stats/analyze, VoiceTranscriptDetail drawer) | CEO Scheduler |
| 2026-08-31 | Local Model Integration (Ollama model management API, recommended models catalog, custom model creation with dictionary inheritance, generate/chat endpoints with metrics, Qwen 3 0.6B base, Local Models page with tabs/playground/custom builder) | CEO Scheduler |

## Notes for Future Sessions

- **Do not restart DevBot** without explicit user permission
- **Always commit inside the devbot submodule**, never in the super repo
- **Read AGENTS.md** before starting work
- **One feature per session** — stay focused, complete fully, update this backlog
- **Create a DevBot chat session** for each scheduler run so the user can review
- **Use the `settings` JSONB column** for new optional fields to avoid schema migrations
- **Test visually** — open the page in Chrome MCP after frontend changes
