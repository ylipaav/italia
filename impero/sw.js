// Offline-tuki: sovelluksen tiedostot välimuistiin. Nosta versiota, kun tiedostot muuttuvat.
const CACHE = 'impero-v0.2.0';
const FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icon.svg',
  'js/main.js',
  'js/game.js',
  'js/data.js',
  'js/version.js',
  '../shared/words.js',
  '../shared/rng.js',
  '../shared/speech.js',
  '../shared/srs.js',
  '../shared/store.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// Verkko ensin, välimuisti varalla.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
