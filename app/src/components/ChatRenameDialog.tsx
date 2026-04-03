import { Loader2 } from 'lucide-react';
import { Button } from '@subbiah/reusable/components/ui/button';
import { Input } from '@subbiah/reusable/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@subbiah/reusable/components/ui/dialog';

interface ChatRenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  isPending: boolean;
  onSave: (name: string) => void;
}

export function ChatRenameDialog({
  open,
  onOpenChange,
  renameValue,
  onRenameValueChange,
  isPending,
  onSave,
}: ChatRenameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] rounded-lg">
        <DialogHeader>
          <DialogTitle>Rename Chat</DialogTitle>
        </DialogHeader>
        <Input
          value={renameValue}
          onChange={(e) => onRenameValueChange(e.target.value)}
          placeholder="Chat name"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && renameValue.trim()) {
              onSave(renameValue.trim());
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(renameValue.trim())}
            disabled={!renameValue.trim() || isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
