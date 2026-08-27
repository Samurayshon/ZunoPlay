(()=>{
  if(window.__ZUNO_AVATAR_HOME_SYNC_UNIFIED__)return;
  window.__ZUNO_AVATAR_HOME_SYNC_UNIFIED__=true;
  const STYLE='zuno-studio-v1';
  let cfg=null,applying=false,observerInstalled=false,readTimer=0;

  function normalize(v){return window.ZunoAvatarRenderer?.normalize?window.ZunoAvatarRenderer.normalize(v):null}
  function valid(v){return !!v&&v.style===STYLE}

  function mount(){
    if(!cfg||applying||!window.ZunoAvatarRenderer)return;
    applying=true;
    try{
      const wrap=document.getElementById('profileAvatarWrap');
      if(wrap){
        let glow=wrap.querySelector('.profile-glow');
        if(!glow){glow=document.createElement('div');glow.className='profile-glow'}
        let img=wrap.querySelector('img[data-zuno-studio-avatar="1"]');
        if(!img){img=document.createElement('img');img.className='profile-avatar';img.dataset.zunoStudioAvatar='1'}
        if(window.ZunoAvatarRenderer.mount(img,cfg)!==false){
          if(wrap.children.length!==2||wrap.firstElementChild!==glow||wrap.lastElementChild!==img)wrap.replaceChildren(glow,img)
        }
      }
      const p=document.getElementById('profileButton');
      if(p){
        let mini=p.querySelector('img[data-zuno-studio-avatar="1"]');
        if(!mini){mini=document.createElement('img');mini.dataset.zunoStudioAvatar='1'}
        if(window.ZunoAvatarRenderer.mount(mini,cfg)!==false){
          if(p.children.length!==1||p.firstElementChild!==mini)p.replaceChildren(mini)
        }
      }
    }finally{applying=false}
  }

  function installScopedObservers(){
    if(observerInstalled)return;
    const nodes=[document.getElementById('profileAvatarWrap'),document.getElementById('profileButton')].filter(Boolean);
    if(!nodes.length)return;
    const observer=new MutationObserver(()=>{if(!applying)queueMicrotask(mount)});
    nodes.forEach(node=>observer.observe(node,{childList:true,subtree:false}));
    observerInstalled=true;
  }

  async function readConfig(){
    let found=null;
    try{
      const local=JSON.parse(localStorage.getItem('zunoAvatarPreset')||'null');
      if(valid(local))found=normalize(local)
    }catch(_){}
    try{
      let sb=window.ZunoSupabaseClient;
      if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient('https://rliymfbbhqoejgfvsbuu.supabase.co','sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0');
      if(sb){
        const {data:{user}}=await sb.auth.getUser();
        if(user){
          const {data,error}=await sb.from('profiles').select('avatar_config').eq('id',user.id).maybeSingle();
          if(!error&&valid(data?.avatar_config)){
            const cloud=normalize(data.avatar_config);
            if(cloud){found=cloud;localStorage.setItem('zunoAvatarPreset',JSON.stringify(cloud))}
          }
        }
      }
    }catch(e){console.warn('Zuno avatar config:',e)}
    if(found){cfg=found;installScopedObservers();mount()}
  }

  function scheduleRead(delay=0){clearTimeout(readTimer);readTimer=setTimeout(()=>readConfig().catch(()=>{}),delay)}

  window.addEventListener('zuno-avatar-renderer-ready',()=>{scheduleRead(0);setTimeout(()=>{installScopedObservers();mount()},50)});
  window.addEventListener('zuno-avatar-saved',e=>{if(!valid(e.detail))return;const next=normalize(e.detail);if(!next)return;cfg=next;localStorage.setItem('zunoAvatarPreset',JSON.stringify(next));installScopedObservers();mount()});
  window.addEventListener('storage',e=>{if(e.key!=='zunoAvatarPreset'||!e.newValue)return;try{const raw=JSON.parse(e.newValue);if(!valid(raw))return;const next=normalize(raw);if(next){cfg=next;installScopedObservers();mount()}}catch(_){}});
  window.addEventListener('focus',()=>scheduleRead(120));
  window.addEventListener('pageshow',()=>scheduleRead(120));
  ['zuno:presence:sync','zuno:presence:join','zuno:presence:leave'].forEach(name=>window.addEventListener(name,()=>setTimeout(()=>{installScopedObservers();mount()},0)));

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installScopedObservers();scheduleRead(0)},{once:true});
  else{installScopedObservers();scheduleRead(0)}
  [180,700,1800].forEach(ms=>setTimeout(()=>{installScopedObservers();mount()},ms));
})();
