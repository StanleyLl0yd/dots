from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label}: expected text not found")
    return text.replace(old, new, 1)


native_path = Path(".github/workflows/native-release.yml")
native = native_path.read_text(encoding="utf-8")
native = native.replace("cargo tauri icon public/pwa-192.png", "npm run prepare:icons")
native_path.write_text(native, encoding="utf-8")

verify_path = Path("scripts/verify-build.mjs")
verify = verify_path.read_text(encoding="utf-8")
verify = replace_once(
    verify,
    'for (const file of ["sw.js", "pwa-192.png", "icon.svg", "apple-touch-icon.png"]) {',
    'for (const file of ["sw.js", "favicon-32.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) {',
    "PWA asset verification",
)
verify = replace_once(
    verify,
    'if (!manifest.icons.some((icon) => icon.sizes === "any" && icon.type === "image/svg+xml")) {\n  throw new Error("Missing scalable SVG PWA icon");\n}',
    'if (!manifest.icons.some((icon) => icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "any")) {\n  throw new Error("Missing 512x512 PNG PWA icon");\n}\nif (!manifest.icons.some((icon) => icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "maskable")) {\n  throw new Error("Missing maskable 512x512 PNG PWA icon");\n}',
    "PWA manifest icon verification",
)
verify_path.write_text(verify, encoding="utf-8")
