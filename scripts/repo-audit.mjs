import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const textExt=new Set(['.html','.js','.mjs','.css','.json','.md','.yml','.yaml','.xml','.txt']);
const runtimeExt=new Set(['.html','.js','.mjs','.css','.svg','.webp','.png','.json','.txt']);
const ignoreDirs=new Set(['.git','node_modules']);
const canonicalRoots=new Set([
  'index.html','entrada.html','login.html','cadastro.html','perfil.html','avatar.html','amigos.html',
  'conversas.html','notificacoes.html','comunidades.html','salas.html','sala.html','jogos.html',
  'historico.html','momentos.html','zuno-stack.html','manifest.json','sw.js','nav.js',
  'icon-192.png','icon-512.png','zuno-app-icon.svg'
]);

function walk(dir, rel=''){
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignoreDirs.has(ent.name)) continue;
    const r=path.posix.join(rel,ent.name);
    const abs=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...walk(abs,r));
    else out.push(r);
  }
  return out;
}

const files=walk(root);
const fileSet=new Set(files);
const runtimeInbound=new Map(files.map(f=>[f,new Set()]));
const allInbound=new Map(files.map(f=>[f,new Set()]));
const broken=[];
const duplicatePageRefs=[];
const versionedRefs=[];

function norm(from, raw){
  let value=raw.trim();
  if(!value || /^(?:https?:|data:|mailto:|javascript:|#)/i.test(value)) return null;
  value=value.split('#',1)[0].split('?',1)[0];
  if(!value || value.includes('${') || value.includes('`')) return null;
  if(value.startsWith('/')) value=value.slice(1);
  else value=path.posix.normalize(path.posix.join(path.posix.dirname(from),value));
  while(value.startsWith('../')) return null;
  return value.replace(/^\.\//,'');
}

const quoted=/["'`]((?:\.?\.?\/|\/)?[^"'`\s<>]+\.(?:html|js|mjs|css|svg|webp|png|json|txt)(?:\?[^"'`\s<>]*)?)["'`]/gi;
const cssUrl=/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi;
for(const f of files){
  const ext=path.extname(f).toLowerCase();
  if(!textExt.has(ext)) continue;
  let text='';
  try{text=fs.readFileSync(path.join(root,f),'utf8')}catch{continue}
  const refs=[];
  for(const re of [quoted,cssUrl]){
    re.lastIndex=0;
    let m;
    while((m=re.exec(text))){
      const raw=m[1];
      const target=norm(f,raw);
      if(!target) continue;
      refs.push({raw,target});
      if(/\?v=\d+/i.test(raw)) versionedRefs.push(`${f} -> ${raw}`);
      if(fileSet.has(target)){
        allInbound.get(target)?.add(f);
        if(!f.startsWith('.github/')&&!f.endsWith('.md')&&!f.endsWith('.yml')&&!f.endsWith('.yaml')) runtimeInbound.get(target)?.add(f);
      } else if(runtimeExt.has(path.extname(target).toLowerCase())) broken.push(`${f} -> ${target}`);
    }
  }
  if(ext==='.html'){
    const counts=new Map();
    for(const {target} of refs) counts.set(target,(counts.get(target)||0)+1);
    for(const [target,count] of counts) if(count>1) duplicatePageRefs.push(`${f}: ${target} x${count}`);
  }
}

const rootRuntime=files.filter(f=>!f.includes('/')&&runtimeExt.has(path.extname(f).toLowerCase()));
const orphanRoot=rootRuntime.filter(f=>!canonicalRoots.has(f)&&(runtimeInbound.get(f)?.size||0)===0).sort();
const toolingOnly=rootRuntime.filter(f=>!canonicalRoots.has(f)&&(runtimeInbound.get(f)?.size||0)===0&&(allInbound.get(f)?.size||0)>0).sort();

const hashes=new Map();
for(const f of files){
  const ext=path.extname(f).toLowerCase();
  if(!runtimeExt.has(ext)) continue;
  const buf=fs.readFileSync(path.join(root,f));
  if(buf.length===0) continue;
  const h=crypto.createHash('sha256').update(buf).digest('hex');
  if(!hashes.has(h)) hashes.set(h,[]);
  hashes.get(h).push(f);
}
const exactDup=[...hashes.values()].filter(v=>v.length>1).sort((a,b)=>b.length-a.length);

const versionFamilies=new Map();
for(const f of rootRuntime){
  const m=f.match(/^(.*?)(?:[-_.]v)(\d+)(\.[^.]+)$/i);
  if(!m) continue;
  const key=(m[1]+m[3]).toLowerCase();
  if(!versionFamilies.has(key)) versionFamilies.set(key,[]);
  versionFamilies.get(key).push({file:f,v:Number(m[2])});
}
const multiVersions=[...versionFamilies.values()].filter(v=>v.length>1).map(v=>v.sort((a,b)=>a.v-b.v));

const sw=fs.existsSync('sw.js')?fs.readFileSync('sw.js','utf8'):'';
const nav=fs.existsSync('nav.js')?fs.readFileSync('nav.js','utf8'):'';
const current=fs.existsSync('zuno-current.js')?fs.readFileSync('zuno-current.js','utf8'):'';
const navV=nav.match(/const\s+V=['"](\d+)['"]/)?.[1]||null;
const swV=sw.match(/CACHE_NAME\s*=\s*["']zunoplay-v(\d+)["']/)?.[1]||null;
const curV=current.match(/const\s+VERSION=['"](\d+)['"]/)?.[1]||null;
const staleSwVersionRefs=[...new Set(versionedRefs.filter(x=>x.startsWith('sw.js -> ')).filter(x=>{
  const m=x.match(/\?v=(\d+)/); return m&&swV&&m[1]!==swV;
}))].sort();

function section(title, values){
  console.log(`\n=== ${title} (${values.length}) ===`);
  if(!values.length) console.log('none');
  else for(const v of values) console.log(Array.isArray(v)?v.map(x=>typeof x==='string'?x:x.file).join(' | '):v);
}

console.log(`Files scanned: ${files.length}`);
console.log(`Frontend versions: nav=${navV||'?'} sw=${swV||'?'} current=${curV||'?'}`);
section('BROKEN LOCAL REFERENCES', [...new Set(broken)].sort());
section('ROOT RUNTIME FILES WITH NO RUNTIME INBOUND REFERENCE', orphanRoot);
section('ROOT FILES REFERENCED ONLY BY DOCS/CI', toolingOnly);
section('EXACT DUPLICATE FILE CONTENT', exactDup);
section('MULTIPLE VERSION FAMILIES', multiVersions);
section('DUPLICATE REFERENCES INSIDE HTML', [...new Set(duplicatePageRefs)].sort());
section('STALE ?v= REFERENCES IN SERVICE WORKER', staleSwVersionRefs);

if(broken.length) process.exitCode=2;
