import assert from'node:assert/strict';
import{readdir,readFile}from'node:fs/promises';
import{extname,join,relative}from'node:path';

const ROOT=new URL('../src/zuno-stack-v2/core/',import.meta.url);
const forbidden=[
  [/\bdocument\s*[.[]/,'DOM document'],[/\bwindow\s*[.[]/,'browser window'],[/\blocalStorage\b/,'localStorage'],[/\bsessionStorage\b/,'sessionStorage'],[/\bsupabase\b/i,'Supabase'],[/\bWebSocket\b/,'WebSocket'],[/\bEventSource\b/,'EventSource'],[/\bMutationObserver\b/,'MutationObserver'],[/\bfetch\s*\(/,'network fetch'],[/\bsetInterval\s*\(/,'polling interval'],[/\bsetTimeout\s*\(/,'timer authority'],[/\brequestAnimationFrame\s*\(/,'render loop'],[/Math\.random\s*\(/,'implicit randomness'],[/Date\.now\s*\(/,'client clock authority']
];

async function collect(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const full=join(dir.pathname??dir,entry.name);if(entry.isDirectory())out.push(...await collect(full));else if(extname(entry.name)==='.mjs')out.push(full)}return out}
const rootPath=ROOT.pathname;
const files=await collect(rootPath);
assert.ok(files.length>=4,'core block 1 source files must exist');
for(const file of files){const source=await readFile(file,'utf8'),name=relative(rootPath,file);for(const[pattern,label]of forbidden)assert.doesNotMatch(source,pattern,`${name} must not depend on ${label}`);for(const match of source.matchAll(/(?:from\s*|import\s*\()(['"])([^'"]+)\1/g))assert.ok(match[2].startsWith('./')||match[2].startsWith('../'),`${name} imports non-local dependency ${match[2]}`)}
console.log('zuno stack v2 core boundaries: ok');
