import { useState, useCallback } from 'react';
import { Copy, Check, Pin, Edit } from 'lucide-react';

/** Copy-to-clipboard button for individual messages */
export function CopyMessageButton({
  text,
  variant,
}: {
  text: string;
  variant: 'user' | 'assistant';
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!text || copied) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text, copied]);

  const iconClass =
    variant === 'user'
      ? 'text-primary-foreground/50 hover:text-primary-foreground/80 active:text-primary-foreground'
      : 'text-muted-foreground/50 hover:text-muted-foreground active:text-foreground';

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors ${iconClass}`}
      title={copied ? 'Copied!' : 'Copy message'}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Pin/unpin button for messages */
export function PinMessageButton({
  isPinned,
  onToggle,
  variant,
}: {
  isPinned: boolean;
  onToggle: () => void;
  variant: 'user' | 'assistant';
}) {
  const iconClass =
    variant === 'user'
      ? 'text-primary-foreground/50 hover:text-primary-foreground/80 active:text-primary-foreground'
      : 'text-muted-foreground/50 hover:text-muted-foreground active:text-foreground';

  return (
    <button
      onClick={onToggle}
      className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors ${iconClass} ${isPinned ? (variant === 'user' ? 'text-primary-foreground' : 'text-foreground') : ''}`}
      title={isPinned ? 'Unpin message' : 'Pin message'}
    >
      <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current' : ''}`} />
    </button>
  );
}

/** Edit message button for user messages */
export function EditMessageButton({ onEdit }: { onEdit: () => void }) {
  return (
    <button
      onClick={onEdit}
      className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-muted-foreground active:text-foreground"
      title="Edit message"
    >
      <Edit className="h-3.5 w-3.5" />
    </button>
  );
}
