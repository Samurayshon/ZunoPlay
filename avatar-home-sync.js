(()=>{
  if(window.__ZUNO_AVATAR_HOME_SYNC_UNIFIED__)return;
  window.__ZUNO_AVATAR_HOME_SYNC_UNIFIED__=true;
  const STYLE='zuno-studio-v1';
  let cfg=null,applying=false,observerInstalled=false,readTimer=0,readySent=false;

  document.documentElement.dataset.zunoAvatarSystem='studio';

  function normalize(v){return window.ZunoAvatarRenderer?.normalize?window.ZunoAvatarRenderer.normalize(v):null}
  function valid(v){return !!v&&v.style===STYLE}
  function clone(v){return v?JSON.parse(JSON.stringify(v)):v}
  function markReady(source='studio'){
    document.documentElement.dataset.zunoAvatarHomeReady='1';
    if(readySent)return;
    readySent=true;
    window.dispatchEvent(new CustomEvent('zuno:avatar-home-ready',{detail:{source}}));
  }

  function homeDisplayConfig(){
    const display=clone(cfg);
    if(!display)return null;
    display.mode='Corpo inteiro';
    display.selections={...(display.selections||{}),Mascote:1,Efeitos:1};
    return normalize(display)||display;
  }
  function miniDisplayConfig(){
    const display=clone(cfg);
    if(!display)return null;
    display.mode='Perfil';
    display.selections={...(display.selections||{}),Mascote:0,Efeitos:0};
    return normalize(display)||display;
  }

  function mount(source='studio'){
    if(!cfg||applying||!window.ZunoAvatarRenderer)return false;
    applying=true;
    let mounted=false;
    try{
      const wrap=document.getElementById('profileAvatarWrap');
      if(wrap){
        let glow=wrap.querySelector('.profile-glow');
        if(!glow){glow=document.createElement('div');glow.className='profile-glow'}
        let img=wrap.querySelector('img[data-zuno-studio-avatar="1"]');
        if(!img){img=document.createElement('img');img.className='profile-avatar';img.dataset.zunoStudioAvatar='1'}
        const display=homeDisplayConfig();
        if(display&&window.ZunoAvatarRenderer.mount(img,display)!==false){
          if(wrap.children.length!==2||wrap.firstElementChild!==glow||wrap.lastElementChild!==img)wrap.replaceChildren(glow,img);
          mounted=true;
        }
      }
      const p=document.getElementById('profileButton');
      if(p){
        let mini=p.querySelector('img[data-zuno-studio-avatar="1"]');
        if(!mini){mini=document.createElement('img');mini.dataset.zunoStudioAvatar='1'}
        const display=miniDisplayConfig();
        if(display&&window.ZunoAvatarRenderer.mount(mini,display)!==false){
          if(p.children.length!==1||p.firstElementChild!==mini)p.replaceChildren(mini);
          mounted=true;
        }
      }
    }finally{applying=false}
    if(mounted)markReady(source);
    return mounted;
  }

  function installScopedObservers(){
    if(observerInstalled)return;
    const nodes=[document.getElementById('profileAvatarWrap'),document.getElementById('profileButton')].filter(Boolean);
    if(!nodes.length)return;
    const observer=new MutationObserver(()=>{if(!applying)queueMicrotask(()=>mount('observer'))});
    nodes.forEach(node=>observer.observe(node,{childList:true,subtree:false}));
    observerInstalled=true;
  }

  function defaultConfig(){
    const defaults=window.ZunoAvatarRenderer?.defaults;
    if(!defaults)return null;
    const reference=JSON.parse(JSON.stringify(defaults));
    reference.model='masculino';
    reference.mode='Corpo inteiro';
    reference.selections={...(reference.selections||{}),Base:0,Rosto:0,Cabelo:1,Roupas:0,Calçados:1,Acessórios:2,Mascote:1,Efeitos:1};
    reference.colors={...(reference.colors||{}),pele:2,cabelo:5,roupa:1};
    reference.rotation=0;
    reference.zoom=1.04;
    return normalize(reference)||reference;
  }

  async function readConfig(){
    let localFound=null;
    try{
      const local=JSON.parse(localStorage.getItem('zunoAvatarPreset')||'null');
      if(valid(local))localFound=normalize(local)
    }catch(_){}

    if(localFound){
      cfg=localFound;
      installScopedObservers();
      mount('local');
    }

    try{
      let sb=window.ZunoSupabaseClient;
      if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient('https://rliymfbbhqoejgfvsbuu.supabase.co','sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0');
      if(sb){
        const {data:{session}}=await sb.auth.getSession();
        const user=session?.user||null;
        if(user){
          const {data,error}=await sb.from('profiles').select('avatar_config').eq('id',user.id).maybeSingle();
          if(!error&&valid(data?.avatar_config)){
            const cloud=normalize(data.avatar_config);
            if(cloud){
              cfg=cloud;
              localStorage.setItem('zunoAvatarPreset',JSON.stringify(cloud));
              installScopedObservers();
              mount('cloud');
              return;
            }
          }
        }
      }
    }catch(e){console.warn('Zuno avatar config:',e)}

    if(!cfg){
      cfg=defaultConfig();
      if(cfg){installScopedObservers();mount('default')}
    }
  }

  function scheduleRead(delay=0){clearTimeout(readTimer);readTimer=setTimeout(()=>readConfig().catch(()=>{}),delay)}

  window.addEventListener('zuno-avatar-renderer-ready',()=>{scheduleRead(0);setTimeout(()=>{installScopedObservers();mount('renderer')},50)});
  window.addEventListener('zuno-avatar-saved',e=>{if(!valid(e.detail))return;const next=normalize(e.detail);if(!next)return;cfg=next;localStorage.setItem('zunoAvatarPreset',JSON.stringify(next));installScopedObservers();mount('saved')});
  window.addEventListener('storage',e=>{if(e.key!=='zunoAvatarPreset'||!e.newValue)return;try{const raw=JSON.parse(e.newValue);if(!valid(raw))return;const next=normalize(raw);if(next){cfg=next;installScopedObservers();mount('storage')}}catch(_){}});
  window.addEventListener('focus',()=>scheduleRead(120));
  window.addEventListener('pageshow',()=>scheduleRead(120));
  ['zuno:presence:sync','zuno:presence:join','zuno:presence:leave'].forEach(name=>window.addEventListener(name,()=>setTimeout(()=>{installScopedObservers();mount('presence')},0)));

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installScopedObservers();scheduleRead(0)},{once:true});
  else{installScopedObservers();scheduleRead(0)}

  setTimeout(()=>{
    if(cfg)return;
    cfg=defaultConfig();
    if(cfg){installScopedObservers();mount('fallback-timeout')}
  },1800);
})();
