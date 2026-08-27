(()=>{
  if(window.__ZUNOPLAY_OFFICIAL_AVATARS__)return;
  window.__ZUNOPLAY_OFFICIAL_AVATARS__=true;

  const VERSION='41';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const PARTS={
    masculino:['./assets/avatars/v37/male-1.txt','./assets/avatars/v37/male-2.txt','./assets/avatars/v37/male-3.txt'],
    feminino:['./assets/avatars/v37/female-1.txt','./assets/avatars/v37/female-2.txt','./assets/avatars/v37/female-3.txt']
  };
  const cache={};
  const guards=[];

  function normalizeSex(value){return String(value||'').toLowerCase()==='feminino'?'feminino':'masculino'}
  function isLegacyOfficial(value){
    const v=String(value||'');
    return /assets\/avatars\/(?:avatar-(?:masculino|feminino)-oficial\.webp|male-v38\.part\d+\.b64)/i.test(v)||v.startsWith('data:image/webp;base64,UklGR');
  }
  function isCustomAvatar(value){
    const v=String(value||'').trim();
    if(!v||isLegacyOfficial(v))return false;
    return v.startsWith('data:image/')||/^https:\/\//i.test(v);
  }
  async function validateImage(src){
    await new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(new Error('official_avatar_image_failed'));img.src=src});
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
    return cache[sex]=src;
  }
  async function waitClient(){
    for(let i=0;i<60;i++){if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;await new Promise(r=>setTimeout(r,100))}
    return null;
  }
  async function resolveProfile(profile){
    if(!profile)return null;
    if(isCustomAvatar(profile.avatar_url))return profile.avatar_url;
    return loadBase(normalizeSex(profile.sex));
  }
  function setImage(node,src,alt='Avatar oficial ZunoPlay'){
    if(!node||!src)return;
    if(node.tagName==='IMG'){if(node.src!==src)node.src=src;return}
    const old=node.querySelector(':scope > img.zuno-official-avatar');
    if(old){if(old.src!==src)old.src=src;return}
    node.textContent='';
    const img=document.createElement('img');img.className='zuno-official-avatar';img.src=src;img.alt=alt;img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block';node.appendChild(img);
  }
  function renderEverywhere(src,sex){
    const wrap=document.getElementById('profileAvatarWrap');
    if(wrap){
      const current=wrap.querySelector('img.zuno-official-starter');
      if(!current||current.src!==src)wrap.innerHTML='<div class="profile-glow"></div><img class="profile-avatar zuno-official-starter" src="'+src+'" alt="Avatar oficial '+sex+' ZunoPlay">';
    }
    setImage(document.getElementById('profileButton'),src,'Perfil');
    const preview=document.getElementById('avatarPreview');
    if(preview&&page==='avatar.html'){preview.src=src;preview.dataset.officialStarter=sex;preview.alt=sex==='feminino'?'Modelo oficial feminino do ZunoPlay':'Modelo oficial masculino do ZunoPlay'}
  }
  function installProfileGuards(src,sex){
    guards.splice(0).forEach(o=>o.disconnect());
    const protect=()=>renderEverywhere(src,sex);
    const wrap=document.getElementById('profileAvatarWrap');
    const mini=document.getElementById('profileButton');
    [wrap,mini].filter(Boolean).forEach(root=>{
      let queued=false;
      const observer=new MutationObserver(()=>{
        if(queued)return;queued=true;
        requestAnimationFrame(()=>{queued=false;protect()});
      });
      observer.observe(root,{childList:true,subtree:false});
      guards.push(observer);
    });
    [100,350,900,1800,3500].forEach(ms=>setTimeout(protect,ms));
    window.addEventListener('pagehide',()=>guards.splice(0).forEach(o=>o.disconnect()),{once:true});
  }
  async function ensureForCurrentUser(){
    const sb=await waitClient();if(!sb)return null;
    const{data:{session}}=await sb.auth.getSession();const user=session?.user;if(!user)return null;
    const{data:profile,error}=await sb.from('profiles').select('id,sex,avatar_url').eq('id',user.id).maybeSingle();if(error||!profile)return null;
    const sex=normalizeSex(profile.sex),src=await resolveProfile(profile);if(!src)return null;
    if(!isCustomAvatar(profile.avatar_url)&&profile.avatar_url!==src){
      const{error:updateError}=await sb.from('profiles').update({avatar_url:src}).eq('id',user.id);
      if(updateError)console.warn('ZunoPlay: não foi possível persistir o avatar oficial.',updateError);
    }
    renderEverywhere(src,sex);
    installProfileGuards(src,sex);
    window.dispatchEvent(new CustomEvent('zuno:official-avatar-ready',{detail:{sex,src,version:VERSION}}));
    return src;
  }
  async function hydrateRoom(){
    if(page!=='sala.html')return;
    if(document.readyState==='loading')await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
    const sb=await waitClient();if(!sb)return;
    const params=new URLSearchParams(location.search);
    const room=params.get('room')||params.get('room_id')||params.get('id')||sessionStorage.getItem('zunoplay_room_id');if(!room)return;
    const{data:members,error}=await sb.from('room_members').select('user_id,seat_index').eq('room_id',room).order('seat_index',{ascending:true});if(error||!members?.length)return;
    const ids=[...new Set(members.map(x=>x.user_id).filter(Boolean))];
    const{data:profiles,error:pe}=await sb.from('profiles').select('id,username,avatar_url,sex').in('id',ids);if(pe)return;
    await Promise.all((profiles||[]).map(async p=>{p.resolved_avatar=await resolveProfile(p)}));
    const byId=new Map((profiles||[]).map(p=>[String(p.id),p]));
    const byName=new Map((profiles||[]).filter(p=>p.username).map(p=>[p.username.trim().toLowerCase(),p]));
    const lookup=(el,nameSelector)=>byId.get(String(el?.dataset?.userId||''))||byName.get((el?.querySelector(nameSelector)?.textContent||'').trim().replace(/^@/,'').replace(/\s*\(Você\).*$/i,'').toLowerCase());
    let scheduled=false;
    const apply=()=>{
      scheduled=false;
      document.querySelectorAll('.avatar-slot').forEach(el=>{const p=lookup(el,'.avatar-name');if(p)setImage(el.querySelector('.avatar'),p.resolved_avatar)});
      document.querySelectorAll('.member').forEach(el=>{const p=lookup(el,'.member-name');if(p)setImage(el.querySelector('.member-avatar'),p.resolved_avatar)});
      document.querySelectorAll('.top-avatar').forEach((el,i)=>{const p=byId.get(String(el.dataset.userId||members[i]?.user_id||''));if(p)setImage(el,p.resolved_avatar)});
      document.querySelectorAll('.chat-row').forEach(el=>{const p=lookup(el,'.message-user');if(p)setImage(el.querySelector('.chat-avatar'),p.resolved_avatar)});
    };
    const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(apply)};
    apply();
    const roots=['roomStage','members','topPeople','messages'].map(id=>document.getElementById(id)).filter(Boolean);
    const observer=new MutationObserver(schedule);roots.forEach(root=>observer.observe(root,{childList:true,subtree:true}));
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }

  window.ZunoOfficialAvatars={get:loadBase,resolve:resolveProfile,ensure:ensureForCurrentUser,isCustom:isCustomAvatar,normalizeSex,version:VERSION};
  const start=()=>{ensureForCurrentUser().catch(console.warn);hydrateRoom().catch(console.warn)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('zuno:realtime-installed',()=>ensureForCurrentUser().catch(console.warn),{once:true});
})();