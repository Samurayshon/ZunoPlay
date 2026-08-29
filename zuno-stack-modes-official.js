(()=>{
if(window.__ZUNO_STACK_MODES_OFFICIAL__)return;window.__ZUNO_STACK_MODES_OFFICIAL__=true;
const q=new URLSearchParams(location.search);const mode=(q.get('stackmode')||sessionStorage.getItem('zuno_stack_mode')||'classic').toLowerCase();window.ZunoStackOfficialMode={mode,available:['classic','coop','rush','daily'],set(next){if(!this.available.includes(next))return false;sessionStorage.setItem('zuno_stack_mode',next);return true}};document.documentElement.dataset.zsoMode=mode;
})();