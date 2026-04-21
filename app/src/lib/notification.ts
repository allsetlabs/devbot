/** Task completion notification — sound + haptic + browser notification */

import type { DevBotSettings } from '../hooks/useSettings';

let audioContext: AudioContext | null = null;
let currentSettings: Partial<DevBotSettings> = {
  soundEnabled: true,
  hapticEnabled: true,
  notifyOnTaskComplete: true,
  notifyOnTaskFailed: true,
  notifyOnNewMessage: false,
  browserNotificationsEnabled: false,
  dndEnabled: false,
  dndStartTime: '22:00',
  dndEndTime: '08:00',
};

export function setNotificationSettings(settings: Partial<DevBotSettings>) {
  currentSettings = { ...currentSettings, ...settings };
}

function isDndActive(): boolean {
  if (!currentSettings.dndEnabled) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = (currentSettings.dndStartTime || '22:00').split(':').map(Number);
  const [endH, endM] = (currentSettings.dndEndTime || '08:00').split(':').map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  if (start <= end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  // Wraps midnight (e.g. 22:00 - 08:00)
  return currentMinutes >= start || currentMinutes < end;
}

function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

function playSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = 523;
  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.2);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = 659;
  gain2.gain.setValueAtTime(0.15, now + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.35);
}

function playFailureSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.25);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

function vibrate(pattern: number | number[]) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function sendBrowserNotification(title: string, body: string) {
  if (!currentSettings.browserNotificationsEnabled) return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/devbot-icon.png' });
  }
}

export function requestBrowserNotificationPermission(): Promise<NotificationPermission | null> {
  if (!('Notification' in window)) return Promise.resolve(null);
  return Notification.requestPermission();
}

export function getBrowserNotificationPermission(): NotificationPermission | null {
  if (!('Notification' in window)) return null;
  return Notification.permission;
}

export function notifyTaskComplete() {
  if (isDndActive()) return;
  if (!currentSettings.notifyOnTaskComplete) return;

  if (currentSettings.soundEnabled) {
    playSuccessSound();
  }
  if (currentSettings.hapticEnabled) {
    vibrate([50, 30, 50]);
  }
  sendBrowserNotification('Task Complete', 'Your task finished successfully.');
}

export function notifyTaskFailed() {
  if (isDndActive()) return;
  if (!currentSettings.notifyOnTaskFailed) return;

  if (currentSettings.soundEnabled) {
    playFailureSound();
  }
  if (currentSettings.hapticEnabled) {
    vibrate([100, 50, 100, 50, 100]);
  }
  sendBrowserNotification('Task Failed', 'A task encountered an error.');
}

export function notifyNewMessage() {
  if (isDndActive()) return;
  if (!currentSettings.notifyOnNewMessage) return;

  if (currentSettings.soundEnabled) {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 600;
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }
  if (currentSettings.hapticEnabled) {
    vibrate(30);
  }
}
