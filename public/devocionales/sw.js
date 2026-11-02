/* Service Worker — Devocionales (Un día a la vez) · v1
   Precachea el esqueleto de la app. Los libros (dev-dNN.js) se van
   guardando en la caché a medida que se leen, así el paquete base
   queda liviano aunque los devocionales pesen varios MB. */
const CACHE = "dev-v1";
const PRECACHE = [
  "./", "./index.html", "./lectura.html", "./hero.jpg",
  "./devocionales.js", "./manifest.json", "./icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
        return resp;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
