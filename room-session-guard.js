(()=>{
  if(window.__ZUNO_ROOM_SESSION_GUARD__)return;
  window.__ZUNO_ROOM_SESSION_GUARD__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const PUBLIC_PAGES=new Set(['index.html','login.html','cadastro.html']);
  const ROOM_GAME_PAGES=new Set(['jogos.html','desafio.html']);
  const q=new URLSearchParams(location.search);
  const fromRoom=q.get('from')==='sala';
  const roomId=q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zuno_return_room_id')||sessionStorage.getItem('zunoplay_room_id');
  const preserveRoom=ROOM_GAME_PAGES.has(page)&&fromRoom&&!!roomId;
  let sb=null,user=null,heartbeat=null,stopped=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function waitClient(){if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;for(let i=0;i<60;i++){await sleep(100);if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient}return null}
  function loginUrl(){const next=page==='index.html'?'index.html':page+location.search+location.hash;return'login.html?next='+encodeURIComponent(next)}
  async function validateUser(){if(!sb)return null;try{const{data:{session},error:sessionError}=await sb.auth.getSession();if(sessionError||!session?.user)return null;const{data,error}=await sb.auth.getUser();if(error||!data?.user){await sb.auth.signOut({scope:'local'}).catch(()=>{});return null}return data.user}catch(_){return null}}
  function redirectToLogin(){if(PUBLIC_PAGES.has(page))return;const target=loginUrl();if(location.pathname.endsWith('/login.html')&&location.search.includes('next='))return;location.replace(target)}
  function clearReturnContext(){if(page==='sala.html'||preserveRoom)return;sessionStorage.removeItem('zuno_return_room_id');sessionStorage.removeItem('zuno_return_room_url')}
  async function touchCurrentRoom(){if(stopped||!sb||!user||!roomId)return false;const{data,error}=await sb.rpc('touch_room_session',{p_room_id:roomId});if(error){console.warn('ZunoPlay: heartbeat da sala falhou.',error);return false}if(data!==true)return false;sessionStorage.setItem('zunoplay_room_id',roomId);if(preserveRoom){sessionStorage.setItem('zuno_return_room_id',roomId);sessionStorage.setItem('zuno_return_room_url','sala.html?room='+encodeURIComponent(roomId))}return true}
  async function startRoomHeartbeat(){if(!roomId||!sb||!user)return;let touched=false;for(let i=0;i<12&&!stopped;i++){touched=await touchCurrentRoom();if(touched)break;await sleep(350)}if(!touched||stopped){console.warn('ZunoPlay: sessão da sala ainda não está disponível para heartbeat.');return}heartbeat=setInterval(()=>touchCurrentRoom().catch(()=>{}),15000)}
  async function start(){sb=await waitClient();if(!sb){if(!PUBLIC_PAGES.has(page))redirectToLogin();return}user=await validateUser();if(!user){sessionStorage.removeItem('zunoplay_room_id');if(!PUBLIC_PAGES.has(page))redirectToLogin();return}window.dispatchEvent(new CustomEvent('zuno:auth-validated',{detail:{user_id:user.id}}));if(page==='sala.html'||preserveRoom){await startRoomHeartbeat();return}/* Não apagamos room_members ao navegar por páginas comuns. A saída real é responsabilidade do fluxo explícito da sala. Isso elimina a corrida entre entrar em uma sala e a limpeza de uma página anterior. */clearReturnContext()}
  window.addEventListener('pagehide',()=>{stopped=true;if(heartbeat)clearInterval(heartbeat)});
  (async()=>{sb=await waitClient();if(sb){sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'&&!PUBLIC_PAGES.has(page))redirectToLogin();if(event==='TOKEN_REFRESHED'&&!session&&!PUBLIC_PAGES.has(page))redirectToLogin()})}await start()})().catch(error=>console.error('Zuno auth/session guard',error));
})();