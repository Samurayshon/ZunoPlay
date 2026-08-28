const CACHE_NAME = "zunoplay-v169";

// Shell essencial em fila única para evitar rajadas durante atualização do PWA.
const STATIC_FILES = [
  "./","./index.html","./login.html","./cadastro.html","./perfil.html","./avatar.html","./salas.html","./sala.html",
  "./manifest.json","./nav.js","./home-app.js","./realtime-global.js","./avatar-renderer.js","./avatar-home-sync.js",
  "./zuno-current.js","./zuno-current-avatar-studio.css","./zuno-avatar-studio-reference-v167.js",
  "./zuno-avatar-studio-reference-v169.css","./zuno-avatar-studio-reference-v169.js"
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
      const response=await dedupedFetch(url,{cache:'no-cache'},7000);
      if(response?.ok)await cache.put(url,response.clone());
    }catch(_){}
    await sleep(90);
  }
}

function isCurrentUiAsset(url){
  const path=url.pathname.toLowerCase();
  return path.includes('/zuno-current')||
    path.endsWith('/zuno-avatar-studio-reference-v167.js')||
    path.endsWith('/zuno-avatar-studio-reference-v169.css')||
    path.endsWith('/zuno-avatar-studio-reference-v169.js')||
    path.endsWith('/zuno-home-reference-v152.css')||
    path.endsWith('/avatar-home-sync.js')||
    path.endsWith('/avatar-renderer.js')||
    path.endsWith('/nav.js')||
    path.endsWith('/home-app.js')||
    path.endsWith('/realtime-global.js');
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
      const cached=await cacheMatch(request,true);
      try{
        const fresh=await dedupedFetch(request,{cache:'no-cache'},4500);
        if(fresh?.ok){event.waitUntil(cachePut(request,fresh));return fresh}
      }catch(_){}
      if(cached)return cached;
      const fallback=await cacheMatch('./index.html',true);
      if(fallback)return fallback;
      return new Response('ZunoPlay temporariamente indisponível. Tente novamente.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    })());
    return;
  }

  if(isCurrentUiAsset(url)){
    event.respondWith((async()=>{
      // Interface versionada: cache primeiro. A instalação do novo SW já atualiza o cache.
      const cached=await cacheMatch(request,true);
      if(cached)return cached;
      try{
        const fresh=await dedupedFetch(request,{cache:'no-cache'},5000);
        if(fresh?.ok){event.waitUntil(cachePut(request,fresh));return fresh}
      }catch(_){}
      return new Response('Recurso de interface indisponível.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await cacheMatch(request,false)||await cacheMatch(request,true);
    if(cached)return cached;
    try{
      const fresh=await dedupedFetch(request,{cache:'no-cache'},5000);
      if(fresh?.ok)event.waitUntil(cachePut(request,fresh));
      return fresh;
    }catch(_){
      return new Response('Recurso indisponível offline.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});