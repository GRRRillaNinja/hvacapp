// Service Worker — cache app shell for offline access
const CACHE_NAME = 'hvac-app-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/job_form.html',
  '/job_view.html',
  '/assets/css/style.css',
  '/assets/js/app.js',
  '/assets/js/form.js',
  '/assets/img/favicon.svg'
];

// Install — cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames.map(name =>
            name !== CACHE_NAME ? caches.delete(name) : null
          )
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only cache GET requests
  if (request.method !== 'GET') return;

  // API requests — network first, cache fallback
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Asset requests — cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then(response => response || fetch(request))
      .catch(() => new Response('Offline', { status: 503 }))
  );
});
