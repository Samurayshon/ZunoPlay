(()=>{
'use strict';
if(window.__ZUNO_LOADING_V1__)return;window.__ZUNO_LOADING_V1__=1;
const WORDS=/\b(carregando|atualizando|montando|sincronizando|salvando|aguarde|processando|conectando)\b/i;
const KNOWN='.zp-loading,.zn-loading,.zp304-loading,.zp325-loading,.zp326-loading,.loading,[data-zuno-loading],[aria-busy="true"]';
let scheduled=false;
function text(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim()}
function ignored(el){return !el||el.nodeType!==1||el.matches('script,style,svg,path,input,textarea,select,option,[data-zuno-loader-ignore]')||el.closest('[data-zuno-loader-ignore]')}
function isLoading(el){if(ignored(el))return false;if(el.matches('[data-zuno-loading],[aria-busy="true"]'))return true;const t=text(el);return !!t&&t.length<=180&&WORDS.test(t)}
function spinner(size='md'){const s=document.createElement('span');s.className='zuno-loader'+(size==='sm'?' zuno-loader--sm':size==='lg'?' zuno-loader--lg':'');s.setAttribute('aria-hidden','true');return s}
function existing(el){return el.querySelector(':scope > .zuno-loader,:scope > .loading-spinner')||((el.classList.contains('zp304-loading')&&el.firstElementChild?.matches('span:empty'))?el.firstElementChild:null)}
function clear(el){if(!el||el.dataset?.zunoLoadingEnhanced!=='1')return;const s=el.querySelector(':scope > .zuno-loader');if(s&&!s.classList.contains('loading-spinner')&&!el.classList.contains('zp304-loading'))s.remove();else if(s){s.classList.remove('zuno-loader','zuno-loader--sm','zuno-loader--lg')}el.classList.remove('zuno-loading-state','zuno-loading-inline');delete el.dataset.zunoLoadingEnhanced}
function enhance(el){if(!isLoading(el)){clear(el);return false}const inline=el.matches('button,a,label,small,span,[role="button"]')&&!el.matches('.loading,.zp304-loading,.zp325-loading,.zp326-loading');let s=existing(el);if(s){s.classList.add('zuno-loader');s.classList.toggle('zuno-loader--sm',inline)}else{s=spinner(inline?'sm':'md');el.prepend(s)}el.classList.toggle('zuno-loading-state',!inline);el.classList.toggle('zuno-loading-inline',inline);el.dataset.zunoLoadingEnhanced='1';if(!el.hasAttribute('role')&&!inline)el.setAttribute('role','status');if(!el.hasAttribute('aria-live')&&!inline)el.setAttribute('aria-live','polite');return true}
function candidates(root=document){const set=new Set();if(root?.nodeType===1){if(root.matches?.(KNOWN)||root.dataset?.zunoLoadingEnhanced==='1')set.add(root);root.querySelectorAll?.(KNOWN+', [data-zuno-loading-enhanced="1"]').forEach(x=>set.add(x));root.querySelectorAll?.('div,p,span,small,strong,button,label').forEach(x=>{const t=text(x);if(t&&t.length<=180&&WORDS.test(t))set.add(x)})}else document.querySelectorAll(KNOWN+', [data-zuno-loading-enhanced="1"],div,p,span,small,strong,button,label').forEach(x=>set.add(x));return set}
function scan(root=document){candidates(root).forEach(enhance)}
function schedule(root=document){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;scan(root)})}
function start(el,label){if(!el)return null;if(label!=null)el.textContent=String(label);el.setAttribute('data-zuno-loading','1');enhance(el);return el}
function stop(el){if(!el)return;el.removeAttribute('data-zuno-loading');el.removeAttribute('aria-busy');clear(el)}
function boot(){scan();new MutationObserver(records=>{for(const r of records){const target=r.type==='characterData'?r.target.parentElement:r.target;if(target)schedule(target);for(const n of r.addedNodes||[])if(n.nodeType===1)schedule(n)}}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-busy','data-zuno-loading']})}
window.ZunoLoading={enhance,scan,spinner,start,stop};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();