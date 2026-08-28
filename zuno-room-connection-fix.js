(()=>{
  if(window.__ZUNO_ROOM_BOOTSTRAP_V196__)return;
  window.__ZUNO_ROOM_BOOTSTRAP_V196__=true;
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='sala.html')return;

  const URL='https://rliymfbbhqoejgfvsbuu.supabase.co';
  const KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
  const q=new URLSearchParams(location.search);
  const id=q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zunoplay_room_id')||sessionStorage.getItem('zuno_return_room_id');
  const state={roomId:id,user:null,membership:null,room:null,profiles:new Map(),members:[],messageChannel:null,membersChannel:null,ready:false};
  const byId=x=>document.getElementById(x);
  const esc=v=>{const d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML};
  const withTimeout=(p,ms,label)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error(label+' demorou demais para responder.')),ms))]);

  function getClient(){
    if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;
    if(!window.supabase?.createClient)return null;
    window.ZunoSupabaseClient=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return window.ZunoSupabaseClient;
  }
  function status(text,ok=true){const el=byId('roomStatus');if(el){el.textContent='● '+text;el.style.color=ok?'#31dd7b':'#ff8aa6'}}
  function setTitle(text){const el=byId('roomTitle');if(el)el.textContent=text}
  function setCount(n){const a=byId('roomCountText'),b=byId('sheetCount');if(a)a.textContent=n+' '+(n===1?'pessoa':'pessoas');if(b)b.textContent=n+' '+(n===1?'participante':'participantes')}
  function profileFor(uid){return state.profiles.get(String(uid))||{id:uid,username:'Jogador',avatar_url:null,level:1}}
  function avatarHtml(p,cls='avatar'){return p?.avatar_url?'<img class="'+cls+'" src="'+esc(p.avatar_url)+'" alt="Avatar de @'+esc(p.username||'Jogador')+'">':'<div class="'+cls+'">👤</div>'}

  function renderMembers(){
    const stage=byId('roomStage'),top=byId('topPeople'),sheet=byId('members');if(!stage)return;
    const bySeat=new Map(state.members.map(m=>[Number(m.seat_index),m]));stage.innerHTML='';
    for(let seat=0;seat<8;seat++){
      const m=bySeat.get(seat);
      if(!m){const el=document.createElement('div');el.className='seat-empty';el.dataset.seatIndex=seat;el.innerHTML='<div class="empty-circle">＋</div><div class="empty-label">Livre</div>';stage.appendChild(el);continue}
      const p=profileFor(m.user_id),me=String(m.user_id)===String(state.user?.id),owner=String(m.user_id)===String(state.room?.owner_id),el=document.createElement('div');
      el.className='avatar-slot'+(me?' me':'')+(owner?' owner':'');el.dataset.userId=String(m.user_id);el.dataset.seatIndex=String(seat);
      el.innerHTML='<div class="avatar-wrap">'+avatarHtml(p)+(owner?'<span class="owner-crown">♛</span>':'')+'<span class="mic-dot">🎙</span></div><div class="avatar-name">@'+esc(p.username||'Jogador')+'</div><div class="avatar-role">'+(owner?'Dono':me?'Você':'Assento '+(seat+1))+'</div><div class="presence-status">● Online</div>';
      stage.appendChild(el);
    }
    if(top){top.innerHTML='';state.members.slice(0,3).forEach(m=>{const p=profileFor(m.user_id),el=document.createElement('div');el.className='top-avatar';el.dataset.userId=String(m.user_id);el.innerHTML=p.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="" style="width:100%;height:100%;object-fit:cover">':'👤';top.appendChild(el)});if(state.members.length){const c=document.createElement('div');c.className='people-count';c.textContent=state.members.length;top.appendChild(c)}}
    if(sheet){sheet.innerHTML='';for(const m of state.members){const p=profileFor(m.user_id),me=String(m.user_id)===String(state.user?.id),owner=String(m.user_id)===String(state.room?.owner_id),el=document.createElement('div');el.className='member';el.dataset.userId=String(m.user_id);el.dataset.seatIndex=String(m.seat_index);el.innerHTML=avatarHtml(p,'member-avatar')+'<div class="member-main"><div class="member-name">@'+esc(p.username||'Jogador')+(me?' <span style="color:#31dd7b">(Você)</span>':'')+'</div><div class="member-role">'+(owner?'♛ Dono · ':'')+'Assento '+(Number(m.seat_index)+1)+' · Nível '+esc(p.level??1)+'</div></div>';sheet.appendChild(el)}}
    setCount(state.members.length);window.ZunoRoomPresence?.refresh?.().catch?.(()=>{});
  }

  async function fetchProfiles(sb,ids){const unique=[...new Set(ids.filter(Boolean).map(String))];if(!unique.length)return;const missing=unique.filter(x=>!state.profiles.has(x));if(!missing.length)return;const{data,error}=await withTimeout(sb.from('profiles').select('id,username,avatar_url,level,sex').in('id',missing),6500,'Os perfis');if(error)throw error;for(const p of data||[])state.profiles.set(String(p.id),p)}
  async function refreshMembers(sb){const{data,error}=await withTimeout(sb.from('room_members').select('user_id,seat_index,joined_at').eq('room_id',id).order('seat_index',{ascending:true}),6500,'Os participantes');if(error)throw error;state.members=data||[];await fetchProfiles(sb,state.members.map(x=>x.user_id));renderMembers()}

  function renderMessage(m){const root=byId('messages');if(!root||!m?.id||root.querySelector('[data-message-id="'+CSS.escape(String(m.id))+'"]'))return;root.querySelector('.empty')?.remove();const p=profileFor(m.user_id),me=String(m.user_id)===String(state.user?.id),row=document.createElement('div');row.className='chat-row'+(me?' me':'');row.dataset.messageId=String(m.id);const time=new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});row.innerHTML=avatarHtml(p,'chat-avatar')+'<div class="bubble-wrap"><div class="message-user">@'+esc(p.username||'Jogador')+'</div><div class="message"><div class="message-text">'+esc(m.message)+'</div><div class="message-time">'+esc(time)+'</div></div></div>';root.appendChild(row);root.scrollTop=root.scrollHeight}
  async function loadMessages(sb){const root=byId('messages');if(!root)return;const{data,error}=await withTimeout(sb.from('room_messages').select('id,room_id,user_id,message,created_at').eq('room_id',id).gte('created_at',state.membership.joined_at).order('created_at',{ascending:true}),6500,'As mensagens');if(error)throw error;await fetchProfiles(sb,(data||[]).map(x=>x.user_id));root.innerHTML='';if(!(data||[]).length){root.innerHTML='<div class="empty">Nenhuma mensagem nesta entrada.<br>Comece a conversa 👋</div>';return}(data||[]).forEach(renderMessage)}

  function bindChat(sb){const form=byId('chatForm'),input=byId('chatInput'),send=byId('sendButton');if(!form||form.dataset.zunoBootstrap==='1')return;form.dataset.zunoBootstrap='1';form.addEventListener('submit',async e=>{e.preventDefault();e.stopImmediatePropagation();const text=input.value.trim();if(!text||!state.user||!state.ready)return;send.disabled=true;input.disabled=true;try{const{data,error}=await sb.from('room_messages').insert({room_id:id,user_id:state.user.id,message:text}).select('id,room_id,user_id,message,created_at').single();if(error)throw error;input.value='';await fetchProfiles(sb,[state.user.id]);renderMessage(data)}catch(err){console.error('Zuno chat',err);alert('Não foi possível enviar a mensagem.')}finally{send.disabled=false;input.disabled=false;input.focus()}},true)}

  function subscribeDb(sb){
    if(state.membersChannel)sb.removeChannel(state.membersChannel).catch(()=>{});
    state.membersChannel=sb.channel('zuno-room-members-v196-'+id).on('postgres_changes',{event:'*',schema:'public',table:'room_members',filter:'room_id=eq.'+id},()=>refreshMembers(sb).catch(console.error)).subscribe();
    if(state.messageChannel)sb.removeChannel(state.messageChannel).catch(()=>{});
    state.messageChannel=sb.channel('zuno-room-messages-v196-'+id).on('postgres_changes',{event:'INSERT',schema:'public',table:'room_messages',filter:'room_id=eq.'+id},async payload=>{const m=payload.new;if(!m)return;await fetchProfiles(sb,[m.user_id]).catch(()=>{});renderMessage(m)}).subscribe();
  }

  async function bootstrap(){
    if(!id){setTitle('Sala não encontrada');status('ID da sala ausente',false);return}
    sessionStorage.setItem('zunoplay_room_id',id);const sb=getClient();if(!sb){setTitle('Serviço indisponível');status('Supabase indisponível',false);return}
    status('Conectando...');
    try{
      const{data:{session},error:sError}=await withTimeout(sb.auth.getSession(),6500,'A autenticação');if(sError)throw sError;if(!session?.user){location.replace('login.html?next='+encodeURIComponent('sala.html?room='+id));return}state.user=session.user;
      const [roomRes,memberRes]=await Promise.all([withTimeout(sb.from('rooms').select('id,name,owner_id,created_at').eq('id',id).maybeSingle(),6500,'A sala'),withTimeout(sb.from('room_members').select('room_id,user_id,seat_index,joined_at').eq('room_id',id).eq('user_id',state.user.id).maybeSingle(),6500,'Sua participação')]);
      if(roomRes.error)throw roomRes.error;if(memberRes.error)throw memberRes.error;if(!roomRes.data)throw new Error('Sala não encontrada.');if(!memberRes.data){location.replace('salas.html?room_ended=1');return}
      state.room=roomRes.data;state.membership=memberRes.data;setTitle(state.room.name||'Sala');
      await refreshMembers(sb);await loadMessages(sb);bindChat(sb);subscribeDb(sb);state.ready=true;status('Sala ativa');
      window.dispatchEvent(new CustomEvent('zuno:room-bootstrap-ready',{detail:{room_id:id,user_id:state.user.id,members:state.members.length}}));
      window.ZunoRoomPresence?.start?.().catch?.(()=>{});
    }catch(error){console.error('Zuno room bootstrap',error);state.ready=false;setTitle('Não foi possível abrir a sala');status('Falha ao conectar',false);const m=byId('messages');if(m)m.innerHTML='<div class="error">'+esc(error?.message||'Falha ao carregar a sala.')+'<br><br><button type="button" onclick="location.reload()" style="padding:10px 14px;border-radius:12px;border:1px solid #343b67;background:#0d1228;color:#fff">Tentar novamente</button></div>'}
  }

  window.ZunoRoomBootstrap={start:bootstrap,getState:()=>({...state,profiles:undefined})};
  window.addEventListener('online',()=>bootstrap());window.addEventListener('pagehide',()=>{const sb=getClient();if(sb){if(state.membersChannel)sb.removeChannel(state.membersChannel).catch(()=>{});if(state.messageChannel)sb.removeChannel(state.messageChannel).catch(()=>{})}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();
})();