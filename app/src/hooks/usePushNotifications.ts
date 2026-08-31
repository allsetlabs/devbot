/**
 * Hook for managing push notification registration and handling.
 *
 * On native platforms (Capacitor Android/iOS), this:
 * 1. Requests push notification permission
 * 2. Registers with FCM/APNs to get a device token
 * 3. Sends the device token to the DevBot backend
 * 4. Handles incoming push notifications (foreground display, navigation on tap)
 *
 * On web, this is a no-op (web uses browser Notification API instead).
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNative, initPushNotifications, showLocalNotification, platform } from '../lib/capacitor';
import { pushApi } from '../lib/api';

export function usePushNotifications() {
  const navigate = useNavigate();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;

    async function setup() {
      const cleanup = await initPushNotifications(
        // onToken: send to backend
        async (token) => {
          if (cancelled) return;
          try {
            const deviceName = `${platform === 'android' ? 'Android' : 'iOS'} Device`;
            await pushApi.registerToken(token, platform, deviceName);
            console.log('[Push] Token registered with backend');
          } catch (err) {
            console.error('[Push] Failed to register token with backend:', err);
          }
        },
        // onNotification: handle incoming notification
        (notification) => {
          if (cancelled) return;

          // Show local notification if app is in foreground
          if (notification.title) {
            showLocalNotification(
              notification.title,
              notification.body || '',
              notification.data
            );
          }

          // Navigate to relevant screen based on notification data
          const data = notification.data;
          if (data?.chatId && typeof data.chatId === 'string') {
            navigate(`/chat/${data.chatId}`);
          } else if (data?.type === 'task_complete' || data?.type === 'task_failed') {
            navigate('/scheduler');
          }
        }
      );

      if (!cancelled) {
        cleanupRef.current = cleanup;
      } else {
        cleanup();
      }
    }

    setup();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, [navigate]);
}
