(()=>{
  if(window.__ZUNO_PROFILE_CORRECTIONS_V1__) return;
  window.__ZUNO_PROFILE_CORRECTIONS_V1__=true;

  const REF='rliymfbbhqoejgfvsbuu';
  const BASE='https://'+REF+'.supabase.co';
  const KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
  const target=new URLSearchParams(location.search).get('user');
  let busy=false;
  let refreshTimer=null;

  function session(){
    const keys=['sb-'+REF+'-auth-token'];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';
      if(k.includes(REF)&&k.includes('auth-token')&&!keys.includes(k)) keys.push(k);
    }
    for(const k of keys){
      try{
        let v=JSON.parse(localStorage.getItem(k)||'null');
        if(Array.isArray(v)) v=v[0];
        if(v?.currentSession) v=v.currentSession;
        if(v?.access_token&&v?.user?.id) return v;
      }catch(_){ }
    }
    return null;
  }

  async function rest(path,opt={}){
    const s=session();
    if(!s?.access_token) throw new Error('not_authenticated');
    const r=await fetch(BASE+'/rest/v1/'+path,{
      ...opt,
      cache:'no-store',
      headers:{
        apikey:KEY,
        Authorization:'Bearer '+s.access_token,
        'Content-Type':'application/json',
        ...(opt.headers||{})
      }
    });
    const txt=await r.text();
    if(!r.ok) throw new Error(txt||('HTTP '+r.status));
    return txt?JSON.parse(txt):null;
  }

  function rowByTitle(root,title){
    return [...root.querySelectorAll('.zp-row')].find(r=>r.querySelector('.zp-row-title')?.textContent.trim()===title);
  }

  function isOnline(p){
    if(!p||p.status!=='online'||!p.last_seen_at) return false;
    const age=Date.now()-new Date(p.last_seen_at).getTime();
    return Number.isFinite(age)&&age>=0&&age<=120000;
  }

  function presenceLabel(p,isOwn){
    if(!p) return isOwn?'Offline':'Presença privada';
    const online=isOnline(p);
    if(p.custom_status) return p.custom_status+(online?' · Online':'');
    return online?'Online no ZunoPlay':'Offline';
  }

  async function saveCustomStatus(userId,value){
    const clean=String(value||'').trim().slice(0,40);
    await rest('user_presence?on_conflict=user_id',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({user_id:userId,custom_status:clean||null})
    });
  }

  function disableUpcoming(root){
    const grid=root.querySelector('.zp-quick-grid');
    if(!grid) return;
    [...grid.querySelectorAll('.zp-quick')].forEach(btn=>{
      const label=btn.textContent.trim();
      if(label==='Avatar Studio') return;
      btn.disabled=true;
      btn.dataset.action='';
      btn.setAttribute('aria-disabled','true');
      btn.title='Em breve';
      const span=btn.querySelector('span:last-child');
      if(span&&!span.textContent.includes('Em breve')) span.textContent=label+' · Em breve';
    });
  }

  async function apply(){
    if(busy) return;
    const root=document.getElementById('profileV2Root');
    if(!root?.querySelector('.zp-identity')) return;
    const s=session();
    if(!s?.user?.id) return;
    busy=true;
    try{
      const profileId=target||s.user.id;
      const own=profileId===s.user.id;
      const social=root.querySelector('#zpSocial');
      if(!social) return;

      const moment=rowByTitle(social,'Momentos');
      if(moment){
        moment.dataset.href='pulso.html';
        moment.onclick=()=>location.href='pulso.html';
      }

      const visitors=rowByTitle(social,'Visitantes');
      visitors?.remove();

      if(own){
        disableUpcoming(root);
        root.querySelector('#zpSpace')?.remove();
        const parental=rowByTitle(root.querySelector('#zpAccount')||root,'Controle Parental');
        parental?.remove();
      }else{
        root.querySelector('.zp-quick-grid')?.closest('section')?.remove();
        root.querySelector('#zpSpace')?.remove();
        root.querySelector('#zpAccount')?.remove();
        const sectionTitle=social.querySelector('.zp-section-title');
        const sectionNote=social.querySelector('.zp-section-note');
        if(sectionTitle) sectionTitle.textContent='Social';
        if(sectionNote) sectionNote.textContent='Conexões públicas';
      }

      let presence=null;
      try{
        const rows=await rest('user_presence?select=status,custom_status,last_seen_at&user_id=eq.'+encodeURIComponent(profileId)+'&limit=1');
        presence=rows?.[0]||null;
      }catch(_){ presence=null; }

      const topStatus=root.querySelector('.zp-status');
      if(topStatus) topStatus.textContent=presenceLabel(presence,own);

      const statusRow=rowByTitle(social,'Meu Status')||rowByTitle(social,'Status');
      if(statusRow){
        const title=statusRow.querySelector('.zp-row-title');
        const sub=statusRow.querySelector('.zp-row-sub');
        const meta=statusRow.querySelector('.zp-row-meta');
        if(title) title.textContent=own?'Meu Status':'Status';
        if(sub) sub.textContent=own?'Defina como você aparece para amigos':'Disponibilidade compartilhada';
        if(meta) meta.textContent=presenceLabel(presence,own);
        if(own){
          statusRow.removeAttribute('aria-disabled');
          statusRow.disabled=false;
          statusRow.onclick=async()=>{
            const current=presence?.custom_status||'';
            const next=prompt('Como você quer aparecer para seus amigos?',current);
            if(next===null) return;
            statusRow.disabled=true;
            try{
              await saveCustomStatus(s.user.id,next);
              presence={...(presence||{}),custom_status:String(next||'').trim().slice(0,40)||null};
              if(meta) meta.textContent=presenceLabel(presence,true);
              if(topStatus) topStatus.textContent=presenceLabel(presence,true);
              localStorage.removeItem('zunoProfileStatus');
              window.dispatchEvent(new CustomEvent('zuno:profile-status-changed',{detail:{status:presence.custom_status||''}}));
            }catch(e){
              console.error('ZunoPlay profile status:',e);
              if(meta) meta.textContent='Não foi possível salvar';
            }finally{ statusRow.disabled=false; }
          };
        }else{
          statusRow.onclick=null;
          statusRow.disabled=true;
          statusRow.setAttribute('aria-disabled','true');
        }
      }
    }finally{
      busy=false;
    }
  }

  const observer=new MutationObserver(()=>setTimeout(apply,0));
  const start=()=>{
    const root=document.getElementById('profileV2Root');
    if(!root) return;
    observer.observe(root,{childList:true,subtree:true});
    apply();
    clearInterval(refreshTimer);
    refreshTimer=setInterval(apply,30000);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
