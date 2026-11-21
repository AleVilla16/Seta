// Prende sempre l'ultima versione dell'app dalla rete; usa la copia salvata
// solo quando non c'è connessione. I dati (/api) non vengono mai messi in cache.
const C = 'turni-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(n => n !== C).map(n => caches.delete(n)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(C).then(x => x.put(e.request, c)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/')))
  );
});
