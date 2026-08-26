const CACHE_NAME = "zunoplay-v4";
const NAV_SCRIPT = "<script src=\"./nav.js\"></script>";

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
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

async function addNavigationControls(response) {
    if (!response || !response.ok) return response;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    const html = await response.text();
    if (html.includes('src="./nav.js"') || html.includes("src='./nav.js'")) {
        return new Response(html, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
        });
    }

    const updated = html.includes("</body>")
        ? html.replace(/<\/body>/i, `${NAV_SCRIPT}</body>`)
        : `${html}${NAV_SCRIPT}`;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(updated, {
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
                const result = event.request.mode === "navigate"
                    ? await addNavigationControls(response)
                    : response;

                if (result && result.status === 200) {
                    const clone = result.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone).catch(() => {});
                    });
                }

                return result;
            })
            .catch(() => caches.match(event.request))
    );
});