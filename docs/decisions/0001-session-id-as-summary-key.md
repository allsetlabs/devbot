# 0001 — CLAUDE_CODE_SESSION_ID used as the chat summary file key and progress route parameter

**Date**: 2026-06-20
**Status**: Accepted

## Context

Devbot needed a stable, unique identifier to correlate a running Claude Code session with its summarize-chat output file and with the backend progress API. Two options existed: inject a custom `DEVBOT_CHAT_ID` environment variable from the devbot backend when spawning Claude, or use the built-in `CLAUDE_CODE_SESSION_ID` that Claude Code always sets for itself.

## Decision

Use `CLAUDE_CODE_SESSION_ID` (the env var Claude Code sets automatically) as both the summary file name and the `:id` parameter in the backend progress route (`GET /api/progress/:id`). The caller — devbot's frontend or any client — passes the Claude session ID directly when querying progress.

## Rationale

`CLAUDE_CODE_SESSION_ID` is always present without any injection logic on devbot's side. Introducing a custom env var (`DEVBOT_CHAT_ID`) would require devbot to generate and inject an ID at spawn time, adding coordination overhead and a new failure mode (missing env var). Since Claude Code's session ID is already unique and stable for the lifetime of a session, it serves the same purpose at zero additional cost.

## Consequences

- The backend progress route contract is tied to Claude session IDs, not to devbot-internal chat IDs. If devbot ever needs to look up progress by its own chat ID, a mapping layer is required.
- Clients must know or retrieve the `CLAUDE_CODE_SESSION_ID` for a given chat to query its progress. Devbot currently stores this alongside the chat record.
- No custom env var injection is needed when spawning Claude processes, simplifying the launch path.
