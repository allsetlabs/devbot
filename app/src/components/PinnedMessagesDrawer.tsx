import { Pin, X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { extractTextContent, extractThinkingContent } from './ChatMessage';
import type { ChatMessage } from '../types';

interface PinnedMessagesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ChatMessage[];
  pinnedIds: string[];
  onTogglePin: (messageId: string) => void;
  onNavigateToMessage?: (messageId: string) => void;
}

export function PinnedMessagesDrawer({
  open,
  onOpenChange,
  messages,
  pinnedIds,
  onTogglePin,
  onNavigateToMessage,
}: PinnedMessagesDrawerProps) {
  const pinnedMessages = messages.filter((msg) => pinnedIds.includes(msg.id));

  function getPreviewText(msg: ChatMessage): string {
    let text = extractTextContent(msg.content).trim();
    if (!text) {
      const thinking = extractThinkingContent(msg.content).trim();
      if (thinking) text = `[Thinking] ${thinking}`;
    }
    if (!text && msg.content?.type === 'tool_use') {
      text = `Tool: ${(msg.content as Record<string, unknown>).tool ?? 'unknown'}`;
    }
    return text.length > 120 ? text.slice(0, 120) + '…' : text || '(no content)';
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Pinned Messages ({pinnedMessages.length})
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {pinnedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Pin className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No pinned messages yet</p>
              <p className="text-xs text-muted-foreground">
                Click the pin icon on a message to bookmark it
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="relative space-y-1 rounded-lg border border-border bg-muted/50 p-3 pr-8"
                  role={onNavigateToMessage ? 'button' : undefined}
                  tabIndex={onNavigateToMessage ? 0 : undefined}
                  onClick={() => {
                    if (onNavigateToMessage) {
                      onNavigateToMessage(msg.id);
                      onOpenChange(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (onNavigateToMessage && (e.key === 'Enter' || e.key === ' ')) {
                      onNavigateToMessage(msg.id);
                      onOpenChange(false);
                    }
                  }}
                  style={onNavigateToMessage ? { cursor: 'pointer' } : undefined}
                >
                  {/* Unpin button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(msg.id);
                    }}
                    title="Unpin message"
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {/* Message preview */}
                  <p className="text-xs font-medium text-muted-foreground">
                    {msg.type === 'user'
                      ? 'You'
                      : msg.type === 'assistant'
                        ? 'Assistant'
                        : msg.type === 'tool_use'
                          ? 'Tool Use'
                          : msg.type === 'tool_result'
                            ? 'Tool Result'
                            : 'System'}
                    {msg.createdAt && (
                      <span className="ml-2 font-normal">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {getPreviewText(msg)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
