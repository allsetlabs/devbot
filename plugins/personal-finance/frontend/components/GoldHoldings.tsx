import { useState } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Card, CardContent } from '@allsetlabs/forge/components/ui/card';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@allsetlabs/forge/components/ui/select';
import { Label } from '@allsetlabs/forge/components/ui/label';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from '@allsetlabs/forge/components/ui/drawer';
import { Plus, Coins, Trash2, MapPin, Info } from 'lucide-react';
import type { GoldRecord, GoldSummary, GoldType, GoldPurity } from '../types';
import { financeApi } from '../api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PURITY_COLORS: Record<GoldPurity, string> = {
  '24k': 'bg-yellow-500/10 text-yellow-600',
  '22k': 'bg-amber-500/10 text-amber-600',
  '18k': 'bg-slate-300/10 text-slate-500',
  '14k': 'bg-gray-400/10 text-gray-500',
};

const TYPE_ICONS: Record<GoldType, string> = {
  jewelry: '\u{1F48D}',
  coin: '\u{1FA99}',
  bar: '\u{1F947}',
  other: '✨',
};

const PAVANS_TO_GRAMS = 8;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GoldHoldingsProps {
  goldItems: GoldRecord[];
  goldSummary: GoldSummary | null;
  onRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatWeight(pavans: number): string {
  return `${pavans.toFixed(2)} pavans (${(pavans * PAVANS_TO_GRAMS).toFixed(2)} g)`;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// AddGoldDrawer
// ---------------------------------------------------------------------------

function AddGoldDrawer({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [description, setDescription] = useState('');
  const [type, setType] = useState<GoldType>('jewelry');
  const [weightPavans, setWeightPavans] = useState('');
  const [purity, setPurity] = useState<GoldPurity>('22k');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  function resetForm() {
    setDescription('');
    setType('jewelry');
    setWeightPavans('');
    setPurity('22k');
    setPurchasePrice('');
    setPurchaseDate('');
    setCurrency('INR');
    setLocation('');
    setNotes('');
  }

  async function handleSave() {
    if (!description.trim() || !weightPavans) return;
    setSaving(true);
    try {
      await financeApi.createGoldItem({
        description: description.trim(),
        type,
        weightPavans: parseFloat(weightPavans) || 0,
        purity,
        purchasePrice: parseFloat(purchasePrice) || 0,
        purchaseDate,
        currency: currency.trim() || 'INR',
        location: location.trim(),
        notes: notes.trim(),
      });
      resetForm();
      setOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to save gold item:', err);
    } finally {
      setSaving(false);
    }
  }

  const parsedWeight = parseFloat(weightPavans) || 0;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Gold
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add Gold Item</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <div className="flex flex-col gap-4">
            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gold-description">Description</Label>
              <Input
                id="gold-description"
                placeholder="e.g. Wedding necklace"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as GoldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jewelry">{TYPE_ICONS.jewelry} Jewelry</SelectItem>
                  <SelectItem value="coin">{TYPE_ICONS.coin} Coin</SelectItem>
                  <SelectItem value="bar">{TYPE_ICONS.bar} Bar</SelectItem>
                  <SelectItem value="other">{TYPE_ICONS.other} Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Weight */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gold-weight">Weight in Pavans</Label>
              <Input
                id="gold-weight"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={weightPavans}
                onChange={(e) => setWeightPavans(e.target.value)}
              />
              {parsedWeight > 0 && (
                <p className="text-xs text-muted-foreground">
                  = {(parsedWeight * PAVANS_TO_GRAMS).toFixed(2)} grams
                </p>
              )}
            </div>

            {/* Purity */}
            <div className="flex flex-col gap-1.5">
              <Label>Purity</Label>
              <Select value={purity} onValueChange={(v) => setPurity(v as GoldPurity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24k">24k (99.9%)</SelectItem>
                  <SelectItem value="22k">22k (91.6%)</SelectItem>
                  <SelectItem value="18k">18k (75.0%)</SelectItem>
                  <SelectItem value="14k">14k (58.3%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Purchase Price */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gold-price">Purchase Price</Label>
              <Input
                id="gold-price"
                type="number"
                min="0"
                placeholder="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>

            {/* Purchase Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gold-date">Purchase Date</Label>
              <Input
                id="gold-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            {/* Currency */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gold-currency">Currency</Label>
              <Input
                id="gold-currency"
                placeholder="INR"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>

            {/* Location */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gold-location">Location</Label>
              <Input
                id="gold-location"
                placeholder="e.g. Home safe, Bank locker"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gold-notes">Notes</Label>
              <Textarea
                id="gold-notes"
                placeholder="Any additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button onClick={handleSave} disabled={saving || !description.trim() || !weightPavans}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// GoldItemCard
// ---------------------------------------------------------------------------

function GoldItemCard({
  item,
  onDelete,
}: {
  item: GoldRecord;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">{TYPE_ICONS[item.type]}</span>
            <span className="font-semibold truncate">{item.description}</span>
            <Badge variant="outline" className="shrink-0 capitalize">
              {item.type}
            </Badge>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="shrink-0 p-1.5 rounded-md text-muted-foreground md:hover:text-destructive md:hover:bg-destructive/10 active:text-destructive active:bg-destructive/10 transition-colors"
            aria-label={`Delete ${item.description}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Weight + Purity */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {formatWeight(item.weightPavans)}
          </span>
          <Badge className={`${PURITY_COLORS[item.purity]} border-0`}>
            {item.purity}
          </Badge>
        </div>

        {/* Purchase info */}
        {(item.purchasePrice > 0 || item.purchaseDate) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {item.purchasePrice > 0 && (
              <span>{formatCurrency(item.purchasePrice, item.currency)}</span>
            )}
            {item.purchaseDate && <span>{formatDate(item.purchaseDate)}</span>}
          </div>
        )}

        {/* Location */}
        {item.location && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{item.location}</span>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <p className="text-sm text-muted-foreground/80 italic mt-1">
            {item.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// GoldHoldings (main)
// ---------------------------------------------------------------------------

export function GoldHoldings({
  goldItems,
  goldSummary,
  onRefresh,
}: GoldHoldingsProps) {
  async function handleDelete(id: string) {
    try {
      await financeApi.deleteGoldItem(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete gold item:', err);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold">Gold Holdings</h2>
        </div>
        <AddGoldDrawer onRefresh={onRefresh} />
      </div>

      {/* Pavan conversion note */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>1 pavan = 8 grams</span>
      </div>

      {/* Summary cards */}
      {goldSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Total */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Total Gold
              </p>
              <p className="text-xl font-bold">
                {goldSummary.totalPavans.toFixed(2)} pavans
              </p>
              <p className="text-sm text-muted-foreground">
                {goldSummary.totalGrams.toFixed(2)} grams
              </p>
            </CardContent>
          </Card>

          {/* By Purity */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                By Purity
              </p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(goldSummary.byPurity).map(([purity, data]) => (
                  <div
                    key={purity}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-1.5">
                      <Badge
                        className={`${PURITY_COLORS[purity as GoldPurity] || ''} border-0 text-xs`}
                      >
                        {purity}
                      </Badge>
                      <span className="text-muted-foreground">
                        ({data.count})
                      </span>
                    </div>
                    <span className="font-medium">
                      {data.pavans.toFixed(2)} p
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By Type */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                By Type
              </p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(goldSummary.byType).map(([goldType, data]) => (
                  <div
                    key={goldType}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{TYPE_ICONS[goldType as GoldType] || ''}</span>
                      <span className="capitalize">{goldType}</span>
                      <span className="text-muted-foreground">
                        ({data.count})
                      </span>
                    </div>
                    <span className="font-medium">
                      {data.pavans.toFixed(2)} p
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gold items list */}
      {goldItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Coins className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            No gold holdings tracked. Add your first item!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {goldItems.map((item) => (
            <GoldItemCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
