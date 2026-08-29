(()=>{
  if(window.__ZUNO_AVATAR_SOCIAL_SYNC_V1__)return;
  window.__ZUNO_AVATAR_SOCIAL_SYNC_V1__=true;

  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const supported=new Set(['perfil.html','amigos.html','conversas.html','sala.html']);
  if(!supported.has(page))return;

  let timer=0;
  let running=false;
  let lastInboxAt=0;
  let inboxRows=[];
  let roomRows=[];
  const profileCache=new Map();
  const usernameCache=new Map();
  const getClient=()=>window.ZunoSupabaseClient||window.__zunoSupabaseClient||window.supabaseClient||null;
  const api=()=>window.ZunoOfficialAvatars;

  async function sessionUser(){
    try{return (await getClient()?.auth?.getSession?.())?.data?.session?.user||null}catch(_){return null}
  }

  async function profile(id){
    id=String(id||'');
    if(!id)return null;
    if(profileCache.has(id))return profileCache.get(id);
    const a=api();
    if(!a)return null;
    const p=await a.fetchProfile(id);
    if(p){
      profileCache.set(id,p);
      if(p.username)usernameCache.set(String(p.username).toLowerCase(),p);
    }
    return p;
  }

  async function profileByUsername(name){
    const key=String(name||'').replace(/^@/,'').trim().toLowerCase();
    if(!key)return null;
    if(usernameCache.has(key))return usernameCache.get(key);
    const sb=getClient();
    if(!sb)return null;
    const {data,error}=await sb.from('profiles').select('id,username,avatar_url,avatar_config,sex').ilike('username',key).limit(1).maybeSingle();
    if(error||!data)return null;
    profileCache.set(String(data.id),data);
    usernameCache.set(key,data);
    return data;
  }

  function imageFor(target){
    if(!target)return null;
    if(target.tagName==='IMG')return target;
    let img=target.querySelector(':scope > img[data-zuno-social-avatar="1"],:scope > img');
    if(!img){
      img=document.createElement('img');
      img.dataset.zunoSocialAvatar='1';
      img.alt='Avatar ZunoPlay';
      Object.assign(img.style,{width:'100%',height:'100%',objectFit:'cover',display:'block'});
      target.replaceChildren(img);
    }
    return img;
  }

  async function mount(target,p,opts={}){
    if(!target||!p||!api())return;
    const img=imageFor(target);
    if(!img)return;
    const id=String(p.id||p.user_id||'');
    const official=img.dataset.zunoOfficialAvatarKind==='official'&&img.dataset.zunoProfileId===id&&String(img.src||'').startsWith('data:image/');
    const legacy=img.dataset.zunoOfficialAvatarKind==='legacy'&&img.dataset.zunoProfileId===id;
    if(official||legacy)return;
    await api().mount(img,p,opts);
  }

  async function syncProfile(){
    const me=await sessionUser();
    const id=new URLSearchParams(location.search).get('user')||me?.id;
    if(!id)return;
    const p=await profile(id);
    const target=document.querySelector('.zp-avatar');
    if(target&&p)await mount(target,p,{mode:'Perfil',surface:'profile'});
  }

  async function syncFriends(){
    const jobs=[];
    document.querySelectorAll('a.avatar[href*="perfil.html?user="]').forEach(el=>{
      try{
        const id=new URL(el.href,location.href).searchParams.get('user');
        if(id)jobs.push(profile(id).then(p=>p&&mount(el,p,{mode:'Perfil',surface:'mini'})));
      }catch(_){}
    });
    await Promise.all(jobs);
  }

  async function loadRoomRows(){
    const params=new URLSearchParams(location.search);
    const roomId=params.get('room')||params.get('room_id')||params.get('id')||sessionStorage.getItem('zunoplay_room_id');
    const sb=getClient();
    if(!roomId||!sb)return[];
    const {data,error}=await sb.from('room_members').select('user_id,seat_index').eq('room_id',roomId).order('seat_index',{ascending:true,nullsFirst:false});
    if(error)return[];
    return data||[];
  }

  async function syncRoom(){
    const jobs=[];
    document.querySelectorAll('[data-user-id]').forEach(el=>{
      const id=el.dataset.userId;
      const target=el.matches('.member')
        ?el.querySelector('.member-avatar')
        :el.querySelector('.avatar-wrap .avatar,.chat-avatar,.member-avatar');
      if(id&&target){
        jobs.push(profile(id).then(p=>p&&mount(target,p,{mode:'Sala de voz',surface:'room'})));
      }
    });

    document.querySelectorAll('.chat-row').forEach(row=>{
      const label=row.querySelector('.message-user')?.textContent;
      const target=row.querySelector('.chat-avatar');
      if(label&&target){
        jobs.push(profileByUsername(label).then(p=>p&&mount(target,p,{mode:'Perfil',surface:'mini'})));
      }
    });

    const tops=[...document.querySelectorAll('#topPeople .top-avatar,.top-avatar')].slice(0,3);
    if(tops.length){
      if(!roomRows.length)roomRows=await loadRoomRows();
      roomRows.slice(0,tops.length).forEach((r,i)=>{
        jobs.push(profile(r.user_id).then(p=>p&&mount(tops[i],p,{mode:'Perfil',surface:'mini'})));
      });
    }
    await Promise.all(jobs);
  }

  async function loadInbox(){
    if(Date.now()-lastInboxAt<5000&&inboxRows.length)return inboxRows;
    const sb=getClient();
    if(!sb)return[];
    const {data,error}=await sb.rpc('zuno_inbox',{p_limit:100,p_offset:0});
    if(error)return[];
    lastInboxAt=Date.now();
    inboxRows=data||[];
    return inboxRows;
  }

  async function syncMessages(){
    const jobs=[];
    const rows=await loadInbox();
    const byConversation=new Map(rows.map(r=>[String(r.conversation_id),r]));

    document.querySelectorAll('.zm-conversation[data-conversation]').forEach(el=>{
      const r=byConversation.get(String(el.dataset.conversation));
      const target=el.querySelector('.zm-avatar');
      if(r?.conversation_type!=='group'&&r?.other_user_id&&target){
        jobs.push(profile(r.other_user_id).then(p=>p&&mount(target,p,{mode:'Perfil',surface:'mini'})));
      }
    });

    document.querySelectorAll('[data-friend]').forEach(el=>{
      const target=el.querySelector('.zm-avatar');
      if(target){
        jobs.push(profile(el.dataset.friend).then(p=>p&&mount(target,p,{mode:'Perfil',surface:'mini'})));
      }
    });

    const convId=new URLSearchParams(location.search).get('conversation');
    const header=document.querySelector('.zm-chat-header .zm-avatar');
    if(convId&&header){
      const sb=getClient();
      const me=await sessionUser();
      if(sb&&me){
        const {data}=await sb.from('conversation_members').select('user_id').eq('conversation_id',convId);
        const other=(data||[]).find(x=>String(x.user_id)!==String(me.id));
        if(other){
          jobs.push(profile(other.user_id).then(p=>p&&mount(header,p,{mode:'Perfil',surface:'mini'})));
        }
      }
    }
    await Promise.all(jobs);
  }

  async function run(){
    if(running||!api()||!getClient())return;
    running=true;
    try{
      if(page==='perfil.html')await syncProfile();
      else if(page==='amigos.html')await syncFriends();
      else if(page==='sala.html')await syncRoom();
      else if(page==='conversas.html')await syncMessages();
    }catch(e){
      console.warn('[Zuno avatar social sync]',e);
    }finally{
      running=false;
    }
  }

  function schedule(delay=80){
    clearTimeout(timer);
    timer=setTimeout(run,delay);
  }

  const mo=new MutationObserver(()=>schedule(120));
  function start(){
    mo.observe(document.body||document.documentElement,{childList:true,subtree:true});
    schedule(0);
    setTimeout(()=>schedule(0),700);
    setTimeout(()=>schedule(0),1800);
  }

  ['zuno:official-avatars-ready','zuno-avatar-renderer-ready','zuno-avatar-saved','zuno:room-app-ready','zuno:presence:sync','pageshow','focus'].forEach(ev=>{
    window.addEventListener(ev,()=>{
      if(ev==='zuno-avatar-saved'){
        profileCache.clear();
        usernameCache.clear();
        api()?.invalidate?.();
      }
      if(ev==='zuno:presence:sync')roomRows=[];
      schedule(60);
    });
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();