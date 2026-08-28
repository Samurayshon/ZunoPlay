(()=>{
  if(window.__ZUNO_ROOM_VOICE_HEADLESS_V1__)return;
  window.__ZUNO_ROOM_VOICE_HEADLESS_V1__=true;

  function makeHeadless(root){
    if(!root||root.dataset.zunoHeadlessVoice==='1')return;
    root.dataset.zunoHeadlessVoice='1';
    root.setAttribute('aria-hidden','true');
    root.style.setProperty('position','fixed','important');
    root.style.setProperty('left','-10000px','important');
    root.style.setProperty('top','-10000px','important');
    root.style.setProperty('width','1px','important');
    root.style.setProperty('height','1px','important');
    root.style.setProperty('min-width','0','important');
    root.style.setProperty('min-height','0','important');
    root.style.setProperty('max-width','1px','important');
    root.style.setProperty('max-height','1px','important');
    root.style.setProperty('margin','0','important');
    root.style.setProperty('padding','0','important');
    root.style.setProperty('border','0','important');
    root.style.setProperty('overflow','hidden','important');
    root.style.setProperty('opacity','0','important');
    root.style.setProperty('pointer-events','none','important');
    root.style.setProperty('z-index','-1','important');
  }

  function sweep(){
    document.querySelectorAll('#zunoVoiceControls,.zuno-voice').forEach(makeHeadless);
  }

  function init(){
    sweep();
    const observer=new MutationObserver(records=>{
      let needed=false;
      for(const record of records){
        for(const node of record.addedNodes){
          if(node.nodeType!==1)continue;
          if(node.matches?.('#zunoVoiceControls,.zuno-voice'))makeHeadless(node);
          node.querySelectorAll?.('#zunoVoiceControls,.zuno-voice').forEach(makeHeadless);
          needed=true;
        }
      }
      if(needed)requestAnimationFrame(sweep);
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();