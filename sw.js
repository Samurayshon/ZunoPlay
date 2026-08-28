const CACHE_NAME = "zunoplay-v171";

// Um único shell coerente por geração. Nunca misturar assets de caches antigos.
const STATIC_FILES = [
  "./","./index.html","./login.html","./cadastro.html","./perfil.html","./avatar.html","./amigos.html","./conversas.html","./notificacoes.html","./comunidades.html","./salas.html","./sala.html","./jogos.html","./historico.html","./zuno-core.html","./zuno-stack.html",
  "./manifest.json","./nav.js","./home-app.js","./realtime-global.js","./room-session-guard.js",
  "./avatar-renderer.js","./avatar-home-sync.js","./avatar-asset-registry.js",
  "./zuno-design-system.css","./zuno-unified.css","./zuno-unified.js","./zuno-current.js","./zuno-current-base.css","./zuno-current-stage.css","./zuno-current-home.css","./zuno-current-home.js","./zuno-current-home-mobile.css","./zuno-current-home-stats.css","./zuno-current-interactions.css","./zuno-home-reference-v152.css","./zuno-current-viewport.css","./zuno-current-viewport-v154.css","./zuno-current-hero-separation.css","./zuno-current-home-polish-v164.css",
  "./zuno-game-progression.css","./zuno-game-progression.js","./zuno-core.js","./zuno-stack.js","./zuno-stack-pieces.css","./zuno-stack-pieces.js","./zuno-stack-pieces.svg","./zuno-stack-pieces.webp",
  "./zuno-current-avatar-studio.css","./zuno-avatar-studio-reference-v167.js","./zuno-avatar-studio-reference-v169.css","./zuno-avatar-studio-reference-v169.js","./zuno-avatar-studio-reference-v170.css","./zuno-avatar-studio-fixes-v170.js","./zuno-avatar-studio-mobile-v171.css","./zuno-avatar-studio-command-hierarchy-v172.js","./zuno-current-avatar-finish-v174.css"
];

const INFLIGHT = new Map();
const BACKOFF_UNTIL = new Map();

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function retryAfterMs(response){
  const raw=response?.headers?.get?.('retry-after');
  if(!raw)return 60000;
  const seconds=Number(raw);
  if(Number.isFinite(seconds))return Math.max(1000,seconds*1000);
  const date=Date.parse(raw);
  return Number.isFinite(date)?Math.max(1000,date-Date.now()):60000;
}
function keyFor(input){return typeof input==='string'?new URL(input,self.location.href).href:input.url}
function originFor(input){return new URL(keyFor(input)).origin}

function fetchWithTimeout(input,init={},timeoutMs=6000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return fetch(input,{...init,signal:controller.signal}).finally(()=>clearTimeout(timer));
}

async function dedupedFetch(input,init={},timeoutMs=6000){
  const key=keyFor(input),origin=originFor(input),blockedUntil=BACKOFF_UNTIL.get(origin)||0;
  if(Date.now()<blockedUntil)throw new Error('rate_limited_backoff');
  if(INFLIGHT.has(key))return (await INFLIGHT.get(key)).clone();
  const task=(async()=>{
    const response=await fetchWithTimeout(input,init,timeoutMs);
    if(response.status===429){
      BACKOFF_UNTIL.set(origin,Date.now()+retryAfterMs(response));
      throw new Error('rate_limited_429');
    }
    return response;
  })().finally(()=>INFLIGHT.delete(key));
  INFLIGHT.set(key,task);
  return (await task).clone();
}

async function preCacheSequential(cache,files){
  for(const url of files){
    try{
      const response=await dedupedFetch(url,{cache:'reload'},7000);
      if(response?.ok)await cache.put(url,response.clone());
    }catch(_){}
    await sleep(75);
  }
}

function isCurrentUiAsset(url){
  const path=url.pathname.toLowerCase();
  return path.includes('/zuno-current')||
    path.endsWith('/zuno-avatar-studio-reference-v167.js')||
    path.endsWith('/zuno-avatar-studio-reference-v169.css')||
    path.endsWith('/zuno-avatar-studio-reference-v169.js')||
    path.endsWith('/zuno-avatar-studio-reference-v170.css')||
    path.endsWith('/zuno-avatar-studio-fixes-v170.js')||
    path.endsWith('/zuno-avatar-studio-mobile-v171.css')||
    path.endsWith('/zuno-avatar-studio-command-hierarchy-v172.js')||
    path.endsWith('/zuno-home-reference-v152.css')||
    path.endsWith('/avatar-home-sync.js')||
    path.endsWith('/avatar-renderer.js')||
    path.endsWith('/nav.js')||
    path.endsWith('/home-app.js')||
    path.endsWith('/zuno-unified.js')||
    path.endsWith('/zuno-unified.css');
}

async function cacheMatch(request,ignoreSearch=false){
  const cache=await caches.open(CACHE_NAME);
  return cache.match(request,{ignoreSearch});
}
async function cachePut(request,response){
  if(!response?.ok)return;
  const cache=await caches.open(CACHE_NAME);
  try{await cache.put(request,response.clone())}catch(_){}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await preCacheSequential(cache,STATIC_FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await dedupedFetch(request,{cache:'no-store'},4000);
        if(fresh?.ok){event.waitUntil(cachePut(request,fresh));return fresh}
      }catch(_){}
      const cached=await cacheMatch(request,true);
      if(cached)return cached;
      const fallback=await cacheMatch('./index.html',true);
      if(fallback)return fallback;
      return new Response('ZunoPlay temporariamente indisponível. Tente novamente.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    })());
    return;
  }

  if(isCurrentUiAsset(url)){
    event.respondWith((async()=>{
      // Interface ativa é network-first. O cache só entra como fallback da MESMA geração v171.
      try{
        const fresh=await dedupedFetch(request,{cache:'no-store'},4000);
        if(fresh?.ok){event.waitUntil(cachePut(request,fresh));return fresh}
      }catch(_){}
      const exact=await cacheMatch(request,false);
      if(exact)return exact;
      const sameGeneration=await cacheMatch(request,true);
      if(sameGeneration)return sameGeneration;
      return new Response('Recurso de interface indisponível.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await cacheMatch(request,false);
    if(cached)return cached;
    try{
      const fresh=await dedupedFetch(request,{cache:'no-cache'},5000);
      if(fresh?.ok)event.waitUntil(cachePut(request,fresh));
      return fresh;
    }catch(_){
      const sameGeneration=await cacheMatch(request,true);
      if(sameGeneration)return sameGeneration;
      return new Response('Recurso indisponível offline.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});