import { useNavigate } from 'react-router-dom';
import { MessageSquare, User, Bot } from 'lucide-react';
import { formatRelativeTime } from '../lib/format';
import type { MessageSearchResult } from '../types';

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-yellow-400/30 text-foreground">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface MessageSearchResultsProps {
  results: MessageSearchResult[];
  query: string;
  loading: boolean;
}

export function MessageSearchResults({ results, query, loading }: MessageSearchResultsProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Searching messages…
      </div>
    );
  }

  if (!query || query.length < 2) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Type at least 2 characters to search messages across all chats</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No messages match <span className="font-medium">"{query}"</span>
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
        {results.length} message{results.length !== 1 ? 's' : ''} found
      </div>
      {results.map((result) => (
        <button
          key={result.messageId}
          className="flex w-full flex-col gap-1 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-muted/40"
          onClick={() => navigate(`/chat/${result.chatId}`)}
        >
          <div className="flex items-center gap-2">
            {result.type === 'user' ? (
              <User className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            ) : (
              <Bot className="h-3 w-3 flex-shrink-0 text-primary" />
            )}
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
              {result.chatName}
            </span>
            <span className="flex-shrink-0 text-[10px] text-muted-foreground">
              {formatRelativeTime(result.timestamp)}
            </span>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {highlightMatch(result.preview, query)}
          </p>
        </button>
      ))}
    </div>
  );
}
