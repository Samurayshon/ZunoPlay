#!/usr/bin/env bash
set -euo pipefail

APK="android-v0/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="com.zunoplay.app"
ACTIVITY="com.zunoplay.app/.MainActivity"
ADB_TIMEOUT_SECONDS="${ANDROID_RUNTIME_ADB_TIMEOUT_SECONDS:-15}"
LOGCAT_PID=""

adb_cmd() {
  timeout --foreground "${ADB_TIMEOUT_SECONDS}s" adb "$@"
}

write_host_snapshot() {
  {
    echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo
    echo '=== adb devices -l ==='
    adb devices -l || true
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

require_device() {
  if ! adb_cmd get-state >/dev/null 2>&1; then
    echo "Android emulator/ADB became unavailable; failing fast instead of waiting indefinitely." >&2
    write_host_snapshot
    return 1
  fi
}

package_pid() {
  adb_cmd shell pidof "$PACKAGE" 2>/dev/null | tr -d '\r' || true
}

if [[ ! -s "$APK" ]]; then
  echo "APK not found or empty: $APK" >&2
  exit 1
fi

adb_cmd install -r "$APK"
adb_cmd logcat -c
adb logcat -v threadtime > android-runtime-logcat.txt 2>&1 &
LOGCAT_PID=$!

for ATTEMPT in 1 2 3; do
  echo "Runtime launch attempt ${ATTEMPT}/3"
  require_device
  adb_cmd shell am force-stop "$PACKAGE"

  if ! START_OUTPUT="$(adb_cmd shell am start -W -n "$ACTIVITY" 2>&1 | tr -d '\r')"; then
    echo "$START_OUTPUT" >&2
    echo "Unable to launch ZunoPlay on attempt ${ATTEMPT}." >&2
    exit 1
  fi
  echo "$START_OUTPUT"
  grep -q 'Status: ok' <<< "$START_OUTPUT"

  sleep 8
  require_device
  PID="$(package_pid)"
  if [[ -z "$PID" ]]; then
    echo "ZunoPlay process exited after launch attempt ${ATTEMPT}." >&2
    exit 1
  fi
done

require_device
adb_cmd shell input keyevent 223
sleep 3
require_device
PID="$(package_pid)"
if [[ -z "$PID" ]]; then
  echo "ZunoPlay process died after screen-off transition." >&2
  exit 1
fi

adb_cmd shell input keyevent 224
adb_cmd shell wm dismiss-keyguard || true
sleep 5
require_device
PID="$(package_pid)"
if [[ -z "$PID" ]]; then
  echo "ZunoPlay process died after wake transition." >&2
  exit 1
fi

# Stop the continuous collector before validating so all buffered log lines are on disk.
stop_logcat
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

require_device
PID="$(package_pid)"
if [[ -z "$PID" ]]; then
  echo "ZunoPlay process is not alive at the end of the smoke test." >&2
  exit 1
fi

echo "ZunoPlay Android 14 runtime smoke test passed with PID ${PID}."
