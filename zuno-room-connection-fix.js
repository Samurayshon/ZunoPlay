(()=>{
  if(window.__ZUNO_ROOM_CONNECTION_FIX__)return;
  window.__ZUNO_ROOM_CONNECTION_FIX__=true;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(page!=='sala.html')return;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const timeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,rej)=>setTimeout(()=>rej(new Error(label+' demorou demais para responder.')),ms))]);
  const roomId=()=>{const q=new URLSearchParams(location.search);return q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zunoplay_room_id')||sessionStorage.getItem('zuno_return_room_id')};
  function esc(v){const d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML}
  function client(){
    if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;
    if(window.ZunoRealtime?.client)return window.ZunoRealtime.client;
    if(window.supabase?.createClient){
      window.ZunoSupabaseClient=window.supabase.createClient('https://rliymfbbhqoejgfvsbuu.supabase.co','sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0');
      return window.ZunoSupabaseClient;
    }
    return null;
  }
  function status(text,ok=true){const el=document.getElementById('roomStatus');if(el){el.textContent='● '+text;el.style.color=ok?'#31dd7b':'#ff8aa6'}}
  function renderSeats(rows,profiles,user,ownerId){
    const stage=document.getElementById('roomStage');if(!stage)return;
    const byId=new Map((profiles||[]).map(p=>[String(p.id),p]));
    const bySeat=new Map((rows||[]).map(r=>[Number(r.seat_index),r]));
    stage.innerHTML='';
    for(let seat=0;seat<8;seat++){
      const row=bySeat.get(seat);
      if(!row){const e=document.createElement('div');e.className='seat-empty';e.dataset.seatIndex=String(seat);e.innerHTML='<div class="empty-circle">＋</div><div class="empty-label">Livre</div>';stage.appendChild(e);continue}
      const p=byId.get(String(row.user_id))||{};
      const name=(p.username||'Jogador').trim();
      const me=String(row.user_id)===String(user?.id),owner=String(row.user_id)===String(ownerId);
      const node=document.createElement('div');node.className='avatar-slot'+(me?' me':'')+(owner?' owner':'');node.dataset.userId=String(row.user_id);node.dataset.seatIndex=String(seat);
      const avatar=p.avatar_url?'<img class="avatar" src="'+esc(p.avatar_url)+'" alt="Avatar de @'+esc(name)+'">':'<div class="avatar">👤</div>';
      node.innerHTML='<div class="avatar-wrap">'+avatar+(owner?'<span class="owner-crown" title="Dono da sala">♛</span>':'')+'<span class="mic-dot">🎙</span></div><div class="avatar-name">@'+esc(name)+'</div><div class="avatar-role">'+(owner?'Dono':me?'Você':'Assento '+(seat+1))+'</div><div class="presence-status">● Online</div>';
      stage.appendChild(node);
    }
  }
  async function recover(){
    const id=roomId();
    if(!id){status('Sala inválida',false);const t=document.getElementById('roomTitle');if(t)t.textContent='Sala não encontrada';return}
    sessionStorage.setItem('zunoplay_room_id',id);
    const sb=client();if(!sb){status('Serviço indisponível',false);return}
    status('Conectando...');
    try{
      const sessionRes=await timeout(sb.auth.getSession(),6000,'A autenticação');
      const user=sessionRes?.data?.session?.user;if(!user){location.replace('login.html?next='+encodeURIComponent('sala.html?room='+id));return}
      const [roomRes,memberRes]=await Promise.all([
        timeout(sb.from('rooms').select('id,name,owner_id,created_at').eq('id',id).maybeSingle(),7000,'A sala'),
        timeout(sb.from('room_members').select('room_id,user_id,seat_index,joined_at').eq('room_id',id).eq('user_id',user.id).maybeSingle(),7000,'Sua participação')
      ]);
      if(roomRes.error)throw roomRes.error;if(!roomRes.data)throw new Error('A sala não foi encontrada.');
      if(memberRes.error)throw memberRes.error;
      if(!memberRes.data){sessionStorage.removeItem('zunoplay_room_id');location.replace('salas.html?room_ended=1');return}
      const title=document.getElementById('roomTitle');if(title)title.textContent=roomRes.data.name||'Sala';
      const membersRes=await timeout(sb.from('room_members').select('user_id,seat_index,joined_at').eq('room_id',id).order('seat_index',{ascending:true}),7000,'Os participantes');
      if(membersRes.error)throw membersRes.error;
      const rows=membersRes.data||[];
      let profiles=[];
      if(rows.length){const pr=await timeout(sb.from('profiles').select('id,username,avatar_url,level,sex').in('id',rows.map(r=>r.user_id)),7000,'Os perfis');if(!pr.error)profiles=pr.data||[]}
      renderSeats(rows,profiles,user,roomRes.data.owner_id);
      const n=rows.length,label=n+' '+(n===1?'pessoa':'pessoas');
      const count=document.getElementById('roomCountText');if(count)count.textContent=label;
      const sheet=document.getElementById('sheetCount');if(sheet)sheet.textContent=n+' '+(n===1?'participante':'participantes');
      const messages=document.getElementById('messages');
      if(messages&&/Carregando mensagens/i.test(messages.textContent||'')){
        const mr=await timeout(sb.from('room_messages').select('id,room_id,user_id,message,created_at').eq('room_id',id).gte('created_at',memberRes.data.joined_at).order('created_at',{ascending:true}),7000,'As mensagens').catch(()=>null);
        if(mr&&!mr.error){
          messages.innerHTML='';
          if(!(mr.data||[]).length)messages.innerHTML='<div class="empty">Nenhuma mensagem nesta entrada.<br>Comece a conversa 👋</div>';
          else{
            const pmap=new Map(profiles.map(p=>[String(p.id),p]));
            for(const m of mr.data){const p=pmap.get(String(m.user_id))||{},me=String(m.user_id)===String(user.id),row=document.createElement('div');row.className='chat-row'+(me?' me':'');row.dataset.messageId=String(m.id);const time=new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});row.innerHTML='<div class="chat-avatar">👤</div><div class="bubble-wrap"><div class="message-user">@'+esc(p.username||'Jogador')+'</div><div class="message"><div class="message-text">'+esc(m.message)+'</div><div class="message-time">'+esc(time)+'</div></div></div>';messages.appendChild(row)}
          }
        }
      }
      status('Sala ativa');
      window.dispatchEvent(new CustomEvent('zuno:room-recovered',{detail:{room_id:id,user_id:user.id,members:n}}));
      window.ZunoRoomPresence?.start?.().catch?.(()=>{});
    }catch(error){
      console.error('Zuno room recovery',error);status('Falha ao conectar',false);
      const t=document.getElementById('roomTitle');if(t&&/Carregando sala/i.test(t.textContent||''))t.textContent='Não foi possível abrir a sala';
      const m=document.getElementById('messages');if(m)m.innerHTML='<div class="error">'+esc(error?.message||'Não foi possível conectar à sala.')+'<br><br><button type="button" onclick="location.reload()" style="padding:10px 14px;border-radius:12px;border:1px solid #343b67;background:#0d1228;color:#fff">Tentar novamente</button></div>';
    }
  }
  async function watchdog(){
    for(let i=0;i<25;i++){await sleep(200);const t=document.getElementById('roomTitle');if(t&&!/Carregando sala/i.test(t.textContent||''))return}
    recover();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchdog,{once:true});else watchdog();
  window.addEventListener('online',()=>setTimeout(()=>{const t=document.getElementById('roomTitle');if(t&&/Carregando|Não foi possível/i.test(t.textContent||''))recover()},300));
})();