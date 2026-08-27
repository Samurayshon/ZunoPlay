(()=> {
const URL='https://rliymfbbhqoejgfvsbuu.supabase.co';
const KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
const sb=window.supabase.createClient(URL,KEY);
const $=id=>document.getElementById(id);

const COLORS={
  skin:['#f7d2b6','#efbd98','#d99568','#b87550','#875239','#5d3728'],
  hair:['#15131b','#38251e','#70452f','#d5a23d','#e2e0e3','#743a91','#29446f','#9a3157'],
  eye:['#4b2e23','#3b82f6','#22c55e','#8b5cf6','#64748b','#ec4899','#14b8a6'],
  accent:['#9b5cff','#6366f1','#38bdf8','#22d3ee','#ec4899','#f43f5e','#f59e0b','#4ade80']
};
const DATA={
  body:[['male','Masculino'],['female','Feminino']],
  face:[['soft','Suave'],['sharp','Marcado'],['round','Redondo']],
  eyeStyle:[['anime','Anime'],['calm','Calmo'],['bold','Intenso']],
  hairStyle:[['spike','Espetado'],['short','Curto'],['wave','Ondulado'],['undercut','Undercut'],['long','Longo'],['layered','Camadas'],['bob','Chanel'],['pony','Rabo alto']],
  top:[['tee','Camiseta Z'],['hoodie','Hoodie Z'],['jacket','Jaqueta'],['tech','Techwear'],['crop','Cropped']],
  bottom:[['cargo','Cargo'],['jeans','Jeans'],['shorts','Short'],['skirt','Saia'],['techpants','Tech pants']],
  shoes:[['sneaker','Tênis'],['high','Cano alto'],['boot','Bota'],['runner','Runner']],
  headAccessory:[['none','Nenhum'],['cap','Boné'],['headphones','Fones'],['crown','Coroa']],
  faceAccessory:[['none','Nenhum'],['glasses','Óculos'],['visor','Visor'],['mask','Máscara']],
  neckAccessory:[['none','Nenhum'],['chain','Corrente'],['choker','Choker']],
  wristAccessory:[['none','Nenhum'],['watch','Relógio'],['bracelet','Pulseira']],
  backAccessory:[['none','Nenhum'],['backpack','Mochila'],['wings','Asas neon']],
  pet:[['none','Nenhum'],['bot','Zuno Bot'],['cat','Gato neon'],['orb','Orb']],
  aura:[['none','Sem aura'],['purple','Roxa'],['blue','Azul'],['pink','Rosa'],['green','Verde'],['gold','Dourada']]
};
const TABS=[['body','Corpo'],['face','Rosto'],['hair','Cabelo'],['clothes','Roupas'],['bottom','Calças'],['shoes','Sapatos'],['accessories','Acessórios'],['effects','Efeitos'],['pet','Mascote']];

let state={
  version:4,style:'zuno-anime-modular',
  body:'male',skin:COLORS.skin[1],face:'soft',
  eyeStyle:'anime',eyeColor:COLORS.eye[3],
  hairStyle:'spike',hairColor:COLORS.hair[0],
  top:'hoodie',bottom:'cargo',shoes:'sneaker',
  headAccessory:'none',faceAccessory:'none',neckAccessory:'none',
  wristAccessory:'none',backAccessory:'none',
  pet:'none',aura:'purple',accent:COLORS.accent[0]
};
let user=null,active='body';

function colorButtons(key,list){
  return `<div class="options colors">${list.map(v=>`<button class="opt color ${state[key]===v?'active':''}" data-key="${key}" data-value="${v}" aria-label="${v}"><i style="background:${v}"></i></button>`).join('')}</div>`;
}
function buttons(key,list){
  return `<div class="options">${list.map(([v,l])=>`<button class="opt ${state[key]===v?'active':''}" data-key="${key}" data-value="${v}">${l}</button>`).join('')}</div>`;
}
function group(title,html){return `<div class="group"><h3>${title}</h3>${html}</div>`;}
function panelContent(id){
  if(id==='body')return group('Base',buttons('body',DATA.body))+group('Tom de pele',colorButtons('skin',COLORS.skin));
  if(id==='face')return group('Formato do rosto',buttons('face',DATA.face))+group('Olhos',buttons('eyeStyle',DATA.eyeStyle))+group('Cor dos olhos',colorButtons('eyeColor',COLORS.eye));
  if(id==='hair')return group('Corte de cabelo',buttons('hairStyle',DATA.hairStyle))+group('Cor do cabelo',colorButtons('hairColor',COLORS.hair));
  if(id==='clothes')return group('Parte de cima',buttons('top',DATA.top))+group('Cor principal',colorButtons('accent',COLORS.accent));
  if(id==='bottom')return group('Parte de baixo',buttons('bottom',DATA.bottom));
  if(id==='shoes')return group('Calçados',buttons('shoes',DATA.shoes));
  if(id==='accessories')return group('Cabeça',buttons('headAccessory',DATA.headAccessory))+group('Rosto',buttons('faceAccessory',DATA.faceAccessory))+group('Pescoço',buttons('neckAccessory',DATA.neckAccessory))+group('Pulso',buttons('wristAccessory',DATA.wristAccessory))+group('Costas',buttons('backAccessory',DATA.backAccessory));
  if(id==='effects')return group('Aura',buttons('aura',DATA.aura))+group('Cor neon',colorButtons('accent',COLORS.accent));
  return group('Companheiro',buttons('pet',DATA.pet));
}
function mountUI(){
  $('tabs').innerHTML=TABS.map(([id,l])=>`<button class="tab ${active===id?'active':''}" data-tab="${id}">${l}</button>`).join('');
  $('panels').innerHTML=TABS.map(([id])=>`<div class="panel ${active===id?'active':''}" data-panel="${id}">${panelContent(id)}</div>`).join('');
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.tab;mountUI();});
  document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{
    state[b.dataset.key]=b.dataset.value;
    render();
    mountUI();
  });
}

function aura(){
  const m={purple:'#8b5cf6',blue:'#3b82f6',pink:'#ec4899',green:'#22c55e',gold:'#f59e0b'};
  if(state.aura==='none')return '';
  const c=m[state.aura]||state.accent;
  return `<ellipse cx="180" cy="505" rx="120" ry="34" fill="${c}" opacity=".25" filter="url(#blur)"/><ellipse cx="180" cy="500" rx="88" ry="18" fill="none" stroke="${c}" stroke-width="4" opacity=".8"/>`;
}
function back(){
  if(state.backAccessory==='backpack')return `<rect x="112" y="255" width="136" height="125" rx="35" fill="#202331" stroke="${state.accent}" stroke-width="5"/><path d="M126 272q-24 48-8 105M234 272q24 48 8 105" fill="none" stroke="#34384a" stroke-width="12"/>`;
  if(state.backAccessory==='wings')return `<path d="M135 277Q56 230 45 333q52-38 103-16M225 277q79-47 90 56-52-38-103-16" fill="none" stroke="${state.accent}" stroke-width="14" opacity=".75"/>`;
  return '';
}
function legs(){
  const b=state.bottom;
  if(b==='skirt')return `<path d="M137 346h86l25 79H112z" fill="#252837" stroke="#0b0c13" stroke-width="4"/><path d="M143 415l-7 77h32l12-77M217 415l7 77h-32l-12-77" fill="${state.skin}" stroke="#16141b" stroke-width="4"/>`;
  const col=b==='jeans'?'#334d70':b==='shorts'?'#343744':b==='techpants'?'#171b2c':'#252837';
  if(b==='shorts')return `<path d="M128 345h104l-4 78-45-5-3-42-3 42-45 5z" fill="${col}" stroke="#0b0c13" stroke-width="4"/><path d="M143 418l-7 75h32l12-75M217 418l7 75h-32l-12-75" fill="${state.skin}" stroke="#16141b" stroke-width="4"/>`;
  return `<path d="M130 344h100l8 149h-43l-15-96-15 96h-43z" fill="${col}" stroke="#0b0c13" stroke-width="4"/>${b==='cargo'?'<rect x="119" y="392" width="38" height="34" rx="7" fill="#303343"/><rect x="203" y="392" width="38" height="34" rx="7" fill="#303343"/>':''}`;
}
function shoes(){
  const c=state.shoes==='boot'?'#12131a':state.shoes==='runner'?state.accent:'#202331';
  const stroke=state.shoes==='high'?state.accent:'#090a0e';
  return `<path d="M117 480h52l8 48h-68q-8-18 8-48zM191 480h52q16 30 8 48h-68z" fill="${c}" stroke="${stroke}" stroke-width="5"/>${state.shoes==='sneaker'?'<path d="M112 510h61M187 510h61" stroke="#f8fafc" stroke-width="4"/>':''}`;
}
function torso(){
  const female=state.body==='female';
  const left=female?126:118;
  const right=female?234:242;
  const hem=state.top==='crop'?327:358;
  const col=state.top==='tee'?'#252837':state.top==='tech'?'#131827':state.top==='jacket'?'#1b1d27':state.top==='crop'?'#292336':'#1d1e2b';
  return `<path d="M${left} 228q${(right-left)/2} -26 ${right-left} 0l18 ${hem-228}q-38 24-${right-left+36} 0-18-${hem-228}z" fill="${col}" stroke="#0b0c13" stroke-width="5"/><path d="M147 263h66l-33 55z" fill="none" stroke="${state.accent}" stroke-width="7"/><path d="M126 244q-35 20-42 85l31 10 29-73M234 244q35 20 42 85l-31 10-29-73" fill="${col}" stroke="#0b0c13" stroke-width="5"/><circle cx="106" cy="335" r="16" fill="${state.skin}"/><circle cx="254" cy="335" r="16" fill="${state.skin}"/>`;
}
function hair(){
  const h=state.hairColor,s=state.hairStyle;
  if(s==='long')return `<path d="M120 115q18-74 60-74t62 74l-8 170-32-40-22 58-22-58-34 40z" fill="${h}" stroke="#16131c" stroke-width="5"/><path d="M125 115q17-65 55-65t57 65q-31-16-58 9-25-25-54-9" fill="${h}"/>`;
  if(s==='pony')return `<path d="M123 115q17-68 57-68t59 68l-11 116-25-34-22 54-24-54-29 34z" fill="${h}" stroke="#16131c" stroke-width="5"/><path d="M235 91q55 17 45 88t-48 105q15-87-16-142z" fill="${h}" stroke="#16131c" stroke-width="5"/>`;
  if(s==='bob')return `<path d="M120 112q18-66 60-66t62 66l-7 114-34-20-21 40-21-40-35 20z" fill="${h}" stroke="#16131c" stroke-width="5"/>`;
  if(s==='layered')return `<path d="M119 110q19-68 61-68t63 68l-13 151-29-29-22 43-22-43-30 29z" fill="${h}" stroke="#16131c" stroke-width="5"/>`;
  if(s==='undercut')return `<path d="M127 104q22-59 96-40l20 31q-58-10-101 42z" fill="${h}" stroke="#16131c" stroke-width="5"/>`;
  if(s==='wave')return `<path d="M122 111q15-69 61-66t59 67q-25-14-38 8-17-25-36-4-20-18-46-5z" fill="${h}" stroke="#16131c" stroke-width="5"/>`;
  if(s==='short')return `<path d="M124 111q18-65 58-63t59 62q-29-12-58 12-29-24-59-11z" fill="${h}" stroke="#16131c" stroke-width="5"/>`;
  return `<path d="M122 113q18-67 59-67t62 63l23-30-5 43 27-7-26 28-20-7-16 25-18-27-21 26-20-27-22 24-10-28-27 8 24-27-23-14 34-1z" fill="${h}" stroke="#16131c" stroke-width="5"/>`;
}
function faceParts(){
  const rx=state.face==='round'?52:state.face==='sharp'?47:50;
  const ry=state.face==='round'?57:63;
  const y=155;
  const eyes=state.eyeStyle==='calm'
    ? `<path d="M145 ${y}q13 9 26 0M189 ${y}q13 9 26 0" fill="none" stroke="#27222c" stroke-width="6"/>`
    : `<ellipse cx="158" cy="${y}" rx="13" ry="${state.eyeStyle==='bold'?15:17}" fill="#f6f4ff"/><ellipse cx="202" cy="${y}" rx="13" ry="${state.eyeStyle==='bold'?15:17}" fill="#f6f4ff"/><ellipse cx="158" cy="157" rx="7" ry="10" fill="${state.eyeColor}"/><ellipse cx="202" cy="157" rx="7" ry="10" fill="${state.eyeColor}"/><circle cx="160" cy="153" r="2.5" fill="#fff"/><circle cx="204" cy="153" r="2.5" fill="#fff"/>`;
  return `<ellipse cx="180" cy="158" rx="${rx}" ry="${ry}" fill="${state.skin}" stroke="#2a2028" stroke-width="4"/>${eyes}<path d="M167 188q13 9 26 0" fill="none" stroke="#a25e69" stroke-width="4" stroke-linecap="round"/>`;
}
function accessories(){
  let s='';
  if(state.neckAccessory==='chain')s+=`<path d="M154 216q26 28 52 0" fill="none" stroke="#f0c85b" stroke-width="5"/>`;
  if(state.neckAccessory==='choker')s+=`<path d="M154 215h52" stroke="#19131c" stroke-width="8"/>`;
  if(state.wristAccessory==='watch')s+=`<rect x="88" y="326" width="22" height="16" rx="4" fill="#111" stroke="${state.accent}" stroke-width="3"/>`;
  if(state.wristAccessory==='bracelet')s+=`<path d="M91 333h20" stroke="${state.accent}" stroke-width="6"/>`;
  if(state.faceAccessory==='glasses')s+=`<rect x="139" y="142" width="36" height="27" rx="9" fill="none" stroke="#171821" stroke-width="5"/><rect x="185" y="142" width="36" height="27" rx="9" fill="none" stroke="#171821" stroke-width="5"/><path d="M175 153h10" stroke="#171821" stroke-width="5"/>`;
  if(state.faceAccessory==='visor')s+=`<path d="M136 146q44-18 88 0l-7 29q-37 14-74 0z" fill="${state.accent}" opacity=".55" stroke="#d8f3ff" stroke-width="3"/>`;
  if(state.faceAccessory==='mask')s+=`<path d="M145 174q35 23 70 0v31q-35 21-70 0z" fill="#161821" stroke="${state.accent}" stroke-width="3"/>`;
  if(state.headAccessory==='cap')s+=`<path d="M126 104q17-42 55-42t57 42z" fill="${state.accent}" stroke="#14131a" stroke-width="5"/><path d="M178 105h76q-16 19-51 18z" fill="${state.accent}"/>`;
  if(state.headAccessory==='headphones')s+=`<path d="M126 133q5-78 54-78t55 78" fill="none" stroke="#20222e" stroke-width="12"/><rect x="116" y="132" width="22" height="52" rx="10" fill="${state.accent}"/><rect x="222" y="132" width="22" height="52" rx="10" fill="${state.accent}"/>`;
  if(state.headAccessory==='crown')s+=`<path d="M143 86l12-31 24 22 22-28 17 36 24-19-5 38h-91z" fill="#f6c94d" stroke="#9d6d12" stroke-width="4"/>`;
  return s;
}
function pet(){
  if(state.pet==='bot')return `<g transform="translate(260 335)"><circle cx="36" cy="35" r="30" fill="#202331" stroke="${state.accent}" stroke-width="5"/><rect x="19" y="25" width="34" height="21" rx="8" fill="#0a0c13"/><circle cx="29" cy="35" r="4" fill="#60f5ff"/><circle cx="43" cy="35" r="4" fill="#60f5ff"/><path d="M36 4v-15" stroke="${state.accent}" stroke-width="5"/><circle cx="36" cy="-14" r="5" fill="${state.accent}"/></g>`;
  if(state.pet==='cat')return `<g transform="translate(270 390)"><path d="M8 18l9-18 12 15 14-15 9 20v48H8z" fill="#27233a" stroke="${state.accent}" stroke-width="4"/><circle cx="24" cy="34" r="4" fill="#8b5cf6"/><circle cx="39" cy="34" r="4" fill="#8b5cf6"/><path d="M26 48q6 5 12 0" fill="none" stroke="#fff" stroke-width="3"/></g>`;
  if(state.pet==='orb')return `<circle cx="300" cy="370" r="28" fill="${state.accent}" opacity=".25" stroke="${state.accent}" stroke-width="5"/><circle cx="300" cy="370" r="9" fill="#fff"/>`;
  return '';
}
function svg(){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 560" data-zuno-avatar-version="4" data-zuno-style="zuno-anime-modular"><defs><filter id="blur"><feGaussianBlur stdDeviation="14"/></filter></defs>${aura()}${back()}${legs()}${shoes()}${torso()}${hair()}${faceParts()}${accessories()}${pet()}</svg>`;
}
function render(){
  const src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg());
  $('avatarPreview').src=src;
  return src;
}
function migrate(c){
  if(!c||typeof c!=='object')return;
  const map={hair:'hairColor',eyes:'eyeColor',outfit:'top'};
  Object.entries(c).forEach(([k,v])=>{
    const nk=map[k]||k;
    if(nk in state&&v!=null)state[nk]=v;
  });
  if(c.sex==='masculino')state.body='male';
  if(c.sex==='feminino')state.body='female';
  if(!DATA.hairStyle.some(x=>x[0]===state.hairStyle))state.hairStyle=state.body==='female'?'long':'spike';
}
async function boot(){
  const {data:{user:u},error}=await sb.auth.getUser();
  if(error||!u){location.href='login.html?next='+encodeURIComponent('avatar.html');return;}
  user=u;
  const {data}=await sb.from('profiles').select('avatar_config,sex').eq('id',u.id).maybeSingle();
  if(data?.avatar_config)migrate(data.avatar_config);
  else if(data?.sex==='feminino')state.body='female';
  mountUI();
  render();
}
$('save').onclick=async()=>{
  const btn=$('save'),msg=$('msg');
  btn.disabled=true;msg.className='msg';msg.textContent='Salvando...';
  try{
    const avatar_url=render();
    const avatar_config={...state,updatedAt:new Date().toISOString()};
    const sex=state.body==='female'?'feminino':'masculino';
    if(avatar_url.length>90000)throw new Error('Avatar excedeu o limite seguro.');
    const {error}=await sb.from('profiles').update({avatar_url,avatar_config,sex}).eq('id',user.id);
    if(error)throw error;
    window.dispatchEvent(new CustomEvent('zuno:avatar-saved',{detail:avatar_config}));
    msg.textContent='Personagem salvo! ✅';
  }catch(e){
    console.error(e);msg.className='msg err';msg.textContent='Não foi possível salvar: '+(e.message||'erro desconhecido');
  }finally{btn.disabled=false;}
};
boot();
})();