/* Service Worker — Fe de Jesús (estudios) */
const CACHE = "fej-v17";
const PRECACHE = [
  "./", "./index.html", "./leccion.html", "./instructor.html", "./quiz.html", "./apo-quiz.html",
  "./data.js", "./data-a.js", "./data-b.js", "./data-c.js", "./data-d.js",
  "./quiz-a.js", "./quiz-b.js", "./pdf.js",
  "./apocalipsis.html", "./apo-leccion.html",
  "./apo-data-a.js", "./apo-data-b.js", "./apo-data-c.js",
  "./apo-data-d.js", "./apo-data-e.js", "./apo-data-f.js",
  "./manifest.json", "./icon.svg"
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
