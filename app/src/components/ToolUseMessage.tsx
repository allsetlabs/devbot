import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Code, Pencil, FilePlus, ShieldCheck, ShieldOff, Bot, Loader2, Search } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { scrollHeaderToTop } from '../lib/chat-message-utils';
import type { ClaudeMessageContent, ClaudeContentBlock, PermissionMode } from '../types';

function ToolApprovalBadge({ mode }: { mode: PermissionMode }) {
  if (mode === 'dangerous') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-medium text-success">
        <ShieldOff className="h-2.5 w-2.5" />
        Auto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
      <ShieldCheck className="h-2.5 w-2.5" />
      OK
    </span>
  );
}

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
      return String(toolInput.description ?? toolInput.prompt ?? '').slice(0, 80);
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
export function EditDiffView({ toolInput, permissionMode }: { toolInput: Record<string, unknown>; permissionMode?: PermissionMode }) {
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
        {permissionMode && <ToolApprovalBadge mode={permissionMode} />}
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
export function MultiEditDiffView({ toolInput, permissionMode }: { toolInput: Record<string, unknown>; permissionMode?: PermissionMode }) {
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
        {permissionMode && <ToolApprovalBadge mode={permissionMode} />}
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
export function WriteContentView({ toolInput, permissionMode }: { toolInput: Record<string, unknown>; permissionMode?: PermissionMode }) {
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
        {permissionMode && <ToolApprovalBadge mode={permissionMode} />}
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

/** Renders Agent (subagent) tool calls with a distinctive card showing description, type, and status */
export function AgentSubagentView({ toolInput, permissionMode, hasResult }: { toolInput: Record<string, unknown>; permissionMode?: PermissionMode; hasResult?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const description = String(toolInput.description ?? 'Agent task');
  const prompt = String(toolInput.prompt ?? '');
  const subagentType = toolInput.subagent_type as string | undefined;
  const runInBackground = toolInput.run_in_background as boolean | undefined;
  const model = toolInput.model as string | undefined;
  const isolation = toolInput.isolation as string | undefined;

  const isRunning = !hasResult;

  return (
    <div className="overflow-hidden rounded-lg border border-primary/20 bg-primary/5">
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
        <Bot className="h-4 w-4 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {description}
        </span>
        <div className="flex items-center gap-1.5">
          {subagentType && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {subagentType}
            </span>
          )}
          {runInBackground && (
            <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
              bg
            </span>
          )}
          {model && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {model}
            </span>
          )}
          {isolation && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {isolation}
            </span>
          )}
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-medium text-success">
              Done
            </span>
          )}
          {permissionMode && <ToolApprovalBadge mode={permissionMode} />}
        </div>
      </Button>
      {expanded && prompt && (
        <div className="border-t border-primary/10 px-3 py-2">
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
}

interface GrepMatch {
  lineNum: number;
  content: string;
}

interface GrepFile {
  path: string;
  matches: GrepMatch[];
}

function parseGrepOutput(text: string): GrepFile[] {
  const files: GrepFile[] = [];
  const grepLineRegex = /^(.+?):(\d+):(.*)$/;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const match = line.match(grepLineRegex);
    if (match) {
      const [, filePath, lineNumStr, matchContent] = match;
      const lineNum = parseInt(lineNumStr, 10);
      let file = files.find((f) => f.path === filePath);
      if (!file) {
        file = { path: filePath, matches: [] };
        files.push(file);
      }
      file.matches.push({ lineNum, content: matchContent });
    }
  }
  return files;
}

function highlightInText(text: string, pattern: string): React.ReactNode {
  if (!pattern) return text;
  try {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <mark key={i} className="rounded-sm bg-warning/40 px-0.5 text-foreground">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  } catch {
    return text;
  }
}

/** Specialized renderer for Grep tool results — shows matched lines grouped by file with pattern highlighting */
export function GrepResultView({
  content,
  pattern,
}: {
  content?: string | ClaudeContentBlock[];
  pattern?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content
            .filter((b) => b.type === 'text')
            .map((b) => b.text || '')
            .join('')
        : '';

  const files = useMemo(() => parseGrepOutput(text), [text]);
  const totalMatches = files.reduce((sum, f) => sum + f.matches.length, 0);
  const summaryLabel =
    files.length === 0
      ? 'No matches'
      : totalMatches > 0
        ? `${totalMatches} match${totalMatches !== 1 ? 'es' : ''} · ${files.length} file${files.length !== 1 ? 's' : ''}`
        : `${files.length} file${files.length !== 1 ? 's' : ''}`;

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
        <Search className="h-3.5 w-3.5 text-warning" />
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
          {pattern ? `"${pattern}"` : 'Grep'}
        </span>
        <span className="flex-shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {summaryLabel}
        </span>
      </Button>
      {expanded && (
        <div className="border-t border-border">
          {files.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matches found</p>
          ) : (
            <div className="max-h-96 overflow-auto font-mono text-xs">
              {files.map((file, fi) => (
                <div key={fi} className={fi > 0 ? 'border-t border-border/40' : ''}>
                  <div className="sticky top-0 z-10 bg-muted/80 px-3 py-1 text-[11px] font-medium text-primary backdrop-blur-sm">
                    {file.path}
                  </div>
                  {file.matches.map((match, mi) => (
                    <div key={mi} className="flex">
                      <span className="w-10 flex-shrink-0 select-none pr-2 text-right text-[11px] leading-5 text-muted-foreground/50">
                        {match.lineNum}
                      </span>
                      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all px-1 leading-5 text-foreground/90">
                        {pattern ? highlightInText(match.content, pattern) : match.content}
                      </pre>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ToolUseMessage({ content, permissionMode }: { content: ClaudeMessageContent; permissionMode?: PermissionMode }) {
  const [expanded, setExpanded] = useState(false);
  const toolName = content.tool_name || 'Unknown Tool';
  const toolInput = content.tool_input || {};
  const preview = getToolPreview(toolName, toolInput);

  if (toolName === 'Edit') {
    return <EditDiffView toolInput={toolInput} permissionMode={permissionMode} />;
  }

  if (toolName === 'MultiEdit') {
    return <MultiEditDiffView toolInput={toolInput} permissionMode={permissionMode} />;
  }

  if (toolName === 'Write') {
    return <WriteContentView toolInput={toolInput} permissionMode={permissionMode} />;
  }

  if (toolName === 'Agent') {
    return <AgentSubagentView toolInput={toolInput} permissionMode={permissionMode} />;
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
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{toolName}</span>
        {permissionMode && <ToolApprovalBadge mode={permissionMode} />}
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
