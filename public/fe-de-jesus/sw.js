// Service worker de Fe de Jesús: permite abrir la pantalla del alumno sin conexión
const CACHE = "fe-de-jesus-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pantallas: primero la red; sin conexión, la última copia guardada
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r && r.ok) {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return r;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // Versículos y librería del PDF: lo guardado primero, y se actualiza en segundo plano
  if (url.pathname.indexOf("/api/biblia/") >= 0 || url.hostname === "cdnjs.cloudflare.com") {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((guardado) => {
          const red = fetch(req)
            .then((r) => {
              if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone());
              return r;
            })
            .catch(() => guardado);
          return guardado || red;
        })
      )
    );
  }
});
