(()=>{
  if(window.__ZUNOPLAY_OFFICIAL_V31__)return;
  window.__ZUNOPLAY_OFFICIAL_V31__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const pageClass={
    'index.html':'zuno-official-home',
    'sala.html':'zuno-official-room',
    'avatar.html':'zuno-official-avatar',
    'comunidades.html':'zuno-official-communities',
    'jogos.html':'zuno-official-games'
  }[page];

  function node(tag,className,html){
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(html!=null)el.innerHTML=html;
    return el;
  }

  function applyBodyIdentity(){
    if(!document.body)return;
    document.body.classList.add('zuno-official-v31');
    if(pageClass)document.body.classList.add(pageClass);
    if(page==='index.html')document.body.classList.add('zuno-home-official');
    document.documentElement.dataset.zunoInterface='official-v31';
  }

  function decorateHome(){
    const hero=document.querySelector('#homeScreen .hero');
    if(!hero||hero.dataset.zunoV31==='1')return;
    hero.dataset.zunoV31='1';

    const kicker=node('div','zuno-v31-kicker','<i></i><span>Universo Zuno · conectado</span>');
    hero.prepend(kicker);

    const companion=node('div','zuno-v31-companion','<span class="zuno-v31-face"><i></i><i></i></span>');
    companion.setAttribute('aria-hidden','true');
    hero.appendChild(companion);

    const menu=document.querySelector('#homeScreen .menu-grid');
    if(menu){
      menu.setAttribute('aria-label','Atalhos principais do ZunoPlay');
      menu.querySelectorAll('.menu-card').forEach((card,index)=>{
        card.dataset.zunoOrder=String(index+1);
        card.setAttribute('aria-label',(card.querySelector('h2')?.textContent||'Atalho')+' · abrir');
      });
    }

    const aura=document.getElementById('auraEmblem');
    if(aura)aura.setAttribute('aria-label','Aura de Zuno');
    const avatar=document.getElementById('profileAvatarWrap');
    if(avatar)avatar.setAttribute('aria-label','Seu avatar Zuno');
  }

  function decorateRoom(){
    const stage=document.getElementById('roomStage');
    if(!stage||stage.dataset.zunoV31==='1')return;
    stage.dataset.zunoV31='1';
    stage.setAttribute('aria-label','Palco de voz Zuno com oito assentos e Zuno Pulse central');
  }

  function decorateAvatar(){
    const hero=document.getElementById('hero');
    if(!hero||hero.dataset.zunoV31==='1')return;
    hero.dataset.zunoV31='1';
    hero.setAttribute('aria-label','Prévia do seu avatar no Zuno Avatar Studio');
    const label=document.getElementById('pulseLabel');
    if(label)label.innerHTML='<b>Zuno Pulse</b> · visualize seu avatar em movimento';
  }

  function decorateCommunities(){
    const title=document.querySelector('.title');
    if(title&&!title.dataset.zunoV31){
      title.dataset.zunoV31='1';
      const eyebrow=node('div','zuno-v31-community-kicker','UNIVERSO SOCIAL');
      eyebrow.style.cssText='font-size:9px;letter-spacing:.16em;font-weight:900;color:#7385a6;margin-bottom:7px';
      title.parentNode?.insertBefore(eyebrow,title);
    }
  }

  function decorateGames(){
    const intro=document.querySelector('.intro');
    if(!intro||intro.dataset.zunoV31==='1')return;
    intro.dataset.zunoV31='1';
    const chip=node('div','zuno-v31-games-chip','JOGUE · COMPITA · CONECTE');
    chip.style.cssText='display:inline-flex;margin-bottom:8px;padding:6px 9px;border:1px solid rgba(126,141,193,.18);border-radius:999px;background:rgba(10,15,31,.62);color:#8c9bb6;font-size:8px;font-weight:900;letter-spacing:.12em';
    intro.prepend(chip);
  }

  function syncLiveHomeLabel(){
    if(page!=='index.html')return;
    const label=document.querySelector('.zuno-v31-kicker span');
    const online=document.getElementById('onlineCount');
    if(!label||!online)return;
    const update=()=>{
      const count=Number((online.textContent||'').replace(/\D/g,''))||0;
      label.textContent=count>0?`Universo Zuno · ${count} amigo${count===1?'':'s'} online`:'Universo Zuno · conectado';
    };
    update();
    new MutationObserver(update).observe(online,{childList:true,characterData:true,subtree:true});
  }

  function mount(){
    applyBodyIdentity();
    if(page==='index.html'){decorateHome();syncLiveHomeLabel()}
    if(page==='sala.html')decorateRoom();
    if(page==='avatar.html')decorateAvatar();
    if(page==='comunidades.html')decorateCommunities();
    if(page==='jogos.html')decorateGames();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
