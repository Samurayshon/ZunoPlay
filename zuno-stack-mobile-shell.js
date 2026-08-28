(()=>{
if(window.__ZUNO_STACK_MOBILE_SHELL__)return;window.__ZUNO_STACK_MOBILE_SHELL__=true;
function boot(){
 const top=document.querySelector('#zunoStackApp .top');
 if(!top)return;
 const old=top.querySelector('.title,.stack-title');
 if(old){
  old.className='stack-title';
  old.innerHTML='<div class="stack-title-main">ZUNO STACK</div><div class="stack-title-sub">puzzle cooperativo · trios · Relay · eventos Pulse</div>';
 }
 if(document.getElementById('zunoStackMobileShellStyle'))return;
 const s=document.createElement('style');s.id='zunoStackMobileShellStyle';s.textContent=`
 #zunoStackApp .stack-title{min-width:0!important;display:grid!important;grid-template-rows:auto auto!important;align-content:center!important;justify-items:start!important;gap:3px!important;overflow:hidden!important}
 #zunoStackApp .stack-title-main{display:block!important;width:100%!important;font-size:22px!important;line-height:1!important;font-weight:950!important;letter-spacing:-.7px!important;white-space:nowrap!important;color:#fff!important;text-shadow:0 0 18px rgba(166,102,255,.26)!important}
 #zunoStackApp .stack-title-sub{display:block!important;width:100%!important;font-size:10px!important;line-height:1.18!important;font-weight:650!important;color:#999db1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
 @media(max-width:560px){
  #zunoStackApp{padding-top:8px!important}
  #zunoStackApp .top{min-height:48px!important;grid-template-columns:44px minmax(0,1fr)!important;gap:9px!important}
  #zunoStackApp .back{width:44px!important;height:44px!important;border-radius:14px!important}
  #zunoStackApp .stack-title-main{font-size:20px!important}
  #zunoStackApp .stack-title-sub{font-size:9px!important}
  #zunoStackApp .team{margin-top:8px!important}
  #zunoStackApp .hud{margin-top:7px!important}
  #zunoStackApp .shell{margin-top:8px!important}
  #zunoStackApp .mission{padding:10px 11px!important}
  #zunoStackApp .board-wrap{padding:8px!important}
  #zunoStackApp .board{aspect-ratio:1.08/1!important;min-height:0!important}
  #zunoStackApp .tray-area{padding-bottom:9px!important}
  #zunoStackApp .relay{margin-bottom:9px!important}
 }
 @media(max-width:390px){
  #zunoStackApp .stack-title-main{font-size:18px!important}
  #zunoStackApp .stack-title-sub{font-size:8px!important}
 }
 `;document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',boot,{passive:true});
})();