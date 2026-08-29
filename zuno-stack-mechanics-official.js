(()=>{
if(window.__ZUNO_STACK_MECHANICS_OFFICIAL__)return;window.__ZUNO_STACK_MECHANICS_OFFICIAL__=true;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function boot(){for(let i=0;i<120;i++){if(window.ZunoStackSystems){window.ZunoStackMechanics={version:4,getState:()=>window.ZunoStackSystems.getState(),applyState:v=>window.ZunoStackSystems.applyState(v),config:{pulseCap:5,comboWindow:4000}};document.dispatchEvent(new CustomEvent('zuno:stack-mechanics-ready'));return}await sleep(100)}}
boot();
})();