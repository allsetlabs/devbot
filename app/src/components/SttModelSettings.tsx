import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@allsetlabs/forge/components/ui/button';
import {
  sttGetModel,
  sttInstallModel,
  sttSelectModel,
  type SttModelId,
  type SttModelSettingsResponse,
} from '../lib/api';

const OPTIONS: Array<{ value: SttModelId; label: string; detail: string }> = [
  { value: 'tiny', label: 'Whisper Tiny', detail: 'Fastest, English and multilingual (default)' },
  { value: 'small.en', label: 'Whisper Small English', detail: 'Higher English accuracy' },
  { value: 'small', label: 'Whisper Small Multilingual', detail: 'Includes Tamil support' },
];

export function SttModelSettings() {
  const queryClient = useQueryClient();
  const modelQuery = useQuery({ queryKey: ['stt-model'], queryFn: sttGetModel, staleTime: 30_000 });
  const selectMutation = useMutation({
    mutationFn: sttSelectModel,
    onSuccess: (settings) => queryClient.setQueryData<SttModelSettingsResponse>(['stt-model'], settings),
  });
  const installMutation = useMutation({
    mutationFn: sttInstallModel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stt-model'] }),
  });

  const selected = modelQuery.data?.selected;
  const installed = new Set(
    modelQuery.data?.models.filter((model) => model.installed).map((model) => model.id) ?? []
  );

  const select = (model: SttModelId) => {
    selectMutation.mutate(model);
  };

  const option = OPTIONS.find((item) => item.value === selected);
  const isInstalled = selected ? installed.has(selected) : false;
  const error = modelQuery.isError || selectMutation.isError || installMutation.isError;

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="stt-model" className="text-sm font-medium text-foreground">
          Speech-to-text model
        </label>
        <select
          id="stt-model"
          value={selected ?? ''}
          onChange={(event) => select(event.target.value as SttModelId)}
          disabled={!selected || selectMutation.isPending}
          className="max-w-56 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          {!selected && <option value="">Loading…</option>}
          {OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{option?.detail}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {isInstalled ? 'Runtime installed' : 'Installation required'}
        </span>
        {selected && !isInstalled && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => installMutation.mutate(selected)}
            disabled={installMutation.isPending}
          >
            {installMutation.isPending ? 'Installing…' : 'Install model'}
          </Button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive">
          Unable to update the STT model. Check backend logs for details.
        </p>
      )}
    </div>
  );
}
