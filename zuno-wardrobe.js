import * as THREE from 'https://esm.sh/three@0.180.0';
export const TOPS=[['none','Sem peça'],['camiseta','Camiseta'],['regata','Regata'],['cropped','Cropped'],['polo','Camisa polo'],['moletom','Moletom'],['jaqueta','Jaqueta'],['oversized','Camiseta oversized']];
export const BOTTOMS=[['none','Sem peça'],['shorts','Shorts'],['jeans','Calça jeans'],['cargo','Calça cargo'],['jogger','Calça jogger'],['saia','Saia'],['saia-longa','Saia longa']];
export const SHOES=[['none','Sem calçado'],['tenis','Tênis'],['cano-alto','Tênis cano alto'],['bota','Bota'],['social','Sapato social']];
export const COLORS=['#111827','#f8fafc','#6d28d9','#2563eb','#dc2626','#15803d','#f59e0b','#db2777'];
export const WARDROBE_MODE='catalog-only-v2';
const ASSET_ROOT='./assets/avatar/wardrobe/';
const FILES={camiseta:'tops/camiseta.glb',regata:'tops/regata.glb',cropped:'tops/cropped.glb',polo:'tops/polo.glb',moletom:'tops/moletom.glb',jaqueta:'tops/jaqueta.glb',oversized:'tops/oversized.glb',shorts:'bottoms/shorts.glb',jeans:'bottoms/jeans.glb',cargo:'bottoms/cargo.glb',jogger:'bottoms/jogger.glb',saia:'bottoms/saia.glb','saia-longa':'bottoms/saia-longa.glb',tenis:'shoes/tenis.glb','cano-alto':'shoes/cano-alto.glb',bota:'shoes/bota.glb',social:'shoes/social.glb'};
function clear(group){while(group?.children?.length){const o=group.children[0];group.remove(o);o.traverse?.(x=>{x.geometry?.dispose?.();const a=Array.isArray(x.material)?x.material:[x.material];a.forEach(m=>m?.dispose?.())})}}
export function getWardrobeAsset(type){return FILES[type]?ASSET_ROOT+FILES[type]:null}
export function buildWardrobe({group}){clear(group);return{rendered:false,mode:WARDROBE_MODE,reason:'A prévia geométrica foi removida. O catálogo agora aceita somente roupas 3D GLB próprias, rigadas ao avatar.'}}
window.ZunoWardrobe={TOPS,BOTTOMS,SHOES,COLORS,WARDROBE_MODE,getWardrobeAsset,buildWardrobe};