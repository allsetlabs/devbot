import { Loader2 } from 'lucide-react';
import type { RemotionVideo } from '../types';

interface Props {
  status: RemotionVideo['status'];
}

export function RemotionStatusBadge({ status }: Props) {
  switch (status) {
    case 'generating':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Generating
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          Completed
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          Failed
        </span>
      );
  }
}
