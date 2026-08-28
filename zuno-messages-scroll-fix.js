(()=>{
'use strict';
if(window.__ZUNO_MESSAGES_SCROLL_FIX__)return;window.__ZUNO_MESSAGES_SCROLL_FIX__=true;
let currentConversation=null,box=null,observer=null,initialDone=false,wasNearBottom=true,loadingOlderSnapshot=null,forceBottomUntil=0,lastHeight=0;
const cid=()=>new URLSearchParams(location.search).get('conversation');
const nearBottom=el=>!el||el.scrollHeight-el.scrollTop-el.clientHeight<120;
const bottom=()=>{if(!box)return;box.scrollTop=box.scrollHeight;wasNearBottom=true;lastHeight=box.scrollHeight};
const afterLayout=fn=>requestAnimationFrame(()=>requestAnimationFrame(fn));
function rememberScroll(){if(!box)return;wasNearBottom=nearBottom(box);lastHeight=box.scrollHeight}
function installBox(next){if(box===next)return;observer?.disconnect();box=next;initialDone=false;wasNearBottom=true;loadingOlderSnapshot=null;lastHeight=box?.scrollHeight||0;if(!box)return;
 box.addEventListener('scroll',rememberScroll,{passive:true});
 observer=new MutationObserver(mutations=>{
   if(!box)return;
   const previousHeight=lastHeight;
   const currentHeight=box.scrollHeight;
   const hasMessageMutation=mutations.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&(n.matches?.('[data-message],.zm-bubble-wrap')||n.querySelector?.('[data-message],.zm-bubble-wrap'))));
   if(!initialDone&&box.querySelector('[data-message]')){
     initialDone=true;afterLayout(bottom);return;
   }
   if(loadingOlderSnapshot){
     const snap=loadingOlderSnapshot;loadingOlderSnapshot=null;afterLayout(()=>{if(!box)return;box.scrollTop=snap.top+(box.scrollHeight-snap.height);wasNearBottom=false;lastHeight=box.scrollHeight});return;
   }
   if(Date.now()<forceBottomUntil){afterLayout(bottom);return}
   if(hasMessageMutation&&wasNearBottom){afterLayout(bottom);return}
   if(currentHeight!==previousHeight&&!wasNearBottom){lastHeight=currentHeight;return}
   lastHeight=currentHeight;
 });
 observer.observe(box,{childList:true,subtree:true,characterData:true});
 if(box.querySelector('[data-message]')){initialDone=true;afterLayout(bottom)}
}
function tick(){const nextCid=cid();if(nextCid!==currentConversation){currentConversation=nextCid;initialDone=false;wasNearBottom=true;loadingOlderSnapshot=null;forceBottomUntil=0}
 const nextBox=document.getElementById('zmMessages');if(nextCid&&nextBox)installBox(nextBox);else if(!nextCid&&box){observer?.disconnect();observer=null;box=null}
}
document.addEventListener('click',e=>{
 const older=e.target.closest?.('#zmLoadOlder');if(older&&box){loadingOlderSnapshot={height:box.scrollHeight,top:box.scrollTop};return}
 const send=e.target.closest?.('#zmSend');if(send){forceBottomUntil=Date.now()+1800;afterLayout(bottom)}
},{capture:true});
document.addEventListener('submit',e=>{if(e.target?.id==='zmComposer'){forceBottomUntil=Date.now()+1800;afterLayout(bottom)}},{capture:true});
window.addEventListener('zuno:message-received',()=>{if(wasNearBottom)afterLayout(bottom)});
window.addEventListener('popstate',tick);
window.addEventListener('pageshow',tick);
window.addEventListener('focus',()=>{tick();if(currentConversation&&!initialDone&&box?.querySelector('[data-message]')){initialDone=true;afterLayout(bottom)}});
setInterval(tick,180);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
})();