(()=>{
  if(window.__ZUNOPLAY_HOME_V29__)return;
  window.__ZUNOPLAY_HOME_V29__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='index.html')return;
  function apply(){
    document.body?.classList.add('zuno-home-official');
    const icons=['▣','♩','●●●','🎮','♛','↻'];
    document.querySelectorAll('.menu-card .menu-icon').forEach((el,i)=>{if(icons[i])el.textContent=icons[i]});
    const challenge=document.getElementById('challengeBadge');
    if(challenge)challenge.setAttribute('aria-label','Desafio em destaque');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  const observer=new MutationObserver(()=>apply());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();