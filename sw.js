const CACHE_NAME = "zunoplay-v6";
const FILES_TO_CACHE = ["./", "./index.html", "./manifest.json", "./nav.js"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const accept = event.request.headers.get("accept") || "";
  const isHtml = accept.includes("text/html");

  event.respondWith(
    fetch(event.request)
      .then(async response => {
        if (!response || response.status !== 200) return response;

        if (isHtml) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("text/html")) {
            const html = await response.text();
            // The global navigation must be loaded exactly once.
            // Pages that already include nav.js are left untouched.
            if (!/<script[^>]+src=["'][^"']*nav\.js(?:[?#][^"']*)?["'][^>]*>/i.test(html)) {
              const injected = html.replace(/<\/head>/i, '<script src="nav.js"></script></head>');
              return new Response(injected, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              });
            }
          }
        }

        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
