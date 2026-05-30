/// <reference lib="webworker" />

const CACHE_NAME = 'smartickets-v3';
const API_CACHE = 'smartickets-api-v1';
const OFFLINE_URL = '/offline';

// Assets to cache on install (app shell + controller)
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline',
  '/controller/validate',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching app shell');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== API_CACHE)
          .map((cacheName) => {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network-first for navigation, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // ─── POST requests: Network-first, queue on failure ──────────────
  if (request.method === 'POST') {
    // Only intercept specific API endpoints (validation, sync)
    const url = new URL(request.url);

    if (url.pathname === '/api/validate-ticket' ||
        url.pathname.startsWith('/api/sync')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            return response;
          })
          .catch(() => {
            // Return a "queued" response so the client knows to store locally
            return new Response(
              JSON.stringify({
                queued: true,
                message: 'Requête enregistrée pour synchronisation hors ligne',
              }),
              {
                status: 202,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          })
      );
    }

    // Other POST requests: let them fail naturally
    return;
  }

  // ─── GET requests ───────────────────────────────────────────────
  // For navigation requests, try network first, then cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version or offline page
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // ─── API GET requests: Network-first, cache success responses ───
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then((apiCache) => {
        return apiCache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response.status === 200) {
              apiCache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // For other GET requests, try cache first, then network (stale-while-revalidate)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Network failed, return cache (already have cachedResponse or null)
        return cachedResponse;
      });

      // Return cached immediately, or fetch from network
      return cachedResponse || fetchPromise;
    })
  );
});

// Background Sync event (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'smartickets-sync') {
    console.log('[ServiceWorker] Background sync triggered');
    event.waitUntil(
      // Notify clients to process their offline queues
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_NOW' });
        });
      })
    );
  }
});

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'SmarticketS';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none found
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
