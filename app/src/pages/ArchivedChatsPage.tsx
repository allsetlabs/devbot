import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line react-hooks/incompatible-library
import { useVirtualizer } from '@tanstack/react-virtual';
import { Archive, ArrowLeft } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { chatHooks } from '../hooks/useChat';
import { useFavorites } from '../hooks/useFavorites';
import { ArchivedChatItem } from '../components/ArchivedChatItem';

export function ArchivedChatsPage() {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: archivedChats = [], isLoading } = chatHooks.useGetArchivedChats({});
  const unarchiveMutation = chatHooks.useUnarchiveChat();
  const deleteMutation = chatHooks.useDeleteChat();
  const duplicateMutation = chatHooks.useDuplicateChat();

  const parentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: archivedChats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const handleSelect = (id: string) => navigate(`/chat/${id}`);
  const handleUnarchive = (id: string) => unarchiveMutation.mutate(id);
  const handleDelete = (id: string) => deleteMutation.mutate(id);
  const handleDuplicate = (id: string) => {
    duplicateMutation.mutate(id, { onSuccess: (newChat) => navigate(`/chat/${newChat.id}`) });
  };

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/chats')} className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">Archived Chats</h1>
          {archivedChats.length > 0 && (
            <span className="text-sm text-muted-foreground">({archivedChats.length})</span>
          )}
        </div>
      </header>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading archived chats...
        </div>
      )}

      {!isLoading && archivedChats.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Archive className="h-10 w-10 text-muted-foreground/50" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No Archived Chats</p>
            <p className="text-xs text-muted-foreground">Archived chats will appear here</p>
          </div>
        </div>
      )}

      {!isLoading && archivedChats.length > 0 && (
        <div ref={parentRef} className="flex-1 overflow-y-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const chat = archivedChats[virtualItem.index];
              return (
                <div
                  key={chat.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  className={
                    virtualItem.index < archivedChats.length - 1 ? 'border-b border-border' : ''
                  }
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <ArchivedChatItem
                    chat={chat}
                    isFavorited={isFavorite(chat.id)}
                    onSelect={() => handleSelect(chat.id)}
                    onToggleFavorite={() => toggleFavorite(chat.id)}
                    onDuplicate={() => handleDuplicate(chat.id)}
                    onUnarchive={() => handleUnarchive(chat.id)}
                    onDelete={() => handleDelete(chat.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
