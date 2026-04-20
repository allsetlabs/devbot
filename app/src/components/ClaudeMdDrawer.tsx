import { useState, useEffect, useCallback } from 'react';
import { FileText, Save, Loader2 } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Textarea } from '@allsetlabs/reusable/components/ui/textarea';
import { api } from '../lib/api';
import { toast } from 'sonner';

interface ClaudeMdDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workingDirectory?: string;
}

export function ClaudeMdDrawer({ open, onOpenChange, workingDirectory }: ClaudeMdDrawerProps) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [filePath, setFilePath] = useState('');

  const fetchContent = useCallback(async () => {
    if (!workingDirectory) return;
    setLoading(true);
    try {
      const data = await api.getClaudeMd(workingDirectory);
      setContent(data.content || '');
      setOriginalContent(data.content || '');
      setExists(data.exists);
      setFilePath(data.path);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load CLAUDE.md');
    } finally {
      setLoading(false);
    }
  }, [workingDirectory]);

  useEffect(() => {
    if (open) fetchContent();
  }, [open, fetchContent]);

  const handleSave = async () => {
    if (!workingDirectory) return;
    setSaving(true);
    try {
      await api.saveClaudeMd(workingDirectory, content);
      setOriginalContent(content);
      setExists(true);
      toast.success('CLAUDE.md saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = content !== originalContent;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CLAUDE.md Editor
          </DrawerTitle>
          {filePath && (
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{filePath}</p>
          )}
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {!exists && !content && (
                <p className="text-sm text-muted-foreground">
                  No CLAUDE.md exists yet. Write project instructions below and save to create one.
                </p>
              )}
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Project Instructions&#10;&#10;Describe coding conventions, architecture, and rules for this project..."
                className="min-h-[300px] font-mono text-sm"
              />
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {exists ? 'Save Changes' : 'Create CLAUDE.md'}
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
