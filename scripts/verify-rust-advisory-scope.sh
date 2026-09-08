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

for target in "${targets[@]}"; do
  tree="$(cargo tree \
    --manifest-path src-tauri/Cargo.toml \
    --locked \
    --target "$target" \
    --edges normal,build \
    --prefix none \
    --format '{p}')"

  if grep -Eq '^glib v0\.(15|16|17|18|19)\.' <<<"$tree"; then
    echo "RUSTSEC-2024-0429 affected glib is reachable for release target $target" >&2
    exit 1
  fi
done

echo "Verified RUSTSEC-2024-0429 is outside the selected release target graphs."
