# DevBot Feature Sync

Auto-maintained by the DevBot Feature Sync scheduler. Do not edit manually.

Last discovery run: 2026-04-20T21:50:00Z
Last implementation run: 2026-04-21T01:00:00Z

---

## Pending
- Add keyboard shortcuts viewer/editor — dedicated UI showing all available keybindings with ability to customize them; Claude Code has keybindings.json support but DevBot has no corresponding viewer

## In Progress

<!-- Items currently being worked on -->

## Completed

- [2026-04-21] Add granular notification preferences — per-event-type controls (task complete, task failed, new message), browser/desktop notification channel, and DND mode with scheduled hours; reorganized Settings page into Notifications, Channels, and Events sections
- [2026-04-21] Add worktree management UI — WorktreeDrawer component accessible from SettingsDrawer; backend /api/worktrees route with GET (list), POST (create), DELETE (remove); shows branch, path, HEAD; supports creating worktrees with new or existing branches
- [2026-04-21] Add inline file editor in chat view — InlineFileEditor component with syntax highlighting, edit/save/copy/close; backend GET /api/files/read and PUT /api/files/write endpoints; FolderOpen button in ChatTextareaWithPickers opens DirectoryBrowserSidebar with edit pencil icons; opens editor panel between messages and input area
- [2026-04-20] Wire up Dashboard page route — added /dashboard route in App.tsx and Dashboard entry in SlideNav with LayoutDashboard icon
- [2026-04-20] Add tool approval/rejection history view — ToolHistoryDrawer component accessible from ChatViewHeader clock icon; extracts tool_use blocks from assistant messages; shows tool name, preview, and timestamp; clickable entries navigate to the source message
- [2026-04-20] Add compact/dense UI mode toggle — compactMode boolean in useSettings; toggle in SettingsPage Appearance section; reduces message bubble padding (px-3 py-1) and inter-message spacing (py-0.5) in MessageList/ChatMessage
- [2026-04-20] Add conversation branching/forking — branch_id column on chat_messages with UNIQUE(chat_id, branch_id, sequence); backend endpoints for branch creation and listing; branch-aware message fetching and sending; UI branch selector bar and GitBranch action button on user messages
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
