(()=>{
  if(window.__ZUNO_AVATAR_HOME_SYNC_UNIFIED__)return;
  window.__ZUNO_AVATAR_HOME_SYNC_UNIFIED__=true;
  const STYLE='zuno-studio-v1';
  let cfg=null,applying=false,observerInstalled=false,readTimer=0,readySent=false,lastCloudRead=0,cloudReadPromise=null;
  document.documentElement.dataset.zunoAvatarSystem='studio';
  function stripLegacy(v){if(!v)return v;const c=JSON.parse(JSON.stringify(v));if(c.selections)delete c.selections.Efeitos;return c}
  function normalize(v){const clean=stripLegacy(v);return window.ZunoAvatarRenderer?.normalize?window.ZunoAvatarRenderer.normalize(clean):clean}
  function valid(v){return !!v&&v.style===STYLE}
  function clone(v){return v?JSON.parse(JSON.stringify(v)):v}
  function stamp(v){const t=Date.parse(v?.updatedAt||'');return Number.isFinite(t)?t:0}
  function newest(a,b){if(!a)return b||null;if(!b)return a;const at=stamp(a),bt=stamp(b);if(at!==bt)return at>bt?a:b;return a}
  function markReady(source='studio'){document.documentElement.dataset.zunoAvatarHomeReady='1';if(readySent)return;readySent=true;window.dispatchEvent(new CustomEvent('zuno:avatar-home-ready',{detail:{source}}))}
  function homeDisplayConfig(){const display=clone(cfg);if(!display)return null;display.mode='Corpo inteiro';display.selections={...(display.selections||{}),Mascote:0};delete display.selections.Efeitos;return normalize(display)||display}
  function miniDisplayConfig(){const display=clone(cfg);if(!display)return null;display.mode='Perfil';display.selections={...(display.selections||{}),Mascote:0};delete display.selections.Efeitos;return normalize(display)||display}
  function miniTargets(){const set=new Set();const home=document.getElementById('profileButton');if(home)set.add(home);document.querySelectorAll('.zuno-global-action.is-profile').forEach(el=>set.add(el));return [...set]}
  function mount(source='studio'){
    if(!cfg||applying||!window.ZunoAvatarRenderer)return false;applying=true;let mounted=false;
    try{
      const wrap=document.getElementById('profileAvatarWrap');
      if(wrap){let glow=wrap.querySelector('.profile-glow');if(!glow){glow=document.createElement('div');glow.className='profile-glow'}let img=wrap.querySelector('img[data-zuno-studio-avatar="1"]');if(!img){img=document.createElement('img');img.className='profile-avatar';img.dataset.zunoStudioAvatar='1'}const display=homeDisplayConfig();if(display&&window.ZunoAvatarRenderer.mount(img,display)!==false){img.style.transform='scale(1.075)';img.style.transformOrigin='50% 100%';if(wrap.children.length!==2||wrap.firstElementChild!==glow||wrap.lastElementChild!==img)wrap.replaceChildren(glow,img);mounted=true}}
      const display=miniDisplayConfig();
      miniTargets().forEach(p=>{let mini=p.querySelector('img[data-zuno-studio-avatar="1"]');if(!mini){mini=document.createElement('img');mini.dataset.zunoStudioAvatar='1'}if(display&&window.ZunoAvatarRenderer.mount(mini,display)!==false){mini.style.transform='none';if(p.children.length!==1||p.firstElementChild!==mini)p.replaceChildren(mini);p.classList.add('has-zuno-avatar');mounted=true}})
    }finally{applying=false}
    if(mounted)markReady(source);return mounted
  }
  function installScopedObservers(){if(observerInstalled)return;const nodes=[document.getElementById('profileAvatarWrap'),...miniTargets()].filter(Boolean);if(!nodes.length)return;const observer=new MutationObserver(()=>{if(!applying)queueMicrotask(()=>mount('observer'))});nodes.forEach(node=>observer.observe(node,{childList:true,subtree:false}));observerInstalled=true}
  function defaultConfig(){const defaults=window.ZunoAvatarRenderer?.defaults;if(!defaults)return null;const reference=stripLegacy(defaults);reference.model='masculino';reference.mode='Corpo inteiro';reference.selections={...(reference.selections||{}),Acessórios:0,Mascote:0};delete reference.selections.Efeitos;reference.rotation=0;reference.zoom=1;return normalize(reference)||reference}
  async function readCloudConfig(){if(cloudReadPromise)return cloudReadPromise;if(cfg&&Date.now()-lastCloudRead<15000)return null;lastCloudRead=Date.now();cloudReadPromise=(async()=>{try{let sb=window.ZunoSupabaseClient;if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient('https://rliymfbbhqoejgfvsbuu.supabase.co','sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0');if(!sb)return null;const {data:{session}}=await sb.auth.getSession();const user=session?.user||null;if(!user)return null;const {data,error}=await sb.from('profiles').select('avatar_config').eq('id',user.id).maybeSingle();if(error||!valid(data?.avatar_config))return null;return normalize(data.avatar_config)}catch(e){console.warn('Zuno avatar config:',e);return null}})().finally(()=>{cloudReadPromise=null});return cloudReadPromise}
  async function readConfig(){let localFound=null;try{const local=JSON.parse(localStorage.getItem('zunoAvatarPreset')||'null');if(valid(local))localFound=normalize(local)}catch(_){}if(localFound){cfg=localFound;localStorage.setItem('zunoAvatarPreset',JSON.stringify(localFound));installScopedObservers();mount('local')}const cloud=await readCloudConfig();if(cloud){const chosen=newest(localFound||cfg,cloud);if(chosen){cfg=normalize(chosen);localStorage.setItem('zunoAvatarPreset',JSON.stringify(cfg));installScopedObservers();mount(chosen===cloud?'cloud-newer':'local-newer')}return}if(!cfg){cfg=defaultConfig();if(cfg){installScopedObservers();mount('default')}}}
  function scheduleRead(delay=0){clearTimeout(readTimer);readTimer=setTimeout(()=>readConfig().catch(()=>{}),delay)}
  window.addEventListener('zuno-avatar-renderer-ready',()=>{scheduleRead(0);setTimeout(()=>{installScopedObservers();mount('renderer')},50)});
  window.addEventListener('zuno-avatar-saved',e=>{if(!valid(e.detail))return;const next=normalize(e.detail);if(!next)return;cfg=next;localStorage.setItem('zunoAvatarPreset',JSON.stringify(next));installScopedObservers();mount('saved')});
  window.addEventListener('storage',e=>{if(e.key!=='zunoAvatarPreset'||!e.newValue)return;try{const raw=JSON.parse(e.newValue);if(!valid(raw))return;const next=normalize(raw);if(next&&newest(cfg,next)===next){cfg=next;localStorage.setItem('zunoAvatarPreset',JSON.stringify(next));installScopedObservers();mount('storage')}}catch(_){}});
  window.addEventListener('focus',()=>scheduleRead(700));window.addEventListener('pageshow',()=>scheduleRead(500));window.addEventListener('zuno:shell-mounted',()=>{setTimeout(()=>{installScopedObservers();mount('shell')},0);setTimeout(()=>mount('shell-late'),350)});['zuno:presence:sync','zuno:presence:join','zuno:presence:leave'].forEach(name=>window.addEventListener(name,()=>setTimeout(()=>{installScopedObservers();mount('presence')},0)));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installScopedObservers();scheduleRead(0);setTimeout(()=>mount('dom-late'),450)},{once:true});else{installScopedObservers();scheduleRead(0);setTimeout(()=>mount('ready-late'),450)}
  setTimeout(()=>{if(cfg){mount('fallback-existing');return}cfg=defaultConfig();if(cfg){installScopedObservers();mount('fallback-timeout')}},1800);
})();