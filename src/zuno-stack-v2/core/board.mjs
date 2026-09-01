import { createBoardState, createTile } from './contracts.mjs';
import { createPrng } from './prng.mjs';

const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const finiteInteger=(value)=>Number.isSafeInteger(value);

export function validateBoardConfig(config={}){
  if(!config||typeof config!=='object'||Array.isArray(config))throw new TypeError('board config must be an object');
  const width=config.width??6,height=config.height??6,layers=config.layers??1;
  if(!finiteInteger(width)||width<1)throw new TypeError('board.width must be a positive safe integer');
  if(!finiteInteger(height)||height<1)throw new TypeError('board.height must be a positive safe integer');
  if(!finiteInteger(layers)||layers<1)throw new TypeError('board.layers must be a positive safe integer');
  const families=config.families??['a','b','c'];
  if(!Array.isArray(families)||families.length===0||families.some(value=>typeof value!=='string'||!value.trim()))throw new TypeError('board.families must contain non-empty strings');
  const positions=config.positions??null;
  if(positions!==null&&!Array.isArray(positions))throw new TypeError('board.positions must be null or an array');
  return{width,height,layers,families:[...families],positions};
}

function normalizePosition(position,index,config){
  if(!position||typeof position!=='object'||Array.isArray(position))throw new TypeError(`board.positions[${index}] must be an object`);
  const {x,y,layer}=position;
  if(!finiteInteger(x)||x<0||x>=config.width)throw new TypeError(`board.positions[${index}].x is invalid`);
  if(!finiteInteger(y)||y<0||y>=config.height)throw new TypeError(`board.positions[${index}].y is invalid`);
  if(!finiteInteger(layer)||layer<0||layer>=config.layers)throw new TypeError(`board.positions[${index}].layer is invalid`);
  return{x,y,layer};
}

function defaultPositions(config){
  const positions=[];
  for(let layer=0;layer<config.layers;layer+=1)for(let y=0;y<config.height;y+=1)for(let x=0;x<config.width;x+=1)positions.push({x,y,layer});
  return positions;
}

export function generateBoard({seed=0,config={},validators=[]}={}){
  const normalized=validateBoardConfig(config);
  if(!Array.isArray(validators)||validators.some(fn=>typeof fn!=='function'))throw new TypeError('board validators must be functions');
  const positions=(normalized.positions??defaultPositions(normalized)).map((position,index)=>normalizePosition(position,index,normalized));
  const occupied=new Set();
  for(const position of positions){const key=`${position.x}:${position.y}:${position.layer}`;if(occupied.has(key))throw new TypeError(`duplicate logical board position: ${key}`);occupied.add(key)}
  const rng=createPrng(seed);
  const tiles=positions.map((position,index)=>createTile({id:`t${index}`,family:normalized.families[rng.nextInt(normalized.families.length)],position:{x:position.x,y:position.y},layer:position.layer,removed:false}));
  const board=createBoardState({tiles,meta:{width:normalized.width,height:normalized.height,layers:normalized.layers}});
  validateBoardState(board);
  for(const validator of validators)if(validator(board)!==true)throw new TypeError('generated board rejected by validator');
  return board;
}

export function validateBoardState(board){
  if(!board||typeof board!=='object'||Array.isArray(board)||!Array.isArray(board.tiles))throw new TypeError('board must contain tiles');
  const meta=board.meta;
  if(!meta||typeof meta!=='object'||Array.isArray(meta))throw new TypeError('board.meta must be an object');
  const width=meta.width,height=meta.height,layers=meta.layers;
  if(!finiteInteger(width)||width<1||!finiteInteger(height)||height<1||!finiteInteger(layers)||layers<1)throw new TypeError('board metadata dimensions are invalid');
  const ids=new Set(),occupied=new Set();
  for(const [index,tile] of board.tiles.entries()){
    if(!tile||typeof tile!=='object'||Array.isArray(tile))throw new TypeError(`board.tiles[${index}] is invalid`);
    if(typeof tile.id!=='string'||!tile.id.trim())throw new TypeError(`board.tiles[${index}].id is invalid`);
    if(ids.has(tile.id))throw new TypeError(`duplicate tile id: ${tile.id}`);ids.add(tile.id);
    if(typeof tile.family!=='string'||!tile.family.trim())throw new TypeError(`tile ${tile.id} family is invalid`);
    if(!tile.position||!finiteInteger(tile.position.x)||!finiteInteger(tile.position.y))throw new TypeError(`tile ${tile.id} position is invalid`);
    if(tile.position.x<0||tile.position.x>=width||tile.position.y<0||tile.position.y>=height)throw new TypeError(`tile ${tile.id} position is outside board`);
    if(!finiteInteger(tile.layer)||tile.layer<0||tile.layer>=layers)throw new TypeError(`tile ${tile.id} layer is invalid`);
    if(typeof tile.removed!=='boolean')throw new TypeError(`tile ${tile.id} removed flag is invalid`);
    const key=`${tile.position.x}:${tile.position.y}:${tile.layer}`;if(occupied.has(key))throw new TypeError(`duplicate logical board position: ${key}`);occupied.add(key);
  }
  for(const tile of board.tiles)if(own(tile,'blockers')){
    if(!Array.isArray(tile.blockers))throw new TypeError(`tile ${tile.id} blockers must be an array`);
    for(const blockerId of tile.blockers)if(!ids.has(blockerId))throw new TypeError(`tile ${tile.id} references missing blocker ${blockerId}`);
  }
  return true;
}

export function getTile(board,tileId){return board.tiles.find(tile=>tile.id===tileId)??null}
export function isTileBlocked(board,tileId){
  const tile=getTile(board,tileId);if(!tile||tile.removed)return true;
  if(Array.isArray(tile.blockers)&&tile.blockers.some(id=>{const blocker=getTile(board,id);return blocker&&!blocker.removed}))return true;
  return board.tiles.some(candidate=>!candidate.removed&&candidate.layer>tile.layer&&candidate.position.x===tile.position.x&&candidate.position.y===tile.position.y);
}
export function canPickTile(board,tileId){validateBoardState(board);const tile=getTile(board,tileId);return Boolean(tile&&!tile.removed&&!isTileBlocked(board,tileId))}
export function listAvailableTileIds(board){validateBoardState(board);return board.tiles.filter(tile=>!tile.removed&&!isTileBlocked(board,tile.id)).map(tile=>tile.id)}
