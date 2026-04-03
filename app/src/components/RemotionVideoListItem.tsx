import { Loader2, Play, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@subbiah/reusable/components/ui/button';
import { RemotionStatusBadge } from './RemotionStatusBadge';
import { formatRelativeTime } from '../lib/format';
import type { RemotionVideo } from '../types';

interface Props {
  video: RemotionVideo;
  onPlay: (id: string) => void;
  onEdit: (chatId: string) => void;
  onDelete: (id: string) => void;
}

export function RemotionVideoListItem({ video, onPlay, onEdit, onDelete }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10 hover:bg-primary/20 disabled:opacity-50"
        disabled={video.status !== 'completed'}
        onClick={() => onPlay(video.id)}
      >
        {video.status === 'generating' ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Play className="h-5 w-5 text-primary" />
        )}
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{video.name}</p>
          <RemotionStatusBadge status={video.status} />
        </div>
        {video.videoPath && (
          <p className="truncate text-xs text-muted-foreground">{video.videoPath}</p>
        )}
        <p className="text-xs text-muted-foreground">{formatRelativeTime(video.createdAt)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0"
        onClick={() => onEdit(video.chatId)}
      >
        <Pencil className="h-4 w-4 text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0"
        onClick={() => onDelete(video.id)}
      >
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
