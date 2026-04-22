import {
  Brain,
  Cpu,
  Sparkles,
  Rabbit,
  Eye,
  CheckCircle,
  Zap,
  Wrench,
  Repeat2,
} from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { MODE_CONFIG } from '../lib/mode-config';
import { MODEL_CONFIG } from '../lib/model-config';
import { estimateTokens } from '../lib/format';
import type { InteractiveChat } from '../types';

interface ChatInputToolbarProps {
  chat: InteractiveChat | undefined;
  input: string;
  onOpenModeDrawer: () => void;
  onOpenModelDrawer: () => void;
  onOpenEffort: () => void;
  onOpenAllowedTools: () => void;
  onOpenMaxTurns?: (currentMaxTurns: number | null) => void;
}

export function ChatInputToolbar({
  chat,
  input,
  onOpenModeDrawer,
  onOpenModelDrawer,
  onOpenEffort,
  onOpenAllowedTools,
  onOpenMaxTurns,
}: ChatInputToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Model selector — icon only */}
        {chat?.model && (
          <Button
            variant="outline"
            size="icon"
            className={`h-6 w-6 flex-shrink-0 rounded-md border transition-colors active:opacity-70 ${MODEL_CONFIG[chat.model].bgColor} ${MODEL_CONFIG[chat.model].color} ${MODEL_CONFIG[chat.model].borderColor}`}
            onClick={onOpenModelDrawer}
            title={MODEL_CONFIG[chat.model].shortLabel}
          >
            {chat.model === 'opus' && <Sparkles className="h-3 w-3" />}
            {chat.model === 'sonnet' && <Cpu className="h-3 w-3" />}
            {chat.model === 'haiku' && <Rabbit className="h-3 w-3" />}
          </Button>
        )}
        {/* Mode selector — icon only */}
        {chat?.permissionMode && (
          <Button
            variant="outline"
            size="icon"
            className={`h-6 w-6 flex-shrink-0 rounded-md border transition-colors active:opacity-70 ${MODE_CONFIG[chat.permissionMode].bgColor} ${MODE_CONFIG[chat.permissionMode].color} ${MODE_CONFIG[chat.permissionMode].borderColor}`}
            onClick={onOpenModeDrawer}
            title={MODE_CONFIG[chat.permissionMode].shortLabel}
          >
            {chat.permissionMode === 'plan' && <Eye className="h-3 w-3" />}
            {chat.permissionMode === 'auto-accept' && <CheckCircle className="h-3 w-3" />}
            {chat.permissionMode === 'dangerous' && <Zap className="h-3 w-3" />}
          </Button>
        )}
        {/* Effort selector — icon only */}
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6 flex-shrink-0 rounded-md border border-border text-muted-foreground transition-colors active:opacity-70"
          onClick={onOpenEffort}
          title={chat?.effort ? chat.effort.charAt(0).toUpperCase() + chat.effort.slice(1) : 'High'}
        >
          <Brain className="h-3 w-3" />
        </Button>
        {/* Allowed tools — wrench icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground transition-colors hover:text-foreground active:opacity-70"
          onClick={onOpenAllowedTools}
          title="Allowed Tools"
        >
          <Wrench className="h-3.5 w-3.5" />
        </Button>
        {/* Max turns — repeat icon */}
        {onOpenMaxTurns && (
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 transition-colors active:opacity-70 ${chat?.maxTurns ? 'text-primary hover:text-primary/80' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onOpenMaxTurns(chat?.maxTurns ?? null)}
            title={chat?.maxTurns ? `Max turns: ${chat.maxTurns}` : 'Max Turns (unlimited)'}
          >
            <Repeat2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {input.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {input.length >= 1000 ? `${(input.length / 1000).toFixed(1)}k` : input.length}c/
            {estimateTokens(input) >= 1000
              ? `${(estimateTokens(input) / 1000).toFixed(1)}k`
              : estimateTokens(input)}
            t
          </span>
        )}
      </div>
    </div>
  );
}
