(()=>{
let timer=0,start=Date.now();
const set=(el,name,value)=>el&&el.style.setProperty(name,value,'important');
function tick(){
  const scene=document.getElementById('zstackArenaScene');
  if(!scene||!document.body.classList.contains('zstack-lobby-v2'))return;
  const t=(Date.now()-start)/1000;
  const o1=scene.querySelector('.za-o1'),o2=scene.querySelector('.za-o2'),core=scene.querySelector('.za-core');
  set(o1,'transform',`translateX(-50%) rotateX(67deg) rotateZ(${(t*24)%360}deg)`);
  set(o2,'transform',`translateX(-50%) rotateX(67deg) rotateZ(${(-t*38)%360}deg) scale(${1+Math.sin(t*1.8)*.035})`);
  if(core){
    set(core,'transform',`translateX(-50%) translateY(${Math.sin(t*2.2)*-5}px) scale(${1+Math.sin(t*3.1)*.07})`);
    set(core,'filter',`brightness(${1.05+Math.max(0,Math.sin(t*3.1))*.32}) drop-shadow(0 0 ${9+Math.max(0,Math.sin(t*3.1))*13}px rgba(151,83,255,.72))`);
  }
  scene.querySelectorAll('.za-piece').forEach((el,i)=>{
    const phase=t*(1.3+i*.11)+i*1.7;
    const x=Math.cos(phase)*(5+i*1.2),y=Math.sin(phase*1.17)*(5+i*.8),r=Math.sin(phase*.72)*12;
    set(el,'transform',`translate(${x}px,${y}px) rotate(${r}deg) scale(${.92+.16*(.5+.5*Math.sin(phase*1.9))})`);
    set(el,'opacity',String(.56+.44*(.5+.5*Math.sin(phase*1.45))));
  });
  scene.querySelectorAll('.za-dot').forEach((el,i)=>{
    const phase=t*(1.9+i*.14)+i*2.3;
    const x=Math.cos(phase)*(7+i*2),y=Math.sin(phase)*(5+i*1.4);
    set(el,'transform',`translate(${x}px,${y}px) scale(${.7+.65*(.5+.5*Math.sin(phase*2.1))})`);
    set(el,'opacity',String(.35+.65*(.5+.5*Math.sin(phase*1.8))));
  });
}
function startMotion(){clearInterval(timer);start=Date.now();tick();timer=setInterval(tick,40)}
function boot(){startMotion();new MutationObserver(()=>tick()).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)startMotion()});
window.ZunoStackArenaMotion={start:startMotion,tick};
})();