# DevBot Feature Sync

Auto-maintained by the DevBot Feature Sync scheduler. Do not edit manually.

Last discovery run: 2026-04-20
Last implementation run: 2026-04-20T22:30:00Z

---

## Pending
- Add image paste support to interactive chat input — Claude Code supports pasting screenshots/images directly into the chat; DevBot's chat input (InteractiveChatPage) has no paste handler for images; add onPaste to the textarea to detect image clipboard data and attach it as a file upload
- Add context window usage progress bar to interactive chat — Claude Code shows context window usage (tokens used / max); add a thin progress bar or percentage badge near the chat header using token data from extractUsageData()
- Add dedicated Settings page/route (/settings) — currently settings are only reachable via SettingsDrawer; add a full /settings route with sections: General (model default, permission mode default), Appearance (theme, font size), Notifications, and Working Directory defaults
- Improve ThinkingBlock to show reasoning summary — ThinkingBlock.tsx (line 1-42) only shows word count and collapse; add a one-line AI-generated or heuristic summary of the thinking content visible even when collapsed, to help users decide whether to expand
- Add git working tree status widget to interactive chat — Claude Code integrates git awareness; when a session has a working directory, show a compact git status badge (branch name + dirty file count) in the InteractiveChatView header using a `/api/working-directories/:path/git-status` endpoint

## In Progress

<!-- Items currently being worked on -->

## Completed

- [2026-04-20] Extend slash command system to be data-driven — created shared slash-commands.ts config; ChatSlashHelpDialog and InteractiveChatView both consume it; help-modal-data.ts re-exports from shared config
- [2026-04-20] Add MCP server configuration UI — McpServersDrawer component accessible from SettingsDrawer; backend route reads/writes mcpServers in ~/.claude/settings.json; supports add/delete servers
- [2026-04-20] Add scheduler retry logic — already implemented: DEFAULT_MAX_RETRIES=3, exponential backoff (RETRY_BASE_DELAY_MS=5000), configurable via settings.maxRetries in processQueue loop
- [2026-04-20] Add token/cost usage display to InteractiveChatView — already implemented: sessionStats (tokens, cost, duration, turns) rendered in ChatInputToolbar; context progress bar in ChatViewHeader
- [2026-04-20] Add hooks configuration UI — HooksDrawer component accessible from SettingsDrawer; backend route reads/writes hooks in ~/.claude/settings.json; supports add/delete hooks with event type, matcher, and command

## Failed

<!-- Items that failed implementation -->
