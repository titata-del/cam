const CACHE = "luma-v13";
const CORE = [
  "./",
  "index.html?v=13",
  "styles.css?v=13",
  "app.js?v=13",
  "manifest.json",
  "icon-180.png",
  "icon-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE)).catch(()=>{})
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Always prefer fresh app files so GitHub updates appear immediately.
  const isCore =
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/styles.css") ||
    url.pathname.endsWith("/app.js");

  if (isCore) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(()=>{});
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
