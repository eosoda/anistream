const CACHE_NAME = 'anistream-v6';
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // APIs e artefatos versionados do Next nunca devem ficar presos no cache do
  // service worker. O próprio Next já fornece cache-busting para /_next.
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (
    requestUrl.origin === self.location.origin &&
    (requestUrl.pathname.startsWith('/api/') ||
      requestUrl.pathname.startsWith('/_next/'))
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const isNavigation =
        event.request.mode === 'navigate' ||
        (event.request.headers.get('accept') || '').includes('text/html');

      // Navegações são network-first para que um deploy nunca continue
      // executando HTML/JS antigos. O cache serve apenas como fallback offline.
      if (isNavigation) {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok && requestUrl.origin === self.location.origin) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return (
            (await caches.match(event.request)) ||
            (await caches.match('/offline.html')) ||
            new Response('Sem conexão ou recurso indisponível', { status: 503 })
          );
        }
      }

      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) return cachedResponse;

      try {
        return await fetch(event.request);
      } catch {
        return new Response('Sem conexão ou recurso indisponível', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
