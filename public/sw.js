// Service Worker para Hevy Workout Tracker
// Permite funcionamiento offline y mejora rendimiento

const CACHE_NAME = 'kookyecatgym-v3';
const API_CACHE = 'kookyecatgym-api-v2';
const CACHE_URLS = [
  '/',
  '/index.html',
];

// Instalar service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando URLs base');
      return cache.addAll(CACHE_URLS).catch(() => {
        console.log('[SW] Algunas URLs no pudieron cachearse (esto es ok)');
      });
    })
  );
  self.skipWaiting();
});

// Activar service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
            console.log('[SW] Eliminando caché viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Manejar requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No cachear extensiones específicas
  if (request.url.includes('.php')) {
    return;
  }

  // Fotos y vídeos propios: los sirve el servidor con caché larga; los vídeos
  // llegan por rangos (206) que la Cache API no admite.
  if (url.pathname.startsWith('/api/media')) {
    return;
  }

  // API: NETWORK-FIRST. Los datos (rutinas, logs, ejercicios) deben venir
  // siempre frescos del servidor. Solo usamos la caché si NO hay red (offline),
  // y solo cacheamos peticiones GET (nunca POST/DELETE).
  if (url.pathname.includes('/api/')) {
    if (request.method !== 'GET') {
      // Escrituras (POST/DELETE): siempre a red, nunca caché
      return;
    }
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cache.match(request).then((cached) => cached || new Response('API offline', { status: 503 })));
      })
    );
    return;
  }

  // Assets (JS, CSS, imágenes): cache-first
  if (
    request.url.includes('/assets/') ||
    request.url.includes('/exercises/') ||
    request.url.endsWith('.js') ||
    request.url.endsWith('.css') ||
    request.url.endsWith('.svg') ||
    request.url.endsWith('.png') ||
    request.url.endsWith('.jpg') ||
    request.url.endsWith('.jpeg') ||
    request.url.endsWith('.webp')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) return response;

          return fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Fallback para imágenes offline
            if (request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" fill="#999">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            return new Response('Offline', { status: 503 });
          });
        });
      })
    );
    return;
  }

  // HTML: network-first
  if (request.method === 'GET' && (request.url.endsWith('/') || request.url.endsWith('.html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request) || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request) || new Response('Offline', { status: 503 });
      })
  );
});

// Aviso de fin de descanso (y notificación de prueba) enviados por el servidor.
// Se muestra siempre: iOS retira el permiso si un push no muestra notificación.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'KookyeCatGym', {
      body: data.body || '',
      tag: data.tag || 'kookyecatgym',
      renotify: true,
      icon: '/icon-192.png',
      badge: '/icon-monochrome.png',
      vibrate: [200, 100, 200, 100, 200],
    })
  );
});

// Tocar la notificación abre (o trae al frente) la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

// Mensaje desde cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
