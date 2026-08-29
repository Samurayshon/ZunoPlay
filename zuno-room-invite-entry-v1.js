(()=>{
  if(window.__ZUNO_ROOM_INVITE_ENTRY_V1__)return;
  window.__ZUNO_ROOM_INVITE_ENTRY_V1__=true;
  const q=new URLSearchParams(location.search),roomId=q.get('room'),token=q.get('invite');
  if(!roomId||!token)return;
  document.documentElement.dataset.zunoInviteJoining='1';
  const setStatus=t=>{const el=document.getElementById('hubMeta');if(el)el.textContent=t};
  async function waitClient(){for(let i=0;i<50;i++){if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;if(window.supabase?.createClient){const sb=window.supabase.createClient('https://rliymfbbhqoejgfvsbuu.supabase.co','sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0');window.ZunoSupabaseClient=sb;return sb}await new Promise(r=>setTimeout(r,100))}throw new Error('Supabase indisponível')}
  async function enter(){
    try{
      setStatus('Validando convite...');const sb=await waitClient();const {data:{session},error:sessionError}=await sb.auth.getSession();if(sessionError)throw sessionError;
      if(!session){location.replace('login.html?next='+encodeURIComponent(location.pathname+location.search));return}
      const {data,error}=await sb.rpc('join_room_session',{p_room_id:roomId,p_invite_token:token});if(error)throw error;
      const member=Array.isArray(data)?data[0]:data;if(!member?.room_id)throw new Error('Não foi possível confirmar a entrada');
      sessionStorage.setItem('zunoplay_room_id',roomId);sessionStorage.setItem('zuno_room_bootstrap',JSON.stringify({room_id:roomId,access_token:session.access_token,user:session.user,at:Date.now()}));
      const target=new URL('sala.html',location.href);target.searchParams.set('room',roomId);target.searchParams.set('build','260');target.searchParams.set('t',Date.now());location.replace(target.href);
    }catch(error){console.error('Entrada por convite',error);setStatus('Convite inválido, expirado ou indisponível');const list=document.getElementById('roomList');if(list)list.innerHTML='<div class="hub-error">Este convite não pode ser usado. Peça um novo link ao host.</div>'}
  }
  enter();
})();
