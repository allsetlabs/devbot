import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@subbiah/reusable/components/ui/button';

interface ChatUnsafeBannerProps {
  onDismiss: () => void;
}

export function ChatUnsafeBanner({ onDismiss }: ChatUnsafeBannerProps) {
  return (
    <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-2.5">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-destructive">Unsafe Mode Active</p>
          <p className="mt-0.5 text-xs text-destructive/80">
            Claude can read, write, execute, and delete files without asking for permission.
            Review its actions carefully.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0 text-destructive/60 hover:text-destructive"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
