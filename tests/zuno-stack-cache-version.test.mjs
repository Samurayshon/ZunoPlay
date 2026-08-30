import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('zuno-stack.html','utf8');
assert.match(html,/zuno-stack-tile-bridge-v2\.js\?v=5/,'tile bridge must use current post-first-move cache-busted version');
assert.match(html,/zuno-stack-solo-authority-bootstrap\.js\?v=11/,'authority bootstrap must use current fresh-round cache-busted version');
assert.match(html,/zuno-stack-performance-official\.js\?v=roomrace1/,'performance loader must use room-race cache-busted version');
console.log('Zuno Stack authority cache versions OK');
