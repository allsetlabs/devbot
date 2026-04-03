import { useNavigate } from 'react-router-dom';
import { Button } from '@subbiah/reusable/components/ui/button';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '../lib/format';
import type { InteractiveChat } from '../types';

export function ChatsWidget({ chats }: { chats: InteractiveChat[] }) {
  const navigate = useNavigate();
  const running = chats.filter((c) => c.isRunning);
  const mostRecent = chats.length > 0 ? chats[0] : null;

  return (
    <Button
      variant="ghost"
      onClick={() => navigate('/chats')}
      className="h-auto flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left active:bg-muted"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Chats</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold text-foreground">{chats.length}</div>
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {running.length > 0 && <span className="text-primary">{running.length} running</span>}
        {mostRecent && (
          <span className="truncate">
            {mostRecent.name || 'Untitled'} &middot; {formatRelativeTime(mostRecent.updatedAt)}
          </span>
        )}
        {chats.length === 0 && <span>No active chats</span>}
      </div>
    </Button>
  );
}
