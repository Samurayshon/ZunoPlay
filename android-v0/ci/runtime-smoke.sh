#!/usr/bin/env bash
set -euo pipefail

APK="android-v0/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="com.zunoplay.app"
ACTIVITY="com.zunoplay.app/.MainActivity"
ADB_TIMEOUT_SECONDS="${ANDROID_RUNTIME_ADB_TIMEOUT_SECONDS:-25}"
ADB_RECOVERY_TIMEOUT_SECONDS="${ANDROID_RUNTIME_ADB_RECOVERY_TIMEOUT_SECONDS:-35}"
PID=""
LOGCAT_PID=""
LOGCAT_REQUESTED=0

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
    echo
    echo '=== memory ==='
    free -m || true
    grep -E '^(MemTotal|MemFree|MemAvailable|SwapTotal|SwapFree):' /proc/meminfo || true
    echo
    echo '=== cgroup v2 memory ==='
    for file in memory.current memory.max memory.high memory.events memory.events.local memory.swap.current memory.swap.max; do
      path="/sys/fs/cgroup/${file}"
      if [[ -r "$path" ]]; then
        echo "--- ${file} ---"
        cat "$path" || true
      fi
    done
    echo
    echo '=== qemu/emulator process status ==='
    QEMU_PIDS="$(pgrep -f 'qemu-system|emulator.*-avd' || true)"
    ZOMBIE_QEMU_PIDS="$(ps -eo pid=,stat=,comm= | awk '$2 ~ /^Z/ && $3 ~ /^qemu-system/ {print $1}' || true)"
    QEMU_PIDS="$(printf '%s\n%s\n' "$QEMU_PIDS" "$ZOMBIE_QEMU_PIDS" | tr ' ' '\n' | awk 'NF && !seen[$1]++' | tr '\n' ' ')"
    if [[ -n "$QEMU_PIDS" ]]; then
      for qpid in $QEMU_PIDS; do
        echo "--- pid ${qpid} ---"
        ps -o pid,ppid,state,%cpu,%mem,rss,vsz,etime,cmd -p "$qpid" || true
        grep -E '^(Name|State|VmPeak|VmSize|VmRSS|VmSwap|Threads):' "/proc/${qpid}/status" 2>/dev/null || true
        if [[ -r "/proc/${qpid}/stat" ]]; then
          QEMU_STAT="$(cat "/proc/${qpid}/stat" 2>/dev/null || true)"
          echo "proc_stat=${QEMU_STAT}"
          QEMU_EXIT_CODE="$(awk '{print $52}' "/proc/${qpid}/stat" 2>/dev/null || true)"
          echo "wait_status_raw=${QEMU_EXIT_CODE}"
          if [[ "$QEMU_EXIT_CODE" =~ ^[0-9]+$ ]]; then
            python3 - "$QEMU_EXIT_CODE" <<'PY'
import os
import sys
status = int(sys.argv[1])
print(f"wait_status_exited={os.WIFEXITED(status)}")
print(f"wait_status_signaled={os.WIFSIGNALED(status)}")
if os.WIFEXITED(status):
    print(f"exit_status={os.WEXITSTATUS(status)}")
if os.WIFSIGNALED(status):
    print(f"term_signal={os.WTERMSIG(status)}")
    try:
        print(f"term_signal_name={os.strsignal(os.WTERMSIG(status))}")
    except Exception:
        pass
if hasattr(os, "WCOREDUMP"):
    print(f"core_dumped={os.WCOREDUMP(status)}")
PY
          fi
        fi
      done
    else
      echo 'no qemu/emulator process found'
    fi
    echo
    echo '=== kernel oom evidence ==='
    dmesg 2>/dev/null | tail -n 300 | grep -Ei 'oom|out of memory|killed process|memory cgroup' || true
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

start_logcat() {
  stop_logcat
  adb logcat -v threadtime >> android-runtime-logcat.txt 2>&1 &
  LOGCAT_PID=$!
}

cleanup() {
  local status=$?
  set +e
  LOGCAT_REQUESTED=0
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

recover_adb_device() {
  local context="$1"
  local attempt=0
  local state=""
  local boot_completed=""
  local wait_status=0

  echo "Attempting bounded ADB recovery during ${context}." >&2
  write_host_snapshot
  stop_logcat

  for attempt in 1 2; do
    timeout --foreground 5s adb kill-server >/dev/null 2>&1 || true
    timeout --foreground 5s adb start-server >/dev/null 2>&1 || true

    set +e
    timeout --foreground "${ADB_RECOVERY_TIMEOUT_SECONDS}s" adb wait-for-device >/dev/null 2>&1
    wait_status=$?
    set -e

    if [[ "$wait_status" -eq 0 ]]; then
      state="$(adb_cmd get-state 2>/dev/null | tr -d '\r' || true)"
      boot_completed="$(adb_cmd shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
      if [[ "$state" == "device" && "$boot_completed" == "1" ]]; then
        if [[ "$LOGCAT_REQUESTED" -eq 1 ]]; then
          start_logcat
        fi
        echo "ADB recovered during ${context} on attempt ${attempt}/2." >&2
        return 0
      fi
    fi

    sleep 2
  done

  return 1
}

require_adb_device() {
  local context="$1"
  local state=""
  state="$(adb_cmd get-state 2>/dev/null | tr -d '\r' || true)"
  if [[ "$state" == "device" ]]; then
    return 0
  fi

  if recover_adb_device "$context"; then
    return 0
  fi

  fail_adb_infrastructure "$context"
}

assert_app_alive() {
  local context="$1"
  local pid_output=""
  local pid_status=0
  local recovery_used=0

  require_adb_device "$context"

  while true; do
    set +e
    pid_output="$(adb_cmd shell pidof "$PACKAGE" 2>&1 | tr -d '\r')"
    pid_status=$?
    set -e

    if [[ "$pid_status" -eq 124 ]] || grep -Eqi '(error:|adb:|device offline|device .* not found|no devices|closed)' <<< "$pid_output"; then
      if [[ "$recovery_used" -eq 0 ]] && recover_adb_device "${context} PID probe"; then
        recovery_used=1
        continue
      fi
      fail_adb_infrastructure "$context"
    fi

    if [[ "$pid_status" -ne 0 || -z "$pid_output" ]]; then
      require_adb_device "${context} post-PID verification"
      echo "ZunoPlay process is not running during ${context}." >&2
      exit 1
    fi

    PID="$pid_output"
    return 0
  done
}

if [[ ! -s "$APK" ]]; then
  echo "APK not found or empty: $APK" >&2
  exit 1
fi

require_adb_device "APK installation"
adb_cmd install -r "$APK"
adb_cmd logcat -c
: > android-runtime-logcat.txt
LOGCAT_REQUESTED=1
start_logcat

for ATTEMPT in 1 2 3; do
  echo "Runtime launch attempt ${ATTEMPT}/3"
  require_adb_device "launch attempt ${ATTEMPT} preflight"
  adb_cmd shell am force-stop "$PACKAGE"

  set +e
  START_OUTPUT="$(adb_cmd shell am start -W -n "$ACTIVITY" 2>&1 | tr -d '\r')"
  START_STATUS=$?
  set -e

  if [[ "$START_STATUS" -eq 124 ]] || grep -Eqi '(error:|adb:|device offline|device .* not found|no devices|closed)' <<< "$START_OUTPUT"; then
    if recover_adb_device "launch attempt ${ATTEMPT}"; then
      set +e
      START_OUTPUT="$(adb_cmd shell am start -W -n "$ACTIVITY" 2>&1 | tr -d '\r')"
      START_STATUS=$?
      set -e
    else
      fail_adb_infrastructure "launch attempt ${ATTEMPT}"
    fi
  fi

  if [[ "$START_STATUS" -eq 124 ]] || grep -Eqi '(error:|adb:|device offline|device .* not found|no devices|closed)' <<< "$START_OUTPUT"; then
    fail_adb_infrastructure "launch attempt ${ATTEMPT} after recovery"
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

LOGCAT_REQUESTED=0
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

valid_matches = [tuple(map(int, match)) for match in matches if int(match[1]) > 0 and int(match[3]) > 0]
if not valid_matches:
    raise SystemExit('No non-zero top/bottom web safe-area publication was recorded.')

left, top, right, bottom = valid_matches[-1]
print(f'Validated safe area: left={left} top={top} right={right} bottom={bottom}')
PY

assert_app_alive "final smoke-test verification"
echo "ZunoPlay Android 14 runtime smoke test passed with PID ${PID}."
