// Basic Service Worker to satisfy PWA install requirements.
// We are using a cache-first network-fallback strategy for the shell.
const CACHE_NAME = 'dignity-admin-pwa-v1';
const urlsToCache = [
  '/',
  '/admin/admin-orders',
  '/favicon.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Simple fetch handler to satisfy Chrome's PWA criteria
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
