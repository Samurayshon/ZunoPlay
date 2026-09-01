import fs from 'node:fs';
import assert from 'node:assert/strict';

const smoke = fs.readFileSync('android-v0/ci/runtime-smoke.sh', 'utf8');

assert.match(smoke, /require_adb_device\(\)/, 'runtime smoke must probe ADB health before classifying process failures');
assert.match(smoke, /fail_adb_infrastructure\(\)/, 'runtime smoke must have a dedicated infrastructure-failure path');
assert.match(smoke, /not classifying this as a ZunoPlay app crash/, 'ADB loss must not be mislabeled as an app crash');
assert.match(smoke, /exit 2/, 'ADB infrastructure failures must use a distinct exit code');
assert.match(smoke, /timeout "\$\{ADB_DIAGNOSTIC_TIMEOUT_SECONDS\}s" adb logcat/, 'diagnostic logcat collection must be time-bounded');
assert.match(smoke, /require_adb_device "\$\{context\} post-PID verification"/, 'empty PID results must re-probe ADB before declaring an app failure');
assert.doesNotMatch(smoke, /PID="\$\(adb shell pidof/, 'raw pidof checks must not bypass ADB health classification');
assert.match(smoke, /assert_app_alive "launch attempt \$\{ATTEMPT\}"/, 'launch attempts must use the hardened process assertion');
assert.match(smoke, /assert_app_alive "final smoke-test verification"/, 'final process verification must use the hardened assertion');

console.log('android runtime smoke harness guard: ok');
