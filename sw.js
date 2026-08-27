const CACHE_NAME = "zunoplay-v38";
const STATIC_FILES = [
  "./",
  "./index.html",
  "./cadastro.html",
  "./login.html",
  "./perfil.html",
  "./avatar.html",
  "./amigos.html",
  "./conversas.html",
  "./notificacoes.html",
  "./comunidades.html",
  "./salas.html",
  "./sala.html",
  "./jogos.html",
  "./desafio.html",
  "./historico.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./nav.js",
  "./official-avatars.js",
  "./assets/avatars/avatar-feminino-oficial.webp",
  "./assets/avatars/male-v38.part1.b64",
  "./assets/avatars/male-v38.part2.b64",
  "./assets/avatars/male-v38.part3.b64",
  "./assets/avatars/male-v38.part4.b64",
  "./assets/avatars/male-v38.part5.b64",
  "./home-v29.css",
  "./home-v29.js",
  "./realtime-global.js",
  "./presenca-sala.js",
  "./voz-sala.js",
  "./room-session-guard.js"
];

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
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(hit => hit || caches.match("./index.html")))
  );
});
