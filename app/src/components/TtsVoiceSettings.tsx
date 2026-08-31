import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { ttsStatus, ttsListVoices, ttsSelectVoice, ttsSynthesize } from '../lib/api';
import { useState, useRef } from 'react';
import { Volume2, Loader2 } from 'lucide-react';

export function TtsVoiceSettings() {
  const queryClient = useQueryClient();
  const [testPlaying, setTestPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const statusQuery = useQuery({ queryKey: ['tts-status'], queryFn: ttsStatus, staleTime: 30_000 });
  const voicesQuery = useQuery({ queryKey: ['tts-voices'], queryFn: ttsListVoices, staleTime: 60_000 });

  const selectMutation = useMutation({
    mutationFn: ttsSelectVoice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tts-status'] }),
  });

  const currentVoice = statusQuery.data?.voice ?? '';
  const available = statusQuery.data?.available ?? false;

  // Filter to English voices only for the dropdown
  const englishVoices = (voicesQuery.data?.voices ?? []).filter(v => v.locale.startsWith('en-'));

  const testVoice = async () => {
    if (testPlaying) {
      audioRef.current?.pause();
      setTestPlaying(false);
      return;
    }
    try {
      setTestPlaying(true);
      const blob = await ttsSynthesize('Hello! I am your voice assistant. How can I help you today?');
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setTestPlaying(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setTestPlaying(false); URL.revokeObjectURL(url); };
      await audio.play();
    } catch {
      setTestPlaying(false);
    }
  };

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="tts-voice" className="text-sm font-medium text-foreground">
          Text-to-speech voice
        </label>
        <div className="flex items-center gap-2">
          <select
            id="tts-voice"
            value={currentVoice}
            onChange={(e) => selectMutation.mutate(e.target.value)}
            disabled={!available || selectMutation.isPending}
            className="max-w-48 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          >
            {!currentVoice && <option value="">Loading…</option>}
            {englishVoices.map((v) => (
              <option key={v.id} value={v.id}>{v.id.replace('Neural', '').replace('Multilingual', '')}</option>
            ))}
            {englishVoices.length === 0 && currentVoice && (
              <option value={currentVoice}>{currentVoice}</option>
            )}
          </select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={testVoice}
            disabled={!available}
            title="Test voice"
          >
            {testPlaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {available ? 'Edge TTS available — select a voice for spoken responses' : 'Edge TTS not available — install with: pip3 install edge-tts'}
      </p>
    </div>
  );
}
