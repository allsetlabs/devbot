import { useState, useEffect } from 'react';
import { Button } from '@subbiah/reusable/components/ui/button';
import { Input } from '@subbiah/reusable/components/ui/input';
import { Textarea } from '@subbiah/reusable/components/ui/textarea';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@subbiah/reusable/components/ui/drawer';
import { formatEntryTime, formatEntryMs } from '../lib/event-timer-utils';
import type { EventTimerEntry } from '../types';

interface EditEntryDrawerProps {
  entry: EventTimerEntry | null;
  isPending: boolean;
  onClose: () => void;
  onSave: (id: string, name: string | null, description: string | null) => void;
}

export function EditEntryDrawer({ entry, isPending, onClose, onSave }: EditEntryDrawerProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    if (entry) {
      setName(entry.name || '');
      setDesc(entry.description || '');
    }
  }, [entry]);

  const handleSave = () => {
    if (!entry) return;
    onSave(entry.id, name.trim() || null, desc.trim() || null);
  };

  return (
    <Drawer open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {entry && (
              <span className="font-mono">
                {formatEntryTime(entry.recordedAt)}
                <span className="text-primary">.{formatEntryMs(entry.recordedAt)}</span>
              </span>
            )}
          </DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 px-4 pb-6">
          <div>
            <label htmlFor="entry-name" className="mb-1.5 block text-sm font-medium text-foreground">
              Name
            </label>
            <Input
              id="entry-name"
              placeholder="e.g. Wedding day, First kiss"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="entry-desc" className="mb-1.5 block text-sm font-medium text-foreground">
              Description
            </label>
            <Textarea
              id="entry-desc"
              placeholder="Add any notes..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
            />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
