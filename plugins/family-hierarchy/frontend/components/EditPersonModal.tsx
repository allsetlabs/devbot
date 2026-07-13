import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@allsetlabs/forge/components/ui/dialog';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import { Label } from '@allsetlabs/forge/components/ui/label';
import { Switch } from '@allsetlabs/forge/components/ui/switch';
import type { Person } from '../types';

export interface EditSaveData {
  name: string;
  translit: string;
  note: string;
  markCorrect: boolean;
}

interface Props {
  open: boolean;
  mode: 'edit' | 'add';
  person: Person | null; // edit: the person; add: the parent
  onClose: () => void;
  onSave: (data: EditSaveData) => void;
}

export function EditPersonModal({ open, mode, person, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [translit, setTranslit] = useState('');
  const [note, setNote] = useState('');
  const [markCorrect, setMarkCorrect] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && person) {
      setName(person.name);
      setTranslit(person.translit);
      setNote(person.note);
    } else {
      setName('');
      setTranslit('');
      setNote('');
    }
    setMarkCorrect(false);
  }, [open, mode, person]);

  const isUncertain = mode === 'edit' && person?.uncertain;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="dark max-w-md bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add child' : 'Edit person'}</DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? `New child of ${person?.name ?? 'this person'}.`
              : 'Update the name and details. Changes are saved to the family file.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label htmlFor="fh-name">Name (Tamil)</Label>
            <Input id="fh-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="பெயர்" autoFocus />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fh-translit">Transliteration</Label>
            <Input
              id="fh-translit"
              value={translit}
              onChange={(e) => setTranslit(e.target.value)}
              placeholder="e.g. Vellaiyan"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fh-note">Notes</Label>
            <Textarea
              id="fh-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Legend key, adoption / origin, honorific, page reference…"
              rows={3}
            />
          </div>

          {isUncertain && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
              <div className="text-xs font-medium text-destructive">Uncertain reading</div>
              {person?.uncertainReason && (
                <div className="mt-0.5 text-xs text-muted-foreground">{person.uncertainReason}</div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Switch id="fh-correct" checked={markCorrect} onCheckedChange={setMarkCorrect} />
                <Label htmlFor="fh-correct" className="cursor-pointer text-xs">
                  Mark this reading as correct (clears the red flag)
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave({ name: name.trim(), translit: translit.trim(), note: note.trim(), markCorrect })}>
            {mode === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
