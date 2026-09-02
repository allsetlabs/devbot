import { useState, useMemo } from 'react';
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
import { Plus, Search, Trash2, Pill, Filter, Clock, AlertCircle } from 'lucide-react';
import type { MedicationRecord, MedicationFrequency, MemberRecord } from '../types';
import { healthApi } from '../api';

const FREQUENCY_LABELS: Record<MedicationFrequency, string> = {
  daily: 'Daily',
  twice_daily: 'Twice Daily',
  three_times_daily: '3x Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  as_needed: 'As Needed',
};

const ALL_FREQUENCIES: MedicationFrequency[] = [
  'daily',
  'twice_daily',
  'three_times_daily',
  'weekly',
  'monthly',
  'as_needed',
];

const TIME_OF_DAY_OPTIONS = [
  { label: '🌅 Morning', value: 'morning' },
  { label: '☀️ Afternoon', value: 'afternoon' },
  { label: '🌆 Evening', value: 'evening' },
  { label: '🌙 Night', value: 'night' },
  { label: '🍽️ With Meals', value: 'with_meals' },
];

function formatDate(date: string): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Add Medication Drawer
// ---------------------------------------------------------------------------

interface AddMedicationDrawerProps {
  members: MemberRecord[];
  onSaved: () => void;
}

function AddMedicationDrawer({ members, onSaved }: AddMedicationDrawerProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [memberId, setMemberId] = useState('');
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<MedicationFrequency>('daily');
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['morning']);
  const [prescribedBy, setPrescribedBy] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [refillDate, setRefillDate] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [purpose, setPurpose] = useState('');
  const [sideEffects, setSideEffects] = useState('');
  const [notes, setNotes] = useState('');

  function resetForm() {
    setMemberId('');
    setName('');
    setDosage('');
    setFrequency('daily');
    setSelectedTimes(['morning']);
    setPrescribedBy('');
    setStartDate(todayISO());
    setEndDate('');
    setRefillDate('');
    setPharmacy('');
    setPurpose('');
    setSideEffects('');
    setNotes('');
  }

  function toggleTime(time: string) {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  }

  async function handleSave() {
    if (!memberId || !name.trim() || !dosage.trim()) return;

    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    setSaving(true);
    try {
      await healthApi.createMedication({
        memberId,
        memberName: member.name,
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        timeOfDay: selectedTimes,
        prescribedBy: prescribedBy.trim() || undefined,
        startDate,
        endDate: endDate || undefined,
        refillDate: refillDate || undefined,
        pharmacy: pharmacy.trim() || undefined,
        purpose: purpose.trim() || undefined,
        sideEffects: sideEffects.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      resetForm();
      setOpen(false);
      onSaved();
    } catch (err) {
      console.error('Failed to create medication:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add Medication</DrawerTitle>
        </DrawerHeader>

        <DrawerBody className="space-y-4 px-4">
          {/* Member */}
          <div className="space-y-1.5">
            <Label>Family Member *</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.relationship})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {members.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add a family member first in the Members tab.
              </p>
            )}
          </div>

          {/* Medication Name */}
          <div className="space-y-1.5">
            <Label htmlFor="med-name">Medication Name *</Label>
            <Input
              id="med-name"
              placeholder="e.g. Amoxicillin"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Dosage */}
          <div className="space-y-1.5">
            <Label htmlFor="med-dosage">Dosage *</Label>
            <Input
              id="med-dosage"
              placeholder="e.g. 500mg"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
            />
          </div>

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as MedicationFrequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time of Day */}
          <div className="space-y-1.5">
            <Label>Time of Day</Label>
            <div className="flex flex-wrap gap-1.5">
              {TIME_OF_DAY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={selectedTimes.includes(opt.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleTime(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Prescribed By */}
          <div className="space-y-1.5">
            <Label htmlFor="med-doctor">Prescribed By</Label>
            <Input
              id="med-doctor"
              placeholder="Doctor's name"
              value={prescribedBy}
              onChange={(e) => setPrescribedBy(e.target.value)}
            />
          </div>

          {/* Start / End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="med-start">Start Date</Label>
              <Input
                id="med-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-end">End Date</Label>
              <Input
                id="med-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Refill Date */}
          <div className="space-y-1.5">
            <Label htmlFor="med-refill">Refill Date</Label>
            <Input
              id="med-refill"
              type="date"
              value={refillDate}
              onChange={(e) => setRefillDate(e.target.value)}
            />
          </div>

          {/* Pharmacy */}
          <div className="space-y-1.5">
            <Label htmlFor="med-pharmacy">Pharmacy</Label>
            <Input
              id="med-pharmacy"
              placeholder="Pharmacy name"
              value={pharmacy}
              onChange={(e) => setPharmacy(e.target.value)}
            />
          </div>

          {/* Purpose */}
          <div className="space-y-1.5">
            <Label htmlFor="med-purpose">Purpose</Label>
            <Input
              id="med-purpose"
              placeholder="What is this medication for?"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          {/* Side Effects */}
          <div className="space-y-1.5">
            <Label htmlFor="med-side-effects">Side Effects</Label>
            <Input
              id="med-side-effects"
              placeholder="Known side effects"
              value={sideEffects}
              onChange={(e) => setSideEffects(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="med-notes">Notes</Label>
            <Textarea
              id="med-notes"
              placeholder="Any additional details..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </DrawerBody>

        <DrawerFooter className="flex-row gap-2 px-4">
          <DrawerClose asChild>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </DrawerClose>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving || !memberId || !name.trim() || !dosage.trim()}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Medication Card
// ---------------------------------------------------------------------------

interface MedicationCardProps {
  medication: MedicationRecord;
  onDeleted: () => void;
}

function MedicationCard({ medication, onDeleted }: MedicationCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isRefillDue =
    medication.refillDate &&
    medication.refillDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] &&
    medication.refillDate >= new Date().toISOString().split('T')[0];

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await healthApi.deleteMedication(medication.id);
      onDeleted();
    } catch (err) {
      console.error('Failed to delete medication:', err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Card className={`md:hover:shadow-md transition-shadow ${!medication.active ? 'opacity-60' : ''}`}>
      <CardContent className="flex items-start gap-3 p-4">
        {/* Left: pill icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
          <Pill className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-medium leading-tight">{medication.name}</p>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{medication.dosage}</span>
            <span>·</span>
            <span>{FREQUENCY_LABELS[medication.frequency]}</span>
            <span>·</span>
            <span>{medication.memberName}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge variant={medication.active ? 'default' : 'secondary'} className="text-[10px]">
              {medication.active ? 'Active' : 'Inactive'}
            </Badge>
            {medication.timeOfDay.map((time) => (
              <Badge key={time} variant="outline" className="text-[10px]">
                <Clock className="mr-0.5 h-2.5 w-2.5" />
                {time}
              </Badge>
            ))}
            {isRefillDue && (
              <Badge variant="outline" className="text-[10px] text-amber-600">
                <AlertCircle className="mr-0.5 h-2.5 w-2.5" />
                Refill {formatDate(medication.refillDate)}
              </Badge>
            )}
            {medication.purpose && (
              <Badge variant="secondary" className="text-[10px]">
                {medication.purpose}
              </Badge>
            )}
          </div>
        </div>

        {/* Right: delete */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${
              confirmDelete
                ? 'text-red-600'
                : 'text-muted-foreground md:hover:text-red-600'
            }`}
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {confirmDelete && (
            <span className="text-[10px] text-red-500">Tap again</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Medications List (main export)
// ---------------------------------------------------------------------------

interface MedicationsListProps {
  medications: MedicationRecord[];
  members: MemberRecord[];
  onRefresh: () => void;
}

export function MedicationsList({ medications, members, onRefresh }: MedicationsListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return [...medications]
      .filter((med) => {
        if (statusFilter === 'active' && !med.active) return false;
        if (statusFilter === 'inactive' && med.active) return false;
        if (!term) return true;

        return (
          med.name.toLowerCase().includes(term) ||
          med.memberName.toLowerCase().includes(term) ||
          med.dosage.toLowerCase().includes(term) ||
          med.purpose?.toLowerCase().includes(term) ||
          med.prescribedBy?.toLowerCase().includes(term) ||
          med.pharmacy?.toLowerCase().includes(term) ||
          med.notes?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        // Active first, then by name
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [medications, search, statusFilter]);

  const filterOptions: { label: string; value: 'all' | 'active' | 'inactive' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];

  return (
    <div className="space-y-4">
      {/* Header: title + add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Medications</h2>
        <AddMedicationDrawer members={members} onSaved={onRefresh} />
      </div>

      {/* Search + filter row */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search medications..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {filterOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Medication cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {medications.length === 0
            ? 'No medications yet. Add your first one!'
            : 'No medications match your filters.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((med) => (
            <MedicationCard key={med.id} medication={med} onDeleted={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
