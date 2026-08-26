const CACHE = 'marqrcam-crown-vow-shell-v1';
const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/crown-vow-theme.css',
  '/camera-themes.css',
  '/camera-mobile.css',
  '/experience.css',
  '/guest-simplified.css',
  '/live-camera.css',
  '/roll-viewer.css',
  '/features.css',
  '/darkroom.css',
  '/guided-tour.css',
  '/app.js',
  '/experience.js',
  '/lookup-flow.js',
  '/live-camera.js',
  '/capture-review.js',
  '/darkroom-renderer.js',
  '/roll-viewer.js',
  '/gallery-privacy.js',
  '/darkroom.js',
  '/install-flow.js',
  '/guided-tour.js',
  '/gallery.html',
  '/gallery.css',
  '/gallery.js',
  '/icons/crown-vow-crest.svg',
  '/icons/canon-ae1.svg',
  '/icons/olympus-trip-35.svg',
  '/icons/polaroid-sx70.svg',
  '/icons/kodak-instamatic-104.svg',
  '/icons/nikon-f3.svg',
  '/icons/pentax-k1000.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
  );
});
