# Voice Conversation Mode

**Goal:** Let users interact with DevBot entirely by voice — no typing required. Speak a command, hear the response read back, continue the conversation hands-free.

**Status:** Phase 1 (STT) — in progress

---

## Phases

### Phase 1 — Speech to Text (STT) ✅ In Progress
Replace the browser Web Speech API with local Whisper inference so audio never leaves the machine.

**What's built:**
- `backend/src/routes/stt.ts` — `/api/stt/transcribe` runs `python3 -m whisper` locally via ffmpeg + tiny model
- `app/src/hooks/useSpeechToText.ts` — MediaRecorder → backend whisper, falls back to Web Speech API
- `ChatTextareaWithPickers.tsx` — uses the new hook; mic button shows Recording/Transcribing states

**STT Learning system** (also in Phase 1):
- On every send: if STT output ≠ final message, fire `/api/stt/learn` (fire-and-forget)
- Claude Haiku compares the two texts, identifies genuine transcription errors
- Corrections appended to `~/.devbot/stt-learning.md`
- Learning file feeds `--initial_prompt` to Whisper before each transcription, improving accuracy over time

**Remaining:**
- Test end-to-end on mobile (HTTPS required for MediaRecorder)
- Consider upgrading from `tiny` to `small.en` model for better accuracy

---

### Phase 2 — Text to Speech (TTS)
Read AI responses aloud after each assistant message completes.

**Approach:**
- Use macOS `say` command via a backend endpoint (`/api/tts/speak`) — zero setup, no model download
- Frontend calls it after each completed assistant message arrives
- Controls: auto-play toggle in settings, stop button, speed selector
- Fall back to browser `window.speechSynthesis` when backend isn't reachable (e.g. mobile off-network)

**Backend (`backend/src/routes/tts.ts`):**
```
POST /api/tts/speak   { text, voice?, rate? }  → streams audio or fires `say` async
GET  /api/tts/voices                           → list available macOS voices
GET  /api/tts/status                           → { available: boolean }
```

**Frontend:**
- `useTts` hook — exposes `speak(text)`, `stop()`, `isSpeaking`
- Invoked from `ChatMessage.tsx` when a new assistant message is marked `done`
- Settings toggle: `autoReadResponses` (persisted in localStorage)

**Chunking strategy:** `say` can handle long text but sounds better with sentence-chunked streaming. Split on `.!?` boundaries and speak each chunk sequentially so the first sentence starts immediately.

---

### Phase 3 — Conversation Modal (Voice-Only Mode)
A fullscreen overlay for hands-free back-and-forth — no keyboard, no scrolling.

**UX flow:**
1. User taps a floating mic button (or holds a hotkey)
2. Modal opens — full screen, dark background
3. Listening indicator pulses while recording
4. On release/tap: transcribes → sends to chat → AI responds → TTS reads response aloud
5. After TTS finishes: automatically re-arms the mic (push-to-talk or always-on toggle)
6. User can say "stop" / tap X to dismiss modal

**Component:** `VoiceConversationModal.tsx`
- Floating trigger button in `ChatViewHeader` or as a FAB
- Uses `useSpeechToText` + `useTts` hooks
- Bypasses the textarea entirely — calls `onSend` with transcript directly
- Shows last transcript and last AI response as text (accessibility + confirmation)
- Detects silence automatically (MediaRecorder `timeslice` + amplitude check) for auto-send without a button tap

**Settings:**
- `voiceMode.autoSend` — send on silence (default: false, user taps to send)
- `voiceMode.autoListen` — re-arm mic after TTS finishes (default: false)
- `voiceMode.ttsVoice` — preferred macOS voice

---

## Architecture Overview

```
User speaks
    │
    ▼
MediaRecorder (browser)
    │  audio blob
    ▼
POST /api/stt/transcribe
    │  uses: ffmpeg + python3 whisper (tiny model, local)
    │  seeds: ~/.devbot/stt-learning.md → --initial_prompt
    ▼
transcript text
    │
    ▼
[Phase 3] VoiceConversationModal skips textarea
[Phase 1] ChatTextareaWithPickers populates textarea → user reviews → Send
    │
    ▼
POST /api/interactive-chats/:id/send
    │
    ▼
Claude responds (streamed into ChatMessage)
    │
    ▼
[Phase 2] useTts.speak(responseText)
    │  uses: POST /api/tts/speak → macOS `say` command (local)
    ▼
User hears response
    │
    ▼
[Phase 3] auto re-arm mic → loop
```

---

## File Map

| File | Phase | Purpose |
|------|-------|---------|
| `backend/src/routes/stt.ts` | 1 ✅ | Whisper transcription + learning endpoints |
| `backend/src/routes/tts.ts` | 2 | macOS `say` TTS endpoint |
| `app/src/hooks/useSpeechToText.ts` | 1 ✅ | MediaRecorder → whisper hook |
| `app/src/hooks/useTts.ts` | 2 | TTS playback hook |
| `app/src/components/ChatTextareaWithPickers.tsx` | 1 ✅ | STT integration + learn-on-send |
| `app/src/components/ChatMessage.tsx` | 2 | Trigger TTS on completed assistant messages |
| `app/src/components/VoiceConversationModal.tsx` | 3 | Fullscreen voice-only conversation UI |
| `~/.devbot/stt-learning.md` | 1 ✅ | Auto-maintained correction log for Whisper |

---

## Open Questions

- **TTS for long responses:** Claude responses can be 1000+ words. Strategy: read only the first 2–3 sentences and offer a "read more" button, or let user configure max read length.
- **Silence detection threshold:** Different microphones have different noise floors. May need a calibration step or adaptive threshold.
- **Mobile:** `say` command is macOS-only. For mobile access, fall back to `window.speechSynthesis` (browser TTS, available on iOS Safari).
- **Hotkey:** Phase 3 could support a global hold-to-talk key (Space or Ctrl) when the modal is open.
