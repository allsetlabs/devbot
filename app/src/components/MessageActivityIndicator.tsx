import { Loader2 } from 'lucide-react';
import { getToolActivity } from '../lib/message-list-utils';
import type { TaskMessage } from '../types';

interface MessageActivityIndicatorProps {
  messages: TaskMessage[];
  offsetY: number;
}

export function MessageActivityIndicator({ messages, offsetY }: MessageActivityIndicatorProps) {
  const activity = getToolActivity(messages);
  const ActivityIcon = activity?.icon || Loader2;
  const iconAnim = activity ? 'animate-pulse' : 'animate-spin';

  return (
    <div
      className="absolute left-0 w-full px-4 py-2"
      style={{ transform: `translateY(${offsetY}px)` }}
    >
      <div className="flex items-center gap-2">
        <ActivityIcon className={`h-4 w-4 ${iconAnim} text-primary`} />
        <span className="text-sm text-muted-foreground">
          {activity?.text || 'Claude is thinking...'}
        </span>
      </div>
    </div>
  );
}
