#!/usr/bin/env bash
set -euo pipefail

APK="android-v0/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="com.zunoplay.app"
ACTIVITY="com.zunoplay.app/.MainActivity"
ADB_TIMEOUT="${ADB_TIMEOUT:-20}"
ADB_INSTALL_TIMEOUT="${ADB_INSTALL_TIMEOUT:-120}"
APP_READY_TIMEOUT="${APP_READY_TIMEOUT:-90}"
POST_BOOT_SETTLE_SECONDS="${POST_BOOT_SETTLE_SECONDS:-60}"
ADB_INSTALL_RETRY_DELAY="${ADB_INSTALL_RETRY_DELAY:-30}"

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

assert_no_zuno_runtime_failure() {
  local log=""
  log="$(adb_t logcat -d -v threadtime || true)"

  if grep -Eq 'ANR in com\.zunoplay\.app' <<< "$log"; then
    echo "ZunoPlay ANR detected during runtime readiness validation." >&2
    return 1
  fi

  if grep -A80 'FATAL EXCEPTION' <<< "$log" | grep -Eq 'Process: com\.zunoplay\.app([,[:space:]]|$)'; then
    echo "Fatal ZunoPlay process crash detected during runtime readiness validation." >&2
    return 1
  fi
}

wait_for_activity_ready() {
  local deadline=$((SECONDS + APP_READY_TIMEOUT))
  local pid=""
  local activities=""
  local windows=""
  local app_block=""
  local focus=""

  while (( SECONDS < deadline )); do
    pid="$(adb_t shell pidof "$PACKAGE" | tr -d '\r' || true)"
    activities="$(adb_t shell dumpsys activity activities | tr -d '\r' || true)"
    windows="$(adb_t shell dumpsys window windows | tr -d '\r' || true)"

    app_block="$(awk '
      /ActivityRecord\{.*com\.zunoplay\.app\/.MainActivity/ { capture=1 }
      capture { print }
      capture && /nowVisible=/ { exit }
    ' <<< "$activities")"

    if [[ -n "$pid" ]] \
      && grep -Eq '(topResumedActivity|ResumedActivity).*com\.zunoplay\.app/.MainActivity' <<< "$activities" \
      && grep -Eq 'mVisibleRequested=true mVisible=true mClientVisible=true reportedDrawn=true reportedVisible=true' <<< "$app_block" \
      && grep -Eq 'nowVisible=true' <<< "$app_block" \
      && grep -Eq 'Window\{.*com\.zunoplay\.app/com\.zunoplay\.app\.MainActivity' <<< "$windows"; then
      assert_no_zuno_runtime_failure
      focus="$(grep -m1 'mCurrentFocus=' <<< "$activities" || grep -m1 'mCurrentFocus=' <<< "$windows" || true)"
      if grep -Eq 'mCurrentFocus=Window\{.*com\.zunoplay\.app/com\.zunoplay\.app\.MainActivity' <<< "$activities$windows"; then
        echo "ZunoPlay MainActivity is resumed, visible, reportedDrawn, nowVisible, focused, windowed, and alive (pid=${pid})."
      else
        echo "ZunoPlay MainActivity is resumed, visible, reportedDrawn, nowVisible, windowed, and alive (pid=${pid}); transient system focus does not invalidate readiness: ${focus:-unknown}."
      fi
      return 0
    fi

    sleep 2
  done

  assert_no_zuno_runtime_failure
  echo "ZunoPlay MainActivity did not become resumed, visible, reportedDrawn, nowVisible, and windowed within ${APP_READY_TIMEOUT}s." >&2
  return 1
}

dismiss_transient_system_anr() {
  local activities=""
  activities="$(adb_t shell dumpsys activity activities | tr -d '\r' || true)"
  if grep -q 'Application Not Responding: system' <<< "$activities"; then
    echo "Dismissing transient Android system ANR dialog so it cannot block subsequent smoke interactions."
    adb_t shell input keyevent KEYCODE_BACK || true
    sleep 2
  fi
}

install_apk_with_verification_retry() {
  local attempt=1
  local install_output=""
  local install_status=0

  while (( attempt <= 2 )); do
    echo "Installing ZunoPlay APK attempt ${attempt}/2 (bounded to ${ADB_INSTALL_TIMEOUT}s)..."
    set +e
    install_output="$(adb_install_t install -r "$APK" 2>&1)"
    install_status=$?
    set -e
    echo "$install_output"

    if (( install_status == 0 )); then
      return 0
    fi

    if (( attempt == 1 )) && grep -q 'INSTALL_FAILED_VERIFICATION_FAILURE: Integrity verification timed out' <<< "$install_output"; then
      echo "Android integrity verification was still busy after boot; waiting ${ADB_INSTALL_RETRY_DELAY}s before one bounded retry..."
      sleep "$ADB_INSTALL_RETRY_DELAY"
      adb_t wait-for-device
      attempt=$((attempt + 1))
      continue
    fi

    return "$install_status"
  done
}

if [[ ! -s "$APK" ]]; then
  echo "APK not found or empty: $APK" >&2
  exit 1
fi

echo "Waiting for Android device..."
adb_t wait-for-device

echo "Allowing Android post-boot package/integrity services to settle for ${POST_BOOT_SETTLE_SECONDS}s..."
sleep "$POST_BOOT_SETTLE_SECONDS"
adb_t wait-for-device
adb_t shell cmd package path android >/dev/null

install_apk_with_verification_retry

echo "Clearing logcat..."
adb_t logcat -c

for ATTEMPT in 1 2 3; do
  echo "Runtime launch attempt ${ATTEMPT}/3"
  adb_t shell am force-stop "$PACKAGE"
  START_OUTPUT="$(adb_t shell am start -W -n "$ACTIVITY" | tr -d '\r')"
  echo "$START_OUTPUT"

  if ! grep -Eq 'Status: (ok|timeout)' <<< "$START_OUTPUT"; then
    echo "Unexpected Activity Manager launch result on attempt ${ATTEMPT}." >&2
    exit 1
  fi

  if grep -q 'Status: timeout' <<< "$START_OUTPUT"; then
    echo "Activity Manager wait timed out during cold startup; validating actual resumed/drawn state instead."
  fi

  wait_for_activity_ready
  dismiss_transient_system_anr
  sleep 8

  PID="$(adb_t shell pidof "$PACKAGE" | tr -d '\r' || true)"
  if [[ -z "$PID" ]]; then
    echo "ZunoPlay process exited after launch attempt ${ATTEMPT}." >&2
    exit 1
  fi
  assert_no_zuno_runtime_failure
done

adb_t shell input keyevent 223
sleep 3
PID="$(adb_t shell pidof "$PACKAGE" | tr -d '\r' || true)"
if [[ -z "$PID" ]]; then
  echo "ZunoPlay process died after screen-off transition." >&2
  exit 1
fi
assert_no_zuno_runtime_failure

adb_t shell input keyevent 224
adb_t shell wm dismiss-keyguard || true
sleep 5
PID="$(adb_t shell pidof "$PACKAGE" | tr -d '\r' || true)"
if [[ -z "$PID" ]]; then
  echo "ZunoPlay process died after wake transition." >&2
  exit 1
fi
assert_no_zuno_runtime_failure

# Produce deterministic visual QA evidence of the installed launcher icon.
adb_t shell am force-stop "$PACKAGE"
dismiss_transient_system_anr
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

if re.search(r'ANR in com\.zunoplay\.app', log):
    raise SystemExit('ZunoPlay ANR detected in logcat.')

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
