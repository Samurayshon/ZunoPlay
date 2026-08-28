(()=>{
if(window.__ZUNOPLAY_ROOM_HISTORY_V1__)return;window.__ZUNOPLAY_ROOM_HISTORY_V1__=true;
const MAX=12;
const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const roomId=new URLSearchParams(location.search).get('room');
const escKey=v=>String(v||'guest').replace(/[^a-zA-Z0-9_-]/g,'_');
const key=userId=>'zunoplay:room-history:v1:'+escKey(userId);
function read(userId){try{const value=JSON.parse(localStorage.getItem(key(userId))||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
function write(userId,items){try{localStorage.setItem(key(userId),JSON.stringify(items.slice(0,MAX)))}catch{}}
function record(userId,room){if(!userId||!room?.id)return;const items=read(userId).filter(item=>String(item.id)!==String(room.id));items.unshift({id:String(room.id),name:String(room.name||'Sala Zuno'),visited_at:new Date().toISOString()});write(userId,items);window.dispatchEvent(new CustomEvent('zuno:room-history-updated',{detail:{room_id:String(room.id)}}))}
async function getClient(){for(let i=0;i<30;i++){const client=window.ZunoSupabaseClient||window.__zunoSupabaseClient;if(client)return client;await new Promise(r=>setTimeout(r,100))}return null}
async function currentUser(client){try{const{data}=await client.auth.getUser();return data?.user||null}catch{return null}}
async function recordCurrentRoom(){if(page!=='sala.html'||!roomId)return;const client=await getClient();if(!client)return;const user=await currentUser(client);if(!user)return;try{const{data}=await client.from('rooms').select('id,name').eq('id',roomId).maybeSingle();if(data)record(user.id,data)}catch{}}
window.ZunoRoomHistory={read,record};
recordCurrentRoom();
})();