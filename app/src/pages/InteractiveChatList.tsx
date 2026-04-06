import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { X } from 'lucide-react';
import { chatHooks } from '../hooks/useChat';
import { WorkingDirSelector, useValidateAndSaveDir } from '../components/WorkingDirSelector';
import { useFavorites } from '../hooks/useFavorites';
import { extractErrorMessage } from '../lib/format';
import { ErrorBanner } from '../components/ErrorBanner';
import { SlideNav } from '../components/SlideNav';
import { ChatListHeader } from '../components/ChatListHeader';
import { ChatListFilters } from '../components/ChatListFilters';
import { ChatArchiveDrawer } from '../components/ChatArchiveDrawer';
import { ChatListContent } from '../components/ChatListContent';
import { getSortedChats, type SortOption } from '../lib/chat-sort';
import type { InteractiveChat, PermissionMode, ClaudeModel } from '../types';

export function InteractiveChatList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatWorkingDir, setNewChatWorkingDir] = useState('');
  const [dirValidationError, setDirValidationError] = useState('');
  const validateAndSaveDir = useValidateAndSaveDir();
  const { isFavorite, toggleFavorite } = useFavorites();

  const searchQuery = searchParams.get('q') ?? '';
  const selectedType = searchParams.get('type') ?? null;
  const sortBy = (searchParams.get('sort') as SortOption) ?? 'recent';

  const setSearchQuery = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('q', value);
        else next.delete('q');
        return next;
      },
      { replace: true }
    );
  };

  const setSelectedType = (value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('type', value);
        else next.delete('type');
        return next;
      },
      { replace: true }
    );
  };

  const setSortBy = (value: SortOption) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value !== 'recent') next.set('sort', value);
        else next.delete('sort');
        return next;
      },
      { replace: true }
    );
  };

  const { data: chatTypes = [] } = chatHooks.useGetChatTypes();

  const {
    data: chats = [],
    isLoading,
    isFetching,
    error: chatsError,
    refetch,
  } = chatHooks.useGetChats({ type: selectedType, q: searchQuery });

  const {
    data: archivedChats = [],
    isLoading: archiveLoading,
    error: archiveQueryError,
  } = chatHooks.useGetArchivedChats({ type: selectedType, q: searchQuery });

  const createMutation = chatHooks.useCreateChat();
  const deleteMutation = chatHooks.useDeleteChat();
  const archiveMutation = chatHooks.useArchiveChat();
  const unarchiveMutation = chatHooks.useUnarchiveChat();
  const deleteArchivedMutation = chatHooks.useDeleteChat();
  const duplicateMutation = chatHooks.useDuplicateChat();

  const creating = createMutation.isPending;

  const error = extractErrorMessage(
    chatsError,
    createMutation.error,
    deleteMutation.error,
    archiveMutation.error
  );

  const archiveError = extractErrorMessage(
    archiveQueryError,
    unarchiveMutation.error,
    deleteArchivedMutation.error
  );

  const handleCreate = () => {
    setNewChatWorkingDir('');
    setNewChatOpen(true);
  };

  const handleNewChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirValidationError('');
    const trimmedDir = newChatWorkingDir.trim();

    // Validate and save the directory first
    try {
      await validateAndSaveDir(trimmedDir);
    } catch (err) {
      setDirValidationError(err instanceof Error ? err.message : 'Directory does not exist');
      return;
    }

    createMutation.mutate(
      {
        mode: 'dangerous' as PermissionMode,
        model: 'sonnet' as ClaudeModel,
        ...(trimmedDir ? { workingDir: trimmedDir } : {}),
      },
      {
        onSuccess: (chat) => {
          setNewChatOpen(false);
          setNewChatWorkingDir('');
          setDirValidationError('');
          navigate(`/chat/${chat.id}`);
        },
      }
    );
  };

  const handleNewChatClose = () => {
    setNewChatOpen(false);
    setNewChatWorkingDir('');
    setDirValidationError('');
  };

  const handleDelete = (id: string) => deleteMutation.mutate(id);
  const handleArchive = (id: string) => archiveMutation.mutate(id);
  const handleUnarchive = (id: string) => unarchiveMutation.mutate(id);
  const handleDeleteArchived = (id: string) => deleteArchivedMutation.mutate(id);
  const handleDuplicate = (id: string) => {
    duplicateMutation.mutate(id, { onSuccess: (newChat) => navigate(`/chat/${newChat.id}`) });
  };
  const handleSelect = (chat: InteractiveChat) => navigate(`/chat/${chat.id}`);

  let filteredChats = getSortedChats(chats, sortBy);
  if (showFavorites) {
    filteredChats = filteredChats.filter((chat) => isFavorite(chat.id));
  }
  let filteredArchivedChats = getSortedChats(archivedChats, sortBy);
  if (searchQuery) {
    filteredArchivedChats = filteredArchivedChats.filter((chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  if (showFavorites) {
    filteredArchivedChats = filteredArchivedChats.filter((chat) => isFavorite(chat.id));
  }

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <SlideNav isOpen={navOpen} onClose={() => setNavOpen(false)} />

      <ChatListHeader
        sortBy={sortBy}
        sortDropdownOpen={sortDropdownOpen}
        showFavorites={showFavorites}
        isFetching={isFetching}
        creating={creating}
        onMenuOpen={() => setNavOpen(true)}
        onSortChange={setSortBy}
        onToggleSortDropdown={() => setSortDropdownOpen(!sortDropdownOpen)}
        onToggleFavorites={() => setShowFavorites(!showFavorites)}
        onRefetch={() => refetch()}
        onCreate={handleCreate}
      />

      <ChatListFilters
        searchQuery={searchQuery}
        selectedType={selectedType}
        chatTypes={chatTypes}
        onSearchChange={setSearchQuery}
        onTypeChange={setSelectedType}
      />

      <ErrorBanner error={error} />

      <main className="flex-1 overflow-y-auto">
        <ChatListContent
          chats={chats}
          filteredChats={filteredChats}
          filteredArchivedChats={filteredArchivedChats}
          isLoading={isLoading}
          creating={creating}
          searchQuery={searchQuery}
          showFavorites={showFavorites}
          selectedType={selectedType}
          isFavorite={isFavorite}
          onSelect={handleSelect}
          onToggleFavorite={(id) => toggleFavorite(id)}
          onDuplicate={handleDuplicate}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onDeleteArchived={handleDeleteArchived}
          onUnarchive={handleUnarchive}
          onCreate={handleCreate}
          onClearFilters={() => {
            setShowFavorites(false);
            setSearchParams((p) => {
              p.delete('q');
              return p;
            });
          }}
        />
      </main>

      {/* New Chat Modal */}
      {newChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="safe-area-bottom w-full max-w-lg rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Chat</h2>
              <Button variant="ghost" size="icon" onClick={handleNewChatClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {(createMutation.error || dirValidationError) && (
              <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {dirValidationError ||
                  (createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create chat')}
              </div>
            )}
            <form onSubmit={handleNewChatSubmit} className="space-y-4">
              <WorkingDirSelector
                value={newChatWorkingDir}
                onChange={setNewChatWorkingDir}
                onValidationError={setDirValidationError}
              />
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNewChatClose}
                  className="flex-1"
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Chat'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ChatArchiveDrawer
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        archivedChats={filteredArchivedChats}
        isLoading={archiveLoading}
        error={archiveError}
        isFavorite={isFavorite}
        onSelect={handleSelect}
        onToggleFavorite={(id) => toggleFavorite(id)}
        onDuplicate={handleDuplicate}
        onUnarchive={handleUnarchive}
        onDelete={handleDeleteArchived}
      />
    </div>
  );
}
