/** Task completion notification — sound + haptic feedback */

import type { DevBotSettings } from '../hooks/useSettings';

let audioContext: AudioContext | null = null;
let currentSettings: Partial<DevBotSettings> = {
  soundEnabled: true,
  hapticEnabled: true,
};

export function setNotificationSettings(settings: Partial<DevBotSettings>) {
  currentSettings = { ...currentSettings, ...settings };
}

function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

/** Play a short two-tone chime (success) */
function playSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // First tone — C5 (523 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = 523;
  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.2);

  // Second tone — E5 (659 Hz) — slightly delayed
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

/** Play a short descending tone (failure) */
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

/** Trigger device vibration if supported */
function vibrate(pattern: number | number[]) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/** Notify user that a task completed successfully */
export function notifyTaskComplete() {
  if (currentSettings.soundEnabled) {
    playSuccessSound();
  }
  if (currentSettings.hapticEnabled) {
    vibrate([50, 30, 50]); // short double-tap
  }
}

/** Notify user that a task failed */
export function notifyTaskFailed() {
  if (currentSettings.soundEnabled) {
    playFailureSound();
  }
  if (currentSettings.hapticEnabled) {
    vibrate([100, 50, 100, 50, 100]); // triple buzz
  }
}
