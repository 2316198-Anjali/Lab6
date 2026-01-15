// Service Worker for Reflective Journal PWA
const CACHE_NAME = 'journal-cache-v7'; // Incremented version to force update
const PRECACHE = [
  '/',
  '/static/css/style.css',
  '/static/js/form4JS.js',
  '/static/js/install.js',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png'
];

// Install event - triggered when service worker is first installed
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      console.log('[Service Worker] Caching app shell');
      await cache.addAll(PRECACHE);
      console.log('[Service Worker] App shell cached');
    } catch (error) {
      console.error('[Service Worker] Pre-caching failed:', error);
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Delete any caches that are not the current one
    await Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => {
          console.log('[Service Worker] Deleting old cache:', key);
          return caches.delete(key);
        })
    );
  })());
  return self.clients.claim();
});

// Fetch event - intercepts network requests
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  if (event.request.url.includes('/api/')) {
    console.log('[Service Worker] API request, bypassing cache:', event.request.url);
    return;
  }

  event.respondWith((async () => {
    try {
      if (event.request.method !== 'GET') {
        console.log('[Service Worker] Non-GET request, fetching from network:', event.request.url);
        return await fetch(event.request);
      }
      
      const cachedResponse = await caches.match(event.request);
      
      if (cachedResponse) {
        console.log('[Service Worker] Serving from cache:', event.request.url);
        return cachedResponse;
      }

      console.log('[Service Worker] Fetching from network:', event.request.url);
      const networkResponse = await fetch(event.request);
      
      const responseToCache = networkResponse.clone();
      
      const cache = await caches.open(CACHE_NAME);
      console.log('[Service Worker] Caching new resource:', event.request.url);
      await cache.put(event.request, responseToCache);
      
      return networkResponse;
    } catch (error) {
      console.error('[Service Worker] Fetch failed:', error);
      
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      if (event.request.headers.get('accept')?.includes('text/html')) {
        return await caches.match('/');
      }
      
      return new Response('Offline - Content not available', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'text/plain'
        })
      });
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
