import { Eye, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { MODE_CONFIG } from '../lib/mode-config';
import type { PermissionMode } from '../types';

interface ChatModeSwitcherDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPermissionMode: PermissionMode | undefined;
  isPending: boolean;
  onModeChange: (mode: PermissionMode) => void;
}

export function ChatModeSwitcherDrawer({
  open,
  onOpenChange,
  currentPermissionMode,
  isPending,
  onModeChange,
}: ChatModeSwitcherDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Change Permission Mode</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          {(Object.entries(MODE_CONFIG) as [PermissionMode, typeof MODE_CONFIG.plan][]).map(
            ([mode, config]) => {
              const isCurrentMode = currentPermissionMode === mode;
              // Cannot escalate to dangerous from plan/auto-accept
              const isDisabled = mode === 'dangerous' && currentPermissionMode !== 'dangerous';

              return (
                <Button
                  key={mode}
                  variant="ghost"
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${config.borderColor} ${isCurrentMode ? `${config.bgColor} ring-2 ring-offset-1 ring-offset-background` : ''} ${isDisabled ? 'cursor-not-allowed opacity-40' : 'active:bg-muted/50'}`}
                  onClick={() => {
                    if (!isDisabled && !isCurrentMode) {
                      onModeChange(mode);
                    }
                  }}
                  disabled={isDisabled || isCurrentMode || isPending}
                >
                  <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
                    {mode === 'plan' && <Eye className="h-5 w-5" />}
                    {mode === 'auto-accept' && <CheckCircle className="h-5 w-5" />}
                    {mode === 'dangerous' && <Zap className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
                      {isCurrentMode && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{config.description}</p>
                    {isDisabled && (
                      <p className="mt-1 text-[10px] text-destructive">
                        Cannot escalate to Full Auto from{' '}
                        {currentPermissionMode === 'plan' ? 'Plan' : 'Auto-Accept'}
                      </p>
                    )}
                  </div>
                </Button>
              );
            }
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
