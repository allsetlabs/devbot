# 0004 — Ollama Local Model for STT Correction

**Date**: 2026-06-20
**Status**: Accepted

## Context

DevBot's speech-to-text pipeline (Whisper) frequently mishears domain-specific terms — tool names, project names, commands — that the user corrects manually. The system needed an AI layer to (a) analyze those corrections and extract a vocabulary map, and (b) apply that map to each new transcript before it reaches the user.

The backend already had a `spawnClaude` helper for calling the Claude API, and qwen3-coder (18 GB) was already installed via Ollama locally.

## Decision

Use a locally-running Ollama model (`llama3.2:3b` by default, overridable via `OLLAMA_STT_MODEL`) for both the `/learn` correction-analysis pass and the `/transcribe` post-processing pass. The model selection is handled in `backend/src/lib/ollama.ts`. The prior `spawnClaude` approach for `/learn` was replaced entirely.

## Rationale

- **No API cost** — STT events can fire on every voice message; routing every correction through Claude's API would accumulate cost quickly.
- **Low latency for post-processing** — `llama3.2:3b` is small enough (~2 GB) that the correction pass adds ~1 s to transcription latency; the 18 GB qwen3-coder would have added significantly more.
- **Fully local / offline** — no outbound network calls for voice data, which is sensitive input.
- **Graceful degradation** — `isOllamaAvailable()` is checked before each call; if Ollama is down, the raw Whisper transcript is returned unchanged.
- `OLLAMA_STT_MODEL` allows swapping the model per environment without code changes.

## Consequences

- Ollama must be running locally with `llama3.2:3b` pulled for the correction pass to activate. A missing Ollama silently degrades to raw Whisper output — no hard failure.
- The `/learn` endpoint now has a dependency on Ollama being available; if it is not, learning is skipped and the client receives `{ learned: false, reason: "ollama_unavailable" }`.
- Changing the model (e.g., to a larger one for better accuracy) requires pulling the new model and setting `OLLAMA_STT_MODEL` — no code change needed, but the latency trade-off must be re-evaluated.
