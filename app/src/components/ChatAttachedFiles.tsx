import { Loader2, FileText, X } from 'lucide-react';
import { Button } from '@subbiah/reusable/components/ui/button';
import type { AttachedFile } from './ChatInputArea';

interface ChatAttachedFilesProps {
  attachedFiles: AttachedFile[];
  onSetAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
}

export function ChatAttachedFiles({ attachedFiles, onSetAttachedFiles }: ChatAttachedFilesProps) {
  if (attachedFiles.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachedFiles.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5"
        >
          <FileText className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
          <span className="max-w-[140px] truncate text-xs text-foreground">{file.name}</span>
          {file.uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-destructive/10"
              onClick={() => onSetAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
