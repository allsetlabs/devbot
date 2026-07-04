# 0013 — Remove Git Worktree Feature

**Date**: 2026-07-03
**Status**: Accepted

## Context

DevBot had a git worktree management feature: a `WorktreeDrawer` component in the frontend, a `/api/worktrees` backend route (list, create, remove), and corresponding API client methods. The feature was surfaced via the chat session settings drawer.

## Decision

Remove the git worktree feature entirely — delete `WorktreeDrawer.tsx`, `backend/src/routes/worktrees.ts`, the three API client methods (`listWorktrees`, `createWorktree`, `removeWorktree`), and all references in `InteractiveChatView.tsx`, `SettingsDrawer.tsx`, and `backend/src/index.ts`.

## Rationale

The feature was not being used in practice. It added surface area (a backend route, a frontend component, and a settings drawer entry) for a capability that DevBot users don't need through the UI — worktree management is better handled directly in the terminal or via Claude Code. Removing it reduces complexity with no functional loss.

## Consequences

- `/api/worktrees` returns 404. Any client that called it will break; there are no known external callers.
- To restore the feature, the route, component, API methods, and drawer wiring would all need to be recreated from scratch (no migration required, just code).
- The `FolderTree` lucide icon import was also removed from `SettingsDrawer.tsx` as it was only used for the Worktrees button.
