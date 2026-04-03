import { Button } from '@subbiah/reusable/components/ui/button';
import { Terminal, Trash2 } from 'lucide-react';
import type { Session } from '../types';
import { formatDateTime } from '../lib/format';

interface ChatItemProps {
  session: Session;
  onSelect: () => void;
  onDelete: () => void;
}

export function ChatItem({ session, onSelect, onDelete }: ChatItemProps) {
  const formattedDate = formatDateTime(session.createdAt);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const confirmed = window.confirm('Are you sure you want to delete this session?');
    if (confirmed) {
      onDelete();
    }
  };

  return (
    <a
      href={`/cli/${session.id}`}
      className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted"
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            session.status === 'active' ? 'bg-success/20' : 'bg-muted'
          }`}
        >
          <Terminal
            className={`h-5 w-5 ${
              session.status === 'active' ? 'text-success' : 'text-muted-foreground'
            }`}
          />
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{session.name || 'Unnamed Session'}</span>
          <span className="text-xs text-muted-foreground/70">devbot-{session.id}</span>
          <span className="text-xs text-muted-foreground">
            {session.status === 'active' ? 'Active' : 'Inactive'} · {formattedDate}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </a>
  );
}
