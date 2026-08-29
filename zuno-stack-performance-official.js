(()=>{
if(window.__ZUNO_STACK_PERFORMANCE_OFFICIAL__)return;window.__ZUNO_STACK_PERFORMANCE_OFFICIAL__=true;
const low=(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);
if(low)document.documentElement.classList.add('zso-lite');
const style=document.createElement('style');style.textContent=`.zso-lite .tile.active .zsp-art{box-shadow:inset 0 1px #ffffff66,0 4px 0 #070713!important}.zso-lite .board{box-shadow:inset 0 0 40px #7c39d512!important}.zso-lite .zso-powers button>span{box-shadow:0 0 8px #9d34ff44!important}.zso-lite[data-zsr-pressure="critical"] .board{animation:none!important;box-shadow:inset 0 0 52px #8b315f22!important}.zso-paused *{animation-play-state:paused!important}`;document.head.appendChild(style);
function loadCss(href,key){if(document.querySelector(`link[data-${key}]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset[key]='1';document.head.appendChild(l)}
function loadJs(src,key){if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=src;s.defer=true;s.dataset[key]='1';document.head.appendChild(s)}
function loadOfficialModules(){
loadCss('zuno-stack-feel-official.css?v=af4cab7','zsoFeel');
loadJs('zuno-stack-feel-official.js?v=f64536e','zsoFeel');
loadCss('zuno-stack-powers-official.css?v=7b6fc17','zsoPowers');
loadJs('zuno-stack-powers-official.js?v=3d14b6d','zsoPowers');
loadCss('zuno-stack-orders-official.css?v=3d5bc85','zsoOrders');
loadJs('zuno-stack-orders-official.js?v=56818f3','zsoOrders');
loadCss('zuno-stack-coop-official.css?v=29e961e','zsoCoop');
loadJs('zuno-stack-coop-official.js?v=f076fcd','zsoCoop');
loadCss('zuno-stack-pressure-official.css?v=210688b','zsoPressure');
loadJs('zuno-stack-pressure-official.js?v=e0ec8f2','zsoPressure');
loadCss('zuno-stack-touchfix-official.css?v=0fc10af','zsoTouchfix');
}
loadOfficialModules();
document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('zso-paused',document.hidden));
})();