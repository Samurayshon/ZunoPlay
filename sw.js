const CACHE_NAME = "zunoplay-v159";
const STATIC_FILES = [
  "./","./index.html","./cadastro.html","./login.html","./perfil.html","./avatar.html","./amigos.html","./conversas.html","./notificacoes.html","./comunidades.html","./salas.html","./sala.html","./jogos.html","./desafio.html","./partida.html","./reflexo.html","./precisao.html","./arena.html","./zuno-caos.html","./zuno-rush.html","./zuno-pulse.html","./zuno-stack.html","./historico.html","./manifest.json","./icon-192.png","./icon-512.png","./nav.js","./home-app.js",
  "./zuno-design-system.css","./zuno-unified.css","./zuno-unified.js","./zuno-navigation.css","./zuno-navigation.js","./zuno-social.css","./zuno-social.js",
  "./zuno-game-progression.css","./zuno-game-progression.js","./zuno-game-social.css","./zuno-game-social.js","./zuno-mini-games.css","./zuno-mini-games.js","./zuno-caos.js","./zuno-rush.js","./zuno-pulse.js","./zuno-stack.js","./zuno-stack-catalog.js","./zuno-stack-pieces.css","./zuno-stack-pieces.js","./zuno-stack-pieces.webp",
  "./zuno-room-experience.css","./zuno-room-experience.js","./zuno-room-fit.css","./zuno-room-extras.css","./zuno-voice-feedback.css","./zuno-voice-feedback.js","./zuno-room-profile-card.css","./zuno-room-profile-card.js","./zuno-directed-gifts.css","./zuno-directed-gifts.js","./zuno-room-games.css","./zuno-room-games.js","./zuno-room-game-return.js","./zuno-room-moderation.css","./zuno-room-moderation.js",
  "./avatar-asset-registry.js","./avatar-renderer.js","./avatar-preview-sync.js","./avatar-stage-controls.js","./avatar-home-sync.js",
  "./zuno-current-base.css","./zuno-current.js","./zuno-current-stage.css","./zuno-current-home.css","./zuno-current-home.js","./zuno-current-home-mobile.css","./zuno-current-home-stats.css","./zuno-current-interactions.css","./zuno-current-viewport.css","./zuno-current-viewport-v154.css","./zuno-current-hero-separation.css","./zuno-home-reference-v152.css",
  "./realtime-global.js","./presenca-sala.js","./voz-sala.js","./room-session-guard.js"
];

function fetchWithTimeout(input, init = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function isCurrentUiAsset(url) {
  const path = url.pathname.toLowerCase();
  return path.includes('/zuno-current') ||
    path.endsWith('/zuno-home-reference-v152.css') ||
    path.endsWith('/avatar-home-sync.js') ||
    path.endsWith('/avatar-renderer.js') ||
    path.endsWith('/nav.js') ||
    path.endsWith('/home-app.js');
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(STATIC_FILES.map(async url => {
      try {
        const response = await fetchWithTimeout(url, { cache: "reload" }, 7000);
        if (response && response.ok) await cache.put(url, response);
      } catch (_) {}
    }));
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
    if (exactCached) {
      event.waitUntil((async () => {
        try {
          const fresh = await fetchWithTimeout(request, { cache: "no-store" }, 5000);
          if (fresh && fresh.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, fresh.clone());
          }
        } catch (_) {}
      })());
      return exactCached;
    }

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