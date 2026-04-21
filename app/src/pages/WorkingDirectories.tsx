import { useState } from 'react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Trash2, Plus, X, FolderOpen, Shield, AlertTriangle } from 'lucide-react';
import {
  useWorkingDirectories,
  useCreateWorkingDirectory,
  useDeleteWorkingDirectory,
} from '../hooks/useWorkingDirectories';
import { useNav } from '../hooks/useNav';

export function WorkingDirectories() {
  const { openNav } = useNav();
  const [addOpen, setAddOpen] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [error, setError] = useState('');

  const { data: dirs = [], isLoading } = useWorkingDirectories();
  const createMutation = useCreateWorkingDirectory();
  const deleteMutation = useDeleteWorkingDirectory();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = newPath.trim();
    if (!trimmed) return;

    try {
      await createMutation.mutateAsync({ path: trimmed });
      setNewPath('');
      setAddOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add directory');
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={openNav} className="lg:hidden">
            <span className="sr-only">Menu</span>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Working Directories</h1>
          </div>
        </div>
        <Button variant="default" size="sm" onClick={() => { setAddOpen(true); setError(''); setNewPath(''); }}>
          <Plus className="mr-1 h-4 w-4" />
          Add Directory
        </Button>
      </header>

      {/* Add directory modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="safe-area-bottom w-full max-w-lg rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Add Working Directory</h2>
              <Button variant="ghost" size="icon" onClick={() => setAddOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {error && (
              <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Directory Path
                </label>
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="/path/to/your/project"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter an absolute path to a directory on this machine
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="flex-1" disabled={createMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || !newPath.trim()}>
                  {createMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Directory list */}
      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : dirs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">No working directories</div>
        ) : (
          <div className="divide-y divide-border">
            {dirs.map((dir) => (
              <div key={dir.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{dir.path}</span>
                    {dir.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <Shield className="h-3 w-3" />
                        Default
                      </span>
                    )}
                    {dir.isRootDirectory && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                        <AlertTriangle className="h-3 w-3" />
                        Root
                      </span>
                    )}
                  </div>
                  {dir.label && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{dir.label}</p>
                  )}
                </div>
                {!dir.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(dir.id)}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
