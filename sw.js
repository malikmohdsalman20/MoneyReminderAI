// Service Worker for Money Reminder AI PWA
const CACHE_NAME = 'money-reminder-ai-v1';
const RUNTIME_CACHE = 'runtime-cache';
const API_CACHE = 'api-cache';

const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;700&display=swap',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event with intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests (Claude API, etc.)
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cache = caches.open(API_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((response) => response || new Response('API unavailable', { status: 503 }));
        })
    );
    return;
  }

  // Handle external resources (fonts, CDN)
  if (url.hostname !== location.hostname) {
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request).then((response) => {
          if (response.ok) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        }))
        .catch(() => new Response('Resource unavailable', { status: 503 }))
    );
    return;
  }

  // Handle local files (cache first for static, network first for html)
  if (request.destination === 'document' || request.url.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request).then((response) => {
          if (response.ok && (request.destination === 'script' || request.destination === 'style')) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        }))
        .catch(() => new Response('Offline', { status: 503 }))
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-finance-data') {
    event.waitUntil(syncFinanceData());
  }
});

async function syncFinanceData() {
  try {
    const cache = await caches.open(API_CACHE);
    const keys = await cache.keys();
    return Promise.resolve();
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New notification from Money Reminder AI',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%2322c55e" width="100" height="100"/><text x="50" y="65" font-size="70" text-anchor="middle" fill="white">💰</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%2322c55e"/></svg>',
    tag: 'money-reminder-notification',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('💰 Money Reminder AI', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow('/');
      })
    );
  }
});