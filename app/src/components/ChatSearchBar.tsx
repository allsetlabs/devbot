import { useRef, useEffect } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@subbiah/reusable/components/ui/button';

export type MessageTypeFilter = 'all' | 'user' | 'assistant' | 'tool';

interface ChatSearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  currentMatch: number;
  totalMatches: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  messageTypeFilter?: MessageTypeFilter;
  onMessageTypeFilterChange?: (filter: MessageTypeFilter) => void;
}

export function ChatSearchBar({
  query,
  onQueryChange,
  currentMatch,
  totalMatches,
  onNext,
  onPrev,
  onClose,
  messageTypeFilter = 'all',
  onMessageTypeFilterChange,
}: ChatSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search input when it mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    }
  };

  const filterOptions: { label: string; value: MessageTypeFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'User', value: 'user' },
    { label: 'Assistant', value: 'assistant' },
    { label: 'Tool', value: 'tool' },
  ];

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-muted/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <span className="flex-shrink-0 text-xs text-muted-foreground">
            {totalMatches > 0 ? `${currentMatch + 1}/${totalMatches}` : 'No matches'}
          </span>
        )}
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onPrev}
            disabled={totalMatches === 0}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNext}
            disabled={totalMatches === 0}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {query && (
        <div className="flex flex-wrap gap-1">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={messageTypeFilter === option.value ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onMessageTypeFilterChange?.(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
