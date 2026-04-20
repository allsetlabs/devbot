# DevBot Feature Sync

Auto-maintained by the DevBot Feature Sync scheduler. Do not edit manually.

Last discovery run: 2026-04-20
Last implementation run: 2026-04-20T20:00:00Z

---

## Pending
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
- [2026-04-20] Add image paste support to interactive chat input — already implemented: ChatTextareaWithPickers.tsx has onPaste handler detecting image clipboard data and calling onPasteFiles; drag-and-drop also supported via useDragAndDrop hook
- [2026-04-20] Add context window usage progress bar to interactive chat — already implemented: ChatViewHeader.tsx has thin progress bar (h-0.5 bg-primary/60) at bottom of header showing totalTokens/200k with tooltip

## Failed

<!-- Items that failed implementation -->
