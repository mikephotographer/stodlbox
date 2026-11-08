// STODLBOX Service Worker: App-Shell offline verfügbar machen.
// - Eigene Dateien: network-first (immer aktuell, offline aus dem Cache)
// - Schriften und supabase-js vom CDN: cache-first (fixe Versionen)
// - Supabase-Daten: nicht anfassen (der Board-Stand liegt im localStorage der App)
const CACHE = 'stodlbox-v21';
const SHELL = [
  './', './index.html', './config.js', './manifest.webmanifest', './manifest-admin.webmanifest', './admin/',
  './css/tokens.css', './css/app.css',
  './js/main.js', './js/api.js', './js/state.js', './js/router.js', './js/html.js', './js/ui.js', './js/icons.js',
  './js/format.js', './js/equipment.js', './js/seed-rules.js', './js/calendar.js', './js/share.js',
  './js/components/event.js', './js/components/photos.js', './js/photos.js', './js/timer.js', './js/views/timer.js', './js/components/tabbar.js', './js/components/poll.js',
  './js/views/common.js', './js/views/onboarding.js', './js/views/board.js', './js/views/event.js', './js/views/archive.js', './js/views/workouts.js', './js/components/workouts.js', './js/views/poll.js',
  './js/views/admin/index.js', './js/views/admin/event-form.js', './js/views/admin/forms.js', './js/views/admin/manage.js',
  './assets/icons/icon-192.png', './assets/icons/apple-touch-icon.png', './assets/icons/favicon-48.png',
];
const CDN = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req, { ignoreSearch: true }))
          || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
    );
    return;
  }

  if (CDN.includes(url.origin)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
