import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

export function useChatProgress(chatId: string, isRunning: boolean): string | null {
  const [progress, setProgress] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        const result = await api.getChatProgress(chatId);
        if (!cancelled) setProgress(result.progress);
      } catch {
        // file may not exist yet — that's fine
      }
    };

    fetch();

    if (isRunning) {
      intervalRef.current = setInterval(fetch, 5000);
    }

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [chatId, isRunning]);

  return progress;
}
