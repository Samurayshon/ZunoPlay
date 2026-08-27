(()=>{
  if(window.__ZUNOPLAY_OFFICIAL_V32__)return;
  window.__ZUNOPLAY_OFFICIAL_V32__=true;

  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();

  function el(tag,className,html){
    const n=document.createElement(tag);
    if(className)n.className=className;
    if(html!=null)n.innerHTML=html;
    return n;
  }

  function applyBody(){
    if(!document.body)return;
    document.body.classList.add('zuno-official-v32');
    document.documentElement.dataset.zunoInterface='official-v32';
  }

  function syncHomeProfile(head){
    const nameSource=document.getElementById('username');
    const aura=document.getElementById('auraEmblem');
    const profileButton=document.getElementById('profileButton');
    const nameTarget=head.querySelector('[data-z32-name]');
    const levelTarget=head.querySelector('[data-z32-level]');
    const avatarTarget=head.querySelector('.z32-user-avatar');

    const update=()=>{
      const name=(nameSource?.textContent||'ZunoPlayer').trim()||'ZunoPlayer';
      const level=aura?.dataset?.level||'1';
      if(nameTarget)nameTarget.textContent=name;
      if(levelTarget)levelTarget.textContent='Nível '+level+' · Universo Zuno';
      if(avatarTarget){
        const img=profileButton?.querySelector('img');
        if(img?.src){
          avatarTarget.innerHTML='';
          const clone=img.cloneNode(true);
          clone.alt='Seu avatar';
          avatarTarget.appendChild(clone);
        }else{
          avatarTarget.innerHTML='<span>'+name.charAt(0).toUpperCase()+'</span>';
        }
      }
    };
    update();
    [nameSource,aura,profileButton].filter(Boolean).forEach(node=>new MutationObserver(update).observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['src','data-level']}));
  }

  function decorateHome(){
    const topbar=document.querySelector('#homeScreen .topbar');
    const brand=topbar?.querySelector('.brand');
    if(topbar&&!topbar.querySelector('.z32-user-head')){
      brand?.classList.add('z32-brand-hidden');
      const head=el('button','z32-user-head','<span class="z32-user-avatar"><span>Z</span></span><span class="z32-user-copy"><strong data-z32-name>ZunoPlayer</strong><small data-z32-level>Nível 1 · Universo Zuno</small></span>');
      head.type='button';
      head.setAttribute('aria-label','Abrir perfil');
      head.addEventListener('click',()=>{location.href='perfil.html'});
      topbar.insertBefore(head,topbar.firstChild);
      syncHomeProfile(head);
    }

    const menu=document.querySelector('#homeScreen .menu-grid');
    if(menu){
      menu.querySelectorAll('.menu-card').forEach(card=>{
        const title=(card.querySelector('h2')?.textContent||'').trim().toLowerCase();
        if(title.includes('conversa'))card.dataset.z32Role='social';
        else if(title.includes('salas'))card.dataset.z32Role='voice';
        else if(title.includes('comun'))card.dataset.z32Role='community';
        else if(title.includes('jogos'))card.dataset.z32Role='games';
        else if(title.includes('desafio'))card.dataset.z32Role='challenge';
        else if(title.includes('hist'))card.dataset.z32Role='history';
      });
    }
  }

  function pulseMarkup(){
    return '<strong>ZUNO<br>PULSE</strong><span class="z32-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><span>presença em tempo real</span>';
  }

  function ensureRoomPulse(stage){
    if(!stage||stage.querySelector('.z32-pulse-core'))return;
    const pulse=el('div','z32-pulse-core',pulseMarkup());
    pulse.setAttribute('aria-hidden','true');
    stage.appendChild(pulse);
  }

  function decorateRoom(){
    const stage=document.getElementById('roomStage');
    if(!stage)return;
    ensureRoomPulse(stage);
    const observer=new MutationObserver(()=>ensureRoomPulse(stage));
    observer.observe(stage,{childList:true});
    stage.dataset.z32Radial='1';
  }

  function decorateAvatar(){
    const hero=document.getElementById('hero');
    if(hero)hero.dataset.z32Studio='1';
  }

  function mount(){
    applyBody();
    if(page==='index.html')decorateHome();
    if(page==='sala.html')decorateRoom();
    if(page==='avatar.html')decorateAvatar();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
