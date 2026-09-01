function hashString(input){let hash=2166136261>>>0;for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619)>>>0}return hash>>>0}

export function normalizeSeed(seed){
  if(typeof seed==='number'){if(!Number.isFinite(seed))throw new TypeError('seed must be finite');return (Math.trunc(seed)>>>0)||0x6d2b79f5}
  if(typeof seed==='string'){if(seed.length===0)throw new TypeError('seed string must not be empty');return hashString(seed)||0x6d2b79f5}
  throw new TypeError('seed must be a finite number or non-empty string');
}

export function createPrng(seed){
  let state=normalizeSeed(seed)>>>0;
  const nextUint32=()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return (t^(t>>>14))>>>0};
  const nextFloat=()=>nextUint32()/4294967296;
  const nextInt=maxExclusive=>{if(!Number.isSafeInteger(maxExclusive)||maxExclusive<=0)throw new TypeError('maxExclusive must be a positive safe integer');return Math.floor(nextFloat()*maxExclusive)};
  const pick=values=>{if(!Array.isArray(values)||values.length===0)throw new TypeError('pick requires a non-empty array');return values[nextInt(values.length)]};
  const shuffle=values=>{if(!Array.isArray(values))throw new TypeError('shuffle requires an array');const copy=[...values];for(let i=copy.length-1;i>0;i--){const j=nextInt(i+1);[copy[i],copy[j]]=[copy[j],copy[i]]}return copy};
  return{nextUint32,nextFloat,nextInt,pick,shuffle,getState:()=>state>>>0};
}
