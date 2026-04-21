import { useState, useEffect, useCallback } from 'react';
import { GitBranch, Plus, Trash2, AlertCircle, FolderTree } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Input } from '@allsetlabs/reusable/components/ui/input';
import { Checkbox } from '@allsetlabs/reusable/components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { api } from '../lib/api';

interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
  isBare: boolean;
  isMain: boolean;
}

interface WorktreeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workingDirectory?: string;
}

export function WorktreeDrawer({ open, onOpenChange, workingDirectory }: WorktreeDrawerProps) {
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [isNewBranch, setIsNewBranch] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchWorktrees = useCallback(async () => {
    if (!workingDirectory) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listWorktrees(workingDirectory);
      if (!data.isGitRepo) {
        setError('Not a git repository');
        setWorktrees([]);
      } else {
        setWorktrees(data.worktrees);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load worktrees');
    } finally {
      setLoading(false);
    }
  }, [workingDirectory]);

  useEffect(() => {
    if (open) {
      fetchWorktrees();
    }
  }, [open, fetchWorktrees]);

  const handleAdd = async () => {
    if (!newPath.trim() || !newBranch.trim() || !workingDirectory) return;
    setAdding(true);
    setError(null);
    try {
      await api.createWorktree(workingDirectory, newPath.trim(), newBranch.trim(), isNewBranch);
      setNewPath('');
      setNewBranch('');
      setIsNewBranch(true);
      setShowAddForm(false);
      await fetchWorktrees();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create worktree');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (wtPath: string) => {
    if (!workingDirectory) return;
    setError(null);
    try {
      await api.removeWorktree(workingDirectory, wtPath);
      await fetchWorktrees();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove worktree');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Git Worktrees
          </DrawerTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage isolated working directories for parallel development
          </p>
        </DrawerHeader>
        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!workingDirectory ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No working directory set for this chat
            </p>
          ) : loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : worktrees.length === 0 && !showAddForm ? (
            <div className="py-6 text-center">
              <FolderTree className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No worktrees found</p>
            </div>
          ) : (
            worktrees.map((wt) => (
              <div
                key={wt.path}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <GitBranch className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{wt.branch || '(detached)'}</p>
                    {wt.isMain && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        main
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {wt.path}
                  </p>
                  {wt.head && (
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      HEAD: {wt.head}
                    </p>
                  )}
                </div>
                {!wt.isMain && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 flex-shrink-0 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(wt.path)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}

          {showAddForm && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Input
                placeholder="Worktree path (e.g. ../my-feature)"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder={isNewBranch ? 'New branch name' : 'Existing branch name'}
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                className="h-8 text-sm"
              />
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={isNewBranch}
                  onCheckedChange={(checked) => setIsNewBranch(checked === true)}
                />
                <span className="text-xs text-muted-foreground">Create new branch</span>
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAdd}
                  disabled={adding || !newPath.trim() || !newBranch.trim()}
                >
                  {adding ? 'Creating...' : 'Create Worktree'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {workingDirectory && !showAddForm && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4" />
              Add Worktree
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
