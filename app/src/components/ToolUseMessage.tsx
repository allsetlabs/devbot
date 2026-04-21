import { useState } from 'react';
import { ChevronDown, ChevronRight, Code, Pencil, FilePlus } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { scrollHeaderToTop } from '../lib/chat-message-utils';
import type { ClaudeMessageContent } from '../types';

function formatToolInput(input: Record<string, unknown>): string {
  return JSON.stringify(input, null, 2);
}

function getToolPreview(toolName: string, toolInput: Record<string, unknown>): string {
  switch (toolName) {
    case 'Bash': {
      const cmd = String(toolInput.command ?? '');
      return cmd.split('\n')[0].slice(0, 80);
    }
    case 'Read':
      return String(toolInput.file_path ?? '');
    case 'Write':
      return String(toolInput.file_path ?? '');
    case 'Grep': {
      const path = toolInput.path ? String(toolInput.path) : '.';
      return `"${String(toolInput.pattern ?? '')}" in ${path}`;
    }
    case 'Glob':
      return String(toolInput.pattern ?? '');
    case 'Agent':
      return String(toolInput.prompt ?? '').slice(0, 80);
    case 'WebFetch':
      return String(toolInput.url ?? '');
    case 'WebSearch':
      return String(toolInput.query ?? '');
    case 'TodoWrite': {
      const count = (toolInput.todos as unknown[])?.length ?? 0;
      return `${count} todos`;
    }
    default: {
      const firstKey = Object.keys(toolInput)[0];
      if (!firstKey) return '';
      return String(toolInput[firstKey]).slice(0, 80);
    }
  }
}

/** Renders a single diff hunk: removed lines in red, added lines in green */
function DiffHunk({ oldString, newString }: { oldString: string; newString: string }) {
  const oldLines = oldString ? oldString.split('\n') : [];
  const newLines = newString ? newString.split('\n') : [];

  return (
    <>
      {oldLines.map((line, i) => (
        <div key={`r-${i}`} className="flex bg-destructive/10">
          <span className="w-6 flex-shrink-0 select-none text-center text-[11px] leading-5 text-destructive/50">
            −
          </span>
          <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all px-1 leading-5 text-destructive">
            {line || ' '}
          </pre>
        </div>
      ))}
      {newLines.map((line, i) => (
        <div key={`a-${i}`} className="flex bg-success/10">
          <span className="w-6 flex-shrink-0 select-none text-center text-[11px] leading-5 text-success/50">
            +
          </span>
          <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all px-1 leading-5 text-success">
            {line || ' '}
          </pre>
        </div>
      ))}
    </>
  );
}

/** Colorized diff view for Edit tool calls, matching Claude Code CLI's diff output */
export function EditDiffView({ toolInput }: { toolInput: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const filePath = (toolInput.file_path as string) || '';
  const oldString = (toolInput.old_string as string) || '';
  const newString = (toolInput.new_string as string) || '';
  const replaceAll = toolInput.replace_all as boolean | undefined;

  const fileName = filePath.split('/').pop() || filePath;
  const removedCount = oldString ? oldString.split('\n').length : 0;
  const addedCount = newString ? newString.split('\n').length : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <Button
        variant="ghost"
        onClick={(e) => {
          const target = e.currentTarget;
          setExpanded((v) => {
            if (!v) scrollHeaderToTop(target);
            return !v;
          });
        }}
        className="flex w-full items-center justify-start gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Pencil className="h-3.5 w-3.5 text-primary" />
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
          {fileName}
        </span>
        {replaceAll && (
          <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
            all
          </span>
        )}
        <span className="flex-shrink-0 text-xs">
          {removedCount > 0 && <span className="text-destructive">−{removedCount}</span>}
          {removedCount > 0 && addedCount > 0 && <span className="text-muted-foreground"> </span>}
          {addedCount > 0 && <span className="text-success">+{addedCount}</span>}
        </span>
      </Button>
      {expanded && (
        <div className="border-t border-border">
          <div className="truncate border-b border-border/50 bg-muted/50 px-3 py-1 font-mono text-[11px] text-muted-foreground">
            {filePath}
          </div>
          <div className="max-h-80 overflow-auto font-mono text-xs">
            <DiffHunk oldString={oldString} newString={newString} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Colorized diff view for MultiEdit tool calls with multiple edit hunks */
export function MultiEditDiffView({ toolInput }: { toolInput: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const filePath = (toolInput.file_path as string) || '';
  const edits = (toolInput.edits as Array<{ old_string?: string; new_string?: string }>) || [];

  const fileName = filePath.split('/').pop() || filePath;
  let totalRemoved = 0;
  let totalAdded = 0;
  for (const edit of edits) {
    if (edit.old_string) totalRemoved += edit.old_string.split('\n').length;
    if (edit.new_string) totalAdded += edit.new_string.split('\n').length;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <Button
        variant="ghost"
        onClick={(e) => {
          const target = e.currentTarget;
          setExpanded((v) => {
            if (!v) scrollHeaderToTop(target);
            return !v;
          });
        }}
        className="flex w-full items-center justify-start gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Pencil className="h-3.5 w-3.5 text-primary" />
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
          {fileName}
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {edits.length} edits
        </span>
        <span className="flex-shrink-0 text-xs">
          {totalRemoved > 0 && <span className="text-destructive">−{totalRemoved}</span>}
          {totalRemoved > 0 && totalAdded > 0 && <span className="text-muted-foreground"> </span>}
          {totalAdded > 0 && <span className="text-success">+{totalAdded}</span>}
        </span>
      </Button>
      {expanded && (
        <div className="border-t border-border">
          <div className="truncate border-b border-border/50 bg-muted/50 px-3 py-1 font-mono text-[11px] text-muted-foreground">
            {filePath}
          </div>
          <div className="max-h-80 overflow-auto font-mono text-xs">
            {edits.map((edit, editIdx) => (
              <div key={editIdx}>
                {editIdx > 0 && (
                  <div className="border-t border-border/30 px-3 py-0.5 text-center text-[10px] text-muted-foreground/50">
                    ···
                  </div>
                )}
                <DiffHunk oldString={edit.old_string || ''} newString={edit.new_string || ''} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Content view for Write tool calls — shows all lines as additions */
export function WriteContentView({ toolInput }: { toolInput: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const filePath = (toolInput.file_path as string) || '';
  const content = (toolInput.content as string) || '';

  const fileName = filePath.split('/').pop() || filePath;
  const lineCount = content ? content.split('\n').length : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <Button
        variant="ghost"
        onClick={(e) => {
          const target = e.currentTarget;
          setExpanded((v) => {
            if (!v) scrollHeaderToTop(target);
            return !v;
          });
        }}
        className="flex w-full items-center justify-start gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <FilePlus className="h-3.5 w-3.5 text-primary" />
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
          {fileName}
        </span>
        <span className="flex-shrink-0 text-xs text-success">+{lineCount}</span>
      </Button>
      {expanded && (
        <div className="border-t border-border">
          <div className="truncate border-b border-border/50 bg-muted/50 px-3 py-1 font-mono text-[11px] text-muted-foreground">
            {filePath}
          </div>
          <div className="max-h-80 overflow-auto font-mono text-xs">
            {content.split('\n').map((line, i) => (
              <div key={i} className="flex bg-success/10">
                <span className="w-8 flex-shrink-0 select-none text-right pr-1 text-[11px] leading-5 text-muted-foreground/40">
                  {i + 1}
                </span>
                <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all px-1 leading-5 text-success">
                  {line || ' '}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolUseMessage({ content }: { content: ClaudeMessageContent }) {
  const [expanded, setExpanded] = useState(false);
  const toolName = content.tool_name || 'Unknown Tool';
  const toolInput = content.tool_input || {};
  const preview = getToolPreview(toolName, toolInput);

  if (toolName === 'Edit') {
    return <EditDiffView toolInput={toolInput} />;
  }

  if (toolName === 'MultiEdit') {
    return <MultiEditDiffView toolInput={toolInput} />;
  }

  if (toolName === 'Write') {
    return <WriteContentView toolInput={toolInput} />;
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <Button
        variant="ghost"
        onClick={(e) => {
          const target = e.currentTarget;
          setExpanded((v) => {
            if (!v) scrollHeaderToTop(target);
            return !v;
          });
        }}
        className="flex w-full items-center justify-start gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Code className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{toolName}</span>
      </Button>
      {preview && (
        <p className="line-clamp-2 px-3 pb-2 text-[11px] leading-4 text-muted-foreground/70">
          {preview}
        </p>
      )}
      {expanded && (
        <div className="border-t border-border px-3 py-2">
          <pre className="overflow-x-auto text-xs text-muted-foreground">
            {formatToolInput(toolInput)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ToolsGroup({ children, count }: { children: React.ReactNode; count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/20">
      <Button
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-start gap-2 px-3 py-2 text-left"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <Code className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">Tools</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{count} calls</span>
      </Button>
      {open && (
        <div className="flex flex-col gap-1.5 border-t border-border/40 p-2">{children}</div>
      )}
    </div>
  );
}
