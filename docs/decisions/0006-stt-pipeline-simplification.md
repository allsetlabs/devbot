# 0006 — STT Pipeline Simplification: Drop Learning Log, Project-Local Dictionary

**Date**: 2026-06-20
**Status**: Accepted
**Supersedes**: Parts of [0005](0005-stt-corrections-json-storage.md) (dual-storage design and file location)

## Context

ADR 0005 established a dual-storage design for STT corrections: a machine-readable `stt-corrections.json` for the Ollama correction pass, and a retained `stt-learning.md` markdown log that Whisper's `--initial_prompt` hint continued to read.

Two problems emerged:
1. **Dead complexity**: Once Ollama handles transcript cleanup, Whisper's `--initial_prompt` adds no measurable improvement — Whisper runs a first-pass transcription and Ollama immediately post-processes it anyway. Maintaining two files for marginally different purposes created unnecessary indirection.
2. **Wrong storage location**: `~/.devbot/` is a global home-directory path. When `DEVBOT_PROJECTS_DIR` is set (which it always is via `make start`), the project's runtime data should live adjacent to the project, not in an unrelated global directory.

## Decision

1. **Remove `stt-learning.md` entirely.** No more markdown log; no more `--initial_prompt` passed to Whisper. The Ollama post-processing pass is the sole cleanup mechanism.
2. **Rename** `stt-corrections.json` → `stt-corrections-dictionary.json` to make the file's role self-evident without opening it.
3. **Relocate** the dictionary from `~/.devbot/stt-corrections-dictionary.json` to `DEVBOT_PROJECTS_DIR/.devbot/stt-corrections-dictionary.json` (defaults to `/super/.devbot/`).
4. **Upgrade the Ollama prompt** from a minimal corrections-substitution template to a full transcript cleanup template: filler word removal (`um`, `uh`, `like`, `you know`), self-correction handling (`"scratch that"`, `"delete that"`, `"I mean"`), grammar/punctuation/capitalization correction, and professional tone — in addition to applying the known-corrections dictionary.

## Rationale

- **Fewer moving parts**: one file, one correction mechanism. The markdown log was append-only with no deletion API; the JSON dictionary is the right authoritative store.
- **Project-local data**: `DEVBOT_PROJECTS_DIR` is already used for all other runtime paths (`.tmp/summarize-chat/`, session data). Putting the dictionary there keeps all runtime state in one place and avoids a hidden global dependency on `~/.devbot/`.
- **Richer transcript output**: the original prompt only substituted known pairs. The full template produces genuinely clean text — removing verbal tics, resolving "scratch that" self-corrections, and applying proper punctuation — which is the actual user goal.
- **Prompt template clarity**: the `{{DICTIONARY}}` / `{{TRANSCRIPT}}` slot structure in the template makes it easy to audit and iterate on the Ollama instruction without touching route logic.

## Consequences

- `stt-learning.md` is permanently deleted; there is no migration path back (its content was append-only audit logs with no programmatic consumers).
- The dictionary file must be manually copied if the `DEVBOT_PROJECTS_DIR` changes (it is not in `~/.devbot/` anymore).
- Whisper now runs without `--initial_prompt`, which may very slightly reduce Whisper accuracy for domain-specific vocabulary on the first pass — but Ollama's cleanup pass compensates for this downstream.
- Any tooling or docs that reference `stt-corrections.json` or `~/.devbot/stt-corrections.json` must be updated to the new path and filename.
