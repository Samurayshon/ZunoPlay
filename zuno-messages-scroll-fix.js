(()=>{
'use strict';
if(window.__ZUNO_MESSAGES_SCROLL_FIX_V2__)return;window.__ZUNO_MESSAGES_SCROLL_FIX_V2__=true;
let currentConversation=null,box=null,observer=null,initialDone=false,wasNearBottom=true,loadingOlderSnapshot=null,forceBottomUntil=0,lastHeight=0,lastStableTop=0,restoring=false,mutationEpoch=0;
const cid=()=>new URLSearchParams(location.search).get('conversation');
const nearBottom=el=>!el||el.scrollHeight-el.scrollTop-el.clientHeight<120;
const afterLayout=fn=>requestAnimationFrame(()=>requestAnimationFrame(fn));
function setTop(top){if(!box)return;restoring=true;box.scrollTop=Math.max(0,Math.min(top,Math.max(0,box.scrollHeight-box.clientHeight)));lastStableTop=box.scrollTop;lastHeight=box.scrollHeight;wasNearBottom=nearBottom(box);requestAnimationFrame(()=>{restoring=false})}
function bottom(){if(!box)return;setTop(box.scrollHeight)}
function rememberScroll(){if(!box||restoring)return;lastStableTop=box.scrollTop;wasNearBottom=nearBottom(box);lastHeight=box.scrollHeight}
function installBox(next){
 if(box===next)return;
 observer?.disconnect();
 box=next;initialDone=false;wasNearBottom=true;loadingOlderSnapshot=null;lastHeight=box?.scrollHeight||0;lastStableTop=box?.scrollTop||0;mutationEpoch=0;
 if(!box)return;
 box.addEventListener('scroll',rememberScroll,{passive:true});
 observer=new MutationObserver(mutations=>{
   if(!box)return;
   const epoch=++mutationEpoch;
   const previousHeight=lastHeight;
   const desiredTop=lastStableTop;
   const shouldStickBottom=wasNearBottom;
   const hasMessageMutation=mutations.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&(n.matches?.('[data-message],.zm-bubble-wrap')||n.querySelector?.('[data-message],.zm-bubble-wrap'))));

   if(!initialDone&&box.querySelector('[data-message]')){
     initialDone=true;
     afterLayout(()=>{if(epoch===mutationEpoch)bottom()});
     return;
   }

   if(loadingOlderSnapshot){
     const snap=loadingOlderSnapshot;loadingOlderSnapshot=null;
     afterLayout(()=>{if(!box||epoch!==mutationEpoch)return;setTop(snap.top+(box.scrollHeight-snap.height))});
     return;
   }

   if(Date.now()<forceBottomUntil){
     afterLayout(()=>{if(epoch===mutationEpoch)bottom()});
     return;
   }

   if(hasMessageMutation&&shouldStickBottom){
     afterLayout(()=>{if(epoch===mutationEpoch)bottom()});
     return;
   }

   /* Core renderMessages() replaces innerHTML. That can reset scrollTop to 0
      even when scrollHeight is unchanged (receipts/reactions/edit/delete).
      Restore the exact stable viewport instead of deriving it from height. */
   afterLayout(()=>{
     if(!box||epoch!==mutationEpoch)return;
     const delta=box.scrollHeight-previousHeight;
     if(delta>0&&desiredTop>0&&box.scrollTop===0){setTop(desiredTop);return}
     setTop(desiredTop)
   });
 });
 observer.observe(box,{childList:true,subtree:true,characterData:true});
 if(box.querySelector('[data-message]')){initialDone=true;afterLayout(bottom)}
}
function tick(){
 const nextCid=cid();
 if(nextCid!==currentConversation){currentConversation=nextCid;initialDone=false;wasNearBottom=true;loadingOlderSnapshot=null;forceBottomUntil=0;lastStableTop=0}
 const nextBox=document.getElementById('zmMessages');
 if(nextCid&&nextBox)installBox(nextBox);else if(!nextCid&&box){observer?.disconnect();observer=null;box=null}
}
document.addEventListener('click',e=>{
 const older=e.target.closest?.('#zmLoadOlder');
 if(older&&box){loadingOlderSnapshot={height:box.scrollHeight,top:lastStableTop};return}
 const send=e.target.closest?.('#zmSend');
 if(send){forceBottomUntil=Date.now()+1800;afterLayout(bottom)}
},{capture:true});
document.addEventListener('submit',e=>{if(e.target?.id==='zmComposer'){forceBottomUntil=Date.now()+1800;afterLayout(bottom)}},{capture:true});
window.addEventListener('zuno:message-received',()=>{if(wasNearBottom)afterLayout(bottom)});
window.addEventListener('popstate',tick);
window.addEventListener('pageshow',tick);
window.addEventListener('focus',()=>{tick();if(currentConversation&&!initialDone&&box?.querySelector('[data-message]')){initialDone=true;afterLayout(bottom)}});
setInterval(tick,180);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
})();