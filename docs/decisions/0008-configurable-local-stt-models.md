# 0008 — Configurable Local STT Models

**Date**: 2026-06-20
**Status**: Accepted

## Context

DevBot previously hardcoded Whisper Tiny for every local transcription. Users need to trade speed for accuracy, use multilingual transcription including Tamil, and optionally use NVIDIA Parakeet v3 on supported hardware.

## Decision

Persist the selected STT model in the core database's `application_settings` table and expose selection, status, and installation through the STT API. Support Whisper Tiny, Whisper Small English, Whisper Small Multilingual, and Parakeet-TDT 0.6B v3. Use `parakeet-mlx` for Parakeet inference on Apple Silicon. Whisper Tiny remains the default.

## Rationale

Database persistence keeps model selection consistent across DevBot clients, includes it in normal database backups, and lets the transcription route own runtime dispatch. The existing OpenAI Whisper package supports all three Whisper variants and multilingual Whisper covers Tamil. Parakeet v3 supports 25 European languages but not Tamil; its MLX conversion provides practical local inference on the Mac hardware where DevBot runs.

## Consequences

- Model downloads can be large and installation can take several minutes.
- Parakeet requires Apple Silicon and the `parakeet-mlx` runtime.
- Tamil users must select Whisper Small Multilingual.
- The backend performs model installation, so installation failures are reported through the API and backend logs.
- Existing `.devbot/stt-settings.json` data is migrated once and then removed.
