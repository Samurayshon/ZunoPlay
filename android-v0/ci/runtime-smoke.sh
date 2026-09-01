#!/usr/bin/env bash
set -euo pipefail

APK="android-v0/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="com.zunoplay.app"
ACTIVITY="com.zunoplay.app/.MainActivity"

if [[ ! -s "$APK" ]]; then
  echo "APK not found or empty: $APK" >&2
  exit 1
fi

adb install -r "$APK"
adb logcat -c

for ATTEMPT in 1 2 3; do
  echo "Runtime launch attempt ${ATTEMPT}/3"
  adb shell am force-stop "$PACKAGE"
  START_OUTPUT="$(adb shell am start -W -n "$ACTIVITY" | tr -d '\r')"
  echo "$START_OUTPUT"
  grep -q 'Status: ok' <<< "$START_OUTPUT"
  sleep 8
  PID="$(adb shell pidof "$PACKAGE" | tr -d '\r' || true)"
  if [[ -z "$PID" ]]; then
    echo "ZunoPlay process exited after launch attempt ${ATTEMPT}." >&2
    adb logcat -d -v threadtime > android-runtime-logcat.txt || true
    exit 1
  fi
done

adb shell input keyevent 223
sleep 3
PID="$(adb shell pidof "$PACKAGE" | tr -d '\r' || true)"
if [[ -z "$PID" ]]; then
  echo "ZunoPlay process died after screen-off transition." >&2
  adb logcat -d -v threadtime > android-runtime-logcat.txt || true
  exit 1
fi

adb shell input keyevent 224
adb shell wm dismiss-keyguard || true
sleep 5
PID="$(adb shell pidof "$PACKAGE" | tr -d '\r' || true)"
if [[ -z "$PID" ]]; then
  echo "ZunoPlay process died after wake transition." >&2
  adb logcat -d -v threadtime > android-runtime-logcat.txt || true
  exit 1
fi

adb logcat -d -v threadtime > android-runtime-logcat.txt
adb shell dumpsys package "$PACKAGE" > android-package.txt
adb shell dumpsys activity activities > android-activities.txt

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

PID="$(adb shell pidof "$PACKAGE" | tr -d '\r' || true)"
if [[ -z "$PID" ]]; then
  echo "ZunoPlay process is not alive at the end of the smoke test." >&2
  exit 1
fi

echo "ZunoPlay Android 14 runtime smoke test passed with PID ${PID}."
