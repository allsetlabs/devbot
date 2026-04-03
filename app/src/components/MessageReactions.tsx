import { ThumbsUp, ThumbsDown } from 'lucide-react';
import type { ReactionType } from '../hooks/useMessageReactions';

interface MessageReactionsProps {
  messageId: string;
  currentReaction: ReactionType | null;
  onToggleReaction: (type: ReactionType) => void;
}

export function MessageReactions({
  messageId: _messageId,
  currentReaction,
  onToggleReaction,
}: MessageReactionsProps) {
  return (
    <>
      <button
        className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors ${
          currentReaction === 'thumbsup'
            ? 'text-foreground'
            : 'text-muted-foreground/50 hover:text-muted-foreground active:text-foreground'
        }`}
        onClick={() => onToggleReaction('thumbsup')}
        title="Helpful"
      >
        <ThumbsUp
          className={`h-3.5 w-3.5 ${currentReaction === 'thumbsup' ? 'fill-current stroke-none' : ''}`}
        />
      </button>
      <button
        className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors ${
          currentReaction === 'thumbsdown'
            ? 'text-foreground'
            : 'text-muted-foreground/50 hover:text-muted-foreground active:text-foreground'
        }`}
        onClick={() => onToggleReaction('thumbsdown')}
        title="Not helpful"
      >
        <ThumbsDown
          className={`h-3.5 w-3.5 ${currentReaction === 'thumbsdown' ? 'fill-current stroke-none' : ''}`}
        />
      </button>
    </>
  );
}
