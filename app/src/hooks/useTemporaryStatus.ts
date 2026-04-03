import { useState, useCallback, useRef, useEffect } from 'react';

/** Shows a temporary status message that auto-clears after the given duration. */
export function useTemporaryStatus(duration = 3000) {
  const [status, setStatus] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (msg: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus(msg);
      timeoutRef.current = setTimeout(() => setStatus(null), duration);
    },
    [duration]
  );

  const clear = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { status, show, clear };
}
