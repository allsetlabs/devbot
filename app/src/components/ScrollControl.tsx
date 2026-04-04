import { useRef, useCallback } from 'react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface ScrollControlProps {
  onScrollUp: () => void;
  onScrollDown: () => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
}

export function ScrollControl({
  onScrollUp,
  onScrollDown,
  onScrollStart,
  onScrollEnd,
}: ScrollControlProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInScrollModeRef = useRef(false);
  const directionRef = useRef<'up' | 'down'>('up');

  const startScrolling = useCallback(
    (direction: 'up' | 'down') => {
      directionRef.current = direction;

      if (!isInScrollModeRef.current) {
        isInScrollModeRef.current = true;
        onScrollStart?.();
      }

      if (direction === 'up') {
        onScrollUp();
      } else {
        onScrollDown();
      }

      intervalRef.current = setInterval(() => {
        if (direction === 'up') {
          onScrollUp();
        } else {
          onScrollDown();
        }
      }, 100);
    },
    [onScrollUp, onScrollDown, onScrollStart]
  );

  const stopScrolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (directionRef.current === 'down' && isInScrollModeRef.current) {
      isInScrollModeRef.current = false;
      onScrollEnd?.();
    }
  }, [onScrollEnd]);

  return (
    <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 md:hidden">
      <Button
        variant="outline"
        size="icon"
        className="h-12 w-12 rounded-full bg-card/90 shadow-lg backdrop-blur-sm"
        onTouchStart={() => startScrolling('up')}
        onTouchEnd={stopScrolling}
        onMouseDown={() => startScrolling('up')}
        onMouseUp={stopScrolling}
        onMouseLeave={stopScrolling}
      >
        <ChevronUp className="h-6 w-6" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-12 w-12 rounded-full bg-card/90 shadow-lg backdrop-blur-sm"
        onTouchStart={() => startScrolling('down')}
        onTouchEnd={stopScrolling}
        onMouseDown={() => startScrolling('down')}
        onMouseUp={stopScrolling}
        onMouseLeave={stopScrolling}
      >
        <ChevronDown className="h-6 w-6" />
      </Button>
    </div>
  );
}
