(()=>{
  if(window.__ZUNOPLAY_CURRENT_INTERFACE__)return;
  window.__ZUNOPLAY_CURRENT_INTERFACE__=true;
  const VERSION='142';
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
    // Classes legadas são mantidas somente como seletores internos da interface atual.
    document.body.classList.add('zuno-official-v31');
    if(pageClass)document.body.classList.add(pageClass);
    if(page==='index.html')document.body.classList.add('zuno-home-official');
    document.documentElement.dataset.zunoInterface='current';
  }
  function decorateHome(){
    const hero=document.querySelector('#homeScreen .hero');
    if(!hero||hero.dataset.zunoCurrent==='1')return;
    hero.dataset.zunoCurrent='1';
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
    document.getElementById('auraEmblem')?.setAttribute('aria-label','Aura de Zuno');
    document.getElementById('profileAvatarWrap')?.setAttribute('aria-label','Seu avatar Zuno');
  }
  function decorateRoom(){const stage=document.getElementById('roomStage');if(stage)stage.setAttribute('aria-label','Palco de voz Zuno com oito assentos e Zuno Pulse central')}
  function decorateAvatar(){const hero=document.getElementById('hero');if(hero)hero.setAttribute('aria-label','Prévia do seu avatar no Zuno Avatar Studio');const label=document.getElementById('pulseLabel');if(label)label.innerHTML='<b>Zuno Pulse</b> · visualize seu avatar em movimento'}
  function decorateCommunities(){const title=document.querySelector('.title');if(title&&!title.dataset.zunoCurrent){title.dataset.zunoCurrent='1';const eyebrow=node('div','zuno-v31-community-kicker','UNIVERSO SOCIAL');eyebrow.style.cssText='font-size:9px;letter-spacing:.16em;font-weight:900;color:#7385a6;margin-bottom:7px';title.parentNode?.insertBefore(eyebrow,title)}}
  function decorateGames(){const intro=document.querySelector('.intro');if(!intro||intro.dataset.zunoCurrent==='1')return;intro.dataset.zunoCurrent='1';const chip=node('div','zuno-v31-games-chip','JOGUE · COMPITA · CONECTE');chip.style.cssText='display:inline-flex;margin-bottom:8px;padding:6px 9px;border:1px solid rgba(126,141,193,.18);border-radius:999px;background:rgba(10,15,31,.62);color:#8c9bb6;font-size:8px;font-weight:900;letter-spacing:.12em';intro.prepend(chip)}
  function syncLiveHomeLabel(){
    if(page!=='index.html')return;
    const label=document.querySelector('.zuno-v31-kicker span'),online=document.getElementById('onlineCount');
    if(!label||!online)return;
    const update=()=>{const count=Number((online.textContent||'').replace(/\D/g,''))||0;label.textContent=count>0?`Universo Zuno · ${count} amigo${count===1?'':'s'} online`:'Universo Zuno · conectado'};
    update();new MutationObserver(update).observe(online,{childList:true,characterData:true,subtree:true});
  }
  function asset(file){return file+(file.includes('?')?'&':'?')+'v='+VERSION}
  function injectStyle(id,file){if(document.getElementById(id))return;const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=asset(file);document.head.appendChild(link)}
  function injectScript(id,file,errorText){if(document.getElementById(id))return;const script=document.createElement('script');script.id=id;script.src=asset(file);script.async=true;script.onerror=()=>console.error(errorText);document.head.appendChild(script)}
  function loadCurrentModules(){
    injectStyle('zunoplay-current-stage-style','./zuno-current-stage.css');
    injectScript('zunoplay-current-stage-script','./zuno-current-stage.js','ZunoPlay: estágio visual atual indisponível');
    if(page==='index.html'){
      injectStyle('zunoplay-current-home-style','./zuno-current-home.css');
      injectScript('zunoplay-current-home-script','./zuno-current-home.js','ZunoPlay: Home atual indisponível');
      injectStyle('zunoplay-current-home-mobile-style','./zuno-current-home-mobile.css');
      injectStyle('zunoplay-current-interactions-style','./zuno-current-interactions.css');
      injectScript('zunoplay-current-interactions-script','./zuno-current-interactions.js','ZunoPlay: interações da Home indisponíveis');
    }
  }
  function mount(){
    applyBodyIdentity();
    if(page==='index.html'){decorateHome();syncLiveHomeLabel()}
    if(page==='sala.html')decorateRoom();
    if(page==='avatar.html')decorateAvatar();
    if(page==='comunidades.html')decorateCommunities();
    if(page==='jogos.html')decorateGames();
    loadCurrentModules();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
