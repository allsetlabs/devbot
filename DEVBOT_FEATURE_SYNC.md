# DevBot Feature Sync

Auto-maintained by the DevBot Feature Sync scheduler. Do not edit manually.

Last discovery run: 2026-04-20
Last implementation run: 2026-04-20

---

## Pending
- Add scheduler retry logic — when a scheduled task fails, the scheduler-worker.ts has no retry or backoff; add configurable retry attempts (default 3) with exponential backoff before marking a run as failed
- Add MCP server configuration UI — Claude Code supports MCP servers (configured in claude_desktop_config.json); DevBot has no page or drawer to add/remove/view MCP servers; add an MCP servers settings section accessible from SettingsDrawer
- Add hooks configuration UI — Claude Code supports pre/post tool call hooks; DevBot has no UI to configure hooks; add a Hooks section in SettingsDrawer to view and edit hooks stored in project .claude/settings.json
- Extend slash command system to be data-driven — ChatSlashHelpDialog.tsx hardcodes 5 commands (/help, /clear, /mode, /model, /info); refactor so commands are declared in a single config array and the dialog auto-generates from it, making it easy to add new commands
- Add image paste support to interactive chat input — Claude Code supports pasting screenshots/images directly into the chat; DevBot's chat input (InteractiveChatPage) has no paste handler for images; add onPaste to the textarea to detect image clipboard data and attach it as a file upload
- Add context window usage progress bar to interactive chat — Claude Code shows context window usage (tokens used / max); add a thin progress bar or percentage badge near the chat header using token data from extractUsageData()
- Add dedicated Settings page/route (/settings) — currently settings are only reachable via SettingsDrawer; add a full /settings route with sections: General (model default, permission mode default), Appearance (theme, font size), Notifications, and Working Directory defaults
- Improve ThinkingBlock to show reasoning summary — ThinkingBlock.tsx (line 1-42) only shows word count and collapse; add a one-line AI-generated or heuristic summary of the thinking content visible even when collapsed, to help users decide whether to expand
- Add git working tree status widget to interactive chat — Claude Code integrates git awareness; when a session has a working directory, show a compact git status badge (branch name + dirty file count) in the InteractiveChatView header using a `/api/working-directories/:path/git-status` endpoint

## In Progress

<!-- Items currently being worked on -->

## Completed

- [2026-04-20] Add token/cost usage display to InteractiveChatView — already implemented: sessionStats (tokens, cost, duration, turns) rendered in ChatInputToolbar; context progress bar in ChatViewHeader

## Failed

<!-- Items that failed implementation -->
