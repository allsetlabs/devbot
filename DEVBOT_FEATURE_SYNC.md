# DevBot Feature Sync

Auto-maintained by the DevBot Feature Sync scheduler. Do not edit manually.

Last discovery run: 2026-04-22T23:00:00Z
Last implementation run: 2026-04-22T23:15:00Z

---

## Pending

- TodoWrite tool result renderer — TodoWrite tool results currently show as raw JSON preview in ToolUseMessage.tsx; add a dedicated visual renderer that parses the `todos` array and renders each item as a checkbox row (✓ for completed, ○ for pending, ✗ for cancelled) with a "X/Y done" count badge header; show in both tool_use blocks and standalone tool messages

- NotebookEdit tool result renderer — no renderer exists for NotebookEdit tool results; add a renderer showing the cell number, operation type (create/edit/delete), cell type badge (code/markdown), and a syntax-highlighted preview of the new_source content; similar style to the existing Read renderer

- Dedicated Archived Chats page at /archived — the "Archived (25)" bar at bottom of chat list opens a drawer; replace with navigation to /archived route; create ArchivedChatsPage reusing ChatListContent pre-filtered to archived chats; update the "Archived" bar to navigate instead of toggling drawer; add /archived route to App.tsx

- Always-visible message timestamps setting — currently message timestamps use `opacity-0 group-hover:opacity-100` (ChatMessage.tsx ~line 194) so they only appear on hover; add "Always show timestamps" toggle in Settings > Appearance; store in useSettings; when enabled, replace opacity classes with always-visible timestamps below each message bubble

- Scheduler run cost badge in run history — in SchedulerView.tsx run selector list, add a small "$X.XX" cost badge next to each run entry by fetching the associated chat's sessionStats.totalCost; helps users track which scheduler runs were expensive

- Chat export shortcut in chat list overflow menu — export is currently only accessible from inside a chat via the header; add "Export..." option to the chat list item "..." overflow menu (ChatListItem.tsx) that opens ChatExportDrawer directly from the list view; saves navigating into the chat just to export

- Scheduler list run success/failure rate badge — add a small colored badge on each scheduler item showing success rate (e.g. "178/180 ✓") based on completed vs failed task runs; backend already tracks TaskRun records with status field; helps identify flaky schedulers at a glance

## In Progress

## Completed

- [2026-04-22] Scheduler list show "Next run" relative time per item — added formatRelativeFuture() to format.ts returning "in Xm/Xh/Xd/now"; SchedulerItem, DashboardActiveSchedulers, and SchedulerWidget updated to use it; 30s setInterval tick in SchedulerList forces re-render so countdown stays live without server refetch

- [2026-04-22] Quick "Running" filter pill in chat list — "Running N" pill alongside All/Manual/Scheduler in ChatListFilters; pulsing dot indicator; only visible when runningCount > 0 or active; client-side filter on isRunning; URL param `?running=1`; clicking "All" clears it; auto-hides when no chats are running

- [2026-04-22] Voice input via Web Speech API — Mic button in left toolbar of ChatTextareaWithPickers; uses webkitSpeechRecognition with continuous=false, interimResults=true; interim text shown as italic preview above button row; red border + pulsing dot while recording; finalizes by appending to input; toast if browser unsupported; cleanup on unmount

- [2026-04-22] Context window warning banner — when token usage exceeds 80% of 200k (160k tokens), show a thin amber warning bar below the ChatViewHeader ("Context 80% full — consider /compact"); at 95%+ show it red; disappears when tokens drop; reads from existing sessionStats.totalTokens already in state

- [2026-04-22] Input draft auto-save per chat — draft saved to localStorage under `devbot-chat-draft:{chatId}` with 500ms debounce; restored on navigation back to chat; cleared on send; subtle "Draft restored" label with RotateCcw icon appears above textarea when draft is pre-filled; label dismisses on first keystroke

- [2026-04-23] Auto-name chat from first message — backend POST /:id/auto-name endpoint extracts first non-trivial line (≤40 chars) from first user message via heuristic; frontend effect fires after first assistant response is detected, calls api.autoNameChat(), updates React Query cache so header updates without page reload; idempotent (skips already-named chats)

- [2026-04-23] Dashboard empty space below widgets — added DashboardRecentChats (6 most recent chats with model badge, running indicator, working dir) and DashboardActiveSchedulers (up to 5 schedulers with status, interval, next run, run count) sections below the widget grid; both use existing query data, no new API calls; "View all" links to /chats and /scheduler

- [2026-04-23] Settings page max-width desktop fix — added `max-w-2xl mx-auto` wrapper div inside SettingsPage `<main>` to cap content at 672px and center it; prevents settings rows from stretching to full viewport width on wide desktops; mobile unaffected

- [2026-04-23] Chat list item timestamp now shows `updatedAt` instead of `createdAt` — ChatListItem.tsx line 108 was rendering `formatRelativeTime(chat.createdAt)`; changed to `chat.updatedAt` so recently-active old chats show "just now" instead of their creation date

- [2026-04-22] Global cross-chat message search — MessagesSquare toggle in ChatListFilters switches to messages mode (sm=messages URL param); useSearchMessages React Query hook calls GET /api/interactive-chats/search-messages?q=; MessageSearchResults component shows matched messages with chat name, timestamp, Bot/User icon, yellow-highlighted query term in preview; click navigates to chat; empty state shows "Type at least 2 characters" prompt; type filter pills hidden in messages mode

- [2026-04-22] Chat list date grouping — group chat items under date headers ("Today", "Yesterday", "This Week", "This Month", "Older") based on updatedAt; sticky overlay header tracks current group via scroll listener and shows at top of list; applies to both mobile and desktop; headers as virtual items in @tanstack/react-virtual list

- [2026-04-22] Add /status slash command — StatusDrawer showing model, permission mode, context usage (tokens/200k + %), session cost, working directory (~-prefixed), active tools count (or "All tools"), fast mode on/off, effort level; openStatus slashAction in InteractiveChatView; uses MODEL_CONFIG and MODE_CONFIG for colored labels

- [2026-04-22] Add /doctor slash command — run backend health check returning: backend status, Claude CLI version, active sessions count, working directory validity, disk space, memory usage; display results in a diagnostic card with pass/fail indicators; /api/doctor endpoint; DoctorDrawer with 6 checks (backend uptime, claude CLI version, active sessions, working dir validity, disk space, memory heap); openDoctor slashAction in InteractiveChatView

- [2026-04-22] Specialized Bash tool output renderer — terminal-style monospace dark background (#0d1117); exit code badge (green exit 0, red exit 1+) derived from is_error or parsed <exit_code> tags; collapsible at 20-line threshold; copy button; Terminal icon header; command preview truncated to 60 chars

- [2026-04-22] Specialized Glob tool result renderer — show matching file paths in a compact vertical list with file type icons (folder, code file, config file, etc.); show total match count header; collapsible at 20-file threshold

- [2026-04-22] Specialized Read tool result renderer — file content with line numbers and syntax highlighting; collapsible at 30-line threshold; filename header with FileCode icon; copy button; strips cat -n prefixes; language detection from extension; also wired onOpenMaxTurns through ChatInputArea→ChatInputToolbar with Repeat2 button; removed unused sessionStats prop from ChatInputArea

- [2026-04-22] Specialized Grep tool result renderer — show matched lines with syntax highlighting, search pattern highlighted in yellow/orange, file paths as monospace links; compact summary showing match count and file count

- [2026-04-22] Desktop persistent sidebar navigation — on lg+ viewports, SlideNav renders as a persistent left sidebar (fixed, always visible) with border-right; content area shifts right via lg:ml-64; hamburger menu hidden on lg+ via lg:hidden; mobile overlay behavior preserved; centralized via AppLayout wrapper + NavContext; removed per-page SlideNav state from 12 pages; PersistentSidebar and mobile SlideNav rendered once in AppLayout

- [2026-04-22] Chat view header mobile overflow menu — consolidated 7 icon buttons (search, tool visibility, tool history, pinned, cost, working dir, settings) + rename pencil into 3 visible (search, "..." overflow, settings) on mobile (< lg); overflow DropdownMenu shows tool results toggle with count, tool history with count, pinned messages with count, session cost, working directory, and rename chat; pencil rename button hidden from title row on mobile; all icons remain visible on desktop (lg+)

- [2026-04-21] Chat list desktop overflow menu — reduced 6 inline action icons (play, star, terminal, copy, archive, delete) to 3 (play, star, "..."); grouped less-used actions (copy command, duplicate, archive, delete) into overflow dropdown menu; same pattern applied to ArchivedChatItem; mobile dropdown unchanged

- [2026-04-22] Settings page Default Working Directory placeholder now shows actual DEVBOT_PROJECTS_DIR from backend — health endpoint returns defaultWorkingDirectory; SettingsPage fetches it on mount and uses it as placeholder instead of generic "/path/to/projects"

- [2026-04-22] Add subagent/background task progress indicators — AgentSubagentView component with Bot icon, description title, subagent_type/model/isolation/background badges, spinning loader when running vs "Done" badge when completed; renders in both embedded tool_use blocks (ChatMessage.tsx) and standalone tool_use messages (ToolApprovalInline.tsx); expandable prompt preview; hasResult determined by isLast message heuristic

- [2026-04-22] Add chat message edit and re-run — Edit icon on user messages opens EditMessageDialog; on confirm, truncates the edited message and all subsequent messages (frontend optimistic + backend DELETE), then re-sends edited text as new prompt; backend POST /:id/truncate-after endpoint; frontend api.truncateMessagesAfter(); editingMessage state includes sequence for accurate truncation

- [2026-04-21] Add /memory slash command to open memory viewer — added /memory to SLASH_COMMANDS with openMemoryDrawer action; opens existing MemoryViewerDrawer showing persistent memory files grouped by project with type badges, edit, and delete support
- [2026-04-21] Add /cost slash command to show session cost inline — added /cost to SLASH_COMMANDS with openCostDrawer action; opens existing SessionCostDrawer showing total cost, tokens, duration, turns, token breakdown, cache hit rate, and per-turn usage

- [2026-04-21] Add /config slash command to open settings — added /config to SLASH_COMMANDS with openConfig action; navigates to /settings page using react-router navigate()
- [2026-04-22] Add /fast slash command to toggle fast mode — added /fast to SLASH_COMMANDS config; backend POST /:id/fast-mode endpoint toggles fastMode boolean in chat settings JSON; frontend toggleFastMode action calls API and shows toast with lightning bolt emoji; fastMode field added to InteractiveChat type
- [2026-04-21] Add cross-chat pinned messages view — PinnedMessagesPage at /pinned aggregates all pinned messages across chats grouped by source chat with navigation links; accessible from SlideNav; backend POST /pinned-messages endpoint fetches message content; localStorage-based pin storage

- [2026-04-22] Add notification sound picker — selectable notification sounds (Chime, Ding, Pop, Classic, Silent) in Settings > Channels; dropdown appears when Sound is enabled; Test button previews selected sound; all notification functions (success, failure, new message) respect the chosen style; silent option suppresses all audio
- [2026-04-22] Add allowed tools configuration per chat — ChatAllowedToolsDrawer component with checkbox list of 11 Claude Code tools (Read, Edit, Write, Bash, Grep, Glob, Agent, WebSearch, WebFetch, NotebookEdit, TodoWrite); Wrench icon button in ChatInputToolbar shows "All Tools" or "N Tools"; backend POST /:id/allowed-tools endpoint stores in chat settings JSON; claude-spawn passes --allowedTools flag; Select All/Deselect All toggle; Reset button when tools are restricted; scrollable tool list with Save button
- [2026-04-22] Add working directory switcher inside active chat view — FolderRoot button in ChatViewHeader opens ChatWorkingDirDrawer with WorkingDirSelector; backend POST /:id/working-dir endpoint updates workingDir in chat settings JSON; selecting a saved directory updates immediately and closes drawer
- [2026-04-21] Add chat starter/template prompts — ChatWelcomeScreen already had 6 quick-action cards (Review code, Find bugs, Write tests, Explain code, Refactor, Plan a feature) with icons in a 2-col grid; changed onSendPrompt to pre-fill the textarea input instead of sending immediately, allowing users to edit before sending; textarea auto-focuses after selection
- [2026-04-22] Add inline image rendering for base64 images in assistant responses — added 'image' type to ClaudeContentBlock; extracts image blocks from assistant content and renders them as inline `<img>` elements with base64 data URIs, max-height 400px, rounded corners
- [2026-04-22] Add session pause button — Pause (SIGTSTP) and Resume (SIGCONT) buttons in ChatTextareaWithPickers; backend pause/resume endpoints; header dot shows solid warning color when paused vs pulsing when running; toggles between Pause and Play icons
- [2026-04-21] Dashboard layout doesn't expand on desktop — added responsive grid (2col mobile, 3col md, 4col lg) with max-w-6xl centered container
- [2026-04-21] Add collapsible long assistant messages — separate MAX_VISIBLE_LINES_ASSISTANT (500 lines) for assistant messages; "Show more (N lines)" / "Show less" toggle works on all messages including the last one; user messages still use 10-line truncation
- [2026-04-21] Dashboard System card sessions count — duplicate; fix already committed in 710af46 (activeSessions in /health endpoint); backend process was stale
- [2026-04-21] Add copy-message-as-markdown button to assistant message action bar — already implemented: CopyMessageButton component copies raw markdown text via extractTextContent(); Copy icon visible on hover in assistant message action bar
- [2026-04-21] Fix Dashboard System card showing "sessions" with no count — added activeSessions field to backend /health endpoint using getActiveSessionCount() from claude-spawn.ts
- [2026-04-21] Add session resume button in chat list — Play icon button and "· Resumable" status text on chats with sessionId; shown in both desktop inline icons and mobile dropdown menu; navigates to chat view where sending a message resumes the session
- [2026-04-21] Add thinking budget control UI — ChatThinkingBudgetDrawer component with effort level selector (Low/Medium/High/Extra High/Max); Brain icon button in ChatInputToolbar; backend POST /:id/effort endpoint stores effort in chat settings JSON column; passes --effort flag to Claude CLI via claude-spawn.ts
- [2026-04-21] Add /compact slash command — added to SLASH_COMMANDS config with sendCompact action; sends `/compact` as prompt to Claude CLI which handles context compaction natively; toast notification on trigger
- [2026-04-21] Fix hidden-tools count badge style inconsistency — changed eye icon badge from bg-warning/text-warning-foreground to bg-muted/text-muted-foreground to match the history icon badge style
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
