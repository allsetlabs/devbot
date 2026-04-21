import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useInputHistory } from '../hooks/useInputHistory';
import { usePinnedMessages } from '../hooks/usePinnedMessages';
import { useMessageReactions } from '../hooks/useMessageReactions';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCrudMutation } from '../hooks/useCrudMutation';
import { notifyTaskComplete, notifyTaskFailed, setNotificationSettings } from '../lib/notification';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { ArrowLeft, Loader2, MessageCircle, Upload, GitBranch } from 'lucide-react';
import { api, uploadFiles } from '../lib/api';
import { copyToClipboard } from '../lib/clipboard';
import { toast } from 'sonner';
import { POLL_INTERVALS } from '../lib/constants';
import { SLASH_COMMANDS } from '../lib/slash-commands';
import { VITE_DEVBOT_PROJECTS_DIR } from '../lib/env';
import { getCachedDraft, setCachedDraft, cleanupLegacyMessageCaches } from '../lib/storage';
import { ErrorBanner } from '../components/ErrorBanner';
import { MessageList } from '../components/MessageList';
import { ChatWelcomeScreen } from '../components/ChatWelcomeScreen';
import { ChatSearchBar } from '../components/ChatSearchBar';
import { SettingsDrawer } from '../components/SettingsDrawer';
import { McpServersDrawer } from '../components/McpServersDrawer';
import { HooksDrawer } from '../components/HooksDrawer';
import { MemoryViewerDrawer } from '../components/MemoryViewerDrawer';
import { ClaudeMdDrawer } from '../components/ClaudeMdDrawer';
import { WorktreeDrawer } from '../components/WorktreeDrawer';
import { KeybindingsDrawer } from '../components/KeybindingsDrawer';
import { SessionCostDrawer } from '../components/SessionCostDrawer';
import { PinnedMessagesDrawer } from '../components/PinnedMessagesDrawer';
import { ToolHistoryDrawer } from '../components/ToolHistoryDrawer';
import { EditMessageDialog } from '../components/EditMessageDialog';
import { HelpModal } from '../components/HelpModal';
import {
  type SlashCommandPickerHandle,
  type SlashCommandGroup,
} from '@allsetlabs/reusable/components/ui/slash-command-picker';
import { type FileIntellisensePickerHandle } from '@allsetlabs/reusable/components/ui/file-intellisense-picker';
import { useFileIntellisense } from '../hooks/useFileIntellisense';
import { useCommands } from '../hooks/useCommands';
import { useGitStatus } from '../hooks/useGitStatus';
import { useSettings } from '../hooks/useSettings';
import { useDeleteChat, useArchiveChat } from '../hooks/useChat';
import { useFavorites } from '../hooks/useFavorites';
import { DirectoryBrowserSidebar } from '../components/DirectoryBrowserSidebar';
import { ChatViewHeader } from '../components/ChatViewHeader';
import { ChatInputArea, type AttachedFile } from '../components/ChatInputArea';
import { ChatModeSwitcherDrawer } from '../components/ChatModeSwitcherDrawer';
import { ChatModelSwitcherDrawer } from '../components/ChatModelSwitcherDrawer';
import { ChatSystemPromptDrawer } from '../components/ChatSystemPromptDrawer';
import { ChatMaxTurnsDrawer } from '../components/ChatMaxTurnsDrawer';
import { ChatExportDrawer, type ExportFormat } from '../components/ChatExportDrawer';
import { ChatSlashHelpDialog } from '../components/ChatSlashHelpDialog';
import { ChatClearConfirmDialog } from '../components/ChatClearConfirmDialog';
import { ChatRenameDialog } from '../components/ChatRenameDialog';
import { ChatUnsafeBanner } from '../components/ChatUnsafeBanner';
import { InlineFileEditor } from '../components/InlineFileEditor';
import type {
  InteractiveChat,
  ChatMessage as ChatMessageType,
  PermissionMode,
  ClaudeModel,
} from '../types';
import type { TaskMessage } from '../types';
import { extractUsageData } from '../components/ChatMessage';
import { generateChatTitle } from '../lib/format';

const ACCEPTED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
  '.md',
  '.html',
  '.css',
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.toml',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.sh',
].join(',');

/** Strip file paths from user message text for display */
function stripFilePaths(text: string): string {
  // Match absolute paths like /Users/.../filename.ext
  return text.replace(/\s*\[Attached file: [^\]]+\]\s*/g, '').trim();
}

interface InteractiveChatViewProps {
  chatId?: string;
  embedded?: boolean;
  initialIsRunning?: boolean;
}

export function InteractiveChatView({
  chatId: propChatId,
  embedded = false,
  initialIsRunning = false,
}: InteractiveChatViewProps = {}) {
  const { chatId: paramChatId } = useParams<{ chatId: string }>();
  const chatId = propChatId ?? paramChatId;
  const navigate = useNavigate();
  // UI-only state — seed input from localStorage draft
  const [input, setInput] = useState(() => (chatId ? getCachedDraft(chatId) : ''));
  const [cursorPosition, setCursorPosition] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [interrupting, setInterrupting] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [modeDrawerOpen, setModeDrawerOpen] = useState(false);
  const [modelDrawerOpen, setModelDrawerOpen] = useState(false);
  const [systemPromptOpen, setSystemPromptOpen] = useState(false);
  const [systemPromptValue, setSystemPromptValue] = useState('');
  const [maxTurnsOpen, setMaxTurnsOpen] = useState(false);
  const [maxTurnsValue, setMaxTurnsValue] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mcpServersOpen, setMcpServersOpen] = useState(false);
  const [hooksOpen, setHooksOpen] = useState(false);
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [claudeMdOpen, setClaudeMdOpen] = useState(false);
  const [worktreesOpen, setWorktreesOpen] = useState(false);
  const [keybindingsOpen, setKeybindingsOpen] = useState(false);
  const [costDrawerOpen, setCostDrawerOpen] = useState(false);
  const [pinnedMessagesOpen, setPinnedMessagesOpen] = useState(false);
  const [toolHistoryOpen, setToolHistoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [messageTypeFilter, setMessageTypeFilter] = useState<'all' | 'user' | 'assistant' | 'tool'>(
    'all'
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [hasGeneratedTitle, setHasGeneratedTitle] = useState(false);
  const [, setExporting] = useState(false);
  const [exportFormatOpen, setExportFormatOpen] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<ExportFormat>('markdown');
  const [directoryBrowserOpen, setDirectoryBrowserOpen] = useState(false);
  const [openEditorFiles, setOpenEditorFiles] = useState<string[]>([]);
  const [unsafeBannerDismissed, setUnsafeBannerDismissed] = useState(
    () => localStorage.getItem('unsafe-banner-dismissed') === '1'
  );
  const [hideToolResults, setHideToolResults] = useState(() => {
    if (!chatId) return false;
    return localStorage.getItem(`hide-tool-results-${chatId}`) === '1';
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slashPickerRef = useRef<SlashCommandPickerHandle>(null);
  const filePickerRef = useRef<FileIntellisensePickerHandle>(null);
  const { pushHistory, handleHistoryKey, resetNavigation } = useInputHistory();

  // Settings
  const {
    settings,
    isLoaded: settingsLoaded,
    toggleSound,
    toggleHaptic,
    toggleAutoScroll,
  } = useSettings();

  // Favorites
  const { isFavorite, toggleFavorite } = useFavorites();

  // Delete/archive mutations for settings drawer
  const deleteChatMutation = useDeleteChat();
  const archiveChatMutation = useArchiveChat();

  // Pinned messages
  const { pinnedIds, togglePin } = usePinnedMessages(chatId);

  // Message reactions
  const { getReaction, toggleReaction } = useMessageReactions(chatId!);

  // Sync settings with notification system when they change
  useEffect(() => {
    if (settingsLoaded) {
      setNotificationSettings(settings);
    }
  }, [settings, settingsLoaded]);

  // Branch state
  const [currentBranch, setCurrentBranch] = useState('main');
  const [branches, setBranches] = useState<string[]>(['main']);

  // Cursor-based messages (kept in useState since incremental append doesn't fit useQuery)
  // Messages fetched from backend — no localStorage cache (avoids iOS quota issues)
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const lastSequenceRef = useRef(0);

  const messageListRef = useRef<{
    scrollToMessage: (index: number, align?: 'start' | 'center' | 'end') => void;
  } | null>(null);

  // Initialize lastSequenceRef and input history from cached messages on mount
  useEffect(() => {
    if (messages.length > 0 && lastSequenceRef.current === 0) {
      lastSequenceRef.current = messages[messages.length - 1].sequence;
      // Seed input history from existing user messages
      for (const msg of messages) {
        if (msg.type === 'user') {
          const text = msg.content?.message?.content
            ?.filter((b) => b.type === 'text' && b.text)
            .map((b) => b.text)
            .join('\n');
          if (text) pushHistory(stripFilePaths(text));
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track running state via ref for refetchInterval (avoids circular dependency)
  const isRunningRef = useRef(initialIsRunning);

  // Query: chat details — refetch while running to pick up name changes
  const {
    data: chat,
    isLoading: chatLoading,
    error: chatError,
  } = useQuery<InteractiveChat>({
    queryKey: ['interactive-chat', chatId],
    queryFn: () => api.getInteractiveChat(chatId!),
    enabled: !!chatId,
    refetchInterval: () => (isRunningRef.current ? POLL_INTERVALS.chatRunning : false),
  });

  // Slash command picker — must be after chat query so workingDir is available
  const { data: commands = [] } = useCommands(chat?.workingDir);

  const { data: gitStatus } = useGitStatus(chat?.workingDir);

  // File intellisense picker — must be after chat query so workingDir is available
  const {
    fileIntellisenseOpen,
    fileIntellisenseFilter,
    fileIntellisenseFiles,
    fileIntellisenseLoading,
    fileIntellisenseLoadingMore,
    fileIntellisenseHasMore,
    loadMoreFiles,
  } = useFileIntellisense(input, chat?.workingDir ?? undefined, cursorPosition);
  const slashOpen = input.startsWith('/') && !input.includes(' ');
  const slashFilter = slashOpen ? input.slice(1) : '';
  const slashGroups = useMemo<SlashCommandGroup[]>(() => {
    const skills = commands.filter((c) => c.type === 'skill');
    const cmds = commands.filter((c) => c.type === 'command');
    const builtins = commands.filter((c) => c.type === 'builtin');
    const groups: SlashCommandGroup[] = [];
    if (skills.length > 0) groups.push({ heading: 'Skills', items: skills });
    if (cmds.length > 0) groups.push({ heading: 'Commands', items: cmds });
    if (builtins.length > 0) groups.push({ heading: 'Default', items: builtins });
    return groups;
  }, [commands]);

  // Query: status polling — drives message fetching via dataUpdatedAt
  const { data: statusData, dataUpdatedAt } = useQuery({
    queryKey: ['chat-status', chatId],
    queryFn: () => api.getChatStatus(chatId!),
    enabled: !!chatId,
    refetchInterval: () =>
      isRunningRef.current ? POLL_INTERVALS.chatRunning : POLL_INTERVALS.chatIdle,
  });

  const isRunning = statusData?.isRunning ?? initialIsRunning;

  // Keep ref in sync so refetchInterval reads the latest value
  const prevIsRunningRef = useRef(false);
  useEffect(() => {
    // Detect transition from running -> stopped (task just finished)
    if (prevIsRunningRef.current && !isRunning) {
      // Check the last message to determine success vs failure
      const lastMsg = messages[messages.length - 1];
      const isFailure =
        lastMsg?.content?.type === 'result' && lastMsg?.content?.subtype === 'error';
      if (isFailure) {
        notifyTaskFailed();
      } else {
        notifyTaskComplete();
      }
    }
    prevIsRunningRef.current = isRunning;
    isRunningRef.current = isRunning;
  }, [isRunning, messages]);

  // Fetch messages (cursor-based incremental append)
  const fetchMessages = useCallback(
    async (afterSequence = 0) => {
      if (!chatId) return;
      try {
        const newMessages = await api.getChatMessages(chatId, afterSequence, currentBranch);
        if (newMessages.length > 0) {
          if (afterSequence === 0) {
            setMessages(newMessages);
          } else {
            setMessages((prev) => {
              const existingSeqs = new Set(prev.map((m) => m.sequence));
              const deduped = newMessages.filter((m) => !existingSeqs.has(m.sequence));
              return deduped.length > 0 ? [...prev, ...deduped] : prev;
            });
          }
          lastSequenceRef.current = newMessages[newMessages.length - 1].sequence;
        }
        if (afterSequence === 0) setMessagesLoading(false);
      } catch (err) {
        console.error('Error fetching messages:', err);
        if (afterSequence === 0) setMessagesLoading(false);
      }
    },
    [chatId, currentBranch]
  );

  // Fetch branches
  useEffect(() => {
    if (!chatId) return;
    api.getChatBranches(chatId).then(setBranches).catch(() => {});
  }, [chatId]);

  // Reset messages when switching branches
  useEffect(() => {
    setMessages([]);
    lastSequenceRef.current = 0;
    setMessagesLoading(true);
    fetchMessages(0);
  }, [currentBranch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up legacy message caches that bloat localStorage on iOS
  useEffect(() => cleanupLegacyMessageCaches(), []);

  // Debounce-save draft input to localStorage (500ms)
  useEffect(() => {
    if (!chatId) return;
    const timer = setTimeout(() => setCachedDraft(chatId, input), 500);
    return () => clearTimeout(timer);
  }, [chatId, input]);

  // Fetch messages whenever status query updates (replaces manual setInterval polling)
  useEffect(() => {
    if (chatId && dataUpdatedAt > 0) {
      fetchMessages(lastSequenceRef.current);
    }
  }, [chatId, dataUpdatedAt, fetchMessages]);

  // Auto-generate chat title from first user message
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!chat || !chatId || hasGeneratedTitle || messages.length === 0) return;

    // Find the first user message
    const firstUserMsg = messages.find((msg) => msg.type === 'user');
    if (!firstUserMsg) return;

    // Extract message text
    const msgText = firstUserMsg.content?.message?.content
      ?.filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join(' ');

    if (!msgText) return;

    // Generate title and update chat
    const generatedTitle = generateChatTitle(msgText);
    if (generatedTitle && generatedTitle !== 'New Chat' && chat.name === 'New Chat') {
      // Call API to update chat name
      api
        .renameInteractiveChat(chatId, generatedTitle)
        .then((updatedChat) => {
          // Update the query cache with the new chat data
          queryClient.setQueryData(['interactive-chat', chatId], updatedChat);
          setHasGeneratedTitle(true);
        })
        .catch((err) => {
          console.error('Failed to auto-generate chat title:', err);
          setHasGeneratedTitle(true); // Still mark as generated to prevent retries
        });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasGeneratedTitle(true);
    }
  }, [messages, chat, chatId, hasGeneratedTitle, queryClient]);

  // Search messages logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchMatches([]);

      setCurrentMatchIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matches: number[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      let hasMatch = false;

      // Check message type filter
      const matchesTypeFilter =
        messageTypeFilter === 'all' ||
        (messageTypeFilter === 'user' && msg.type === 'user') ||
        (messageTypeFilter === 'assistant' && msg.type === 'assistant') ||
        (messageTypeFilter === 'tool' && msg.type === 'tool_use');

      if (!matchesTypeFilter) continue;

      // Search in user message text
      if (msg.type === 'user') {
        const text = msg.content?.message?.content
          ?.filter((b) => b.type === 'text')
          .map((b) => (b as { text: string }).text)
          .join(' ')
          .toLowerCase();
        if (text?.includes(query)) hasMatch = true;
      }

      // Search in assistant message text
      if (msg.type === 'assistant') {
        const text = msg.content?.message?.content
          ?.filter((b) => b.type === 'text')
          .map((b) => (b as { text: string }).text)
          .join(' ')
          .toLowerCase();
        if (text?.includes(query)) hasMatch = true;
      }

      // Search in tool names
      if (msg.type === 'tool_use') {
        if ((msg.content.tool_name as string).toLowerCase().includes(query)) hasMatch = true;
      }

      if (hasMatch) matches.push(i);
    }

    setSearchMatches(matches);
    setCurrentMatchIndex(0);
  }, [searchQuery, messages, messageTypeFilter]);

  // Send message mutation
  const sendMutation = useCrudMutation(
    (prompt: string) => api.sendChatMessage(chatId!, prompt, currentBranch),
    [
      ['chat-status', chatId],
      ['interactive-chat', chatId],
    ],
    {
      onSuccess: () => {
        isRunningRef.current = true;
      },
    }
  );

  // Stop chat mutation
  const stopMutation = useCrudMutation(() => api.stopChat(chatId!), [['chat-status', chatId]], {
    onSuccess: () => {
      isRunningRef.current = false;
    },
  });

  // Rename chat mutation
  const renameMutation = useCrudMutation(
    (name: string) => api.renameInteractiveChat(chatId!, name),
    [['interactive-chat', chatId]],
    { onSuccess: () => setRenameOpen(false) }
  );

  // Change mode mutation
  const modeMutation = useCrudMutation(
    (mode: PermissionMode) => api.changeChatMode(chatId!, mode),
    [['interactive-chat', chatId]],
    { onSuccess: () => setModeDrawerOpen(false) }
  );

  // Change model mutation
  const modelMutation = useCrudMutation(
    (model: ClaudeModel) => api.changeChatModel(chatId!, model),
    [['interactive-chat', chatId]],
    { onSuccess: () => setModelDrawerOpen(false) }
  );

  // Update system prompt mutation
  const systemPromptMutation = useCrudMutation(
    (prompt: string | null) => api.updateChatSystemPrompt(chatId!, prompt),
    [['interactive-chat', chatId]],
    { onSuccess: () => setSystemPromptOpen(false) }
  );

  // Change max turns mutation
  const maxTurnsMutation = useCrudMutation(
    (maxTurns: number | null) => api.changeChatMaxTurns(chatId!, maxTurns),
    [['interactive-chat', chatId]],
    { onSuccess: () => setMaxTurnsOpen(false) }
  );

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadFiles(files, chatId),
    onMutate: (files) => {
      const placeholders: AttachedFile[] = files.map((f, i) => ({
        id: `${Date.now()}-${i}`,
        name: f.name,
        path: '',
        uploading: true,
      }));
      setAttachedFiles((prev) => [...prev, ...placeholders]);
      return { placeholders };
    },
    onSuccess: (result, _files, context) => {
      const uploaded = result.files ?? [];
      setAttachedFiles((prev) =>
        prev.map((af) => {
          const idx = context.placeholders.findIndex((p) => p.id === af.id);
          if (idx !== -1 && uploaded[idx]) {
            return { ...af, path: uploaded[idx].path, uploading: false };
          }
          return af;
        })
      );
    },
    onError: (_err, _files, context) => {
      if (context?.placeholders) {
        const ids = new Set(context.placeholders.map((p) => p.id));
        setAttachedFiles((prev) => prev.filter((af) => !ids.has(af.id)));
      }
    },
  });

  const sending = sendMutation.isPending;
  const loading = chatLoading || messagesLoading;

  // Autofocus the input when chat finishes loading
  useEffect(() => {
    if (!loading) {
      textareaRef.current?.focus();
    }
  }, [loading]);

  // Keyboard shortcut: Cmd/Ctrl+K to focus input, ? to open help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        // Only open help if not in an input field
        if (!(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          setHelpModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Derive error from all sources
  const error =
    (uploadMutation.error instanceof Error ? uploadMutation.error.message : null) ??
    (chatError instanceof Error ? chatError.message : null) ??
    (sendMutation.error instanceof Error ? sendMutation.error.message : null) ??
    (stopMutation.error instanceof Error ? stopMutation.error.message : null);

  // File upload handler - accepts one or more files
  const handleFilesUpload = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      uploadMutation.mutate(files);
    },
    [uploadMutation]
  );

  // Directory browser file selection handler
  const handleSelectFileFromBrowser = useCallback(
    (filePath: string) => {
      // Attach the file
      if (!attachedFiles.some((f) => f.path === filePath)) {
        setAttachedFiles((prev) => [
          ...prev,
          {
            id: filePath,
            name: filePath.split('/').pop() || filePath,
            path: filePath,
            uploading: false,
          },
        ]);
      }
      // Add @ reference to input
      const fileName = filePath.split('/').pop() || filePath;
      setInput((prev) => prev.trim() + (prev.trim() ? ' ' : '') + '@' + fileName + ' ');
      textareaRef.current?.focus();
    },
    [attachedFiles]
  );

  const handleOpenFileEditor = useCallback((filePath: string) => {
    setOpenEditorFiles((prev) =>
      prev.includes(filePath) ? prev : [...prev, filePath]
    );
  }, []);

  const handleCloseFileEditor = useCallback((filePath: string) => {
    setOpenEditorFiles((prev) => prev.filter((f) => f !== filePath));
  }, []);

  // Drag and drop
  const onDropFiles = useCallback(
    (files: File[]) => {
      handleFilesUpload(files);
    },
    [handleFilesUpload]
  );
  const { isDragging } = useDragAndDrop(onDropFiles);

  // Branch from a message
  const handleBranch = useCallback(
    async (messageId: string) => {
      if (!chatId) return;
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;
      try {
        const result = await api.createChatBranch(chatId, msg.sequence, undefined, currentBranch);
        setBranches((prev) => [...prev, result.branchId]);
        setCurrentBranch(result.branchId);
      } catch (err) {
        console.error('Failed to create branch:', err);
      }
    },
    [chatId, messages, currentBranch]
  );

  // Send message
  const readyFiles = attachedFiles.filter((f) => !f.uploading && f.path);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && readyFiles.length === 0) || !chatId || sending || interrupting) return;

    // Handle slash commands
    if (trimmed.startsWith('/')) {
      const command = trimmed.split(/\s+/)[0].toLowerCase();

      // Clear input after handling command
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      if (chatId) setCachedDraft(chatId, '');

      const slashActions: Record<string, () => void> = {
        openHelp: () => setHelpOpen(true),
        openClearConfirm: () => setClearConfirmOpen(true),
        openModeDrawer: () => setModeDrawerOpen(true),
        openModelDrawer: () => setModelDrawerOpen(true),
        showInfo: () => {
          const info = `Session Info:\n\nMessages: ${messages.length}\nModel: ${chat?.model || 'N/A'}`;
          alert(info);
        },
        sendCompact: () => {
          if (!chatId) return;
          toast.info('Compacting conversation…');
          sendMutation.mutate('/compact');
        },
      };

      const matched = SLASH_COMMANDS.find((c) => c.command === command);
      if (matched && slashActions[matched.action]) {
        slashActions[matched.action]();
        return;
      }
      if (matched) return;
    }

    // Build prompt: user text + file path tags (skip files already @-mentioned in the text)
    let prompt = trimmed;
    if (readyFiles.length > 0) {
      const unmentioned = readyFiles.filter((f) => !trimmed.includes(`@${f.path}`));
      if (unmentioned.length > 0) {
        const fileTags = unmentioned.map((f) => `[Attached file: ${f.path}]`).join('\n');
        prompt = prompt ? `${prompt}\n\n${fileTags}` : fileTags;
      }
    }

    pushHistory(trimmed);
    setInput('');
    // Reset textarea height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setAttachedFiles([]);
    uploadMutation.reset();
    if (chatId) setCachedDraft(chatId, '');

    // If Claude is running, interrupt first then send the new message
    if (isRunning) {
      setInterrupting(true);
      try {
        await api.stopChat(chatId);
        // Brief delay for process cleanup before sending new message
        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch {
        // Process may have already finished — continue with send
      }
      isRunningRef.current = false;
      setInterrupting(false);
    }

    sendMutation.mutate(prompt);
  }, [
    input,
    chatId,
    sending,
    interrupting,
    readyFiles,
    sendMutation,
    uploadMutation,
    isRunning,
    pushHistory,
    messages,
    chat,
  ]);

  // Stop execution
  const handleStop = useCallback(() => {
    if (!chatId) return;
    stopMutation.mutate();
  }, [chatId, stopMutation]);

  // Keyboard: Enter to send (or interrupt+send), Escape to stop, Up/Down for history
  // On touch devices (mobile), Enter always inserts a newline — user taps the send button instead
  const isTouchDevice = navigator.maxTouchPoints > 0;
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Let file intellisense picker handle keys first
    if (fileIntellisenseOpen && filePickerRef.current?.handleKeyDown(e)) return;

    // Let slash command picker handle keys
    if (slashOpen && slashPickerRef.current?.handleKeyDown(e)) return;

    // Cmd/Ctrl+Enter to send (alternative to Enter)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Cmd/Ctrl+Shift+K to clear input
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'k') {
      e.preventDefault();
      setInput('');
      setAttachedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      if (chatId) setCachedDraft(chatId, '');
      return;
    }

    if (e.key === 'Escape' && isRunning && !interrupting) {
      e.preventDefault();
      handleStop();
      return;
    }
    // Up/Down arrow: navigate input history (shell-like behavior)
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const cursorPos = e.currentTarget.selectionStart ?? 0;
      const result = handleHistoryKey(e.key, input, cursorPos);
      if (result !== null) {
        e.preventDefault();
        setInput(result);
        // Move cursor to end after setting history value
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (el) {
            el.selectionStart = result.length;
            el.selectionEnd = result.length;
          }
        });
      }
    }
  };

  const handleBack = () => navigate(-1);

  const handleToggleToolResults = useCallback(() => {
    setHideToolResults((prev) => {
      const newValue = !prev;
      if (chatId) {
        localStorage.setItem(`hide-tool-results-${chatId}`, newValue ? '1' : '0');
      }
      return newValue;
    });
  }, [chatId]);

  // Export chat in multiple formats
  const mimeTypes: Record<'markdown' | 'json' | 'plaintext', string> = {
    markdown: 'text/markdown',
    json: 'application/json',
    plaintext: 'text/plain',
  };

  const fileExtensions: Record<'markdown' | 'json' | 'plaintext', string> = {
    markdown: 'md',
    json: 'json',
    plaintext: 'txt',
  };

  const exportMutation = useMutation({
    mutationFn: (format: ExportFormat) => api.exportChat(chatId!, format),
    onMutate: () => setExporting(true),
    onSuccess: async (blob, format) => {
      const ext = fileExtensions[format];
      const fileName = `${(chat?.name || 'chat').replace(/[^a-zA-Z0-9-_ ]/g, '')}.${ext}`;

      // Use Web Share API if available
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: mimeTypes[format] });
        const shareData = { files: [file] };
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
          } catch {
            // User cancelled share — not an error
          }
          setExporting(false);
          setExportFormatOpen(false);
          return;
        }
      }

      // Fallback: download as file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExporting(false);
      setExportFormatOpen(false);
    },
    onError: () => setExporting(false),
  });

  // File input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFilesUpload(Array.from(files));
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  // Render user message text with file paths stripped and filenames shown
  const renderUserMessage = (message: ChatMessageType) => {
    const content = { ...message.content };
    if (content.message?.content) {
      content.message = {
        ...content.message,
        content: content.message.content.map((block) => {
          if (block.type === 'text' && typeof block.text === 'string') {
            const stripped = stripFilePaths(block.text);
            // Extract all filenames from attached file tags
            const fileMatches = [...block.text.matchAll(/\[Attached file: [^\]]*\/([^\]/]+)\]/g)];
            const fileNames = fileMatches.map((m) => m[1]);
            const fileSuffix =
              fileNames.length > 0 ? fileNames.map((n) => `📎 ${n}`).join('\n') : '';
            return {
              ...block,
              text: fileSuffix ? (stripped ? `${stripped}\n${fileSuffix}` : fileSuffix) : stripped,
            };
          }
          return block;
        }),
      };
    }
    return content;
  };

  // Pre-process messages: apply user transforms, convert ChatMessage -> TaskMessage
  const renderedMessages = useMemo(() => {
    let filtered = messages;
    if (hideToolResults) {
      filtered = messages.filter((m) => {
        // Filter out tool_use and tool_result message types
        if (m.type === 'tool_use' || m.type === 'tool_result') return false;
        // Filter out assistant messages that only contain tool_use blocks
        if (m.type === 'assistant' && Array.isArray(m.content?.message?.content)) {
          const blocks = m.content.message.content;
          const allToolUse =
            blocks.length > 0 &&
            blocks.every(
              (b: { type: string }) => b.type === 'tool_use' || b.type === 'tool_result'
            );
          if (allToolUse) return false;
        }
        // Filter out system messages with tool-related subtypes
        if (m.type === 'system' && m.content?.subtype === 'tool_result') return false;
        return true;
      });
    }
    return filtered.map<TaskMessage>((message) => {
      const content = message.type === 'user' ? renderUserMessage(message) : message.content;
      return {
        id: message.id,
        runId: message.chatId,
        sequence: message.sequence,
        type: message.type,
        content,
        createdAt: message.createdAt,
      };
    });
  }, [messages, hideToolResults]);

  // Auto-scroll to current search match
  useEffect(() => {
    if (searchMatches.length === 0) return;
    const matchedMsgIndex = searchMatches[currentMatchIndex];
    if (matchedMsgIndex === undefined) return;
    const matchedMsg = messages[matchedMsgIndex];
    if (!matchedMsg) return;
    const renderedIdx = renderedMessages.findIndex((m) => m.id === matchedMsg.id);
    if (renderedIdx >= 0) {
      messageListRef.current?.scrollToMessage(renderedIdx);
    }
  }, [currentMatchIndex, searchMatches, messages, renderedMessages]);

  // Retry: re-send the last user message
  const handleRetry = useCallback(() => {
    if (!chatId || isRunning || sending) return;
    // Find last user message in reverse
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        const textBlocks = messages[i].content?.message?.content?.filter(
          (b) => b.type === 'text' && b.text
        );
        const prompt = textBlocks?.map((b) => b.text ?? '').join('\n');
        if (prompt) {
          sendMutation.mutate(prompt);
          return;
        }
      }
    }
  }, [chatId, isRunning, sending, messages, sendMutation]);

  // Regenerate: re-send the last user message to get a different response
  const handleRegenerate = useCallback(() => {
    if (!chatId || isRunning || sending) return;
    // Find last user message in reverse
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        const textBlocks = messages[i].content?.message?.content?.filter(
          (b) => b.type === 'text' && b.text
        );
        const prompt = textBlocks?.map((b) => b.text ?? '').join('\n');
        if (prompt) {
          sendMutation.mutate(prompt);
          return;
        }
      }
    }
  }, [chatId, isRunning, sending, messages, sendMutation]);

  // Edit message: open dialog to edit a user message
  const handleEditMessage = useCallback((messageId: string, text: string) => {
    setEditingMessage({ id: messageId, text });
    setEditDialogOpen(true);
  }, []);

  // Confirm edit: resend the edited message
  const handleEditConfirm = useCallback(
    (editedText: string) => {
      if (!chatId || isRunning || sending) return;
      setEditDialogOpen(false);
      sendMutation.mutate(editedText);
    },
    [chatId, isRunning, sending, sendMutation]
  );

  // Cancel edit: close the dialog
  const handleEditCancel = useCallback(() => {
    setEditDialogOpen(false);
    setEditingMessage(null);
  }, []);

  // Aggregate session stats across all result messages
  const sessionStats = useMemo(() => {
    let totalTokens = 0;
    let totalCost = 0;
    let totalDuration = 0;
    let turnCount = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheCreationTokens = 0;
    const perTurnUsage: import('../components/SystemMessage').UsageData[] = [];
    for (const msg of messages) {
      if (msg.type === 'user') turnCount++;
      const usage = extractUsageData(msg.content);
      if (usage) {
        totalTokens += usage.inputTokens + usage.outputTokens;
        totalCost += usage.costUsd;
        totalDuration += usage.durationMs;
        inputTokens += usage.inputTokens;
        outputTokens += usage.outputTokens;
        cacheReadTokens += usage.cacheReadTokens;
        cacheCreationTokens += usage.cacheCreationTokens;
        perTurnUsage.push(usage);
      }
    }
    return { totalTokens, totalCost, totalDuration, turnCount, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, perTurnUsage };
  }, [messages]);

  if (loading) {
    return (
      <div className={`${embedded ? '' : 'safe-area-top safe-area-bottom'} flex h-full flex-col`}>
        {!embedded && (
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <MessageCircle className="h-5 w-5 text-primary" />
            <span className="text-foreground">Loading...</span>
          </header>
        )}
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (error && !chat) {
    return (
      <div className={`${embedded ? '' : 'safe-area-top safe-area-bottom'} flex h-full flex-col`}>
        {!embedded && (
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <span className="text-foreground">Chat</span>
          </header>
        )}
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <MessageCircle className="h-16 w-16 text-muted-foreground/50" />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">{error}</h2>
          </div>
          {!embedded && (
            <Button onClick={handleBack}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          )}
        </main>
      </div>
    );
  }

  return (
    <div
      className={`${embedded ? '' : 'safe-area-top safe-area-bottom'} relative flex h-full flex-col`}
    >
      {/* Header — hidden when embedded */}
      {!embedded && (
        <ChatViewHeader
          onBack={handleBack}
          isRunning={isRunning}
          chat={chat}
          messages={messages}
          totalTokens={sessionStats.totalTokens}
          gitStatus={gitStatus}
          onToggleSearch={() => {
            setSearchOpen(!searchOpen);
            if (searchOpen) setSearchQuery('');
          }}
          hideToolResults={hideToolResults}
          onToggleToolResults={handleToggleToolResults}
          pinnedIds={pinnedIds}
          onOpenPinnedMessages={() => setPinnedMessagesOpen(true)}
          onOpenToolHistory={() => setToolHistoryOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenCostDrawer={() => setCostDrawerOpen(true)}
          onOpenRename={() => {
            setRenameValue(chat?.name || '');
            setRenameOpen(true);
          }}
        />
      )}

      {/* Unsafe mode warning banner */}
      {chat?.permissionMode === 'dangerous' && !embedded && !unsafeBannerDismissed && (
        <ChatUnsafeBanner
          onDismiss={() => {
            setUnsafeBannerDismissed(true);
            localStorage.setItem('unsafe-banner-dismissed', '1');
          }}
        />
      )}

      {/* Search bar */}
      {searchOpen && messages.length > 0 && (
        <ChatSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          currentMatch={currentMatchIndex}
          totalMatches={searchMatches.length}
          messageTypeFilter={messageTypeFilter}
          onMessageTypeFilterChange={setMessageTypeFilter}
          onNext={() => {
            if (searchMatches.length > 0) {
              setCurrentMatchIndex((prev) => (prev + 1) % searchMatches.length);
            }
          }}
          onPrev={() => {
            if (searchMatches.length > 0) {
              setCurrentMatchIndex(
                (prev) => (prev - 1 + searchMatches.length) % searchMatches.length
              );
            }
          }}
          onClose={() => {
            setSearchOpen(false);
            setSearchQuery('');
            setMessageTypeFilter('all');
          }}
        />
      )}

      {/* Branch selector */}
      {branches.length > 1 && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={currentBranch}
            onChange={(e) => setCurrentBranch(e.target.value)}
            className="rounded border bg-background px-2 py-0.5 text-xs text-foreground"
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground">
            {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
          </span>
        </div>
      )}

      {/* Messages */}
      {renderedMessages.length === 0 ? (
        <ChatWelcomeScreen
          permissionMode={chat?.permissionMode || 'dangerous'}
          model={chat?.model || 'sonnet'}
          onSendPrompt={(prompt) => {
            setInput('');
            sendMutation.mutate(prompt);
          }}
        />
      ) : (
        <MessageList
          ref={messageListRef}
          messages={renderedMessages}
          isRunning={isRunning}
          onRetry={handleRetry}
          onRegenerate={handleRegenerate}
          onEdit={handleEditMessage}
          onBranch={handleBranch}
          autoScroll={settings.autoScrollEnabled}
          pinnedIds={pinnedIds}
          onTogglePin={togglePin}
          searchQuery={searchQuery}
          getMessageReaction={getReaction}
          onToggleMessageReaction={toggleReaction}
          compactMode={settings.compactMode}
          permissionMode={chat?.permissionMode || 'dangerous'}
          onStopChat={() => stopMutation.mutate(undefined)}
        />
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm">
          <div className="rounded-xl border-2 border-dashed border-primary bg-background/90 p-8">
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-12 w-12 text-primary" />
              <span className="text-lg font-medium text-foreground">Drop files here</span>
              <span className="text-sm text-muted-foreground">
                Images, PDFs, documents, code files
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      <ErrorBanner error={error} position="bottom" />

      {/* Rename modal */}
      <ChatRenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        renameValue={renameValue}
        onRenameValueChange={setRenameValue}
        isPending={renameMutation.isPending}
        onSave={(name) => renameMutation.mutate(name)}
      />

      {/* Mode switcher drawer */}
      <ChatModeSwitcherDrawer
        open={modeDrawerOpen}
        onOpenChange={setModeDrawerOpen}
        currentPermissionMode={chat?.permissionMode}
        isPending={modeMutation.isPending}
        onModeChange={(mode) => modeMutation.mutate(mode)}
      />

      {/* Model switcher drawer */}
      <ChatModelSwitcherDrawer
        open={modelDrawerOpen}
        onOpenChange={setModelDrawerOpen}
        currentModel={chat?.model}
        isPending={modelMutation.isPending}
        onModelChange={(model) => modelMutation.mutate(model)}
      />

      {/* System prompt drawer */}
      <ChatSystemPromptDrawer
        open={systemPromptOpen}
        onOpenChange={setSystemPromptOpen}
        systemPromptValue={systemPromptValue}
        onSystemPromptValueChange={setSystemPromptValue}
        hasExistingPrompt={!!chat?.systemPrompt}
        isPending={systemPromptMutation.isPending}
        onSave={(prompt) => systemPromptMutation.mutate(prompt)}
      />

      {/* Max turns drawer */}
      <ChatMaxTurnsDrawer
        open={maxTurnsOpen}
        onOpenChange={setMaxTurnsOpen}
        maxTurnsValue={maxTurnsValue}
        onMaxTurnsValueChange={setMaxTurnsValue}
        hasExistingMaxTurns={!!chat?.maxTurns}
        isPending={maxTurnsMutation.isPending}
        onSave={(maxTurns) => maxTurnsMutation.mutate(maxTurns)}
      />

      {/* Settings drawer */}
      <SettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onToggleSound={toggleSound}
        onToggleHaptic={toggleHaptic}
        onToggleAutoScroll={toggleAutoScroll}
        onExport={() => setExportFormatOpen(true)}
        onSystemPrompt={() => {
          setSystemPromptValue(chat?.systemPrompt || '');
          setSystemPromptOpen(true);
        }}
        onHelp={() => setHelpModalOpen(true)}
        hasSystemPrompt={!!chat?.systemPrompt}
        hasMessages={messages.length > 0}
        workingDirectory={chat?.workingDir ?? VITE_DEVBOT_PROJECTS_DIR}
        hasCopyResumeCommand={!!chat?.claudeSessionId}
        onCopyResumeCommand={
          chat?.claudeSessionId
            ? () => {
                copyToClipboard(
                  `cd ${VITE_DEVBOT_PROJECTS_DIR} && claude --dangerously-skip-permissions --chrome --resume ${chat.claudeSessionId}`
                );
                toast.success('Command copied!');
              }
            : undefined
        }
        isFavorite={chatId ? isFavorite(chatId) : false}
        onToggleFavorite={chatId ? () => toggleFavorite(chatId) : undefined}
        onArchive={
          chatId
            ? () => {
                archiveChatMutation.mutate(chatId);
                navigate(-1);
              }
            : undefined
        }
        onDelete={
          chatId
            ? () => {
                deleteChatMutation.mutate(chatId);
                navigate(-1);
              }
            : undefined
        }
        onMcpServers={() => setMcpServersOpen(true)}
        onHooks={() => setHooksOpen(true)}
        onMemories={() => setMemoriesOpen(true)}
        onClaudeMd={() => setClaudeMdOpen(true)}
        onWorktrees={() => setWorktreesOpen(true)}
        onKeybindings={() => setKeybindingsOpen(true)}
      />

      <McpServersDrawer open={mcpServersOpen} onOpenChange={setMcpServersOpen} />
      <HooksDrawer open={hooksOpen} onOpenChange={setHooksOpen} />
      <MemoryViewerDrawer open={memoriesOpen} onOpenChange={setMemoriesOpen} />
      <ClaudeMdDrawer open={claudeMdOpen} onOpenChange={setClaudeMdOpen} workingDirectory={chat?.workingDir ?? undefined} />
      <WorktreeDrawer open={worktreesOpen} onOpenChange={setWorktreesOpen} workingDirectory={chat?.workingDir ?? undefined} />
      <KeybindingsDrawer open={keybindingsOpen} onOpenChange={setKeybindingsOpen} />
      <SessionCostDrawer open={costDrawerOpen} onOpenChange={setCostDrawerOpen} stats={sessionStats} />

      {/* Pinned messages drawer */}
      <PinnedMessagesDrawer
        open={pinnedMessagesOpen}
        onOpenChange={setPinnedMessagesOpen}
        messages={messages}
        pinnedIds={pinnedIds}
        onTogglePin={togglePin}
        onNavigateToMessage={(messageId) => {
          // Delay scroll to allow drawer close animation to complete
          setTimeout(() => {
            const renderedIdx = renderedMessages.findIndex((m) => m.id === messageId);
            if (renderedIdx >= 0) {
              messageListRef.current?.scrollToMessage(renderedIdx, 'start');
            }
          }, 400);
        }}
      />

      <ToolHistoryDrawer
        open={toolHistoryOpen}
        onOpenChange={setToolHistoryOpen}
        messages={messages}
        onNavigateToMessage={(messageId) => {
          setTimeout(() => {
            const renderedIdx = renderedMessages.findIndex((m) => m.id === messageId);
            if (renderedIdx >= 0) {
              messageListRef.current?.scrollToMessage(renderedIdx, 'start');
            }
          }, 400);
        }}
      />

      {/* Export format picker */}
      <ChatExportDrawer
        open={exportFormatOpen}
        onOpenChange={setExportFormatOpen}
        selectedFormat={selectedExportFormat}
        onExport={(format) => {
          setSelectedExportFormat(format);
          setExportFormatOpen(false);
          exportMutation.mutate(format);
        }}
      />

      {/* Directory browser sidebar */}
      <DirectoryBrowserSidebar
        isOpen={directoryBrowserOpen}
        onClose={() => setDirectoryBrowserOpen(false)}
        onSelectFile={handleSelectFileFromBrowser}
        onOpenFile={handleOpenFileEditor}
        workingDir={chat?.workingDir ?? undefined}
      />

      {/* Help dialog for slash commands */}
      <ChatSlashHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      {/* Clear confirmation dialog */}
      <ChatClearConfirmDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        onConfirm={() => {
          setMessages([]);
          setClearConfirmOpen(false);
        }}
      />

      {/* Edit message dialog */}
      {editingMessage && (
        <EditMessageDialog
          open={editDialogOpen}
          initialText={editingMessage.text}
          onConfirm={handleEditConfirm}
          onCancel={handleEditCancel}
        />
      )}

      {/* Help modal */}
      <HelpModal open={helpModalOpen} onOpenChange={setHelpModalOpen} />

      {/* Inline file editors */}
      {openEditorFiles.length > 0 && (
        <div className="max-h-96 overflow-y-auto border-t border-border px-2">
          {openEditorFiles.map((fp) => (
            <InlineFileEditor
              key={fp}
              filePath={fp}
              workingDir={chat?.workingDir ?? undefined}
              onClose={() => handleCloseFileEditor(fp)}
            />
          ))}
        </div>
      )}

      {/* Input area */}
      <ChatInputArea
        chat={chat}
        sessionStats={sessionStats}
        input={input}
        onInputChange={setInput}
        onCursorChange={setCursorPosition}
        attachedFiles={attachedFiles}
        onSetAttachedFiles={setAttachedFiles}
        isRunning={isRunning}
        sending={sending}
        interrupting={interrupting}
        textareaRef={textareaRef}
        fileInputRef={fileInputRef}
        slashPickerRef={slashPickerRef}
        filePickerRef={filePickerRef}
        slashGroups={slashGroups}
        slashOpen={slashOpen}
        slashFilter={slashFilter}
        fileIntellisenseFiles={fileIntellisenseFiles}
        fileIntellisenseFilter={fileIntellisenseFilter}
        fileIntellisenseOpen={fileIntellisenseOpen}
        fileIntellisenseLoading={fileIntellisenseLoading}
        fileIntellisenseLoadingMore={fileIntellisenseLoadingMore}
        fileIntellisenseHasMore={fileIntellisenseHasMore}
        onLoadMoreFiles={loadMoreFiles}
        onSend={handleSend}
        onStop={handleStop}
        onKeyDown={handleKeyDown}
        onResetNavigation={resetNavigation}
        onFileInputChange={handleFileInputChange}
        onPasteFiles={handleFilesUpload}
        onBrowseFiles={() => setDirectoryBrowserOpen(true)}
        onOpenModeDrawer={() => setModeDrawerOpen(true)}
        onOpenModelDrawer={() => setModelDrawerOpen(true)}
        onOpenMaxTurns={(maxTurns) => {
          setMaxTurnsValue(maxTurns?.toString() || '');
          setMaxTurnsOpen(true);
        }}
        acceptedExtensions={ACCEPTED_EXTENSIONS}
      />
    </div>
  );
}
