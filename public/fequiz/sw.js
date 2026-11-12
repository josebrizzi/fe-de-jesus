/* FeQuiz — service worker: precarga todo el juego para funcionar sin conexión */
const CACHE = 'fequiz-v11';
const NUCLEO = [
  './',
  './index.html',
  './proyeccion.html',
  './estilos.css',
  './app.js',
  './grupal.js',
  './datos/datos.js',
  './favicon.svg',
  './manifest.webmanifest',
  './fuentes/montserrat-variable.woff2',
  './iconos/icon-192.png',
  './iconos/icon-512.png',
  './iconos/icon-maskable-512.png',
  './iconos/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(NUCLEO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(claves =>
      Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return;   // la API del modo grupal va siempre a la red
  // La pantalla del proyector es un espejo en vivo: primero red, cache de reserva.
  // Así la PC del proyector siempre recibe la versión más nueva.
  if (url.pathname.indexOf('/fequiz/proyeccion') === 0) {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp.ok) {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
      }
      return resp;
    }).catch(() => {
      if (e.request.mode === 'navigate') return caches.match('./index.html');
    }))
  );
});
