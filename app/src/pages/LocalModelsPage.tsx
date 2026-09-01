import { useState, useEffect, useCallback } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { HeaderSlot } from '../components/HeaderSlot';
import { localModelsApi } from '../lib/localModelsApi';
import type {
  LocalModel,
  RecommendedModel,
  OllamaStatus,
  GenerateResponse,
  CustomModelDef,
} from '../lib/localModelsApi';
import {
  Cpu,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  Scale,
  Brain,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  Wrench,
  BookOpen,
  Clock,
  Gauge,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ running }: { running: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        running
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-destructive/10 text-destructive'
      }`}
    >
      {running ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {running ? 'Connected' : 'Offline'}
    </span>
  );
}

function CategoryBadge({ category }: { category: RecommendedModel['category'] }) {
  const config = {
    fast: { icon: Zap, label: 'Fast', color: 'text-yellow-600 bg-yellow-500/10 dark:text-yellow-400' },
    balanced: {
      icon: Scale,
      label: 'Balanced',
      color: 'text-blue-600 bg-blue-500/10 dark:text-blue-400',
    },
    capable: {
      icon: Brain,
      label: 'Capable',
      color: 'text-purple-600 bg-purple-500/10 dark:text-purple-400',
    },
  };
  const c = config[category];
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.color}`}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function ModelCard({
  model,
  onDelete,
  deleting,
}: {
  model: LocalModel;
  onDelete: (name: string) => void;
  deleting: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Cpu className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{model.name}</p>
          {model.isCustom && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              CUSTOM
            </span>
          )}
          {model.isSttModel && (
            <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
              STT
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {model.parameterSize} · {model.quantization} · {model.sizeHuman}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(model.name)}
        disabled={deleting === model.name}
        className="shrink-0 text-muted-foreground md:hover:text-destructive"
        title="Delete model"
      >
        {deleting === model.name ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function RecommendedModelCard({
  model,
  onPull,
  pulling,
}: {
  model: RecommendedModel;
  onPull: (name: string) => void;
  pulling: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{model.displayName}</p>
            <CategoryBadge category={model.category} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{model.size}</p>
          <p className="mt-1 text-xs text-muted-foreground">{model.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {model.useCases.map((uc) => (
              <span
                key={uc}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {uc}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          {model.pulled ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pulled
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPull(model.name)}
              disabled={pulling === model.name}
              className="gap-1"
            >
              {pulling === model.name ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {pulling === model.name ? 'Pulling…' : 'Pull'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function InferencePanel({ models }: { models: LocalModel[] }) {
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [system, setSystem] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, selectedModel]);

  const handleGenerate = async () => {
    if (!selectedModel || !prompt.trim()) return;
    setRunning(true);
    setResult(null);
    setError('');
    try {
      const res = await localModelsApi.generate({
        model: selectedModel,
        prompt: prompt.trim(),
        system: showSystem && system.trim() ? system.trim() : undefined,
        temperature,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name} ({m.parameterSize})
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Temp:</span>
          <input
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
            min={0}
            max={2}
            step={0.1}
            aria-label="Temperature"
            className="w-16 rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowSystem(!showSystem)}
        className="flex items-center gap-1 text-xs text-muted-foreground md:hover:text-foreground"
      >
        {showSystem ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        System prompt
      </button>

      {showSystem && (
        <textarea
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          placeholder="Optional system prompt..."
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt..."
        rows={3}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
        }}
      />

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">⌘+Enter to send</p>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={running || !selectedModel || !prompt.trim()}
          className="gap-1.5"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {running ? 'Generating…' : 'Generate'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="whitespace-pre-wrap text-sm text-foreground">{result.response}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            {result.metrics.tokensPerSecond && (
              <span className="flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                {result.metrics.tokensPerSecond} tok/s
              </span>
            )}
            {result.metrics.evalCount && (
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {result.metrics.evalCount} tokens
              </span>
            )}
            {result.metrics.totalDurationMs && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {(result.metrics.totalDurationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateCustomModelPanel({
  models,
  onCreated,
}: {
  models: LocalModel[];
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [baseModel, setBaseModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [inheritDict, setInheritDict] = useState(false);
  const [temperature, setTemperature] = useState<string>('');
  const [maxTokens, setMaxTokens] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (models.length > 0 && !baseModel) {
      setBaseModel(models[0].name);
    }
  }, [models, baseModel]);

  const handleCreate = async () => {
    if (!name.trim() || !baseModel || !systemPrompt.trim()) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const params: Record<string, unknown> = {};
      if (temperature) params.temperature = parseFloat(temperature);
      if (maxTokens) params.num_predict = parseInt(maxTokens, 10);

      await localModelsApi.createCustomModel({
        name: name.trim(),
        baseModel,
        systemPrompt: systemPrompt.trim(),
        parameters: params,
        inheritDictionary: inheritDict,
      });
      setSuccess(`Custom model "${name}" created successfully`);
      setName('');
      setSystemPrompt('');
      setTemperature('');
      setMaxTokens('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create model');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Model name (e.g. my-summarizer)"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">Base model:</span>
        <select
          value={baseModel}
          onChange={(e) => setBaseModel(e.target.value)}
          aria-label="Base model"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        placeholder="System prompt — define the model's behavior..."
        rows={4}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
      />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Temp:</span>
          <input
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="0.7"
            min={0}
            max={2}
            step={0.1}
            aria-label="Temperature"
            className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Max tokens:</span>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            placeholder="256"
            min={1}
            aria-label="Max tokens"
            className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setInheritDict(!inheritDict)}
        className="flex w-full items-center justify-between py-2 text-left"
      >
        <div>
          <span className="text-sm font-medium text-foreground">Inherit STT Dictionary</span>
          <p className="text-xs text-muted-foreground">
            Inject the corrections dictionary into the system prompt
          </p>
        </div>
        <div
          className={`relative h-5 w-9 rounded-full transition-colors ${inheritDict ? 'bg-primary' : 'bg-muted-foreground/30'}`}
        >
          <div
            className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${inheritDict ? 'translate-x-4' : 'translate-x-0'}`}
          />
        </div>
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-green-600 dark:text-green-400">{success}</p>}

      <Button
        size="sm"
        onClick={handleCreate}
        disabled={creating || !name.trim() || !baseModel || !systemPrompt.trim()}
        className="gap-1.5"
      >
        {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {creating ? 'Creating…' : 'Create Model'}
      </Button>
    </div>
  );
}

function CustomModelsList({ customs }: { customs: CustomModelDef[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (customs.length === 0) {
    return (
      <p className="py-2 text-xs text-muted-foreground">
        No custom models. Create one above to define specialized behavior on top of any base model.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {customs.map((c) => (
        <div key={c.name} className="rounded-lg border border-border bg-card">
          <button
            type="button"
            onClick={() => setExpanded(expanded === c.name ? null : c.name)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
              </div>
              <p className="ml-6 text-xs text-muted-foreground">
                Based on {c.baseModel}
                {c.inheritDictionary && ' · dictionary inherited'}
              </p>
            </div>
            {expanded === c.name ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          {expanded === c.name && (
            <div className="border-t border-border px-3 py-2.5">
              <p className="mb-1 text-xs font-medium text-muted-foreground">System prompt</p>
              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs text-foreground">
                {c.systemPrompt}
              </pre>
              {Object.keys(c.parameters).length > 0 && (
                <>
                  <p className="mb-1 mt-2 text-xs font-medium text-muted-foreground">Parameters</p>
                  <p className="text-xs text-foreground">
                    {Object.entries(c.parameters)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </p>
                </>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">
                Created {new Date(c.createdAt).toLocaleDateString()} · Updated{' '}
                {new Date(c.updatedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header (matches SettingsPage style)
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Pull model input
// ---------------------------------------------------------------------------

function PullModelInput({
  onPulled,
  pulling,
  setPulling,
}: {
  onPulled: () => void;
  pulling: string | null;
  setPulling: (name: string | null) => void;
}) {
  const [modelName, setModelName] = useState('');
  const [error, setError] = useState('');

  const handlePull = async () => {
    const name = modelName.trim();
    if (!name) return;
    setPulling(name);
    setError('');
    try {
      await localModelsApi.pullModel(name);
      setModelName('');
      onPulled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pull failed');
    } finally {
      setPulling(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handlePull()}
          placeholder="Model name (e.g. qwen3:0.6b)"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <Button
          size="sm"
          onClick={handlePull}
          disabled={!!pulling || !modelName.trim()}
          className="gap-1.5"
        >
          {pulling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {pulling ? 'Pulling…' : 'Pull'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function LocalModelsPage() {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [models, setModels] = useState<LocalModel[]>([]);
  const [recommended, setRecommended] = useState<RecommendedModel[]>([]);
  const [customs, setCustoms] = useState<CustomModelDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'models' | 'inference' | 'custom'>('models');

  const loadData = useCallback(async () => {
    try {
      const [statusRes, modelsRes, recommendedRes, customsRes] = await Promise.all([
        localModelsApi.getStatus(),
        localModelsApi.listModels(),
        localModelsApi.getRecommended(),
        localModelsApi.listCustomModels(),
      ]);
      setStatus(statusRes);
      setModels(modelsRes.models);
      setRecommended(recommendedRes.recommended);
      setCustoms(customsRes.customModels);
    } catch {
      // API may not be available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePull = async (name: string) => {
    setPulling(name);
    try {
      await localModelsApi.pullModel(name);
      await loadData();
    } catch {
      // Silently fail — user can see pull status
    } finally {
      setPulling(null);
    }
  };

  const handleDelete = async (name: string) => {
    setDeleting(name);
    try {
      await localModelsApi.deleteModel(name);
      await loadData();
    } catch {
      // Silently fail
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabs = [
    { key: 'models' as const, label: 'Models' },
    { key: 'inference' as const, label: 'Playground' },
    { key: 'custom' as const, label: 'Custom' },
  ];

  return (
    <div className="safe-area-bottom flex h-full flex-col">
      <HeaderSlot>
        <Button variant="ghost" size="sm" onClick={loadData} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </HeaderSlot>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="mx-auto max-w-2xl">
          {/* Connection status */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Ollama</span>
              <StatusBadge running={status?.running ?? false} />
            </div>
            {status && (
              <span className="text-xs text-muted-foreground">
                {status.modelCount} model{status.modelCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {!status?.running && (
            <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm text-foreground">Ollama is not running.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start Ollama with{' '}
                <code className="rounded bg-muted px-1.5 py-0.5">ollama serve</code> or install it
                from{' '}
                <a
                  href="https://ollama.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary md:hover:underline"
                >
                  ollama.com
                </a>
              </p>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground md:hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Models tab */}
          {activeTab === 'models' && (
            <>
              <SectionHeader title="Pull a Model" />
              <PullModelInput
                onPulled={loadData}
                pulling={pulling}
                setPulling={setPulling}
              />

              <SectionHeader title={`Installed (${models.length})`} />
              {models.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">
                  No models installed. Pull one from the recommended list below or enter a model
                  name above.
                </p>
              ) : (
                <div className="space-y-2">
                  {models.map((m) => (
                    <ModelCard
                      key={m.name}
                      model={m}
                      onDelete={handleDelete}
                      deleting={deleting}
                    />
                  ))}
                </div>
              )}

              <SectionHeader title="Recommended" />
              <div className="space-y-2">
                {recommended.map((r) => (
                  <RecommendedModelCard
                    key={r.name}
                    model={r}
                    onPull={handlePull}
                    pulling={pulling}
                  />
                ))}
              </div>
            </>
          )}

          {/* Inference tab */}
          {activeTab === 'inference' && (
            <>
              <SectionHeader title="Test Inference" />
              {models.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">
                  Pull a model first to test inference.
                </p>
              ) : (
                <InferencePanel models={models} />
              )}
            </>
          )}

          {/* Custom tab */}
          {activeTab === 'custom' && (
            <>
              <SectionHeader title="Create Custom Model" />
              {models.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">
                  Pull a base model first before creating custom models.
                </p>
              ) : (
                <CreateCustomModelPanel models={models} onCreated={loadData} />
              )}

              <SectionHeader title={`Custom Models (${customs.length})`} />
              <CustomModelsList customs={customs} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
