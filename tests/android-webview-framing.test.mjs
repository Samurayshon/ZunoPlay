import fs from 'node:fs';
import assert from 'node:assert/strict';

const activity = fs.readFileSync('android-v0/app/src/main/java/com/zunoplay/app/MainActivity.java', 'utf8');
const home = fs.readFileSync('index.html', 'utf8');

assert.match(activity, /settings\.setUseWideViewPort\(true\)/, 'Android WebView must keep responsive wide viewport support');
assert.match(activity, /settings\.setLoadWithOverviewMode\(false\)/, 'Android WebView must not zoom the entire document to fit oversized content');
assert.doesNotMatch(activity, /settings\.setLoadWithOverviewMode\(true\)/, 'Android WebView overview-mode auto zoom must stay disabled');
assert.match(activity, /window\.setDecorFitsSystemWindows\(false\)/, 'Android must draw the ZunoPlay background edge-to-edge');
assert.match(activity, /view\.setPadding\(0, 0, 0, 0\)/, 'native root must not turn system insets into a visible spacer');
assert.doesNotMatch(activity, /view\.setPadding\(left, top, right, bottom\)/, 'native and web safe areas must not be applied twice');
assert.match(activity, /--zuno-native-safe-top/, 'native top inset must be published into the web shell');
assert.match(activity, /Published web safe area/, 'runtime smoke test needs observable safe-area evidence');
assert.match(activity, /Color\.rgb\(2, 4, 13\)/, 'native surfaces must share the web base background');
assert.match(home, /name=["']viewport["'][^>]*width=device-width[^>]*initial-scale=1\.0[^>]*viewport-fit=cover/i, 'web shell must retain device-width viewport contract');

console.log('android webview framing guard: ok');
