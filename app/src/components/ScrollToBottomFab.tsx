import { ArrowDown } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';

interface ScrollToBottomFabProps {
  unreadCount: number;
  onClick: () => void;
}

export function ScrollToBottomFab({ unreadCount, onClick }: ScrollToBottomFabProps) {
  return (
    <div className="sticky bottom-3 z-10 flex justify-center">
      <Button
        variant="outline"
        size="icon"
        className="relative h-10 w-10 rounded-full border-border bg-background shadow-lg transition-all hover:bg-muted"
        onClick={onClick}
      >
        <ArrowDown className="h-4 w-4 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
}
