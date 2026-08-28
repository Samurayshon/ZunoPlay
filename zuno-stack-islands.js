(()=>{
if(window.__ZUNO_STACK_ISLANDS__)return;window.__ZUNO_STACK_ISLANDS__=true;
const board=document.getElementById('board');if(!board)return;
document.body.classList.add('zuno-stack-islands');
const layout=[
 [4,11],[17,11],[31,18],[43,18],[55,18],[67,18],[80,11],[93,11],
 [4,28],[17,28],[31,35],[43,35],[55,35],[67,35],[80,28],[93,28],
 [4,45],[17,45],[31,52],[43,52],[55,52],[67,52],[80,45],[93,45],
 [4,62],[17,62],[31,69],[43,69],[55,69],[67,69],[80,62],[93,62],
 [17,79],[37,80],[57,80],[80,79]
];
function posIndex(x,y){return y*6+x}
function sync(){
 const tiles=[...board.querySelectorAll('.tile')];
 for(const tile of tiles){
  const x=Number(tile.style.getPropertyValue('--x'))||0;
  const y=Number(tile.style.getPropertyValue('--y'))||0;
  const p=layout[posIndex(x,y)]||[8+x*15,8+y*14];
  tile.style.setProperty('--island-x',p[0]);
  tile.style.setProperty('--island-y',p[1]);
  tile.dataset.zone=x<2?'left':x>3?'right':'core';
 }
 board.dataset.layout='islands';
}
const observer=new MutationObserver(()=>requestAnimationFrame(sync));
observer.observe(board,{childList:true,subtree:true});
requestAnimationFrame(sync);
})();