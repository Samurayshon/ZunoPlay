(()=>{
  if(window.__ZUNOPLAY_OFFICIAL_AVATARS__)return;
  window.__ZUNOPLAY_OFFICIAL_AVATARS__=true;
  const VERSION='47';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();

  function normalizeSex(value){return String(value||'').toLowerCase()==='feminino'?'feminino':'masculino'}
  function safeAvatar(value){
    const v=String(value||'').trim();
    return /^(data:image\/(?:svg\+xml|png|jpeg|webp);|https:\/\/)/i.test(v)?v:null;
  }
  function isCustomAvatar(value){return !!safeAvatar(value)}
  async function resolveProfile(profile){return safeAvatar(profile?.avatar_url)}
  async function ensureForCurrentUser(){return null}

  function isRemovedHomeFallback(src){
    const value=String(src||'');
    if(!value.startsWith('data:image/svg+xml'))return false;
    try{
      const raw=decodeURIComponent(value.split(',').slice(1).join(','));
      return raw.includes('viewBox="0 0 380 450"')&&raw.includes('radialGradient id="a"')&&raw.includes('linearGradient id="h"');
    }catch(_){return false}
  }
  function emptyInitial(){
    const name=(document.getElementById('username')?.textContent||'Z').trim();
    return (name.charAt(0)||'Z').toUpperCase();
  }
  function repairHomeFallback(){
    if(page!=='index.html')return;
    const wrap=document.getElementById('profileAvatarWrap');
    if(wrap){
      const wrong=wrap.querySelector('img.zuno-official-fallback');
      if(wrong||[...wrap.querySelectorAll('img')].some(img=>isRemovedHomeFallback(img.src))){
        wrap.textContent='';
        const glow=document.createElement('div');glow.className='profile-glow';
        const empty=document.createElement('div');empty.className='profile-avatar zuno-character-empty';empty.textContent=emptyInitial();empty.style.cssText='width:180px;height:180px;margin-bottom:55px;border-radius:50%;display:grid;place-items:center;font-size:70px;font-weight:950;color:#fff;background:radial-gradient(circle,#47237b,#16152c 68%);border:2px solid #7448c6';
        wrap.append(glow,empty);
      }
    }
    const mini=document.getElementById('profileButton');
    const miniImg=mini?.querySelector('img');
    if(miniImg&&isRemovedHomeFallback(miniImg.src))mini.textContent='👤';
  }
  function installHomeIntegrityGuard(){
    if(page!=='index.html')return;
    const run=()=>repairHomeFallback();
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
    const start=()=>{
      const roots=[document.getElementById('profileAvatarWrap'),document.getElementById('profileButton')].filter(Boolean);
      if(!roots.length)return;
      let scheduled=false;
      const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;repairHomeFallback()})};
      const observers=roots.map(root=>{const o=new MutationObserver(schedule);o.observe(root,{childList:true,subtree:true});return o});
      [100,350,800,1600].forEach(ms=>setTimeout(run,ms));
      window.addEventListener('pagehide',()=>observers.forEach(o=>o.disconnect()),{once:true});
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  }

  async function waitClient(){for(let i=0;i<60;i++){if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;await new Promise(r=>setTimeout(r,100))}return null}
  function setRoundAvatar(el,src,initial='?'){
    if(!el)return;
    el.textContent='';
    if(src){
      const img=document.createElement('img');img.src=src;img.alt='';img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block';el.appendChild(img);
    }else el.textContent=(initial||'?').charAt(0).toUpperCase();
  }
  async function hydrateConversations(){
    if(page!=='conversas.html')return;
    const sb=await waitClient();if(!sb)return;
    const ids=[...new Set([...document.querySelectorAll('.conversation[data-user-id]')].map(el=>el.dataset.userId).filter(Boolean))];
    const friendId=new URLSearchParams(location.search).get('user');if(friendId)ids.push(friendId);
    const unique=[...new Set(ids)];if(!unique.length)return;
    const {data,error}=await sb.from('profiles').select('id,username,avatar_url').in('id',unique);if(error)return;
    const map=new Map((data||[]).map(p=>[String(p.id),p]));
    document.querySelectorAll('.conversation[data-user-id]').forEach(row=>{const p=map.get(String(row.dataset.userId));if(p)setRoundAvatar(row.querySelector('.avatar'),safeAvatar(p.avatar_url),p.username)});
    if(friendId){const p=map.get(String(friendId));if(p)setRoundAvatar(document.querySelector('.chat-avatar'),safeAvatar(p.avatar_url),p.username)}
  }
  function installConversationGuard(){
    if(page!=='conversas.html')return;
    let scheduled=false;
    const schedule=()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;hydrateConversations().catch(console.warn)},60)};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
    const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }

  document.addEventListener('error',event=>{
    const img=event.target;
    if(!(img instanceof HTMLImageElement))return;
    if(!img.matches('.profile-avatar,.friend-avatar,.search-result-avatar,.avatar img,.chat-avatar img,.member-avatar img,.top-avatar img,.mini-profile img'))return;
    const parent=img.parentElement;if(!parent)return;
    const initial=(img.alt||'?').replace(/^Avatar de\s*@?/i,'').trim().charAt(0)||'?';
    parent.textContent=initial.toUpperCase();
  },true);

  installHomeIntegrityGuard();
  installConversationGuard();
  window.ZunoOfficialAvatars={get:async()=>null,resolve:resolveProfile,ensure:ensureForCurrentUser,isCustom:isCustomAvatar,normalizeSex,version:VERSION,removed:true,repair:repairHomeFallback,hydrateConversations};
})();