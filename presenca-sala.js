(()=>{
  if(window.__ZUNO_ROOM_PRESENCE__)return;
  window.__ZUNO_ROOM_PRESENCE__=true;

  let scope=null;
  let user=null;
  let currentState={};
  const q=new URLSearchParams(location.search);
  const room=q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zunoplay_room_id');

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

  function applyStatus(id,state){
    const value=state||'offline';
    const selector='.avatar-slot[data-user-id="'+CSS.escape(String(id))+'"],.member[data-user-id="'+CSS.escape(String(id))+'"]';
    document.querySelectorAll(selector).forEach(el=>{
      el.dataset.presence=value;
      el.classList.toggle('is-speaking',value==='speaking');
      el.classList.toggle('is-away',value==='away');
      el.classList.toggle('is-offline',value==='offline');
      const badge=el.querySelector('.presence-status');
      if(badge)badge.textContent=value==='speaking'?'🎙️ Falando':value==='away'?'⏸️ Ausente':value==='offline'?'○ Offline':'● Online';
    });
  }

  function sync(){
    currentState=scope?.state()||{};
    Object.keys(currentState).forEach(id=>applyStatus(id,currentState[id]?.[0]?.status||'online'));
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
        applyStatus(key,newPresences?.[0]?.status||'online');
        window.dispatchEvent(new CustomEvent('zuno:room-presence-join',{detail:{key,newPresences}}));
      })
      .on('leave',({key,leftPresences})=>{
        applyStatus(key,'offline');
        window.dispatchEvent(new CustomEvent('zuno:room-presence-leave',{detail:{key,leftPresences}}));
      });

    await scope.subscribe();
    sync();
  }

  window.zunoSetRoomPresence=async state=>{
    if(!scope)await start();
    if(!scope||!user)return false;
    await scope.track({user_id:user.id,room_id:room,status:state,at:new Date().toISOString()});
    applyStatus(user.id,state);
    return true;
  };

  window.ZunoRoomPresence={start,getState:()=>currentState,set:window.zunoSetRoomPresence,getUser:()=>user};
  start().catch(error=>console.error('Zuno room presence',error));
  window.addEventListener('beforeunload',()=>{scope?.close?.().catch?.(()=>{})});
})();