(()=>{
  if(window.__ZUNOPLAY_OFFICIAL_AVATARS__)return;
  window.__ZUNOPLAY_OFFICIAL_AVATARS__=true;

  const VERSION='34';
  const ASSETS={
    masculino:'./assets/avatars/avatar-masculino-oficial.webp?v='+VERSION,
    feminino:'./assets/avatars/avatar-feminino-oficial.webp?v='+VERSION
  };
  const cache={};

  function normalizeSex(value){return String(value||'').toLowerCase()==='feminino'?'feminino':'masculino'}
  function isOfficial(value){return /assets\/avatars\/avatar-(?:masculino|feminino)-oficial\.webp/i.test(String(value||''))}
  function isCustomAvatar(value){
    const v=String(value||'').trim();
    if(!v||isOfficial(v))return false;
    if(v.startsWith('data:image/svg+xml'))return true;
    if(/^https:\/\//i.test(v))return true;
    return false;
  }
  async function loadBase(sex){
    sex=normalizeSex(sex);
    if(cache[sex])return cache[sex];
    const src=new URL(ASSETS[sex],location.href).href;
    await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve();
      img.onerror=()=>reject(new Error('official_avatar_image_failed'));
      img.src=src;
    });
    cache[sex]=src;
    return src;
  }
  async function waitClient(){
    for(let i=0;i<60;i++){
      if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;
      await new Promise(r=>setTimeout(r,100));
    }
    return null;
  }
  function renderEverywhere(src){
    const wrap=document.getElementById('profileAvatarWrap');
    if(wrap)wrap.innerHTML='<div class="profile-glow"></div><img class="profile-avatar zuno-official-starter" src="'+src+'" alt="Avatar oficial ZunoPlay">';
    const mini=document.getElementById('profileButton');
    if(mini)mini.innerHTML='<img src="'+src+'" alt="Perfil">';
    const preview=document.getElementById('avatarPreview');
    if(preview && (location.pathname.split('/').pop()||'').toLowerCase()==='avatar.html') preview.src=src;
  }
  async function ensureForCurrentUser(){
    const sb=await waitClient();
    if(!sb)return null;
    const{data:{session}}=await sb.auth.getSession();
    const user=session?.user;
    if(!user)return null;
    const{data:profile,error}=await sb.from('profiles').select('id,sex,avatar_url').eq('id',user.id).maybeSingle();
    if(error||!profile)return null;
    const sex=normalizeSex(profile.sex);
    if(isCustomAvatar(profile.avatar_url))return profile.avatar_url;
    const base=await loadBase(sex);
    if(profile.avatar_url!==base){
      const{error:updateError}=await sb.from('profiles').update({avatar_url:base}).eq('id',user.id);
      if(updateError)console.warn('ZunoPlay: não foi possível definir avatar inicial oficial.',updateError);
    }
    renderEverywhere(base);
    window.dispatchEvent(new CustomEvent('zuno:official-avatar-ready',{detail:{sex,src:base}}));
    return base;
  }

  window.ZunoOfficialAvatars={get:loadBase,ensure:ensureForCurrentUser,isCustom:isCustomAvatar,normalizeSex};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>ensureForCurrentUser().catch(console.warn),{once:true});
  else ensureForCurrentUser().catch(console.warn);
  window.addEventListener('zuno:realtime-installed',()=>ensureForCurrentUser().catch(console.warn),{once:true});
})();
