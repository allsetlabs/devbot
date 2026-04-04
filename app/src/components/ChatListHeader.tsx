import { MessageCircle, ArrowUpDown, Star, RefreshCw, Plus, Check } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Menu } from 'lucide-react';
import { SORT_OPTIONS, type SortOption } from '../lib/chat-sort';

interface ChatListHeaderProps {
  sortBy: SortOption;
  sortDropdownOpen: boolean;
  showFavorites: boolean;
  isFetching: boolean;
  creating: boolean;
  onMenuOpen: () => void;
  onSortChange: (value: SortOption) => void;
  onToggleSortDropdown: () => void;
  onToggleFavorites: () => void;
  onRefetch: () => void;
  onCreate: () => void;
}

export function ChatListHeader({
  sortBy,
  sortDropdownOpen,
  showFavorites,
  isFetching,
  creating,
  onMenuOpen,
  onSortChange,
  onToggleSortDropdown,
  onToggleFavorites,
  onRefetch,
  onCreate,
}: ChatListHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onMenuOpen}>
          <Menu className="h-5 w-5" />
        </Button>
        <MessageCircle className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Chat</h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            title={SORT_OPTIONS.find((o) => o.value === sortBy)?.tooltip}
            onClick={onToggleSortDropdown}
          >
            <ArrowUpDown className="h-5 w-5" />
          </Button>
          {sortDropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-popover shadow-lg">
              {SORT_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  className="flex w-full items-center justify-start gap-2 rounded-none px-3 py-2 text-sm first:rounded-t-lg last:rounded-b-lg"
                  onClick={() => {
                    onSortChange(option.value);
                    onToggleSortDropdown();
                  }}
                >
                  {sortBy === option.value && <Check className="h-4 w-4 text-primary" />}
                  <span className={sortBy !== option.value ? 'ml-6' : ''}>{option.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant={showFavorites ? 'default' : 'ghost'}
          size="icon"
          title={showFavorites ? 'Show all chats' : 'Show favorites only'}
          onClick={onToggleFavorites}
        >
          <Star className={`h-5 w-5 ${showFavorites ? 'fill-current' : ''}`} />
        </Button>

        <Button variant="ghost" size="icon" onClick={onRefetch} disabled={isFetching}>
          <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
        <Button onClick={onCreate} disabled={creating}>
          <Plus className="mr-1 h-4 w-4" />
          {creating ? 'Creating...' : 'New Chat'}
        </Button>
      </div>
    </header>
  );
}
