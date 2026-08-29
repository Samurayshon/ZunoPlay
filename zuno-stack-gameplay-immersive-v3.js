(()=>{
if(window.__ZUNO_STACK_IMMERSIVE_V3__)return;window.__ZUNO_STACK_IMMERSIVE_V3__=true;
const $=s=>document.querySelector(s);
let queued=false;
function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}
function sync(){queued=false;if(!document.body.classList.contains('zstack-playing'))return;const mission=$('.mission');if(!mission)return;const title=$('#missionTitle'),meter=$('#missionMeter'),tiles=parseInt($('#tilesLeft')?.textContent||'90',10)||90,matches=parseInt($('#matches')?.textContent||'0',10)||0,energy=($('#energyText')?.textContent||'0/5').trim();const removed=Math.max(0,90-tiles);const titleText=removed<45?`Libere ${45-removed} peças`:matches<8?`Forme ${8-matches} trios`:'Domine o Núcleo';const meterText=removed<45?`${removed}/45`:energy;setText(title,titleText);setText(meter,meterText);if(mission.dataset.compact!=='1')mission.dataset.compact='1'}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(sync)}
function boot(){['tilesLeft','matches','energyText'].forEach(id=>{const e=document.getElementById(id);if(e)new MutationObserver(schedule).observe(e,{childList:true,subtree:true,characterData:true})});new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();