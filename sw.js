const CACHE_NAME = "zunoplay-v167";

const STATIC_FILES = [
  "./","./index.html","./login.html","./cadastro.html","./perfil.html","./avatar.html","./salas.html","./sala.html",
  "./manifest.json","./icon-192.png","./icon-512.png","./nav.js","./home-app.js","./realtime-global.js",
  "./avatar-renderer.js","./avatar-home-sync.js","./zuno-design-system.css","./zuno-current-base.css","./zuno-current.js",
  "./zuno-current-home.css","./zuno-current-home.js","./zuno-current-home-polish-v164.css","./zuno-current-avatar-studio.css",
  "./zuno-avatar-studio-reference-v167.js"
];

function fetchWithTimeout(input, init = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function preCacheInBatches(cache, files, batchSize = 3) {
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(async url => {
      try {
        const response = await fetchWithTimeout(url, { cache: "no-cache" }, 7000);
        if (response && response.ok) await cache.put(url, response);
      } catch (_) {}
    }));
    await new Promise(resolve => setTimeout(resolve, 40));
  }
}

function isCurrentUiAsset(url) {
  const path = url.pathname.toLowerCase();
  return path.includes('/zuno-current') ||
    path.endsWith('/zuno-avatar-studio-reference-v167.js') ||
    path.endsWith('/zuno-home-reference-v152.css') ||
    path.endsWith('/avatar-home-sync.js') ||
    path.endsWith('/avatar-renderer.js') ||
    path.endsWith('/nav.js') ||
    path.endsWith('/home-app.js');
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await preCacheInBatches(cache, STATIC_FILES, 3);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function currentCacheMatch(request, options) {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(request, options);
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetchWithTimeout(request, { cache: "no-store" }, 4000);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          event.waitUntil(cache.put(request, fresh.clone()));
          return fresh;
        }
        throw new Error("navigation_not_ok");
      } catch (_) {
        const cached = await currentCacheMatch(request, { ignoreSearch: true });
        if (cached) return cached;
        const fallback = await currentCacheMatch("./index.html");
        if (fallback) return fallback;
        return new Response("ZunoPlay temporariamente indisponível. Tente novamente.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
      }
    })());
    return;
  }

  if (isCurrentUiAsset(url)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetchWithTimeout(request, { cache: "no-store" }, 5000);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          event.waitUntil(cache.put(request, fresh.clone()));
          return fresh;
        }
        throw new Error("ui_asset_not_ok");
      } catch (_) {
        const cached = await currentCacheMatch(request, { ignoreSearch: true });
        if (cached) return cached;
        return new Response("Recurso de interface indisponível.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const exactCached = await currentCacheMatch(request);
    if (exactCached) return exactCached;
    try {
      const fresh = await fetchWithTimeout(request, { cache: "no-store" }, 5000);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        event.waitUntil(cache.put(request, fresh.clone()));
      }
      return fresh;
    } catch (_) {
      const offlineFallback = await currentCacheMatch(request, { ignoreSearch: true });
      if (offlineFallback) return offlineFallback;
      return new Response("Recurso indisponível offline.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
    }
  })());
});