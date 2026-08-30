import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowUpDown, Check, Plus, RefreshCw, Star } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { api, unifiedChatApi } from '../lib/api';
import { ChatListFilters } from '../components/ChatListFilters';
import { ChatListContent } from '../components/ChatListContent';
import { ErrorBanner } from '../components/ErrorBanner';
import { HeaderSlot } from '../components/HeaderSlot';
import { UnifiedDirDropdown } from '../components/UnifiedDirDropdown';
import { extractErrorMessage } from '../lib/format';
import { getSortedChats, SORT_OPTIONS, type SortOption } from '../lib/chat-sort';
import type { InteractiveChat, UnifiedSession } from '../types';

function sessionToChat(session: UnifiedSession): InteractiveChat {
  return {
    id: session.sessionId,
    name: session.preview || session.sessionId.slice(0, 8),
    type: 'Unified',
    claudeSessionId: session.sessionId,
    status: 'completed',
    permissionMode: 'dangerous',
    model: 'sonnet',
    systemPrompt: null,
    effort: null,
    isRunning: false,
    progress: null,
    summary: null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    archivedAt: null,
    workingDir: session.cwd || null,
    fastMode: false,
    starred: false,
  };
}

export function UnifiedChatList() {
  const { encoded } = useParams<{ encoded: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchMode, setSearchMode] = useState<'chats' | 'messages'>('chats');

  const decodedEncoded = encoded ? decodeURIComponent(encoded) : '';
  const searchQuery = searchParams.get('q') ?? '';
  const sortBy = (searchParams.get('sort') as SortOption) ?? 'recent';

  const setSearchQuery = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('q', value);
      else next.delete('q');
      return next;
    }, { replace: true });
  };

  const setSortBy = (value: SortOption) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value !== 'recent') next.set('sort', value);
      else next.delete('sort');
      return next;
    }, { replace: true });
  };

  const {
    data: sessions = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['unified-sessions', decodedEncoded],
    queryFn: () => unifiedChatApi.listSessions(decodedEncoded),
    enabled: !!decodedEncoded,
  });

  const { data: favData, refetch: refetchFavs } = useQuery({
    queryKey: ['unified-favorites'],
    queryFn: () => unifiedChatApi.getFavorites(),
  });
  const favSet = new Set(favData?.sessionIds ?? []);

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['unified-search', decodedEncoded, searchQuery],
    queryFn: () => unifiedChatApi.searchSessions(decodedEncoded, searchQuery),
    enabled: searchMode === 'messages' && !!searchQuery && !!decodedEncoded,
    staleTime: 10_000,
  });

  const openMutation = useMutation({
    mutationFn: ({ sessionId, cwd, name }: { sessionId: string; cwd: string; name: string }) =>
      unifiedChatApi.openSession(sessionId, cwd, name),
    onSuccess: ({ chatId }) => navigate(`/chat/${chatId}`),
    onError: () => toast.error('Failed to open session'),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => unifiedChatApi.deleteSession(decodedEncoded, sessionId),
    onSuccess: () => refetch(),
    onError: () => toast.error('Failed to delete session'),
  });

  const favMutation = useMutation({
    mutationFn: (sessionId: string) => unifiedChatApi.toggleFavorite(sessionId),
    onSuccess: () => refetchFavs(),
    onError: () => toast.error('Failed to update favorite'),
  });

  // Decode the dir slug to a filesystem path (heuristic: hyphens → slashes)
  const workingDir = sessions[0]?.cwd || ('/' + decodedEncoded.replace(/-/g, '/'));

  const createMutation = useMutation({
    mutationFn: () =>
      api.createInteractiveChat({ workingDir, permissionMode: 'dangerous', model: 'sonnet' }),
    onSuccess: (chat) => navigate(`/chat/${chat.id}`),
    onError: () => toast.error('Failed to create chat'),
  });

  const sourceSessions = searchMode === 'messages' && searchQuery && searchResults
    ? searchResults
    : sessions;
  const chats = sourceSessions.map(sessionToChat);
  let filtered = getSortedChats(chats, sortBy);
  if (showFavorites) filtered = filtered.filter((c) => favSet.has(c.id));
  if (searchMode === 'chats' && searchQuery) {
    filtered = filtered.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const groupMode = sortBy === 'oldest' ? 'date-asc' : 'date';

  const handleSelect = (chat: InteractiveChat) => {
    const session = sessions.find((s) => s.sessionId === chat.id);
    if (!session) return;
    openMutation.mutate({ sessionId: session.sessionId, cwd: session.cwd, name: session.preview });
  };

  const noop = () => {};
  const handleCreate = () => createMutation.mutate();
  const errorMsg = extractErrorMessage(error);

  const sortControls = (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          title={SORT_OPTIONS.find((o) => o.value === sortBy)?.tooltip}
          onClick={() => setSortDropdownOpen((o) => !o)}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        {sortDropdownOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-popover shadow-lg">
            {SORT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                className="flex w-full items-center justify-start gap-2 rounded-none px-3 py-2 text-sm first:rounded-t-lg last:rounded-b-lg"
                onClick={() => { setSortBy(option.value); setSortDropdownOpen(false); }}
              >
                {sortBy === option.value && <Check className="h-4 w-4 text-primary" />}
                <span className={sortBy !== option.value ? 'ml-6' : ''}>{option.label}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
      <Button
        variant={showFavorites ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        title={showFavorites ? 'Show all chats' : 'Show favorites only'}
        onClick={() => setShowFavorites((f) => !f)}
      >
        <Star className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />
      </Button>
    </>
  );

  return (
    <div className="safe-area-bottom flex h-full flex-col">
      <HeaderSlot>
        <UnifiedDirDropdown encoded={decodedEncoded} />
        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching || isSearching}>
          <RefreshCw className={`h-5 w-5 ${(isFetching || isSearching) ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={createMutation.isPending ? 'Creating...' : 'New Chat'}
          onClick={handleCreate}
          disabled={createMutation.isPending}
        >
          <Plus className={`h-5 w-5 ${createMutation.isPending ? 'animate-spin' : ''}`} />
        </Button>
      </HeaderSlot>

      <ChatListFilters
        searchQuery={searchQuery}
        selectedType={null}
        chatTypes={[]}
        searchMode={searchMode}
        showRunning={false}
        runningCount={0}
        onSearchChange={setSearchQuery}
        onTypeChange={noop}
        onSearchModeChange={(mode) => { setSearchMode(mode); setSearchQuery(''); }}
        onToggleRunning={noop}
        extraControls={sortControls}
      />

      <ErrorBanner error={errorMsg} />

      <main className="flex-1 overflow-hidden">
        <ChatListContent
          chats={chats}
          filteredChats={filtered}
          filteredArchivedChats={[]}
          isLoading={isLoading || isSearching}
          creating={createMutation.isPending}
          searchQuery={searchQuery}
          showFavorites={showFavorites}
          selectedType={null}
          isFavorite={(id) => favSet.has(id)}
          onSelect={handleSelect}
          onToggleFavorite={(id) => favMutation.mutate(id)}
          onDuplicate={noop}
          onDelete={(chatId) => deleteMutation.mutate(chatId)}
          onDeleteArchived={noop}
          onUnarchive={noop}
          onCreate={handleCreate}
          onClearFilters={() => setSearchQuery('')}
          groupMode={groupMode}
        />
      </main>
    </div>
  );
}
