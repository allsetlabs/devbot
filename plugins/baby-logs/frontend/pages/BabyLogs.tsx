import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useCrudMutation } from '@devbot/app/hooks/useCrudMutation';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Input } from '@allsetlabs/reusable/components/ui/input';
import { Textarea } from '@allsetlabs/reusable/components/ui/textarea';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import {
  Baby,
  Menu,
  Trash2,
  Milk,
  Droplets,
  FlameKindling,
  Timer,
  Pause,
  Play,
  X,
  ChevronDown,
  Download,
  FileText,
  Table,
  BarChart2,
  Weight,
  Ruler,
  Settings,
} from 'lucide-react';
import { babyLogsApi } from '../api';
import {
  toDateKey,
  roundToNearest5,
  toLocalDatetimeValue,
  nowTimeValue,
  nowDateValue,
  formatTime,
  formatDateLabel,
  formatMsTimer,
} from '@devbot/app/lib/format';
import { SlideNav } from '@devbot/app/components/SlideNav';
import { BabyProfileDrawer } from '../components/BabyProfileDrawer';
import type { ProfileFormData } from '../components/BabyProfileDrawer';
import type { BabyLog, FeedingType, BreastSide } from '../types';

// ─── Announcer ────────────────────────────────────────────────────────────────

/** Call once from a user-gesture (tap) to unlock speechSynthesis on iOS */
function unlockSpeech() {
  const silent = new SpeechSynthesisUtterance('');
  silent.volume = 0;
  speechSynthesis.speak(silent);
}

function announce(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAgo(ms: number): string {
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours}h ${mins}m ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function formatGap(ms: number): string {
  if (ms <= 0) return '';
  const totalMins = Math.floor(ms / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `+${days}d ${hours}h`;
  if (hours > 0) return `+${hours}h ${mins}m`;
  return `+${mins}m`;
}

/** Effective end time for gap calculation — always use loggedAt */
function effectiveEnd(log: BabyLog): number {
  return new Date(log.loggedAt).getTime();
}

function groupByDate(logs: BabyLog[]): { date: string; logs: BabyLog[] }[] {
  const groups: Map<string, BabyLog[]> = new Map();
  for (const log of logs) {
    const key = new Date(log.loggedAt).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(log);
  }
  return Array.from(groups.entries()).map(([, logs]) => ({
    date: logs[0].loggedAt,
    logs,
  }));
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportTableCsv(logs: BabyLog[]): void {
  const header = [
    'id',
    'type',
    'feeding_type',
    'logged_at',
    'duration_min',
    'ml',
    'breast_side',
    'wet_pct',
    'poop',
    'note',
  ];
  const rows = [...logs]
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
    .map((l) => [
      l.id,
      l.logType,
      l.feedingType ?? '',
      new Date(l.loggedAt).toLocaleString('en-US', { hour12: false }),
      l.feedingDurationMin ?? '',
      l.feedingMl ?? '',
      l.breastSide ?? '',
      l.diaperWetPct ?? '',
      l.diaperPoop ?? '',
      l.note ? `"${l.note.replace(/"/g, '""')}"` : '',
    ]);
  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadText(csv, 'baby-logs.csv', 'text/csv');
}

function logShorthand(l: BabyLog): string {
  if (l.logType === 'feeding') {
    const prefix = l.feedingType === 'breast' ? 'BF' : 'F';
    const parts: string[] = [];
    if (l.feedingDurationMin !== null) parts.push(`${l.feedingDurationMin}m`);
    if (l.feedingMl !== null) parts.push(`${l.feedingMl}ml`);
    if (l.breastSide)
      parts.push(l.breastSide === 'both' ? 'B' : l.breastSide === 'left' ? 'L' : 'R');
    return parts.length > 0 ? `${prefix}:${parts.join('/')}` : prefix;
  }
  const parts: string[] = [];
  if (l.diaperWetPct !== null) parts.push(`W:${l.diaperWetPct}%`);
  if (l.diaperPoop !== null) parts.push(`P:${l.diaperPoop === 'large' ? 'lg' : 'sm'}`);
  return parts.join(' ');
}

function exportText(logs: BabyLog[]): void {
  const KEY =
    'Key: F=Bottle(dur/ml) BF=Breast(dur/side) W=Wet(%) P=Poop(sm/lg) | e.g. 02:30am F:30m/45ml BF:20m/L W:75% P:lg (note)';
  const sorted = [...logs].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );
  const groups = groupByDate(sorted);
  const lines: string[] = [KEY, ''];
  for (const group of groups) {
    const dateLabel = new Date(group.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    lines.push(`── ${dateLabel} ──`);
    const dayLogs = [...group.logs].sort(
      (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
    );

    // Group by minute bucket (same HH:MM → same line)
    const buckets = new Map<string, BabyLog[]>();
    for (const l of dayLogs) {
      const d = new Date(l.loggedAt);
      const h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'pm' : 'am';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const key = `${String(h12).padStart(2, '0')}:${m}${ampm}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(l);
    }

    for (const [t, bucket] of buckets) {
      const shorthands = bucket.map(logShorthand).filter(Boolean);
      const notes = [...new Set(bucket.map((l) => l.note).filter((n): n is string => !!n))];
      let entry = `${t} ${shorthands.join(' ')}`;
      if (notes.length > 0) entry += ` (${notes.join('; ')})`;
      lines.push(entry);
    }
    lines.push('');
  }
  downloadText(lines.join('\n'), 'baby-logs.txt', 'text/plain');
}

function downloadText(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function breastSideLabel(side: BreastSide | null): string {
  if (side === 'left') return 'L';
  if (side === 'right') return 'R';
  if (side === 'both') return 'L+R';
  return '';
}

function logTypeLabel(log: BabyLog): string {
  if (log.logType === 'weight') {
    return log.weightKg !== null ? `Weight · ${log.weightKg} kg` : 'Weight';
  }
  if (log.logType === 'height') {
    return log.heightCm !== null ? `Height · ${log.heightCm} cm` : 'Height';
  }
  if (log.logType === 'feeding') {
    if (log.feedingType === 'breast') {
      const side = log.breastSide ? ` · ${breastSideLabel(log.breastSide)}` : '';
      const dur = log.feedingDurationMin ? ` · ${log.feedingDurationMin}m` : '';
      return `Breast${side}${dur}`;
    }
    const ml = log.feedingMl ? ` · ${log.feedingMl}ml` : '';
    return `Bottle${ml}`;
  }
  if (log.diaperWetPct !== null && log.diaperPoop === null) return `Wet · ${log.diaperWetPct}%`;
  if (log.diaperPoop !== null && log.diaperWetPct === null) return `Poop · ${log.diaperPoop}`;
  // Both set (legacy or combined)
  const parts: string[] = [];
  if (log.diaperWetPct !== null) parts.push(`Wet ${log.diaperWetPct}%`);
  if (log.diaperPoop !== null) parts.push(`Poop (${log.diaperPoop})`);
  return parts.length > 0 ? `Diaper · ${parts.join(' + ')}` : 'Diaper';
}

function logTypeIcon(log: BabyLog) {
  if (log.logType === 'weight') return <Weight className="text-primary h-4 w-4" />;
  if (log.logType === 'height') return <Ruler className="text-primary h-4 w-4" />;
  if (log.logType === 'feeding') return <Milk className="text-primary h-4 w-4" />;
  if (log.diaperPoop !== null && log.diaperWetPct === null)
    return <FlameKindling className="text-primary h-4 w-4" />;
  return <Droplets className="text-primary h-4 w-4" />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DrawerMode =
  | 'add-log'
  | 'timer-duration'
  | 'timer-end'
  | 'edit-feeding'
  | 'edit-wet'
  | 'edit-poop'
  | 'edit-weight'
  | 'edit-height';

type WetPct = 25 | 50 | 75 | 100;
type PoopSize = 'small' | 'large';
type FilterType = 'all' | 'feeding' | 'wet' | 'poop' | 'weight' | 'height' | 'ba';

interface FeedingTimer {
  originalStartedAt: number; // when timer was first started (never changes)
  startedAt: number; // timestamp when current segment started
  accumulatedMs: number; // ms from completed segments
  durationMs: number; // target duration
  paused: boolean;
  expired: boolean;
  expiredAt: number | null; // when the countdown hit zero
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface WetPickerProps {
  value: WetPct | null;
  onChange: (v: WetPct | null) => void;
  disabled?: boolean;
}
function WetPicker({ value, onChange, disabled }: WetPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {([25, 50, 75, 100] as const).map((pct) => (
        <Button
          key={pct}
          variant={value === pct ? 'default' : 'outline'}
          className="h-14 flex-col gap-0.5 text-sm font-bold"
          disabled={disabled}
          onClick={() => onChange(value === pct ? null : pct)}
        >
          <Droplets className="h-3.5 w-3.5" />
          {pct}%
        </Button>
      ))}
    </div>
  );
}

interface PoopPickerProps {
  value: PoopSize | null;
  onChange: (v: PoopSize | null) => void;
  disabled?: boolean;
}
function PoopPicker({ value, onChange, disabled }: PoopPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['small', 'large'] as const).map((size) => (
        <Button
          key={size}
          variant={value === size ? 'default' : 'outline'}
          className="h-14 flex-col gap-1 text-sm font-bold capitalize"
          disabled={disabled}
          onClick={() => onChange(value === size ? null : size)}
        >
          <span className={size === 'large' ? 'text-xl' : 'text-base'}>💩</span>
          {size}
        </Button>
      ))}
    </div>
  );
}

interface FedByPickerProps {
  value: string;
  onChange: (v: string) => void;
  locked?: string[];
}
const FED_BY_PRESETS = [
  { name: 'Daddy', emoji: '💙' },
  { name: 'Mommy', emoji: '🩷' },
] as const;

function fedByDisplay(fedBy: string): string {
  return fedBy
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => {
      const lower = name.toLowerCase();
      if (lower === 'mommy') return '🩷';
      if (lower === 'daddy') return '💙';
      return name;
    })
    .join(' ');
}

function FedByPicker({ value, onChange, locked = [] }: FedByPickerProps) {
  const selected = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const presetNames = FED_BY_PRESETS.map((p) => p.name);
  const customParts = selected.filter(
    (s) => !presetNames.includes(s as (typeof presetNames)[number])
  );
  const customValue = customParts.join(', ');

  const togglePreset = (name: string) => {
    if (locked.includes(name)) return;
    const next = selected.includes(name) ? selected.filter((s) => s !== name) : [...selected, name];
    onChange(next.join(', '));
  };

  const handleCustomChange = (raw: string) => {
    const presetSelected = selected.filter((s) =>
      presetNames.includes(s as (typeof presetNames)[number])
    );
    const customNames = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onChange([...presetSelected, ...customNames].join(', '));
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {FED_BY_PRESETS.map(({ name, emoji }) => (
          <Button
            key={name}
            variant={selected.includes(name) ? 'default' : 'outline'}
            className={`h-11 gap-2 font-medium ${locked.includes(name) ? 'opacity-80' : ''}`}
            onClick={() => togglePreset(name)}
          >
            <span className="text-base">{emoji}</span>
            {name}
          </Button>
        ))}
      </div>
      <Input
        value={customValue}
        onChange={(e) => handleCustomChange(e.target.value)}
        placeholder="Other (comma-separated)"
      />
    </div>
  );
}

interface MlPickerProps {
  value: string;
  onChange: (v: string) => void;
}
function MlPicker({ value, onChange }: MlPickerProps) {
  return (
    <div className="space-y-2">
      <Input
        type="number"
        inputMode="numeric"
        placeholder="Amount (ml)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="grid grid-cols-4 gap-2">
        {[20, 40, 60, 80].map((ml) => (
          <Button
            key={ml}
            variant={value === String(ml) ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(String(ml))}
          >
            {ml}
          </Button>
        ))}
      </div>
    </div>
  );
}

const DURATION_PRESETS = [15, 30, 45, 60];

interface DurationPickerProps {
  value: number;
  onChange: (v: number) => void;
}
function DurationPicker({ value, onChange }: DurationPickerProps) {
  const isCustom = !DURATION_PRESETS.includes(value);
  return (
    <div className="space-y-2">
      <Input
        type="number"
        inputMode="numeric"
        placeholder="Duration (min)"
        value={isCustom ? String(value) : ''}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v > 0) onChange(v);
        }}
        className="w-full"
      />
      <div className="grid grid-cols-4 gap-2">
        {DURATION_PRESETS.map((min) => (
          <Button
            key={min}
            variant={value === min ? 'default' : 'outline'}
            className="h-12 font-bold"
            onClick={() => onChange(min)}
          >
            {min}m
          </Button>
        ))}
      </div>
    </div>
  );
}

interface FeedingTypePickerProps {
  value: FeedingType | null;
  onChange: (v: FeedingType) => void;
}
function FeedingTypePicker({ value, onChange }: FeedingTypePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant={value === 'bottle' ? 'default' : 'outline'}
        className="h-11 gap-2 font-medium"
        onClick={() => onChange('bottle')}
      >
        <Milk className="h-4 w-4" />
        Bottle
      </Button>
      <Button
        variant={value === 'breast' ? 'default' : 'outline'}
        className="h-11 gap-2 font-medium"
        onClick={() => onChange('breast')}
      >
        <Baby className="h-4 w-4" />
        Breast
      </Button>
    </div>
  );
}

interface BreastSidePickerProps {
  value: BreastSide | null;
  onChange: (v: BreastSide | null) => void;
}
function BreastSidePicker({ value, onChange }: BreastSidePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { side: 'left' as const, label: 'Left' },
        { side: 'right' as const, label: 'Right' },
        { side: 'both' as const, label: 'Both' },
      ].map(({ side, label }) => (
        <Button
          key={side}
          variant={value === side ? 'default' : 'outline'}
          className="h-11 font-medium"
          onClick={() => onChange(value === side ? null : side)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

interface LogCardProps {
  log: BabyLog;
  onDelete: (id: string) => void;
  onEdit: (log: BabyLog) => void;
}

function LogCard({ log, onDelete, onEdit }: LogCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasLongNote = log.note && log.note.length > 60;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="border-border bg-card active:bg-muted/30 flex cursor-pointer items-start gap-3 rounded-lg border p-3"
      onClick={() => onEdit(log)}
    >
      <div className="bg-primary/10 mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
        {logTypeIcon(log)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-foreground text-sm font-medium">{logTypeLabel(log)}</div>
        <div className="text-muted-foreground mt-0.5 text-xs">
          {log.logType === 'feeding'
            ? `${formatTime(log.loggedAt)} + ${log.feedingDurationMin ?? 30}m`
            : formatTime(log.loggedAt)}
          {log.fedBy && <span className="text-primary/70 ml-2">· {fedByDisplay(log.fedBy)}</span>}
        </div>
        {log.note && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div
            className="text-muted-foreground mt-1 text-xs"
            onClick={(e) => {
              if (hasLongNote) {
                e.stopPropagation();
                setExpanded((v) => !v);
              }
            }}
          >
            <span className={expanded ? '' : 'line-clamp-2'}>{log.note}</span>
            {hasLongNote && (
              <span className="text-primary ml-1 inline-flex items-center">
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
              </span>
            )}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="iconSm"
        className="flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(log.id);
        }}
      >
        <Trash2 className="text-muted-foreground h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BabyLogs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawFilter = searchParams.get('filter') as FilterType | null;
  const filter: FilterType =
    rawFilter && ['all', 'feeding', 'wet', 'poop', 'weight', 'height', 'ba'].includes(rawFilter)
      ? rawFilter
      : 'all';
  const personFilter = searchParams.get('person') ?? '';

  const setFilter = (f: FilterType) => {
    const next: Record<string, string> = {};
    if (f !== 'all') next.filter = f;
    if (personFilter) next.person = personFilter;
    setSearchParams(next, { replace: true });
  };

  const setPersonFilter = (name: string) => {
    const next: Record<string, string> = {};
    if (filter !== 'all') next.filter = filter;
    if (personFilter === name) {
      /* toggle off — don't set person */
    } else next.person = name;
    setSearchParams(next, { replace: true });
  };

  const [navOpen, setNavOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Baby profile state
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 30;

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('add-log');
  const [editingLog, setEditingLog] = useState<BabyLog | null>(null);

  // Add Log form state
  const [addDate, setAddDate] = useState(nowDateValue());
  const [addTime, setAddTime] = useState(nowTimeValue());
  const [addWet, setAddWet] = useState<WetPct | null>(null);
  const [addPoop, setAddPoop] = useState<PoopSize | null>(null);
  const [addFeedingType, setAddFeedingType] = useState<FeedingType | null>(null);
  const [addMl, setAddMl] = useState('');
  const [addDuration, setAddDuration] = useState<number>(30);
  const [addBreastSide, setAddBreastSide] = useState<BreastSide | null>(null);
  const [addFedBy, setAddFedBy] = useState('');
  const [addNote, setAddNote] = useState('');
  const [addWeightKg, setAddWeightKg] = useState('');
  const [addHeightCm, setAddHeightCm] = useState('');

  // Edit form state
  const [editLoggedAt, setEditLoggedAt] = useState('');
  const [editFeedingType, setEditFeedingType] = useState<FeedingType | null>(null);
  const [editFeedingDuration, setEditFeedingDuration] = useState<number>(30);
  const [editMl, setEditMl] = useState('');
  const [editBreastSide, setEditBreastSide] = useState<BreastSide | null>(null);
  const [editWet, setEditWet] = useState<WetPct | null>(null);
  const [editPoop, setEditPoop] = useState<PoopSize | null>(null);
  const [editFedBy, setEditFedBy] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editWeightKg, setEditWeightKg] = useState('');
  const [editHeightCm, setEditHeightCm] = useState('');

  // Feeding timer
  const [feedingTimer, setFeedingTimer] = useState<FeedingTimer | null>(null);
  const [timerDuration, setTimerDuration] = useState<number>(20); // minutes
  const [timerFeedingType, setTimerFeedingType] = useState<FeedingType>('bottle');
  const [timerMl, setTimerMl] = useState('');
  const [timerBreastSide, setTimerBreastSide] = useState<BreastSide | null>(null);
  const [timerWet, setTimerWet] = useState<WetPct | null>(null);
  const [timerPoop, setTimerPoop] = useState<PoopSize | null>(null);
  const [timerFedBy, setTimerFedBy] = useState('');
  const [timerNote, setTimerNote] = useState('');
  const [, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const announcerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Baby Profile ────────────────────────────────────────────────────────
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['baby-profiles'],
    queryFn: async () => {
      const profiles = await babyLogsApi.listBabyProfiles();
      return profiles.length > 0 ? profiles[0] : null;
    },
  });

  const profile = profileData ?? null;

  const saveProfileMutation = useCrudMutation(
    async (data: ProfileFormData) => {
      if (profile) {
        return babyLogsApi.updateBabyProfile(profile.id, data);
      }
      return babyLogsApi.createBabyProfile(data);
    },
    [['baby-profiles']]
  );

  const handleSaveProfile = useCallback(
    async (data: ProfileFormData) => {
      await saveProfileMutation.mutateAsync(data);
    },
    [saveProfileMutation]
  );

  // ─── Fetch ──────────────────────────────────────────────────────────────
  const apiType = filter === 'all' ? undefined : filter === 'ba' ? 'feeding' : filter;

  const {
    data: logsData,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    hasNextPage: hasMore,
    fetchNextPage,
    error: logsError,
  } = useInfiniteQuery({
    queryKey: ['baby-logs', filter],
    queryFn: ({ pageParam }) => {
      const limit = filter === 'ba' ? 500 : PAGE_SIZE;
      return babyLogsApi.listBabyLogs(apiType, limit, pageParam);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (filter === 'ba') return undefined;
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((sum, page) => sum + page.length, 0);
    },
    initialPageParam: 0,
  });

  const logs = useMemo(() => logsData?.pages.flat() ?? [], [logsData]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchNextPage]);

  // ─── Timer tick ──────────────────────────────────────────────────────────
  // Keep ticking even after expiry so overtime/total stay live
  useEffect(() => {
    if (!feedingTimer || feedingTimer.paused) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setFeedingTimer((prev) => {
        if (!prev || prev.paused || prev.expired) return prev;
        const elapsed = prev.accumulatedMs + (Date.now() - prev.startedAt);
        if (elapsed >= prev.durationMs) {
          navigator.vibrate?.([500, 200, 500, 200, 500]);
          return { ...prev, expired: true, expiredAt: Date.now() };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedingTimer?.paused]);

  // ─── Tick every minute for "time since last log" ─────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // ─── Announce on timer expiry + every 5 min after ────────────────────────
  useEffect(() => {
    if (!feedingTimer?.expired || !feedingTimer.expiredAt) return;
    const { durationMs, expiredAt } = feedingTimer;
    const timerMins = Math.round(durationMs / 60000);

    // Immediate announcement on expiry
    announce(`${timerMins} minute${timerMins !== 1 ? 's' : ''} timer complete`);

    // Every 5 min after expiry
    announcerRef.current = setInterval(
      () => {
        const overtimeMins = Math.round((Date.now() - expiredAt) / 60000);
        const totalMins = timerMins + overtimeMins;
        announce(
          `${overtimeMins} minute${overtimeMins !== 1 ? 's' : ''} past ${timerMins} minute timer, total ${totalMins} minutes`
        );
      },
      5 * 60 * 1000
    );

    return () => {
      if (announcerRef.current) clearInterval(announcerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedingTimer?.expired]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function timerElapsedMs(): number {
    if (!feedingTimer) return 0;
    if (feedingTimer.paused || feedingTimer.expired) return feedingTimer.accumulatedMs;
    return feedingTimer.accumulatedMs + (Date.now() - feedingTimer.startedAt);
  }

  function timerRemainingMs(): number {
    if (!feedingTimer) return 0;
    return Math.max(0, feedingTimer.durationMs - timerElapsedMs());
  }

  /** Total ms from when timer started (including overtime after expiry) */
  function timerTotalMs(): number {
    if (!feedingTimer) return 0;
    if (feedingTimer.expired && feedingTimer.expiredAt) {
      return feedingTimer.durationMs + (Date.now() - feedingTimer.expiredAt);
    }
    return timerElapsedMs();
  }

  /** Ms elapsed since the countdown hit zero */
  function timerOvertimeMs(): number {
    if (!feedingTimer?.expired || !feedingTimer.expiredAt) return 0;
    return Date.now() - feedingTimer.expiredAt;
  }

  function formatOvertime(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) return `${mins}m ${secs}s past`;
    return `${secs}s past`;
  }

  // ─── Drawer open/close ───────────────────────────────────────────────────
  const resetAddForm = () => {
    setAddDate(nowDateValue());
    setAddTime(nowTimeValue());
    setAddWet(null);
    setAddPoop(null);
    setAddFeedingType(null);
    setAddMl('');
    setAddDuration(30);
    setAddBreastSide(null);
    setAddFedBy('');
    setAddNote('');
    setAddWeightKg('');
    setAddHeightCm('');
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingLog(null);
  };

  const openAddDrawer = () => {
    resetAddForm();
    setDrawerMode('add-log');
    setDrawerOpen(true);
  };

  // Auto-open add drawer when navigated with ?add=true
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      openAddDrawer();
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTimerDurationDrawer = () => {
    setDrawerMode('timer-duration');
    setDrawerOpen(true);
  };

  const openEditDrawer = (log: BabyLog) => {
    setEditingLog(log);
    setEditLoggedAt(toLocalDatetimeValue(log.loggedAt));
    setEditFedBy(log.fedBy ?? '');
    setEditNote(log.note ?? '');
    if (log.logType === 'weight') {
      setEditWeightKg(log.weightKg !== null ? String(log.weightKg) : '');
      setDrawerMode('edit-weight');
    } else if (log.logType === 'height') {
      setEditHeightCm(log.heightCm !== null ? String(log.heightCm) : '');
      setDrawerMode('edit-height');
    } else if (log.logType === 'feeding') {
      setEditFeedingType(log.feedingType ?? 'bottle');
      setEditFeedingDuration(log.feedingDurationMin ?? 30);
      setEditMl(log.feedingMl ? String(log.feedingMl) : '');
      setEditBreastSide(log.breastSide ?? null);
      setDrawerMode('edit-feeding');
    } else if (log.diaperPoop !== null && log.diaperWetPct === null) {
      setEditPoop(log.diaperPoop ?? null);
      setDrawerMode('edit-poop');
    } else {
      setEditWet((log.diaperWetPct as WetPct) ?? null);
      setDrawerMode('edit-wet');
    }
    setDrawerOpen(true);
  };

  // ─── Add Log ─────────────────────────────────────────────────────────────
  const addLogMutation = useCrudMutation(
    async (input: {
      loggedAt: string;
      wet: WetPct | null;
      poop: PoopSize | null;
      feedingType: FeedingType | null;
      ml: string;
      duration: number;
      breastSide: BreastSide | null;
      fedBy: string;
      note: string;
      weightKg: string;
      heightCm: string;
    }) => {
      if (input.wet !== null) {
        await babyLogsApi.createBabyLog({
          logType: 'diaper',
          diaperWetPct: input.wet,
          diaperPoop: null,
          fedBy: input.fedBy || null,
          note: input.note || null,
          loggedAt: input.loggedAt,
        });
      }
      if (input.poop !== null) {
        await babyLogsApi.createBabyLog({
          logType: 'diaper',
          diaperWetPct: null,
          diaperPoop: input.poop,
          fedBy: input.fedBy || null,
          note: input.note || null,
          loggedAt: input.loggedAt,
        });
      }
      if (input.feedingType !== null) {
        const ml = parseInt(input.ml, 10);
        await babyLogsApi.createBabyLog({
          logType: 'feeding',
          feedingType: input.feedingType,
          feedingDurationMin: input.duration,
          feedingMl: input.feedingType === 'bottle' ? (isNaN(ml) ? null : ml) : null,
          breastSide: input.feedingType === 'breast' ? input.breastSide : null,
          fedBy: input.fedBy || null,
          note: input.note || null,
          loggedAt: input.loggedAt,
        });
      }
      if (input.weightKg.trim()) {
        const kg = parseFloat(input.weightKg);
        if (!isNaN(kg)) {
          await babyLogsApi.createBabyLog({
            logType: 'weight',
            weightKg: kg,
            note: input.note || null,
            loggedAt: input.loggedAt,
          });
        }
      }
      if (input.heightCm.trim()) {
        const cm = parseFloat(input.heightCm);
        if (!isNaN(cm)) {
          await babyLogsApi.createBabyLog({
            logType: 'height',
            heightCm: cm,
            note: input.note || null,
            loggedAt: input.loggedAt,
          });
        }
      }
    },
    [['baby-logs']],
    { onSuccess: () => closeDrawer() }
  );

  const handleSaveAddLog = () => {
    const hasDiaper = addWet !== null || addPoop !== null;
    const hasFeeding = addFeedingType !== null;
    const hasWeight = addWeightKg.trim() !== '';
    const hasHeight = addHeightCm.trim() !== '';
    if (!hasDiaper && !hasFeeding && !hasWeight && !hasHeight) return;

    addLogMutation.mutate({
      loggedAt: new Date(`${addDate}T${addTime}`).toISOString(),
      wet: addWet,
      poop: addPoop,
      feedingType: addFeedingType,
      ml: addMl,
      duration: addDuration,
      breastSide: addBreastSide,
      fedBy: addFedBy,
      note: addNote,
      weightKg: addWeightKg,
      heightCm: addHeightCm,
    });
  };

  // ─── Timer ───────────────────────────────────────────────────────────────
  const handleStartTimer = () => {
    unlockSpeech(); // unlock speechSynthesis on iOS via user gesture
    const now = Date.now();
    setFeedingTimer({
      originalStartedAt: now,
      startedAt: now,
      accumulatedMs: 0,
      durationMs: timerDuration * 60 * 1000,
      paused: false,
      expired: false,
      expiredAt: null,
    });
    setTimerMl('');
    setTimerBreastSide(null);
    setTimerWet(null);
    setTimerPoop(null);
    setTimerFedBy('');
    setTimerNote('');
    closeDrawer();
  };

  const handlePauseResumeTimer = () => {
    setFeedingTimer((prev) => {
      if (!prev) return prev;
      if (prev.paused) {
        return { ...prev, paused: false, startedAt: Date.now() };
      }
      return {
        ...prev,
        paused: true,
        accumulatedMs: prev.accumulatedMs + (Date.now() - prev.startedAt),
      };
    });
  };

  const handleTimerDone = () => {
    if (announcerRef.current) {
      clearInterval(announcerRef.current);
      announcerRef.current = null;
    }
    speechSynthesis.cancel();
    setDrawerMode('timer-end');
    setDrawerOpen(true);
  };

  const timerEndMutation = useCrudMutation(
    async (input: {
      durationMin: number;
      loggedAt: string;
      feedingType: FeedingType;
      ml: string;
      breastSide: BreastSide | null;
      wet: WetPct | null;
      poop: PoopSize | null;
      fedBy: string;
      note: string;
    }) => {
      const ml = parseInt(input.ml, 10);
      await babyLogsApi.createBabyLog({
        logType: 'feeding',
        feedingType: input.feedingType,
        feedingDurationMin: input.durationMin,
        feedingMl: input.feedingType === 'bottle' ? (isNaN(ml) ? null : ml) : null,
        breastSide: input.feedingType === 'breast' ? input.breastSide : null,
        fedBy: input.fedBy || null,
        note: input.note || null,
        loggedAt: input.loggedAt,
      });
      if (input.wet !== null) {
        await babyLogsApi.createBabyLog({
          logType: 'diaper',
          diaperWetPct: input.wet,
          diaperPoop: null,
          fedBy: input.fedBy || null,
          note: input.note || null,
          loggedAt: input.loggedAt,
        });
      }
      if (input.poop !== null) {
        await babyLogsApi.createBabyLog({
          logType: 'diaper',
          diaperWetPct: null,
          diaperPoop: input.poop,
          fedBy: input.fedBy || null,
          note: input.note || null,
          loggedAt: input.loggedAt,
        });
      }
    },
    [['baby-logs']],
    {
      onSuccess: () => {
        if (announcerRef.current) {
          clearInterval(announcerRef.current);
          announcerRef.current = null;
        }
        speechSynthesis.cancel();
        setFeedingTimer(null);
        closeDrawer();
      },
    }
  );

  const handleSaveTimerEnd = () => {
    if (!feedingTimer) return;
    const totalMs = timerTotalMs();
    timerEndMutation.mutate({
      durationMin: Math.round(totalMs / 60000) || 1,
      loggedAt: new Date(feedingTimer.originalStartedAt).toISOString(),
      feedingType: timerFeedingType,
      ml: timerMl,
      breastSide: timerBreastSide,
      wet: timerWet,
      poop: timerPoop,
      fedBy: timerFedBy,
      note: timerNote,
    });
  };

  // ─── Edit ────────────────────────────────────────────────────────────────
  const updateLogMutation = useCrudMutation(
    ({ id, data }: { id: string; data: Parameters<typeof babyLogsApi.updateBabyLog>[1] }) =>
      babyLogsApi.updateBabyLog(id, data),
    [['baby-logs']],
    { onSuccess: () => closeDrawer() }
  );

  const handleSaveEditFeeding = () => {
    if (!editingLog) return;
    const ml = parseInt(editMl, 10);
    updateLogMutation.mutate({
      id: editingLog.id,
      data: {
        feedingType: editFeedingType,
        feedingDurationMin: editFeedingDuration,
        feedingMl: editFeedingType === 'bottle' ? (isNaN(ml) ? null : ml) : null,
        breastSide: editFeedingType === 'breast' ? editBreastSide : null,
        fedBy: editFedBy || null,
        note: editNote || null,
        loggedAt: new Date(editLoggedAt).toISOString(),
      },
    });
  };

  const handleSaveEditDiaper = () => {
    if (!editingLog) return;
    const payload =
      drawerMode === 'edit-wet'
        ? {
            diaperWetPct: editWet,
            fedBy: editFedBy || null,
            note: editNote || null,
            loggedAt: new Date(editLoggedAt).toISOString(),
          }
        : {
            diaperPoop: editPoop,
            fedBy: editFedBy || null,
            note: editNote || null,
            loggedAt: new Date(editLoggedAt).toISOString(),
          };
    updateLogMutation.mutate({ id: editingLog.id, data: payload });
  };

  const handleSaveEditWeight = () => {
    if (!editingLog) return;
    const kg = parseFloat(editWeightKg);
    if (isNaN(kg)) return;
    updateLogMutation.mutate({
      id: editingLog.id,
      data: {
        weightKg: kg,
        note: editNote || null,
        loggedAt: new Date(editLoggedAt).toISOString(),
      },
    });
  };

  const handleSaveEditHeight = () => {
    if (!editingLog) return;
    const cm = parseFloat(editHeightCm);
    if (isNaN(cm)) return;
    updateLogMutation.mutate({
      id: editingLog.id,
      data: {
        heightCm: cm,
        note: editNote || null,
        loggedAt: new Date(editLoggedAt).toISOString(),
      },
    });
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const deleteLogMutation = useCrudMutation(
    (id: string) => babyLogsApi.deleteBabyLog(id),
    [['baby-logs']]
  );

  const handleDelete = (id: string) => deleteLogMutation.mutate(id);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const saving =
    addLogMutation.isPending ||
    timerEndMutation.isPending ||
    updateLogMutation.isPending ||
    deleteLogMutation.isPending;

  const error =
    (logsError instanceof Error ? logsError.message : null) ??
    (addLogMutation.error instanceof Error ? addLogMutation.error.message : null) ??
    (timerEndMutation.error instanceof Error ? timerEndMutation.error.message : null) ??
    (updateLogMutation.error instanceof Error ? updateLogMutation.error.message : null) ??
    (deleteLogMutation.error instanceof Error ? deleteLogMutation.error.message : null);

  // Compute daily avg ml for below-average filter
  const dailyAvgMl = useMemo(() => {
    if (filter !== 'ba') return new Map<string, number>();
    const dayMap = new Map<string, number[]>();
    for (const l of logs) {
      if (l.logType !== 'feeding' || l.feedingType === 'breast' || l.feedingMl === null) continue;
      const key = toDateKey(l.loggedAt);
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(l.feedingMl);
    }
    const avgMap = new Map<string, number>();
    for (const [key, mls] of dayMap) {
      avgMap.set(key, roundToNearest5(mls.reduce((a, b) => a + b, 0) / mls.length));
    }
    return avgMap;
  }, [logs, filter]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    // Below-average filter: only bottle feeds with ml < daily avg
    if (filter === 'ba') {
      result = result.filter((l) => {
        if (l.logType !== 'feeding' || l.feedingType === 'breast' || l.feedingMl === null)
          return false;
        const avg = dailyAvgMl.get(toDateKey(l.loggedAt)) ?? 0;
        return l.feedingMl < avg;
      });
    }

    // Person filter
    if (personFilter) {
      result = result.filter((l) => {
        if (!l.fedBy) return false;
        const names = l.fedBy.split(',').map((n) => n.trim().toLowerCase());
        return names.includes(personFilter.toLowerCase());
      });
    }

    return result;
  }, [logs, filter, personFilter, dailyAvgMl]);
  const groups = groupByDate(filteredLogs);

  // Unfiltered day groups for header stats (always show full day stats regardless of filter)
  const allDayLogs = useMemo(() => {
    const map = new Map<string, BabyLog[]>();
    for (const log of logs) {
      const key = new Date(log.loggedAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return map;
  }, [logs]);

  const canSaveAdd =
    addWet !== null ||
    addPoop !== null ||
    addFeedingType !== null ||
    addWeightKg.trim() !== '' ||
    addHeightCm.trim() !== '';

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <SlideNav isOpen={navOpen} onClose={() => setNavOpen(false)} />

      {/* Header */}
      <header className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Baby className="text-primary h-6 w-6" />
          <h1 className="text-foreground text-xl font-bold">Baby Logs</h1>
        </div>
        <div className="flex items-center gap-1">
          {profile && (
            <>
              <Button variant="ghost" size="icon" onClick={() => setProfileDrawerOpen(true)}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/baby-logs/analytics')}>
                <BarChart2 className="h-5 w-5" />
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={logs.length === 0}
                  onClick={() => setExportOpen((v) => !v)}
                >
                  <Download className="h-5 w-5" />
                </Button>
                {exportOpen && (
                  <>
                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                    <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
                    <div className="border-border bg-card absolute right-0 top-10 z-40 min-w-40 overflow-hidden rounded-lg border shadow-lg">
                      <Button
                        variant="ghost"
                        className="text-foreground hover:bg-muted/50 active:bg-muted flex w-full items-center gap-2.5 px-4 py-3 text-sm"
                        onClick={() => {
                          exportTableCsv(logs);
                          setExportOpen(false);
                        }}
                      >
                        <Table className="text-primary h-4 w-4" />
                        Table (CSV)
                      </Button>
                      <div className="bg-border h-px" />
                      <Button
                        variant="ghost"
                        className="text-foreground hover:bg-muted/50 active:bg-muted flex w-full items-center gap-2.5 px-4 py-3 text-sm"
                        onClick={() => {
                          exportText(logs);
                          setExportOpen(false);
                        }}
                      >
                        <FileText className="text-primary h-4 w-4" />
                        Text
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="border-destructive bg-destructive/10 text-destructive border-b px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Active timer banner */}
      {feedingTimer && (
        <div
          className={`flex items-center justify-between border-b px-4 py-2 ${
            feedingTimer.expired
              ? 'border-destructive bg-destructive/10 animate-pulse'
              : 'border-primary/20 bg-primary/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <Timer
              className={`h-4 w-4 ${feedingTimer.expired ? 'text-destructive' : 'text-primary'}`}
            />
            <span className="text-foreground text-sm font-medium">
              {feedingTimer.expired
                ? 'Timer done!'
                : feedingTimer.paused
                  ? 'Paused'
                  : timerFeedingType === 'breast'
                    ? 'Nursing…'
                    : 'Feeding…'}
            </span>
            <span className="text-primary font-mono text-sm font-bold">
              {formatMsTimer(timerTotalMs())}
            </span>
            {feedingTimer.expired ? (
              <span className="text-destructive text-xs">
                ({formatOvertime(timerOvertimeMs())})
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">
                ({formatMsTimer(timerRemainingMs())} left)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!feedingTimer.expired && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handlePauseResumeTimer}
              >
                {feedingTimer.paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </Button>
            )}
            <Button size="sm" className="h-7 text-xs" onClick={handleTimerDone}>
              Done
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-7 text-xs"
              onClick={() => {
                if (announcerRef.current) {
                  clearInterval(announcerRef.current);
                  announcerRef.current = null;
                }
                speechSynthesis.cancel();
                setFeedingTimer(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Filter bar — only shown when profile exists */}
      {profile && (
        <div className="border-border border-b px-4 py-2">
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'feeding', 'wet', 'poop', 'weight', 'height', 'ba'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                className="h-7 shrink-0 capitalize"
                onClick={() => setFilter(f)}
              >
                {f === 'ba' ? 'B/A Feeding' : f}
              </Button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            {FED_BY_PRESETS.map((p) => (
              <Button
                key={p.name}
                size="sm"
                variant={personFilter === p.name ? 'default' : 'outline'}
                className="h-7 shrink-0 gap-1"
                onClick={() => setPersonFilter(p.name)}
              >
                <span>{p.emoji}</span>
                <span className="text-xs">{p.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Log list */}
      <main className="flex-1 overflow-y-auto pb-32">
        {/* Profile gate: block logs until a baby profile is created */}
        {profileLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground text-sm">Loading…</span>
          </div>
        )}

        {!profileLoading && !profile && (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <Baby className="text-muted-foreground/40 mb-4 h-14 w-14" />
            <h2 className="text-foreground mb-2 text-lg font-semibold">Baby Profile Required</h2>
            <p className="text-muted-foreground mb-6 max-w-xs text-sm">
              Please add your baby&apos;s details before you can start logging. This only needs to
              be done once.
            </p>
            <Button className="gap-2" onClick={() => setProfileDrawerOpen(true)}>
              <Baby className="h-4 w-4" />
              Add Baby Profile
            </Button>
          </div>
        )}

        {!profileLoading && profile && loading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground text-sm">Loading…</span>
          </div>
        )}

        {!profileLoading && profile && !loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <Baby className="text-muted-foreground/40 mb-3 h-10 w-10" />
            <p className="text-muted-foreground text-sm">No logs yet. Tap + to add one.</p>
          </div>
        )}

        {profile && groups.length > 0 && (
          <div className="px-4 pt-4">
            {groups.map((group, groupIdx) => {
              // Use ALL logs for the day (unfiltered) for header stats
              const dateStr = new Date(group.date).toDateString();
              const fullDayLogs = allDayLogs.get(dateStr) ?? group.logs;

              const totalMl = fullDayLogs
                .filter((l) => l.logType === 'feeding' && l.feedingMl !== null)
                .reduce((sum, l) => sum + (l.feedingMl ?? 0), 0);

              const wetCount = fullDayLogs.filter(
                (l) => l.logType === 'diaper' && l.diaperWetPct !== null
              ).length;
              const poopCount = fullDayLogs.filter(
                (l) => l.logType === 'diaper' && l.diaperPoop !== null
              ).length;

              const dayFeedings = fullDayLogs
                .filter((l) => l.logType === 'feeding')
                .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
              const bottleFeedings = dayFeedings.filter((l) => l.feedingType !== 'breast');
              const breastFeedings = dayFeedings.filter((l) => l.feedingType === 'breast');
              const totalBreastMin = breastFeedings.reduce(
                (s, l) => s + (l.feedingDurationMin ?? 0),
                0
              );
              const mlFeedings = bottleFeedings.filter((l) => l.feedingMl !== null);
              const avgMlPerFeed =
                mlFeedings.length > 0
                  ? roundToNearest5(
                      mlFeedings.reduce((s, l) => s + (l.feedingMl ?? 0), 0) / mlFeedings.length
                    )
                  : null;

              // Gap between this day's first log (chronologically) and the previous day's last log
              const prevGroup = groups[groupIdx + 1];
              const firstLogOfDay = group.logs[group.logs.length - 1];
              const lastLogOfPrevDay = prevGroup?.logs[0];
              const prevDayGapMs = lastLogOfPrevDay
                ? new Date(firstLogOfDay.loggedAt).getTime() -
                  new Date(lastLogOfPrevDay.loggedAt).getTime()
                : null;

              return (
                <div key={group.date} className="mb-5">
                  <div className="bg-background sticky top-0 z-10 mb-2 py-1">
                    <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                      <span>{formatDateLabel(group.date)}</span>
                      <div className="text-primary flex items-center gap-2">
                        {(bottleFeedings.length > 0 || breastFeedings.length > 0) && (
                          <span>
                            {totalMl > 0 ? `${totalMl}ml` : ''}
                            {bottleFeedings.length > 0
                              ? `${totalMl > 0 ? '/' : ''}${bottleFeedings.length}b`
                              : ''}
                            {breastFeedings.length > 0
                              ? ` ${totalBreastMin > 0 ? `${totalBreastMin}m/` : ''}${breastFeedings.length}bf`
                              : ''}
                          </span>
                        )}
                        {(wetCount > 0 || poopCount > 0) && (
                          <span>
                            {wetCount > 0 ? `${wetCount}w` : ''}
                            {wetCount > 0 && poopCount > 0 ? ' ' : ''}
                            {poopCount > 0 ? `${poopCount}p` : ''}
                          </span>
                        )}
                        {filter === 'ba'
                          ? dailyAvgMl.get(toDateKey(group.date)) !== undefined && (
                              <span className="text-muted-foreground/60">
                                avg {dailyAvgMl.get(toDateKey(group.date))}ml
                              </span>
                            )
                          : avgMlPerFeed !== null && (
                              <span className="text-muted-foreground/60">~{avgMlPerFeed}ml/f</span>
                            )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0">
                    {group.logs.map((log, i) => {
                      // logs are newest-first; gap goes between log[i] (newer) and log[i+1] (older)
                      const next = group.logs[i + 1];
                      const gapMs = next
                        ? effectiveEnd(log) - new Date(next.loggedAt).getTime()
                        : 0;
                      const gapLabel = next && gapMs > 0 ? formatGap(gapMs) : null;
                      const isFirst = i === group.logs.length - 1;
                      return (
                        <div key={log.id}>
                          {groupIdx === 0 && i === 0 && (
                            <div className="mb-2 flex items-center gap-2">
                              <div className="bg-border/50 h-px flex-1" />
                              <div className="flex flex-col items-center gap-0.5 text-center">
                                <span className="text-muted-foreground/50 text-[9px] uppercase tracking-wider">
                                  time since last log
                                </span>
                                <span className="text-muted-foreground/70 text-xs font-semibold">
                                  {formatAgo(now - new Date(log.loggedAt).getTime())}
                                </span>
                              </div>
                              <div className="bg-border/50 h-px flex-1" />
                            </div>
                          )}
                          <LogCard log={log} onDelete={handleDelete} onEdit={openEditDrawer} />
                          {next &&
                            (gapLabel ? (
                              <div className="flex items-center gap-2 py-1.5">
                                <div className="bg-border/50 h-px flex-1" />
                                <span className="text-muted-foreground/60 text-xs">{gapLabel}</span>
                                <div className="bg-border/50 h-px flex-1" />
                              </div>
                            ) : (
                              <div className="h-2" />
                            ))}
                          {isFirst && prevDayGapMs !== null && prevDayGapMs > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="bg-border/40 h-px flex-1" />
                              <div className="flex flex-col items-center gap-0.5 text-center">
                                <span className="text-muted-foreground/50 text-[9px] uppercase tracking-wider">
                                  from previous day last log
                                </span>
                                <span className="text-muted-foreground/70 text-xs font-semibold">
                                  {formatGap(prevDayGapMs)}
                                </span>
                              </div>
                              <div className="bg-border/40 h-px flex-1" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />
        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <span className="text-muted-foreground text-sm">Loading more…</span>
          </div>
        )}
      </main>

      {/* FABs — only shown when profile exists */}
      {profile && (
        <div className="safe-area-bottom fixed bottom-0 left-0 right-0 z-20 flex flex-col items-end gap-3 px-6 pb-8 pt-2">
          <Button
            className="h-12 gap-2 rounded-full px-5 shadow-lg"
            onClick={openTimerDurationDrawer}
            disabled={!!feedingTimer}
          >
            <Timer className="h-4 w-4" />
            {feedingTimer ? 'Timer running' : 'Start Timer'}
          </Button>
          <Button className="h-12 gap-2 rounded-full px-5 shadow-lg" onClick={openAddDrawer}>
            + Add Log
          </Button>
        </div>
      )}

      {/* ─── Add Log Drawer ──────────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen && drawerMode === 'add-log'}
        onOpenChange={(o) => !o && closeDrawer()}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add Log</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-8">
            {/* Date & Time */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="w-2/5 shrink-0"
              />
              <Input
                type="time"
                value={addTime}
                onChange={(e) => setAddTime(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="flex-1"
              />
            </div>

            {/* Diaper */}
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Wet <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <WetPicker value={addWet} onChange={setAddWet} disabled={saving} />
            </div>
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Poop <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <PoopPicker value={addPoop} onChange={setAddPoop} disabled={saving} />
            </div>

            {/* Feeding type */}
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Feeding{' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <FeedingTypePicker
                value={addFeedingType}
                onChange={(v) => {
                  setAddFeedingType(v);
                  if (v === 'breast') {
                    setAddFedBy((prev) => {
                      const parts = prev
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      return parts.includes('Mommy') ? prev : [...parts, 'Mommy'].join(', ');
                    });
                  }
                }}
              />
            </div>

            {/* Bottle: ml */}
            {addFeedingType === 'bottle' && (
              <div>
                <p className="text-foreground mb-2 text-sm font-medium">Amount (ml)</p>
                <MlPicker value={addMl} onChange={setAddMl} />
              </div>
            )}

            {/* Breast: side */}
            {addFeedingType === 'breast' && (
              <div>
                <p className="text-foreground mb-2 text-sm font-medium">Side</p>
                <BreastSidePicker value={addBreastSide} onChange={setAddBreastSide} />
              </div>
            )}

            {/* Feeding duration */}
            {addFeedingType !== null && (
              <div>
                <p className="text-foreground mb-2 text-sm font-medium">Duration</p>
                <DurationPicker value={addDuration} onChange={setAddDuration} />
              </div>
            )}

            {/* Weight */}
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Weight (kg){' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <Input
                type="number"
                inputMode="decimal"
                step="0.0001"
                placeholder="e.g. 3.5000"
                value={addWeightKg}
                onChange={(e) => setAddWeightKg(e.target.value)}
              />
            </div>

            {/* Height */}
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Height (cm){' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="e.g. 50.0"
                value={addHeightCm}
                onChange={(e) => setAddHeightCm(e.target.value)}
              />
            </div>

            {/* Done by */}
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Done by{' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <FedByPicker
                value={addFedBy}
                onChange={setAddFedBy}
                locked={addFeedingType === 'breast' ? ['Mommy'] : []}
              />
            </div>

            {/* Notes */}
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Notes <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <Textarea
                placeholder="Any notes…"
                rows={3}
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleSaveAddLog} disabled={saving || !canSaveAdd}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ─── Timer Duration Drawer ───────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen && drawerMode === 'timer-duration'}
        onOpenChange={(o) => !o && closeDrawer()}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Feeding Timer</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-8">
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">Feeding type</p>
              <FeedingTypePicker
                value={timerFeedingType}
                onChange={(v) => {
                  setTimerFeedingType(v);
                  if (v === 'breast') {
                    setTimerFedBy((prev) => {
                      const parts = prev
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      return parts.includes('Mommy') ? prev : [...parts, 'Mommy'].join(', ');
                    });
                  }
                }}
              />
            </div>
            <p className="text-muted-foreground text-sm">How long should the timer run?</p>
            <div className="grid grid-cols-3 gap-2">
              {[10, 20, 30, 40, 50, 60].map((min) => (
                <Button
                  key={min}
                  variant={timerDuration === min ? 'default' : 'outline'}
                  className="h-14 text-base font-bold"
                  onClick={() => setTimerDuration(min)}
                >
                  {min}m
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Custom minutes"
                value={
                  [10, 20, 30, 40, 50, 60].includes(timerDuration) ? '' : String(timerDuration)
                }
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0) setTimerDuration(v);
                }}
                className="flex-1"
              />
              <span className="text-muted-foreground text-sm">min</span>
            </div>
            <Button className="w-full" onClick={handleStartTimer}>
              Start {timerDuration}min {timerFeedingType === 'breast' ? 'Breast' : 'Bottle'} Timer
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ─── Timer End Drawer ────────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen && drawerMode === 'timer-end'}
        onOpenChange={(o) => !o && closeDrawer()}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              End Feeding
              <span className="text-muted-foreground ml-2 font-mono text-sm font-normal">
                {formatMsTimer(timerElapsedMs())} session
              </span>
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-8">
            {timerFeedingType === 'bottle' && (
              <div>
                <p className="text-foreground mb-2 text-sm font-medium">Amount (ml)</p>
                <MlPicker value={timerMl} onChange={setTimerMl} />
              </div>
            )}
            {timerFeedingType === 'breast' && (
              <div>
                <p className="text-foreground mb-2 text-sm font-medium">Side</p>
                <BreastSidePicker value={timerBreastSide} onChange={setTimerBreastSide} />
              </div>
            )}

            {/* Optional diaper during feeding */}
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Diaper change?{' '}
                <span className="text-muted-foreground text-xs font-normal">
                  (creates separate entry)
                </span>
              </p>
              <div className="space-y-3">
                <WetPicker value={timerWet} onChange={setTimerWet} disabled={saving} />
                <PoopPicker value={timerPoop} onChange={setTimerPoop} disabled={saving} />
              </div>
            </div>

            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Done by{' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <FedByPicker
                value={timerFedBy}
                onChange={setTimerFedBy}
                locked={timerFeedingType === 'breast' ? ['Mommy'] : []}
              />
            </div>

            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Notes <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <Textarea
                placeholder="Any notes…"
                rows={2}
                value={timerNote}
                onChange={(e) => setTimerNote(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleSaveTimerEnd} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ─── Edit Feeding Drawer ─────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen && drawerMode === 'edit-feeding'}
        onOpenChange={(o) => !o && closeDrawer()}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Feeding</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 pb-8">
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-foreground mb-1.5 block text-sm font-medium">Time</label>
              <Input
                type="datetime-local"
                value={editLoggedAt}
                onChange={(e) => setEditLoggedAt(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
            </div>
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">Feeding type</p>
              <FeedingTypePicker
                value={editFeedingType}
                onChange={(v) => {
                  setEditFeedingType(v);
                  if (v === 'breast') {
                    setEditFedBy((prev) => {
                      const parts = prev
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      return parts.includes('Mommy') ? prev : [...parts, 'Mommy'].join(', ');
                    });
                  }
                }}
              />
            </div>
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">Duration</p>
              <DurationPicker value={editFeedingDuration} onChange={setEditFeedingDuration} />
            </div>
            {editFeedingType === 'bottle' && (
              <div>
                <p className="text-foreground mb-2 text-sm font-medium">Amount (ml)</p>
                <MlPicker value={editMl} onChange={setEditMl} />
              </div>
            )}
            {editFeedingType === 'breast' && (
              <div>
                <p className="text-foreground mb-2 text-sm font-medium">Side</p>
                <BreastSidePicker value={editBreastSide} onChange={setEditBreastSide} />
              </div>
            )}
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Done by{' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <FedByPicker
                value={editFedBy}
                onChange={setEditFedBy}
                locked={editFeedingType === 'breast' ? ['Mommy'] : []}
              />
            </div>
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-foreground mb-1.5 block text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Any notes…"
                rows={3}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleSaveEditFeeding} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ─── Edit Wet Drawer ─────────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen && drawerMode === 'edit-wet'}
        onOpenChange={(o) => !o && closeDrawer()}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Wet Diaper</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-4 pb-8">
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-foreground mb-1.5 block text-sm font-medium">Time</label>
              <Input
                type="datetime-local"
                value={editLoggedAt}
                onChange={(e) => setEditLoggedAt(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
            </div>
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">Wet</p>
              <WetPicker value={editWet} onChange={setEditWet} disabled={saving} />
            </div>
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Done by{' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <FedByPicker value={editFedBy} onChange={setEditFedBy} />
            </div>
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-foreground mb-1.5 block text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Any notes…"
                rows={3}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSaveEditDiaper}
              disabled={saving || editWet === null}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ─── Edit Poop Drawer ────────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen && drawerMode === 'edit-poop'}
        onOpenChange={(o) => !o && closeDrawer()}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Poop Diaper</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-4 pb-8">
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-foreground mb-1.5 block text-sm font-medium">Time</label>
              <Input
                type="datetime-local"
                value={editLoggedAt}
                onChange={(e) => setEditLoggedAt(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
            </div>
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">Poop</p>
              <PoopPicker value={editPoop} onChange={setEditPoop} disabled={saving} />
            </div>
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">
                Done by{' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </p>
              <FedByPicker value={editFedBy} onChange={setEditFedBy} />
            </div>
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-foreground mb-1.5 block text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Any notes…"
                rows={3}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSaveEditDiaper}
              disabled={saving || editPoop === null}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ─── Edit Weight Drawer ──────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen && drawerMode === 'edit-weight'}
        onOpenChange={(o) => !o && closeDrawer()}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Weight</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-4 pb-8">
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-foreground mb-1.5 block text-sm font-medium">Time</label>
              <Input
                type="datetime-local"
                value={editLoggedAt}
                onChange={(e) => setEditLoggedAt(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
            </div>
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">Weight (kg)</p>
              <Input
                type="number"
                inputMode="decimal"
                step="0.0001"
                placeholder="e.g. 3.5000"
                value={editWeightKg}
                onChange={(e) => setEditWeightKg(e.target.value)}
              />
            </div>
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-foreground mb-1.5 block text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Any notes…"
                rows={3}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSaveEditWeight}
              disabled={saving || editWeightKg.trim() === ''}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ─── Edit Height Drawer ──────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen && drawerMode === 'edit-height'}
        onOpenChange={(o) => !o && closeDrawer()}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Height</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-4 pb-8">
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-foreground mb-1.5 block text-sm font-medium">Time</label>
              <Input
                type="datetime-local"
                value={editLoggedAt}
                onChange={(e) => setEditLoggedAt(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
            </div>
            <div>
              <p className="text-foreground mb-2 text-sm font-medium">Height (cm)</p>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="e.g. 50.0"
                value={editHeightCm}
                onChange={(e) => setEditHeightCm(e.target.value)}
              />
            </div>
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-foreground mb-1.5 block text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Any notes…"
                rows={3}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSaveEditHeight}
              disabled={saving || editHeightCm.trim() === ''}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ─── Baby Profile Drawer ───────────────────────────────────────────── */}
      <BabyProfileDrawer
        open={profileDrawerOpen}
        onOpenChange={setProfileDrawerOpen}
        profile={profile}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
