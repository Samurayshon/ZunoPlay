import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('zuno-stack.html','utf8');
assert.match(html,/zuno-stack-tile-bridge-v2\.js\?v=3/,'tile bridge must use current cache-busted version');
assert.match(html,/zuno-stack-solo-authority-bootstrap\.js\?v=9/,'authority bootstrap must use current cache-busted version');
console.log('Zuno Stack authority cache versions OK');
