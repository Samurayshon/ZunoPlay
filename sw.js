const CACHE_NAME = "zunoplay-v3";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./manifest.json",
    "./nav.js"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

async function injectNavigation(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    const text = await response.text();
    const script = '<script src="./nav.js"></script>';
    const transformed = text.includes("./nav.js")
        ? text
        : text.replace(/<\/body>/i, script + "</body>");

    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.delete("content-length");

    return new Response(transformed, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        fetch(event.request)
            .then(async response => {
                if (!response || response.status !== 200) return response;

                const finalResponse = await injectNavigation(response.clone());

                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, finalResponse.clone());
                });

                return finalResponse;
            })
            .catch(async () => {
                const cached = await caches.match(event.request);
                return cached || Response.error();
            })
    );
});
