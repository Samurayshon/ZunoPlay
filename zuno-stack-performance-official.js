(()=>{
if(window.__ZUNO_STACK_PERFORMANCE_OFFICIAL__)return;window.__ZUNO_STACK_PERFORMANCE_OFFICIAL__=true;
const low=(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);
if(low)document.documentElement.classList.add('zso-lite');
const style=document.createElement('style');style.textContent=`.zso-lite .tile.active .zsp-art{box-shadow:inset 0 1px #ffffff66,0 4px 0 #070713!important}.zso-lite .board{box-shadow:inset 0 0 40px #7c39d512!important}.zso-lite .zso-powers button>span{box-shadow:0 0 8px #9d34ff44!important}.zso-paused *{animation-play-state:paused!important}`;document.head.appendChild(style);
document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('zso-paused',document.hidden));
})();