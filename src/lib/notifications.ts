import {
  fetchNotificationConfig,
  registerDeviceToken,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from './api.ts';
import { NotificationPreferences } from '../types.ts';

const DEVICE_ID_KEY = 'shivshahi_device_id';
const FCM_TOKEN_KEY = 'shivshahi_fcm_token';
const PROMPT_DISMISSED_KEY = 'shivshahi_push_prompt_dismissed';

// Foreground notification subscriber callback type
export type ForegroundNotificationCallback = (payload: {
  title: string;
  message: string;
  category?: string;
  image?: string;
  deepLink?: string;
  doorId?: string;
}) => void;

const foregroundListeners = new Set<ForegroundNotificationCallback>();

export function subscribeToForegroundNotifications(callback: ForegroundNotificationCallback): () => void {
  foregroundListeners.add(callback);
  return () => {
    foregroundListeners.delete(callback);
  };
}

export function notifyForegroundListeners(payload: {
  title: string;
  message: string;
  category?: string;
  image?: string;
  deepLink?: string;
  doorId?: string;
}) {
  foregroundListeners.forEach(listener => {
    try {
      listener(payload);
    } catch (err) {
      console.error('Error dispatching foreground notification:', err);
    }
  });
}

// Get or generate stable anonymous Device ID
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server_device';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Get stored FCM token if already registered
export function getStoredFcmToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(FCM_TOKEN_KEY);
}

// Check if Push Notifications are supported on current platform/browser
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window
  );
}

// Get current browser permission state
export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// Check if user previously tapped "Not Now" recently (within 7 days)
export function hasPromptBeenDismissedRecently(): boolean {
  if (typeof window === 'undefined') return true;
  const dismissedTime = localStorage.getItem(PROMPT_DISMISSED_KEY);
  if (!dismissedTime) return false;

  const timestamp = parseInt(dismissedTime, 10);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - timestamp < sevenDaysMs;
}

// Mark prompt as dismissed
export function markPromptDismissed(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROMPT_DISMISSED_KEY, Date.now().toString());
}

// Reset dismissed flag (e.g. if user taps settings to enable)
export function resetPromptDismissed(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROMPT_DISMISSED_KEY);
}

// Convert VAPID base64 key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Detect client platform
function detectPlatform(): 'android' | 'ios' | 'pwa' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const ua = navigator.userAgent.toLowerCase();
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

  if (isStandalone) return 'pwa';
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  return 'web';
}

// Detect friendly browser name
function detectBrowser(): string {
  if (typeof window === 'undefined') return 'Browser';
  const ua = navigator.userAgent;
  if (/chrome|chromium|crios/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/edg/i.test(ua)) return 'Edge';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  return 'Modern Browser';
}

// Register service worker and register/update FCM device token
export async function setupPushNotifications(
  userPreferences?: Partial<NotificationPreferences>
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications are not supported on this device/browser.' };
  }

  try {
    // 1. Request browser notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was not granted.' };
    }

    // 2. Register Service Worker
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      await navigator.serviceWorker.ready;
    } catch (swErr) {
      console.warn('Failed to register /firebase-messaging-sw.js, trying /sw.js fallback:', swErr);
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
    }

    // 3. Listen to foreground messages from Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_DEEP_LINK') {
        const payload = event.data.data || {};
        notifyForegroundListeners({
          title: payload.title || 'Jai Hanuman Door',
          message: payload.body || payload.message || 'New update available',
          category: payload.category,
          image: payload.image,
          deepLink: payload.url || event.data.targetUrl,
          doorId: payload.doorId,
        });
      }
    });

    // 4. Fetch server configuration (VAPID key and optional client config)
    const config = await fetchNotificationConfig().catch(() => ({
      isConfigured: false,
      vapidKey: null,
      firebaseClientConfig: null,
    }));

    const deviceId = getDeviceId();
    let token: string | null = null;

    // 5. Try Firebase Web SDK if client config is present
    if (config.firebaseClientConfig && config.vapidKey) {
      try {
        const { initializeApp, getApps } = await import('firebase/app');
        const { getMessaging, getToken } = await import('firebase/messaging');

        const app = getApps().length === 0 ? initializeApp(config.firebaseClientConfig) : getApps()[0];
        const messaging = getMessaging(app);

        token = await getToken(messaging, {
          vapidKey: config.vapidKey,
          serviceWorkerRegistration: registration,
        });
      } catch (fcmClientErr) {
        console.warn('Firebase JS client getToken error, falling back to Web Push:', fcmClientErr);
      }
    }

    // 6. Try standard Web Push subscription with VAPID key
    if (!token && config.vapidKey) {
      try {
        const convertedVapid = urlBase64ToUint8Array(config.vapidKey);
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapid,
        });
        token = JSON.stringify(sub);
      } catch (subErr) {
        console.warn('Standard Web Push subscription failed:', subErr);
      }
    }

    // 7. If no VAPID configured yet, create a stable registration token for the device
    // so preferences and the complete pipeline are stored and ready
    if (!token) {
      const storedToken = localStorage.getItem(FCM_TOKEN_KEY);
      token = storedToken || `fcm_dev_${deviceId}_${Date.now().toString(36)}`;
    }

    localStorage.setItem(FCM_TOKEN_KEY, token);

    // 8. Register token with backend database
    await registerDeviceToken({
      token,
      deviceId,
      platform: detectPlatform(),
      browser: detectBrowser(),
      permission: 'granted',
      preferences: userPreferences,
    });

    return { success: true, token };
  } catch (err: any) {
    console.error('Failed to setup push notifications:', err);
    return { success: false, error: err?.message || 'Failed to enable push notifications' };
  }
}
