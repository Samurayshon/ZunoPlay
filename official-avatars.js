(()=>{
  if(window.__ZUNOPLAY_OFFICIAL_AVATARS__)return;
  window.__ZUNOPLAY_OFFICIAL_AVATARS__=true;
  const VERSION='46';
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
        wrap.innerHTML='<div class="profile-glow"></div><div class="profile-avatar zuno-character-empty" style="width:180px;height:180px;margin-bottom:55px;border-radius:50%;display:grid;place-items:center;font-size:70px;font-weight:950;color:#fff;background:radial-gradient(circle,#47237b,#16152c 68%);border:2px solid #7448c6">'+emptyInitial()+'</div>';
      }
    }
    const mini=document.getElementById('profileButton');
    const miniImg=mini?.querySelector('img');
    if(miniImg&&isRemovedHomeFallback(miniImg.src))mini.textContent='👤';
  }
  function installIntegrityGuard(){
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

  installIntegrityGuard();
  window.ZunoOfficialAvatars={get:async()=>null,resolve:resolveProfile,ensure:ensureForCurrentUser,isCustom:isCustomAvatar,normalizeSex,version:VERSION,removed:true,repair:repairHomeFallback};
})();