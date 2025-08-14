// js/service-worker.js

// Nombre y versión del caché. Cambiar la versión fuerza la actualización del caché.
const CACHE_NAME = 'segcul-cache-v0.445b';

// Archivos esenciales de la aplicación (el "App Shell") que se guardarán para funcionar offline.
const urlsToCache = [
  '/',
  '/index.html',
  '/js/main.js',
  '/js/ui.js',
  '/js/firebase.js',
  '/js/onboarding.js',
  '/js/components/timelinePrincipal.js',
  '/manifest.json', // Añadido manifest.json al caché
  '/images/icons/icon-72x72.png',
  '/images/icons/icon-96x96.png',
  '/images/icons/icon-128x128.png',
  '/images/icons/icon-144x144.png',
  '/images/icons/icon-152x152.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-384x384.png',
  '/images/icons/icon-512x512.png'
];
// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
// Aquí es donde guardamos en caché todos nuestros archivos del App Shell.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        // Usamos { cache: 'reload' } para asegurarnos de no usar una versión en caché del navegador para estos archivos.
        const promises = urlsToCache.map(url => {
            return fetch(url, { cache: 'reload' }).then(response => {
                if (!response.ok) {
                    throw new Error(`No se pudo cachear: ${url}, estado: ${response.status}`);
                }
                return cache.put(url, response);
            });
        });
        return Promise.all(promises);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Falló la instalación del Service Worker:', error);
      })
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Evento 'fetch': Se dispara cada vez que la aplicación pide un recurso (una página, un script, una imagen).
// Aquí interceptamos la petición y decidimos si la servimos desde el caché o desde la red.
self.addEventListener('fetch', event => {
  const { request } = event;

  // No intentamos cachear las peticiones a Firebase. Las dejamos pasar.
  if (request.url.includes('firestore.googleapis.com') || request.url.includes('firebaseapp.com')) {
    event.respondWith(fetch(request));
    return;
  }

  // Estrategia: Network first, falling back to cache
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        // Si la petición a la red fue exitosa, la usamos y actualizamos el caché.
        // Clonamos la respuesta porque solo se puede consumir una vez.
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            // Solo cacheamos peticiones GET exitosas
            if (request.method === 'GET' && responseToCache.status === 200) {
              cache.put(request, responseToCache);
            }
          });
        return networkResponse;
      })
      .catch(() => {
        // Si la red falla, intentamos servir desde el caché.
        return caches.match(request)
          .then(cachedResponse => {
            // Si hay una respuesta en caché, la devolvemos.
            // Si no, la promesa se rechazará y el fetch fallará (comportamiento normal sin conexión).
            return cachedResponse;
          });
      })
  );
});
