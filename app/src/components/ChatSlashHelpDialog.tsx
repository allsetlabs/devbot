import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@allsetlabs/reusable/components/ui/dialog';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { SLASH_COMMANDS } from '../lib/slash-commands';

interface ChatSlashHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatSlashHelpDialog({ open, onOpenChange }: ChatSlashHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] rounded-lg">
        <DialogHeader>
          <DialogTitle>Available Slash Commands</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {SLASH_COMMANDS.map(({ command, description }) => (
            <div key={command}>
              <code className="text-xs font-medium text-primary">{command}</code>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
