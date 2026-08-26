(()=>{
  if(window.__ZUNO_ROOM_PRESENCE__)return;
  window.__ZUNO_ROOM_PRESENCE__=true;

  const URL='https://rliymfbbhqoejgfvsbuu.supabase.co';
  const KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
  if(!window.supabase?.createClient)return;

  if(!window.__ZUNOPLAY_SUPABASE_FACTORY_PATCHED__){
    const originalCreateClient=window.supabase.createClient.bind(window.supabase);
    if(!window.ZunoSupabaseClient)window.ZunoSupabaseClient=originalCreateClient(URL,KEY);
    window.supabase.createClient=function(url,key,options){
      const sameProject=url===URL&&key===KEY;
      const defaultOptions=!options||Object.keys(options).length===0;
      if(sameProject&&defaultOptions)return window.ZunoSupabaseClient;
      return originalCreateClient(url,key,options);
    };
    window.__ZUNOPLAY_SUPABASE_FACTORY_PATCHED__=true;
  }

  const sb=window.ZunoSupabaseClient;
  let channel=null;
  let user=null;
  let currentState={};
  const q=new URLSearchParams(location.search);
  const room=q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zunoplay_room_id');

  function loadGlobalRealtime(){
    if(window.ZunoRealtime){window.ZunoRealtime.start?.().catch?.(console.error);return}
    if(document.getElementById('zunoplay-realtime-global'))return;
    const script=document.createElement('script');
    script.id='zunoplay-realtime-global';
    script.src=new URL('./realtime-global.js',location.href).href;
    script.async=true;
    document.head.appendChild(script);
  }

  function applyStatus(id,state){
    const value=state||'offline';
    document.querySelectorAll('.avatar-slot[data-user-id="'+CSS.escape(String(id))+'"],.member[data-user-id="'+CSS.escape(String(id))+'"]').forEach(el=>{
      el.dataset.presence=value;
      el.classList.toggle('is-speaking',value==='speaking');
      el.classList.toggle('is-away',value==='away');
      el.classList.toggle('is-offline',value==='offline');
      const badge=el.querySelector('.presence-status');
      if(badge)badge.textContent=value==='speaking'?'🎙️ Falando':value==='away'?'⏸️ Ausente':value==='offline'?'○ Offline':'● Online';
    });
  }

  function sync(){
    currentState=channel?.presenceState()||{};
    Object.keys(currentState).forEach(id=>applyStatus(id,currentState[id]?.[0]?.status||'online'));
    window.dispatchEvent(new CustomEvent('zuno:room-presence-sync',{detail:currentState}));
  }

  async function start(){
    if(!room||channel)return;
    const{data,error}=await sb.auth.getSession();
    if(error){console.error('Zuno room presence auth',error);return}
    user=data?.session?.user||null;
    if(!user)return;

    channel=sb.channel('zunoplay-presence-'+room,{config:{presence:{key:user.id}}});
    channel
      .on('presence',{event:'sync'},sync)
      .on('presence',{event:'join'},({key,newPresences})=>{
        applyStatus(key,newPresences?.[0]?.status||'online');
        window.dispatchEvent(new CustomEvent('zuno:room-presence-join',{detail:{key,newPresences}}));
      })
      .on('presence',{event:'leave'},({key,leftPresences})=>{
        applyStatus(key,'offline');
        window.dispatchEvent(new CustomEvent('zuno:room-presence-leave',{detail:{key,leftPresences}}));
      })
      .subscribe(async status=>{
        if(status==='SUBSCRIBED'){
          await channel.track({user_id:user.id,room_id:room,status:'online',at:new Date().toISOString()});
        }
      });
  }

  window.zunoSetRoomPresence=async state=>{
    if(!channel)await start();
    if(!channel||!user)return false;
    await channel.track({user_id:user.id,room_id:room,status:state,at:new Date().toISOString()});
    applyStatus(user.id,state);
    return true;
  };

  window.ZunoRoomPresence={
    start,
    getState:()=>currentState,
    set:window.zunoSetRoomPresence,
    getUser:()=>user
  };

  loadGlobalRealtime();
  start().catch(error=>console.error('Zuno room presence',error));

  window.addEventListener('beforeunload',()=>{
    if(channel){try{channel.untrack()}catch(_){};try{sb.removeChannel(channel)}catch(_){}}
  });
})();