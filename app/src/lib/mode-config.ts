import type { PermissionMode } from '../types';

export interface ModeInfo {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const MODE_CONFIG: Record<PermissionMode, ModeInfo> = {
  plan: {
    label: 'Plan Mode',
    shortLabel: 'Plan',
    description: 'Read-only. Claude analyzes and suggests but makes no changes.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
  'auto-accept': {
    label: 'Auto-Accept',
    shortLabel: 'Auto',
    description: 'Claude can read and write files with standard caution.',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
  },
  dangerous: {
    label: 'Full Auto',
    shortLabel: 'Full',
    description: 'Claude runs autonomously with all permissions. No guardrails.',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
  },
};
