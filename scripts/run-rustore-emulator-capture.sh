#!/usr/bin/env bash
set -euo pipefail

apk="${1:?APK path is required}"

adb shell wm size 1080x1920
adb shell wm density 420
adb shell cmd uimode night no
adb install -r "$apk"
adb shell pm clear com.sl.dots >/dev/null
adb shell monkey -p com.sl.dots -c android.intent.category.LAUNCHER 1 >/dev/null

pid=""
for _ in {1..40}; do
  pid="$(adb shell pidof com.sl.dots 2>/dev/null | tr -d '\r')"
  [[ -n "$pid" ]] && break
  sleep 0.25
done
test -n "$pid"

socket=""
for _ in {1..60}; do
  socket="$(adb shell cat /proc/net/unix | tr -d '\r' | grep -o "webview_devtools_remote_${pid}" | head -n 1 || true)"
  if [[ -z "$socket" ]]; then
    socket="$(adb shell cat /proc/net/unix | tr -d '\r' | sed -n 's/.*@\(webview_devtools_remote_[^ ]*\).*/\1/p' | head -n 1)"
  fi
  [[ -n "$socket" ]] && break
  sleep 0.25
done

if [[ -z "$socket" ]]; then
  adb shell cat /proc/net/unix | grep -E 'webview|devtools' || true
  exit 1
fi

adb forward --remove tcp:9222 >/dev/null 2>&1 || true
adb forward tcp:9222 "localabstract:$socket"

for _ in {1..60}; do
  if curl -fsS http://127.0.0.1:9222/json >/dev/null; then
    break
  fi
  sleep 0.25
done
curl -fsS http://127.0.0.1:9222/json >/dev/null

DOTS_CDP_URL=http://127.0.0.1:9222 node scripts/capture-rustore-android.mjs store/rustore/generated
