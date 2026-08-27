(()=>{
  if(window.__ZUNOPLAY_OFFICIAL_AVATARS__)return;
  window.__ZUNOPLAY_OFFICIAL_AVATARS__=true;

  const ASSETS={
    masculino:'./assets/avatars/avatar-masculino-oficial.webp.b64',
    feminino:'./assets/avatars/avatar-feminino-oficial.webp.b64'
  };
  const cache={};

  function normalizeSex(value){return String(value||'').toLowerCase()==='feminino'?'feminino':'masculino'}
  function isCustomAvatar(value){
    const v=String(value||'').trim();
    if(!v)return false;
    if(v.startsWith('data:image/svg+xml'))return true;
    if(/^https:\/\//i.test(v))return true;
    return false;
  }
  async function loadBase(sex){
    sex=normalizeSex(sex);
    if(cache[sex])return cache[sex];
    const response=await fetch(new URL(ASSETS[sex],location.href),{cache:'force-cache'});
    if(!response.ok)throw new Error('official_avatar_asset_'+response.status);
    const b64=(await response.text()).trim();
    if(!b64.startsWith('UklGR'))throw new Error('official_avatar_invalid_asset');
    return cache[sex]='data:image/webp;base64,'+b64;
  }
  async function waitClient(){
    for(let i=0;i<60;i++){
      if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;
      await new Promise(r=>setTimeout(r,100));
    }
    return null;
  }
  function renderHome(src){
    const wrap=document.getElementById('profileAvatarWrap');
    if(wrap)wrap.innerHTML='<div class="profile-glow"></div><img class="profile-avatar zuno-official-starter" src="'+src+'" alt="Avatar oficial ZunoPlay">';
    const mini=document.getElementById('profileButton');
    if(mini)mini.innerHTML='<img src="'+src+'" alt="Perfil">';
  }
  function renderEditorStarter(src,sex){
    if((location.pathname.split('/').pop()||'').toLowerCase()!=='avatar.html')return;
    const preview=document.getElementById('avatarPreview');
    if(!preview)return;
    preview.src=src;
    preview.dataset.officialStarter=sex;
    preview.alt=sex==='feminino'?'Modelo inicial feminino do ZunoPlay':'Modelo inicial masculino do ZunoPlay';
    const badge=document.querySelector('.preview-badge');
    if(badge)badge.innerHTML='Modelo inicial <b>'+(sex==='feminino'?'Feminino':'Masculino')+'</b> · ZunoPlay';
    const legacy=document.getElementById('legacyNote');
    if(legacy)legacy.style.display='none';
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
    renderHome(base);
    setTimeout(()=>renderEditorStarter(base,sex),350);
    window.dispatchEvent(new CustomEvent('zuno:official-avatar-ready',{detail:{sex,src:base}}));
    return base;
  }

  window.ZunoOfficialAvatars={
    get:loadBase,
    ensure:ensureForCurrentUser,
    isCustom:isCustomAvatar,
    normalizeSex
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>ensureForCurrentUser().catch(console.warn),{once:true});
  else ensureForCurrentUser().catch(console.warn);
  window.addEventListener('zuno:realtime-installed',()=>ensureForCurrentUser().catch(console.warn),{once:true});
})();
