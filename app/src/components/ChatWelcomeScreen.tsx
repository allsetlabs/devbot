import {
  Eye,
  CheckCircle,
  Zap,
  Sparkles,
  Cpu,
  Rabbit,
  Code,
  Bug,
  TestTube,
  BookOpen,
  Wrench,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { MODE_CONFIG } from '../lib/mode-config';
import { MODEL_CONFIG } from '../lib/model-config';
import type { PermissionMode, ClaudeModel } from '../types';

const MODE_ICONS: Record<PermissionMode, React.ComponentType<{ className?: string }>> = {
  plan: Eye,
  'auto-accept': CheckCircle,
  dangerous: Zap,
};

const MODEL_ICONS: Record<ClaudeModel, React.ComponentType<{ className?: string }>> = {
  opus: Sparkles,
  sonnet: Cpu,
  haiku: Rabbit,
};

interface SuggestedPrompt {
  label: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    label: 'Review recent changes',
    prompt: 'Review the recent code changes and suggest improvements',
    icon: Code,
  },
  {
    label: 'Find & fix bugs',
    prompt: 'Find potential bugs in the codebase and suggest fixes',
    icon: Bug,
  },
  {
    label: 'Write tests',
    prompt: 'Write tests for the recently changed files',
    icon: TestTube,
  },
  {
    label: 'Explain this code',
    prompt: 'Explain how the codebase is structured and how it works',
    icon: BookOpen,
  },
  {
    label: 'Refactor code',
    prompt: 'Identify code that could be refactored for better maintainability',
    icon: Wrench,
  },
  {
    label: 'Plan a feature',
    prompt: 'Help me plan and implement a new feature',
    icon: Lightbulb,
  },
];

interface ChatWelcomeScreenProps {
  permissionMode: PermissionMode;
  model: ClaudeModel;
  onSendPrompt: (prompt: string) => void;
}

export function ChatWelcomeScreen({ permissionMode, model, onSendPrompt }: ChatWelcomeScreenProps) {
  const modeConfig = MODE_CONFIG[permissionMode];
  const modelConfig = MODEL_CONFIG[model];
  const ModeIcon = MODE_ICONS[permissionMode];
  const ModelIcon = MODEL_ICONS[model];

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8">
      {/* Welcome header */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Welcome to Claude Code</h2>
        <p className="text-center text-xs text-muted-foreground">What would you like to work on?</p>
      </div>

      {/* Session info badges */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${modeConfig.bgColor} ${modeConfig.borderColor}`}
        >
          <ModeIcon className={`h-3.5 w-3.5 ${modeConfig.color}`} />
          <span className={`text-xs font-medium ${modeConfig.color}`}>{modeConfig.shortLabel}</span>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${modelConfig.bgColor} ${modelConfig.borderColor}`}
        >
          <ModelIcon className={`h-3.5 w-3.5 ${modelConfig.color}`} />
          <span className={`text-xs font-medium ${modelConfig.color}`}>
            {modelConfig.shortLabel}
          </span>
        </div>
      </div>

      {/* Suggested prompts grid */}
      <div className="grid w-full max-w-md grid-cols-2 gap-2">
        {SUGGESTED_PROMPTS.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.label}
              variant="outline"
              className="flex items-start gap-2.5 rounded-lg border border-border bg-background p-3 text-left transition-colors active:bg-muted/50"
              onClick={() => onSendPrompt(item.prompt)}
            >
              <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-xs leading-snug text-foreground">{item.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Mode description */}
      <p className="max-w-sm text-center text-[11px] text-muted-foreground">
        {modeConfig.description}
      </p>
    </main>
  );
}
