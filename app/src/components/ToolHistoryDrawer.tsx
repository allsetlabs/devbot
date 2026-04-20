import { useMemo } from 'react';
import { CheckCircle, Code, History, XCircle } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import type { ChatMessage } from '../types';

interface ToolHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ChatMessage[];
  onNavigateToMessage?: (messageId: string) => void;
}

interface ToolEntry {
  id: string;
  messageId: string;
  type: 'tool_use' | 'tool_result';
  toolName: string;
  preview: string;
  isError: boolean;
  timestamp?: string;
}

function getPreviewFromInput(input: Record<string, unknown>): string {
  if (input.command) return String(input.command).split('\n')[0].slice(0, 60);
  if (input.file_path) return String(input.file_path);
  if (input.pattern) return String(input.pattern);
  if (input.query) return String(input.query);
  if (input.prompt) return String(input.prompt).slice(0, 60);
  if (input.description) return String(input.description).slice(0, 60);
  const firstKey = Object.keys(input)[0];
  return firstKey ? String(input[firstKey]).slice(0, 60) : '';
}

function extractToolEntries(messages: ChatMessage[]): ToolEntry[] {
  const entries: ToolEntry[] = [];

  for (const msg of messages) {
    if (msg.type === 'tool_use') {
      entries.push({
        id: msg.id,
        messageId: msg.id,
        type: 'tool_use',
        toolName: (msg.content?.tool_name as string) || 'Unknown Tool',
        preview: getPreviewFromInput((msg.content?.tool_input as Record<string, unknown>) || {}),
        isError: false,
        timestamp: msg.createdAt,
      });
    } else if (msg.type === 'tool_result') {
      const errored = msg.content?.subtype === 'error' || !!msg.content?.error;
      const resultText = msg.content?.error
        ? String(msg.content.error)
        : msg.content?.result
          ? typeof msg.content.result === 'string'
            ? msg.content.result
            : JSON.stringify(msg.content.result)
          : '';
      entries.push({
        id: msg.id,
        messageId: msg.id,
        type: 'tool_result',
        toolName: (msg.content?.tool_name as string) || 'Result',
        preview: resultText.slice(0, 80),
        isError: errored,
        timestamp: msg.createdAt,
      });
    } else if (msg.type === 'assistant' && Array.isArray(msg.content?.message?.content)) {
      const blocks = msg.content.message.content as unknown as Array<Record<string, unknown>>;
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === 'tool_use') {
          entries.push({
            id: `${msg.id}-tu-${i}`,
            messageId: msg.id,
            type: 'tool_use',
            toolName: (block.name as string) || 'Unknown Tool',
            preview: getPreviewFromInput((block.input as Record<string, unknown>) || {}),
            isError: false,
            timestamp: msg.createdAt,
          });
        } else if (block.type === 'tool_result') {
          const errored = block.is_error === true;
          const content = block.content;
          const resultText = typeof content === 'string'
            ? content
            : Array.isArray(content)
              ? (content[0] as { text?: string })?.text || ''
              : '';
          entries.push({
            id: `${msg.id}-tr-${i}`,
            messageId: msg.id,
            type: 'tool_result',
            toolName: 'Result',
            preview: String(resultText).slice(0, 80),
            isError: errored,
            timestamp: msg.createdAt,
          });
        }
      }
    }
  }

  return entries;
}

export function ToolHistoryDrawer({
  open,
  onOpenChange,
  messages,
  onNavigateToMessage,
}: ToolHistoryDrawerProps) {
  const toolEntries = useMemo(() => extractToolEntries(messages), [messages]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Tool History ({toolEntries.length})
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {toolEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Code className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No tool calls yet</p>
              <p className="text-xs text-muted-foreground">
                Tool calls and results will appear here as the assistant works
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {toolEntries.map((entry) => {
                const isResult = entry.type === 'tool_result';

                return (
                  // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                  <div
                    key={entry.id}
                    className={`rounded-lg border p-3 ${
                      isResult
                        ? entry.isError
                          ? 'border-destructive/30 bg-destructive/5'
                          : 'border-success/30 bg-success/5'
                        : 'border-border bg-muted/30'
                    }`}
                    role={onNavigateToMessage ? 'button' : undefined}
                    tabIndex={onNavigateToMessage ? 0 : undefined}
                    onClick={() => {
                      if (onNavigateToMessage) {
                        onNavigateToMessage(entry.messageId);
                        onOpenChange(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (onNavigateToMessage && (e.key === 'Enter' || e.key === ' ')) {
                        onNavigateToMessage(entry.messageId);
                        onOpenChange(false);
                      }
                    }}
                    style={onNavigateToMessage ? { cursor: 'pointer' } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {isResult ? (
                        entry.isError ? (
                          <XCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
                        ) : (
                          <CheckCircle className="h-4 w-4 flex-shrink-0 text-success" />
                        )
                      ) : (
                        <Code className="h-4 w-4 flex-shrink-0 text-primary" />
                      )}
                      <span className="text-xs font-medium text-foreground">
                        {isResult ? (entry.isError ? 'Failed' : 'Success') : entry.toolName}
                      </span>
                      {entry.timestamp && (
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    {entry.preview && (
                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {entry.preview}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
