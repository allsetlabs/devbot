import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  HelpCircle,
  Keyboard,
  Zap,
  Settings,
  Search,
  FileText,
  Share2,
  Copy,
  ArrowLeft,
} from 'lucide-react';
import {
  KEYBOARD_SHORTCUTS,
  SLASH_COMMANDS,
  INPUT_FEATURES,
  PERMISSION_MODES,
  STATUS_BAR_ITEMS,
} from '../lib/help-modal-data';

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: () => void;
}

export function HelpModal({ open, onOpenChange, onBack }: HelpModalProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => {
                  onOpenChange(false);
                  onBack();
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DrawerTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Help
            </DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto px-4 pb-6">
          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Keyboard className="h-4 w-4" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map((shortcut, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">{shortcut.description}</span>
                  <code className="rounded bg-background px-2 py-1 font-mono text-xs font-medium text-foreground">
                    {shortcut.keys}
                  </code>
                </div>
              ))}
            </div>
          </section>

          {/* Slash Commands */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Zap className="h-4 w-4" />
              Slash Commands
            </h3>
            <div className="space-y-2">
              {SLASH_COMMANDS.map((cmd, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">{cmd.description}</span>
                  <code className="rounded bg-background px-2 py-1 font-mono text-xs font-medium text-foreground">
                    {cmd.command}
                  </code>
                </div>
              ))}
            </div>
          </section>

          {/* Input Features */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4" />
              Input Features
            </h3>
            <div className="space-y-2">
              {INPUT_FEATURES.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">{feature.description}</span>
                  <code className="rounded bg-background px-2 py-1 font-mono text-xs font-medium text-foreground">
                    {feature.feature}
                  </code>
                </div>
              ))}
            </div>
          </section>

          {/* Permission Modes */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Settings className="h-4 w-4" />
              Permission Modes
            </h3>
            <div className="space-y-2">
              {PERMISSION_MODES.map((mode, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-card/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-background px-2 py-1 font-mono text-xs font-medium text-foreground">
                      {mode.mode}
                    </code>
                    <span className="text-xs text-muted-foreground">{mode.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Chat Features */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Search className="h-4 w-4" />
              Chat Features
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                <span>Copy messages with clipboard icon on each message</span>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span>Search with filters (All, User, Assistant, Tool)</span>
              </div>
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                <span>Export chat as markdown via Share button</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Configure mode, model, max turns, system prompt per chat</span>
              </div>
            </div>
          </section>

          {/* Status Bar */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4" />
              Status Bar
            </h3>
            <div className="space-y-2">
              {STATUS_BAR_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                  <code className="rounded bg-background px-2 py-1 font-mono text-xs font-medium text-foreground">
                    {item.key}
                  </code>
                </div>
              ))}
            </div>
          </section>

          {/* Tips */}
          <section className="rounded-lg border border-border/50 bg-card/30 px-3 py-3">
            <h4 className="mb-2 text-xs font-semibold text-foreground">Tips</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>Type while Claude is running to interrupt and send a new message</li>
              <li>Use @ to attach files and / for commands with autocomplete</li>
              <li>View token usage, cost, and context window below the input bar</li>
              <li>Click mode/model badges to change mid-session</li>
            </ul>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
