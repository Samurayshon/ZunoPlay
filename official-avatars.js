(()=>{
  if(window.__ZUNOPLAY_OFFICIAL_AVATARS__)return;
  window.__ZUNOPLAY_OFFICIAL_AVATARS__=true;

  const VERSION='39';
  const PARTS={
    masculino:[
      './assets/avatars/v37/male-1.txt',
      './assets/avatars/v37/male-2.txt',
      './assets/avatars/v37/male-3.txt'
    ],
    feminino:[
      './assets/avatars/v37/female-1.txt',
      './assets/avatars/v37/female-2.txt',
      './assets/avatars/v37/female-3.txt'
    ]
  };
  const cache={};

  function normalizeSex(value){return String(value||'').toLowerCase()==='feminino'?'feminino':'masculino'}
  function isLegacyOfficial(value){
    const v=String(value||'');
    return /assets\/avatars\/(?:avatar-(?:masculino|feminino)-oficial\.webp|male-v38\.part\d+\.b64)/i.test(v)
      || v.startsWith('data:image/webp;base64,UklGR');
  }
  function isCustomAvatar(value){
    const v=String(value||'').trim();
    if(!v||isLegacyOfficial(v))return false;
    return v.startsWith('data:image/')||/^https:\/\//i.test(v);
  }
  async function validateImage(src){
    await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=resolve;
      img.onerror=()=>reject(new Error('official_avatar_image_failed'));
      img.src=src;
    });
    return src;
  }
  async function loadBase(sex){
    sex=normalizeSex(sex);
    if(cache[sex])return cache[sex];
    const chunks=await Promise.all(PARTS[sex].map(async file=>{
      const r=await fetch(new URL(file+'?v='+VERSION,location.href),{cache:'no-store'});
      if(!r.ok)throw new Error('official_avatar_part_'+r.status);
      return (await r.text()).trim();
    }));
    const b64=chunks.join('');
    if(!b64.startsWith('UklGR'))throw new Error('official_avatar_invalid_webp');
    const src='data:image/webp;base64,'+b64;
    await validateImage(src);
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
  function renderEverywhere(src,sex){
    const wrap=document.getElementById('profileAvatarWrap');
    if(wrap)wrap.innerHTML='<div class="profile-glow"></div><img class="profile-avatar zuno-official-starter" src="'+src+'" alt="Avatar oficial '+sex+' ZunoPlay">';
    const mini=document.getElementById('profileButton');
    if(mini)mini.innerHTML='<img src="'+src+'" alt="Perfil">';
    const preview=document.getElementById('avatarPreview');
    if(preview&&(location.pathname.split('/').pop()||'').toLowerCase()==='avatar.html'){
      preview.src=src;
      preview.dataset.officialStarter=sex;
      preview.alt=sex==='feminino'?'Modelo oficial feminino do ZunoPlay':'Modelo oficial masculino do ZunoPlay';
    }
  }
  async function resolveProfile(profile){
    if(!profile)return null;
    if(isCustomAvatar(profile.avatar_url))return profile.avatar_url;
    return loadBase(normalizeSex(profile.sex));
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
    const src=await resolveProfile(profile);
    if(!src)return null;
    renderEverywhere(src,sex);
    window.dispatchEvent(new CustomEvent('zuno:official-avatar-ready',{detail:{sex,src,version:VERSION}}));
    return src;
  }

  window.ZunoOfficialAvatars={get:loadBase,resolve:resolveProfile,ensure:ensureForCurrentUser,isCustom:isCustomAvatar,normalizeSex,version:VERSION};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>ensureForCurrentUser().catch(console.warn),{once:true});
  else ensureForCurrentUser().catch(console.warn);
  window.addEventListener('zuno:realtime-installed',()=>ensureForCurrentUser().catch(console.warn),{once:true});
})();
