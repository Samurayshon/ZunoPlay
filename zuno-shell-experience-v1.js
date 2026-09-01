(()=>{
if(window.__ZUNO_SHELL_EXPERIENCE_V1__)return;window.__ZUNO_SHELL_EXPERIENCE_V1__=true;
const page=()=>String(location.pathname.split('/').pop()||'index.html').toLowerCase();
const localBackPages=new Set(['conversas.html']);
const backSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>';
function current(){return window.ZunoNavigationPolicy?.resolve?.()||null}
function goBack(){if(window.ZunoNavigationPolicy?.goBack?.())return;history.length>1?history.back():location.assign('index.html')}
function existingBack(){return document.querySelector('[data-zuno-contextual-back], [data-back], .home-button')}
function decorateBack(button){if(!button||button.dataset.zunoShellBackBound==='1')return;button.dataset.zunoShellBackBound='1';button.dataset.zunoContextualBack='1';button.classList.add('zuno-context-back');if(page()==='historico.html'){button.innerHTML=backSvg+'<span>Jogos</span>';button.removeAttribute('onclick');button.onclick=null}else if(button.hasAttribute('data-back')){button.innerHTML=backSvg+'<span>Perfil</span>';button.onclick=null}button.addEventListener('click',event=>{event.preventDefault();goBack()})}
function generatedBack(){return document.querySelector('[data-zuno-generated-context-back="1"]')}
function mountBack(){const state=current(),generated=generatedBack();if(!state||state.mode!=='contextual'){generated?.remove();return}if(localBackPages.has(page())){generated?.remove();return}const existing=existingBack();if(existing){generated?.remove();decorateBack(existing);return}if(generated)return;const host=document.querySelector('body>main,body>.app,body>.container,body>.shell');if(!host)return;const button=document.createElement('button');button.type='button';button.className='zuno-context-back';button.dataset.zunoGenerated='1';button.dataset.zunoGeneratedContextBack='1';button.setAttribute('aria-label','Voltar');button.innerHTML=backSvg+'<span>Voltar</span>';button.addEventListener('click',goBack);host.prepend(button)}
function statusBanner(){let banner=document.getElementById('zunoShellOffline');if(navigator.onLine){banner?.remove();return}if(!banner){banner=document.createElement('div');banner.id='zunoShellOffline';banner.className='zuno-shell-offline';banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');banner.textContent='Sem conexão. Alguns recursos podem ficar indisponíveis até a internet voltar.';document.body?.appendChild(banner)}}
function sync(){mountBack();statusBanner()}
function start(){sync();let raf=0;const observer=new MutationObserver(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;mountBack()})});observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('online',statusBanner);window.addEventListener('offline',statusBanner);window.addEventListener('zuno:navigation-policy-ready',mountBack);window.addEventListener('pageshow',sync)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
