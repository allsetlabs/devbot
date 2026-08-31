import { useState } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import {
  Database,
  ChevronLeft,
  Plus,
  Trash2,
  X,
  Search,
  FileJson,
  HardDrive,
} from 'lucide-react';
import { useFileStores, useFileStore, useCreateRecord, useDeleteRecord } from '../hooks/useFileStores';
import { HeaderSlot } from '../components/HeaderSlot';
import type { FileStoreInfo } from '../types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Card for each file store on the overview screen. */
function StoreCard({ store, onSelect }: { store: FileStoreInfo; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors md:hover:bg-accent/50"
    >
      <div className="mb-2 flex items-center gap-2">
        <FileJson className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-foreground">{store.name}</span>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Records</span>
          <span className="font-medium text-foreground">{store.recordCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Size</span>
          <span>{formatBytes(store.fileSize)}</span>
        </div>
        <div className="flex justify-between">
          <span>Modified</span>
          <span>{formatDate(store.lastModified)}</span>
        </div>
      </div>
      {store.autoCommit && (
        <span className="mt-2 inline-block rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
          Auto-commit
        </span>
      )}
    </button>
  );
}

/** Detail view for a single file store — browse, search, add, delete records. */
function StoreDetail({ name, onBack }: { name: string; onBack: () => void }) {
  const { data, isLoading } = useFileStore(name);
  const createMutation = useCreateRecord(name);
  const deleteMutation = useDeleteRecord(name);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newJson, setNewJson] = useState('{\n  \n}');
  const [error, setError] = useState('');

  const records = data?.records ?? [];
  const filtered = search
    ? records.filter((r) =>
        Object.values(r).some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(search.toLowerCase())
        )
      )
    : records;

  // Identify display-worthy fields (skip standard columns)
  const standardFields = new Set([
    'id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'settings',
  ]);
  const dataFields = records.length > 0
    ? Object.keys(records[0]).filter((k) => !standardFields.has(k))
    : [];

  const handleCreate = async () => {
    setError('');
    try {
      const parsed = JSON.parse(newJson);
      await createMutation.mutateAsync(parsed);
      setAddOpen(false);
      setNewJson('{\n  \n}');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  return (
    <div className="safe-area-bottom flex h-full flex-col">
      <HeaderSlot>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Stores
        </Button>
        <Button variant="default" size="sm" onClick={() => { setAddOpen(true); setError(''); }}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </HeaderSlot>

      {/* Search bar */}
      <div className="border-b border-border px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${name}…`}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {data && (
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{data.recordCount} records</span>
            <span>·</span>
            <span>{formatBytes(data.fileSize)}</span>
            <span>·</span>
            <span className="truncate">{data.filePath}</span>
          </div>
        )}
      </div>

      {/* Add record modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="safe-area-bottom w-full max-w-lg rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Add Record</h2>
              <Button variant="ghost" size="icon" onClick={() => setAddOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {error && (
              <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <textarea
              value={newJson}
              onChange={(e) => setNewJson(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder='{ "title": "Example" }'
            />
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              Enter JSON fields. id, timestamps, and settings are auto-generated.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1" disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleCreate} className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Record list */}
      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Database className="h-8 w-8" />
            <span>{search ? 'No matching records' : 'No records yet'}</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((record) => (
              <div key={record.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Show data fields as the primary content */}
                    {dataFields.length > 0 ? (
                      <div className="space-y-0.5">
                        {dataFields.slice(0, 3).map((field) => {
                          const val = record[field];
                          const display = Array.isArray(val) ? val.join(', ') : String(val ?? '');
                          return (
                            <div key={field} className="flex items-baseline gap-2">
                              <span className="shrink-0 text-xs text-muted-foreground">{field}:</span>
                              <span className="truncate text-sm text-foreground">{display || '—'}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-foreground">{record.id}</span>
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {record.id} · {formatDate(record.created_at)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(record.id)}
                    className="shrink-0 text-muted-foreground md:hover:text-destructive"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export function FileStoresPage() {
  const { data: stores = [], isLoading } = useFileStores();
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  if (selectedStore) {
    return <StoreDetail name={selectedStore} onBack={() => setSelectedStore(null)} />;
  }

  return (
    <div className="safe-area-bottom flex h-full flex-col">
      <main className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading…</div>
        ) : stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <HardDrive className="h-10 w-10" />
            <span>No file stores registered</span>
            <p className="max-w-sm text-center text-xs">
              File stores are JSON-file-backed collections that plugins can use instead of SQLite.
              Register one in the backend to see it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <StoreCard
                key={store.name}
                store={store}
                onSelect={() => setSelectedStore(store.name)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
