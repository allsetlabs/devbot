import { useState, useEffect, useCallback } from 'react';
import { Brain, Trash2, AlertCircle, ChevronDown, ChevronRight, Pencil, X, Check } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { Textarea } from '@allsetlabs/reusable/components/ui/textarea';
import { api } from '../lib/api';
import type { MemoryFile } from '../types';

interface MemoryViewerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_COLORS: Record<string, string> = {
  user: 'bg-blue-500/20 text-blue-400',
  feedback: 'bg-amber-500/20 text-amber-400',
  project: 'bg-green-500/20 text-green-400',
  reference: 'bg-purple-500/20 text-purple-400',
};

function projectLabel(project: string): string {
  return project
    .replace(/^-/, '')
    .replace(/-/g, '/')
    .replace(/^Users\/\w+\//, '~/');
}

export function MemoryViewerDrawer({ open, onOpenChange }: MemoryViewerDrawerProps) {
  const [memories, setMemories] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listMemories();
      setMemories(data.memories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchMemories();
      setExpandedKey(null);
      setEditingKey(null);
    }
  }, [open, fetchMemories]);

  const memKey = (m: MemoryFile) => `${m.project}/${m.filename}`;

  const handleDelete = async (m: MemoryFile) => {
    setError(null);
    try {
      await api.deleteMemory(m.project, m.filename);
      await fetchMemories();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete memory');
    }
  };

  const handleStartEdit = (m: MemoryFile) => {
    const raw = m.name
      ? `---\nname: ${m.name}\ndescription: ${m.description}\ntype: ${m.type}\n---\n\n${m.content}`
      : m.content;
    setEditContent(raw);
    setEditingKey(memKey(m));
  };

  const handleSave = async (m: MemoryFile) => {
    setSaving(true);
    setError(null);
    try {
      await api.updateMemory(m.project, m.filename, editContent);
      setEditingKey(null);
      await fetchMemories();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save memory');
    } finally {
      setSaving(false);
    }
  };

  const grouped = memories.reduce<Record<string, MemoryFile[]>>((acc, m) => {
    (acc[m.project] ??= []).push(m);
    return acc;
  }, {});

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Memory Viewer
          </DrawerTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            View and manage Claude&apos;s persistent memory files
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
          ) : memories.length === 0 ? (
            <div className="py-6 text-center">
              <Brain className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No memories found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Claude will create memories as you interact with it
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([project, files]) => (
              <div key={project} className="space-y-2">
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {projectLabel(project)}
                </p>
                {files.map((m) => {
                  const key = memKey(m);
                  const isExpanded = expandedKey === key;
                  const isEditing = editingKey === key;

                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-border bg-card"
                    >
                      <button
                        type="button"
                        className="flex w-full items-start gap-2 p-3 text-left"
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {m.name || m.filename}
                            </p>
                            {m.type && (
                              <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[m.type] || 'bg-muted text-muted-foreground'}`}>
                                {m.type}
                              </span>
                            )}
                          </div>
                          {m.description && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {m.description}
                            </p>
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-3 pb-3 pt-2">
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[200px] font-mono text-xs"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1"
                                  onClick={() => handleSave(m)}
                                  disabled={saving}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  {saving ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingKey(null)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <pre className="whitespace-pre-wrap text-xs text-foreground/80">
                                {m.content}
                              </pre>
                              <div className="mt-2 flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleStartEdit(m)}
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(m)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
