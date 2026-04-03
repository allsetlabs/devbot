import { useState, useCallback, useEffect } from 'react';

export interface DevBotSettings {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  autoScrollEnabled: boolean;
}

const SETTINGS_KEY = 'devbot-settings';
const DEFAULT_SETTINGS: DevBotSettings = {
  soundEnabled: true,
  hapticEnabled: true,
  autoScrollEnabled: true,
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
