from __future__ import annotations

import json
import re
from pathlib import Path

VERSION = "0.9.5"


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label}: expected text not found")
    return text.replace(old, new, 1)


pkg_path = Path("package.json")
pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
pkg["version"] = VERSION
pkg["scripts"]["prepare:icons"] = "node scripts/prepare-icon-assets.mjs"
pkg["scripts"]["build"] = (
    "npm run prepare:icons && npm run verify:source && npm run wasm:build && "
    "tsc --noEmit && vite build && node scripts/verify-build.mjs"
)
pkg["scripts"]["build:native"] = (
    "npm run prepare:icons && npm run verify:source && tsc --noEmit && vite build && "
    "node scripts/verify-build.mjs --native"
)
pkg["devDependencies"]["@tauri-apps/cli"] = "2.11.4"
pkg_path.write_text(json.dumps(pkg, indent=2) + "\n", encoding="utf-8")

vite = read("vite.config.ts")
vite = replace_once(
    vite,
    '      includeAssets: ["icon.svg", "pwa-192.png", "apple-touch-icon.png"],',
    '      includeAssets: ["favicon-32.png", "icon-192.png", "icon-512.png", '
    '"icon-maskable-512.png", "apple-touch-icon.png"],',
    "vite includeAssets",
)
old_icons = """        icons: [
          {
            src: \"pwa-192.png\",
            sizes: \"192x192\",
            type: \"image/png\",
            purpose: \"any\"
          },
          {
            src: \"icon.svg\",
            sizes: \"any\",
            type: \"image/svg+xml\",
            purpose: \"any maskable\"
          }
        ]"""
new_icons = """        icons: [
          {
            src: \"icon-192.png\",
            sizes: \"192x192\",
            type: \"image/png\",
            purpose: \"any\"
          },
          {
            src: \"icon-512.png\",
            sizes: \"512x512\",
            type: \"image/png\",
            purpose: \"any\"
          },
          {
            src: \"icon-maskable-512.png\",
            sizes: \"512x512\",
            type: \"image/png\",
            purpose: \"maskable\"
          }
        ]"""
vite = replace_once(vite, old_icons, new_icons, "vite manifest icons")
write("vite.config.ts", vite)

index = read("index.html")
index = replace_once(
    index,
    '<link rel="icon" href="./icon.svg" type="image/svg+xml" />',
    '<link rel="icon" href="./favicon-32.png" type="image/png" />',
    "index favicon",
)
write("index.html", index)

tauri_path = Path("src-tauri/tauri.conf.json")
tauri = json.loads(tauri_path.read_text(encoding="utf-8"))
tauri["version"] = VERSION
tauri["bundle"]["icon"] = [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico",
]
tauri_path.write_text(json.dumps(tauri, indent=2) + "\n", encoding="utf-8")

for cargo_path in ("src-tauri/Cargo.toml", "crates/game-core/Cargo.toml"):
    cargo = read(cargo_path)
    cargo = replace_once(cargo, 'version = "0.9.4"', 'version = "0.9.5"', cargo_path)
    write(cargo_path, cargo)

native_path = Path(".github/workflows/native-release.yml")
native = native_path.read_text(encoding="utf-8")
if "      - branding/**\n" not in native:
    native = replace_once(
        native,
        "      - src-tauri/**\n      - scripts/build-game-core-wasm.mjs",
        "      - src-tauri/**\n      - branding/**\n      - scripts/prepare-icon-assets.mjs\n"
        "      - scripts/build-game-core-wasm.mjs",
        "native release paths",
    )
native = replace_once(
    native,
    "          cargo tauri android init --ci\n          cargo tauri icon public/pwa-192.png\n",
    "          cargo tauri android init --ci\n          npm run prepare:icons\n",
    "native Android icon generation",
)
native_path.write_text(native, encoding="utf-8")

rustore_path = Path(".github/workflows/rustore-assets.yml")
rustore = rustore_path.read_text(encoding="utf-8")
if "      - branding/**\n" not in rustore:
    rustore = replace_once(
        rustore,
        "      - package.json\n      - scripts/capture-rustore-android.mjs",
        "      - package.json\n      - branding/**\n      - scripts/prepare-icon-assets.mjs\n"
        "      - scripts/capture-rustore-android.mjs",
        "RuStore paths",
    )
install_old = """          npm ci
          npm audit --audit-level=high
          npm test
          npm install --no-save --package-lock=false @tauri-apps/cli@2.11.4
          node - <<'NODE'
          const fs = require('node:fs');
          const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
          pkg.scripts.tauri = 'tauri';
          fs.writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\\n`);
          NODE
          python3 -m pip install --disable-pip-version-check pillow==11.3.0
"""
install_new = """          npm ci
          npm audit --audit-level=high
          npm test
          python3 -m pip install --disable-pip-version-check pillow==11.3.0
"""
rustore = replace_once(rustore, install_old, install_new, "RuStore dependency setup")
rustore = replace_once(
    rustore,
    "          npx tauri android init --ci\n",
    "          npx tauri android init --ci\n          npm run prepare:icons\n",
    "RuStore Android init",
)
rustore = rustore.replace("          npx tauri icon public/pwa-192.png\n", "", 1)
icon_block = re.compile(
    r"\n          icon = Image\.new\('RGB', \(512, 512\), '#f4efe5'\).*?"
    r"          icon\.save\(out / 'icon-512\.png', optimize=True\)\n",
    re.S,
)
rustore, count = icon_block.subn("", rustore, count=1)
if count != 1:
    raise SystemExit("RuStore legacy icon drawing block not found")
marker = "          out = Path('store/rustore/generated')\n          out.mkdir(parents=True, exist_ok=True)\n"
replacement = (
    marker
    + "          source_icon = Path('public/icon-512.png')\n"
    + "          target_icon = out / 'icon-512.png'\n"
    + "          target_icon.write_bytes(source_icon.read_bytes())\n"
)
rustore = replace_once(rustore, marker, replacement, "RuStore output directory")
rustore_path.write_text(rustore, encoding="utf-8")

release_path = Path(".github/workflows/release.yml")
release = release_path.read_text(encoding="utf-8")
if "      - branding/**\n" not in release:
    release = replace_once(
        release,
        "      - crates/game-core/**\n",
        "      - crates/game-core/**\n      - branding/**\n      - scripts/prepare-icon-assets.mjs\n",
        "release paths",
    )
release_path.write_text(release, encoding="utf-8")

store_readme = read("store/rustore/README.md")
store_readme = replace_once(
    store_readme,
    "The workflow creates a 512×512 icon, 1080×607 promo banner, and four 1080×1920 "
    "screenshots, verifies dimensions, zips the set, and uploads it as a workflow artifact.",
    "The workflow derives the 512×512 store icon from `branding/dots-icon-master.png`, "
    "creates a 1080×607 promo banner and four 1080×1920 screenshots, verifies dimensions, "
    "zips the set, and uploads it as a workflow artifact.",
    "RuStore README",
)
write("store/rustore/README.md", store_readme)

agents_path = Path("AGENTS.md")
agents = agents_path.read_text(encoding="utf-8")
if "## App icon source artwork" not in agents:
    agents += """
## App icon source artwork

- When the project owner provides a new app icon as a PNG and identifies it as the app icon, treat that exact PNG as the canonical source artwork.
- Keep that source as the original raster PNG. Do not trace, vectorize, redraw, restyle, recreate, or convert it to SVG, vector PDF, Android VectorDrawable, SF Symbol, or any other vector representation unless the project owner explicitly requests it.
- Do not overwrite, recompress, optimize in place, or otherwise rewrite the canonical PNG. Keep the uploaded source unchanged.
- Platform-required derivatives may be generated only as raster derivatives of that PNG. Resizing and required raster packaging/container formats such as PNG size variants, ICO, or ICNS are allowed, but the visible artwork must remain unchanged: no cropping, padding, color changes, removed details, or other design edits unless explicitly requested.
- Once a replacement PNG is explicitly supplied as the app icon, derive required platform icons from that raster source rather than converting it to a vector source.
"""
agents_path.write_text(agents, encoding="utf-8")

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text(encoding="utf-8")
if "## [0.9.5]" not in changelog:
    section = """## [0.9.5] - 2026-09-03

### Added

- canonical `branding/dots-icon-master.png` raster source of truth plus deterministic platform icon preparation for Web/PWA and Tauri builds;
- explicit raster-source preservation rules preventing accidental tracing, vector replacement, in-place recompression, cropping, padding, recoloring, or other artwork changes.

### Changed

- Web/PWA favicon and install icons, Tauri desktop/macOS icons, Android launcher/adaptive/round icons, and the RuStore 512×512 store icon now derive from the same approved raster master;
- removed the legacy SVG/PWA icon path and the separately drawn RuStore icon, and removed stale Android icon generation from native/store release workflows;
- source version advanced to 0.9.5 with no gameplay, rules, save-format, AI, scoring, accessibility, SDK/NDK/ABI, or native-hardening behavior changes.

"""
    changelog = replace_once(changelog, "## [Unreleased]\n\n", "## [Unreleased]\n\n" + section, "CHANGELOG")
changelog_path.write_text(changelog, encoding="utf-8")

readme_path = Path("README.md")
readme = readme_path.read_text(encoding="utf-8")
readme = replace_once(readme, "source-0.9.4-", "source-0.9.5-", "README badge")
readme = replace_once(
    readme,
    "Current source version: **0.9.4**",
    "Current source version: **0.9.5**",
    "README current version",
)
version_marker = "Version **0.9.4** hardens the 0.9.3 native/RuStore baseline"
if "Version **0.9.5** refreshes the application identity" not in readme:
    readme = replace_once(
        readme,
        version_marker,
        "Version **0.9.5** refreshes the application identity from one preserved raster master "
        "across Web/PWA, Tauri desktop, Android launcher, and RuStore store assets. Gameplay, "
        "rules, saves, AI, accessibility, and native hardening are unchanged.\n\n" + version_marker,
        "README release summary",
    )
readme = readme.replace(
    "Publish and validate the 0.9.4 Android AAB",
    "Publish and validate the 0.9.5 Android AAB",
    1,
)
readme_path.write_text(readme, encoding="utf-8")

ru_path = Path("README_RU.md")
ru = ru_path.read_text(encoding="utf-8")
ru = replace_once(ru, "source-0.9.4-", "source-0.9.5-", "README_RU badge")
ru = replace_once(
    ru,
    "Текущая версия исходников: **0.9.4**",
    "Текущая версия исходников: **0.9.5**",
    "README_RU current version",
)
ru_marker = "Версия **0.9.4**"
if "Версия **0.9.5** обновляет идентичность приложения" not in ru and ru_marker in ru:
    ru = ru.replace(
        ru_marker,
        "Версия **0.9.5** обновляет идентичность приложения: Web/PWA, Tauri desktop, Android "
        "launcher и иконка RuStore теперь выводятся из одного сохранённого raster master. "
        "Игровые правила, сохранения, ИИ, доступность и native hardening не изменены.\n\n"
        + ru_marker,
        1,
    )
ru_path.write_text(ru, encoding="utf-8")

Path("public/icon.svg").unlink(missing_ok=True)
Path("public/pwa-192.png").unlink(missing_ok=True)
