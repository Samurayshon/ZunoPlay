(()=>{
  if(window.__ZUNO_NAVIGATION_POLICY_V1__)return;
  window.__ZUNO_NAVIGATION_POLICY_V1__=true;

  const MODES=Object.freeze({GLOBAL:'global',CONTEXTUAL:'contextual',IMMERSIVE:'immersive',PUBLIC:'public'});
  const HEADERS=Object.freeze({GLOBAL:'global',CONTEXTUAL:'contextual',FEATURE:'feature',BRAND:'brand',LEGAL:'legal'});
  const ACTIVE=Object.freeze({HOME:'home',ROOMS:'rooms',CENTRAL:'central',PULSE:'pulse',PROFILE:'profile'});
  const fixed=target=>Object.freeze({strategy:'fixed',target});
  const origin=fallback=>Object.freeze({strategy:'origin-with-fallback',fallback});
  const feature=target=>Object.freeze({strategy:'feature',target});
  const state=(mode,header,active=null,parent=null,back=null)=>Object.freeze({mode,header,bottomNav:mode===MODES.GLOBAL,active,parent,back});

  const ROUTES=Object.freeze({
    'index.html':Object.freeze({
      member:state(MODES.GLOBAL,HEADERS.GLOBAL,ACTIVE.HOME),
      guest:state(MODES.PUBLIC,HEADERS.BRAND)
    }),
    'salas.html':state(MODES.GLOBAL,HEADERS.GLOBAL,ACTIVE.ROOMS),
    'pulso.html':state(MODES.GLOBAL,HEADERS.GLOBAL,ACTIVE.PULSE),
    'amigos.html':state(MODES.GLOBAL,HEADERS.GLOBAL,ACTIVE.CENTRAL),
    'comunidades.html':state(MODES.GLOBAL,HEADERS.GLOBAL,ACTIVE.CENTRAL),
    'notificacoes.html':state(MODES.GLOBAL,HEADERS.GLOBAL,ACTIVE.CENTRAL),
    'jogos.html':state(MODES.GLOBAL,HEADERS.GLOBAL,ACTIVE.CENTRAL),
    'conversas.html':Object.freeze({
      inbox:state(MODES.GLOBAL,HEADERS.GLOBAL,ACTIVE.CENTRAL),
      thread:state(MODES.CONTEXTUAL,HEADERS.CONTEXTUAL,null,ACTIVE.CENTRAL,fixed('conversas.html'))
    }),
    'perfil.html':Object.freeze({
      own:state(MODES.GLOBAL,HEADERS.GLOBAL,ACTIVE.PROFILE),
      other:state(MODES.CONTEXTUAL,HEADERS.CONTEXTUAL,null,ACTIVE.PROFILE,origin('amigos.html')),
      settings:state(MODES.CONTEXTUAL,HEADERS.CONTEXTUAL,null,ACTIVE.PROFILE,fixed('perfil.html'))
    }),
    'avatar.html':state(MODES.CONTEXTUAL,HEADERS.CONTEXTUAL,null,ACTIVE.PROFILE,fixed('perfil.html')),
    'meu-xp.html':state(MODES.CONTEXTUAL,HEADERS.CONTEXTUAL,null,ACTIVE.PROFILE,fixed('perfil.html')),
    'historico.html':state(MODES.CONTEXTUAL,HEADERS.CONTEXTUAL,null,ACTIVE.CENTRAL,fixed('jogos.html')),
    'sala.html':state(MODES.IMMERSIVE,HEADERS.FEATURE,null,ACTIVE.ROOMS,feature('salas.html')),
    'zuno-stack.html':state(MODES.IMMERSIVE,HEADERS.FEATURE,null,ACTIVE.CENTRAL,feature('jogos.html')),
    'entrada.html':state(MODES.PUBLIC,HEADERS.BRAND),
    'login.html':state(MODES.PUBLIC,HEADERS.BRAND),
    'cadastro.html':state(MODES.PUBLIC,HEADERS.BRAND),
    'termos.html':state(MODES.PUBLIC,HEADERS.LEGAL,null,null,origin('entrada.html')),
    'privacidade.html':state(MODES.PUBLIC,HEADERS.LEGAL,null,null,origin('entrada.html'))
  });

  const KNOWN_PAGES=Object.freeze(Object.keys(ROUTES).sort());
  const normalizePage=value=>String(value||'index.html').split('/').pop().toLowerCase()||'index.html';
  const paramsFrom=value=>value instanceof URLSearchParams?value:new URLSearchParams(String(value||'').replace(/^\?/,''));

  function inferredView(page,params,authState,currentUserId){
    if(page==='index.html')return authState==='member'?'member':'guest';
    if(page==='conversas.html')return params.get('conversation')||params.get('user')?'thread':'inbox';
    if(page==='perfil.html'){
      if(params.has('settings')||params.get('view')==='settings')return 'settings';
      const targetUserId=params.get('user');
      return targetUserId&&targetUserId!==currentUserId?'other':'own';
    }
    return 'default';
  }

  function routeState(page,view){
    const route=ROUTES[page];
    if(!route)return null;
    if(route.mode)return route;
    return route[view]||null;
  }

  function resolve(input={}){
    const browserPage=typeof location!=='undefined'?location.pathname:'index.html';
    const browserSearch=typeof location!=='undefined'?location.search:'';
    const browserAuth=typeof document!=='undefined'?document.documentElement?.dataset?.zunoAuthState:'';
    const page=normalizePage(input.page||browserPage);
    const params=paramsFrom(input.search===undefined?browserSearch:input.search);
    const authState=input.authState||browserAuth||'guest';
    const view=input.view||inferredView(page,params,authState,input.currentUserId||'');
    const selected=routeState(page,view);
    const fallback=state(MODES.CONTEXTUAL,HEADERS.CONTEXTUAL,null,null,fixed('index.html'));
    const spec=selected||fallback;
    const roomId=params.get('room');
    const back=page==='zuno-stack.html'&&params.get('from')==='sala'&&roomId
      ?feature(`sala.html?room=${encodeURIComponent(roomId)}`)
      :spec.back;
    return Object.freeze({
      version:'1',known:Boolean(selected),page,view,
      mode:spec.mode,header:spec.header,bottomNav:spec.bottomNav,
      active:spec.active,parent:spec.parent,back
    });
  }

  function apply(input={}){
    const current=resolve(input);
    if(typeof document==='undefined')return current;
    const root=document.documentElement;
    root.dataset.zunoNavigationMode=current.mode;
    root.dataset.zunoNavigationHeader=current.header;
    root.dataset.zunoNavigationView=current.view;
    root.dataset.zunoNavigationKnown=String(current.known);
    if(current.active)root.dataset.zunoNavigationActive=current.active;else delete root.dataset.zunoNavigationActive;
    if(typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('zuno:navigation-policy-ready',{detail:current}));
    return current;
  }

  window.ZunoNavigationPolicy=Object.freeze({version:'1',modes:MODES,headers:HEADERS,active:ACTIVE,knownPages:KNOWN_PAGES,resolve,apply});
  if(typeof document!=='undefined'){
    apply();
    if(typeof MutationObserver==='function')new MutationObserver(records=>{if(records.some(record=>record.attributeName==='data-zuno-auth-state'))apply()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-zuno-auth-state']});
  }
})();
