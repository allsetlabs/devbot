import { Sparkles, Cpu, Rabbit } from 'lucide-react';
import { MODEL_CONFIG } from '../lib/model-config';
import type { ClaudeModel } from '../types';

interface ModelPickerProps {
  value: ClaudeModel;
  onChange: (model: ClaudeModel) => void;
}

const MODEL_ICONS: Record<ClaudeModel, React.ReactNode> = {
  opus: <Sparkles className="h-3.5 w-3.5" />,
  sonnet: <Cpu className="h-3.5 w-3.5" />,
  haiku: <Rabbit className="h-3.5 w-3.5" />,
};

export function ModelPicker({ value, onChange }: ModelPickerProps) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-foreground">Model</span>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Model selection">
        {(Object.keys(MODEL_CONFIG) as ClaudeModel[]).map((model) => {
          const config = MODEL_CONFIG[model];
          const isSelected = value === model;

          return (
            <button
              key={model}
              type="button"
              onClick={() => onChange(model)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                isSelected
                  ? `${config.borderColor} ${config.bgColor} ${config.color}`
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              {MODEL_ICONS[model]}
              {config.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
