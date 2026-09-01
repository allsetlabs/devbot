import { useState } from 'react';
import type { TripRecord } from '../types';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
} from '@allsetlabs/forge/components/ui/drawer';
import { Loader2, X } from 'lucide-react';

interface CreateTripDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<TripRecord>) => Promise<void>;
  /** Pre-fill for editing. */
  initial?: TripRecord | null;
}

const EMOJI_OPTIONS = ['✈️', '🏖️', '🏔️', '🗺️', '🚗', '🏕️', '🚢', '🏰', '🎢', '🌴', '🗼', '⛷️'];

export function CreateTripDrawer({ open, onOpenChange, onSubmit, initial }: CreateTripDrawerProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [budget, setBudget] = useState(initial?.budget?.toString() ?? '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'USD');
  const [coverEmoji, setCoverEmoji] = useState(initial?.coverEmoji ?? '✈️');
  const [travelers, setTravelers] = useState(initial?.travelers?.join(', ') ?? '');
  const [tags, setTags] = useState(initial?.tags?.join(', ') ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !destination.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        destination: destination.trim(),
        description: description.trim(),
        startDate,
        endDate,
        budget: budget ? parseFloat(budget) : 0,
        currency: currency || 'USD',
        coverEmoji,
        travelers: travelers
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      onOpenChange(false);
      // Reset form
      setName('');
      setDestination('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setBudget('');
      setCurrency('USD');
      setCoverEmoji('✈️');
      setTravelers('');
      setTags('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>{initial ? 'Edit Trip' : 'New Trip'}</DrawerTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <DrawerBody>
          <div className="flex flex-col gap-4 pb-6">
            {/* Emoji picker */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Cover</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setCoverEmoji(e)}
                    className={`rounded-lg border p-1.5 text-xl transition-all ${
                      coverEmoji === e
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent md:hover:bg-muted'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Trip Name *
              </label>
              <Input
                placeholder="Summer in Italy"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Destination *
              </label>
              <Input
                placeholder="Rome, Florence, Venice"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                placeholder="A 10-day tour of Italy's most beautiful cities..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  End Date
                </label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Budget
                </label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Currency
                </label>
                <Input
                  placeholder="USD"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Travelers (comma-separated)
              </label>
              <Input
                placeholder="Alice, Bob"
                value={travelers}
                onChange={(e) => setTravelers(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Tags (comma-separated)
              </label>
              <Input
                placeholder="europe, summer, food"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <Button onClick={handleSubmit} disabled={!name.trim() || !destination.trim() || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {initial ? 'Saving…' : 'Creating…'}
                </>
              ) : initial ? (
                'Save Changes'
              ) : (
                'Create Trip'
              )}
            </Button>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
