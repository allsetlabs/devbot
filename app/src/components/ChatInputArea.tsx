import {
  type SlashCommandPickerHandle,
  type SlashCommandGroup,
} from '@allsetlabs/reusable/components/ui/slash-command-picker';
import {
  type FileIntellisensePickerHandle,
  type FileIntellisenseItem,
} from '@allsetlabs/reusable/components/ui/file-intellisense-picker';
import { ChatInputToolbar } from './ChatInputToolbar';
import { ChatAttachedFiles } from './ChatAttachedFiles';
import { ChatTextareaWithPickers } from './ChatTextareaWithPickers';
import type { InteractiveChat } from '../types';

export interface AttachedFile {
  id: string;
  name: string;
  path: string;
  uploading: boolean;
}

interface SessionStats {
  totalTokens: number;
  totalCost: number;
  totalDuration: number;
  turnCount: number;
}

interface ChatInputAreaProps {
  chat: InteractiveChat | undefined;
  sessionStats: SessionStats;
  input: string;
  onInputChange: (value: string) => void;
  onCursorChange?: (position: number) => void;
  attachedFiles: AttachedFile[];
  onSetAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  isRunning: boolean;
  sending: boolean;
  interrupting: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  slashPickerRef: React.RefObject<SlashCommandPickerHandle | null>;
  filePickerRef: React.RefObject<FileIntellisensePickerHandle | null>;
  slashGroups: SlashCommandGroup[];
  slashOpen: boolean;
  slashFilter: string;
  fileIntellisenseFiles: FileIntellisenseItem[];
  fileIntellisenseFilter: string;
  fileIntellisenseOpen: boolean;
  fileIntellisenseLoading: boolean;
  fileIntellisenseLoadingMore: boolean;
  fileIntellisenseHasMore: boolean;
  onLoadMoreFiles: () => void;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onResetNavigation: () => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasteFiles?: (files: File[]) => void;
  onBrowseFiles?: () => void;
  onOpenModeDrawer: () => void;
  onOpenModelDrawer: () => void;
  onOpenMaxTurns: (currentMaxTurns?: number | null) => void;
  acceptedExtensions: string;
}

export function ChatInputArea({
  chat,
  sessionStats,
  input,
  onInputChange,
  onCursorChange,
  attachedFiles,
  onSetAttachedFiles,
  isRunning,
  sending,
  interrupting,
  textareaRef,
  fileInputRef,
  slashPickerRef,
  filePickerRef,
  slashGroups,
  slashOpen,
  slashFilter,
  fileIntellisenseFiles,
  fileIntellisenseFilter,
  fileIntellisenseOpen,
  fileIntellisenseLoading,
  fileIntellisenseLoadingMore,
  fileIntellisenseHasMore,
  onLoadMoreFiles,
  onSend,
  onStop,
  onKeyDown,
  onResetNavigation,
  onFileInputChange,
  onPasteFiles,
  onBrowseFiles,
  onOpenModeDrawer,
  onOpenModelDrawer,
  onOpenMaxTurns,
  acceptedExtensions,
}: ChatInputAreaProps) {
  return (
    <div className="flex flex-col gap-2 border-t border-border bg-background px-4 py-3">
      {/* Attached file chips */}
      <ChatAttachedFiles attachedFiles={attachedFiles} onSetAttachedFiles={onSetAttachedFiles} />

      {/* Textarea with pickers and action buttons */}
      <ChatTextareaWithPickers
        input={input}
        isRunning={isRunning}
        sending={sending}
        interrupting={interrupting}
        attachedFiles={attachedFiles}
        onSetAttachedFiles={onSetAttachedFiles}
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
        onLoadMoreFiles={onLoadMoreFiles}
        onInputChange={onInputChange}
        onCursorChange={onCursorChange}
        onResetNavigation={onResetNavigation}
        onKeyDown={onKeyDown}
        onSend={onSend}
        onStop={onStop}
        onFileInputChange={onFileInputChange}
        onPasteFiles={onPasteFiles}
        onBrowseFiles={onBrowseFiles}
        acceptedExtensions={acceptedExtensions}
      />

      {/* Mode & Model selectors + stats */}
      <ChatInputToolbar
        chat={chat}
        sessionStats={sessionStats}
        input={input}
        onOpenModeDrawer={onOpenModeDrawer}
        onOpenModelDrawer={onOpenModelDrawer}
        onOpenMaxTurns={onOpenMaxTurns}
      />
    </div>
  );
}
