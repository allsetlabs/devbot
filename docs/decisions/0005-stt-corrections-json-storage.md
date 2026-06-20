# 0005 — STT Corrections Stored as JSON Key-Value Map

**Date**: 2026-06-20
**Status**: Superseded by [0006](0006-stt-pipeline-simplification.md) (dual-storage design and file location changed)

## Context

As users corrected STT transcription errors, the system needed a place to persist the learned vocabulary so it could be applied to future transcripts. The original implementation appended every correction event as a prose log entry into `~/.devbot/stt-learning.md`, which was already being used to supply Whisper's `--initial_prompt` hint.

The Ollama post-processing pass added a programmatic requirement: a machine-readable structure mapping misheard phrases to correct ones that could be serialized into the LLM prompt and inspected or edited by the user.

## Decision

Corrections are stored as a flat JSON object (`"misheard phrase" → "correct phrase"`) at `~/.devbot/stt-corrections.json`. This is the authoritative correction source for both the `/transcribe` Ollama pass and the `/learn` endpoint.

`~/.devbot/stt-learning.md` is kept and still receives appended entries on every `/learn` call, but solely as a source of vocabulary hints for Whisper's `--initial_prompt` (it is not used for the Ollama correction pass).

Two new endpoints expose the JSON map: `GET /api/stt/corrections` and `PUT /api/stt/corrections`.

## Rationale

- **Machine-readability** — the Ollama prompt serializes corrections as `"wrong" → "right"` lines; a flat key-value map is the natural backing structure for this, whereas a markdown log requires re-parsing on every transcription.
- **Deduplication** — merging a new correction set into the map naturally deduplicates (last write wins per key); a log file would accumulate duplicate entries over time.
- **User editability** — a JSON file is easier to inspect and correct manually than a prose log; the `PUT /api/stt/corrections` endpoint also allows programmatic updates.
- **Backward compatibility** — retaining `stt-learning.md` appends preserves Whisper's `--initial_prompt` vocabulary hint behavior without any change to the Whisper invocation path.

## Consequences

- `~/.devbot/stt-corrections.json` is the new source of truth for the correction vocabulary; `stt-learning.md` is a secondary, append-only audit log.
- Users who had corrections only in `stt-learning.md` before this change needed a one-time migration to seed `stt-corrections.json` (done manually at the time of introduction).
- The `PUT /api/stt/corrections` endpoint performs a merge (not a replace), so individual entries cannot be deleted via the API — a direct file edit is required to remove an entry.
- If the JSON file becomes corrupted, `readCorrections()` returns an empty map and degrades gracefully (Ollama pass runs with no known corrections).
