#!/usr/bin/env bash
set -euo pipefail

APK="android-v0/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="com.zunoplay.app"
ACTIVITY="com.zunoplay.app/.MainActivity"
ADB_PROBE_TIMEOUT_SECONDS=8
ADB_DIAGNOSTIC_TIMEOUT_SECONDS=10
PID=""

capture_runtime_diagnostics() {
  timeout "${ADB_DIAGNOSTIC_TIMEOUT_SECONDS}s" adb logcat -d -v threadtime > android-runtime-logcat.txt 2>&1 || true
  timeout "${ADB_DIAGNOSTIC_TIMEOUT_SECONDS}s" adb shell dumpsys package "$PACKAGE" > android-package.txt 2>&1 || true
  timeout "${ADB_DIAGNOSTIC_TIMEOUT_SECONDS}s" adb shell dumpsys activity activities > android-activities.txt 2>&1 || true
}

fail_adb_infrastructure() {
  local context="$1"
  echo "Android emulator/ADB unavailable during ${context}; not classifying this as a ZunoPlay app crash." >&2
  timeout "${ADB_PROBE_TIMEOUT_SECONDS}s" adb devices -l >&2 || true
  capture_runtime_diagnostics
  exit 2
}

require_adb_device() {
  local context="$1"
  local state=""
  state="$(timeout "${ADB_PROBE_TIMEOUT_SECONDS}s" adb get-state 2>/dev/null | tr -d '\r' || true)"
  if [[ "$state" != "device" ]]; then
    fail_adb_infrastructure "$context"
  fi
}

assert_app_alive() {
  local context="$1"
  local pid_output=""
  local pid_status=0

  require_adb_device "$context"

  set +e
  pid_output="$(timeout "${ADB_PROBE_TIMEOUT_SECONDS}s" adb shell pidof "$PACKAGE" 2>&1 | tr -d '\r')"
  pid_status=$?
  set -e

  if [[ "$pid_status" -eq 124 ]] || grep -Eqi '(error:|adb:|device offline|device .* not found|no devices|closed)' <<< "$pid_output"; then
    fail_adb_infrastructure "$context"
  fi

  if [[ "$pid_status" -ne 0 || -z "$pid_output" ]]; then
    # Re-probe before declaring an app failure so a transport drop cannot masquerade as a crash.
    require_adb_device "${context} post-PID verification"
    echo "ZunoPlay process is not running during ${context}." >&2
    capture_runtime_diagnostics
    exit 1
  fi

  PID="$pid_output"
}

if [[ ! -s "$APK" ]]; then
  echo "APK not found or empty: $APK" >&2
  exit 1
fi

require_adb_device "APK installation"
adb install -r "$APK"
adb logcat -c

for ATTEMPT in 1 2 3; do
  echo "Runtime launch attempt ${ATTEMPT}/3"
  adb shell am force-stop "$PACKAGE"
  START_OUTPUT="$(adb shell am start -W -n "$ACTIVITY" | tr -d '\r')"
  echo "$START_OUTPUT"
  grep -q 'Status: ok' <<< "$START_OUTPUT"
  sleep 8
  assert_app_alive "launch attempt ${ATTEMPT}"
done

adb shell input keyevent 223
sleep 3
assert_app_alive "screen-off transition"

adb shell input keyevent 224
adb shell wm dismiss-keyguard || true
sleep 5
assert_app_alive "wake transition"

require_adb_device "runtime diagnostics collection"
capture_runtime_diagnostics

python3 - <<'PY'
from pathlib import Path
import re

log = Path('android-runtime-logcat.txt').read_text(errors='replace')

blocks = log.split('FATAL EXCEPTION')
fatal_for_app = any('Process: com.zunoplay.app' in block[:4000] for block in blocks[1:])
if fatal_for_app:
    raise SystemExit('Fatal ZunoPlay process crash detected in logcat.')

matches = re.findall(
    r'Published web safe area: left=(\d+) top=(\d+) right=(\d+) bottom=(\d+)',
    log,
)
if not matches:
    raise SystemExit('No ZunoPlay web safe-area publication was recorded in logcat.')

left, top, right, bottom = map(int, matches[-1])
print(f'Validated safe area: left={left} top={top} right={right} bottom={bottom}')
if top <= 0:
    raise SystemExit(f'Invalid top safe-area inset: {top}. Status-bar protection was not proven.')
if bottom <= 0:
    raise SystemExit(f'Invalid bottom safe-area inset: {bottom}. Navigation-area protection was not proven.')
PY

assert_app_alive "final smoke-test verification"
echo "ZunoPlay Android 14 runtime smoke test passed with PID ${PID}."
