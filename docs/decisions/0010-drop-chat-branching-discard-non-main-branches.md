# 0010 — Remove Chat Branching Feature, Discard Non-Main Branch Messages

**Date**: 2026-06-29
**Status**: Accepted

## Context

Interactive chats supported a "branch from this message" feature: any message could be forked into a new `branch_id` lineage, copying prior messages into a parallel thread. The user reported never using this feature and asked for its complete removal — frontend and backend, not just hiding the UI.

`chat_messages.branch_id` and `chat_message_queue.branch_id` were load-bearing schema columns (`UNIQUE(chat_id, branch_id, sequence)`), not just frontend state. Removing the feature meant deciding what happens to any messages that exist on a non-`main` branch.

## Decision

The `init-core.ts` migration drops the `branch_id` column entirely and, when rebuilding `chat_messages`, keeps only rows where `branch_id = 'main'`. Any messages that live on a forked (non-main) branch are discarded, and the unique constraint reverts to `UNIQUE(chat_id, sequence)`.

## Rationale

- Forked-branch messages are an artifact of the exact feature being removed — keeping them around with no UI to view them serves no purpose.
- Merging branch histories back into a single linear `sequence` per chat isn't well-defined (multiple branches could each have used sequence 1, 2, 3...), so preserving them without collisions would require renumbering logic disproportionate to data nobody asked to keep.
- The user explicitly asked for complete removal, not a soft-deprecate, signaling that preserving forked branches as inaccessible dead data was not the intent.

## Consequences

- Any chat that had used "branch from here" loses those forked messages permanently once the backend restarts and the migration runs (main-branch history is untouched).
- The migration is idempotent — it checks for the `branch_id` column via `PRAGMA table_info` before running, so it's a no-op on databases that already lack the column.
- If branch history needs to be recovered later, it would have to come from a pre-migration backup of `devbot.db` — there is no in-app undo.
