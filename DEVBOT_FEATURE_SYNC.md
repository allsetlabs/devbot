# DevBot Feature Sync

Auto-maintained by the DevBot Feature Sync scheduler. Do not edit manually.

Last discovery run: 2026-04-21T12:18:00Z
Last implementation run: 2026-04-22T12:30:00Z

---

## Pending
- Add /doctor slash command — run backend health check returning: backend status, Claude CLI version, active sessions count, working directory validity, disk space, memory usage; display results in a diagnostic card with pass/fail indicators
- Add /status slash command — display inline card showing: current model, permission mode, context usage (tokens/limit), session cost, working directory, active tools, fast mode state, effort level
- Chat list date grouping — group chat items under date headers ("Today", "Yesterday", "This Week", "This Month", "Older") based on last activity timestamp; headers are sticky within scroll; applies to both mobile and desktop layouts
- Global cross-chat message search — add a "Search all messages" toggle/mode to the chat list search bar; when enabled, searches message content across all conversations using backend full-text query; results show message preview with chat name, timestamp, and click-to-navigate

## In Progress

## Completed

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
