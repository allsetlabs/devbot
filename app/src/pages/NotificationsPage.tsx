import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@allsetlabs/forge/components/ui/button';
import {
  Card,
  CardContent,
} from '@allsetlabs/forge/components/ui/card';
import { toast } from 'sonner';
import { HeaderSlot } from '../components/HeaderSlot';
import {
  notificationsApi,
  type NotificationRecord,
  type NotificationSettings,
  type NotificationCategory,
  type NotificationPriority,
} from '../lib/notificationsApi';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Volume2,
  RefreshCw,
  Send,
  Clock,
  Zap,
  MessageCircle,
  AlertTriangle,
  Settings,
  Loader2,
  ChevronDown,
  HandHelping,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<NotificationCategory, { label: string; icon: typeof Bell; color: string }> = {
  scheduler: { label: 'Scheduler', icon: Clock, color: 'text-blue-500' },
  event: { label: 'Event', icon: Zap, color: 'text-amber-500' },
  chat: { label: 'Chat', icon: MessageCircle, color: 'text-green-500' },
  assist: { label: 'Assist', icon: HandHelping, color: 'text-orange-500' },
  system: { label: 'System', icon: AlertTriangle, color: 'text-red-500' },
  reminder: { label: 'Reminder', icon: Bell, color: 'text-purple-500' },
  custom: { label: 'Custom', icon: Bell, color: 'text-muted-foreground' },
};

const PRIORITY_CONFIG: Record<NotificationPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: 'text-muted-foreground', bg: 'bg-muted' },
  normal: { label: 'Normal', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950' },
  high: { label: 'High', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950' },
  urgent: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950' },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

// ─── NotificationCard ───────────────────────────────────────────────────

function NotificationCard({
  notification,
  onRead,
  onDelete,
  onPlayTts,
  playingId,
}: {
  notification: NotificationRecord;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onPlayTts: (n: NotificationRecord) => void;
  playingId: string | null;
}) {
  const navigate = useNavigate();
  const cat = CATEGORY_CONFIG[notification.category] || CATEGORY_CONFIG.custom;
  const pri = PRIORITY_CONFIG[notification.priority] || PRIORITY_CONFIG.normal;
  const CatIcon = cat.icon;

  return (
    <Card
      className={`transition-all ${!notification.read ? 'border-l-4 border-l-primary' : 'opacity-75'}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Category icon */}
          <div className={`mt-0.5 flex-shrink-0 ${cat.color}`}>
            <CatIcon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{notification.title}</span>
              <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${pri.bg} ${pri.color}`}>
                {pri.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {notification.body}
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{formatTime(notification.created_at)}</span>
              <span>·</span>
              <span>{cat.label}</span>
              {notification.source && notification.source !== notification.category && (
                <>
                  <span>·</span>
                  <span>{notification.source}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-shrink-0 items-center gap-1">
            {notification.ttsGenerated && notification.ttsAudioFile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onPlayTts(notification); }}
                disabled={playingId === notification.id}
              >
                {playingId === notification.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            {notification.actionUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); navigate(notification.actionUrl!); }}
              >
                <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive/60 md:hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Settings Panel ─────────────────────────────────────────────────────

function NotificationSettingsPanel({
  settings,
  onUpdate,
}: {
  settings: NotificationSettings;
  onUpdate: (updates: Partial<NotificationSettings>) => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Settings className="h-4 w-4" />
        Notification Settings
      </h3>

      {/* Main toggles */}
      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm">Notifications enabled</span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="h-4 w-4 rounded"
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm">TTS (Speak aloud)</span>
            <p className="text-[10px] text-muted-foreground">Read notifications aloud via edge-tts</p>
          </div>
          <input
            type="checkbox"
            aria-label="TTS enabled"
            checked={settings.ttsEnabled}
            onChange={(e) => onUpdate({ ttsEnabled: e.target.checked })}
            className="h-4 w-4 rounded"
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm">Do Not Disturb</span>
            <p className="text-[10px] text-muted-foreground">
              {settings.dndStartTime} – {settings.dndEndTime}
            </p>
          </div>
          <input
            type="checkbox"
            aria-label="Do Not Disturb"
            checked={settings.dndEnabled}
            onChange={(e) => onUpdate({ dndEnabled: e.target.checked })}
            className="h-4 w-4 rounded"
          />
        </label>
      </div>

      {/* DND time range */}
      {settings.dndEnabled && (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={settings.dndStartTime}
            onChange={(e) => onUpdate({ dndStartTime: e.target.value })}
            className="rounded border bg-background px-2 py-1 text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="time"
            value={settings.dndEndTime}
            onChange={(e) => onUpdate({ dndEndTime: e.target.value })}
            className="rounded border bg-background px-2 py-1 text-xs"
          />
        </div>
      )}

      {/* Min priority */}
      <div>
        <label className="mb-1 block text-sm">Minimum priority</label>
        <select
          value={settings.minPriority}
          onChange={(e) => onUpdate({ minPriority: e.target.value as NotificationPriority })}
          className="w-full rounded border bg-background px-2 py-1.5 text-sm"
        >
          <option value="low">Low (all notifications)</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent only</option>
        </select>
      </div>
    </div>
  );
}

// ─── Send Test Panel ────────────────────────────────────────────────────

function SendTestPanel({ onSent }: { onSent: () => void }) {
  const [title, setTitle] = useState('Test Notification 🔔');
  const [body, setBody] = useState('This is a test notification from DevBot.');
  const [speak, setSpeak] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await notificationsApi.send({
        title,
        body,
        category: 'custom',
        priority: 'normal',
        speak,
      });

      // If TTS was generated, play it
      if (result.ttsGenerated && result.ttsAudioFile) {
        const url = notificationsApi.getTtsAudioUrl(result.ttsAudioFile);
        const audio = new Audio(url);
        audio.play().catch(() => {});
      }

      toast.success('Notification sent');
      onSent();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Send className="h-4 w-4" />
        Send Test Notification
      </h3>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded border bg-background px-2 py-1.5 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Body"
        rows={2}
        className="w-full rounded border bg-background px-2 py-1.5 text-sm"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={speak}
            onChange={(e) => setSpeak(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          Speak aloud (TTS)
        </label>
        <Button size="sm" onClick={handleSend} disabled={sending || !title.trim()}>
          {sending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
          Send
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | ''>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showTest, setShowTest] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (categoryFilter) params.category = categoryFilter;
      const data = await notificationsApi.list(params as Parameters<typeof notificationsApi.list>[0]);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [categoryFilter]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const { count } = await notificationsApi.unreadCount();
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const s = await notificationsApi.getSettings();
      setSettings(s);
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadNotifications(), loadUnreadCount(), loadSettings()]);
    setLoading(false);
  }, [loadNotifications, loadUnreadCount, loadSettings]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications();
      loadUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications, loadUnreadCount]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const { count } = await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success(`Marked ${count} notification${count !== 1 ? 's' : ''} as read`);
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      const removed = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (removed && !removed.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const handlePlayTts = async (n: NotificationRecord) => {
    if (!n.ttsAudioFile) return;
    setPlayingId(n.id);
    try {
      const url = notificationsApi.getTtsAudioUrl(n.ttsAudioFile);
      const audio = new Audio(url);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      await audio.play();
    } catch {
      setPlayingId(null);
      toast.error('Failed to play audio');
    }
  };

  const handleUpdateSettings = async (updates: Partial<NotificationSettings>) => {
    try {
      const updated = await notificationsApi.updateSettings(updates);
      setSettings(updated);
      toast.success('Settings updated');
    } catch {
      toast.error('Failed to update settings');
    }
  };

  const categories: { value: NotificationCategory | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'scheduler', label: 'Scheduler' },
    { value: 'event', label: 'Event' },
    { value: 'chat', label: 'Chat' },
    { value: 'assist', label: 'Assist' },
    { value: 'system', label: 'System' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="h-full overflow-auto">
      <HeaderSlot>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </HeaderSlot>

      <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
        {/* Stats bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {notifications.length} total
            </span>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                Read all
              </Button>
            )}
            <Button
              variant={showTest ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowTest(!showTest)}
              className="text-xs"
            >
              <Send className="mr-1 h-3.5 w-3.5" />
              Test
            </Button>
            <Button
              variant={showSettings ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs"
            >
              <Settings className="mr-1 h-3.5 w-3.5" />
              Settings
            </Button>
          </div>
        </div>

        {/* Settings panel (collapsible) */}
        {showSettings && settings && (
          <NotificationSettingsPanel settings={settings} onUpdate={handleUpdateSettings} />
        )}

        {/* Test panel (collapsible) */}
        {showTest && <SendTestPanel onSent={refresh} />}

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategoryFilter(c.value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                categoryFilter === c.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground md:hover:bg-muted/80'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BellOff className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Notifications from schedulers, events, and agents will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onRead={handleMarkRead}
                onDelete={handleDelete}
                onPlayTts={handlePlayTts}
                playingId={playingId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
