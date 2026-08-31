import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Mic, MicOff, PhoneOff, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { useVoiceMode, type VoiceState } from '../hooks/useVoiceMode';

const ORB_STYLES: Record<VoiceState, string> = {
  idle: 'border-muted-foreground/30 scale-100 animate-pulse',
  listening: 'border-green-500 ring-4 ring-green-500/20 animate-[pulse_1.2s_ease-in-out_infinite]',
  transcribing: 'border-amber-500 ring-4 ring-amber-500/20',
  thinking: 'border-blue-500 ring-4 ring-blue-500/20 animate-[pulse_1.5s_ease-in-out_infinite]',
  speaking: 'border-violet-500 ring-4 ring-violet-500/20 animate-[pulse_0.8s_ease-in-out_infinite] scale-105',
};

const STATUS_LABELS: Record<VoiceState, string> = {
  idle: 'Tap to speak',
  listening: 'Listening...',
  transcribing: 'Transcribing...',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
};

function AnimatedOrb({ state }: { state: VoiceState }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`flex h-36 w-36 items-center justify-center rounded-full border-4 transition-all duration-500 ${ORB_STYLES[state]}`}
      >
        {state === 'transcribing' ? (
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        ) : state === 'listening' ? (
          <Mic className="h-10 w-10 text-green-500" />
        ) : state === 'speaking' ? (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="inline-block w-1 rounded-full bg-violet-500"
                style={{
                  height: `${12 + Math.random() * 20}px`,
                  animation: `pulse ${0.4 + i * 0.1}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        ) : state === 'thinking' ? (
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        ) : (
          <Mic className="h-10 w-10 text-muted-foreground/50" />
        )}
      </div>
      <p className="text-sm font-medium text-muted-foreground">{STATUS_LABELS[state]}</p>
    </div>
  );
}

export function VoiceModePage() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    state, messages, currentTranscript, error,
    endSession, toggleListening, interrupt, clearHistory,
  } = useVoiceMode({ autoStart: true, vadEnabled: true });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, currentTranscript]);

  const handleMicTap = () => {
    if (state === 'speaking') interrupt();
    else toggleListening();
  };

  const handleEndCall = async () => {
    await endSession();
    navigate('/chats');
  };

  const micDisabled = state === 'transcribing' || state === 'thinking';

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {error && (
        <div className="absolute left-4 right-4 top-4 z-50 rounded-lg bg-destructive/90 px-4 py-2 text-sm text-destructive-foreground animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">Voice Mode</span>
        <div className="h-9 w-9" />
      </div>

      {/* Orb */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <AnimatedOrb state={state} />
      </div>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="mx-4 max-h-48 min-h-[4rem] overflow-y-auto rounded-xl bg-muted/30 px-4 py-3"
      >
        {messages.length === 0 && !currentTranscript ? (
          <p className="text-center text-xs text-muted-foreground/60">
            Your conversation will appear here
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  {msg.role === 'user' ? 'You' : 'AI'}
                </span>
                <p className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-primary' : 'text-foreground'}`}>
                  {msg.content}
                </p>
              </div>
            ))}
            {currentTranscript && (
              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">You</span>
                <p className="text-sm text-primary/50 italic">{currentTranscript}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 px-6 py-8">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full md:hover:bg-muted active:bg-muted"
          disabled={messages.length === 0}
          onClick={() => clearHistory()}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
        <Button
          variant={state === 'listening' ? 'destructive' : 'default'}
          size="icon"
          className="h-16 w-16 rounded-full shadow-lg md:hover:scale-105 active:scale-95 transition-transform"
          disabled={micDisabled}
          onClick={handleMicTap}
        >
          {micDisabled ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : state === 'listening' ? (
            <MicOff className="h-7 w-7" />
          ) : (
            <Mic className="h-7 w-7" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full bg-red-500/10 text-red-500 md:hover:bg-red-500/20 active:bg-red-500/20 border-red-500/30"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
