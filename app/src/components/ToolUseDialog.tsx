import { AlertTriangle, Copy, Check } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@allsetlabs/reusable/components/ui/dialog';
import { useState } from 'react';

interface ToolUseDialogProps {
  open: boolean;
  toolName: string;
  toolInput: Record<string, unknown>;
  mode: 'plan' | 'auto-accept' | 'dangerous';
  onDismiss: () => void;
}

export function ToolUseDialog({ open, toolName, toolInput, mode, onDismiss }: ToolUseDialogProps) {
  const [copied, setCopied] = useState(false);

  const inputJson = JSON.stringify(toolInput, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(inputJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const modeLabel = {
    plan: 'Plan Mode',
    'auto-accept': 'Auto-Accept Mode',
    dangerous: 'Full Auto Mode',
  }[mode];

  const modeDescription = {
    plan: 'In Plan Mode, Claude can only read and analyze. Tool usage may indicate an analysis that requires your manual action.',
    'auto-accept':
      'In Auto-Accept Mode, Claude can read, write, and run commands. Verify that this tool use aligns with your expectations.',
    dangerous:
      'In Full Auto Mode, Claude has full permissions. This tool use executes without manual review.',
  }[mode];

  const isHighRiskMode = mode === 'dangerous';

  return (
    <Dialog open={open} onOpenChange={onDismiss}>
      <DialogContent className="max-w-lg rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isHighRiskMode && <AlertTriangle className="h-5 w-5 text-warning" />}
            Tool Use: {toolName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Badge */}
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">{modeLabel}</span>
            <span className="text-xs text-muted-foreground">{modeDescription}</span>
          </div>

          {/* Tool Parameters */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Parameters:</label>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-background/50 p-3 font-mono text-xs text-foreground">
                {inputJson}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="absolute right-2 top-2 h-8 w-8"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-info/10 text-info rounded-lg p-3 text-sm">
            <p>
              Claude has {mode === 'dangerous' ? 'executed' : 'requested'} this tool. Review the
              parameters above to ensure they match your expectations.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onDismiss} className="w-full">
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
