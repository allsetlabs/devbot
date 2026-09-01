import { useState } from 'react';
import type { LocalModel } from '../lib/localModelsApi';
import { localModelsApi } from '../lib/localModelsApi';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';

export function ModelPlayground({ models }: { models: LocalModel[] }) {
  const [selectedModel, setSelectedModel] = useState(models[0]?.name ?? '');
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [response, setResponse] = useState('');
  const [generating, setGenerating] = useState(false);
  const [metrics, setMetrics] = useState<{ tokensPerSecond: number | null; totalDurationMs: number | null } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModel) return;
    setGenerating(true);
    setResponse('');
    setMetrics(null);
    try {
      const result = await localModelsApi.generate({
        model: selectedModel,
        prompt: prompt.trim(),
        system: systemPrompt.trim() || undefined,
        temperature,
      });
      setResponse(result.response);
      setMetrics({ tokensPerSecond: result.metrics.tokensPerSecond, totalDurationMs: result.metrics.totalDurationMs });
    } catch {
      setResponse('Error: generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Model</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
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
          placeholder="You are a helpful assistant..."
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={2}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Temperature: {temperature}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Prompt</label>
        <Textarea
          placeholder="Enter your prompt..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />
      </div>
      <Button onClick={handleGenerate} disabled={!prompt.trim() || generating}>
        {generating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Generate
      </Button>
      {response && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <pre className="whitespace-pre-wrap text-sm">{response}</pre>
          {metrics && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {metrics.tokensPerSecond != null && `${metrics.tokensPerSecond.toFixed(1)} tok/s`}
              {metrics.totalDurationMs != null && ` · ${(metrics.totalDurationMs / 1000).toFixed(1)}s`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
