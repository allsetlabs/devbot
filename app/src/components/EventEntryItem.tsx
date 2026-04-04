import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Trash2, Globe } from 'lucide-react';
import { formatEntryTime, formatEntryMs, formatEntryDate } from '../lib/event-timer-utils';
import type { EventTimerEntry } from '../types';

interface EventEntryItemProps {
  entry: EventTimerEntry;
  index: number;
  total: number;
  onEdit: (entry: EventTimerEntry) => void;
  onDelete: (id: string) => void;
}

export function EventEntryItem({ entry, index, total, onEdit, onDelete }: EventEntryItemProps) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-3 active:bg-muted/50"
      onClick={() => onEdit(entry)}
      onKeyDown={(e) => e.key === 'Enter' && onEdit(entry)}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {total - index}
          </span>
          <div className="font-mono text-lg font-bold text-foreground">
            {formatEntryTime(entry.recordedAt)}
            <span className="text-sm text-primary">.{formatEntryMs(entry.recordedAt)}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(entry.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
      <div className="mt-1 pl-8 text-xs text-muted-foreground">
        <p>{formatEntryDate(entry.recordedAt)}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Globe className="h-3 w-3 text-primary" />
          <span>{entry.timezone}</span>
        </div>
      </div>
      {entry.name && (
        <p className="mt-1.5 truncate pl-8 text-sm font-medium text-foreground">{entry.name}</p>
      )}
      {entry.description && (
        <p className="mt-0.5 line-clamp-2 pl-8 text-xs text-muted-foreground">
          {entry.description}
        </p>
      )}
    </div>
  );
}
