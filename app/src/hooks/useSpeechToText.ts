import { useCallback, useEffect, useRef, useState } from 'react';
import { sttTranscribe, sttStatus } from '../lib/api';

export interface UseSpeechToTextOptions {
  /** Called with the final accurate transcript to insert into the textarea */
  onTranscript: (transcript: string) => void;
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

function getWebSpeechRecognition(): WebkitSpeechRecognitionCtor | undefined {
  const w = window as Window & {
    SpeechRecognition?: WebkitSpeechRecognitionCtor;
    webkitSpeechRecognition?: WebkitSpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useSpeechToText({ onTranscript }: UseSpeechToTextOptions): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [lastSttOutput, setLastSttOutput] = useState<string | null>(null);

  const localAvailableRef = useRef<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Web Speech ref used in two roles:
  //   - combined mode: live preview only (whisper does the real transcription)
  //   - fallback mode: both preview and final transcript
  const webSpeechRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    sttStatus()
      .then((s) => { localAvailableRef.current = s.available; })
      .catch(() => { localAvailableRef.current = false; });
  }, []);

  // ---------------------------------------------------------------------------
  // Web Speech — live preview only (preview=true) or sole source (preview=false)
  // ---------------------------------------------------------------------------

  const startWebSpeech = useCallback((previewOnly: boolean) => {
    const SR = getWebSpeechRecognition();
    if (!SR) return;

    const recognition = new SR();
    // continuous=true so it keeps streaming while MediaRecorder is running
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
      // Build full interim + final text from all accumulated results
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      const trimmed = text.trim();

      if (previewOnly) {
        // Only drive the preview row — whisper will supply the accurate final text
        setStatusText(trimmed);
      } else {
        // Fallback path: Web Speech is the sole source
        setStatusText(trimmed);
        // Check if the latest result is final so we can commit it
        const latest = event.results[event.results.length - 1];
        if (latest?.isFinal) {
          const finalText = trimmed;
          setLastSttOutput(finalText);
          onTranscriptRef.current(finalText);
          setStatusText('');
          setIsListening(false);
          webSpeechRef.current?.stop();
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
  }, []);

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

      // Stop Web Speech preview — its job is done
      webSpeechRef.current?.stop();
      webSpeechRef.current = null;

      setIsListening(false);

      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size < 1000) {
        setStatusText('');
        return;
      }

      setIsTranscribing(true);
      setStatusText('Transcribing with whisper...');
      try {
        const { transcript } = await sttTranscribe(blob);
        if (transcript) {
          setLastSttOutput(transcript);
          onTranscriptRef.current(transcript);
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

    // Start Web Speech in preview-only mode for live feedback
    startWebSpeech(true);
  }, [startWebSpeech]);

  // ---------------------------------------------------------------------------
  // Toggle
  // ---------------------------------------------------------------------------

  const toggle = useCallback(() => {
    if (isListening || isTranscribing) {
      stopMediaRecorder();
      // In fallback mode, stop web speech directly
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
      // Fallback: Web Speech only
      setIsListening(true);
      startWebSpeech(false);
    } else {
      // Status still loading — try combined; will fall through gracefully on mic error
      startCombined();
    }
  }, [isListening, isTranscribing, stopMediaRecorder, startCombined, startWebSpeech]);

  const clearLastSttOutput = useCallback(() => setLastSttOutput(null), []);

  useEffect(() => {
    return () => {
      stopMediaRecorder();
      webSpeechRef.current?.stop();
    };
  }, [stopMediaRecorder]);

  return { isListening, isTranscribing, statusText, lastSttOutput, toggle, clearLastSttOutput };
}
