import fs from 'node:fs';
import assert from 'node:assert/strict';

const activity = fs.readFileSync('android-v0/app/src/main/java/com/zunoplay/app/MainActivity.java', 'utf8');
const home = fs.readFileSync('index.html', 'utf8');

assert.match(activity, /settings\.setUseWideViewPort\(true\)/, 'Android WebView must keep responsive wide viewport support');
assert.match(activity, /settings\.setLoadWithOverviewMode\(false\)/, 'Android WebView must not zoom the entire document to fit oversized content');
assert.doesNotMatch(activity, /settings\.setLoadWithOverviewMode\(true\)/, 'Android WebView overview-mode auto zoom must stay disabled');
assert.match(activity, /window\.setDecorFitsSystemWindows\(false\)/, 'Android may keep the native background edge-to-edge');
assert.match(activity, /view\.setPadding\(left, top, right, bottom\)/, 'native shell must frame the whole WebView inside system safe areas');
assert.doesNotMatch(activity, /view\.setPadding\(0, 0, 0, 0\)/, 'native shell must not leave the WebView underneath system bars');
assert.match(activity, /--zuno-native-safe-top','0px'/, 'web shell must not apply the native inset a second time');
assert.match(activity, /Published web safe area/, 'runtime smoke test needs observable non-zero native safe-area evidence');
assert.match(activity, /Color\.rgb\(2, 4, 13\)/, 'native surfaces must share the web base background');
assert.match(home, /name=["']viewport["'][^>]*width=device-width[^>]*initial-scale=1\.0[^>]*viewport-fit=cover/i, 'web shell must retain device-width viewport contract');

console.log('android webview framing guard: ok');
