import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@allsetlabs/reusable/components/ui/dialog';
import { Button } from '@allsetlabs/reusable/components/ui/button';

interface ChatClearConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ChatClearConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: ChatClearConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] rounded-lg">
        <DialogHeader>
          <DialogTitle>Clear Chat</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to clear all messages? This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Clear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
