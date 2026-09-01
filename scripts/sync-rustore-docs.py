import re
from pathlib import Path

VERSION = "0.9.3"

readme = Path("README.md")
text = readme.read_text(encoding="utf-8")
text = text.replace("source-0.9.1-16A34A", "source-0.9.3-16A34A")
text = re.sub(
    r"Current source version: \*\*0\.9\.1\*\* ·[^\n]*",
    "Current source version: **0.9.3** · RuStore-ready AAB release + native Tauri shell + classic advanced rules + four-level local computer play + hardened Worker/PWA lifecycle + audited reproducible toolchain",
    text,
)
text = re.sub(
    r"Version \*\*0\.9\.1\*\* is the stabilized pre-1\.0 release-candidate patch\.[^\n]*",
    "Version **0.9.3** is the RuStore-ready native distribution release. Android publication now uses a signed AAB with a dedicated upload key, reproducible store assets, and published privacy/terms pages. Gameplay, rules, save schemas, AI search policy, scoring, and web/PWA behavior remain unchanged.",
    text,
)
text = text.replace(
    "| PWA | vite-plugin-pwa / Workbox |",
    "| PWA | vite-plugin-pwa / Workbox |\n| Native shell | Tauri 2 |",
)
text = text.replace(
    "scripts/\n└── verify-build.mjs       production PWA/AI-worker artifact verification",
    "scripts/\n├── verify-build.mjs              production PWA/AI-worker artifact verification\n├── capture-rustore-assets.mjs    deterministic RuStore screenshots\n├── setup-rustore-signing.ps1     app/upload signing-key setup\n└── prepare-rustore-pepk.ps1      RuStore PEPK export helper",
)
text = re.sub(
    r"## 🗺 Roadmap\n.*?\n## 📄 License",
    "## 🗺 Roadmap\n\n1. Publish and validate the 0.9.3 Android AAB in RuStore using the dedicated app-signing/upload-key flow.\n2. Continue real-device Android/macOS and installed-PWA validation and fix concrete regressions only.\n3. Continue adversarial topology and tactical AI validation without speculative feature expansion before 1.0.\n4. Release **1.0.0** after clean real-device, persistence, offline/update, Worker-cancellation, accessibility, and long-game checks.\n\n## 📄 License",
    text,
    flags=re.S,
)
readme.write_text(text, encoding="utf-8")

readme_ru = Path("README_RU.md")
text = readme_ru.read_text(encoding="utf-8")
text = text.replace("source-0.9.1-16A34A", "source-0.9.3-16A34A")
text = re.sub(
    r"Текущая версия исходников: \*\*0\.9\.1\*\* ·[^\n]*",
    "Текущая версия исходников: **0.9.3** · готовый для RuStore AAB + нативная оболочка Tauri + классические расширенные правила + четыре уровня локального компьютера + усиленный Worker/PWA lifecycle + воспроизводимый проверяемый toolchain",
    text,
)
text = re.sub(
    r"Версия \*\*0\.9\.1\*\*[^\n]*",
    "Версия **0.9.3** подготовлена для нативной публикации в RuStore. Android-сборка теперь выпускается как подписанный AAB с отдельным upload key, воспроизводимыми материалами магазина и опубликованными страницами политики конфиденциальности/пользовательского соглашения. Игровые правила, формат сохранений, политика поиска ИИ, счёт и поведение web/PWA не изменены.",
    text,
    count=1,
)
text = text.replace(
    "| PWA | vite-plugin-pwa / Workbox |",
    "| PWA | vite-plugin-pwa / Workbox |\n| Нативная оболочка | Tauri 2 |",
)
text = text.replace(
    "scripts/\n└── verify-build.mjs       проверка production PWA/AI-worker артефактов",
    "scripts/\n├── verify-build.mjs              проверка production PWA/AI-worker артефактов\n├── capture-rustore-assets.mjs    детерминированные скриншоты RuStore\n├── setup-rustore-signing.ps1     подготовка app/upload ключей подписи\n└── prepare-rustore-pepk.ps1      подготовка PEPK-архива RuStore",
)
text = re.sub(
    r"## 🗺 План\n.*?\n## 📄 Лицензия",
    "## 🗺 План\n\n1. Опубликовать и проверить Android AAB 0.9.3 в RuStore через отдельные app-signing и upload keys.\n2. Продолжать проверку Android/macOS и установленной PWA на реальных устройствах и исправлять только конкретные регрессии.\n3. Усиливать топологические и тактические проверки ИИ без спекулятивного расширения возможностей до 1.0.\n4. Выпустить **1.0.0** после чистой проверки реальных устройств, сохранений, offline/update, отмены Worker, доступности и длинных партий.\n\n## 📄 Лицензия",
    text,
    flags=re.S,
)
readme_ru.write_text(text, encoding="utf-8")

changelog = Path("CHANGELOG.md")
text = changelog.read_text(encoding="utf-8")
section = """## [0.9.3] - 2026-09-01

### Added

- RuStore publication package with privacy policy, user agreement, Russian store metadata, and reproducible 512×512 icon, 1080×607 promo banner, and four 1080×1920 screenshots;
- dedicated local signing helpers that keep the RuStore app-signing private key offline and store only the separate AAB upload key in GitHub Actions secrets;
- AAB verification through JAR signature validation, Bundletool manifest inspection, and universal-APK generation before release upload.

### Changed

- Android native releases now produce an upload-key-signed Android App Bundle (`.aab`) instead of an APK while macOS continues to publish a universal DMG;
- source version advanced to 0.9.3 with no gameplay, rules, save-format, AI, scoring, or web/PWA behavior changes.

"""
if "## [0.9.3]" not in text:
    text = text.replace("## [Unreleased]\n\n", "## [Unreleased]\n\n" + section, 1)
changelog.write_text(text, encoding="utf-8")

checks = {
    "README.md": ["source-0.9.3", "Current source version: **0.9.3**", "| Native shell | Tauri 2 |", "Publish and validate the 0.9.3 Android AAB"],
    "README_RU.md": ["source-0.9.3", "Текущая версия исходников: **0.9.3**", "| Нативная оболочка | Tauri 2 |", "Опубликовать и проверить Android AAB 0.9.3"],
    "CHANGELOG.md": ["## [0.9.3] - 2026-09-01", "Android App Bundle (`.aab`)"],
}
for filename, needles in checks.items():
    content = Path(filename).read_text(encoding="utf-8")
    missing = [needle for needle in needles if needle not in content]
    if missing:
        raise SystemExit(f"{filename}: missing expected text: {missing}")
