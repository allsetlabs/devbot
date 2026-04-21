# DevBot Feature Sync

Auto-maintained by the DevBot Feature Sync scheduler. Do not edit manually.

Last discovery run: 2026-04-21T05:00:00Z
Last implementation run: 2026-04-21T22:00:00Z

---

## Pending
- Fix hidden-tools count badge style inconsistency — the eye (hide tools) icon in ChatViewHeader uses an orange/yellow badge for its count while the tools-used icon uses a gray badge; make the eye icon badge match the gray style used by the tools-used count

## In Progress

<!-- Items currently being worked on -->

## Completed

- [2026-04-21] Fix permission mode drawer "Current" badge overlap — added flex-shrink-0, bg-muted pill styling, and truncate on label to prevent badge clipping into title text
- [2026-04-21] Add session cost summary drawer — SessionCostDrawer component with total cost, tokens, duration, turns overview cards; token breakdown (input/output/cache read/cache creation); cache hit rate progress bar; per-turn usage list; Coins button in ChatViewHeader; clickable context progress bar opens drawer
- [2026-04-21] Add permission prompt inline UI — replaced popup ToolUseDialog with inline approval badges on every tool call; shows "Auto" (green) for dangerous mode, "OK" (blue) for auto-accept, "Allowed"/"Read-only" for plan mode; badges appear on both standalone tool_use messages and embedded tool blocks (Edit/Write/Bash/Grep etc.); Stop button available in non-dangerous modes to halt execution; removed disruptive modal popup
- [2026-04-21] Fix model selector drawer text overlap — added h-auto and whitespace-normal to Button className to override base button styles that caused text truncation and overlap
- [2026-04-21] Add chat message search within a conversation — already implemented: ChatSearchBar with query input, match count (N/M), prev/next navigation, type filters (All/User/Assistant/Tool), and text highlighting; Search icon in ChatViewHeader
- [2026-04-21] Add inline diff viewer for Edit/Write tool calls — WriteContentView component shows file content with line numbers and green highlighting; Edit/MultiEdit already had diff views; Write tool now renders with FilePlus icon, filename, line count instead of raw JSON
- [2026-04-20] Add message retry/regenerate button — RotateCcw icon on last assistant message action bar; passes onRetry to lastAssistantIndex in MessageList
- [2026-04-20] Fix Dashboard "NaNd ago" bug — formatRelativeTime now guards against null/undefined/invalid date strings
- [2026-04-21] Add keyboard shortcuts viewer/editor — KeybindingsDrawer component accessible from SettingsDrawer; backend /api/keybindings route with GET (list), POST (add), DELETE (remove); reads/writes ~/.claude/keybindings.json; shows key combo with kbd styling, command name, optional when condition; supports add and delete
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
