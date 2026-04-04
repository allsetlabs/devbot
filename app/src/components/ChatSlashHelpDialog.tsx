import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@allsetlabs/reusable/components/ui/dialog';
import { Button } from '@allsetlabs/reusable/components/ui/button';

interface ChatSlashHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SLASH_COMMANDS = [
  { command: '/help', description: 'Show this help message' },
  { command: '/clear', description: 'Clear all messages from this chat' },
  { command: '/mode', description: 'Change permission mode (Plan, Accept, Dangerous)' },
  { command: '/model', description: 'Switch Claude model (Opus, Sonnet, Haiku)' },
  { command: '/info', description: 'Show session information and statistics' },
];

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
