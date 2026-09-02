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
import { Plus, Search, Trash2, Heart, AlertTriangle, User } from 'lucide-react';
import type { MemberRecord, Gender } from '../types';
import { healthApi } from '../api';

const RELATIONSHIP_OPTIONS = [
  'Self',
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Other',
];

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Add Member Drawer
// ---------------------------------------------------------------------------

interface AddMemberDrawerProps {
  onSaved: () => void;
}

function AddMemberDrawer({ onSaved }: AddMemberDrawerProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Self');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('other');
  const [bloodType, setBloodType] = useState('Unknown');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [conditionsInput, setConditionsInput] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [primaryDoctor, setPrimaryDoctor] = useState('');
  const [notes, setNotes] = useState('');

  function resetForm() {
    setName('');
    setRelationship('Self');
    setDateOfBirth('');
    setGender('other');
    setBloodType('Unknown');
    setHeight('');
    setWeight('');
    setAllergiesInput('');
    setConditionsInput('');
    setEmergencyContact('');
    setInsuranceProvider('');
    setInsurancePolicyNumber('');
    setPrimaryDoctor('');
    setNotes('');
  }

  async function handleSave() {
    if (!name.trim() || !dateOfBirth) return;

    setSaving(true);
    try {
      const allergies = allergiesInput
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      const conditions = conditionsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await healthApi.createMember({
        name: name.trim(),
        relationship,
        dateOfBirth,
        gender,
        bloodType,
        height: height.trim() || undefined,
        weight: weight.trim() || undefined,
        allergies: allergies.length > 0 ? allergies : undefined,
        conditions: conditions.length > 0 ? conditions : undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        insuranceProvider: insuranceProvider.trim() || undefined,
        insurancePolicyNumber: insurancePolicyNumber.trim() || undefined,
        primaryDoctor: primaryDoctor.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      resetForm();
      setOpen(false);
      onSaved();
    } catch (err) {
      console.error('Failed to create member:', err);
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
          <DrawerTitle>Add Family Member</DrawerTitle>
        </DrawerHeader>

        <DrawerBody className="space-y-4 px-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="member-name">Name *</Label>
            <Input
              id="member-name"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Relationship */}
          <div className="space-y-1.5">
            <Label>Relationship</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label htmlFor="member-dob">Date of Birth *</Label>
            <Input
              id="member-dob"
              type="date"
              value={dateOfBirth}
              max={todayISO()}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Blood Type */}
          <div className="space-y-1.5">
            <Label>Blood Type</Label>
            <Select value={bloodType} onValueChange={setBloodType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_TYPE_OPTIONS.map((bt) => (
                  <SelectItem key={bt} value={bt}>
                    {bt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Height + Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="member-height">Height</Label>
              <Input
                id="member-height"
                placeholder="e.g. 5'10&quot;"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-weight">Weight</Label>
              <Input
                id="member-weight"
                placeholder="e.g. 160 lbs"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-1.5">
            <Label htmlFor="member-allergies">Allergies (comma-separated)</Label>
            <Input
              id="member-allergies"
              placeholder="e.g. Peanuts, Penicillin"
              value={allergiesInput}
              onChange={(e) => setAllergiesInput(e.target.value)}
            />
          </div>

          {/* Conditions */}
          <div className="space-y-1.5">
            <Label htmlFor="member-conditions">Conditions (comma-separated)</Label>
            <Input
              id="member-conditions"
              placeholder="e.g. Asthma, Diabetes"
              value={conditionsInput}
              onChange={(e) => setConditionsInput(e.target.value)}
            />
          </div>

          {/* Emergency Contact */}
          <div className="space-y-1.5">
            <Label htmlFor="member-emergency">Emergency Contact</Label>
            <Input
              id="member-emergency"
              placeholder="Name & phone number"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
          </div>

          {/* Insurance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="member-insurance">Insurance Provider</Label>
              <Input
                id="member-insurance"
                placeholder="Provider name"
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-policy">Policy #</Label>
              <Input
                id="member-policy"
                placeholder="Policy number"
                value={insurancePolicyNumber}
                onChange={(e) => setInsurancePolicyNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Primary Doctor */}
          <div className="space-y-1.5">
            <Label htmlFor="member-doctor">Primary Doctor</Label>
            <Input
              id="member-doctor"
              placeholder="Doctor's name"
              value={primaryDoctor}
              onChange={(e) => setPrimaryDoctor(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="member-notes">Notes</Label>
            <Textarea
              id="member-notes"
              placeholder="Any additional health notes..."
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
            disabled={saving || !name.trim() || !dateOfBirth}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Member Card
// ---------------------------------------------------------------------------

interface MemberCardProps {
  member: MemberRecord;
  onDeleted: () => void;
}

function MemberCard({ member, onDeleted }: MemberCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const age = calculateAge(member.dateOfBirth);

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await healthApi.deleteMember(member.id);
      onDeleted();
    } catch (err) {
      console.error('Failed to delete member:', err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Card className="md:hover:shadow-md transition-shadow">
      <CardContent className="flex items-start gap-3 p-4">
        {/* Left: avatar icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-medium leading-tight">{member.name}</p>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{member.relationship}</span>
            <span>·</span>
            <span>{age} yrs</span>
            {member.bloodType && member.bloodType !== 'Unknown' && (
              <>
                <span>·</span>
                <span>🩸 {member.bloodType}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {member.conditions.map((condition) => (
              <Badge key={condition} variant="secondary" className="text-[10px]">
                <Heart className="mr-0.5 h-2.5 w-2.5" />
                {condition}
              </Badge>
            ))}
            {member.allergies.length > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-600">
                <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                {member.allergies.length} allerg{member.allergies.length === 1 ? 'y' : 'ies'}
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
// Members List (main export)
// ---------------------------------------------------------------------------

interface MembersListProps {
  members: MemberRecord[];
  onRefresh: () => void;
}

export function MembersList({ members, onRefresh }: MembersListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return [...members]
      .filter((m) => {
        if (!term) return true;
        return (
          m.name.toLowerCase().includes(term) ||
          m.relationship.toLowerCase().includes(term) ||
          m.bloodType?.toLowerCase().includes(term) ||
          m.conditions.some((c) => c.toLowerCase().includes(term)) ||
          m.allergies.some((a) => a.toLowerCase().includes(term)) ||
          m.primaryDoctor?.toLowerCase().includes(term) ||
          m.notes?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, search]);

  return (
    <div className="space-y-4">
      {/* Header: title + add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Family Members</h2>
        <AddMemberDrawer onSaved={onRefresh} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Member cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {members.length === 0
            ? 'No family members yet. Add your first one!'
            : 'No members match your search.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((member) => (
            <MemberCard key={member.id} member={member} onDeleted={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
