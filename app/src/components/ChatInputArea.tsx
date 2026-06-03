import {
  type SlashCommandPickerHandle,
  type SlashCommandGroup,
} from '@allsetlabs/reusable/components/ui/slash-command-picker';
import {
  type FileIntellisensePickerHandle,
  type FileIntellisenseItem,
} from '@allsetlabs/reusable/components/ui/file-intellisense-picker';
import { RotateCcw, Clock, X, ArrowUp } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { ChatInputToolbar } from './ChatInputToolbar';
import { ChatAttachedFiles } from './ChatAttachedFiles';
import { ChatTextareaWithPickers } from './ChatTextareaWithPickers';
import type { InteractiveChat, QueuedMessage } from '../types';

export interface AttachedFile {
  id: string;
  name: string;
  path: string;
  uploading: boolean;
}

interface ChatInputAreaProps {
  chat: InteractiveChat | undefined;
  input: string;
  showDraftRestored?: boolean;
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
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onResetNavigation: () => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasteFiles?: (files: File[]) => void;
  onBrowseFiles?: () => void;
  onOpenModeDrawer: () => void;
  onOpenModelDrawer: () => void;
  onOpenEffort: () => void;
  onOpenAllowedTools: () => void;
  onOpenMaxTurns?: (currentMaxTurns: number | null) => void;
  onQueue?: () => void;
  onOcrText?: (text: string) => void;
  queuedMessages?: QueuedMessage[];
  onRemoveQueued?: (queueId: string) => void;
  onSendAllQueued?: () => void;
  acceptedExtensions: string;
}

export function ChatInputArea({
  chat,
  input,
  showDraftRestored,
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
  isPaused,
  onPause,
  onResume,
  onKeyDown,
  onResetNavigation,
  onFileInputChange,
  onPasteFiles,
  onBrowseFiles,
  onOpenModeDrawer,
  onOpenModelDrawer,
  onOpenEffort,
  onOpenAllowedTools,
  onOpenMaxTurns,
  onQueue,
  onOcrText,
  queuedMessages,
  onRemoveQueued,
  onSendAllQueued,
  acceptedExtensions,
}: ChatInputAreaProps) {
  return (
    <div className="flex flex-col gap-2 border-t border-border bg-background px-4 py-3">
      {/* Attached file chips */}
      <ChatAttachedFiles attachedFiles={attachedFiles} onSetAttachedFiles={onSetAttachedFiles} />

      {/* Draft restored indicator */}
      {showDraftRestored && (
        <div className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
          <RotateCcw className="h-3 w-3" />
          <span>Draft restored</span>
        </div>
      )}

      {/* Queued messages */}
      {queuedMessages && queuedMessages.length > 0 && (
        <div className="group flex flex-col gap-1">
          {/* Send all queued — icon-only with tooltip */}
          <div className="flex items-center justify-end">
            {onSendAllQueued && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground transition-opacity hover:text-primary opacity-100 md:opacity-0 md:group-hover:opacity-100"
                onClick={onSendAllQueued}
                title={`Send ${queuedMessages.length} queued message${queuedMessages.length !== 1 ? 's' : ''} immediately`}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {queuedMessages.map((qm) => (
            <div
              key={qm.id}
              className="group/chip flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-1.5 text-xs"
            >
              <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-secondary-foreground">
                {qm.prompt}
              </span>
              {onRemoveQueued && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveQueued(qm.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

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
        isPaused={isPaused}
        onPause={onPause}
        onResume={onResume}
        onFileInputChange={onFileInputChange}
        onPasteFiles={onPasteFiles}
        onBrowseFiles={onBrowseFiles}
        onQueue={onQueue}
        onOcrText={onOcrText}
        acceptedExtensions={acceptedExtensions}
      />

      {/* Mode & Model selectors */}
      <ChatInputToolbar
        chat={chat}
        input={input}
        onOpenModeDrawer={onOpenModeDrawer}
        onOpenModelDrawer={onOpenModelDrawer}
        onOpenEffort={onOpenEffort}
        onOpenAllowedTools={onOpenAllowedTools}
        onOpenMaxTurns={onOpenMaxTurns}
      />
    </div>
  );
}
