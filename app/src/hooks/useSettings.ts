import { useState, useCallback, useEffect } from 'react';

export interface DevBotSettings {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  autoScrollEnabled: boolean;
  defaultModel: string;
  defaultPermissionMode: string;
  theme: string;
  fontSize: string;
  compactMode: boolean;
  defaultWorkingDirectory: string;
  notifyOnTaskComplete: boolean;
  notifyOnTaskFailed: boolean;
  notifyOnNewMessage: boolean;
  browserNotificationsEnabled: boolean;
  dndEnabled: boolean;
  dndStartTime: string;
  dndEndTime: string;
}

const SETTINGS_KEY = 'devbot-settings';
const DEFAULT_SETTINGS: DevBotSettings = {
  soundEnabled: true,
  hapticEnabled: true,
  autoScrollEnabled: true,
  defaultModel: 'claude-sonnet-4-6',
  defaultPermissionMode: 'normal',
  theme: 'system',
  fontSize: 'medium',
  compactMode: false,
  defaultWorkingDirectory: '',
  notifyOnTaskComplete: true,
  notifyOnTaskFailed: true,
  notifyOnNewMessage: false,
  browserNotificationsEnabled: false,
  dndEnabled: false,
  dndStartTime: '22:00',
  dndEndTime: '08:00',
};

export function useSettings() {
  const [settings, setSettings] = useState<DevBotSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      // Silently fail on parse error, use defaults
    }

    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback((updates: Partial<DevBotSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch {
        // Silently fail on write error
      }
      return updated;
    });
  }, []);

  const toggleSound = useCallback(() => {
    updateSettings({ soundEnabled: !settings.soundEnabled });
  }, [settings.soundEnabled, updateSettings]);

  const toggleHaptic = useCallback(() => {
    updateSettings({ hapticEnabled: !settings.hapticEnabled });
  }, [settings.hapticEnabled, updateSettings]);

  const toggleAutoScroll = useCallback(() => {
    updateSettings({ autoScrollEnabled: !settings.autoScrollEnabled });
  }, [settings.autoScrollEnabled, updateSettings]);

  return {
    settings,
    isLoaded,
    updateSettings,
    toggleSound,
    toggleHaptic,
    toggleAutoScroll,
  };
}
