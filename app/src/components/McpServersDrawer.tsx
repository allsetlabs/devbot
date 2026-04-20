import { useState, useEffect, useCallback } from 'react';
import { Server, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Input } from '@allsetlabs/reusable/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { api } from '../lib/api';
import type { McpServerConfig } from '../types';

interface McpServersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function McpServersDrawer({ open, onOpenChange }: McpServersDrawerProps) {
  const [servers, setServers] = useState<Record<string, McpServerConfig>>({});
  const [settingsPath, setSettingsPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newArgs, setNewArgs] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchServers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listMcpServers();
      setServers(data.servers);
      setSettingsPath(data.settingsPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load MCP servers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchServers();
    }
  }, [open, fetchServers]);

  const handleAdd = async () => {
    if (!newName.trim() || !newCommand.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const args = newArgs.trim()
        ? newArgs.split(/\s+/).filter(Boolean)
        : undefined;
      await api.addMcpServer(newName.trim(), newCommand.trim(), args);
      setNewName('');
      setNewCommand('');
      setNewArgs('');
      setShowAddForm(false);
      await fetchServers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add server');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (name: string) => {
    setError(null);
    try {
      await api.deleteMcpServer(name);
      await fetchServers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete server');
    }
  };

  const serverEntries = Object.entries(servers);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            MCP Servers
          </DrawerTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage Model Context Protocol servers for Claude Code
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
          ) : serverEntries.length === 0 && !showAddForm ? (
            <div className="py-6 text-center">
              <Server className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No MCP servers configured</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add servers to extend Claude&apos;s capabilities
              </p>
            </div>
          ) : (
            serverEntries.map(([name, config]) => (
              <div
                key={name}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <Server className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{name}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {config.command}
                    {config.args?.length ? ` ${config.args.join(' ')}` : ''}
                  </p>
                  {config.cwd && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      cwd: {config.cwd}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 flex-shrink-0 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}

          {showAddForm && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Input
                placeholder="Server name (e.g. filesystem)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Command (e.g. npx)"
                value={newCommand}
                onChange={(e) => setNewCommand(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Args (space-separated, e.g. -y @modelcontextprotocol/server-filesystem)"
                value={newArgs}
                onChange={(e) => setNewArgs(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAdd}
                  disabled={adding || !newName.trim() || !newCommand.trim()}
                >
                  {adding ? 'Adding...' : 'Add Server'}
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
              Add MCP Server
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
