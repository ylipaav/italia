// Offline-tuki: sovelluksen tiedostot välimuistiin. Nosta versiota, kun tiedostot muuttuvat.
const CACHE = 'tessere-v0.5.0';
const FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icon.svg',
  'js/main.js',
  'js/board.js',
  'js/layout.js',
  'js/progress.js',
  '../shared/words.js',
  '../shared/rng.js',
  '../shared/speech.js',
  '../shared/srs.js',
  '../shared/store.js',
  'js/version.js',
  'js/stats.js',
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

// Verkko ensin, välimuisti varalla: päivitykset tulevat heti läpi, mutta peli toimii myös offline.
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
