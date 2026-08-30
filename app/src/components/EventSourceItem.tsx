import { Button } from '@allsetlabs/forge/components/ui/button';
import { useTemporaryStatus } from '../hooks/useTemporaryStatus';
import {
  TrendingUp,
  Newspaper,
  Cloud,
  Webhook,
  FileSearch,
  Cog,
  Settings,
  Zap,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import { formatDateTime } from '../lib/format';
import type { EventSource } from '../types';

function formatPollInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function getConfigSummary(source: EventSource): string | null {
  const c = source.config;
  switch (source.type) {
    case 'stock': {
      const symbol = (c.symbol as string) || '';
      const condition = (c.condition as string) || '';
      const threshold = c.threshold as number | undefined;
      if (symbol && condition && threshold != null) {
        return `${symbol} ${condition} $${threshold.toFixed(2)}`;
      }
      return symbol || null;
    }
    case 'weather': {
      const location = (c.location as string) || '';
      const condition = (c.condition as string) || '';
      const threshold = c.threshold as number | undefined;
      if (location && condition) {
        const suffix = threshold != null ? ` ${threshold}°F` : '';
        return `${location} ${condition}${suffix}`;
      }
      return location || null;
    }
    case 'file_watch':
      return (c.watchPath as string) || null;
    case 'webhook': {
      const path = (c.path as string) || '';
      return path ? `POST ${path}` : null;
    }
    case 'news': {
      const keywords = c.keywords as string[] | undefined;
      return keywords?.length ? `keywords: ${keywords.join(', ')}` : null;
    }
    default:
      return null;
  }
}

const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  stock: { icon: <TrendingUp className="h-4 w-4" />, label: 'Stock', color: 'text-green-500' },
  news: { icon: <Newspaper className="h-4 w-4" />, label: 'News', color: 'text-blue-500' },
  weather: { icon: <Cloud className="h-4 w-4" />, label: 'Weather', color: 'text-sky-500' },
  webhook: { icon: <Webhook className="h-4 w-4" />, label: 'Webhook', color: 'text-purple-500' },
  file_watch: {
    icon: <FileSearch className="h-4 w-4" />,
    label: 'File Watch',
    color: 'text-orange-500',
  },
  custom: { icon: <Cog className="h-4 w-4" />, label: 'Custom', color: 'text-gray-500' },
};

interface EventSourceItemProps {
  source: EventSource;
  onDelete: () => void;
  onTogglePause: () => void;
  onEdit: () => void;
  onTest: () => void;
}

export function EventSourceItem({
  source,
  onDelete,
  onTogglePause,
  onEdit,
  onTest,
}: EventSourceItemProps) {
  const {
    status: deleteConfirm,
    show: showDeleteConfirm,
    clear: clearDeleteConfirm,
  } = useTemporaryStatus(3000);

  const handleDeleteClick = () => {
    if (deleteConfirm) {
      onDelete();
      clearDeleteConfirm();
    } else {
      showDeleteConfirm('confirm');
    }
  };

  const isPaused = source.status === 'paused';
  const tc = typeConfig[source.type] || typeConfig.custom;
  const configSummary = getConfigSummary(source);

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* Status indicator */}
      <div className="mt-1.5 flex-shrink-0">
        <div
          className={`h-2.5 w-2.5 rounded-full ${isPaused ? 'bg-muted-foreground' : 'bg-success'}`}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={tc.color}>{tc.icon}</span>
          <p className="line-clamp-1 text-sm text-foreground">{source.name}</p>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            {tc.label}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {configSummary && <span>{configSummary}</span>}
          <span>Poll: {formatPollInterval(source.pollIntervalSeconds)}</span>
          <span>
            {source.linkedTaskIds.length} task
            {source.linkedTaskIds.length !== 1 ? 's' : ''} linked
          </span>
          {source.lastTriggeredAt && (
            <span>Last fired: {formatDateTime(source.lastTriggeredAt)}</span>
          )}
          {isPaused && <span className="text-warning">Paused</span>}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex flex-shrink-0 items-center gap-1"
        role="toolbar"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button variant="ghost" size="icon" onClick={onTest} className="h-8 w-8">
          <Zap className="h-4 w-4 text-warning" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onTogglePause} className="h-8 w-8">
          {isPaused ? (
            <Play className="h-4 w-4 text-success" />
          ) : (
            <Pause className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant={deleteConfirm ? 'destructive' : 'ghost'}
          size="icon"
          onClick={handleDeleteClick}
          className="h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
