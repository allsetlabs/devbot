# 0007 — transcript-cleaner: Named Ollama Model with Baked-In System Prompt

**Date**: 2026-06-20
**Status**: Accepted

## Context

The STT correction pass (see ADR 0004 and ADR 0006) used `ollamaGenerate` to call a raw Ollama model (`llama3.2:3b`) with a long system-instruction block prepended to every single API request. This meant:

1. **Repeated token cost** — the full instruction set (~350 tokens) was serialized into every `/transcribe` call, adding latency and wasting context budget.
2. **Instruction drift risk** — the correction behavior was defined in `applyOllamaCorrections()` in `stt.ts`, meaning it could be accidentally changed, truncated, or lost during refactors.
3. **Model coupling** — the code referenced `llama3.2:3b` by name; swapping models required changing source code.
4. **Model capability ceiling** — `llama3.2:3b` is a 2 GB model optimized for speed; it lacks the instruction-following precision needed for reliable self-correction handling (`"scratch that"`, `"delete that"`) and context-aware dictionary substitution.

## Decision

1. **Create a `Modelfile`** at `modules/forge-modules/devbot/Modelfile` that defines a custom Ollama model:
   - `FROM qwen3:14b` — a 14B parameter model with stronger instruction-following than the previous 3B model
   - `PARAMETER temperature 0` — deterministic output for consistent transcript correction
   - `SYSTEM """..."""` — the complete correction engine instructions baked into the model layer, not the API call

2. **Register the model as `transcript-cleaner`** via `ollama create transcript-cleaner -f Modelfile`.

3. **Set `STT_CORRECTION_MODEL = 'transcript-cleaner'`** — the codebase never references the base model name directly.

4. **Reduce the `applyOllamaCorrections` prompt** to a minimal three-section format:
   ```
   Correction dictionary:
   <entries>

   Raw transcript:
   <text>

   Final cleaned text:
   ```
   All behavioral instructions live in the model's SYSTEM block, not here.

5. **Add `setup-ollama` to the Makefile** — installs Ollama if absent, then runs `ollama create transcript-cleaner -f Modelfile`. Wired into `make setup`.

## Rationale

- **System prompt in Modelfile** — Ollama models with a SYSTEM block apply those instructions at the model layer, not the prompt layer. They are not re-tokenized on each call and cannot be overridden by the user-level prompt. This makes the correction behavior stable and token-efficient.
- **Named model (`transcript-cleaner`)** — decouples the API call site from the underlying base model. To upgrade the base model, update `Modelfile` and run `ollama create` — zero code changes. The name also makes the model's purpose self-documenting in `ollama list`.
- **qwen3:14b over llama3.2:3b** — `qwen3:14b` has significantly better instruction-following for complex, multi-rule prompts; the 3B model frequently ignored self-correction commands (`"scratch that"`) or misapplied dictionary entries out of context. The size trade-off (8 GB vs 2 GB) is acceptable since STT correction runs asynchronously after Whisper.
- **temperature 0** — transcript correction is a deterministic transformation task; non-zero temperature introduces unnecessary variation in the output.

## Consequences

- `qwen3:14b` must be available locally (pulled as part of `make setup`). First setup on a new machine requires ~8 GB download.
- Changing the correction instructions requires re-running `ollama create transcript-cleaner -f Modelfile` — the model is not hot-reloadable. This is a one-command operation but must be documented in the setup flow.
- `OLLAMA_STT_MODEL` env var can still override the model name at runtime for testing alternate models.
- The `Modelfile` is source-controlled alongside the backend code; it is the single source of truth for correction behavior and must be updated whenever the system prompt changes.
