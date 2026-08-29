(()=>{
if(window.__ZUNO_STACK_COOP_OFFICIAL__)return;window.__ZUNO_STACK_COOP_OFFICIAL__=true;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let lastRelay='',lastTeam='';
function toast(msg){const e=$('#toast');if(!e)return;e.textContent=msg;e.classList.add('show');clearTimeout(e._co);e._co=setTimeout(()=>e.classList.remove('show'),1500)}
function teamSig(){return $$('.mate .mate-copy b').map(x=>x.textContent.trim()).join('|')}
function relaySig(){return $$('#relaySlots .relay-slot').map(x=>x.classList.contains('filled')?(x.textContent||'x').trim():'-').join('|')}
function syncTeam(){const sig=teamSig();if(sig===lastTeam)return;lastTeam=sig;const names=sig.split('|').filter(Boolean);const slots=$$('.zso-player');slots.forEach((s,i)=>{const name=names[i]|| (i?'Convidar':'Você');const letter=s.querySelector('i'),label=s.querySelector('b');if(letter)letter.textContent=name==='Convidar'?'+':name.slice(0,1).toUpperCase();if(label)label.textContent=name;s.classList.toggle('me',i===0)});if(names.length>1)document.body.classList.add('zso-coop');else document.body.classList.remove('zso-coop')}
function syncRelay(){const sig=relaySig();if(sig===lastRelay)return;const before=lastRelay;lastRelay=sig;if(before&&sig!==before&&document.body.classList.contains('zstack-playing')){const filled=$$('#relaySlots .relay-slot.filled').length;if(filled)toast('⚡ Relay atualizado pela equipe');document.querySelector('.relay')?.animate?.([{filter:'brightness(1)'},{filter:'brightness(1.7)'},{filter:'brightness(1)'}],{duration:420})}}
function bind(){const tray=$('#tray'),relay=$('#relaySlots');tray?.querySelectorAll('[data-tray]').forEach(b=>{if(b.dataset.zsoCoop)return;b.dataset.zsoCoop='1';b.addEventListener('click',()=>setTimeout(()=>{if($$('#relaySlots .relay-slot.filled').length)navigator.vibrate?.(12)},40))});relay?.querySelectorAll('[data-relay]').forEach(b=>{if(b.dataset.zsoCoop)return;b.dataset.zsoCoop='1';b.addEventListener('click',()=>setTimeout(()=>navigator.vibrate?.([12,18,18]),40))})}
function sync(){syncTeam();syncRelay();bind()}
function boot(){new MutationObserver(()=>requestAnimationFrame(sync)).observe(document.body,{subtree:true,childList:true});setInterval(sync,700);sync()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();