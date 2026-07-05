# 0015 — Remove Memories Route and MemoryViewerDrawer

**Date**: 2026-07-05
**Status**: Accepted

## Context

DevBot had a `/api/memories` backend route and a `MemoryViewerDrawer` frontend component that provided a UI for viewing and editing project-level memory files stored at `~/.claude/projects/{project}/memory/*.md`. The feature was built to allow users to browse and manage their Claude project memory context within the DevBot UI.

However, analysis revealed that this feature serves a purpose unrelated to chat session memory. Actual chat session continuity in DevBot is entirely handled by Claude CLI's native `--resume <session_id>` mechanism. The `memories` route only reads/writes project-level memory files from disk — not chat message history.

## Decision

All memories-related code was removed:

- `backend/src/routes/memories.ts` — REST endpoints for listing, updating, and deleting memory files
- `backend/src/index.ts` — `memoriesRouter` import and `/api/memories` route mount removed
- `app/src/components/MemoryViewerDrawer.tsx` — entire drawer component deleted
- `app/src/types/index.ts` — `MemoryFile` and `MemoriesResponse` interfaces removed
- `app/src/lib/api.ts` — `MemoriesResponse` import and three API methods (`listMemories`, `updateMemory`, `deleteMemory`) removed
- `app/src/lib/slash-commands.ts` — `/memory` slash command entry removed
- `app/src/pages/InteractiveChatView.tsx` — `MemoryViewerDrawer` import, `memoriesOpen` state, `openMemoryDrawer` slash command action, `onMemories` prop, and component render removed
- `app/src/components/SettingsDrawer.tsx` — `onMemories` prop, `Brain` icon import, and Memories button removed

## Rationale

The memories route was unused dead code adding UI complexity without value. Investigation confirmed:

1. The feature only reads/writes project memory files from disk
2. Chat session memory is entirely owned by Claude CLI's `--resume` mechanism
3. The `chat_messages` table is written to but never read back by DevBot to construct LLM context
4. The UI button for memories was unnecessary clutter in the settings drawer

User-directed removal based on thorough architecture analysis.

## Consequences

- The feature is completely gone from both backend and frontend
- No database schema changes required (no memories tables existed)
- If users had previously bookmarked or relied on the `/memory` slash command, they will need to use the `memory` module directly instead
- The project-level memory files remain accessible on disk; users can edit them manually or via `modules/memory/` workflows
