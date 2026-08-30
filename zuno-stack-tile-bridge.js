(()=>{
if(window.__ZUNO_STACK_TILE_BRIDGE__)return;window.__ZUNO_STACK_TILE_BRIDGE__=true;
let busy=false;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function authority(){for(let i=0;i<80;i++){if(window.ZunoStackAuthority)return window.ZunoStackAuthority;await wait(100)}return null}
async function handleTile(tileId){
  if(busy)return;
  const core=window.ZunoStackCore,state=core?.getState?.();
  if(!core?.isActive?.()||!state)return;
  busy=true;
  try{
    const auth=await authority();
    if(!auth)return;
    let server=auth.getState?.()||{};
    if(Number(server.revision)<1){await auth.reconcile?.('tile_bridge_revision');server=auth.getState?.()||{}}
    const local=core.getState?.();
    if(local?.active){
      const started=await auth.commit?.('start',local);
      if(started===false)await auth.reconcile?.('tile_bridge_start_reconcile');
    }
    await auth.applyTile?.(tileId);
  }finally{busy=false}
}
document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target.closest('[data-tile]'):null;
  if(!target||!window.ZunoStackCore?.isActive?.())return;
  event.preventDefault();event.stopImmediatePropagation();
  handleTile(target.getAttribute('data-tile')).catch(()=>{});
},true);
})();