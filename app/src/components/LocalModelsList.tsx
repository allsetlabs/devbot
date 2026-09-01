import type { LocalModel } from '../lib/localModelsApi';
import { localModelsApi } from '../lib/localModelsApi';
import { useState } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { Loader2, Trash2, Download } from 'lucide-react';

export function StatusBadge({ running }: { running: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        running
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-red-500/10 text-red-600 dark:text-red-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-green-500' : 'bg-red-500'}`} />
      {running ? 'Connected' : 'Offline'}
    </span>
  );
}

export function ModelCard({
  model,
  onDelete,
  deleting,
}: {
  model: LocalModel;
  onDelete: (name: string) => void;
  deleting: string | null;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{model.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {model.sizeHuman} · {model.parameterSize} · {model.quantization}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => onDelete(model.name)}
        disabled={deleting === model.name}
      >
        {deleting === model.name ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        )}
      </Button>
    </div>
  );
}

export function PullModelInput({
  onPulled,
  pulling,
  setPulling,
}: {
  onPulled: () => void;
  pulling: string | null;
  setPulling: (name: string | null) => void;
}) {
  const [name, setName] = useState('');

  const handlePull = async () => {
    const model = name.trim();
    if (!model) return;
    setPulling(model);
    try {
      await localModelsApi.pullModel(model);
      setName('');
      onPulled();
    } finally {
      setPulling(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder="e.g. qwen3:0.6b"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handlePull()}
        className="flex-1"
      />
      <Button size="sm" onClick={handlePull} disabled={!name.trim() || pulling !== null}>
        {pulling ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="mr-1 h-3.5 w-3.5" />
        )}
        Pull
      </Button>
    </div>
  );
}
