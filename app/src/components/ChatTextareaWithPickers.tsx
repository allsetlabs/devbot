import { Loader2, Send, Square, Plus, FolderOpen, Pause, Play } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Textarea } from '@allsetlabs/reusable/components/ui/textarea';
import {
  SlashCommandPicker,
  type SlashCommandPickerHandle,
  type SlashCommandGroup,
} from '@allsetlabs/reusable/components/ui/slash-command-picker';
import {
  FileIntellisensePicker,
  type FileIntellisensePickerHandle,
  type FileIntellisenseItem,
} from '@allsetlabs/reusable/components/ui/file-intellisense-picker';
import type { AttachedFile } from './ChatInputArea';

interface ChatTextareaWithPickersProps {
  input: string;
  isRunning: boolean;
  sending: boolean;
  interrupting: boolean;
  attachedFiles: AttachedFile[];
  onSetAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
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
  onInputChange: (value: string) => void;
  onCursorChange?: (position: number) => void;
  onResetNavigation: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onStop: () => void;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasteFiles?: (files: File[]) => void;
  onBrowseFiles?: () => void;
  acceptedExtensions: string;
}

export function ChatTextareaWithPickers({
  input,
  isRunning,
  sending,
  interrupting,
  attachedFiles,
  onSetAttachedFiles,
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
  onInputChange,
  onCursorChange,
  onResetNavigation,
  onKeyDown,
  onSend,
  onStop,
  isPaused,
  onPause,
  onResume,
  onFileInputChange,
  onPasteFiles,
  onBrowseFiles,
  acceptedExtensions,
}: ChatTextareaWithPickersProps) {
  const readyFiles = attachedFiles.filter((f) => !f.uploading && f.path);
  const anyUploading = attachedFiles.some((f) => f.uploading);
  const isTouchDevice = navigator.maxTouchPoints > 0;

  return (
    <>
      <div className="flex items-end gap-2">
        {/* Textarea with pickers and action buttons inside */}
        <div className="relative min-w-0 flex-1">
          <SlashCommandPicker
            ref={slashPickerRef}
            groups={slashGroups}
            filter={slashFilter}
            open={slashOpen}
            onSelect={(item) => {
              onInputChange(item.id + ' ');
              textareaRef.current?.focus();
            }}
            onClose={() => onInputChange('')}
          />
          <FileIntellisensePicker
            ref={filePickerRef}
            items={fileIntellisenseFiles}
            filter={fileIntellisenseFilter}
            open={fileIntellisenseOpen && !fileIntellisenseLoading && fileIntellisenseFiles.length > 0}
            loading={fileIntellisenseLoading}
            loadingMore={fileIntellisenseLoadingMore}
            hasMore={fileIntellisenseHasMore}
            onLoadMore={onLoadMoreFiles}
            onSelect={(item) => {
              const cursorPos = textareaRef.current?.selectionStart ?? input.length;
              const textToCursor = input.substring(0, cursorPos);
              const atIndex = textToCursor.lastIndexOf('@');
              if (atIndex === -1) return;
              const beforeAt = input.substring(0, atIndex);
              const afterCursor = input.substring(cursorPos);
              const insertion = '@' + item.path + ' ';
              const newValue = beforeAt + insertion + afterCursor;
              const newCursorPos = beforeAt.length + insertion.length;
              onInputChange(newValue);
              onCursorChange?.(newCursorPos);
              requestAnimationFrame(() => {
                if (textareaRef.current) {
                  textareaRef.current.selectionStart = newCursorPos;
                  textareaRef.current.selectionEnd = newCursorPos;
                  textareaRef.current.focus();
                }
              });
              if (!attachedFiles.some((f) => f.path === item.path)) {
                onSetAttachedFiles((prev) => [
                  ...prev,
                  { id: item.id, name: item.name, path: item.path, uploading: false },
                ]);
              }
            }}
            onClose={() => {
              const cursorPos = textareaRef.current?.selectionStart ?? input.length;
              const textToCursor = input.substring(0, cursorPos);
              const atIndex = textToCursor.lastIndexOf('@');
              if (atIndex === -1) return;
              const beforeAt = input.substring(0, atIndex);
              const afterCursor = input.substring(cursorPos);
              onInputChange(beforeAt + afterCursor);
              onCursorChange?.(beforeAt.length);
            }}
          />
          {/* Bordered container: text on top, buttons pinned below — no overlap possible */}
          <div className="flex flex-col overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                onInputChange(e.target.value);
                onCursorChange?.(e.target.selectionStart ?? e.target.value.length);
                onResetNavigation();
                const el = e.target;
                el.style.height = 'auto';
                const maxH = window.innerHeight * 0.4 - 52;
                el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
              }}
              onKeyUp={(e) => onCursorChange?.(e.currentTarget.selectionStart ?? 0)}
              onClick={(e) => onCursorChange?.(e.currentTarget.selectionStart ?? 0)}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items || !onPasteFiles) return;
                const files: File[] = [];
                for (const item of items) {
                  if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) files.push(file);
                  }
                }
                if (files.length > 0) {
                  e.preventDefault();
                  onPasteFiles(files);
                }
              }}
              onKeyDown={onKeyDown}
              placeholder={
                isRunning
                  ? 'Type to interrupt & send...'
                  : isTouchDevice
                    ? 'Type a message...'
                    : 'Type a message... (⏎ send, ⌘⇧K clear, ⌘⏎ send)'
              }
              rows={2}
              className="w-full resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:outline-none"
              style={{ overflow: 'auto' }}
            />
            {/* Button row — always below text, never overlaps */}
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              {/* Left: attach + browse */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={anyUploading}
                  title="Attach file"
                >
                  <Plus className="h-5 w-5" />
                </Button>
                {onBrowseFiles && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onBrowseFiles}
                    title="Browse & edit files"
                  >
                    <FolderOpen className="h-5 w-5" />
                  </Button>
                )}
              </div>
              {/* Right: pause/stop/send */}
              <div className="flex items-center gap-1">
                {isRunning && (
                  <>
                    <Button
                      onClick={isPaused ? onResume : onPause}
                      disabled={interrupting}
                      size="icon"
                      className={`h-8 w-8 ${isPaused ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-warning text-warning-foreground hover:bg-warning/90'}`}
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={onStop}
                      disabled={interrupting}
                      size="icon"
                      className="h-8 w-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  onClick={onSend}
                  disabled={
                    (!input.trim() && readyFiles.length === 0) || sending || anyUploading || interrupting
                  }
                  size="icon"
                  className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                >
                  {sending || interrupting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedExtensions}
        onChange={onFileInputChange}
        className="hidden"
        multiple
      />
    </>
  );
}
