import { useState, useEffect, useRef } from 'react';

export interface GeoInfo {
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  fullAddress: string | null;
  timezone: string;
}

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch {
          startVideoFallback();
        }
      } else {
        startVideoFallback();
      }
    }

    function startVideoFallback() {
      if (videoRef.current) return;
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.style.position = 'fixed';
      video.style.top = '-1px';
      video.style.left = '-1px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.01';

      const blob = new Blob(
        [
          new Uint8Array([
            0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0x42, 0x86,
            0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08,
            0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x04, 0x42, 0x85, 0x81,
            0x02,
          ]),
        ],
        { type: 'video/webm' }
      );
      video.src = URL.createObjectURL(blob);
      video.muted = true;
      document.body.appendChild(video);
      video.play().catch(() => {});
      videoRef.current = video;
    }

    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.remove();
        videoRef.current = null;
      }
    };
  }, []);
}

export function useGeoInfo(): GeoInfo {
  const [geo] = useState<GeoInfo>({
    latitude: null,
    longitude: null,
    locationName: null,
    city: null,
    state: null,
    country: null,
    fullAddress: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return geo;
}

export function useLiveTime() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 50);
    return () => clearInterval(timer);
  }, []);

  return now;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatMs(date: Date): string {
  return String(date.getMilliseconds()).padStart(3, '0').slice(0, 2);
}

export function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTimeDiff(a: string, b: string): string {
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const ms = Math.floor((diff % 1000) / 10);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${String(hours).padStart(2, '0')}`);
  parts.push(`${String(minutes).padStart(2, '0')}`);
  parts.push(`${String(seconds).padStart(2, '0')}`);
  return `+ ${parts.join(':')}:${String(ms).padStart(2, '0')}ms`;
}

export function formatLiveElapsed(fromIso: string, now: Date): string {
  const diff = now.getTime() - new Date(fromIso).getTime();
  if (diff < 0) return '00:00:00';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const timePart = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  if (days > 0) {
    return `${days}d ${timePart}`;
  }
  return timePart;
}

export function formatEntryTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatEntryMs(dateStr: string): string {
  const d = new Date(dateStr);
  return String(d.getMilliseconds()).padStart(3, '0').slice(0, 2);
}

export function formatEntryDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
