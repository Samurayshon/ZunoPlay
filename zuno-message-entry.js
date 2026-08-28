(()=>{
'use strict';
if(window.ZunoMessageEntry)return;
let client=null,user=null,channel=null,total=0,booted=false,refreshTimer=null;
const CACHE_PREFIX='zuno-message-unread-v2:';
const getClient=()=>window.ZunoSupabaseClient||window.__zunoSupabaseClient||window.supabaseClient||null;
const cacheKey=()=>user?.id?CACHE_PREFIX+user.id:null;
function readCache(){const k=cacheKey();if(!k)return 0;const n=Number(localStorage.getItem(k)||0);return Number.isFinite(n)&&n>0?n:0}
function writeCache(){const k=cacheKey();if(!k)return;try{localStorage.setItem(k,String(Math.max(0,total)))}catch(_){}}
function paint(next,animate=false){total=Math.max(0,Number(next)||0);writeCache();document.querySelectorAll('[data-zuno-message-badge]').forEach(el=>{el.textContent=total>99?'99+':String(total);el.hidden=!total;el.setAttribute('aria-label',total?`${total} mensagens não lidas`:'Nenhuma mensagem não lida')});document.querySelectorAll('[data-zuno-message-entry]').forEach(el=>{el.classList.toggle('zuno-has-unread',!!total&&animate);el.setAttribute('aria-label',total?`Mensagens, ${total} não lidas`:'Mensagens');if(animate)setTimeout(()=>el.classList.remove('zuno-has-unread'),500)})}
async function fetchUnread(){if(!client||!user)return 0;const{data,error}=await client.rpc('zuno_inbox',{p_limit:100,p_offset:0});if(error)throw error;return(data||[]).reduce((n,row)=>n+Number(row.unread_count||0),0)}
async function refresh(options={}){if(!client||!user)return paint(0);try{const serverTotal=await fetchUnread();const next=options.keepFloor?Math.max(serverTotal,total):serverTotal;paint(next,!!options.animate);return total}catch(error){console.warn('[ZunoMessages] unread',error);return total}}
function recordOf(payload){return payload?.payload?.record||payload?.payload?.new||payload?.record||payload?.new||null}
function currentConversation(){return new URLSearchParams(location.search).get('conversation')}
function conversationIsOpen(record){return !!(record?.conversation_id&&record.conversation_id===currentConversation()&&document.visibilityState==='visible')}
async function delivered(record){if(!record?.id||record.sender_id===user?.id)return;try{await client.from('message_receipts').upsert({message_id:record.id,user_id:user.id,delivered_at:new Date().toISOString()},{onConflict:'message_id,user_id'})}catch(_){}}
function scheduleReconcile(delay=300,keepFloor=true){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refresh({keepFloor}),delay)}
async function subscribe(){if(!window.ZunoRealtime||!user)return;try{await window.ZunoRealtime.start();channel=window.ZunoRealtime.broadcast.scope(`user:${user.id}:messages`,{private:true});channel.on('INSERT',async payload=>{const record=recordOf(payload);if(!record||record.sender_id===user.id)return;await delivered(record);if(conversationIsOpen(record)){scheduleReconcile(250,false)}else{paint(total+1,true);scheduleReconcile(450,true)}window.dispatchEvent(new CustomEvent('zuno:message-received',{detail:record}))});await channel.subscribe()}catch(error){console.warn('[ZunoMessages] realtime entry',error)}}
async function init(){if(booted)return;client=getClient();if(!client){setTimeout(init,250);return}const{data}=await client.auth.getSession();user=data?.session?.user||null;if(!user){paint(0);return}booted=true;paint(readCache());await refresh();await subscribe();client.auth.onAuthStateChange(async(_,session)=>{user=session?.user||null;if(!user){paint(0);channel?.close?.();channel=null;booted=false}else{paint(readCache());await refresh()}});window.addEventListener('zuno:messages-read',()=>refresh({keepFloor:false}));window.addEventListener('focus',()=>refresh({keepFloor:false}));window.addEventListener('pageshow',()=>refresh({keepFloor:false}));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh({keepFloor:false})})}
window.ZunoMessageEntry={init,refresh,get unreadCount(){return total}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();