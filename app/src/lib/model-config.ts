import type { ClaudeModel } from '../types';

export interface ModelInfo {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  /** Maximum context window size in tokens */
  contextLimit: number;
  /** Price per million input tokens (USD) */
  inputPrice: number;
  /** Price per million output tokens (USD) */
  outputPrice: number;
}

export const MODEL_CONFIG: Record<ClaudeModel, ModelInfo> = {
  opus: {
    label: 'Claude Opus',
    shortLabel: 'Opus',
    description: 'Most capable model. Best for complex reasoning and difficult tasks.',
    color: 'text-accent-foreground',
    bgColor: 'bg-accent',
    borderColor: 'border-accent',
    contextLimit: 200_000,
    inputPrice: 15,
    outputPrice: 75,
  },
  sonnet: {
    label: 'Claude Sonnet',
    shortLabel: 'Sonnet',
    description: 'Balanced performance and speed. Great for most tasks.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    contextLimit: 200_000,
    inputPrice: 3,
    outputPrice: 15,
  },
  haiku: {
    label: 'Claude Haiku',
    shortLabel: 'Haiku',
    description: 'Fastest and most cost-effective. Good for simple tasks.',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    contextLimit: 200_000,
    inputPrice: 0.8,
    outputPrice: 4,
  },
};
