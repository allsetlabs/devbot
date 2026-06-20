# 0003 — Batch-read summary files at list time via loadSummarizeChatMap()

**Date**: 2026-06-20
**Status**: Accepted

## Context

The devbot backend's chat list endpoint needed to include progress/summary data alongside each chat record. The straightforward approach would be to read each chat's summary file individually inside the loop that builds the list response — one file read per chat. For users with many chats, this would result in many small synchronous or sequential I/O operations on every list request.

## Decision

Introduce a `loadSummarizeChatMap()` function that reads all files in `$DEVBOT_PROJECTS_DIR/.tmp/summarize-chat/` in a single pass, building a map keyed by session ID. The list endpoint calls this once and looks up each chat's summary from the in-memory map.

## Rationale

A single directory scan followed by bulk file reads is more efficient than N individual file reads scattered through the response-building loop. It also keeps the data-access concern isolated in one function rather than spread across the list handler. The `.tmp/summarize-chat/` directory is the only source for this data, so reading the whole directory is not wasteful — it is exactly the complete set of relevant files.

## Consequences

- All summary files are loaded into memory on each list request. For very large numbers of sessions this could be noticeable, but in practice the files are small JSON blobs and the count is bounded by the user's chat history.
- If a future requirement needs to stream or paginate chats without reading all summaries, `loadSummarizeChatMap()` will need to be adapted (e.g. lazy-load per page).
- The function provides a single place to add caching or TTL logic if performance becomes a concern.
