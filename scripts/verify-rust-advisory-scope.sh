#!/usr/bin/env bash
set -euo pipefail

if (( $# > 0 )); then
  targets=("$@")
else
  targets=(
    aarch64-linux-android
    armv7-linux-androideabi
    aarch64-apple-darwin
    x86_64-apple-darwin
  )
fi

blocked='^(atk|atk-sys|gdk|gdk-sys|gdkwayland-sys|gdkx11|gdkx11-sys|gtk|gtk-sys|gtk3-macros|proc-macro-error) v|^glib v0\.(15|16|17|18|19)\.'

for target in "${targets[@]}"; do
  tree="$(cargo tree \
    --manifest-path src-tauri/Cargo.toml \
    --locked \
    --target "$target" \
    --edges normal,build \
    --prefix none \
    --format '{p}')"

  if grep -Eq "$blocked" <<<"$tree"; then
    echo "Ignored GTK3/proc-macro/glib advisory dependency is reachable for release target $target" >&2
    grep -E "$blocked" <<<"$tree" >&2 || true
    exit 1
  fi
done

echo "Verified ignored GTK3/proc-macro/glib advisories are outside the selected release target graphs."
