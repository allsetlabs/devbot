import { useState, useEffect, useCallback } from 'react';
import { Webhook, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Input } from '@allsetlabs/reusable/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { api } from '../lib/api';
import type { HookMatcher } from '../types';

const HOOK_EVENTS = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop'] as const;

interface HooksDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HooksDrawer({ open, onOpenChange }: HooksDrawerProps) {
  const [hooks, setHooks] = useState<Record<string, HookMatcher[]>>({});
  const [settingsPath, setSettingsPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState<string>(HOOK_EVENTS[0]);
  const [newMatcher, setNewMatcher] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchHooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listHooks();
      setHooks(data.hooks);
      setSettingsPath(data.settingsPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load hooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchHooks();
  }, [open, fetchHooks]);

  const handleAdd = async () => {
    if (!newMatcher.trim() || !newCommand.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await api.addHook(newEvent, newMatcher.trim(), newCommand.trim());
      setNewMatcher('');
      setNewCommand('');
      setShowAddForm(false);
      await fetchHooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add hook');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (event: string, index: number) => {
    setError(null);
    try {
      await api.deleteHook(event, index);
      await fetchHooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete hook');
    }
  };

  const allHookEntries = Object.entries(hooks).flatMap(([event, matchers]) =>
    matchers.map((m, idx) => ({ event, matcher: m, index: idx }))
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Hooks
          </DrawerTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure shell commands that run before/after tool calls
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
          ) : allHookEntries.length === 0 && !showAddForm ? (
            <div className="py-6 text-center">
              <Webhook className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No hooks configured</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add hooks to run commands on tool events
              </p>
            </div>
          ) : (
            allHookEntries.map(({ event, matcher, index }) => (
              <div
                key={`${event}-${index}`}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <Webhook className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {event}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      matcher: {matcher.matcher}
                    </span>
                  </p>
                  {matcher.hooks.map((h, hIdx) => (
                    <p key={hIdx} className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      $ {h.command}
                    </p>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 flex-shrink-0 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(event, index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}

          {showAddForm && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <select
                value={newEvent}
                onChange={(e) => setNewEvent(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {HOOK_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>{ev}</option>
                ))}
              </select>
              <Input
                placeholder="Matcher (e.g. Bash, Edit, *)"
                value={newMatcher}
                onChange={(e) => setNewMatcher(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Command (e.g. echo 'hook fired')"
                value={newCommand}
                onChange={(e) => setNewCommand(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAdd}
                  disabled={adding || !newMatcher.trim() || !newCommand.trim()}
                >
                  {adding ? 'Adding...' : 'Add Hook'}
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
              Add Hook
            </Button>
          )}

          {settingsPath && (
            <p className="truncate text-xs text-muted-foreground">
              Config: {settingsPath}
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
