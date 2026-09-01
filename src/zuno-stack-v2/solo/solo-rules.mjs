import {
  TRAY_CAPACITY,
  createCoreTransitions,
  createModeRules,
  createPowerCatalog,
  createPrng,
  createRulesContext,
  createValidatedBoardState,
  generateBoard,
  getAvailableTileIds
} from '../core/index.mjs';

export const SOLO_MODE='solo';
export const SOLO_RULESET_VERSION='solo-complete-r1';
export const SOLO_STATUS=Object.freeze({CREATED:'CREATED',PLAYING:'PLAYING',WON:'WON',LOST:'LOST'});
export const SOLO_COMMAND=Object.freeze({UNDO:'SOLO_UNDO',HINT:'SOLO_HINT',RESCUE:'SOLO_RESCUE'});
export const SOLO_POWER=Object.freeze({SHIFT:'shift'});

export const DEFAULT_SOLO_BOARD=Object.freeze({
  layerCounts:Object.freeze([24,15,9,6]),
  columns:6,
  rows:4,
  families:Object.freeze(['ember','nova','wave','leaf','volt','moon'])
});

export const DEFAULT_SOLO_RESOURCES=Object.freeze({undo:3,hint:3,rescue:1,powerShift:2});

export function createSoloBoard(config=DEFAULT_SOLO_BOARD,seed='solo-seed'){
  const base=generateBoard(config,seed);
  const families=[...config.families];
  if(base.tiles.length%families.length!==0)throw new RangeError('Solo board tile count must be divisible by family count');
  const perFamily=base.tiles.length/families.length;
  if(perFamily%3!==0)throw new RangeError('Solo board must provide complete trios per family');
  const bag=[];
  for(const family of families)for(let i=0;i<perFamily;i++)bag.push(family);
  const shuffled=createPrng(`${seed}|solo-families`).shuffle(bag);
  const tiles=base.tiles.map((tile,index)=>({...tile,family:shuffled[index]}));
  return createValidatedBoardState({tiles,layerCount:base.layerCount,meta:{...base.meta,mode:'solo',balancedFamilies:true}});
}

function restoreNewestTrayTile(player){
  if(!player.tray.length)return null;
  const tileId=player.tray[player.tray.length-1];
  const found=player.board.tiles.some(tile=>tile.id===tileId&&tile.removed);
  if(!found)return null;
  return {
    ...player,
    board:{...player.board,tiles:player.board.tiles.map(tile=>tile.id===tileId?{...tile,removed:false}:tile)},
    tray:player.tray.slice(0,-1)
  };
}

export function createSoloRules(){
  const powerCatalog=createPowerCatalog([{
    id:SOLO_POWER.SHIFT,
    modes:[SOLO_MODE],
    cost:3,
    charges:2,
    precondition:({player})=>(player.resources?.powerShift??0)>0&&player.tray.length>0,
    apply:({player})=>{
      const restored=restoreNewestTrayTile(player);
      if(!restored)return null;
      return {player:{...restored,resources:{...restored.resources,powerShift:restored.resources.powerShift-1}},events:[{type:'SOLO_POWER_SHIFTED',payload:{restoredTileId:player.tray[player.tray.length-1]}}]};
    }
  }]);
  const rules=createModeRules({modeId:SOLO_MODE,playerSlots:1,transitions:createCoreTransitions(),powerCatalog});
  rules.progression={scorePerTrio:100,comboStep:1,comboResetOnPickWithoutTrio:false,pulsePerTrio:1,pulseMax:10,pulseUseCost:1};
  return rules;
}

export function createSoloRulesContext(){return createRulesContext({rules:createSoloRules(),config:{trayCapacity:TRAY_CAPACITY,resources:{...DEFAULT_SOLO_RESOURCES}}});}

export function evaluateSoloStatus(state){
  const player=state.players[0];
  if(!player)return SOLO_STATUS.LOST;
  const remaining=player.board.tiles.filter(tile=>!tile.removed).length;
  if(remaining===0&&player.tray.length===0)return SOLO_STATUS.WON;
  if(player.tray.length>=TRAY_CAPACITY)return SOLO_STATUS.LOST;
  if(remaining>0&&getAvailableTileIds(player.board).length===0)return SOLO_STATUS.LOST;
  return SOLO_STATUS.PLAYING;
}

export function chooseSoloHint(state){
  const player=state.players[0];
  if(!player)return null;
  const available=new Set(getAvailableTileIds(player.board));
  const trayFamilies=new Map();
  for(const tileId of player.tray){const tile=player.board.tiles.find(candidate=>candidate.id===tileId);if(tile)trayFamilies.set(tile.family,(trayFamilies.get(tile.family)??0)+1)}
  const candidates=player.board.tiles.filter(tile=>!tile.removed&&available.has(tile.id));
  candidates.sort((a,b)=>(trayFamilies.get(b.family)??0)-(trayFamilies.get(a.family)??0)||b.layer-a.layer||a.id.localeCompare(b.id));
  return candidates[0]?.id??null;
}

export function rescueSoloPlayer(player){return restoreNewestTrayTile(player);}
