(()=>{
if(window.__ZUNO_STACK_STRATEGIC__)return;window.__ZUNO_STACK_STRATEGIC__=true;
const board=document.getElementById('board');if(!board)return;
document.body.classList.add('zuno-stack-strategic');
function sync(){
 const tiles=[...board.querySelectorAll('.tile')];
 for(const tile of tiles){
  const hidden=!tile.classList.contains('active')&&!tile.classList.contains('removed');
  tile.classList.toggle('zstack-covered',hidden);
  tile.setAttribute('aria-hidden',hidden?'true':'false');
 }
 const active=tiles.filter(t=>t.classList.contains('active')&&!t.classList.contains('removed')).length;
 board.dataset.openPieces=String(active);
}
const observer=new MutationObserver(()=>requestAnimationFrame(sync));
observer.observe(board,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
window.addEventListener('zuno-stack-start',sync);
requestAnimationFrame(sync);
})();