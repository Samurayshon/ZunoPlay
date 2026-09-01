import{assertSerializableValue,createBoardState,createTile}from'./contracts.mjs';
import{createPrng}from'./prng.mjs';

const plainObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const sameSet=(left,right)=>left.length===right.length&&left.every(value=>right.includes(value));

function assertPositiveSafeInteger(value,name){if(!Number.isSafeInteger(value)||value<=0)throw new TypeError(`${name} must be a positive safe integer`);return value}
function assertNonNegativeSafeInteger(value,name){if(!Number.isSafeInteger(value)||value<0)throw new TypeError(`${name} must be a non-negative safe integer`);return value}
function assertFamilyList(families){if(!Array.isArray(families)||families.length===0)throw new TypeError('board config families must be a non-empty array');const seen=new Set();for(const [index,family]of families.entries()){if(typeof family!=='string'||!family.trim())throw new TypeError(`board config families[${index}] must be a non-empty string`);if(seen.has(family))throw new TypeError(`board config families contains duplicate family: ${family}`);seen.add(family)}return[...families]}
function rectanglesOverlap(a,b){return a.position.x<b.position.x+b.footprint.width&&a.position.x+a.footprint.width>b.position.x&&a.position.y<b.position.y+b.footprint.height&&a.position.y+a.footprint.height>b.position.y}
function normalizeFootprint(footprint={width:1,height:1}){if(!plainObject(footprint))throw new TypeError('board config footprint must be a plain object');if(!Number.isFinite(footprint.width)||footprint.width<=0)throw new TypeError('board config footprint.width must be positive and finite');if(!Number.isFinite(footprint.height)||footprint.height<=0)throw new TypeError('board config footprint.height must be positive and finite');return{width:footprint.width,height:footprint.height}}

export function normalizeBoardConfig({layerCounts,columns,rows,families,footprint={width:1,height:1}}={}){
  if(!Array.isArray(layerCounts)||layerCounts.length===0)throw new TypeError('board config layerCounts must be a non-empty array');
  const normalizedCounts=layerCounts.map((count,index)=>assertNonNegativeSafeInteger(count,`board config layerCounts[${index}]`));
  if(normalizedCounts.every(count=>count===0))throw new TypeError('board config must contain at least one tile');
  const normalizedColumns=assertPositiveSafeInteger(columns,'board config columns'),normalizedRows=assertPositiveSafeInteger(rows,'board config rows');
  const capacity=normalizedColumns*normalizedRows;if(!Number.isSafeInteger(capacity))throw new TypeError('board config capacity exceeds safe integer range');
  for(const [index,count]of normalizedCounts.entries())if(count>capacity)throw new RangeError(`board config layerCounts[${index}] exceeds logical layer capacity`);
  return{layerCounts:normalizedCounts,columns:normalizedColumns,rows:normalizedRows,families:assertFamilyList(families),footprint:normalizeFootprint(footprint)};
}

export function buildBlockersByTile(tiles){
  if(!Array.isArray(tiles))throw new TypeError('tiles must be an array');const blockers={};for(const tile of tiles)blockers[tile.id]=[];
  for(let targetIndex=0;targetIndex<tiles.length;targetIndex++){const target=tiles[targetIndex];for(let blockerIndex=0;blockerIndex<tiles.length;blockerIndex++){const blocker=tiles[blockerIndex];if(blocker.layer<=target.layer)continue;if(rectanglesOverlap(blocker,target))blockers[target.id].push(blocker.id)}}
  return blockers;
}

export function validateBoardState(board){
  if(!plainObject(board))throw new TypeError('BoardState must be a plain object');if(!Array.isArray(board.tiles))throw new TypeError('BoardState.tiles must be an array');assertNonNegativeSafeInteger(board.layerCount,'BoardState.layerCount');if(board.tiles.length>0&&board.layerCount===0)throw new RangeError('BoardState with tiles must have at least one layer');if(!plainObject(board.blockersByTile))throw new TypeError('BoardState.blockersByTile must be a plain object');if(!plainObject(board.meta))throw new TypeError('BoardState.meta must be a plain object');
  const byId=new Map(),anchors=new Set();
  for(const [index,tile]of board.tiles.entries()){
    if(!plainObject(tile))throw new TypeError(`BoardState.tiles[${index}] must be a plain object`);if(typeof tile.id!=='string'||!tile.id.trim())throw new TypeError(`BoardState.tiles[${index}].id must be a non-empty string`);if(byId.has(tile.id))throw new Error(`duplicate tile id: ${tile.id}`);if(typeof tile.family!=='string'||!tile.family.trim())throw new TypeError(`tile ${tile.id} family must be a non-empty string`);if(!plainObject(tile.position)||!Number.isFinite(tile.position.x)||!Number.isFinite(tile.position.y))throw new TypeError(`tile ${tile.id} position must contain finite x/y coordinates`);assertNonNegativeSafeInteger(tile.layer,`tile ${tile.id} layer`);if(tile.layer>=board.layerCount)throw new RangeError(`tile ${tile.id} layer exceeds BoardState.layerCount`);if(typeof tile.removed!=='boolean')throw new TypeError(`tile ${tile.id} removed must be boolean`);if(!plainObject(tile.footprint)||!Number.isFinite(tile.footprint.width)||tile.footprint.width<=0||!Number.isFinite(tile.footprint.height)||tile.footprint.height<=0)throw new TypeError(`tile ${tile.id} footprint must be positive and finite`);if(!plainObject(tile.meta))throw new TypeError(`tile ${tile.id} meta must be a plain object`);
    const anchor=`${tile.layer}:${tile.position.x}:${tile.position.y}`;if(anchors.has(anchor))throw new Error(`duplicate logical position in layer ${tile.layer}: ${tile.position.x},${tile.position.y}`);anchors.add(anchor);byId.set(tile.id,tile);
  }
  const blockerKeys=Object.keys(board.blockersByTile);if(blockerKeys.length!==board.tiles.length)throw new Error('BoardState.blockersByTile must contain exactly one entry per tile');for(const key of blockerKeys)if(!byId.has(key))throw new Error(`blocker map references unknown tile key: ${key}`);
  const expected=buildBlockersByTile(board.tiles);
  for(const tile of board.tiles){const refs=board.blockersByTile[tile.id];if(!Array.isArray(refs))throw new TypeError(`blocker map for ${tile.id} must be an array`);const unique=new Set(refs);if(unique.size!==refs.length)throw new Error(`blocker map for ${tile.id} contains duplicate references`);for(const ref of refs){const blocker=byId.get(ref);if(!blocker)throw new Error(`blocker map for ${tile.id} references unknown tile: ${ref}`);if(blocker.id===tile.id)throw new Error(`tile ${tile.id} cannot block itself`);if(blocker.layer<=tile.layer)throw new Error(`blocker ${ref} must be above tile ${tile.id}`);if(!rectanglesOverlap(blocker,tile))throw new Error(`blocker ${ref} does not logically overlap tile ${tile.id}`)}if(!sameSet(refs,expected[tile.id]))throw new Error(`blocker map for ${tile.id} is inconsistent with logical geometry`)}
  assertSerializableValue(board,'BoardState');return true;
}

export function createValidatedBoardState({tiles,layerCount,meta={}}={}){if(!Array.isArray(tiles))throw new TypeError('tiles must be an array');const board=createBoardState({tiles,layerCount,blockersByTile:buildBlockersByTile(tiles),meta});validateBoardState(board);return board}
export function canPickTile(board,tileId){if(!board||!Array.isArray(board.tiles)||typeof tileId!=='string'||!tileId)return false;const tile=board.tiles.find(candidate=>candidate.id===tileId);if(!tile||tile.removed)return false;const refs=board.blockersByTile?.[tileId];if(!Array.isArray(refs))return false;if(refs.length===0)return true;const removedById=new Map(board.tiles.map(candidate=>[candidate.id,candidate.removed]));return refs.every(ref=>removedById.get(ref)===true)}
export function getAvailableTileIds(board){if(!board||!Array.isArray(board.tiles))return[];return board.tiles.filter(tile=>canPickTile(board,tile.id)).map(tile=>tile.id)}

export function generateBoard(config,seed){
  const normalized=normalizeBoardConfig(config),prng=createPrng(seed),slots=Array.from({length:normalized.columns*normalized.rows},(_,index)=>index),tiles=[];
  for(let layer=0;layer<normalized.layerCounts.length;layer++){const selected=prng.shuffle(slots).slice(0,normalized.layerCounts[layer]);for(let ordinal=0;ordinal<selected.length;ordinal++){const slot=selected[ordinal];tiles.push(createTile({id:`tile-${layer}-${ordinal}`,family:normalized.families[prng.nextInt(normalized.families.length)],position:{x:slot%normalized.columns,y:Math.floor(slot/normalized.columns)},layer,footprint:normalized.footprint}))}}
  return createValidatedBoardState({tiles,layerCount:normalized.layerCounts.length,meta:{columns:normalized.columns,rows:normalized.rows,generator:'v2-board-1'}});
}

export function runBoardValidators(board,validators=[]){validateBoardState(board);if(!Array.isArray(validators))throw new TypeError('validators must be an array');for(const [index,validator]of validators.entries()){if(typeof validator!=='function')throw new TypeError(`validators[${index}] must be a function`);if(validator(board)!==true)throw new Error(`board validator ${index} rejected generated board`)}return true}
