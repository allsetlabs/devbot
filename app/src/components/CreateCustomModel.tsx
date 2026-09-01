import { useState } from 'react';
import type { LocalModel, CustomModelDef } from '../lib/localModelsApi';
import { localModelsApi } from '../lib/localModelsApi';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export function CreateCustomModelPanel({
  models,
  onCreated,
}: {
  models: LocalModel[];
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [baseModel, setBaseModel] = useState(models[0]?.name ?? '');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [inheritDictionary, setInheritDictionary] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !baseModel) return;
    setCreating(true);
    try {
      await localModelsApi.createCustomModel({
        name: name.trim(),
        baseModel,
        systemPrompt: systemPrompt.trim(),
        inheritDictionary,
      });
      setName('');
      setSystemPrompt('');
      onCreated();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-card p-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Model Name</label>
        <Input placeholder="my-custom-model" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Base Model</label>
        <select
          value={baseModel}
          onChange={(e) => setBaseModel(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          {models.map((m) => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">System Prompt</label>
        <Textarea
          placeholder="Custom system instructions..."
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={3}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={inheritDictionary}
          onChange={(e) => setInheritDictionary(e.target.checked)}
          className="rounded"
        />
        Inherit STT corrections dictionary
      </label>
      <Button onClick={handleCreate} disabled={!name.trim() || creating} size="sm">
        {creating && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        Create Model
      </Button>
    </div>
  );
}

export function CustomModelsList({ customs }: { customs: CustomModelDef[] }) {
  if (customs.length === 0) {
    return <p className="py-3 text-xs text-muted-foreground">No custom models created yet.</p>;
  }

  return (
    <div className="space-y-2">
      {customs.map((m) => (
        <div key={m.name} className="rounded-lg border border-border/50 bg-card p-3">
          <p className="text-sm font-medium">{m.name}</p>
          <p className="text-[11px] text-muted-foreground">
            Base: {m.baseModel} · Dict: {m.inheritDictionary ? 'Yes' : 'No'}
          </p>
          {m.systemPrompt && (
            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{m.systemPrompt}</p>
          )}
        </div>
      ))}
    </div>
  );
}
