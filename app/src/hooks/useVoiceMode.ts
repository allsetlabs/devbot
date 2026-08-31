import { useCallback, useEffect, useRef, useState } from 'react';
import { sttTranscribe, ttsSynthesize, voiceApi, type VoiceMessage } from '../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoiceState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

export interface UseVoiceModeOptions {
  /** Auto-start a session on mount */
  autoStart?: boolean;
  /** Model to use for AI responses */
  model?: string;
  /** Custom system prompt */
  systemPrompt?: string;
  /** Enable Voice Activity Detection (auto-stop after silence) */
  vadEnabled?: boolean;
  /** Silence duration in ms before auto-stopping (default: 1500) */
  vadSilenceMs?: number;
}

export interface UseVoiceModeReturn {
  state: VoiceState;
  sessionId: string | null;
  messages: VoiceMessage[];
  currentTranscript: string;
  error: string | null;

  /** Start a new voice session */
  startSession: () => Promise<void>;
  /** End the current voice session */
  endSession: () => Promise<void>;
  /** Start listening (recording) */
  startListening: () => void;
  /** Stop listening and process the recording */
  stopListening: () => void;
  /** Toggle listening on/off */
  toggleListening: () => void;
  /** Stop any currently playing audio */
  stopSpeaking: () => void;
  /** Clear conversation history */
  clearHistory: () => Promise<void>;
  /** Interrupt: stop speaking and start listening immediately */
  interrupt: () => void;
}

// ---------------------------------------------------------------------------
// Web Speech API typings (same pattern as useSpeechToText.ts)
// ---------------------------------------------------------------------------

type WebkitSpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionEvent extends Event {
  results: { readonly length: number; [i: number]: SpeechRecognitionResult };
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
}

function getWebSpeechRecognition(): WebkitSpeechRecognitionCtor | undefined {
  const w = window as Window & {
    SpeechRecognition?: WebkitSpeechRecognitionCtor;
    webkitSpeechRecognition?: WebkitSpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VAD_CHECK_INTERVAL_MS = 100;
const VAD_SILENCE_THRESHOLD_DB = -50;
const DEFAULT_VAD_SILENCE_MS = 1500;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoiceMode(options: UseVoiceModeOptions = {}): UseVoiceModeReturn {
  const {
    autoStart = false,
    model,
    systemPrompt,
    vadEnabled = false,
    vadSilenceMs = DEFAULT_VAD_SILENCE_MS,
  } = options;

  // ---- Reactive state ----
  const [state, setState] = useState<VoiceState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ---- Mutable refs ----
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vadSilenceStartRef = useRef<number | null>(null);
  const webSpeechRef = useRef<SpeechRecognitionInstance | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackUrlRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Keep sessionIdRef in sync so callbacks always see the latest value
  sessionIdRef.current = sessionId;

  // ---- Helpers ----

  const cleanupPlayback = useCallback(() => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current.removeAttribute('src');
      playbackAudioRef.current = null;
    }
    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
    }
  }, []);

  const cleanupVad = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    vadSilenceStartRef.current = null;
  }, []);

  const cleanupWebSpeech = useCallback(() => {
    if (webSpeechRef.current) {
      webSpeechRef.current.stop();
      webSpeechRef.current = null;
    }
  }, []);

  const cleanupMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  const cleanupAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  const cleanupRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    cleanupVad();
    cleanupWebSpeech();
    cleanupMediaStream();
    cleanupAudioContext();
  }, [cleanupVad, cleanupWebSpeech, cleanupMediaStream, cleanupAudioContext]);

  // ---- VAD setup ----

  const startVad = useCallback(
    (stream: MediaStream, onSilence: () => void) => {
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Float32Array(analyser.fftSize);
        vadSilenceStartRef.current = null;

        vadIntervalRef.current = setInterval(() => {
          analyser.getFloatTimeDomainData(dataArray);

          // Compute RMS in dB
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const db = rms > 0 ? 20 * Math.log10(rms) : -100;

          if (db < VAD_SILENCE_THRESHOLD_DB) {
            // Below threshold — track silence duration
            if (vadSilenceStartRef.current === null) {
              vadSilenceStartRef.current = Date.now();
            } else if (Date.now() - vadSilenceStartRef.current >= vadSilenceMs) {
              onSilence();
            }
          } else {
            // Above threshold — reset
            vadSilenceStartRef.current = null;
          }
        }, VAD_CHECK_INTERVAL_MS);
      } catch (err) {
        console.error('[voice] VAD setup failed:', err);
      }
    },
    [vadSilenceMs]
  );

  // ---- Web Speech live preview ----

  const startWebSpeechPreview = useCallback(() => {
    const SR = getWebSpeechRecognition();
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setCurrentTranscript(text.trim());
    };

    recognition.onerror = () => {
      webSpeechRef.current = null;
    };

    recognition.onend = () => {
      webSpeechRef.current = null;
    };

    webSpeechRef.current = recognition;
    recognition.start();
  }, []);

  // ---- Audio playback ----

  const playAudio = useCallback(
    (blob: Blob): Promise<void> => {
      return new Promise((resolve, reject) => {
        cleanupPlayback();

        const url = URL.createObjectURL(blob);
        playbackUrlRef.current = url;

        const audio = new Audio(url);
        playbackAudioRef.current = audio;

        audio.addEventListener('ended', () => {
          cleanupPlayback();
          resolve();
        });

        audio.addEventListener('error', (e) => {
          cleanupPlayback();
          reject(new Error(`Audio playback error: ${(e as ErrorEvent).message || 'unknown'}`));
        });

        audio.play().catch((err) => {
          cleanupPlayback();
          reject(err);
        });
      });
    },
    [cleanupPlayback]
  );

  // ---- Conversation loop ----

  const processRecording = useCallback(
    async (blob: Blob) => {
      if (!mountedRef.current) return;

      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) {
        setError('No active voice session');
        setState('idle');
        return;
      }

      try {
        // Step 1: Transcribe audio via STT
        setState('transcribing');
        setError(null);

        const { transcript } = await sttTranscribe(blob);

        if (!transcript || !transcript.trim()) {
          setState('idle');
          return;
        }

        if (!mountedRef.current) return;

        setCurrentTranscript(transcript);

        // Add user message to history
        const userMessage: VoiceMessage = {
          role: 'user',
          content: transcript,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // Step 2: Send to voice AI for response
        setState('thinking');

        const response = await voiceApi.respond(currentSessionId, transcript, model);

        if (!mountedRef.current) return;

        const responseText = response.text;

        // Add assistant message to history
        const assistantMessage: VoiceMessage = {
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Step 3: Synthesize speech from response
        setState('speaking');

        const audioBlob = await ttsSynthesize(responseText);

        if (!mountedRef.current) return;

        // Step 4: Play the audio
        await playAudio(audioBlob);

        if (!mountedRef.current) return;

        setState('idle');
        setCurrentTranscript('');
      } catch (err) {
        if (!mountedRef.current) return;
        const message = err instanceof Error ? err.message : 'Voice processing failed';
        console.error('[voice] processing error:', err);
        setError(message);
        setState('idle');
        setCurrentTranscript('');
      }
    },
    [model, playAudio]
  );

  // ---- Recording control ----

  const startListening = useCallback(() => {
    if (state !== 'idle') return;

    setError(null);
    setCurrentTranscript('');

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        chunksRef.current = [];

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        const recorder = new MediaRecorder(stream, { mimeType });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          cleanupVad();
          cleanupWebSpeech();
          cleanupMediaStream();
          cleanupAudioContext();

          const blob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];

          if (blob.size < 1000) {
            // Too short — discard
            setState('idle');
            setCurrentTranscript('');
            return;
          }

          processRecording(blob);
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setState('listening');

        // Start Web Speech preview for live transcript
        startWebSpeechPreview();

        // Start VAD if enabled
        if (vadEnabled) {
          startVad(stream, () => {
            // Auto-stop on silence
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
          });
        }
      })
      .catch((err) => {
        console.error('[voice] mic access denied:', err);
        setError('Microphone access denied');
        setState('idle');
      });
  }, [
    state,
    vadEnabled,
    processRecording,
    startWebSpeechPreview,
    startVad,
    cleanupVad,
    cleanupWebSpeech,
    cleanupMediaStream,
    cleanupAudioContext,
  ]);

  const stopListening = useCallback(() => {
    if (state !== 'listening') return;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // onstop handler will take it from here
  }, [state]);

  const toggleListening = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else if (state === 'idle') {
      startListening();
    }
  }, [state, startListening, stopListening]);

  const stopSpeaking = useCallback(() => {
    cleanupPlayback();
    if (state === 'speaking') {
      setState('idle');
      setCurrentTranscript('');
    }
  }, [state, cleanupPlayback]);

  const interrupt = useCallback(() => {
    // Stop any current playback
    cleanupPlayback();
    // If we're in the middle of speaking, jump straight to listening
    if (state === 'speaking') {
      setState('idle');
      setCurrentTranscript('');
      // Use setTimeout to avoid state update conflicts
      setTimeout(() => startListening(), 0);
    }
  }, [state, cleanupPlayback, startListening]);

  // ---- Session management ----

  const startSession = useCallback(async () => {
    try {
      setError(null);
      const session = await voiceApi.createSession(systemPrompt);
      setSessionId(session.id);
      sessionIdRef.current = session.id;
      setMessages([]);
      setCurrentTranscript('');
      setState('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create voice session';
      console.error('[voice] session creation failed:', err);
      setError(message);
    }
  }, [systemPrompt]);

  const endSession = useCallback(async () => {
    // Stop everything in progress
    cleanupRecording();
    cleanupPlayback();

    const sid = sessionIdRef.current;
    if (sid) {
      try {
        await voiceApi.endSession(sid);
      } catch (err) {
        console.error('[voice] session end failed:', err);
      }
    }

    setSessionId(null);
    sessionIdRef.current = null;
    setState('idle');
    setCurrentTranscript('');
  }, [cleanupRecording, cleanupPlayback]);

  const clearHistory = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (sid) {
      try {
        await voiceApi.clearHistory(sid);
      } catch (err) {
        console.error('[voice] clear history failed:', err);
      }
    }
    setMessages([]);
  }, []);

  // ---- Auto-start on mount ----

  useEffect(() => {
    if (autoStart) {
      startSession();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Cleanup on unmount ----

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cleanupRecording();
      cleanupPlayback();

      // End session on unmount (fire and forget)
      const sid = sessionIdRef.current;
      if (sid) {
        voiceApi.endSession(sid).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    sessionId,
    messages,
    currentTranscript,
    error,
    startSession,
    endSession,
    startListening,
    stopListening,
    toggleListening,
    stopSpeaking,
    clearHistory,
    interrupt,
  };
}
