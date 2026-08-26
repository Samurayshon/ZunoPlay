(() => {
    if (window.__ZUNOPLAY_NAV_READY__) return;
    window.__ZUNOPLAY_NAV_READY__ = true;
    const homeUrl = new URL('./index.html', window.location.href).href;
    const goHome = () => { window.location.href = homeUrl; };
    const style = document.createElement('style');
    style.textContent = `.zunoplay-home-button{appearance:none!important;-webkit-appearance:none!important;width:42px!important;height:42px!important;border:1px solid #303145!important;background:#1b1c2b!important;color:#fff!important;font:inherit!important;padding:0!important;margin:0!important;border-radius:12px!important;cursor:pointer!important;pointer-events:auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;position:relative!important;z-index:10000!important;text-decoration:none!important;line-height:1!important;font-size:20px!important}.zunoplay-home-button:active{transform:scale(.97)}.zunoplay-plain-logo{cursor:default!important;pointer-events:none!important;border:0!important;background:transparent!important;padding:0!important;margin:0!important;text-decoration:none!important}.zunoplay-plain-logo span{color:#8b5cf6!important}`;
    document.head.appendChild(style);
    function makeHomeButton(){const b=document.createElement('button');b.type='button';b.className='zunoplay-home-button';b.title='Voltar para a tela inicial';b.setAttribute('aria-label','Voltar para a tela inicial');b.textContent='⌂';b.addEventListener('click',goHome);return b;}
    function makePlainLogo(text){const d=document.createElement('div');d.className='zunoplay-plain-logo';d.innerHTML=text||'Zuno<span>Play</span>';return d;}
    document.querySelectorAll('.header-logo, .logo-main').forEach(logo=>{if(logo.dataset.zunoplayPlain==='1')return;logo.dataset.zunoplayPlain='1';logo.replaceWith(makePlainLogo(logo.innerHTML));});
    document.querySelectorAll('.logo').forEach(logo=>{if(logo.classList.contains('zunoplay-plain-logo'))return;if(logo.querySelector('.zunoplay-home-button'))return;logo.classList.add('zunoplay-plain-logo');});
    document.querySelectorAll('.header, .chat-header').forEach(header=>{
        const existing=[...header.querySelectorAll('.zunoplay-home-button, .home-button')];
        existing.slice(1).forEach(button=>button.remove());
        if(!header.querySelector('.zunoplay-home-button')){
            const legacy=header.querySelector('.home-button');
            if(legacy){legacy.className='zunoplay-home-button';legacy.type='button';legacy.title='Voltar para a tela inicial';legacy.setAttribute('aria-label','Voltar para a tela inicial');legacy.textContent='⌂';legacy.onclick=goHome;}
            else header.insertBefore(makeHomeButton(),header.firstChild);
        }
    });
})();