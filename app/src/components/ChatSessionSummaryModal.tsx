import { FileText } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/forge/components/ui/drawer';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatSessionSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: string | null;
  summary: string | null;
  chatName?: string;
}

export function ChatSessionSummaryModal({
  open,
  onOpenChange,
  summary,
}: ChatSessionSummaryModalProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="safe-area-bottom">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" /> Session summary
          </DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">
          {summary ? (
            <MarkdownRenderer content={summary} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No summary yet. Summaries are written when a Claude Code session ends.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
