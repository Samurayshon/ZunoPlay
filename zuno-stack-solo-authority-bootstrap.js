(()=>{
if(window.__ZUNO_STACK_SOLO_AUTH_BOOT__)return;window.__ZUNO_STACK_SOLO_AUTH_BOOT__=true;
const q=new URLSearchParams(location.search),valid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||''),queryRoom=q.get('room')||'';
let solo=!valid(queryRoom),roomId=solo?(crypto?.randomUUID?.()||''):queryRoom;
if(!valid(roomId))return;
const persistRoom=()=>{window.__ZUNO_STACK_AUTHORITY_ROOM_ID__=roomId;try{sessionStorage.setItem('zunoplay_room_id',roomId)}catch(_){}};persistRoom();
const clearRoomParam=()=>{try{const u=new URL(location.href);u.searchParams.delete('room');history.replaceState(history.state,'',`${u.pathname}${u.search}${u.hash}`)}catch(_){}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SUPABASE_URL='https://rliymfbbhqoejgfvsbuu.supabase.co',SUPABASE_KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
const SOLO_MARKER='__zuno_stack_solo_authority__';
let sdkPromise=null;
function loadSdk(){if(window.supabase?.createClient)return Promise.resolve(true);if(sdkPromise)return sdkPromise;sdkPromise=new Promise(resolve=>{let s=document.getElementById('zuno-stack-supabase-sdk');const done=()=>resolve(!!window.supabase?.createClient);if(s){s.addEventListener('load',done,{once:true});s.addEventListener('error',()=>resolve(false),{once:true});return}s=document.createElement('script');s.id='zuno-stack-supabase-sdk';s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=done;s.onerror=()=>resolve(false);document.head.appendChild(s)});return sdkPromise}
async function ensureClient(){if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;for(let i=0;i<20;i++){if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;if(window.supabase?.createClient)break;await sleep(100)}if(!window.supabase?.createClient&&!(await loadSdk()))return null;if(!window.ZunoSupabaseClient){try{const canonical=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.ZunoSupabaseClient=canonical;window.__zunoSupabaseClient=canonical}catch(e){console.error('Zuno Stack: falha ao inicializar Supabase',e);return null}}return window.ZunoSupabaseClient}
async function canUseRoom(sb,u,id){
  const {data:room,error}=await sb.from('rooms').select('id,owner_id,status').eq('id',id).maybeSingle();
  if(error||!room||room.status!=='active')return false;
  if(room.owner_id===u.id)return true;
  const {data:member,error:memberError}=await sb.from('room_members').select('room_id').eq('room_id',id).eq('user_id',u.id).maybeSingle();
  return !memberError&&member?.room_id===id
}
async function reusableSoloRoom(sb,u){
  const {data,error}=await sb.from('rooms').select('id').eq('owner_id',u.id).eq('status','active').eq('description',SOLO_MARKER).eq('visibility','private').eq('is_discoverable',false).order('created_at',{ascending:false}).limit(1).maybeSingle();
  return !error&&valid(data?.id)?data.id:''
}
async function createSoloRoom(sb,u){
  if(!valid(roomId))roomId=crypto?.randomUUID?.()||'';
  if(!valid(roomId))return false;
  const {error}=await sb.from('rooms').insert({id:roomId,owner_id:u.id,name:'Zuno Stack Solo',description:SOLO_MARKER,category:'jogos',visibility:'private',status:'active',max_audience:8,mic_access:'invite_only',is_discoverable:false});
  if(!error){persistRoom();return true}
  if(String(error.code||'')==='23505'){
    const existing=await reusableSoloRoom(sb,u);
    if(valid(existing)){roomId=existing;persistRoom();return true}
  }
  console.error('Zuno Stack: falha ao preparar sala segura',error);return false
}
async function ensureRoom(){
  const sb=await ensureClient();if(!sb)return false;
  const {data:s}=await sb.auth.getSession(),u=s?.session?.user;if(!u)return false;
  if(!solo){
    if(await canUseRoom(sb,u,roomId)){persistRoom();return true}
    console.warn('Zuno Stack: sala solicitada não existe ou não pertence à sessão; recuperando sala segura');
    solo=true;clearRoomParam();
    const existing=await reusableSoloRoom(sb,u);
    if(valid(existing)){roomId=existing;persistRoom();return true}
    roomId=crypto?.randomUUID?.()||'';
  }
  return createSoloRoom(sb,u)
}
function load(){return new Promise(resolve=>{if(window.__ZUNO_STACK_AUTHORITY_OFFICIAL__)return resolve(true);const s=document.createElement('script');s.src='zuno-stack-authority-official.js?v=9';s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s)})}
async function boot(){const b=document.getElementById('start'),label=b?.textContent||'JOGAR AGORA';if(b){b.disabled=true;b.textContent='PREPARANDO PARTIDA SEGURA…'}const ok=await ensureRoom();if(ok)await load();for(let i=0;i<80&&!window.ZunoStackAuthority;i++)await sleep(100);if(b){b.disabled=!window.ZunoStackAuthority;b.textContent=window.ZunoStackAuthority?label:'SERVIDOR INDISPONÍVEL'}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pagehide',()=>{if(solo)try{sessionStorage.removeItem('zunoplay_room_id')}catch(_){}})
})();