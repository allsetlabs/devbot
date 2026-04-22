import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight, Zap } from 'lucide-react';
import { formatRelativeTime } from '../lib/format';
import type { InteractiveChat, ClaudeModel } from '../types';

const MODEL_LABEL: Record<ClaudeModel, string> = {
  opus: 'Opus',
  sonnet: 'Sonnet',
  haiku: 'Haiku',
};

const MODEL_COLOR: Record<ClaudeModel, string> = {
  opus: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  sonnet: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  haiku: 'bg-green-500/15 text-green-600 dark:text-green-400',
};

export function DashboardRecentChats({ chats }: { chats: InteractiveChat[] }) {
  const navigate = useNavigate();
  const recent = chats.slice(0, 6);

  if (chats.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Recent Chats</span>
        </div>
        <button
          onClick={() => navigate('/chats')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="divide-y divide-border">
        {recent.map((chat) => (
          <button
            key={chat.id}
            onClick={() => navigate(`/chats/${chat.id}`)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 active:bg-muted"
          >
            <div className="relative flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              {chat.isRunning && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {chat.name || 'Untitled'}
                </span>
                {chat.fastMode && (
                  <Zap className="h-3 w-3 flex-shrink-0 text-warning" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {chat.isRunning ? (
                  <span className="text-primary">Running</span>
                ) : (
                  <span>{formatRelativeTime(chat.updatedAt)}</span>
                )}
                {chat.workingDir && (
                  <>
                    <span>·</span>
                    <span className="truncate font-mono">{chat.workingDir.split('/').pop()}</span>
                  </>
                )}
              </div>
            </div>
            <span
              className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium ${MODEL_COLOR[chat.model]}`}
            >
              {MODEL_LABEL[chat.model]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
