const CACHE_NAME = "zunoplay-v7";
const STATIC_FILES = ["./", "./index.html", "./manifest.json", "./nav.js"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const request = event.request;
  const accept = request.headers.get("accept") || "";
  const isNavigation = request.mode === "navigate" || accept.includes("text/html");

  if (isNavigation) {
    // Always prefer the current server version for HTML so deployments are not
    // trapped behind stale cached pages. Fall back to cache only when offline.
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  // Static assets: cache first, then refresh from network.
  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
    )
  );
});
