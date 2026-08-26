(()=>{
  if(window.__ZUNO_ROOM_SESSION_GUARD__)return;
  window.__ZUNO_ROOM_SESSION_GUARD__=true;

  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const q=new URLSearchParams(location.search);
  const roomId=q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zunoplay_room_id');
  let sb=null;
  let user=null;
  let heartbeat=null;
  let stopped=false;

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  async function waitClient(){
    if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;
    for(let i=0;i<60;i++){
      await sleep(100);
      if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;
    }
    return null;
  }

  async function getUser(){
    if(!sb)return null;
    const{data}=await sb.auth.getSession();
    return data?.session?.user||null;
  }

  async function leaveEveryRoom(){
    if(!sb||!user)return;
    const{error}=await sb.from('room_members').delete().eq('user_id',user.id);
    if(error)console.warn('ZunoPlay: não foi possível limpar participação anterior.',error);
    else sessionStorage.removeItem('zunoplay_room_id');
  }

  async function touchCurrentRoom(){
    if(stopped||!sb||!user||!roomId)return false;
    const{data,error}=await sb.from('room_members')
      .update({last_seen_at:new Date().toISOString()})
      .eq('room_id',roomId)
      .eq('user_id',user.id)
      .select('id')
      .maybeSingle();
    if(error){
      console.warn('ZunoPlay: heartbeat da sala falhou.',error);
      return false;
    }
    if(!data){
      stopped=true;
      if(heartbeat)clearInterval(heartbeat);
      sessionStorage.removeItem('zunoplay_room_id');
      window.dispatchEvent(new CustomEvent('zuno:room-membership-ended',{detail:{room_id:roomId}}));
      return false;
    }
    sessionStorage.setItem('zunoplay_room_id',roomId);
    return true;
  }

  async function startRoomHeartbeat(){
    if(!roomId||!sb||!user)return;
    for(let i=0;i<20&&!stopped;i++){
      const ok=await touchCurrentRoom();
      if(ok)break;
      await sleep(250);
    }
    if(stopped)return;
    heartbeat=setInterval(()=>touchCurrentRoom().catch(()=>{}),15000);
  }

  async function start(){
    sb=await waitClient();
    if(!sb)return;
    user=await getUser();
    if(!user)return;

    if(page!=='sala.html'){
      await leaveEveryRoom();
      return;
    }

    await startRoomHeartbeat();
  }

  window.addEventListener('pagehide',()=>{
    stopped=true;
    if(heartbeat)clearInterval(heartbeat);
  });

  start().catch(error=>console.error('Zuno room session guard',error));
})();
