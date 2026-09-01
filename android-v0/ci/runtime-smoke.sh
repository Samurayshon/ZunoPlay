#!/usr/bin/env bash
set -euo pipefail

APK="android-v0/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="com.zunoplay.app"
ACTIVITY="com.zunoplay.app/.MainActivity"
ADB_TIMEOUT_SECONDS="${ANDROID_RUNTIME_ADB_TIMEOUT_SECONDS:-12}"
PID=""
LOGCAT_PID=""

adb_cmd() {
  timeout --foreground "${ADB_TIMEOUT_SECONDS}s" adb "$@"
}

write_host_snapshot() {
  {
    echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo
    echo '=== adb devices -l ==='
    timeout --foreground "${ADB_TIMEOUT_SECONDS}s" adb devices -l || true
    echo
    echo '=== emulator/adb processes ==='
    ps -ef | grep -E '[e]mulator|[q]emu|[a]db' || true
  } > android-runtime-host.txt 2>&1
}

capture_device_diagnostics() {
  write_host_snapshot
  if adb_cmd get-state >/dev/null 2>&1; then
    adb_cmd shell dumpsys package "$PACKAGE" > android-package.txt 2>&1 || true
    adb_cmd shell dumpsys activity activities > android-activities.txt 2>&1 || true
  fi
}

stop_logcat() {
  if [[ -n "$LOGCAT_PID" ]]; then
    kill "$LOGCAT_PID" >/dev/null 2>&1 || true
    wait "$LOGCAT_PID" >/dev/null 2>&1 || true
    LOGCAT_PID=""
  fi
}

cleanup() {
  local status=$?
  set +e
  stop_logcat
  capture_device_diagnostics
  trap - EXIT
  exit "$status"
}
trap cleanup EXIT

fail_adb_infrastructure() {
  local context="$1"
  echo "Android emulator/ADB unavailable during ${context}; not classifying this as a ZunoPlay app crash." >&2
  write_host_snapshot
  exit 2
}

require_adb_device() {
  local context="$1"
  local state=""
  state="$(adb_cmd get-state 2>/dev/null | tr -d '\r' || true)"
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
  pid_output="$(adb_cmd shell pidof "$PACKAGE" 2>&1 | tr -d '\r')"
  pid_status=$?
  set -e

  if [[ "$pid_status" -eq 124 ]] || grep -Eqi '(error:|adb:|device offline|device .* not found|no devices|closed)' <<< "$pid_output"; then
    fail_adb_infrastructure "$context"
  fi

  if [[ "$pid_status" -ne 0 || -z "$pid_output" ]]; then
    # Re-probe after pidof. A transport drop between the first probe and pidof must
    # never be reported as a ZunoPlay crash.
    require_adb_device "${context} post-PID verification"
    echo "ZunoPlay process is not running during ${context}." >&2
    exit 1
  fi

  PID="$pid_output"
}

if [[ ! -s "$APK" ]]; then
  echo "APK not found or empty: $APK" >&2
  exit 1
fi

require_adb_device "APK installation"
adb_cmd install -r "$APK"
adb_cmd logcat -c

# Keep logcat streaming from before the first launch. If the emulator/ADB dies,
# the lines emitted before the transport loss remain available as an artifact.
adb logcat -v threadtime > android-runtime-logcat.txt 2>&1 &
LOGCAT_PID=$!

for ATTEMPT in 1 2 3; do
  echo "Runtime launch attempt ${ATTEMPT}/3"
  require_adb_device "launch attempt ${ATTEMPT} preflight"
  adb_cmd shell am force-stop "$PACKAGE"

  set +e
  START_OUTPUT="$(adb_cmd shell am start -W -n "$ACTIVITY" 2>&1 | tr -d '\r')"
  START_STATUS=$?
  set -e

  if [[ "$START_STATUS" -eq 124 ]] || grep -Eqi '(error:|adb:|device offline|device .* not found|no devices|closed)' <<< "$START_OUTPUT"; then
    fail_adb_infrastructure "launch attempt ${ATTEMPT}"
  fi
  if [[ "$START_STATUS" -ne 0 ]]; then
    require_adb_device "launch attempt ${ATTEMPT} failure verification"
    echo "$START_OUTPUT" >&2
    echo "Unable to launch ZunoPlay on attempt ${ATTEMPT}." >&2
    exit 1
  fi

  echo "$START_OUTPUT"
  grep -q 'Status: ok' <<< "$START_OUTPUT"
  sleep 8
  assert_app_alive "launch attempt ${ATTEMPT}"
done

require_adb_device "screen-off transition preflight"
adb_cmd shell input keyevent 223
sleep 3
assert_app_alive "screen-off transition"

require_adb_device "wake transition preflight"
adb_cmd shell input keyevent 224
adb_cmd shell wm dismiss-keyguard || true
sleep 5
assert_app_alive "wake transition"

# Flush the continuous collector before validating its contents.
stop_logcat
require_adb_device "runtime diagnostics collection"
capture_device_diagnostics

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
