import { Loader2 } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Textarea } from '@allsetlabs/reusable/components/ui/textarea';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';

interface ChatSystemPromptDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemPromptValue: string;
  onSystemPromptValueChange: (value: string) => void;
  hasExistingPrompt: boolean;
  isPending: boolean;
  onSave: (prompt: string | null) => void;
}

export function ChatSystemPromptDrawer({
  open,
  onOpenChange,
  systemPromptValue,
  onSystemPromptValueChange,
  hasExistingPrompt,
  isPending,
  onSave,
}: ChatSystemPromptDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>System Prompt</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          <p className="text-xs text-muted-foreground">
            Custom instructions appended to every message in this chat. Similar to CLAUDE.md in
            Claude Code CLI.
          </p>
          <Textarea
            value={systemPromptValue}
            onChange={(e) => onSystemPromptValueChange(e.target.value)}
            placeholder="e.g. Always respond in bullet points. Focus on TypeScript best practices..."
            rows={6}
            className="max-h-[200px] resize-none border-input bg-background text-sm"
          />
          <div className="flex gap-2">
            {hasExistingPrompt && (
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:bg-destructive/10"
                onClick={() => onSave(null)}
                disabled={isPending}
              >
                Clear
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                const trimmed = systemPromptValue.trim();
                onSave(trimmed || null);
              }}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
