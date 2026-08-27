(()=>{
  if(window.__ZUNO_ROOM_SESSION_GUARD__)return;
  window.__ZUNO_ROOM_SESSION_GUARD__=true;

  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const PUBLIC_PAGES=new Set(['index.html','login.html','cadastro.html']);
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

  function loginUrl(){
    const next=page==='index.html'?'index.html':page+location.search+location.hash;
    return 'login.html?next='+encodeURIComponent(next);
  }

  async function validateUser(){
    if(!sb)return null;
    try{
      const {data:{session},error:sessionError}=await sb.auth.getSession();
      if(sessionError||!session?.user)return null;
      const {data,error}=await sb.auth.getUser();
      if(error||!data?.user){
        await sb.auth.signOut({scope:'local'}).catch(()=>{});
        return null;
      }
      return data.user;
    }catch(_){
      return null;
    }
  }

  function redirectToLogin(){
    if(PUBLIC_PAGES.has(page))return;
    const target=loginUrl();
    if(location.pathname.endsWith('/login.html')&&location.search.includes('next='))return;
    location.replace(target);
  }

  async function leaveEveryRoom(){
    if(!sb||!user)return;
    const{error}=await sb.from('room_members').delete().eq('user_id',user.id);
    if(error)console.warn('ZunoPlay: não foi possível limpar participação anterior.',error);
    else sessionStorage.removeItem('zunoplay_room_id');
  }

  async function touchCurrentRoom(){
    if(stopped||!sb||!user||!roomId)return false;
    const{data,error}=await sb.rpc('touch_room_session',{p_room_id:roomId});
    if(error){console.warn('ZunoPlay: heartbeat da sala falhou.',error);return false}
    if(data!==true){
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
    if(!sb){
      if(!PUBLIC_PAGES.has(page))redirectToLogin();
      return;
    }

    user=await validateUser();
    if(!user){
      sessionStorage.removeItem('zunoplay_room_id');
      if(!PUBLIC_PAGES.has(page))redirectToLogin();
      return;
    }

    window.dispatchEvent(new CustomEvent('zuno:auth-validated',{detail:{user_id:user.id}}));

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

  (async()=>{
    sb=await waitClient();
    if(sb){
      sb.auth.onAuthStateChange((event,session)=>{
        if(event==='SIGNED_OUT'&&!PUBLIC_PAGES.has(page))redirectToLogin();
        if(event==='TOKEN_REFRESHED'&&!session&&!PUBLIC_PAGES.has(page))redirectToLogin();
      });
    }
    await start();
  })().catch(error=>console.error('Zuno auth/session guard',error));
})();
