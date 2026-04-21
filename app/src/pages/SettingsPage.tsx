import { useState } from 'react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Settings, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { SlideNav } from '../components/SlideNav';
import { requestBrowserNotificationPermission, getBrowserNotificationPermission, previewNotificationSound } from '../lib/notification';
import type { DevBotSettings } from '../hooks/useSettings';

const MODEL_OPTIONS = [
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

const PERMISSION_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'permissive', label: 'Permissive' },
  { value: 'restrictive', label: 'Restrictive' },
];

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const SOUND_OPTIONS: { value: DevBotSettings['notificationSound']; label: string }[] = [
  { value: 'chime', label: 'Chime' },
  { value: 'ding', label: 'Ding' },
  { value: 'pop', label: 'Pop' },
  { value: 'classic', label: 'Classic' },
  { value: 'silent', label: 'Silent' },
];

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center justify-between py-3 text-left"
    >
      <div className="flex-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="mb-1 mt-6 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h2>
  );
}

export function SettingsPage() {
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();
  const { settings, updateSettings, toggleSound, toggleHaptic, toggleAutoScroll } = useSettings();

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <SlideNav isOpen={navOpen} onClose={() => setNavOpen(false)} />

      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        <SectionHeader title="General" />
        <div className="divide-y divide-border">
          <SelectField
            label="Default Model"
            value={settings.defaultModel}
            options={MODEL_OPTIONS}
            onChange={(v) => updateSettings({ defaultModel: v })}
          />
          <SelectField
            label="Permission Mode"
            value={settings.defaultPermissionMode}
            options={PERMISSION_OPTIONS}
            onChange={(v) => updateSettings({ defaultPermissionMode: v })}
          />
        </div>

        <SectionHeader title="Appearance" />
        <div className="divide-y divide-border">
          <SelectField
            label="Theme"
            value={settings.theme}
            options={THEME_OPTIONS}
            onChange={(v) => updateSettings({ theme: v })}
          />
          <SelectField
            label="Font Size"
            value={settings.fontSize}
            options={FONT_SIZE_OPTIONS}
            onChange={(v) => updateSettings({ fontSize: v })}
          />
          <ToggleField
            label="Compact Mode"
            description="Reduce spacing between messages for denser chat view"
            checked={settings.compactMode}
            onChange={() => updateSettings({ compactMode: !settings.compactMode })}
          />
        </div>

        <SectionHeader title="Notifications" />
        <div className="divide-y divide-border">
          <ToggleField
            label="Do Not Disturb"
            description="Silence all notifications during scheduled hours"
            checked={settings.dndEnabled}
            onChange={() => updateSettings({ dndEnabled: !settings.dndEnabled })}
          />
          {settings.dndEnabled && (
            <div className="flex items-center gap-2 py-3">
              <span className="text-sm text-muted-foreground">From</span>
              <input
                type="time"
                value={settings.dndStartTime}
                onChange={(e) => updateSettings({ dndStartTime: e.target.value })}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="time"
                value={settings.dndEndTime}
                onChange={(e) => updateSettings({ dndEndTime: e.target.value })}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </div>
          )}
        </div>

        <SectionHeader title="Channels" />
        <div className="divide-y divide-border">
          <ToggleField
            label="Sound"
            description="Play audio tones for notifications"
            checked={settings.soundEnabled}
            onChange={toggleSound}
          />
          {settings.soundEnabled && (
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-foreground">Notification Sound</span>
              <div className="flex items-center gap-2">
                <select
                  value={settings.notificationSound}
                  onChange={(e) => {
                    const val = e.target.value as DevBotSettings['notificationSound'];
                    updateSettings({ notificationSound: val });
                    previewNotificationSound(val);
                  }}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  {SOUND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => previewNotificationSound(settings.notificationSound)}
                  className="text-xs"
                >
                  Test
                </Button>
              </div>
            </div>
          )}
          <ToggleField
            label="Haptic Feedback"
            description="Vibrate device for notifications"
            checked={settings.hapticEnabled}
            onChange={toggleHaptic}
          />
          <ToggleField
            label="Browser Notifications"
            description="Show desktop/browser push notifications"
            checked={settings.browserNotificationsEnabled}
            onChange={() => {
              const enabling = !settings.browserNotificationsEnabled;
              if (enabling && getBrowserNotificationPermission() !== 'granted') {
                requestBrowserNotificationPermission().then((perm) => {
                  if (perm === 'granted') {
                    updateSettings({ browserNotificationsEnabled: true });
                  }
                });
              } else {
                updateSettings({ browserNotificationsEnabled: enabling });
              }
            }}
          />
          <ToggleField
            label="Auto-scroll"
            description="Automatically scroll to new messages"
            checked={settings.autoScrollEnabled}
            onChange={toggleAutoScroll}
          />
        </div>

        <SectionHeader title="Events" />
        <div className="divide-y divide-border">
          <ToggleField
            label="Task Complete"
            description="Notify when a task finishes successfully"
            checked={settings.notifyOnTaskComplete}
            onChange={() => updateSettings({ notifyOnTaskComplete: !settings.notifyOnTaskComplete })}
          />
          <ToggleField
            label="Task Failed"
            description="Notify when a task encounters an error"
            checked={settings.notifyOnTaskFailed}
            onChange={() => updateSettings({ notifyOnTaskFailed: !settings.notifyOnTaskFailed })}
          />
          <ToggleField
            label="New Message"
            description="Notify on each new assistant message"
            checked={settings.notifyOnNewMessage}
            onChange={() => updateSettings({ notifyOnNewMessage: !settings.notifyOnNewMessage })}
          />
        </div>

        <SectionHeader title="Working Directory" />
        <div className="py-3">
          <label className="mb-1 block text-sm font-medium text-foreground">
            Default Working Directory
          </label>
          <input
            type="text"
            value={settings.defaultWorkingDirectory}
            onChange={(e) => updateSettings({ defaultWorkingDirectory: e.target.value })}
            placeholder="/path/to/projects"
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Default path for new chat sessions
          </p>
        </div>
      </main>
    </div>
  );
}
