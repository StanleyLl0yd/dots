#!/usr/bin/env bash
set -euo pipefail

apk="${1:?APK path is required}"

adb shell wm size 1080x1920
adb shell wm density 420
adb shell cmd uimode night no
adb install -r "$apk"
adb shell pm clear com.sl.dots >/dev/null
adb shell settings put secure immersive_mode_confirmations confirmed || true
adb shell settings put global policy_control immersive.full=com.sl.dots || true
adb shell am start -W -n com.sl.dots/.MainActivity >/dev/null
sleep 1
adb shell input tap 920 500 || true
sleep 0.5
adb shell settings put secure immersive_mode_confirmations confirmed || true

pid=""
for _ in {1..80}; do
  pid="$(adb shell pidof com.sl.dots 2>/dev/null | tr -d '\r')"
  [[ -n "$pid" ]] && break
  sleep 0.25
done
if [[ -z "$pid" ]]; then
  adb shell dumpsys activity activities | grep -A 3 -B 3 com.sl.dots || true
  exit 1
fi

adb forward --remove tcp:9222 >/dev/null 2>&1 || true
adb forward tcp:9222 "localabstract:webview_devtools_remote_${pid}"

for _ in {1..80}; do
  if curl -fsS http://127.0.0.1:9222/json >/dev/null; then
    break
  fi
  sleep 0.25
done

if ! curl -fsS http://127.0.0.1:9222/json >/dev/null; then
  adb shell dumpsys activity activities | grep -A 3 -B 3 com.sl.dots || true
  exit 1
fi

DOTS_CDP_URL=http://127.0.0.1:9222 node scripts/capture-rustore-android.mjs store/rustore/generated
