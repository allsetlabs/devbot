import type { RecommendedModel } from '../lib/localModelsApi';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Loader2, Download, Zap, Scale, Brain } from 'lucide-react';

function CategoryBadge({ category }: { category: RecommendedModel['category'] }) {
  const config: Record<RecommendedModel['category'], { icon: typeof Zap; label: string; color: string }> = {
    fast: { icon: Zap, label: 'Fast', color: 'text-yellow-600 bg-yellow-500/10 dark:text-yellow-400' },
    balanced: { icon: Scale, label: 'Balanced', color: 'text-blue-600 bg-blue-500/10 dark:text-blue-400' },
    capable: { icon: Brain, label: 'Capable', color: 'text-purple-600 bg-purple-500/10 dark:text-purple-400' },
  };
  const cfg = config[category];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export function RecommendedModelCard({
  model,
  onPull,
  pulling,
}: {
  model: RecommendedModel;
  onPull: (name: string) => void;
  pulling: string | null;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{model.displayName}</p>
          <CategoryBadge category={model.category} />
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{model.description}</p>
        <p className="text-[10px] text-muted-foreground/60">{model.size}</p>
      </div>
      {model.pulled ? (
        <span className="shrink-0 text-[11px] text-green-600 dark:text-green-400">Installed</span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => onPull(model.name)}
          disabled={pulling !== null}
        >
          {pulling === model.name ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Download className="mr-1 h-3 w-3" />
          )}
          Pull
        </Button>
      )}
    </div>
  );
}
