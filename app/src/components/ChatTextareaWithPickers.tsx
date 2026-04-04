import { Loader2, Send, Square, Plus } from 'lucide-react';
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
  onResetNavigation: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onStop: () => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  onResetNavigation,
  onKeyDown,
  onSend,
  onStop,
  onFileInputChange,
  acceptedExtensions,
}: ChatTextareaWithPickersProps) {
  const readyFiles = attachedFiles.filter((f) => !f.uploading && f.path);
  const anyUploading = attachedFiles.some((f) => f.uploading);
  const isTouchDevice = navigator.maxTouchPoints > 0;

  return (
    <>
      <div className="relative">
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
          open={fileIntellisenseOpen}
          loading={fileIntellisenseLoading}
          loadingMore={fileIntellisenseLoadingMore}
          hasMore={fileIntellisenseHasMore}
          onLoadMore={onLoadMoreFiles}
          onSelect={(item) => {
            const beforeAt = input.substring(0, input.lastIndexOf('@'));
            onInputChange(beforeAt + '@' + item.path + ' ');
            textareaRef.current?.focus();
            if (!attachedFiles.some((f) => f.path === item.path)) {
              onSetAttachedFiles((prev) => [
                ...prev,
                { id: item.id, name: item.name, path: item.path, uploading: false },
              ]);
            }
          }}
          onClose={() => {
            const beforeAt = input.substring(0, input.lastIndexOf('@'));
            onInputChange(beforeAt);
          }}
        />
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            onInputChange(e.target.value);
            onResetNavigation();
            const el = e.target;
            el.style.height = 'auto';
            const maxH = window.innerHeight * 0.4;
            el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
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
          className={`w-full resize-none border-input bg-background pr-12 ${isRunning ? 'pb-28' : 'pb-20'}`}
          style={{ maxHeight: '40vh', overflow: 'auto' }}
        />
        {/* Buttons inside textarea — right side, top to bottom: stop, send, + */}
        <div className="absolute bottom-2 right-2 flex flex-col items-center gap-1">
          {isRunning && (
            <Button
              onClick={onStop}
              disabled={interrupting}
              size="icon"
              className="h-8 w-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Square className="h-4 w-4" />
            </Button>
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
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={anyUploading}
          >
            <Plus className="h-5 w-5" />
          </Button>
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
