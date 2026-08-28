(()=>{
  if(window.__ZUNO_ROOM_RUNTIME_V200__)return;
  window.__ZUNO_ROOM_RUNTIME_V200__=true;

  const REF='rliymfbbhqoejgfvsbuu';
  const roomId=new URLSearchParams(location.search).get('room')||new URLSearchParams(location.search).get('room_id')||new URLSearchParams(location.search).get('id')||sessionStorage.getItem('zunoplay_room_id');
  window.ZUNO_TURN_ENDPOINT=window.ZUNO_TURN_ENDPOINT||`https://${REF}.functions.supabase.co/voice-turn`;

  const state={room_id:roomId,app:false,realtime:false,presence:false,voice:false,muted:true,turn:false,online:navigator.onLine!==false,last_error:null,last_event_at:Date.now()};
  let syncing=false;

  function emit(){
    state.last_event_at=Date.now();
    window.dispatchEvent(new CustomEvent('zuno:room-health',{detail:{...state}}));
  }
  function fail(error){state.last_error=String(error?.message||error||'erro');emit()}
  async function waitForCore(){
    if(window.ZunoRealtime)return window.ZunoRealtime;
    return new Promise((resolve,reject)=>{
      const done=()=>window.ZunoRealtime?resolve(window.ZunoRealtime):reject(new Error('Realtime indisponível'));
      window.addEventListener('zuno:realtime-installed',done,{once:true});
      setTimeout(done,5000);
    });
  }
  async function rpc(name,args={}){
    const core=await waitForCore();
    await core.start();
    const {data,error}=await core.client.rpc(name,args);
    if(error)throw error;
    return data;
  }
  async function syncMic(muted){
    if(syncing||!roomId)return;
    syncing=true;
    try{await rpc('set_room_mic',{p_room_id:roomId,p_state:muted?'muted':'unmuted'})}catch(error){
      if(!/speaker_required|not_in_room/i.test(String(error?.message||'')))fail(error);
    }finally{syncing=false}
  }
  async function leave(dest='salas.html'){
    try{await rpc('leave_room_session',{p_room_id:roomId})}catch(error){console.warn('leave_room_session',error)}
    try{await window.ZunoRoomVoice?.stop?.()}catch(_){}
    try{await window.ZunoRoomPresence?.set?.('offline')}catch(_){}
    sessionStorage.removeItem('zunoplay_room_id');
    location.href=dest;
  }
  function bindLeave(){
    window.goBack=()=>leave();
    const btn=document.getElementById('leaveButton');
    if(btn)btn.onclick=()=>leave();
  }
  async function recover(){
    state.online=navigator.onLine!==false;emit();
    if(!state.online)return;
    try{
      const core=await waitForCore();
      await core.start();state.realtime=core.getStatus()==='online';
      await window.ZunoRoomPresence?.refresh?.();
      if(window.ZunoRoomVoice?.getState?.().active){
        state.turn=await window.ZunoRoomVoice.refreshIce();
      }
      state.last_error=null;emit();
    }catch(error){fail(error)}
  }

  window.addEventListener('zuno:room-app-ready',()=>{state.app=true;bindLeave();emit()});
  window.addEventListener('zuno:room-presence-sync',()=>{state.presence=true;emit()});
  window.addEventListener('zuno:voice-started',e=>{state.voice=true;state.muted=false;state.turn=!!e.detail?.turn;syncMic(false);emit()});
  window.addEventListener('zuno:voice-mute',e=>{state.muted=!!e.detail?.muted;syncMic(state.muted);emit()});
  window.addEventListener('zuno:voice-stopped',()=>{state.voice=false;state.muted=true;syncMic(true);emit()});
  window.addEventListener('zuno:connection',e=>{state.realtime=e.detail==='SUBSCRIBED';emit()});
  window.addEventListener('online',recover);
  window.addEventListener('offline',()=>{state.online=false;emit()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')recover()});

  window.ZunoRoomRuntime={getState:()=>({...state}),recover,leave,syncMic};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bindLeave();recover()},{once:true});else{bindLeave();recover()}
})();
