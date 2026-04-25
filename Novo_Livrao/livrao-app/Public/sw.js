// Service Worker — Livrão da Família
const CACHE_NAME = 'livrao-v3';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/v2-icon-192.png',
  '/v2-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Removendo cache antigo:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first: sempre busca online, fallback para cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
