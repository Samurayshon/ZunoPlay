import {createPrng} from '../core/index.mjs';

export const SOLO_FINAL_VERSION='solo-final-r2';
export const SOLO_FAMILIES=Object.freeze(['orbit','spark','tide','bloom','flare','prism','comet','echo','nova']);
export const SOLO_FAMILY_PRESENTATION=Object.freeze({
  orbit:Object.freeze({name:'Órbita',symbol:'◉',tone:'violet'}),
  spark:Object.freeze({name:'Faísca',symbol:'✦',tone:'gold'}),
  tide:Object.freeze({name:'Maré',symbol:'≈',tone:'cyan'}),
  bloom:Object.freeze({name:'Flora',symbol:'✿',tone:'green'}),
  flare:Object.freeze({name:'Chama',symbol:'◆',tone:'rose'}),
  prism:Object.freeze({name:'Prisma',symbol:'◇',tone:'blue'}),
  comet:Object.freeze({name:'Cometa',symbol:'➤',tone:'orange'}),
  echo:Object.freeze({name:'Eco',symbol:'◌',tone:'pink'}),
  nova:Object.freeze({name:'Nova',symbol:'✺',tone:'purple'})
});
export const SOLO_LAYER_COUNTS=Object.freeze([24,18,15,12,12,9,6,6,6]);
export const SOLO_LAYOUTS=Object.freeze([
  Object.freeze({id:'tower',name:'Torre',columns:6,rows:4}),
  Object.freeze({id:'pyramid',name:'Pirâmide',columns:6,rows:4}),
  Object.freeze({id:'cross',name:'Cruz',columns:8,rows:3}),
  Object.freeze({id:'rings',name:'Anéis',columns:5,rows:5}),
  Object.freeze({id:'twin',name:'Torres Gêmeas',columns:8,rows:3}),
  Object.freeze({id:'spiral',name:'Espiral',columns:5,rows:5}),
  Object.freeze({id:'core',name:'Núcleo',columns:6,rows:4}),
  Object.freeze({id:'bridge',name:'Ponte',columns:8,rows:3}),
  Object.freeze({id:'blocks',name:'Blocos',columns:5,rows:5}),
  Object.freeze({id:'maze',name:'Labirinto',columns:6,rows:4})
]);
export const SOLO_DIFFICULTIES=Object.freeze(['INICIAL','NORMAL','DIFICIL','MESTRE','CAOS']);
export const SOLO_POWERS=Object.freeze([
  Object.freeze({id:'undo',name:'Desfazer',symbol:'↶',unlock:0,charges:3}),
  Object.freeze({id:'hint',name:'Dica',symbol:'✦',unlock:0,charges:3}),
  Object.freeze({id:'rescue',name:'Resgate',symbol:'◇',unlock:0,charges:1}),
  Object.freeze({id:'shift',name:'Shift',symbol:'⇄',unlock:0,charges:2}),
  Object.freeze({id:'scanner',name:'Scanner',symbol:'⌁',unlock:2,charges:2}),
  Object.freeze({id:'swap',name:'Troca',symbol:'⇆',unlock:3,charges:2}),
  Object.freeze({id:'magnet',name:'Ímã',symbol:'∩',unlock:4,charges:1}),
  Object.freeze({id:'cleanse',name:'Limpeza',symbol:'✧',unlock:5,charges:1}),
  Object.freeze({id:'freeze',name:'Congelar',symbol:'❄',unlock:6,charges:1})
]);

export function difficultyForProgress(progress=0){return SOLO_DIFFICULTIES[Math.min(SOLO_DIFFICULTIES.length-1,Math.max(0,Math.floor(Number(progress)||0)))];}
export function unlockedPowers(progress=0){return SOLO_POWERS.filter(power=>progress>=power.unlock);}
export function choosePowerKit(seed,progress=0){const unlocked=unlockedPowers(progress),prng=createPrng(`${seed}|power-kit`);return Object.freeze(prng.shuffle(unlocked).slice(0,Math.min(4,unlocked.length)).map(power=>power.id));}
export function chooseLayout(seed,recent=[]){const blocked=new Set((recent??[]).slice(-2)),candidates=SOLO_LAYOUTS.filter(layout=>!blocked.has(layout.id)),pool=candidates.length?candidates:SOLO_LAYOUTS;return pool[createPrng(`${seed}|layout`).nextInt(pool.length)];}
export function createFinalBoardConfig(layout){return Object.freeze({layerCounts:SOLO_LAYER_COUNTS,columns:layout.columns,rows:layout.rows,families:SOLO_FAMILIES});}
export function assertFinalBoardContract(board){if(board.tiles.length!==108)throw new Error('Final Solo board must contain 108 tiles');if(board.layerCount!==9)throw new Error('Final Solo board must contain 9 layers');const counts=new Map(SOLO_FAMILIES.map(f=>[f,0]));for(const tile of board.tiles)counts.set(tile.family,(counts.get(tile.family)??0)+1);for(const family of SOLO_FAMILIES)if(counts.get(family)!==12)throw new Error(`Final Solo family ${family} must contain 12 tiles`);return true;}
