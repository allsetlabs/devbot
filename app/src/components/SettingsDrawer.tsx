import { Settings, Share2, ScrollText, HelpCircle } from 'lucide-react';
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

          {/* Sound Notifications */}
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
