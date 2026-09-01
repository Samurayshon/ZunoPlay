const plainObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;

function assertString(value,name){if(typeof value!=='string'||!value.trim())throw new TypeError(`${name} must be a non-empty string`);return value}
function assertInteger(value,name,{min=Number.MIN_SAFE_INTEGER}={}){if(!Number.isSafeInteger(value)||value<min)throw new TypeError(`${name} must be a safe integer >= ${min}`);return value}
function assertPositiveFinite(value,name){if(!Number.isFinite(value)||value<=0)throw new TypeError(`${name} must be a positive finite number`);return value}

/** @typedef {{x:number,y:number}} TilePosition */
/** @typedef {{width:number,height:number}} TileFootprint */
/** @typedef {{id:string,family:string,position:TilePosition,layer:number,removed:boolean,footprint:TileFootprint,meta:Record<string,unknown>}} Tile */
/** @typedef {{tiles:Tile[],layerCount:number,blockersByTile:Record<string,string[]>,meta:Record<string,unknown>}} BoardState */
/** @typedef {{playerId:string,board:BoardState,tray:string[],score:number,combo:Record<string,unknown>,pulse:Record<string,unknown>,powers:Record<string,unknown>,resources:Record<string,unknown>,status:string}} PlayerState */
/** @typedef {{schemaVersion:number,matchId:string|null,mode:string,seed:number|string,status:string,rulesetVersion:string,players:PlayerState[],shared:Record<string,unknown>,startedAtLogical:number|null,finishedAtLogical:number|null}} GameState */
/** @typedef {{type:string,actorId:string,payload:Record<string,unknown>}} Command */
/** @typedef {{type:string,payload:Record<string,unknown>}} DomainEvent */
/** @typedef {{accepted:boolean,state:GameState,events:DomainEvent[],rejection:null|{code:string,details:unknown}}} TransitionResult */
/** @typedef {{modeId:string,playerSlots:number,transitions:Record<string,(state:GameState,command:Command,context:RulesContext)=>TransitionResult>}} ModeRules */
/** @typedef {{rules:ModeRules,logicalNow:number|null,config:Record<string,unknown>}} RulesContext */

export function createTile({id,family,position={x:0,y:0},layer=0,removed=false,footprint={width:1,height:1},meta={}}={}){
  assertString(id,'tile.id');assertString(family,'tile.family');assertInteger(layer,'tile.layer',{min:0});
  if(!plainObject(position)||!Number.isFinite(position.x)||!Number.isFinite(position.y))throw new TypeError('tile.position must contain finite x/y coordinates');
  if(!plainObject(footprint))throw new TypeError('tile.footprint must be a plain object');
  assertPositiveFinite(footprint.width,'tile.footprint.width');assertPositiveFinite(footprint.height,'tile.footprint.height');
  if(!plainObject(meta))throw new TypeError('tile.meta must be a plain object');
  return{id,family,position:{x:position.x,y:position.y},layer,removed:Boolean(removed),footprint:{width:footprint.width,height:footprint.height},meta:{...meta}};
}

export function createBoardState({tiles=[],layerCount=null,blockersByTile={},meta={}}={}){
  if(!Array.isArray(tiles))throw new TypeError('board.tiles must be an array');
  const inferred=tiles.length===0?0:Math.max(...tiles.map(tile=>Number.isSafeInteger(tile?.layer)?tile.layer:-1))+1;
  const resolvedLayerCount=layerCount===null?inferred:layerCount;
  assertInteger(resolvedLayerCount,'board.layerCount',{min:0});
  if(!plainObject(blockersByTile))throw new TypeError('board.blockersByTile must be a plain object');
  const blockers={};
  for(const [tileId,refs] of Object.entries(blockersByTile)){
    assertString(tileId,'board.blockersByTile key');
    if(!Array.isArray(refs))throw new TypeError(`board.blockersByTile.${tileId} must be an array`);
    blockers[tileId]=refs.map((ref,index)=>assertString(ref,`board.blockersByTile.${tileId}[${index}]`));
  }
  if(!plainObject(meta))throw new TypeError('board.meta must be a plain object');
  const board={tiles:[...tiles],layerCount:resolvedLayerCount,blockersByTile:blockers,meta:{...meta}};
  assertSerializableValue(board,'BoardState');return board;
}

export function createPlayerState({playerId,board=createBoardState(),tray=[],score=0,combo={},pulse={},powers={},resources={},status='ready'}={}){
  assertString(playerId,'player.playerId');
  if(!Array.isArray(tray))throw new TypeError('player.tray must be an array');
  if(!Number.isFinite(score))throw new TypeError('player.score must be finite');
  for(const [name,value] of Object.entries({combo,pulse,powers,resources}))if(!plainObject(value))throw new TypeError(`player.${name} must be a plain object`);
  assertString(status,'player.status');
  return{playerId,board,tray:[...tray],score,combo:{...combo},pulse:{...pulse},powers:{...powers},resources:{...resources},status};
}

export function createGameState({schemaVersion=1,matchId=null,mode='unassigned',seed=0,status='created',rulesetVersion='v2-core-1',players=[],shared={},startedAtLogical=null,finishedAtLogical=null}={}){
  assertInteger(schemaVersion,'game.schemaVersion',{min:1});assertString(mode,'game.mode');assertString(status,'game.status');assertString(rulesetVersion,'game.rulesetVersion');
  if(matchId!==null)assertString(matchId,'game.matchId');
  if(typeof seed!=='string'&&!Number.isFinite(seed))throw new TypeError('game.seed must be a finite number or string');
  if(!Array.isArray(players))throw new TypeError('game.players must be an array');
  if(!plainObject(shared))throw new TypeError('game.shared must be a plain object');
  for(const [name,value] of Object.entries({startedAtLogical,finishedAtLogical}))if(value!==null&&!Number.isFinite(value))throw new TypeError(`game.${name} must be null or finite`);
  const state={schemaVersion,matchId,mode,seed,status,rulesetVersion,players:[...players],shared:{...shared},startedAtLogical,finishedAtLogical};
  assertSerializableValue(state,'GameState');return state;
}

export function createCommand({type,actorId,payload={}}={}){
  assertString(type,'command.type');assertString(actorId,'command.actorId');if(!plainObject(payload))throw new TypeError('command.payload must be a plain object');
  const command={type,actorId,payload:{...payload}};assertSerializableValue(command,'Command');return command;
}

export function createDomainEvent(type,payload={}){
  assertString(type,'event.type');if(!plainObject(payload))throw new TypeError('event.payload must be a plain object');
  const event={type,payload:{...payload}};assertSerializableValue(event,'DomainEvent');return event;
}

export function createModeRules({modeId,playerSlots,transitions={}}={}){
  assertString(modeId,'rules.modeId');assertInteger(playerSlots,'rules.playerSlots',{min:1});if(!plainObject(transitions))throw new TypeError('rules.transitions must be a plain object');
  for(const handler of Object.values(transitions))if(typeof handler!=='function')throw new TypeError('every rules transition must be a function');
  return{modeId,playerSlots,transitions:{...transitions}};
}

export function createRulesContext({rules,logicalNow=null,config={}}={}){
  if(!rules||typeof rules!=='object')throw new TypeError('context.rules is required');
  if(logicalNow!==null&&!Number.isFinite(logicalNow))throw new TypeError('context.logicalNow must be null or finite');
  if(!plainObject(config))throw new TypeError('context.config must be a plain object');
  return{rules,logicalNow,config:{...config}};
}

export function acceptedTransition(state,events=[]){
  if(!Array.isArray(events))throw new TypeError('events must be an array');assertSerializableValue(state,'TransitionResult.state');assertSerializableValue(events,'TransitionResult.events');
  return{accepted:true,state,events:[...events],rejection:null};
}

export function rejectedTransition(state,code,details=null){
  assertString(code,'rejection.code');assertSerializableValue(state,'TransitionResult.state');assertSerializableValue(details,'TransitionResult.rejection.details');
  return{accepted:false,state,events:[],rejection:{code,details}};
}

export function assertSerializableValue(value,label='value'){
  const seen=new Set();
  const walk=(node,path)=>{
    if(node===null||typeof node==='string'||typeof node==='boolean')return;
    if(typeof node==='number'){if(!Number.isFinite(node))throw new TypeError(`${path} contains a non-finite number`);return}
    if(typeof node==='undefined'||typeof node==='function'||typeof node==='symbol'||typeof node==='bigint')throw new TypeError(`${path} contains a non-serializable value`);
    if(typeof node!=='object')throw new TypeError(`${path} contains an unsupported value`);
    if(seen.has(node))throw new TypeError(`${path} contains a cycle`);seen.add(node);
    if(Array.isArray(node)){node.forEach((item,index)=>walk(item,`${path}[${index}]`));seen.delete(node);return}
    if(!plainObject(node))throw new TypeError(`${path} must contain only plain objects and arrays`);
    for(const [key,item] of Object.entries(node))walk(item,`${path}.${key}`);seen.delete(node);
  };
  walk(value,label);return true;
}
