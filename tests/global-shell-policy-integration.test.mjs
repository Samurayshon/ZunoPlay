import assert from 'node:assert/strict';
import fs from 'node:fs';

const policy=fs.readFileSync('zuno-navigation-policy-v1.js','utf8');
const nav=fs.readFileSync('zuno-global-navigation-v1.js','utf8');
const chrome=fs.readFileSync('zuno-global-chrome.js','utf8');
const chromeCss=fs.readFileSync('zuno-global-chrome.css','utf8');
const fluidCss=fs.readFileSync('zuno-fluid-ui.css','utf8');
const notificationsCss=fs.readFileSync('zuno-notifications.css','utf8');
const xpCss=fs.readFileSync('zuno-my-xp-v1.css','utf8');
const runtime=fs.readFileSync('nav.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

assert.match(policy,/\['pushState','replaceState'\]/,'navigation policy must resync after same-document route changes');
assert.match(policy,/window\.addEventListener\('popstate',\(\)=>apply\(\)\)/,'navigation policy must resync on browser history navigation');
assert.match(nav,/if\(!current\.bottomNav\)\{teardown\(\);return\}/,'bottom navigation must fail closed outside global routes');
assert.match(nav,/active==='central'/,'Central must expose its active state');
assert.match(chrome,/if\(current\.header!=='global'\)\{teardown\(\);return\}/,'global header must fail closed on contextual and immersive routes');
assert.match(chromeCss,/data-zuno-navigation-mode="global"/,'bottom spacing must depend on the navigation mode');
assert.match(chromeCss,/height:48px!important;min-height:48px!important/,'mobile global header must remain compact');
assert.match(fluidCss,/data-zuno-page="pulso"[^}]*\.zm-header\{min-height:64px!important;padding-top:0!important\}/,'Pulso must not add a second mobile top safe-area gap');
assert.match(notificationsCss,/\.zn-app\{[^}]*overflow-x:hidden/,'notifications must contain horizontal overflow');
assert.match(notificationsCss,/\.zn-heading\{[^}]*min-width:0/,'notification heading must be shrinkable on narrow screens');
assert.match(xpCss,/\.zmx-shell\{[^}]*max-width:100%[^}]*overflow-x:hidden/,'Meu XP shell must contain lateral overflow');
assert.match(xpCss,/\.zmx-amount\{[^}]*max-width:45%[^}]*overflow-wrap:anywhere/,'Meu XP amounts must not cut the page horizontally');
assert.match(runtime,/const V='351'/,'canonical runtime generation must be cache-busted');
assert.match(sw,/CACHE_NAME="zunoplay-v351"/,'service worker cache must be refreshed with the shell generation');
