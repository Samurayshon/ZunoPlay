import fs from 'node:fs';
import assert from 'node:assert/strict';

const smoke = fs.readFileSync('android-v0/ci/runtime-smoke.sh', 'utf8');
const workflow = fs.readFileSync('.github/workflows/android-v0-build.yml', 'utf8');

assert.match(smoke, /require_adb_device\(\)/, 'runtime smoke must probe ADB health before classifying process failures');
assert.match(smoke, /fail_adb_infrastructure\(\)/, 'runtime smoke must have a dedicated infrastructure-failure path');
assert.match(smoke, /not classifying this as a ZunoPlay app crash/, 'ADB loss must not be mislabeled as an app crash');
assert.match(smoke, /exit 2/, 'ADB infrastructure failures must use a distinct exit code');
assert.match(smoke, /timeout --foreground "\$\{ADB_TIMEOUT_SECONDS\}s" adb/, 'ADB commands must be time-bounded');
assert.match(smoke, /adb logcat -v threadtime > android-runtime-logcat\.txt/, 'logcat must stream before launch so pre-disconnect evidence is preserved');
assert.match(smoke, /android-runtime-host\.txt/, 'runtime smoke must preserve a host/ADB snapshot');
assert.match(smoke, /require_adb_device "\$\{context\} post-PID verification"/, 'empty PID results must re-probe ADB before declaring an app failure');
assert.doesNotMatch(smoke, /PID="\$\(adb shell pidof/, 'raw pidof checks must not bypass ADB health classification');
assert.match(smoke, /assert_app_alive "launch attempt \$\{ATTEMPT\}"/, 'launch attempts must use the hardened process assertion');
assert.match(smoke, /assert_app_alive "final smoke-test verification"/, 'final process verification must use the hardened assertion');

assert.match(workflow, /\n  pull_request:\n/, 'Android APK workflow must run on pull requests that change Android runtime code');
assert.match(workflow, /Runtime smoke test on Android 14[\s\S]*?timeout-minutes: 12/, 'emulator runtime smoke must have its own timeout');
assert.match(workflow, /android-runtime-host\.txt/, 'host diagnostics must be uploaded as a workflow artifact');
assert.match(
  workflow,
  /github\.event_name == 'workflow_dispatch' && inputs\.release_authorization == 'PUBLICAR APK ZUNOPLAY'/,
  'public APK release must remain gated behind the explicit manual authorization token',
);

console.log('android runtime smoke harness guard: ok');
