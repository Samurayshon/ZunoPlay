#!/usr/bin/env bash
set -euo pipefail

APK="android-v0/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="com.zunoplay.app"
ACTIVITY="com.zunoplay.app/.MainActivity"
ADB_TIMEOUT="${ADB_TIMEOUT:-20}"
ADB_INSTALL_TIMEOUT="${ADB_INSTALL_TIMEOUT:-120}"

adb_t() {
  timeout --signal=TERM --kill-after=5s "${ADB_TIMEOUT}s" adb "$@"
}

adb_install_t() {
  timeout --signal=TERM --kill-after=5s "${ADB_INSTALL_TIMEOUT}s" adb "$@"
}

capture_diagnostics() {
  adb_t logcat -d -v threadtime > android-runtime-logcat.txt || true
  adb_t shell dumpsys package "$PACKAGE" > android-package.txt || true
  adb_t shell dumpsys activity activities > android-activities.txt || true
  adb_t shell dumpsys window windows > android-windows.txt || true
}
trap capture_diagnostics EXIT

if [[ ! -s "$APK" ]]; then
  echo "APK not found or empty: $APK" >&2
  exit 1
fi

echo "Waiting for Android device..."
adb_t wait-for-device

echo "Installing ZunoPlay APK (bounded to ${ADB_INSTALL_TIMEOUT}s)..."
adb_install_t install -r "$APK"

echo "Clearing logcat..."
adb_t logcat -c

for ATTEMPT in 1 2 3; do
  echo "Runtime launch attempt ${ATTEMPT}/3"
  adb_t shell am force-stop "$PACKAGE"
  START_OUTPUT="$(adb_t shell am start -W -n "$ACTIVITY" | tr -d '\r')"
  echo "$START_OUTPUT"
  grep -q 'Status: ok' <<< "$START_OUTPUT"
  sleep 8
  PID="$(adb_t shell pidof "$PACKAGE" | tr -d '\r' || true)"
  if [[ -z "$PID" ]]; then
    echo "ZunoPlay process exited after launch attempt ${ATTEMPT}." >&2
    exit 1
  fi
done

adb_t shell input keyevent 223
sleep 3
PID="$(adb_t shell pidof "$PACKAGE" | tr -d '\r' || true)"
if [[ -z "$PID" ]]; then
  echo "ZunoPlay process died after screen-off transition." >&2
  exit 1
fi

adb_t shell input keyevent 224
adb_t shell wm dismiss-keyguard || true
sleep 5
PID="$(adb_t shell pidof "$PACKAGE" | tr -d '\r' || true)"
if [[ -z "$PID" ]]; then
  echo "ZunoPlay process died after wake transition." >&2
  exit 1
fi

# Produce deterministic visual QA evidence of the installed launcher icon.
adb_t shell am force-stop "$PACKAGE"
adb_t shell input keyevent KEYCODE_HOME
sleep 3
adb_t shell input swipe 540 1800 540 500 500 || true
sleep 3
adb_t shell uiautomator dump /sdcard/zunoplay-launcher.xml
adb_t pull /sdcard/zunoplay-launcher.xml android-launcher-ui.xml
if ! grep -q 'ZunoPlay' android-launcher-ui.xml; then
  echo "ZunoPlay launcher entry was not found in the Android launcher UI hierarchy." >&2
  exit 1
fi
adb_t exec-out screencap -p > android-launcher-zunoplay.png
test -s android-launcher-zunoplay.png

echo "Launcher evidence captured: android-launcher-zunoplay.png"

capture_diagnostics
trap - EXIT

python3 - <<'PY'
from pathlib import Path
import re

log = Path('android-runtime-logcat.txt').read_text(errors='replace')

blocks = log.split('FATAL EXCEPTION')
fatal_for_app = any('Process: com.zunoplay.app' in block[:4000] for block in blocks[1:])
if fatal_for_app:
    raise SystemExit('Fatal ZunoPlay process crash detected in logcat.')

matches = re.findall(
    r'Applied system safe area: left=(\d+) top=(\d+) right=(\d+) bottom=(\d+)',
    log,
)
if not matches:
    raise SystemExit('No ZunoPlay safe-area application was recorded in logcat.')

left, top, right, bottom = map(int, matches[-1])
print(f'Validated safe area: left={left} top={top} right={right} bottom={bottom}')
if top <= 0:
    raise SystemExit(f'Invalid top safe-area inset: {top}. Status-bar protection was not proven.')
if bottom <= 0:
    raise SystemExit(f'Invalid bottom safe-area inset: {bottom}. Navigation-area protection was not proven.')
PY

PID="$(adb_t shell pidof "$PACKAGE" | tr -d '\r' || true)"
if [[ -n "$PID" ]]; then
  echo "ZunoPlay process unexpectedly remained alive after returning to launcher: ${PID}."
fi

echo "ZunoPlay Android 14 runtime smoke test passed and launcher evidence was captured."
