(()=>{
  if(window.__ZUNOPLAY_CURRENT_INTERFACE__)return;
  window.__ZUNOPLAY_CURRENT_INTERFACE__=true;
  const VERSION='151';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const pageClass={
    'index.html':'zuno-official-home',
    'sala.html':'zuno-official-room',
    'avatar.html':'zuno-official-avatar',
    'comunidades.html':'zuno-official-communities',
    'jogos.html':'zuno-official-games'
  }[page];

  function node(tag,className,html){const el=document.createElement(tag);if(className)el.className=className;if(html!=null)el.innerHTML=html;return el}
  function applyBodyIdentity(){
    if(!document.body)return;
    document.body.classList.add('zuno-official-v31','zuno-official-v32','zuno-official-v33');
    if(pageClass)document.body.classList.add(pageClass);
    if(page==='index.html')document.body.classList.add('zuno-home-official');
    document.documentElement.dataset.zunoInterface='current';
  }
  function decorateHome(){
    const hero=document.querySelector('#homeScreen .hero');
    if(!hero||hero.dataset.zunoCurrent==='1')return;
    hero.dataset.zunoCurrent='1';
    hero.querySelectorAll('.zuno-v31-kicker,.zuno-v31-companion').forEach(el=>el.remove());
    const menu=document.querySelector('#homeScreen .menu-grid');
    if(menu){
      menu.setAttribute('aria-label','Atalhos principais do ZunoPlay');
      menu.querySelectorAll('.menu-card').forEach((card,index)=>{
        card.dataset.zunoOrder=String(index+1);
        card.setAttribute('aria-label',(card.querySelector('h2')?.textContent||'Atalho')+' · abrir');
      });
    }
    document.getElementById('auraEmblem')?.setAttribute('aria-label','Aura de Zuno');
    document.getElementById('profileAvatarWrap')?.setAttribute('aria-label','Seu avatar Zuno');
  }
  function decorateRoom(){document.getElementById('roomStage')?.setAttribute('aria-label','Palco de voz Zuno com oito assentos e Zuno Pulse central')}
  function decorateAvatar(){
    const hero=document.getElementById('hero');
    if(hero){hero.dataset.z32Studio='1';hero.setAttribute('aria-label','Prévia do seu avatar no Zuno Avatar Studio')}
    const label=document.getElementById('pulseLabel');
    if(label)label.innerHTML='<b>Zuno Pulse</b> · visualize seu avatar em movimento';
  }
  function decorateCommunities(){
    const title=document.querySelector('.title');
    if(title&&!title.dataset.zunoCurrent){
      title.dataset.zunoCurrent='1';
      const eyebrow=node('div','zuno-v31-community-kicker','UNIVERSO SOCIAL');
      eyebrow.style.cssText='font-size:9px;letter-spacing:.16em;font-weight:900;color:#7385a6;margin-bottom:7px';
      title.parentNode?.insertBefore(eyebrow,title);
    }
  }
  function decorateGames(){
    const intro=document.querySelector('.intro');
    if(!intro||intro.dataset.zunoCurrent==='1')return;
    intro.dataset.zunoCurrent='1';
    const chip=node('div','zuno-v31-games-chip','JOGUE · COMPITA · CONECTE');
    chip.style.cssText='display:inline-flex;margin-bottom:8px;padding:6px 9px;border:1px solid rgba(126,141,193,.18);border-radius:999px;background:rgba(10,15,31,.62);color:#8c9bb6;font-size:8px;font-weight:900;letter-spacing:.12em';
    intro.prepend(chip);
  }
  function asset(file){return file+(file.includes('?')?'&':'?')+'v='+VERSION}
  function injectStyle(id,file){
    const href=asset(file),existing=document.getElementById(id);
    if(existing){
      const current=existing.getAttribute('href')||'';
      if(!current.includes('v='+VERSION))existing.setAttribute('href',href);
      return;
    }
    const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;document.head.appendChild(link);
  }
  function injectScript(id,file,errorText){
    if(document.getElementById(id))return;
    const script=document.createElement('script');script.id=id;script.src=asset(file);script.async=true;script.onerror=()=>console.error(errorText);document.head.appendChild(script);
  }
  function loadCurrentModules(){
    injectStyle('zunoplay-current-stage-style','./zuno-current-stage.css');
    if(page==='index.html'){
      injectStyle('zunoplay-current-home-style','./zuno-current-home.css');
      injectScript('zunoplay-current-home-script','./zuno-current-home.js','ZunoPlay: Home atual indisponível');
      injectStyle('zunoplay-current-home-mobile-style','./zuno-current-home-mobile.css');
      injectStyle('zunoplay-current-home-stats-style','./zuno-current-home-stats.css');
      injectStyle('zunoplay-current-interactions-style','./zuno-current-interactions.css');
    }
  }
  function mount(){
    applyBodyIdentity();
    if(page==='index.html')decorateHome();
    if(page==='sala.html')decorateRoom();
    if(page==='avatar.html')decorateAvatar();
    if(page==='comunidades.html')decorateCommunities();
    if(page==='jogos.html')decorateGames();
    loadCurrentModules();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
