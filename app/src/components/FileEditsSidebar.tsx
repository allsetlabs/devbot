import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Pencil, Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import type { FileEdit } from '../hooks/useFileEdits';
import { useTemporaryStatus } from '../hooks/useTemporaryStatus';

interface FileEditsSidebarProps {
  fileEdits: FileEdit[];
  onScrollToEdit: (messageIndex: number) => void;
}

const TOOL_ICONS = {
  Edit: Pencil,
  MultiEdit: Copy,
  Write: Plus,
  Delete: Trash2,
};

const TOOL_COLORS = {
  Edit: 'text-primary',
  MultiEdit: 'text-warning',
  Write: 'text-success',
  Delete: 'text-destructive',
};

export function FileEditsSidebar({ fileEdits, onScrollToEdit }: FileEditsSidebarProps) {
  const [open, setOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { status: copyStatus, show: showStatus } = useTemporaryStatus(2000);

  const handleCopyPath = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(filePath);
    showStatus('Path copied!');
  };

  const handleScrollToEdit = (messageIndex: number) => {
    onScrollToEdit(messageIndex);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="relative"
          title="View file edits"
        >
          <FileText className="h-5 w-5" />
          {fileEdits.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-background">
              {fileEdits.length}
            </span>
          )}
        </Button>
        {copyStatus && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background">
            {copyStatus}
          </div>
        )}
      </div>

      {/* Drawer */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>File Edits ({fileEdits.length})</DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 pb-6">
            {fileEdits.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No files edited yet</p>
            ) : (
              <div className="space-y-2">
                {fileEdits.map((edit, index) => {
                  const Icon = TOOL_ICONS[edit.toolName];
                  const iconColor = TOOL_COLORS[edit.toolName];
                  const isExpanded = expandedIndex === index;

                  return (
                    <div key={`${edit.filePath}-${edit.messageIndex}`}>
                      {/* File item header */}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setExpandedIndex(isExpanded ? null : index);
                        }}
                        className="flex w-full items-start gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                      >
                        {/* Chevron */}
                        <div className="mt-0.5 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>

                        {/* Icon */}
                        <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconColor}`} />

                        {/* File info */}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono text-xs leading-tight text-foreground">
                            {edit.filePath}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{edit.toolName}</span>
                            {edit.lineCount > 0 && <span>·</span>}
                            {edit.lineCount > 0 && (
                              <span>
                                {edit.lineCount} line{edit.lineCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </Button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              onClick={() => handleScrollToEdit(edit.messageIndex)}
                            >
                              View in Chat
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={(e) => handleCopyPath(edit.filePath, e)}
                              title="Copy file path"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            <div>Operation: {edit.toolName}</div>
                            <div>
                              Time:{' '}
                              {new Date(edit.timestamp).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
