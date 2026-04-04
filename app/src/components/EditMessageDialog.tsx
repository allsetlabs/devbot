import { useState, useCallback } from 'react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@allsetlabs/reusable/components/ui/dialog';

interface EditMessageDialogProps {
  open: boolean;
  initialText: string;
  onConfirm: (editedText: string) => void;
  onCancel: () => void;
}

export function EditMessageDialog({
  open,
  initialText,
  onConfirm,
  onCancel,
}: EditMessageDialogProps) {
  const [editedText, setEditedText] = useState(initialText);

  const handleConfirm = useCallback(() => {
    const trimmed = editedText.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
  }, [editedText, onConfirm]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg rounded-lg">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="Edit your message..."
            className="min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!editedText.trim()}>
            Resend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
