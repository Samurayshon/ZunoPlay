(()=>{
if(window.__ZUNO_STACK_LOBBY_V2__)return;window.__ZUNO_STACK_LOBBY_V2__=true;
const $=s=>document.querySelector(s);
let userStarted=false;
function sync(){const overlay=$('#overlay');const playing=userStarted&&!!overlay?.classList.contains('hide');document.body.classList.toggle('zstack-playing',playing);document.body.classList.toggle('zstack-lobby-v2',!playing)}
function forceLobby(){const overlay=$('#overlay');if(!overlay)return;overlay.classList.remove('hide');document.body.classList.remove('zstack-playing');document.body.classList.add('zstack-lobby-v2')}
function addRanking(){const box=$('#overlay .box');if(!box||$('#zstackRankingBtn'))return;const btn=document.createElement('button');btn.id='zstackRankingBtn';btn.type='button';btn.className='zstack-ranking-btn';btn.innerHTML='<span class="zrank-icon">♛</span><span><b>Ranking</b><small>Classificação Stack</small></span>';btn.addEventListener('click',()=>{const candidates=['ranking.html','game-ranking.html','leaderboard.html'];location.href=candidates[0]});box.appendChild(btn)}
function enhance(){const start=$('#start');if(start&&!start.dataset.v2){start.dataset.v2='1';const text=start.textContent.trim();start.innerHTML=`<span class="zsl-v2-cta">${text}</span>`}addRanking();sync()}
function boot(){forceLobby();enhance();const overlay=$('#overlay');if(!overlay)return;new MutationObserver(sync).observe(overlay,{attributes:true,attributeFilter:['class']});$('#start')?.addEventListener('click',()=>{userStarted=true;requestAnimationFrame(sync)},{capture:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();