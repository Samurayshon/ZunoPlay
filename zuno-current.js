(()=>{
  if(window.__ZUNOPLAY_CURRENT_INTERFACE__)return;
  window.__ZUNOPLAY_CURRENT_INTERFACE__=true;
  const VERSION='262';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const pageClass={
    'index.html':'zuno-official-home',
    'sala.html':'zuno-official-room',
    'avatar.html':'zuno-official-avatar',
    'comunidades.html':'zuno-official-communities',
    'jogos.html':'zuno-official-games'
  }[page];
  function node(tag,className,html){const el=document.createElement(tag);if(className)el.className=className;if(html!=null)el.innerHTML=html;return el}
  function applyBodyIdentity(){if(!document.body)return;document.body.classList.add('zuno-official-v31','zuno-official-v32','zuno-official-v33');if(pageClass)document.body.classList.add(pageClass);if(page==='index.html')document.body.classList.add('zuno-home-official');document.documentElement.dataset.zunoInterface='current'}
  function decorateHome(){const hero=document.querySelector('#homeScreen .hero');if(!hero||hero.dataset.zunoCurrent==='1')return;hero.dataset.zunoCurrent='1';hero.querySelectorAll('.zuno-v31-kicker,.zuno-v31-companion').forEach(el=>el.remove());const menu=document.querySelector('#homeScreen .menu-grid');if(menu){menu.setAttribute('aria-label','Atalhos principais do ZunoPlay');menu.querySelectorAll('.menu-card').forEach((card,index)=>{card.dataset.zunoOrder=String(index+1);card.setAttribute('aria-label',(card.querySelector('h2')?.textContent||'Atalho')+' · abrir')})}document.getElementById('auraEmblem')?.setAttribute('aria-label','Aura de Zuno');document.getElementById('profileAvatarWrap')?.setAttribute('aria-label','Seu avatar Zuno')}
  function decorateRoom(){document.getElementById('roomStage')?.setAttribute('aria-label','Palco de voz Zuno com oito assentos e Zuno Pulse central')}
  function decorateAvatar(){const hero=document.getElementById('hero');if(hero){hero.dataset.z32Studio='1';hero.setAttribute('aria-label','Prévia do seu avatar no Zuno Avatar Studio')}const label=document.getElementById('pulseLabel');if(label)label.innerHTML='<b>Zuno Pulse</b> · visualize seu avatar em movimento'}
  function decorateCommunities(){const title=document.querySelector('.title');if(title&&!title.dataset.zunoCurrent){title.dataset.zunoCurrent='1';const eyebrow=node('div','zuno-v31-community-kicker','UNIVERSO SOCIAL');eyebrow.style.cssText='font-size:9px;letter-spacing:.16em;font-weight:900;color:#7385a6;margin-bottom:7px';title.parentNode?.insertBefore(eyebrow,title)}}
  function decorateGames(){const intro=document.querySelector('.intro');if(!intro||intro.dataset.zunoCurrent==='1')return;intro.dataset.zunoCurrent='1';const chip=node('div','zuno-v31-games-chip','JOGUE · COMPITA · CONECTE');chip.style.cssText='display:inline-flex;margin-bottom:8px;padding:6px 9px;border:1px solid rgba(126,141,193,.18);border-radius:999px;background:rgba(10,15,31,.62);color:#8c9bb6;font-size:8px;font-weight:900;letter-spacing:.12em';intro.prepend(chip)}
  function installRefresh(){if(!('serviceWorker' in navigator))return;const key='zuno-sw-v262-reloaded';navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem(key)==='1')return;sessionStorage.setItem(key,'1');location.reload()})}
  function mount(){applyBodyIdentity();if(page==='index.html')decorateHome();if(page==='sala.html')decorateRoom();if(page==='avatar.html')decorateAvatar();if(page==='comunidades.html')decorateCommunities();if(page==='jogos.html')decorateGames();installRefresh()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();