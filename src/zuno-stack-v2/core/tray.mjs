export const TRAY_CAPACITY=7;

export function appendTrayEntry(tray,entry){
  if(!Array.isArray(tray))throw new TypeError('tray must be an array');
  if(tray.length>=TRAY_CAPACITY)throw new RangeError('tray capacity exceeded');
  if(!entry||typeof entry!=='object'||typeof entry.tileId!=='string'||!entry.tileId||typeof entry.family!=='string'||!entry.family)throw new TypeError('tray entry is invalid');
  return[...tray,{tileId:entry.tileId,family:entry.family}];
}

export function resolveFirstTrio(tray){
  if(!Array.isArray(tray))throw new TypeError('tray must be an array');
  const byFamily=new Map();
  for(let index=0;index<tray.length;index+=1){
    const entry=tray[index];
    const indices=byFamily.get(entry.family)??[];
    indices.push(index);byFamily.set(entry.family,indices);
    if(indices.length===3){
      const selected=new Set(indices);
      return{tray:tray.filter((_,candidate)=>!selected.has(candidate)),resolved:{family:entry.family,tileIds:indices.map(candidate=>tray[candidate].tileId)}};
    }
  }
  return{tray:[...tray],resolved:null};
}
