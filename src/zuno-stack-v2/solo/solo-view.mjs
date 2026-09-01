import {getAvailableTileIds} from '../core/index.mjs';
export function projectSoloView(state,events=[]){
  const player=state.players[0];
  const available=new Set(getAvailableTileIds(player.board));
  return Object.freeze({
    status:state.status,
    score:player.score,
    combo:player.combo.count,
    pulse:player.pulse.value,
    tray:[...player.tray],
    tiles:player.board.tiles.filter(t=>!t.removed).map(t=>({id:t.id,family:t.family,x:t.position.x,y:t.position.y,layer:t.layer,available:available.has(t.id)})),
    events:events.map(event=>({...event}))
  });
}
