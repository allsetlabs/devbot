import { Brain } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';

export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

const EFFORT_OPTIONS: { value: EffortLevel; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Minimal thinking, fastest responses' },
  { value: 'medium', label: 'Medium', description: 'Balanced thinking and speed' },
  { value: 'high', label: 'High', description: 'Default — thorough reasoning' },
  { value: 'xhigh', label: 'Extra High', description: 'Extended thinking for complex tasks' },
  { value: 'max', label: 'Max', description: 'Maximum thinking budget, slowest' },
];

interface ChatThinkingBudgetDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEffort: EffortLevel | null;
  isPending: boolean;
  onSave: (effort: EffortLevel | null) => void;
}

export function ChatThinkingBudgetDrawer({
  open,
  onOpenChange,
  currentEffort,
  isPending,
  onSave,
}: ChatThinkingBudgetDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Thinking Effort
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          <p className="text-xs text-muted-foreground">
            Controls how much reasoning Claude uses. Higher effort = deeper thinking but slower
            responses. Maps to Claude Code CLI&apos;s{' '}
            <code className="rounded bg-muted px-1 py-0.5">--effort</code> flag.
          </p>
          <div className="flex flex-col gap-2">
            {EFFORT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={currentEffort === option.value ? 'default' : 'outline'}
                className="flex h-auto flex-col items-start gap-0.5 whitespace-normal px-3 py-2 text-left"
                onClick={() => {
                  onSave(option.value);
                }}
                disabled={isPending}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span
                  className={`text-xs ${currentEffort === option.value ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                >
                  {option.description}
                </span>
              </Button>
            ))}
            {currentEffort && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => onSave(null)}
                disabled={isPending}
              >
                Reset to Default
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
