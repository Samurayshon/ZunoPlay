(()=>{
'use strict';
if(window.__ZUNO_PULSO_ROUTE_V327__)return;window.__ZUNO_PULSO_ROUTE_V327__=1;

function postIdFromCard(target){
  const core=target.closest?.('.zp-post[data-post]');
  if(core)return core.dataset.post||null;
  const discovery=target.closest?.('.zp304-card[data-zp-post]');
  return discovery?.dataset.zpPost||null;
}

function isPostControl(target){
  return !!target.closest?.('[data-like],[data-comments],[data-share],[data-follow],[data-menu],[data-hashtag],[data-comment-form],[data-reply],[data-comment-like],input,textarea,select,form,video,[contenteditable="true"]');
}

function routePostClick(e){
  const id=postIdFromCard(e.target);
  if(!id||isPostControl(e.target))return;
  const opener=window.ZunoPulsoInteractions?.openPost;
  if(typeof opener!=='function')return;
  e.preventDefault();
  e.stopImmediatePropagation();
  opener(id);
}

document.addEventListener('click',routePostClick,true);
})();
