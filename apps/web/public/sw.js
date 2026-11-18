/**
 * Service Worker for T1D India - Offline-First PWA
 * Caches app shell, API responses, and enables background sync
 */

const CACHE_NAME = 't1d-india-v1';
const STATIC_CACHE = 't1d-static-v1';
const API_CACHE = 't1d-api-v1';
const IMAGE_CACHE = 't1d-images-v1';

// Files to cache immediately (app shell)
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/meals',
  '/cgm',
  '/insulin',
  '/profile',
  '/settings',
  '/foods',
  '/manifest.json',
  // Add other critical static assets
];

// API endpoints to cache for offline use
const API_PATTERNS = [
  /^\/api\/v1\/foods\/search/,
  /^\/api\/v1\/foods\/composite/,
  /^\/api\/v1\/profile/,
  /^\/api\/v1\/meals$/,
  /^\/api\/v1\/insulin\/summary/,
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== STATIC_CACHE &&
                     name !== API_CACHE &&
                     name !== IMAGE_CACHE &&
                     name !== CACHE_NAME;
            })
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isApiRequest(request)) {
    event.respondWith(networkFirstThenCache(request));
  } else if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isNavigationRequest(request)) {
    event.respondWith(networkFirstThenCache(request));
  } else {
    event.respondWith(networkFirstThenCache(request));
  }
});

// Background sync for offline mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-meals') {
    event.waitUntil(syncMeals());
  } else if (event.tag === 'sync-insulin') {
    event.waitUntil(syncInsulin());
  } else if (event.tag === 'sync-cgm') {
    event.waitUntil(syncCGM());
  } else if (event.tag === 'sync-all') {
    event.waitUntil(syncAll());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: data.priority === 'high',
    tag: data.tag || 't1d-notification',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'T1D India', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/dashboard')
    );
  } else if (event.action === 'dismiss') {
    // Just close - already handled
  } else {
    // Default click - open app
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  } else if (event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  } else if (event.data.type === 'SYNC_NOW') {
    event.waitUntil(syncAll().then(() => {
      event.ports[0].postMessage({ success: true });
    }));
  }
});

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|woff2?|ttf|eot|ico|png|jpg|jpeg|webp|svg|avif)$/);
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(png|jpg|jpeg|webp|svg|avif|gif)$/);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Cache strategies
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirstThenCache(request) {
  const cacheName = isApiRequest(request) ? API_CACHE : CACHE_NAME;
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful responses
      if (isCacheableResponse(response)) {
        cache.put(request, response.clone());
      }
    } else if (isApiRequest(request)) {
      // For failed API requests, try cache
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (isNavigationRequest(request)) {
      const offlinePage = await cache.match('/offline');
      if (offlinePage) return offlinePage;
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

function isCacheableResponse(response) {
  // Don't cache error responses
  if (!response.ok) return false;

  // Don't cache responses with no-store
  const cacheControl = response.headers.get('cache-control');
  if (cacheControl && cacheControl.includes('no-store')) return false;

  // Don't cache authenticated API responses with sensitive data
  if (response.headers.get('vary')?.includes('Authorization')) return false;

  return true;
}

// Sync functions
async function syncMeals() {
  const db = await openDB();
  const meals = await db.getAll('pendingMeals');

  for (const meal of meals) {
    try {
      const response = await fetch('/api/v1/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meal.data),
      });

      if (response.ok) {
        await db.delete('pendingMeals', meal.id);
      }
    } catch (error) {
      console.error('Failed to sync meal:', error);
    }
  }
}

async function syncInsulin() {
  const db = await openDB();
  const logs = await db.getAll('pendingInsulin');

  for (const log of logs) {
    try {
      const response = await fetch('/api/v1/insulin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log.data),
      });

      if (response.ok) {
        await db.delete('pendingInsulin', log.id);
      }
    } catch (error) {
      console.error('Failed to sync insulin:', error);
    }
  }
}

async function syncCGM() {
  const db = await openDB();
  const readings = await db.getAll('pendingCGM');

  if (readings.length === 0) return;

  try {
    const response = await fetch('/api/v1/cgm/readings/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readings: readings.map(r => r.data) }),
    });

    if (response.ok) {
      await db.clear('pendingCGM');
    }
  } catch (error) {
    console.error('Failed to sync CGM:', error);
  }
}

async function syncAll() {
  await Promise.all([
    syncMeals(),
    syncInsulin(),
    syncCGM(),
  ]);
}

// IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('t1d-offline', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('pendingMeals')) {
        db.createObjectStore('pendingMeals', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pendingInsulin')) {
        db.createObjectStore('pendingInsulin', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pendingCGM')) {
        db.createObjectStore('pendingCGM', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}