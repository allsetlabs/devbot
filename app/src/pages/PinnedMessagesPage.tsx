import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin, ArrowLeft, MessageCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { api } from '../lib/api';
import { extractTextContent, extractThinkingContent } from '../components/ChatMessage';
import type { ChatMessage } from '../types';

const PINNED_MESSAGES_KEY = 'devbot-pinned-messages';

interface PinnedGroup {
  chatId: string;
  chatName: string;
  messages: ChatMessage[];
}

function getAllPins(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(PINNED_MESSAGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function removePinFromStorage(chatId: string, messageId: string) {
  const all = getAllPins();
  const ids = all[chatId] ?? [];
  const updated = ids.filter((id) => id !== messageId);
  if (updated.length === 0) {
    delete all[chatId];
  } else {
    all[chatId] = updated;
  }
  localStorage.setItem(PINNED_MESSAGES_KEY, JSON.stringify(all));
}

function getPreviewText(msg: ChatMessage): string {
  let text = extractTextContent(msg.content).trim();
  if (!text) {
    const thinking = extractThinkingContent(msg.content).trim();
    if (thinking) text = `[Thinking] ${thinking}`;
  }
  if (!text && msg.content?.type === 'tool_use') {
    text = `Tool: ${(msg.content as Record<string, unknown>).tool ?? 'unknown'}`;
  }
  return text.length > 150 ? text.slice(0, 150) + '…' : text || '(no content)';
}

export function PinnedMessagesPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<PinnedGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPins = useCallback(async () => {
    const allPins = getAllPins();
    const entries = Object.entries(allPins).filter(([, ids]) => ids.length > 0);
    if (entries.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    try {
      const pins = entries.map(([chatId, messageIds]) => ({ chatId, messageIds }));
      const result = await api.fetchPinnedMessages(pins);
      setGroups(result as unknown as PinnedGroup[]);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  const handleUnpin = (chatId: string, messageId: string) => {
    removePinFromStorage(chatId, messageId);
    setGroups((prev) =>
      prev
        .map((g) =>
          g.chatId === chatId
            ? { ...g, messages: g.messages.filter((m) => m.id !== messageId) }
            : g
        )
        .filter((g) => g.messages.length > 0)
    );
  };

  const totalPins = groups.reduce((sum, g) => sum + g.messages.length, 0);

  return (
    <div className="safe-area-top flex h-dvh flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Pin className="h-5 w-5 text-primary" />
        <h1 className="flex-1 text-lg font-semibold">Pinned Messages</h1>
        {totalPins > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {totalPins}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Pin className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">No pinned messages</p>
            <p className="text-xs text-muted-foreground">
              Pin messages in any chat to see them here
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {groups.map((group) => (
              <div key={group.chatId}>
                <button
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  onClick={() => navigate(`/chat/${group.chatId}`)}
                >
                  <MessageCircle className="h-4 w-4" />
                  {group.chatName}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({group.messages.length})
                  </span>
                </button>

                <div className="space-y-2">
                  {group.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="group relative rounded-lg border border-border bg-muted/50 p-3 pr-10"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleUnpin(group.chatId, msg.id)}
                        title="Unpin"
                      >
                        <X className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">
                          {msg.type === 'user' ? 'You' : msg.type === 'assistant' ? 'Assistant' : msg.type}
                        </span>
                        {msg.createdAt && (
                          <span>
                            {new Date(msg.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <p
                        className="mt-1 cursor-pointer text-sm leading-relaxed text-foreground/90"
                        onClick={() => navigate(`/chat/${group.chatId}`)}
                      >
                        {getPreviewText(msg)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
