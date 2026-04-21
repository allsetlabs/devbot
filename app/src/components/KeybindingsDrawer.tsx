import { useState, useEffect, useCallback } from 'react';
import { Keyboard, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Input } from '@allsetlabs/reusable/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { api } from '../lib/api';

interface Keybinding {
  key: string;
  command: string;
  when?: string;
}

interface KeybindingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeybindingsDrawer({ open, onOpenChange }: KeybindingsDrawerProps) {
  const [keybindings, setKeybindings] = useState<Keybinding[]>([]);
  const [configPath, setConfigPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newWhen, setNewWhen] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchKeybindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listKeybindings();
      setKeybindings(data.keybindings);
      setConfigPath(data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load keybindings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchKeybindings();
  }, [open, fetchKeybindings]);

  const handleAdd = async () => {
    if (!newKey.trim() || !newCommand.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await api.addKeybinding(newKey.trim(), newCommand.trim(), newWhen.trim() || undefined);
      setNewKey('');
      setNewCommand('');
      setNewWhen('');
      setShowAddForm(false);
      await fetchKeybindings();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add keybinding');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (index: number) => {
    setError(null);
    try {
      await api.deleteKeybinding(index);
      await fetchKeybindings();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete keybinding');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DrawerTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            View and customize keybindings for Claude Code
          </p>
        </DrawerHeader>
        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : keybindings.length === 0 && !showAddForm ? (
            <div className="py-6 text-center">
              <Keyboard className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No custom keybindings</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add keybindings to customize keyboard shortcuts
              </p>
            </div>
          ) : (
            keybindings.map((kb, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <Keyboard className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {kb.key}
                    </kbd>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {kb.command}
                    </span>
                  </div>
                  {kb.when && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      when: {kb.when}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 flex-shrink-0 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}

          {showAddForm && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Input
                placeholder="Key combo (e.g. Ctrl+Shift+P)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Command (e.g. togglePlan)"
                value={newCommand}
                onChange={(e) => setNewCommand(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="When condition (optional)"
                value={newWhen}
                onChange={(e) => setNewWhen(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAdd}
                  disabled={adding || !newKey.trim() || !newCommand.trim()}
                >
                  {adding ? 'Adding...' : 'Add Keybinding'}
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

          {!showAddForm && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4" />
              Add Keybinding
            </Button>
          )}

          {configPath && (
            <p className="truncate text-xs text-muted-foreground">
              Config: {configPath}
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
