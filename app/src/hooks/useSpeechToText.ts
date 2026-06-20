import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { sttTranscribe, sttStatus } from '../lib/api';

export interface UseSpeechToTextOptions {
  /** Called with the final accurate transcript to insert into the textarea */
  onTranscript: (transcript: string) => void;
  /** Called after transcript is committed when the user says "send" */
  onTriggerSend?: () => void;
  /** Called after transcript is committed when the user says "queue" or "q" */
  onTriggerQueue?: () => void;
}

export interface UseSpeechToTextReturn {
  isListening: boolean;
  isTranscribing: boolean;
  /** Live preview text shown below the textarea (Web Speech interim text, or status like "Transcribing...") */
  statusText: string;
  /** Raw whisper output from the most recent session — null if STT hasn't been used */
  lastSttOutput: string | null;
  toggle: () => void;
  clearLastSttOutput: () => void;
}

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

type TriggerAction = 'send' | 'queue' | null;

const SEND_WORDS = ['send'];
const QUEUE_WORDS = ['queue', 'q'];
const TRIGGER_DELAY_MS = 1000;

function checkTriggerWord(text: string): { stripped: string; action: TriggerAction } {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  for (const word of SEND_WORDS) {
    if (lower === word) return { stripped: '', action: 'send' };
    if (lower.endsWith(` ${word}`)) {
      return { stripped: trimmed.slice(0, trimmed.length - word.length).trim(), action: 'send' };
    }
  }
  for (const word of QUEUE_WORDS) {
    if (lower === word) return { stripped: '', action: 'queue' };
    if (lower.endsWith(` ${word}`)) {
      return { stripped: trimmed.slice(0, trimmed.length - word.length).trim(), action: 'queue' };
    }
  }
  return { stripped: trimmed, action: null };
}

function getWebSpeechRecognition(): WebkitSpeechRecognitionCtor | undefined {
  const w = window as Window & {
    SpeechRecognition?: WebkitSpeechRecognitionCtor;
    webkitSpeechRecognition?: WebkitSpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useSpeechToText({
  onTranscript,
  onTriggerSend,
  onTriggerQueue,
}: UseSpeechToTextOptions): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [lastSttOutput, setLastSttOutput] = useState<string | null>(null);

  const localAvailableRef = useRef<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const webSpeechRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onTriggerSendRef = useRef(onTriggerSend);
  onTriggerSendRef.current = onTriggerSend;
  const onTriggerQueueRef = useRef(onTriggerQueue);
  onTriggerQueueRef.current = onTriggerQueue;
  // Pending voice action set by Web Speech, consumed in recorder.onstop
  const pendingActionRef = useRef<TriggerAction>(null);
  // Timeout handle for the 1-second trigger delay
  const triggerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTriggerTimeout = useCallback(() => {
    if (triggerTimeoutRef.current) {
      clearTimeout(triggerTimeoutRef.current);
      triggerTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    sttStatus()
      .then((s) => {
        localAvailableRef.current = s.available;
      })
      .catch(() => {
        localAvailableRef.current = false;
      });
  }, []);

  const fireTrigger = useCallback((action: TriggerAction) => {
    if (action === 'send') onTriggerSendRef.current?.();
    else if (action === 'queue') onTriggerQueueRef.current?.();
  }, []);

  // ---------------------------------------------------------------------------
  // Web Speech — live preview only (preview=true) or sole source (preview=false)
  // ---------------------------------------------------------------------------

  const startWebSpeech = useCallback(
    (previewOnly: boolean) => {
      const SR = getWebSpeechRecognition();
      if (!SR) return;

      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (!previewOnly) setIsListening(true);
      };
      recognition.onend = () => {
        webSpeechRef.current = null;
        if (!previewOnly) {
          setIsListening(false);
          setStatusText('');
        }
      };
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        const trimmed = text.trim();
        const latest = event.results[event.results.length - 1];

        if (previewOnly) {
          setStatusText(trimmed);
          if (latest?.isFinal) {
            const { action } = checkTriggerWord(trimmed);
            if (action) {
              // Cancel any previous pending trigger, start a fresh 1s delay
              clearTriggerTimeout();
              pendingActionRef.current = action;
              triggerTimeoutRef.current = setTimeout(() => {
                triggerTimeoutRef.current = null;
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                  mediaRecorderRef.current.stop();
                }
              }, TRIGGER_DELAY_MS);
            } else {
              // New final result with no trigger — cancel any pending trigger
              clearTriggerTimeout();
              pendingActionRef.current = null;
            }
          }
        } else {
          // Fallback path: Web Speech is the sole source
          setStatusText(trimmed);
          if (latest?.isFinal) {
            const { stripped, action } = checkTriggerWord(trimmed);
            const finalText = stripped || trimmed;
            flushSync(() => {
              setLastSttOutput(finalText);
              onTranscriptRef.current(finalText);
            });
            setStatusText('');
            setIsListening(false);
            webSpeechRef.current?.stop();
            if (action) {
              // 1-second delay before firing so the user can hear the confirmation
              triggerTimeoutRef.current = setTimeout(() => {
                triggerTimeoutRef.current = null;
                fireTrigger(action);
              }, TRIGGER_DELAY_MS);
            }
          }
        }
      };
      recognition.onerror = () => {
        webSpeechRef.current = null;
        if (!previewOnly) {
          setIsListening(false);
          setStatusText('');
        }
      };

      webSpeechRef.current = recognition;
      recognition.start();
    },
    [fireTrigger, clearTriggerTimeout]
  );

  // ---------------------------------------------------------------------------
  // Combined mode: MediaRecorder (whisper) + Web Speech (preview)
  // ---------------------------------------------------------------------------

  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startCombined = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      console.error('[stt] mic access denied');
      return;
    }

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());

      webSpeechRef.current?.stop();
      webSpeechRef.current = null;

      setIsListening(false);

      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size < 1000) {
        setStatusText('');
        return;
      }

      const pendingAction = pendingActionRef.current;
      pendingActionRef.current = null;

      setIsTranscribing(true);
      setStatusText('Transcribing with whisper...');
      try {
        const { transcript } = await sttTranscribe(blob);
        if (transcript) {
          // Strip trigger word from whisper output if present (whisper may or may not capture it)
          const { stripped, action } = checkTriggerWord(transcript);
          const finalAction = action ?? pendingAction;
          const finalText = action ? stripped || transcript : transcript;
          flushSync(() => {
            setLastSttOutput(finalText);
            onTranscriptRef.current(finalText);
          });
          if (finalAction) fireTrigger(finalAction);
        } else if (pendingAction) {
          fireTrigger(pendingAction);
        }
      } catch (err) {
        console.error('[stt] whisper failed:', err);
      } finally {
        setIsTranscribing(false);
        setStatusText('');
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsListening(true);
    setStatusText('');

    startWebSpeech(true);
  }, [startWebSpeech, fireTrigger]);

  // ---------------------------------------------------------------------------
  // Toggle
  // ---------------------------------------------------------------------------

  const toggle = useCallback(() => {
    if (isListening || isTranscribing) {
      clearTriggerTimeout();
      pendingActionRef.current = null;
      stopMediaRecorder();
      if (!mediaRecorderRef.current) {
        webSpeechRef.current?.stop();
        setIsListening(false);
        setStatusText('');
      }
      return;
    }

    const whisperAvailable = localAvailableRef.current;

    if (whisperAvailable === true) {
      startCombined();
    } else if (whisperAvailable === false) {
      setIsListening(true);
      startWebSpeech(false);
    } else {
      startCombined();
    }
  }, [
    isListening,
    isTranscribing,
    stopMediaRecorder,
    startCombined,
    startWebSpeech,
    clearTriggerTimeout,
  ]);

  const clearLastSttOutput = useCallback(() => setLastSttOutput(null), []);

  useEffect(() => {
    return () => {
      clearTriggerTimeout();
      stopMediaRecorder();
      webSpeechRef.current?.stop();
    };
  }, [stopMediaRecorder, clearTriggerTimeout]);

  return { isListening, isTranscribing, statusText, lastSttOutput, toggle, clearLastSttOutput };
}
