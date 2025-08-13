// js/service-worker.js

// Nombre y versión del caché. Cambiar la versión fuerza la actualización del caché.
const CACHE_NAME = 'segcul-cache-v0.442c';

// Archivos esenciales de la aplicación (el "App Shell") que se guardarán para funcionar offline.
const urlsToCache = [
  '/',
  '/index.html',
  '/js/main.js',
  '/js/ui.js',
  '/js/firebase.js',
  '/js/onboarding.js',
  '/js/components/timelinePrincipal.js',
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
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Esta línea es clave: le dice al SW que se active ya, sin esperar
        return self.skipWaiting(); 
      })
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // Si el nombre del caché no es el actual, lo borramos.
          if (cache !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Le dice al SW que tome control de todas las pestañas abiertas inmediatamente.
      return self.clients.claim();
    })
  );
});
// Evento 'fetch': Se dispara cada vez que la aplicación pide un recurso (una página, un script, una imagen).
// Aquí interceptamos la petición y decidimos si la servimos desde el caché o desde la red.
self.addEventListener('fetch', event => {
  event.respondWith(
    // 1. Buscamos el recurso en el caché.
    caches.match(event.request)
      .then(response => {
        // Si encontramos una respuesta en el caché, la devolvemos.
        if (response) {
          return response;
        }
        // Si no, la pedimos a la red.
        return fetch(event.request);
      }
    )
  );
});
