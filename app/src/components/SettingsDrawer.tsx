import { Settings, Share2, ScrollText, HelpCircle, Terminal, Archive, Trash2, Star, Server } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { Checkbox } from '@allsetlabs/reusable/components/ui/checkbox';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import type { DevBotSettings } from '../hooks/useSettings';

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DevBotSettings;
  onToggleSound: () => void;
  onToggleHaptic: () => void;
  onToggleAutoScroll: () => void;
  onExport?: () => void;
  onSystemPrompt?: () => void;
  onHelp?: () => void;
  hasSystemPrompt?: boolean;
  hasMessages?: boolean;
  workingDirectory?: string;
  onCopyResumeCommand?: () => void;
  hasCopyResumeCommand?: boolean;
  onArchive?: () => void;
  onDelete?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onMcpServers?: () => void;
}

export function SettingsDrawer({
  open,
  onOpenChange,
  settings,
  onToggleSound,
  onToggleHaptic,
  onToggleAutoScroll,
  onExport,
  onSystemPrompt,
  onHelp,
  hasSystemPrompt = false,
  hasMessages = false,
  workingDirectory,
  onCopyResumeCommand,
  hasCopyResumeCommand = false,
  onArchive,
  onDelete,
  isFavorite = false,
  onToggleFavorite,
  onMcpServers,
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
        <div className="space-y-4 px-4 pb-6">
          {/* Quick Actions */}
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

          {/* MCP Servers */}
          {onMcpServers && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                onOpenChange(false);
                setTimeout(() => onMcpServers(), 300);
              }}
            >
              <Server className="h-4 w-4" />
              MCP Servers
            </Button>
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

          {/* Sound Notifications */}
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3">
            <Checkbox
              checked={settings.soundEnabled}
              onCheckedChange={onToggleSound}
              aria-label="Toggle sound notifications"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Sound Notifications</span>
              <span className="text-xs text-muted-foreground">Play sound when tasks complete</span>
            </div>
          </label>

          {/* Haptic Feedback */}
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3">
            <Checkbox
              checked={settings.hapticEnabled}
              onCheckedChange={onToggleHaptic}
              aria-label="Toggle haptic feedback"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Haptic Feedback</span>
              <span className="text-xs text-muted-foreground">
                Vibrate device when tasks complete
              </span>
            </div>
          </label>

          {/* Auto-scroll */}
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3">
            <Checkbox
              checked={settings.autoScrollEnabled}
              onCheckedChange={onToggleAutoScroll}
              aria-label="Toggle auto-scroll"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Auto-scroll to Latest</span>
              <span className="text-xs text-muted-foreground">
                Automatically scroll to new messages
              </span>
            </div>
          </label>

          {/* Working directory */}
          {workingDirectory && (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <span className="text-xs text-muted-foreground">Working directory</span>
              <p className="mt-0.5 truncate font-mono text-xs text-foreground">
                {workingDirectory}
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
