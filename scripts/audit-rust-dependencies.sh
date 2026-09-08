#!/usr/bin/env bash
set -euo pipefail

cargo audit --deny warnings --file crates/game-core/Cargo.lock

ignored=(
  RUSTSEC-2024-0429
  RUSTSEC-2024-0411
  RUSTSEC-2024-0412
  RUSTSEC-2024-0413
  RUSTSEC-2024-0414
  RUSTSEC-2024-0415
  RUSTSEC-2024-0416
  RUSTSEC-2024-0417
  RUSTSEC-2024-0418
  RUSTSEC-2024-0419
  RUSTSEC-2024-0420
  RUSTSEC-2024-0370
  RUSTSEC-2025-0075
  RUSTSEC-2025-0080
  RUSTSEC-2025-0081
  RUSTSEC-2025-0098
  RUSTSEC-2025-0100
)

args=(--deny warnings --file src-tauri/Cargo.lock)
for advisory in "${ignored[@]}"; do
  args+=(--ignore "$advisory")
done

cargo audit "${args[@]}"
bash scripts/verify-rust-advisory-scope.sh
