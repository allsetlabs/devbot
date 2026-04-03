import { Loader2 } from 'lucide-react';
import { Button } from '@subbiah/reusable/components/ui/button';
import { Input } from '@subbiah/reusable/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@subbiah/reusable/components/ui/drawer';

interface ChatMaxTurnsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxTurnsValue: string;
  onMaxTurnsValueChange: (value: string) => void;
  hasExistingMaxTurns: boolean;
  isPending: boolean;
  onSave: (maxTurns: number | null) => void;
}

export function ChatMaxTurnsDrawer({
  open,
  onOpenChange,
  maxTurnsValue,
  onMaxTurnsValueChange,
  hasExistingMaxTurns,
  isPending,
  onSave,
}: ChatMaxTurnsDrawerProps) {
  const parseAndSave = () => {
    const parsed = parseInt(maxTurnsValue);
    onSave(maxTurnsValue.trim() && !isNaN(parsed) && parsed > 0 ? parsed : null);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Max Turns</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          <p className="text-xs text-muted-foreground">
            Limit the number of agentic turns Claude can take per message. Similar to Claude Code
            CLI&apos;s <code className="rounded bg-muted px-1 py-0.5">--max-turns</code> flag.
            Leave empty for unlimited.
          </p>
          <Input
            type="number"
            min={1}
            max={100}
            value={maxTurnsValue}
            onChange={(e) => onMaxTurnsValueChange(e.target.value)}
            placeholder="e.g. 10 (empty = unlimited)"
            className="border-input bg-background text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') parseAndSave();
            }}
          />
          <div className="flex flex-wrap gap-2">
            {[5, 10, 25, 50].map((n) => (
              <Button
                key={n}
                variant={maxTurnsValue === String(n) ? 'default' : 'outline'}
                size="sm"
                onClick={() => onMaxTurnsValueChange(String(n))}
              >
                {n}
              </Button>
            ))}
            <Button
              variant={maxTurnsValue === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMaxTurnsValueChange('')}
            >
              Unlimited
            </Button>
          </div>
          <div className="flex gap-2">
            {hasExistingMaxTurns && (
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
            <Button className="flex-1" onClick={parseAndSave} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
