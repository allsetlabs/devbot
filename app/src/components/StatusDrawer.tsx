import { Activity, Brain, Cpu, DollarSign, FolderOpen, Wrench, Zap } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { MODEL_CONFIG } from '../lib/model-config';
import { MODE_CONFIG } from '../lib/mode-config';
import type { ClaudeModel, PermissionMode } from '../types';

interface StatusDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: ClaudeModel | undefined;
  permissionMode: PermissionMode | undefined;
  totalTokens: number;
  contextLimit: number;
  totalCost: number;
  workingDir: string | null | undefined;
  allowedTools: string[] | null | undefined;
  fastMode: boolean | undefined;
  effort: string | null | undefined;
}

const EFFORT_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra High',
};

function StatusRow({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 text-sm text-muted-foreground">{label}</span>
      <span className={`flex-shrink-0 text-sm font-medium ${valueClass ?? 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

export function StatusDrawer({
  open,
  onOpenChange,
  model,
  permissionMode,
  totalTokens,
  contextLimit,
  totalCost,
  workingDir,
  allowedTools,
  fastMode,
  effort,
}: StatusDrawerProps) {
  const modelInfo = model ? MODEL_CONFIG[model] : null;
  const modeInfo = permissionMode ? MODE_CONFIG[permissionMode] : null;
  const usagePct = contextLimit > 0 ? Math.round((totalTokens / contextLimit) * 100) : 0;
  const toolLabel =
    allowedTools && allowedTools.length > 0 ? `${allowedTools.length} tools` : 'All tools';
  const effortLabel = effort ? (EFFORT_LABELS[effort] ?? effort) : 'High (default)';
  const dir = workingDir ? workingDir.replace(/^\/Users\/[^/]+/, '~') : '—';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Session Status
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6">
          <div className="divide-y divide-border/50">
            <StatusRow
              icon={Cpu}
              label="Model"
              value={modelInfo?.label ?? model ?? '—'}
              valueClass={modelInfo?.color}
            />
            <StatusRow
              icon={Zap}
              label="Permission mode"
              value={modeInfo?.shortLabel ?? permissionMode ?? '—'}
              valueClass={modeInfo?.color}
            />
            <StatusRow
              icon={Activity}
              label="Context usage"
              value={`${totalTokens.toLocaleString()} / ${(contextLimit / 1000).toFixed(0)}k (${usagePct}%)`}
            />
            <StatusRow
              icon={DollarSign}
              label="Session cost"
              value={totalCost > 0 ? `$${totalCost.toFixed(4)}` : '$0.0000'}
            />
            <StatusRow icon={FolderOpen} label="Working directory" value={dir} />
            <StatusRow icon={Wrench} label="Active tools" value={toolLabel} />
            <StatusRow
              icon={Zap}
              label="Fast mode"
              value={fastMode ? 'On' : 'Off'}
              valueClass={fastMode ? 'text-warning' : undefined}
            />
            <StatusRow icon={Brain} label="Effort level" value={effortLabel} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
