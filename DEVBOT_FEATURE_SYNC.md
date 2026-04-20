# DevBot Feature Sync

Auto-maintained by the DevBot Feature Sync scheduler. Do not edit manually.

Last discovery run: 2026-04-20T21:50:00Z
Last implementation run: 2026-04-21T00:15:00Z

---

## Pending
- Add conversation branching/forking — allow users to branch from any message in a conversation to explore alternative response paths; no UI or backend support exists
- Add compact/dense UI mode toggle — setting to reduce vertical spacing in chat messages for power users; currently only font size options exist
- Add tool approval/rejection history view — show a log of past tool permission decisions (approvals/rejections) within a chat session; currently only shows immediate tool dialogs
- Add inline file editor in chat view — allow viewing and editing files directly within the conversation UI, similar to Claude Code's integrated file editing; DirectoryBrowserSidebar exists but has no edit capability
- Add worktree management UI — visual interface to create, list, and switch between git worktrees for isolated working directories; Claude Code has EnterWorktree/ExitWorktree but DevBot has no corresponding UI
- Add granular notification preferences — extend notification settings beyond sound/haptic/auto-scroll to include per-event-type controls, browser/desktop notification channels, and DND mode
- Add keyboard shortcuts viewer/editor — dedicated UI showing all available keybindings with ability to customize them; Claude Code has keybindings.json support but DevBot has no corresponding viewer
- Wire up Dashboard page route — Dashboard.tsx exists with widgets (ChatsWidget, SchedulerWidget, HealthWidget, etc.) but /dashboard is not in the router; it falls through to the /chats catch-all redirect

## In Progress

<!-- Items currently being worked on -->

## Completed

- [2026-04-20] Add CLAUDE.md project documentation editor — ClaudeMdDrawer component accessible from SettingsDrawer; backend /api/claude-md route reads/writes CLAUDE.md per working directory; supports create and edit
- [2026-04-20] Add memory viewer/editor UI — MemoryViewerDrawer component accessible from SettingsDrawer; backend /api/memories route reads/writes/deletes memory files from ~/.claude/projects/*/memory/; supports expand, edit (full file with frontmatter), and delete; grouped by project with type badges
- [2026-04-20] Add git working tree status widget to interactive chat — backend /api/git-status endpoint returns branch, dirty count, ahead/behind; ChatViewHeader shows GitBranch icon badge with branch name and dirty count; useGitStatus hook polls every 30s

- [2026-04-20] Improve ThinkingBlock to show reasoning summary — already implemented: extractSummary heuristic shows first sentence (truncated to 80 chars) as italic text when collapsed, alongside word count

- [2026-04-20] Add dedicated Settings page/route (/settings) — full page with sections: General (model, permission mode), Appearance (theme, font size), Notifications (sound, haptic, auto-scroll), Working Directory defaults; added to SlideNav and router
- [2026-04-20] Extend slash command system to be data-driven — created shared slash-commands.ts config; ChatSlashHelpDialog and InteractiveChatView both consume it; help-modal-data.ts re-exports from shared config
- [2026-04-20] Add MCP server configuration UI — McpServersDrawer component accessible from SettingsDrawer; backend route reads/writes mcpServers in ~/.claude/settings.json; supports add/delete servers
- [2026-04-20] Add scheduler retry logic — already implemented: DEFAULT_MAX_RETRIES=3, exponential backoff (RETRY_BASE_DELAY_MS=5000), configurable via settings.maxRetries in processQueue loop
- [2026-04-20] Add token/cost usage display to InteractiveChatView — already implemented: sessionStats (tokens, cost, duration, turns) rendered in ChatInputToolbar; context progress bar in ChatViewHeader
- [2026-04-20] Add hooks configuration UI — HooksDrawer component accessible from SettingsDrawer; backend route reads/writes hooks in ~/.claude/settings.json; supports add/delete hooks with event type, matcher, and command
- [2026-04-20] Add image paste support to interactive chat input — already implemented: ChatTextareaWithPickers.tsx has onPaste handler detecting image clipboard data and calling onPasteFiles; drag-and-drop also supported via useDragAndDrop hook
- [2026-04-20] Add context window usage progress bar to interactive chat — already implemented: ChatViewHeader.tsx has thin progress bar (h-0.5 bg-primary/60) at bottom of header showing totalTokens/200k with tooltip

## Failed

<!-- Items that failed implementation -->
