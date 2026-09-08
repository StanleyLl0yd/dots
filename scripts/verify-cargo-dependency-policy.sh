#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
import re
import tomllib
from pathlib import Path

manifests = [
    Path("crates/game-core/Cargo.toml"),
    Path("src-tauri/Cargo.toml"),
]
locks = [
    Path("crates/game-core/Cargo.lock"),
    Path("src-tauri/Cargo.lock"),
]

exact = re.compile(r"^=\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
checksum = re.compile(r"^[0-9a-f]{64}$")
registry = "registry+https://github.com/rust-lang/crates.io-index"
direct = 0
locked = 0

def dependency_sections(data):
    for key in ("dependencies", "dev-dependencies", "build-dependencies"):
        yield data.get(key, {})
    for target in data.get("target", {}).values():
        for key in ("dependencies", "dev-dependencies", "build-dependencies"):
            yield target.get(key, {})

for manifest in manifests:
    data = tomllib.loads(manifest.read_text(encoding="utf-8"))
    for section in dependency_sections(data):
        for name, value in section.items():
            direct += 1
            if isinstance(value, str):
                if not exact.fullmatch(value):
                    raise SystemExit(f"{manifest}: {name} must use an exact Cargo version requirement")
                continue
            if not isinstance(value, dict):
                raise SystemExit(f"{manifest}: unsupported dependency declaration for {name}")
            if "git" in value or "registry" in value:
                raise SystemExit(f"{manifest}: {name} must not use a git or alternate-registry source")
            if "path" in value:
                if "version" in value and not exact.fullmatch(str(value["version"])):
                    raise SystemExit(f"{manifest}: path dependency {name} has a non-exact version")
                continue
            version = value.get("version")
            if not isinstance(version, str) or not exact.fullmatch(version):
                raise SystemExit(f"{manifest}: {name} must use an exact Cargo version requirement")

for lock in locks:
    data = tomllib.loads(lock.read_text(encoding="utf-8"))
    for package in data.get("package", []):
        source = package.get("source")
        if source is None:
            continue
        locked += 1
        if source != registry:
            raise SystemExit(f"{lock}: {package['name']} {package['version']} uses non-crates.io source {source}")
        digest = package.get("checksum")
        if not isinstance(digest, str) or not checksum.fullmatch(digest):
            raise SystemExit(f"{lock}: {package['name']} {package['version']} lacks a crates.io checksum")

print(f"Verified {direct} direct Cargo dependency declarations and {locked} registry lock entries.")
PY
