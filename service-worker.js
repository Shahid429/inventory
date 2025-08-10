// PWA cache settings
const CACHE_NAME = 'ply-gallery-cache-v2'; // <-- bump version when updating
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css?v=2', // versioned to avoid stale cache
  '/script.js?v=2',
  '/manifest.json'
];

// Install event - pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Fetch event - Network First for CDN & CSS/JS, Cache First for others
self.addEventListener('fetch', event => {
  const requestURL = new URL(event.request.url);

  // Always fetch fresh for Tailwind or other CDN files
  if (requestURL.hostname.includes('cdn.tailwindcss.com') || requestURL.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // Network First for HTML
  if (requestURL.pathname === '/' || requestURL.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache First for other static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response.status === 200 && event.request.method === 'GET') {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      });
    })
  );
});

// Activate event - clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});
