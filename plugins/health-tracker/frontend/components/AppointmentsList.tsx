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
import { Plus, Search, Trash2, Calendar, Filter, MapPin, Stethoscope } from 'lucide-react';
import type { AppointmentRecord, AppointmentType, AppointmentStatus, MemberRecord } from '../types';
import { healthApi } from '../api';

const TYPE_LABELS: Record<AppointmentType, string> = {
  checkup: '🩺 Checkup',
  specialist: '👨‍⚕️ Specialist',
  dental: '🦷 Dental',
  vision: '👁️ Vision',
  vaccination: '💉 Vaccination',
  lab_work: '🧪 Lab Work',
  therapy: '🧠 Therapy',
  emergency: '🚨 Emergency',
  follow_up: '🔄 Follow-up',
  other: '📋 Other',
};

const ALL_TYPES: AppointmentType[] = [
  'checkup',
  'specialist',
  'dental',
  'vision',
  'vaccination',
  'lab_work',
  'therapy',
  'emergency',
  'follow_up',
  'other',
];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
  no_show: 'No Show',
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  rescheduled: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  no_show: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

function formatDate(date: string): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Add Appointment Drawer
// ---------------------------------------------------------------------------

interface AddAppointmentDrawerProps {
  members: MemberRecord[];
  onSaved: () => void;
}

function AddAppointmentDrawer({ members, onSaved }: AddAppointmentDrawerProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [memberId, setMemberId] = useState('');
  const [type, setType] = useState<AppointmentType>('checkup');
  const [doctorName, setDoctorName] = useState('');
  const [facility, setFacility] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState('30');
  const [reason, setReason] = useState('');
  const [reminderDays, setReminderDays] = useState('1');
  const [cost, setCost] = useState('');
  const [insuranceCovered, setInsuranceCovered] = useState(false);
  const [notes, setNotes] = useState('');

  function resetForm() {
    setMemberId('');
    setType('checkup');
    setDoctorName('');
    setFacility('');
    setDate(todayISO());
    setTime('09:00');
    setDuration('30');
    setReason('');
    setReminderDays('1');
    setCost('');
    setInsuranceCovered(false);
    setNotes('');
  }

  async function handleSave() {
    if (!memberId || !doctorName.trim() || !date || !time) return;

    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    setSaving(true);
    try {
      await healthApi.createAppointment({
        memberId,
        memberName: member.name,
        type,
        doctorName: doctorName.trim(),
        facility: facility.trim() || undefined,
        date,
        time,
        duration: parseInt(duration, 10) || 30,
        reason: reason.trim() || undefined,
        reminderDays: parseInt(reminderDays, 10) || 1,
        cost: parseFloat(cost) || undefined,
        insuranceCovered,
        notes: notes.trim() || undefined,
      });

      resetForm();
      setOpen(false);
      onSaved();
    } catch (err) {
      console.error('Failed to create appointment:', err);
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
          <DrawerTitle>Schedule Appointment</DrawerTitle>
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

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Appointment Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AppointmentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Doctor */}
          <div className="space-y-1.5">
            <Label htmlFor="appt-doctor">Doctor / Provider *</Label>
            <Input
              id="appt-doctor"
              placeholder="Doctor's name"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />
          </div>

          {/* Facility */}
          <div className="space-y-1.5">
            <Label htmlFor="appt-facility">Facility</Label>
            <Input
              id="appt-facility"
              placeholder="Hospital, clinic, or office"
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appt-date">Date *</Label>
              <Input
                id="appt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-time">Time *</Label>
              <Input
                id="appt-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Duration + Reminder */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appt-duration">Duration (min)</Label>
              <Input
                id="appt-duration"
                type="number"
                min="5"
                step="5"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-reminder">Remind (days before)</Label>
              <Input
                id="appt-reminder"
                type="number"
                min="0"
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="appt-reason">Reason</Label>
            <Input
              id="appt-reason"
              placeholder="Reason for visit"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Cost + Insurance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appt-cost">Estimated Cost</Label>
              <Input
                id="appt-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Label htmlFor="appt-insurance" className="cursor-pointer">
                Insurance Covered
              </Label>
              <Button
                id="appt-insurance"
                variant={insuranceCovered ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInsuranceCovered(!insuranceCovered)}
              >
                {insuranceCovered ? 'Yes' : 'No'}
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="appt-notes">Notes</Label>
            <Textarea
              id="appt-notes"
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
            disabled={saving || !memberId || !doctorName.trim() || !date || !time}
          >
            {saving ? 'Saving...' : 'Schedule'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Appointment Card
// ---------------------------------------------------------------------------

interface AppointmentCardProps {
  appointment: AppointmentRecord;
  onDeleted: () => void;
}

function AppointmentCard({ appointment, onDeleted }: AppointmentCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPast = appointment.date < new Date().toISOString().split('T')[0];
  const typeLabel = TYPE_LABELS[appointment.type] ?? '📋 Other';

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await healthApi.deleteAppointment(appointment.id);
      onDeleted();
    } catch (err) {
      console.error('Failed to delete appointment:', err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Card className={`md:hover:shadow-md transition-shadow ${isPast && appointment.status === 'scheduled' ? 'opacity-60' : ''}`}>
      <CardContent className="flex items-start gap-3 p-4">
        {/* Left: calendar icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-medium leading-tight">{typeLabel}</p>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{formatDate(appointment.date)}</span>
            <span>·</span>
            <span>{formatTime(appointment.time)}</span>
            <span>·</span>
            <span>{appointment.memberName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Stethoscope className="h-3 w-3" />
            <span>{appointment.doctorName}</span>
            {appointment.facility && (
              <>
                <span>·</span>
                <MapPin className="h-3 w-3" />
                <span>{appointment.facility}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge className={`text-[10px] ${STATUS_COLORS[appointment.status]}`}>
              {STATUS_LABELS[appointment.status]}
            </Badge>
            {appointment.reason && (
              <Badge variant="secondary" className="text-[10px]">
                {appointment.reason}
              </Badge>
            )}
            {appointment.insuranceCovered && (
              <Badge variant="outline" className="text-[10px]">
                🛡️ Insured
              </Badge>
            )}
            {appointment.cost > 0 && (
              <Badge variant="outline" className="text-[10px]">
                ${appointment.cost.toFixed(0)}
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
// Appointments List (main export)
// ---------------------------------------------------------------------------

interface AppointmentsListProps {
  appointments: AppointmentRecord[];
  members: MemberRecord[];
  onRefresh: () => void;
}

export function AppointmentsList({ appointments, members, onRefresh }: AppointmentsListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return [...appointments]
      .filter((appt) => {
        if (statusFilter !== 'all' && appt.status !== statusFilter) return false;
        if (!term) return true;

        return (
          appt.doctorName.toLowerCase().includes(term) ||
          appt.memberName.toLowerCase().includes(term) ||
          appt.facility?.toLowerCase().includes(term) ||
          appt.reason?.toLowerCase().includes(term) ||
          appt.type.toLowerCase().includes(term) ||
          appt.notes?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        // Upcoming first, then past
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return -dateCompare; // ascending by date
        return a.time.localeCompare(b.time);
      });
  }, [appointments, search, statusFilter]);

  const filterOptions: { label: string; value: 'all' | AppointmentStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <div className="space-y-4">
      {/* Header: title + add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Appointments</h2>
        <AddAppointmentDrawer members={members} onSaved={onRefresh} />
      </div>

      {/* Search + filter row */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search appointments..."
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

      {/* Appointment cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {appointments.length === 0
            ? 'No appointments yet. Schedule your first one!'
            : 'No appointments match your filters.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} onDeleted={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
