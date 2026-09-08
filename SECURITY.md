# Security Policy

## Supported versions

Only the latest published version is supported.

## Dependency hygiene

The repository commits `package-lock.json`, `crates/game-core/Cargo.lock`, and `src-tauri/Cargo.lock` so web, authoritative game-core, and native dependency graphs are reproducible. npm 11+ is required and enforced with `engine-strict`; direct npm dependencies must be exact-versioned, every resolved lockfile package must come from the npm registry with SHA-512 integrity, and every install script must have an explicit `allowScripts` decision with allowed scripts exact-version-pinned. Every automated install path validates that policy before `npm ci`. Required CI also checks source-version consistency, workflow/action/container pinning, rejects high or critical npm advisories, runs PR Dependency Review, verifies both Cargo lockfiles with `--locked`, scans them with RustSec, and runs Rust core tests and Clippy before the production build. The authoritative game core denies all RustSec warnings. The cross-platform Tauri lock also fails on every new RustSec warning; only a fixed, reviewed baseline is ignored. The GTK3/proc-macro baseline plus `RUSTSEC-2024-0429` is accepted only because target-filtered Cargo graphs prove those dependencies are absent from the Android and macOS release targets. Five `unic-*` unmaintained advisories (`RUSTSEC-2025-0075`, `RUSTSEC-2025-0080`, `RUSTSEC-2025-0081`, `RUSTSEC-2025-0098`, `RUSTSEC-2025-0100`) are temporarily accepted because current upstream Tauri resolves `tauri-utils` through `urlpattern` 0.3 and the discontinued `rust-unic` identifier tables; these are maintenance advisories, not known vulnerabilities. The baseline must shrink when upstream dependencies permit it, and Linux cannot become a release target while the GTK3 exceptions remain. A dedicated weekly/on-demand workflow repeats the RustSec scan so new advisories are detected without a source change. CodeQL analyzes JavaScript/TypeScript, Semgrep runs security/secrets rules, Gitleaks scans full repository history, and Dependabot monitors npm packages, both Cargo manifests, and GitHub Actions.

## Native and signing security

The Tauri shell is intentionally thin and does not own game rules, AI decisions, score, or saved game state. Native capabilities are kept minimal; the opener permission is restricted to the project URL.

Android signing material is not committed to the repository. Release automation restores the upload key from GitHub Actions secrets only for the build, writes generated signing configuration outside tracked source, and removes temporary key/configuration files after verification. Automatic native release jobs refuse to rebuild an already tagged version from a different `main` commit, record the actual checked-out source SHA, and verify the release tag resolves to that SHA immediately before uploading artifacts. GitHub Release creation and RuStore asset attachment apply the same tag/source provenance rule. RuStore app-signing private material must remain outside the repository.

## Reporting a vulnerability

Please do not disclose security vulnerabilities in public issues.

Use GitHub Private Vulnerability Reporting when it is enabled for this repository. If it is unavailable, contact the repository owner privately through an established private channel.

Do not include credentials, private keys, tokens, personal data, or other secrets in public reports.
