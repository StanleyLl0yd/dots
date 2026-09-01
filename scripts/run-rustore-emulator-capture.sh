#!/usr/bin/env bash
set -euo pipefail

apk="${1:?APK path is required}"

adb shell wm size 1080x1920
adb shell wm density 420
adb shell cmd uimode night no
adb install -r "$apk"
adb shell am force-stop com.sl.dots
adb shell monkey -p com.sl.dots -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 4
adb shell dumpsys window | grep -F 'com.sl.dots' >/dev/null

socket="$(adb shell cat /proc/net/unix | tr -d '\r' | sed -n 's/.*@\(webview_devtools_remote_[^ ]*\).*/\1/p' | head -n 1)"
if [[ -z "$socket" ]]; then
  adb shell cat /proc/net/unix | grep -E 'webview|devtools' || true
  exit 1
fi

adb forward tcp:9222 "localabstract:$socket"
for _ in {1..30}; do
  if curl -fsS http://127.0.0.1:9222/json >/dev/null; then
    break
  fi
  sleep 1
done
curl -fsS http://127.0.0.1:9222/json >/dev/null
node scripts/capture-rustore-android.mjs store/rustore/generated
