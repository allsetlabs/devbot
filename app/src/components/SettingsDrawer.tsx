import {
  Settings,
  Share2,
  ScrollText,
  HelpCircle,
  Terminal,
  Archive,
  Trash2,
  Star,
  Brain,
  FileText,
  Coins,
  Eye,
  EyeOff,
  FolderRoot,
  Pencil,
  Pin,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
} from '@allsetlabs/forge/components/ui/drawer';
import { Button } from '@allsetlabs/forge/components/ui/button';

interface ChatSessionSettingsActionsProps {
  hideToolResults: boolean;
  toolResultCount: number;
  onToggleToolResults: () => void;
  pinnedCount: number;
  onOpenPinnedMessages: () => void;
  hasTokenUsage: boolean;
  onOpenCostDrawer: () => void;
  workingDirectory?: string | null;
  onOpenWorkingDirectory: () => void;
  onRename: () => void;
}

function ChatSessionSettingsActions({
  hideToolResults,
  toolResultCount,
  onToggleToolResults,
  pinnedCount,
  onOpenPinnedMessages,
  hasTokenUsage,
  onOpenCostDrawer,
  workingDirectory,
  onOpenWorkingDirectory,
  onRename,
}: ChatSessionSettingsActionsProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Chat controls
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="justify-start gap-2"
          onClick={onToggleToolResults}
        >
          {hideToolResults ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {hideToolResults ? 'Show tools' : 'Hide tools'}
          {hideToolResults && toolResultCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{toolResultCount}</span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="justify-start gap-2"
          onClick={onOpenPinnedMessages}
          disabled={pinnedCount === 0}
        >
          <Pin className="h-4 w-4" />
          Pinned
          {pinnedCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{pinnedCount}</span>
          )}
        </Button>
        {hasTokenUsage && (
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            onClick={onOpenCostDrawer}
          >
            <Coins className="h-4 w-4" />
            Session cost
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="justify-start gap-2"
          onClick={onOpenWorkingDirectory}
          title={workingDirectory ? `Working dir: ${workingDirectory}` : 'Set working directory'}
        >
          <FolderRoot className="h-4 w-4" />
          Working dir
        </Button>
        <Button variant="outline" size="sm" className="justify-start gap-2" onClick={onRename}>
          <Pencil className="h-4 w-4" />
          Rename chat
        </Button>
      </div>
    </div>
  );
}

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport?: () => void;
  onSystemPrompt?: () => void;
  onHelp?: () => void;
  hasSystemPrompt?: boolean;
  hasMessages?: boolean;
  onCopyResumeCommand?: () => void;
  hasCopyResumeCommand?: boolean;
  onArchive?: () => void;
  onDelete?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onMemories?: () => void;
  onClaudeMd?: () => void;
  chatActions?: ChatSessionSettingsActionsProps;
}

export function SettingsDrawer({
  open,
  onOpenChange,
  onExport,
  onSystemPrompt,
  onHelp,
  hasSystemPrompt = false,
  hasMessages = false,
  onCopyResumeCommand,
  hasCopyResumeCommand = false,
  onArchive,
  onDelete,
  isFavorite = false,
  onToggleFavorite,
  onMemories,
  onClaudeMd,
  chatActions,
}: SettingsDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DrawerTitle>
        </DrawerHeader>
        <DrawerBody className="space-y-4 px-4 pb-6">
          {/* Quick actions */}
          <div className="flex gap-2">
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => {
                  onOpenChange(false);
                  onExport();
                }}
                disabled={!hasMessages}
              >
                <Share2 className="h-4 w-4" />
                Export Chat
              </Button>
            )}
            {onSystemPrompt && (
              <Button
                variant="outline"
                size="sm"
                className="relative flex-1 gap-2"
                onClick={() => {
                  onOpenChange(false);
                  onSystemPrompt();
                }}
              >
                <ScrollText className="h-4 w-4" />
                System Prompt
                {hasSystemPrompt && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            )}
            {onHelp && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => {
                  onOpenChange(false);
                  onHelp();
                }}
              >
                <HelpCircle className="h-4 w-4" />
                Help
              </Button>
            )}
          </div>

          {chatActions && <ChatSessionSettingsActions {...chatActions} />}

          {/* Memories & CLAUDE.md */}
          {(onMemories || onClaudeMd) && (
            <div className="flex flex-wrap gap-2">
              {onMemories && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(() => onMemories(), 300);
                  }}
                >
                  <Brain className="h-4 w-4" />
                  Memories
                </Button>
              )}
              {onClaudeMd && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(() => onClaudeMd(), 300);
                  }}
                >
                  <FileText className="h-4 w-4" />
                  CLAUDE.md
                </Button>
              )}
            </div>
          )}

          {/* Session Actions */}
          {(hasCopyResumeCommand || onToggleFavorite || onArchive || onDelete) && (
            <div className="flex flex-wrap gap-2">
              {hasCopyResumeCommand && onCopyResumeCommand && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => {
                    onCopyResumeCommand();
                    onOpenChange(false);
                  }}
                >
                  <Terminal className="h-4 w-4" />
                  Copy Resume
                </Button>
              )}
              {onToggleFavorite && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => {
                    onToggleFavorite();
                  }}
                >
                  <Star className={`h-4 w-4 ${isFavorite ? 'fill-warning text-warning' : ''}`} />
                  {isFavorite ? 'Unfavorite' : 'Favorite'}
                </Button>
              )}
              {onArchive && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    onArchive();
                  }}
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 text-destructive hover:text-destructive"
                  onClick={() => {
                    onOpenChange(false);
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          )}

        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
