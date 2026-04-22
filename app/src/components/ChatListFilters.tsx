import { Search, X, MessageSquare, MessagesSquare } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Input } from '@allsetlabs/reusable/components/ui/input';

interface ChatListFiltersProps {
  searchQuery: string;
  selectedType: string | null;
  chatTypes: string[];
  searchMode: 'chats' | 'messages';
  showRunning: boolean;
  runningCount: number;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string | null) => void;
  onSearchModeChange: (mode: 'chats' | 'messages') => void;
  onToggleRunning: () => void;
}

export function ChatListFilters({
  searchQuery,
  selectedType,
  chatTypes,
  searchMode,
  showRunning,
  runningCount,
  onSearchChange,
  onTypeChange,
  onSearchModeChange,
  onToggleRunning,
}: ChatListFiltersProps) {
  return (
    <>
      <div className="border-b border-border px-4 py-2">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchMode === 'messages' ? 'Search all messages…' : 'Search chats…'}
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={() => onSearchChange('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Button
            variant={searchMode === 'messages' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => onSearchModeChange(searchMode === 'chats' ? 'messages' : 'chats')}
            title={searchMode === 'messages' ? 'Switch to chat name search' : 'Search all messages'}
          >
            {searchMode === 'messages' ? (
              <MessagesSquare className="h-4 w-4" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {(chatTypes.length > 1 || runningCount > 0 || showRunning) && searchMode === 'chats' && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border px-4 py-2">
          {chatTypes.length > 1 && (
            <>
              <Button
                variant={selectedType === null && !showRunning ? 'default' : 'outline'}
                size="sm"
                className="flex-shrink-0"
                onClick={() => onTypeChange(null)}
              >
                All
              </Button>
              {chatTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? 'default' : 'outline'}
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => onTypeChange(type)}
                >
                  {type}
                </Button>
              ))}
            </>
          )}
          {(runningCount > 0 || showRunning) && (
            <Button
              variant={showRunning ? 'default' : 'outline'}
              size="sm"
              className="flex-shrink-0 gap-1.5"
              onClick={onToggleRunning}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Running
              {runningCount > 0 && (
                <span className="ml-0.5 text-xs opacity-70">{runningCount}</span>
              )}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
