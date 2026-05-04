const CACHE_NAME = 'cardrop-v5';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/robots.txt',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Push notifications ───────────────────────────────────────────────────────
// Everything inside event.waitUntil so the push event stays alive until
// showNotification resolves. A fallback notification is always shown so
// Chrome/TWA never auto-generates a generic "site updated" message.
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      try {
        if (!event.data) {
          await self.registration.showNotification('CarDrop', {
            body: 'Nova poruka',
            icon: '/icons/icon-192x192.png',
          });
          return;
        }

        let data;
        try {
          data = event.data.json();
        } catch {
          data = { title: 'CarDrop', body: event.data.text() || 'Nova poruka' };
        }

        const tag = data.tag
          ? `${data.tag}-${Date.now()}`
          : `cardrop-${Date.now()}`;

        await self.registration.showNotification(data.title || 'CarDrop', {
          body: data.body || '',
          icon: data.icon || '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag,
          data: { url: data.url || '/map-hack' },
          vibrate: [200, 100, 200],
        });
      } catch (err) {
        console.error('[SW] Push handler error:', err);
        // Last-resort fallback — must always call showNotification in TWA
        try {
          await self.registration.showNotification('CarDrop', {
            body: 'Nova poruka',
            icon: '/icons/icon-192x192.png',
          });
        } catch (e2) {
          console.error('[SW] Fallback notification failed:', e2);
        }
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/map-hack';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ─── Fetch caching ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html').then((offlinePage) => {
          return offlinePage || caches.match('/') || new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
