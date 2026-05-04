import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function createAndSaveSubscription(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) return null;
  try {
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await apiRequest('POST', '/api/push/subscribe', { subscription: sub.toJSON() });
    localStorage.setItem('push-endpoint', sub.endpoint);
    return sub;
  } catch (err) {
    console.error('[Push] Failed to create subscription:', err);
    return null;
  }
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const didAutoSubscribe = useRef(false);

  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setIsSupported(supported);
    if (!supported) return;

    const currentPerm = Notification.permission;
    setPermission(currentPerm);

    // Wait for SW to be ready, then check/sync subscription
    navigator.serviceWorker.ready.then(async (registration) => {
      try {
        const existing = await registration.pushManager.getSubscription();

        if (existing) {
          setIsSubscribed(true);
          // Re-sync with server if FCM rotated the endpoint
          const lastEndpoint = localStorage.getItem('push-endpoint');
          if (lastEndpoint !== existing.endpoint) {
            await apiRequest('POST', '/api/push/subscribe', { subscription: existing.toJSON() });
            localStorage.setItem('push-endpoint', existing.endpoint);
          }
          return;
        }

        // No existing subscription
        setIsSubscribed(false);
        localStorage.removeItem('push-endpoint');

        // KEY TWA FIX: On Android, the OS grants notification permission at
        // app install time. The browser permission is already 'granted' but
        // no web-push subscription exists yet. Create one silently so the
        // user doesn't have to tap the bell button manually.
        if (currentPerm === 'granted' && VAPID_PUBLIC_KEY && !didAutoSubscribe.current) {
          didAutoSubscribe.current = true;
          const sub = await createAndSaveSubscription(registration);
          if (sub) setIsSubscribed(true);
        }
      } catch (err) {
        console.error('[Push] checkSubscription error:', err);
      }
    });

    // Poll for manual permission changes in OS settings
    const interval = setInterval(() => {
      const current = Notification.permission;
      setPermission((prev) => (prev !== current ? current : prev));
      if (current === 'granted') clearInterval(interval);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false;

    setIsLoading(true);
    try {
      // On TWA/Android, requestPermission() may resolve immediately with
      // 'granted' if the OS-level permission was already given at install.
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== 'granted') {
        setIsLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // Reuse existing subscription to avoid duplicate FCM tokens
      let sub = await registration.pushManager.getSubscription();
      if (sub) {
        // Make sure server has it (handles fresh reinstall scenario)
        await apiRequest('POST', '/api/push/subscribe', { subscription: sub.toJSON() });
        localStorage.setItem('push-endpoint', sub.endpoint);
      } else {
        sub = await createAndSaveSubscription(registration);
      }

      if (!sub) {
        setIsLoading(false);
        return false;
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[Push] subscribe error:', err);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        await sub.unsubscribe();
        await apiRequest('POST', '/api/push/unsubscribe', { endpoint: sub.endpoint });
        localStorage.removeItem('push-endpoint');
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[Push] unsubscribe error:', err);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  return { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe };
}
