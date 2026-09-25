// Offline support: the game shell is cached on install; Google Fonts are cached the first time they load.
const CACHE = 'sugar-scramble-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  if (request.mode === 'navigate') {
    // Pages: try the network first so updates arrive, fall back to the cached game offline
    event.respondWith(fetch(request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(cache => cache.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // Everything else: cached copy first, refreshed in the background
  event.respondWith(caches.match(request).then(cached => {
    const fresh = fetch(request).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
