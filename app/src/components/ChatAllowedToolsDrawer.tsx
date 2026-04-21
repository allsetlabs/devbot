import { Wrench } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';

const CLAUDE_TOOLS = [
  { name: 'Read', description: 'Read files from the filesystem' },
  { name: 'Edit', description: 'Edit existing files with string replacements' },
  { name: 'Write', description: 'Create or overwrite files' },
  { name: 'Bash', description: 'Execute shell commands' },
  { name: 'Grep', description: 'Search file contents with regex' },
  { name: 'Glob', description: 'Find files by name patterns' },
  { name: 'Agent', description: 'Launch sub-agents for complex tasks' },
  { name: 'WebSearch', description: 'Search the web' },
  { name: 'WebFetch', description: 'Fetch content from URLs' },
  { name: 'NotebookEdit', description: 'Edit Jupyter notebook cells' },
  { name: 'TodoWrite', description: 'Track tasks and progress' },
];

interface ChatAllowedToolsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAllowedTools: string[] | null;
  isPending: boolean;
  onSave: (tools: string[] | null) => void;
}

export function ChatAllowedToolsDrawer({
  open,
  onOpenChange,
  currentAllowedTools,
  isPending,
  onSave,
}: ChatAllowedToolsDrawerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(new Set(currentAllowedTools ?? CLAUDE_TOOLS.map((t) => t.name)));
    }
  }, [open, currentAllowedTools]);

  const allSelected = selected.size === CLAUDE_TOOLS.length;

  const toggleTool = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (allSelected) {
      onSave(null);
    } else {
      onSave(Array.from(selected));
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Allowed Tools
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          <p className="text-xs text-muted-foreground">
            Select which tools this chat session can use. Maps to Claude Code CLI&apos;s{' '}
            <code className="rounded bg-muted px-1 py-0.5">--allowedTools</code> flag.
          </p>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                if (allSelected) {
                  setSelected(new Set());
                } else {
                  setSelected(new Set(CLAUDE_TOOLS.map((t) => t.name)));
                }
              }}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {selected.size}/{CLAUDE_TOOLS.length} tools
            </span>
          </div>
          <div className="flex max-h-[45vh] flex-col gap-1.5 overflow-y-auto">
            {CLAUDE_TOOLS.map((tool) => (
              <button
                key={tool.name}
                type="button"
                className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                  selected.has(tool.name)
                    ? 'border-primary bg-primary/5'
                    : 'border-border opacity-60'
                }`}
                onClick={() => toggleTool(tool.name)}
              >
                <div
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                    selected.has(tool.name)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground'
                  }`}
                >
                  {selected.has(tool.name) && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium">{tool.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{tool.description}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
            {currentAllowedTools && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => onSave(null)}
                disabled={isPending}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
