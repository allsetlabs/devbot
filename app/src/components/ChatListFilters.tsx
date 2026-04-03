import { Search, X } from 'lucide-react';
import { Button } from '@subbiah/reusable/components/ui/button';
import { Input } from '@subbiah/reusable/components/ui/input';

interface ChatListFiltersProps {
  searchQuery: string;
  selectedType: string | null;
  chatTypes: string[];
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string | null) => void;
}

export function ChatListFilters({
  searchQuery,
  selectedType,
  chatTypes,
  onSearchChange,
  onTypeChange,
}: ChatListFiltersProps) {
  return (
    <>
      <div className="border-b border-border px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats..."
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
      </div>

      {chatTypes.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border px-4 py-2">
          <Button
            variant={selectedType === null ? 'default' : 'outline'}
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
        </div>
      )}
    </>
  );
}
