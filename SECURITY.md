# Security Policy

## Supported versions

Only the latest published version is supported.

## Dependency hygiene

The repository commits `package-lock.json`, `crates/game-core/Cargo.lock`, and `src-tauri/Cargo.lock` so web, authoritative game-core, and native dependency graphs are reproducible. Every automated npm install path validates the lockfile install-script policy before `npm ci`: each package with an install script must have an explicit `allowScripts` decision and every allowed script must be version-pinned. Required CI also rejects high or critical npm advisories, verifies both Cargo lockfiles with `--locked`, scans them with RustSec, and runs Rust core tests and Clippy before the production build. The authoritative game core denies all RustSec warnings. The cross-platform Tauri lock denies vulnerabilities, yanked crates, and unsound advisories, with one explicit exception for `RUSTSEC-2024-0429`: current upstream Tauri still locks the affected `glib` 0.18 through its Linux-only GTK3 backend, while Dots native releases target Android and macOS. GTK3/unmaintained informational warnings remain visible, and the exception must be removed if Tauri stops requiring that Linux stack or if Linux becomes a release target. A dedicated weekly/on-demand workflow repeats the scan so new advisories are detected without a source change. Dependabot monitors npm packages, both Cargo manifests, and GitHub Actions.

## Native and signing security

The Tauri shell is intentionally thin and does not own game rules, AI decisions, score, or saved game state. Native capabilities are kept minimal; the opener permission is restricted to the project URL.

Android signing material is not committed to the repository. Release automation restores the upload key from GitHub Actions secrets only for the build, writes generated signing configuration outside tracked source, and removes temporary key/configuration files after verification. RuStore app-signing private material must remain outside the repository.

## Reporting a vulnerability

Please do not disclose security vulnerabilities in public issues.

Use GitHub Private Vulnerability Reporting when it is enabled for this repository. If it is unavailable, contact the repository owner privately through an established private channel.

Do not include credentials, private keys, tokens, personal data, or other secrets in public reports.
