import { Sparkles, Cpu, Rabbit, Coins } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@subbiah/reusable/components/ui/drawer';
import { MODEL_CONFIG } from '../lib/model-config';
import { formatModelPricing } from '../lib/format';
import type { ClaudeModel } from '../types';

interface ChatModelSwitcherDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentModel: ClaudeModel | undefined;
  isPending: boolean;
  onModelChange: (model: ClaudeModel) => void;
}

export function ChatModelSwitcherDrawer({
  open,
  onOpenChange,
  currentModel,
  isPending,
  onModelChange,
}: ChatModelSwitcherDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Change Model</DrawerTitle>
          <p className="mt-2 text-xs text-muted-foreground">
            Choose a model based on capability and cost. Pricing shown per million tokens
            (input/output).
          </p>
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          {(Object.entries(MODEL_CONFIG) as [ClaudeModel, typeof MODEL_CONFIG.opus][]).map(
            ([model, config]) => {
              const isCurrentModel = currentModel === model;

              return (
                <button
                  key={model}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${config.borderColor} ${isCurrentModel ? `${config.bgColor} ring-2 ring-offset-1 ring-offset-background` : 'active:bg-muted/50'}`}
                  onClick={() => {
                    if (!isCurrentModel) {
                      onModelChange(model);
                    }
                  }}
                  disabled={isCurrentModel || isPending}
                >
                  <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
                    {model === 'opus' && <Sparkles className="h-5 w-5" />}
                    {model === 'sonnet' && <Cpu className="h-5 w-5" />}
                    {model === 'haiku' && <Rabbit className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
                      {isCurrentModel && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{config.description}</p>
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Coins className="h-3 w-3" />
                      {formatModelPricing(config.inputPrice, config.outputPrice)}
                    </p>
                  </div>
                </button>
              );
            }
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
