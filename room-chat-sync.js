(()=>{
  if(window.__ZUNO_ROOM_CHAT_SYNC__)return;
  window.__ZUNO_ROOM_CHAT_SYNC__=true;

  const q=new URLSearchParams(location.search);
  const roomId=q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zunoplay_room_id');
  if(!roomId)return;

  let channel=null;

  async function waitClient(){
    if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;
    for(let i=0;i<50;i++){
      await new Promise(r=>setTimeout(r,100));
      if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;
    }
    return null;
  }

  function normalizeName(value){return String(value||'').trim().replace(/^@/,'').replace(/\s*\(Você\).*$/i,'').toLowerCase()}
  function avatarSrc(row){const img=row.querySelector('.chat-avatar');return img?.tagName==='IMG'?(img.getAttribute('src')||''):''}
  function profileKey(p){return normalizeName(p?.username)+'|'+String(p?.avatar_url||'')}
  function rowKey(row){return normalizeName(row.querySelector('.message-user')?.textContent)+'|'+avatarSrc(row)}

  function ensureEmpty(){
    const box=document.getElementById('messages');
    if(!box||box.querySelector('.chat-row'))return;
    if(!box.querySelector('.empty')){
      const e=document.createElement('div');
      e.className='empty';
      e.textContent='Nenhuma mensagem ainda. Comece a conversa 👋';
      box.appendChild(e);
    }
  }

  async function pruneToCurrentMembers(){
    const sb=await waitClient();
    const box=document.getElementById('messages');
    if(!sb||!box)return;
    const {data:members,error}=await sb.from('room_members').select('user_id').eq('room_id',roomId);
    if(error)return;
    const ids=[...new Set((members||[]).map(x=>x.user_id).filter(Boolean))];
    if(!ids.length){box.querySelectorAll('.chat-row').forEach(row=>row.remove());ensureEmpty();return}
    const {data:profiles}=await sb.from('profiles').select('id,username,avatar_url').in('id',ids);
    const allowed=new Set((profiles||[]).map(profileKey));
    box.querySelectorAll('.chat-row').forEach(row=>{if(!allowed.has(rowKey(row)))row.remove()});
    ensureEmpty();
  }

  async function removeDepartedUser(userId){
    const sb=await waitClient();
    const box=document.getElementById('messages');
    if(!sb||!box||!userId)return;
    const {data:p}=await sb.from('profiles').select('username,avatar_url').eq('id',userId).maybeSingle();
    if(!p){await pruneToCurrentMembers();return}
    const key=profileKey(p);
    box.querySelectorAll('.chat-row').forEach(row=>{if(rowKey(row)===key)row.remove()});
    ensureEmpty();
  }

  async function start(){
    const sb=await waitClient();
    if(!sb)return;
    channel=sb.channel('zunoplay-room-chat-prune-'+roomId)
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'room_members',filter:'room_id=eq.'+roomId},payload=>{
        removeDepartedUser(payload?.old?.user_id).catch(console.error);
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'room_members',filter:'room_id=eq.'+roomId},()=>{
        pruneToCurrentMembers().catch(console.error);
      })
      .subscribe();
    setTimeout(()=>pruneToCurrentMembers().catch(console.error),700);
    setTimeout(()=>pruneToCurrentMembers().catch(console.error),2200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start().catch(console.error),{once:true});else start().catch(console.error);
  window.addEventListener('pagehide',()=>{if(channel)waitClient().then(sb=>sb?.removeChannel(channel)).catch(()=>{})});
})();
