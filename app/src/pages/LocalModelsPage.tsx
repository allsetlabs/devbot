import { useState, useEffect, useCallback } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { HeaderSlot } from '../components/HeaderSlot';
import { localModelsApi } from '../lib/localModelsApi';
import type { LocalModel, RecommendedModel, OllamaStatus, CustomModelDef } from '../lib/localModelsApi';
import { StatusBadge, ModelCard, PullModelInput } from '../components/LocalModelsList';
import { RecommendedModelCard } from '../components/RecommendedModels';
import { ModelPlayground } from '../components/ModelPlayground';
import { CreateCustomModelPanel, CustomModelsList } from '../components/CreateCustomModel';
import { Cpu, RefreshCw, Loader2 } from 'lucide-react';

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h2>
  );
}

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

  useEffect(() => { loadData(); }, [loadData]);

  const handlePull = async (name: string) => {
    setPulling(name);
    try {
      await localModelsApi.pullModel(name);
      await loadData();
    } catch {
      // Silently fail
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
                Start with <code className="rounded bg-muted px-1.5 py-0.5">ollama serve</code> or
                install from{' '}
                <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-primary md:hover:underline">ollama.com</a>
              </p>
            </div>
          )}

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

          {activeTab === 'models' && (
            <>
              <SectionHeader title="Pull a Model" />
              <PullModelInput onPulled={loadData} pulling={pulling} setPulling={setPulling} />
              <SectionHeader title={`Installed (${models.length})`} />
              {models.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">No models installed. Pull one below or enter a name above.</p>
              ) : (
                <div className="space-y-2">
                  {models.map((m) => <ModelCard key={m.name} model={m} onDelete={handleDelete} deleting={deleting} />)}
                </div>
              )}
              <SectionHeader title="Recommended" />
              <div className="space-y-2">
                {recommended.map((r) => <RecommendedModelCard key={r.name} model={r} onPull={handlePull} pulling={pulling} />)}
              </div>
            </>
          )}

          {activeTab === 'inference' && (
            <>
              <SectionHeader title="Test Inference" />
              {models.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">Pull a model first to test inference.</p>
              ) : (
                <ModelPlayground models={models} />
              )}
            </>
          )}

          {activeTab === 'custom' && (
            <>
              <SectionHeader title="Create Custom Model" />
              {models.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">Pull a base model first.</p>
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
