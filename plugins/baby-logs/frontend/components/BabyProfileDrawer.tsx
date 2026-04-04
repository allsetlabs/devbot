/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState, useEffect } from 'react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Input } from '@allsetlabs/reusable/components/ui/input';
import { Textarea } from '@allsetlabs/reusable/components/ui/textarea';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import type { BabyProfile, Gender, BloodType } from '../types';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface BabyProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: BabyProfile | null;
  onSave: (data: ProfileFormData) => Promise<void>;
}

export interface ProfileFormData {
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  timeOfBirth: string | null;
  gender: Gender;
  bloodType: BloodType | null;
  placeOfBirth: string | null;
  cityOfBirth: string | null;
  stateOfBirth: string | null;
  countryOfBirth: string | null;
  citizenship: string | null;
  fatherName: string | null;
  motherName: string | null;
  gestationalWeek: number | null;
  note: string | null;
}

export function BabyProfileDrawer({ open, onOpenChange, profile, onSave }: BabyProfileDrawerProps) {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [timeOfBirth, setTimeOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [bloodType, setBloodType] = useState<BloodType | null>(null);
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [cityOfBirth, setCityOfBirth] = useState('');
  const [stateOfBirth, setStateOfBirth] = useState('');
  const [countryOfBirth, setCountryOfBirth] = useState('');
  const [citizenship, setCitizenship] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [gestationalWeek, setGestationalWeek] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setFirstName(profile.firstName);
      setMiddleName(profile.middleName ?? '');
      setLastName(profile.lastName);
      setDateOfBirth(profile.dateOfBirth);
      setTimeOfBirth(profile.timeOfBirth ?? '');
      setGender(profile.gender);
      setBloodType(profile.bloodType as BloodType | null);
      setPlaceOfBirth(profile.placeOfBirth ?? '');
      setCityOfBirth(profile.cityOfBirth ?? '');
      setStateOfBirth(profile.stateOfBirth ?? '');
      setCountryOfBirth(profile.countryOfBirth ?? '');
      setCitizenship(profile.citizenship ?? '');
      setFatherName(profile.fatherName ?? '');
      setMotherName(profile.motherName ?? '');
      setGestationalWeek(profile.gestationalWeek?.toString() ?? '');
      setNote(profile.note ?? '');
    } else if (open && !profile) {
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setDateOfBirth('');
      setTimeOfBirth('');
      setGender('male');
      setBloodType(null);
      setPlaceOfBirth('');
      setCityOfBirth('');
      setStateOfBirth('');
      setCountryOfBirth('');
      setCitizenship('');
      setFatherName('');
      setMotherName('');
      setGestationalWeek('');
      setNote('');
    }
  }, [open, profile]);

  const canSave = firstName.trim() && lastName.trim() && dateOfBirth && gender;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        firstName: firstName.trim(),
        middleName: middleName.trim() || null,
        lastName: lastName.trim(),
        dateOfBirth,
        timeOfBirth: timeOfBirth || null,
        gender,
        bloodType,
        placeOfBirth: placeOfBirth.trim() || null,
        cityOfBirth: cityOfBirth.trim() || null,
        stateOfBirth: stateOfBirth.trim() || null,
        countryOfBirth: countryOfBirth.trim() || null,
        citizenship: citizenship.trim() || null,
        fatherName: fatherName.trim() || null,
        motherName: motherName.trim() || null,
        gestationalWeek: gestationalWeek ? parseFloat(gestationalWeek) : null,
        note: note.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{profile ? 'Edit Baby Profile' : 'Add Baby Profile'}</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-8">
          {/* Name */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              First Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">Middle Name</label>
            <Input
              placeholder="Middle name (optional)"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              Last Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          {/* Date & Time of Birth — constrained width to avoid iOS picker collision */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              Date & Time of Birth <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="w-2/5 shrink-0"
              />
              <Input
                type="time"
                value={timeOfBirth}
                onChange={(e) => setTimeOfBirth(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="flex-1"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              Gender <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['male', 'female'] as const).map((g) => (
                <Button
                  key={g}
                  variant={gender === g ? 'default' : 'outline'}
                  className="h-10 capitalize"
                  onClick={() => setGender(g)}
                >
                  {g}
                </Button>
              ))}
            </div>
          </div>

          {/* Blood Type */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">Blood Type</label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_TYPES.map((bt) => (
                <Button
                  key={bt}
                  variant={bloodType === bt ? 'default' : 'outline'}
                  className="h-10 text-sm"
                  onClick={() => setBloodType(bloodType === bt ? null : bt)}
                >
                  {bt}
                </Button>
              ))}
            </div>
          </div>

          {/* Gestational Week */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              Gestational Week
            </label>
            <Input
              type="number"
              inputMode="decimal"
              min="20"
              max="42"
              step="0.1"
              placeholder="e.g. 37.5"
              value={gestationalWeek}
              onChange={(e) => setGestationalWeek(e.target.value)}
            />
          </div>

          {/* Birth Location */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              Place of Birth
            </label>
            <Input
              placeholder="Hospital / clinic name"
              value={placeOfBirth}
              onChange={(e) => setPlaceOfBirth(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-foreground mb-1.5 block text-sm font-medium">City</label>
              <Input
                placeholder="City"
                value={cityOfBirth}
                onChange={(e) => setCityOfBirth(e.target.value)}
              />
            </div>
            <div>
              <label className="text-foreground mb-1.5 block text-sm font-medium">State</label>
              <Input
                placeholder="State"
                value={stateOfBirth}
                onChange={(e) => setStateOfBirth(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-foreground mb-1.5 block text-sm font-medium">Country</label>
              <Input
                placeholder="Country"
                value={countryOfBirth}
                onChange={(e) => setCountryOfBirth(e.target.value)}
              />
            </div>
            <div>
              <label className="text-foreground mb-1.5 block text-sm font-medium">
                Citizenship
              </label>
              <Input
                placeholder="Citizenship"
                value={citizenship}
                onChange={(e) => setCitizenship(e.target.value)}
              />
            </div>
          </div>

          {/* Parents */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-foreground mb-1.5 block text-sm font-medium">
                Father&apos;s Name
              </label>
              <Input
                placeholder="Father's name"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-foreground mb-1.5 block text-sm font-medium">
                Mother&apos;s Name
              </label>
              <Input
                placeholder="Mother's name"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Any additional notes…"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Saving…' : profile ? 'Save Changes' : 'Create Profile'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
