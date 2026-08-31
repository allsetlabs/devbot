/**
 * Capacitor native platform utilities.
 *
 * Detects whether the app is running inside a native Capacitor shell (Android/iOS)
 * vs. a regular browser, and provides wrappers for native APIs (push notifications,
 * haptics, status bar) that gracefully degrade to no-ops on the web.
 */

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';

// ──────────────────────────── Platform detection ─────────────────────────────

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

// ──────────────────────────── Backend URL management ─────────────────────────

const BACKEND_URL_KEY = 'devbot-backend-url';

/**
 * Get the stored backend URL for native mobile apps.
 * Returns null if not configured (user needs to set it in Settings).
 */
export async function getStoredBackendUrl(): Promise<string | null> {
  if (!isNative) return null;
  try {
    const { value } = await Preferences.get({ key: BACKEND_URL_KEY });
    return value;
  } catch {
    return null;
  }
}

/**
 * Save the backend URL for native mobile apps.
 * Format: "https://192.168.1.100:3100" (protocol + host + port)
 */
export async function setStoredBackendUrl(url: string): Promise<void> {
  await Preferences.set({ key: BACKEND_URL_KEY, value: url });
  // Also cache in localStorage for synchronous access by the API module
  try {
    localStorage.setItem(BACKEND_URL_KEY, url);
  } catch {
    // localStorage may not be available
  }
}

/**
 * Get the backend URL synchronously (from localStorage cache).
 * Falls back to null if not set. Only relevant on native platforms.
 */
export function getBackendUrlSync(): string | null {
  if (!isNative) return null;
  try {
    return localStorage.getItem(BACKEND_URL_KEY);
  } catch {
    return null;
  }
}

// ──────────────────────────── Status Bar ─────────────────────────────────────

export async function initStatusBar(): Promise<void> {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({ style: StatusBarStyle.Dark });
    await StatusBar.setBackgroundColor({ color: '#000000' });
  } catch {
    // StatusBar not available
  }
}

// ──────────────────────────── Splash Screen ──────────────────────────────────

export async function hideSplashScreen(): Promise<void> {
  if (!isNative) return;
  try {
    await SplashScreen.hide();
  } catch {
    // SplashScreen not available
  }
}

// ──────────────────────────── Haptics ────────────────────────────────────────

export async function hapticsImpact(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
  if (!isNative) return;
  const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
  try {
    await Haptics.impact({ style: map[style] });
  } catch {
    // Haptics not available
  }
}

export async function hapticsNotification(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
  if (!isNative) return;
  const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
  try {
    await Haptics.notification({ type: map[type] });
  } catch {
    // Haptics not available
  }
}

export async function hapticsVibrate(): Promise<void> {
  if (!isNative) return;
  try {
    await Haptics.vibrate();
  } catch {
    // Haptics not available
  }
}

// ──────────────────────────── Push Notifications ─────────────────────────────

export interface PushTokenCallback {
  (token: string): void;
}

export interface PushNotificationCallback {
  (notification: { title?: string; body?: string; data?: Record<string, unknown> }): void;
}

/**
 * Initialize push notifications. Requests permission, registers for push,
 * and sets up listeners for token receipt and incoming notifications.
 *
 * Returns a cleanup function to remove listeners.
 */
export async function initPushNotifications(
  onToken: PushTokenCallback,
  onNotification: PushNotificationCallback
): Promise<() => void> {
  if (!isNative) return () => {};

  try {
    // Check current permission status
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Permission not granted:', permStatus.receive);
      return () => {};
    }

    // Register with the native push service (FCM for Android, APNs for iOS)
    await PushNotifications.register();

    // Listen for the registration token
    const tokenListener = await PushNotifications.addListener('registration', (token) => {
      console.log('[Push] Device token:', token.value);
      onToken(token.value);
    });

    // Listen for registration errors
    const errorListener = await PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err);
    });

    // Listen for push notifications received while app is in foreground
    const receivedListener = await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('[Push] Notification received:', notification);
        onNotification({
          title: notification.title ?? undefined,
          body: notification.body ?? undefined,
          data: notification.data,
        });
      }
    );

    // Listen for push notification taps (user opened the notification)
    const actionListener = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log('[Push] Notification action:', action);
        const n = action.notification;
        onNotification({
          title: n.title ?? undefined,
          body: n.body ?? undefined,
          data: n.data,
        });
      }
    );

    return () => {
      tokenListener.remove();
      errorListener.remove();
      receivedListener.remove();
      actionListener.remove();
    };
  } catch (err) {
    console.error('[Push] Init error:', err);
    return () => {};
  }
}

// ──────────────────────────── Local Notifications ────────────────────────────

/**
 * Show a local notification (works on both native and web with proper permissions).
 * Used for foreground push notification display and task completion alerts.
 */
export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!isNative) {
    // Fall back to browser Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/devbot-icon.png' });
    }
    return;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title,
          body,
          extra: data,
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
        },
      ],
    });
  } catch (err) {
    console.error('[LocalNotification] Error:', err);
  }
}

// ──────────────────────────── App Lifecycle ──────────────────────────────────

/**
 * Set up back button handler for Android. Calls the provided callback
 * instead of exiting the app. Returns a cleanup function.
 */
export async function setupBackButton(
  onBackButton: () => void
): Promise<() => void> {
  if (!isNative || platform !== 'android') return () => {};

  const listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      onBackButton();
    }
  });

  return () => listener.remove();
}

/**
 * Listen for app state changes (foreground/background).
 * Returns a cleanup function.
 */
export async function onAppStateChange(
  callback: (isActive: boolean) => void
): Promise<() => void> {
  if (!isNative) return () => {};

  const listener = await CapApp.addListener('appStateChange', ({ isActive }) => {
    callback(isActive);
  });

  return () => listener.remove();
}

// ──────────────────────────── Initialization ─────────────────────────────────

/**
 * One-time Capacitor initialization. Call in main.tsx before rendering.
 * Loads the cached backend URL into localStorage for synchronous access.
 */
export async function initCapacitor(): Promise<void> {
  if (!isNative) return;

  // Sync Preferences → localStorage for synchronous API access
  try {
    const { value } = await Preferences.get({ key: BACKEND_URL_KEY });
    if (value) {
      localStorage.setItem(BACKEND_URL_KEY, value);
    }
  } catch {
    // Preferences not available
  }

  // Initialize native UI
  await initStatusBar();
  await hideSplashScreen();

  console.log(`[Capacitor] Initialized on ${platform}`);
}
