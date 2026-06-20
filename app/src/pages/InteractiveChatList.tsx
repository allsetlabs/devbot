import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@allsetlabs/forge/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/forge/components/ui/drawer';
import { chatHooks } from '../hooks/useChat';
import { WorkingDirSelector, useValidateAndSaveDir } from '../components/WorkingDirSelector';
import { useFavorites } from '../hooks/useFavorites';
import { extractErrorMessage } from '../lib/format';
import { ErrorBanner } from '../components/ErrorBanner';
import { ChatListHeader } from '../components/ChatListHeader';
import { useNav } from '../hooks/useNav';
import { ChatListFilters } from '../components/ChatListFilters';
import { ChatArchiveDrawer } from '../components/ChatArchiveDrawer';
import { ChatListContent } from '../components/ChatListContent';
import { MessageSearchResults } from '../components/MessageSearchResults';
import { getSortedChats, type SortOption } from '../lib/chat-sort';
import type { InteractiveChat, PermissionMode, ClaudeModel } from '../types';

export function InteractiveChatList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openNav } = useNav();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatWorkingDir, setNewChatWorkingDir] = useState('');
  const [dirValidationError, setDirValidationError] = useState('');
  const validateAndSaveDir = useValidateAndSaveDir();

  const searchQuery = searchParams.get('q') ?? '';
  const selectedType = searchParams.get('type') ?? null;
  const sortBy = (searchParams.get('sort') as SortOption) ?? 'recent';
  const searchMode = (searchParams.get('sm') as 'chats' | 'messages') ?? 'chats';
  const showRunning = searchParams.get('running') === '1';

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

  const setSearchMode = (mode: 'chats' | 'messages') => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (mode !== 'chats') next.set('sm', mode);
        else next.delete('sm');
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
        next.delete('running');
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

  const toggleRunning = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (prev.get('running') === '1') next.delete('running');
        else next.set('running', '1');
        return next;
      },
      { replace: true }
    );
  };

  const { data: chatTypes = [] } = chatHooks.useGetChatTypes();

  const { data: messageSearchResults = [], isFetching: messageSearchFetching } =
    chatHooks.useSearchMessages(searchQuery, searchMode === 'messages' && searchQuery.length >= 2);

  const {
    data: chats = [],
    isLoading,
    isFetching,
    error: chatsError,
    refetch,
  } = chatHooks.useGetChats({ type: selectedType, q: searchMode === 'chats' ? searchQuery : '' });

  const {
    data: archivedChats = [],
    isLoading: archiveLoading,
    error: archiveQueryError,
  } = chatHooks.useGetArchivedChats({
    type: selectedType,
    q: searchMode === 'chats' ? searchQuery : '',
  });

  const allChats = useMemo(() => [...chats, ...archivedChats], [chats, archivedChats]);
  const { isFavorite, toggleFavorite } = useFavorites(allChats);

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

  const runningCount = chats.filter((c) => c.isRunning).length;

  let filteredChats = getSortedChats(chats, sortBy);
  if (showRunning) {
    filteredChats = filteredChats.filter((chat) => chat.isRunning);
  }
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
      <ChatListHeader
        sortBy={sortBy}
        sortDropdownOpen={sortDropdownOpen}
        showFavorites={showFavorites}
        isFetching={isFetching}
        creating={creating}
        onMenuOpen={openNav}
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
        searchMode={searchMode}
        showRunning={showRunning}
        runningCount={runningCount}
        onSearchChange={setSearchQuery}
        onTypeChange={setSelectedType}
        onSearchModeChange={setSearchMode}
        onToggleRunning={toggleRunning}
      />

      <ErrorBanner error={error} />

      <main className="flex-1 overflow-hidden">
        {searchMode === 'messages' ? (
          <MessageSearchResults
            results={messageSearchResults}
            query={searchQuery}
            loading={messageSearchFetching && searchQuery.length >= 2}
          />
        ) : (
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
        )}
      </main>

      <Drawer
        open={newChatOpen}
        onOpenChange={(open) => {
          if (!open) handleNewChatClose();
        }}
      >
        <DrawerContent className="safe-area-bottom">
          <DrawerHeader className="text-left">
            <DrawerTitle>New Chat</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
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
        </DrawerContent>
      </Drawer>

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
