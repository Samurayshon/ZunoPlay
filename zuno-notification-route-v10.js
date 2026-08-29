(()=>{
'use strict';
if(window.__ZUNO_NOTIFICATION_ROUTE_V10__)return;window.__ZUNO_NOTIFICATION_ROUTE_V10__=1;

const POST_TYPES=new Set(['pulso_like','pulso_comment','pulso_reply','pulso_comment_like']);

function install(){
  const api=window.ZunoNotifications;
  if(!api?.open||api.__zunoCanonicalRouteV10)return false;
  const original=api.open.bind(api);
  api.open=async notification=>{
    if(notification&&POST_TYPES.has(notification.type)&&notification.related_id){
      return original({...notification,action_url:`pulso.html?post=${encodeURIComponent(notification.related_id)}`});
    }
    return original(notification);
  };
  api.__zunoCanonicalRouteV10=true;
  return true;
}

if(!install()){
  let tries=0;
  const timer=setInterval(()=>{if(install()||++tries>50)clearInterval(timer)},60);
}
})();
