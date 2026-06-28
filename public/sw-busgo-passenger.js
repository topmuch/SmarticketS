/**
 * BusGo Passenger Service Worker
 *
 * ARCHITECTURE VOCALE — 0 FCFA
 * ─────────────────────────────
 * A) Audio Statique (sonnerie): notification.sound + vibrate → fonctionne écran verrouillé
 * B) Audio Dynamique (TTS): Web Speech API → uniquement quand la PWA est active
 *
 * Le TTS ne JAMAIS être déclenché dans le Service Worker.
 * Le TTS est déclenché via l'action "🔊 Écouter" (notificationclick) ou
 * automatiquement quand la PWA est au premier plan (message du SW → client).
 *
 * Notifications Push:
 *   - sound: '/sounds/busgo/notification-company.mp3' (son personnalisé de la compagnie)
 *   - requireInteraction: true (reste affichée jusqu'à interaction)
 *   - actions: [{ listen }, { dismiss }]
 *
 * notificationclick:
 *   - action 'listen' → ouvre PWA + postMessage pour déclencher TTS
 *   - action 'dismiss' ou default → ouvre PWA sans TTS
 */

const CACHE_NAME = 'busgo-passenger-v1';
const STATIC_ASSETS = [
  '/pwa-passager',
  '/pwa-passager/install',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/sounds/busgo/notification-company.mp3',
  '/sounds/busgo/ding-dong.mp3',
];

// ═══════════════════════════════════════════════════════════════
// INSTALL — pre-cache shell + sounds
// ═══════════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[BusGo SW] Some assets failed to cache:', err);
      })
    )
  );
  self.skipWaiting();
});

// ═══════════════════════════════════════════════════════════════
// ACTIVATE — clean old caches
// ═══════════════════════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ═══════════════════════════════════════════════════════════════
// FETCH — network-first for navigations, cache-first for static
// ═══════════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/pwa-passager'))
        )
    );
    return;
  }

  // Static assets (sounds, icons, CSS, JS): cache-first
  if (
    request.method === 'GET' &&
    (url.pathname.startsWith('/_next/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/sounds/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.mp3') ||
      url.pathname.endsWith('.wav'))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});

// ═══════════════════════════════════════════════════════════════
// PUSH — Affiche la notification avec son statique
// ═══════════════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'BusGo', message: event.data ? event.data.text() : 'Nouvelle notification' };
  }

  const title = data.title || 'BusGo';
  const type = data.type || 'system';

  // Vibration patterns per type
  const VIBRATION_MAP = {
    'boarding': [300, 100, 300],
    'departure': [500, 100, 500, 100, 500],
    'delay': [200, 200],
    'scan': [100],
    'system': [200, 100, 200],
    'reminder': [300, 150, 300],
    'urgent': [500, 100, 500, 100, 500, 100, 500],
  };

  const vibrate = VIBRATION_MAP[type] || VIBRATION_MAP['system'];

  // Notification options — AUDIO STATIQUE fonctionne écran verrouillé
  const options = {
    body: data.message || data.body || 'Nouvelle notification BusGo',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `busgo-${type}-${data.departureId || ''}`,
    requireInteraction: type === 'departure' || type === 'urgent', // Reste affichée pour les départs/urgents

    // AUDIO STATIQUE — fonctionne même écran verrouillé
    sound: data.sound || '/sounds/busgo/notification-company.mp3',
    vibrate,

    // Actions pour le TTS (bonus — nécessite PWA ouverte)
    actions: [
      { action: 'listen', title: '🔊 Écouter', type: 'button' },
      { action: 'dismiss', title: 'Fermer', type: 'button' },
    ],

    data: {
      url: data.url || '/pwa-passager',
      ttsMessage: data.ttsMessage || data.message || '',
      type,
      departureId: data.departureId || '',
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION CLICK — Gère les actions
// ═══════════════════════════════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;
  const notificationData = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  // 'listen' ou click normal → ouvrir la PWA
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Cherche un client déjà ouvert
      for (const client of clientList) {
        if (client.url.includes('/pwa-passager') && 'focus' in client) {
          // Envoie le message TTS au client si action 'listen'
          if (action === 'listen' && notificationData.ttsMessage) {
            client.postMessage({
              type: 'TTS_SPEAK',
              message: notificationData.ttsMessage,
              alertType: notificationData.type || 'system',
              forced: true,
            });
          }
          return client.focus();
        }
      }

      // Aucun client ouvert → ouvrir une nouvelle fenêtre
      const urlToOpen = notificationData.url || '/pwa-passager';
      const openUrl = action === 'listen' && notificationData.ttsMessage
        ? `${urlToOpen}?tts=1&ttsMessage=${encodeURIComponent(notificationData.ttsMessage)}&alertType=${notificationData.type || ''}`
        : urlToOpen;

      if (self.clients.openWindow) {
        return self.clients.openWindow(openUrl);
      }
    })
  );
});

// ═══════════════════════════════════════════════════════════════
// MESSAGE — Communication avec la PWA (pour TTS)
// ═══════════════════════════════════════════════════════════════
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
