import { useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldOff, Square, ChevronDown, ChevronRight, Code } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import type { ClaudeMessageContent, PermissionMode } from '../types';

interface ToolApprovalInlineProps {
  content: ClaudeMessageContent;
  permissionMode: PermissionMode;
  onDeny?: () => void;
}

function getToolPreview(toolName: string, toolInput: Record<string, unknown>): string {
  switch (toolName) {
    case 'Bash': {
      const cmd = String(toolInput.command ?? '');
      return cmd.split('\n')[0].slice(0, 80);
    }
    case 'Read':
    case 'Write':
      return String(toolInput.file_path ?? '');
    case 'Edit':
      return String(toolInput.file_path ?? '');
    case 'Grep': {
      const path = toolInput.path ? String(toolInput.path) : '.';
      return `"${String(toolInput.pattern ?? '')}" in ${path}`;
    }
    case 'Glob':
      return String(toolInput.pattern ?? '');
    default: {
      const firstKey = Object.keys(toolInput)[0];
      if (!firstKey) return '';
      return String(toolInput[firstKey]).slice(0, 80);
    }
  }
}

const WRITE_TOOLS = new Set(['Bash', 'Edit', 'MultiEdit', 'Write', 'NotebookEdit']);

function ApprovalBadge({ mode, toolName }: { mode: PermissionMode; toolName: string }) {
  const isWriteTool = WRITE_TOOLS.has(toolName);

  if (mode === 'dangerous') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
        <ShieldOff className="h-3 w-3" />
        Auto-approved
      </span>
    );
  }

  if (mode === 'auto-accept') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
        <ShieldCheck className="h-3 w-3" />
        {isWriteTool ? 'Auto-accepted' : 'Allowed'}
      </span>
    );
  }

  // plan mode
  if (isWriteTool) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
        <ShieldAlert className="h-3 w-3" />
        Read-only mode
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <ShieldCheck className="h-3 w-3" />
      Allowed
    </span>
  );
}

export function ToolApprovalInline({ content, permissionMode, onDeny }: ToolApprovalInlineProps) {
  const [expanded, setExpanded] = useState(false);
  const [denied, setDenied] = useState(false);
  const toolName = content.tool_name || 'Unknown Tool';
  const toolInput = (content.tool_input || {}) as Record<string, unknown>;
  const preview = getToolPreview(toolName, toolInput);

  const handleDeny = () => {
    setDenied(true);
    onDeny?.();
  };

  return (
    <div className={`rounded-lg border ${denied ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/30'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setExpanded(!expanded)}
          className="h-5 w-5 flex-shrink-0 p-0"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
        <Code className="h-4 w-4 flex-shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {toolName}
        </span>
        {denied ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
            <Square className="h-3 w-3" />
            Stopped
          </span>
        ) : (
          <ApprovalBadge mode={permissionMode} toolName={toolName} />
        )}
        {!denied && permissionMode !== 'dangerous' && onDeny && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeny}
            className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Square className="mr-1 h-3 w-3" />
            Stop
          </Button>
        )}
      </div>
      {preview && !expanded && (
        <p className="line-clamp-1 px-3 pb-2 pl-10 text-[11px] leading-4 text-muted-foreground/70">
          {preview}
        </p>
      )}
      {expanded && (
        <div className="border-t border-border px-3 py-2">
          <pre className="overflow-x-auto text-xs text-muted-foreground">
            {JSON.stringify(toolInput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
