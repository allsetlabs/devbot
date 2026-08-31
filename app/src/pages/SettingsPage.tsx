import { useState, useEffect, useCallback } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { api, authApi, pushApi, refreshBackendUrl, BACKEND_URL } from '../lib/api';
import {
  requestBrowserNotificationPermission,
  getBrowserNotificationPermission,
  previewNotificationSound,
} from '../lib/notification';
import {
  isNative,
  platform,
  getBackendUrlSync,
  setStoredBackendUrl,
} from '../lib/capacitor';
import type { DevBotSettings } from '../hooks/useSettings';
import type { AuthTokenInfo } from '../types';
import { SttModelSettings } from '../components/SttModelSettings';
import {
  LogOut,
  User,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Smartphone,
  Wifi,
  Bell,
  Send,
} from 'lucide-react';

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
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
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

/** API Token Management — create, list, and revoke tokens for mobile/programmatic access. */
function ApiTokenManager() {
  const [tokens, setTokens] = useState<AuthTokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadTokens = useCallback(async () => {
    try {
      const list = await authApi.listTokens();
      setTokens(list);
    } catch {
      // Auth tokens endpoint may not be available in dev mode
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  const handleCreate = async () => {
    if (!newTokenName.trim()) return;
    setCreating(true);
    try {
      const result = await authApi.createToken(newTokenName.trim());
      setNewlyCreatedToken(result.token);
      setShowToken(false);
      setCopied(false);
      setNewTokenName('');
      await loadTokens();
    } catch {
      // Silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await authApi.deleteToken(id);
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // Silently fail
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  if (loading) {
    return <div className="py-3 text-sm text-muted-foreground">Loading tokens…</div>;
  }

  return (
    <div className="space-y-3">
      {/* Newly created token banner */}
      {newlyCreatedToken && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-medium text-primary">
            Token created — copy it now. It won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-muted px-2 py-1.5 font-mono text-xs text-foreground">
              {showToken ? newlyCreatedToken : '•'.repeat(48)}
            </code>
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="rounded p-1.5 text-muted-foreground md:hover:text-foreground"
              title={showToken ? 'Hide token' : 'Show token'}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => handleCopy(newlyCreatedToken)}
              className="rounded p-1.5 text-muted-foreground md:hover:text-foreground"
              title="Copy token"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setNewlyCreatedToken(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Create new token */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newTokenName}
          onChange={(e) => setNewTokenName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Token name (e.g. iPhone, Scheduler)"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <Button
          size="sm"
          disabled={creating || !newTokenName.trim()}
          onClick={handleCreate}
          className="gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Create
        </Button>
      </div>

      {/* Token list */}
      {tokens.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">
          No API tokens. Create one for mobile or programmatic access.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
              <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{t.tokenPreview}</span>
                  {t.lastUsedAt && (
                    <> · Last used {new Date(t.lastUsedAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(t.id)}
                className="rounded p-1.5 text-muted-foreground md:hover:text-destructive"
                title="Revoke token"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Use API tokens with the <code className="rounded bg-muted px-1">Authorization: Bearer &lt;token&gt;</code> header for mobile or programmatic access.
      </p>
    </div>
  );
}

/** Mobile Backend URL configuration — for Capacitor native apps. */
function MobileBackendConfig() {
  const [backendUrl, setBackendUrl] = useState(getBackendUrlSync() || '');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  const handleSave = async () => {
    const url = backendUrl.trim().replace(/\/$/, '');
    if (!url) return;

    await setStoredBackendUrl(url);
    refreshBackendUrl();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const url = backendUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${url}/health`, { method: 'GET' });
      setTestResult(res.ok ? 'ok' : 'fail');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 py-2">
        <Wifi className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Enter your DevBot server&apos;s URL so the mobile app can connect.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={backendUrl}
          onChange={(e) => setBackendUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="https://192.168.1.100:3100"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground"
        />
        <Button size="sm" onClick={handleTest} disabled={testing || !backendUrl.trim()}>
          Test
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!backendUrl.trim()} className="gap-1">
          {saved ? <Check className="h-3.5 w-3.5" /> : null}
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>
      {testResult && (
        <p className={`text-xs ${testResult === 'ok' ? 'text-green-500' : 'text-destructive'}`}>
          {testResult === 'ok' ? '✓ Connection successful' : '✗ Could not connect — check the URL and ensure DevBot is running'}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Current: <code className="rounded bg-muted px-1">{BACKEND_URL}</code>
      </p>
    </div>
  );
}

/** Push token management — shows registered devices and test button. */
function PushTokenManager() {
  const [tokens, setTokens] = useState<Array<{
    id: string;
    platform: string;
    deviceName: string;
    createdAt: string;
    lastUsedAt: string | null;
    tokenPreview: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadTokens = useCallback(async () => {
    try {
      const list = await pushApi.listTokens();
      setTokens(list as typeof tokens);
    } catch {
      // Push API may not be available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  const handleTestPush = async () => {
    setSending(true);
    try {
      await pushApi.testPush('DevBot Test', 'Push notifications are working! 🎉');
    } catch {
      // Silently fail
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="py-3 text-sm text-muted-foreground">Loading devices…</div>;
  }

  return (
    <div className="space-y-3">
      {tokens.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">
          No devices registered. Open DevBot on your phone to register for push notifications.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
              <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{t.deviceName}</p>
                <p className="text-xs text-muted-foreground">
                  {t.platform} · <span className="font-mono">{t.tokenPreview}</span>
                  {t.lastUsedAt && (
                    <> · Last push {new Date(t.lastUsedAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleTestPush}
        disabled={sending || tokens.length === 0}
        className="gap-1.5"
      >
        <Send className="h-3.5 w-3.5" />
        {sending ? 'Sending…' : 'Send Test Push'}
      </Button>
    </div>
  );
}

export function SettingsPage() {
  const [serverDefaultDir, setServerDefaultDir] = useState('');
  const { settings, updateSettings, toggleSound, toggleHaptic, toggleAutoScroll } = useSettings();
  const { user, logout, oauthConfigured } = useAuth();

  useEffect(() => {
    api
      .health()
      .then((h) => {
        if (h.defaultWorkingDirectory) setServerDefaultDir(h.defaultWorkingDirectory);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="safe-area-bottom flex h-full flex-col">
      <main className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="mx-auto max-w-2xl">
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

          <SectionHeader title="Speech to Text" />
          <div className="divide-y divide-border">
            <SttModelSettings />
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
              onChange={() =>
                updateSettings({ notifyOnTaskComplete: !settings.notifyOnTaskComplete })
              }
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
              placeholder={serverDefaultDir || '/path/to/projects'}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">Default path for new chat sessions</p>
          </div>

          <SectionHeader title="Account" />
          <div className="divide-y divide-border">
            {user && (
              <div className="flex items-center gap-3 py-3">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className="h-9 w-9 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
            {oauthConfigured && (
              <div className="py-3">
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>

          {oauthConfigured && (
            <>
              <SectionHeader title="API Tokens" />
              <ApiTokenManager />
            </>
          )}

          {/* Mobile section — always visible since push tokens can be managed from web too */}
          {isNative && (
            <>
              <SectionHeader title="Mobile Connection" />
              <MobileBackendConfig />
            </>
          )}

          <SectionHeader title="Push Notifications" />
          <div className="divide-y divide-border">
            <div className="flex items-center gap-2 py-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {isNative
                  ? 'This device will receive push notifications for task completions, failures, and new messages.'
                  : 'Install the DevBot mobile app to receive push notifications on your phone.'}
              </p>
            </div>
          </div>
          <PushTokenManager />

          <div className="py-3 text-center">
            <p className="text-xs text-muted-foreground">
              DevBot v1.0 · {isNative ? `${platform} app` : 'Web'} · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
