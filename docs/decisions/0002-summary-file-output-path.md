# 0002 — Summary files written to DEVBOT_PROJECTS_DIR/.tmp/summarize-chat/

**Date**: 2026-06-20
**Status**: Accepted

## Context

The `summarize-chat` agent runs at session end inside whatever working directory the Claude Code session was started in (typically a module subdirectory). The devbot backend needs to read the resulting JSON file to serve progress data. If the agent wrote the file relative to the session's CWD, its location would vary by project and the backend would have no reliable way to find it.

## Decision

When `DEVBOT_PROJECTS_DIR` is set, the `summarize-chat` agent writes its output to `$DEVBOT_PROJECTS_DIR/.tmp/summarize-chat/<session-id>.json` instead of writing relative to the session's CWD. The backend reads from this same fixed base path using the same env var.

## Rationale

A fixed, well-known directory anchored to `DEVBOT_PROJECTS_DIR` is the only location the backend can find reliably regardless of which project directory Claude Code was running in. Writing to CWD would require the backend to track each session's CWD — information it may not have — or scan multiple directories.

## Consequences

- `DEVBOT_PROJECTS_DIR` must be set consistently in both the environment where Claude Code sessions run and where the devbot backend process runs.
- If the env var is absent (e.g. running Claude Code standalone, outside devbot), the agent falls back to writing relative to CWD, which is harmless for non-devbot use.
- The `.tmp/summarize-chat/` directory accumulates files over time; devbot is responsible for pruning old entries.
