(() => {
  if (window.__ZUNO_AVATAR_SURFACE_SYNC_V2__) return;
  window.__ZUNO_AVATAR_SURFACE_SYNC_V2__ = true;

  const STYLE='zuno-studio-v1';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const cache=new Map();
  let client=null;
  let running=false;
  let queued=false;

  function valid(v){return !!v&&v.style===STYLE}
  function getClient(){
    if(client)return client;
    if(window.ZunoSupabaseClient)return client=window.ZunoSupabaseClient;
    if(window.supabase?.createClient){
      return client=window.supabase.createClient(
        'https://rliymfbbhqoejgfvsbuu.supabase.co',
        'sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0'
      );
    }
    return null;
  }
  function injectStyle(){
    if(document.getElementById('zuno-avatar-surface-style'))return;
    const s=document.createElement('style');
    s.id='zuno-avatar-surface-style';
    s.textContent=`
      .zuno-rendered-avatar{width:100%;height:100%;object-fit:contain;display:block;background:transparent!important}
      .zuno-profile-avatar-card{display:grid;place-items:center;margin:-2px auto 18px;width:148px;height:176px;border-radius:30px;position:relative;background:radial-gradient(circle at 50% 60%,rgba(124,58,237,.22),transparent 62%);border:1px solid rgba(139,92,246,.24);overflow:hidden}
      .zuno-profile-avatar-card:after{content:"";position:absolute;left:18px;right:18px;bottom:13px;height:19px;border-radius:50%;border:1px solid rgba(82,233,255,.46);box-shadow:0 0 20px rgba(124,58,237,.38)}
      .zuno-profile-avatar-card img{position:relative;z-index:2;width:138px;height:168px;object-fit:contain}
      .avatar-slot .avatar>img,.member-avatar>img,.chat-avatar>img{width:100%;height:100%;object-fit:contain;display:block}
    `;
    document.head.appendChild(s);
  }
  function renderInto(el,cfg){
    if(!el||!valid(cfg)||!window.ZunoAvatarRenderer)return false;
    let img;
    if(el.tagName==='IMG'){
      img=el;
    }else{
      img=el.querySelector(':scope > img[data-zuno-studio-avatar="1"]');
      if(!img){
        img=document.createElement('img');
        img.dataset.zunoStudioAvatar='1';
        img.className='zuno-rendered-avatar';
        el.replaceChildren(img);
      }
    }
    return window.ZunoAvatarRenderer.mount(img,cfg)!==false;
  }
  async function fetchByIds(ids){
    const unique=[...new Set(ids.filter(Boolean))];
    const missing=unique.filter(id=>!cache.has('id:'+id));
    const sb=getClient();
    if(missing.length&&sb){
      const {data,error}=await sb.from('profiles').select('id,avatar_config').in('id',missing);
      if(!error)(data||[]).forEach(p=>cache.set('id:'+p.id,valid(p.avatar_config)?p.avatar_config:null));
      missing.forEach(id=>{if(!cache.has('id:'+id))cache.set('id:'+id,null)});
    }
    return new Map(unique.map(id=>[id,cache.get('id:'+id)||null]));
  }
  async function fetchByUsernames(names){
    const clean=[...new Set(names.map(n=>String(n||'').replace(/^@/,'').trim()).filter(Boolean))];
    const missing=clean.filter(n=>!cache.has('user:'+n.toLowerCase()));
    const sb=getClient();
    if(missing.length&&sb){
      const {data,error}=await sb.from('profiles').select('username,avatar_config').in('username',missing);
      if(!error)(data||[]).forEach(p=>cache.set('user:'+String(p.username||'').toLowerCase(),valid(p.avatar_config)?p.avatar_config:null));
      missing.forEach(n=>{const k='user:'+n.toLowerCase();if(!cache.has(k))cache.set(k,null)});
    }
    return new Map(clean.map(n=>[n.toLowerCase(),cache.get('user:'+n.toLowerCase())||null]));
  }

  async function syncProfilePage(){
    if(page!=='perfil.html')return;
    const card=document.querySelector('#content .card');
    if(!card||card.querySelector('.zuno-profile-avatar-card'))return;
    const sb=getClient(); if(!sb)return;
    let id=new URLSearchParams(location.search).get('user');
    if(!id){
      const {data}=await sb.auth.getUser();
      id=data?.user?.id||null;
    }
    if(!id)return;
    const configs=await fetchByIds([id]),cfg=configs.get(id);
    if(!valid(cfg))return;
    const box=document.createElement('div');
    box.className='zuno-profile-avatar-card';
    const img=document.createElement('img');
    img.dataset.zunoStudioAvatar='1';
    box.appendChild(img);
    const name=card.querySelector('.name');
    if(name)card.insertBefore(box,name);else card.prepend(box);
    window.ZunoAvatarRenderer.mount(img,cfg);
  }

  async function syncIdSurfaces(){
    const nodes=[...document.querySelectorAll('[data-user-id],[data-profile-id],[data-friend-id]')];
    if(!nodes.length)return;
    const idOf=el=>el.dataset.userId||el.dataset.profileId||el.dataset.friendId||'';
    const configs=await fetchByIds(nodes.map(idOf));
    nodes.forEach(node=>{
      const cfg=configs.get(idOf(node));
      if(!valid(cfg))return;
      const targets=node.matches('.avatar,.member-avatar,.chat-avatar,.friend-avatar,.top-avatar')
        ? [node]
        : [...node.querySelectorAll('.avatar,.member-avatar,.chat-avatar,.friend-avatar,.top-avatar')];
      targets.forEach(t=>renderInto(t,cfg));
    });
  }

  async function syncUsernameSurfaces(){
    const rows=[...document.querySelectorAll('.chat-row')].filter(r=>!r.dataset.zunoAvatarSynced);
    if(!rows.length)return;
    const names=rows.map(r=>r.querySelector('.message-user')?.textContent||'');
    const configs=await fetchByUsernames(names);
    rows.forEach(row=>{
      const raw=row.querySelector('.message-user')?.textContent||'';
      const name=raw.replace(/^@/,'').trim().toLowerCase();
      const cfg=configs.get(name);
      if(valid(cfg)){
        const target=row.querySelector('.chat-avatar');
        if(target)renderInto(target,cfg);
      }
      row.dataset.zunoAvatarSynced='1';
    });
  }

  async function syncCurrentLocal(){
    let cfg=null;
    try{const raw=JSON.parse(localStorage.getItem('zunoAvatarPreset')||'null');if(valid(raw))cfg=window.ZunoAvatarRenderer?.normalize?.(raw)||raw}catch(_){}
    if(!valid(cfg))return;
    document.querySelectorAll('[data-zuno-current-avatar],#profileButton img[data-zuno-studio-avatar="1"]').forEach(el=>renderInto(el,cfg));
  }

  async function run(){
    if(running){queued=true;return}
    running=true;
    try{
      injectStyle();
      await syncProfilePage();
      await syncIdSurfaces();
      await syncUsernameSurfaces();
      await syncCurrentLocal();
    }catch(e){console.warn('Zuno avatar surface sync:',e)}
    finally{
      running=false;
      if(queued){queued=false;setTimeout(run,40)}
    }
  }

  const queue=()=>{clearTimeout(queue.t);queue.t=setTimeout(run,80)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('zuno-avatar-saved',()=>{cache.clear();run()});
  window.addEventListener('storage',e=>{if(e.key==='zunoAvatarPreset'){cache.clear();run()}});
  window.addEventListener('focus',run);
  [250,700,1500,3000].forEach(ms=>setTimeout(run,ms));
})();