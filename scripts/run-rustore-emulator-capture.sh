#!/usr/bin/env bash
set -euo pipefail

apk="${1:?APK path is required}"
out="store/rustore/generated"
mkdir -p "$out"

capture() {
  adb exec-out screencap -p > "$out/$1"
}

adb shell wm size 1080x1920
adb shell wm density 420
adb shell cmd uimode night no
adb install -r "$apk"
adb shell am force-stop com.sl.dots
adb shell monkey -p com.sl.dots -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 4

for point in \
  "420 820" "540 820" "420 940" "540 940" \
  "420 1060" "540 1060" "660 1060" "660 940" \
  "660 820" "540 700" "420 700" "660 700"; do
  adb shell input tap $point
  sleep 0.12
done
sleep 1
capture "01-game-capture.png"

adb shell input tap 270 240
sleep 0.4
adb shell input keyevent KEYCODE_DPAD_DOWN
adb shell input keyevent KEYCODE_ENTER
sleep 2
capture "02-vs-computer.png"

adb shell input tap 670 370
sleep 1
capture "03-help.png"

adb shell input keyevent KEYCODE_BACK
sleep 0.6
adb shell input tap 1010 130
sleep 1
capture "04-about.png"
