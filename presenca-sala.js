(()=>{
  if(window.__ZUNO_ROOM_PRESENCE__)return;
  window.__ZUNO_ROOM_PRESENCE__=true;

  let scope=null;
  let user=null;
  let currentState={};
  let profilesById={};
  let bindScheduled=false;
  const q=new URLSearchParams(location.search);
  const room=q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zunoplay_room_id');

  const style=document.createElement('style');
  style.textContent='.presence-status{font-size:9px;margin-top:3px;color:#4ade80}.is-speaking .avatar{box-shadow:0 0 0 4px rgba(34,197,94,.22)}.is-away .avatar,.is-offline .avatar{filter:saturate(.45);opacity:.72}.is-away .presence-status{color:#fbbf24}.is-offline .presence-status{color:#858697}';
  document.head.appendChild(style);

  function waitForCore(){
    if(window.ZunoRealtime)return Promise.resolve(window.ZunoRealtime);
    return new Promise((resolve,reject)=>{
      const done=()=>window.ZunoRealtime?resolve(window.ZunoRealtime):reject(new Error('ZunoRealtime indisponível'));
      window.addEventListener('zuno:realtime-installed',done,{once:true});
      if(!document.getElementById('zunoplay-realtime-global')){
        const script=document.createElement('script');
        script.id='zunoplay-realtime-global';
        script.src=new URL('./realtime-global.js',location.href).href;
        script.async=true;
        script.onerror=()=>reject(new Error('Falha ao carregar realtime-global.js'));
        document.head.appendChild(script);
      }
      setTimeout(done,5000);
    });
  }

  function statusText(value){
    return value==='speaking'?'🎙️ Falando':value==='listening'?'🎧 Ouvindo':value==='away'?'⏸️ Ausente':value==='offline'?'○ Offline':'● Online';
  }

  function applyStatus(id,state){
    const value=state||'offline';
    const selector='.avatar-slot[data-user-id="'+CSS.escape(String(id))+'"],.member[data-user-id="'+CSS.escape(String(id))+'"]';
    document.querySelectorAll(selector).forEach(el=>{
      el.dataset.presence=value;
      el.classList.toggle('is-speaking',value==='speaking');
      el.classList.toggle('is-away',value==='away');
      el.classList.toggle('is-offline',value==='offline');
      const badge=el.querySelector('.presence-status');
      if(badge)badge.textContent=statusText(value);
    });
  }

  async function loadProfiles(ids){
    const missing=[...new Set(ids.filter(Boolean))].filter(id=>!profilesById[id]);
    if(!missing.length)return;
    const core=await waitForCore();
    const{data,error}=await core.client.from('profiles').select('id,username').in('id',missing);
    if(error)return;
    (data||[]).forEach(p=>profilesById[p.id]=p);
  }

  function attachMarker(el,id){
    if(!el||!id)return;
    el.dataset.userId=id;
    if(!el.querySelector('.presence-status')){
      const badge=document.createElement('div');
      badge.className='presence-status';
      badge.textContent=statusText(currentState[id]?.[0]?.status||'offline');
      el.appendChild(badge);
    }
    applyStatus(id,currentState[id]?.[0]?.status||'offline');
  }

  async function bindInterface(){
    bindScheduled=false;
    const ids=Object.keys(currentState);
    if(!ids.length)return;
    await loadProfiles(ids);
    const byUsername=new Map(Object.values(profilesById).filter(p=>p?.username).map(p=>[p.username.trim().toLowerCase(),p.id]));

    document.querySelectorAll('.avatar-slot').forEach(el=>{
      const text=(el.querySelector('.avatar-name')?.textContent||'').trim().replace(/^@/,'').toLowerCase();
      attachMarker(el,byUsername.get(text));
    });
    document.querySelectorAll('.member').forEach(el=>{
      const text=(el.querySelector('.member-name')?.childNodes?.[0]?.textContent||el.querySelector('.member-name')?.textContent||'').trim().replace(/^@/,'').replace(/\s*\(Você\).*$/i,'').toLowerCase();
      attachMarker(el,byUsername.get(text));
    });
  }

  function scheduleBind(){
    if(bindScheduled)return;
    bindScheduled=true;
    requestAnimationFrame(()=>bindInterface().catch(console.error));
  }

  function sync(){
    currentState=scope?.state()||{};
    scheduleBind();
    window.dispatchEvent(new CustomEvent('zuno:room-presence-sync',{detail:currentState}));
  }

  async function start(){
    if(!room||scope)return;
    const core=await waitForCore();
    await core.start();
    user=core.getUser();
    if(!user)return;

    scope=core.presence.scope('zunoplay-presence-'+room,user.id,{user_id:user.id,room_id:room,status:'online',at:new Date().toISOString()});
    scope
      .on('sync',sync)
      .on('join',({key,newPresences})=>{
        currentState=scope.state();
        scheduleBind();
        window.dispatchEvent(new CustomEvent('zuno:room-presence-join',{detail:{key,newPresences}}));
      })
      .on('leave',({key,leftPresences})=>{
        currentState=scope.state();
        applyStatus(key,'offline');
        scheduleBind();
        window.dispatchEvent(new CustomEvent('zuno:room-presence-leave',{detail:{key,leftPresences}}));
      });

    await scope.subscribe();
    sync();

    const roots=[document.getElementById('roomStage'),document.getElementById('members')].filter(Boolean);
    const observer=new MutationObserver(scheduleBind);
    roots.forEach(root=>observer.observe(root,{childList:true,subtree:true}));
  }

  window.zunoSetRoomPresence=async state=>{
    if(!scope)await start();
    if(!scope||!user)return false;
    await scope.track({user_id:user.id,room_id:room,status:state,at:new Date().toISOString()});
    currentState=scope.state();
    applyStatus(user.id,state);
    return true;
  };

  window.ZunoRoomPresence={start,getState:()=>currentState,set:window.zunoSetRoomPresence,getUser:()=>user};
  start().catch(error=>console.error('Zuno room presence',error));
  window.addEventListener('beforeunload',()=>{scope?.close?.().catch?.(()=>{})});
})();