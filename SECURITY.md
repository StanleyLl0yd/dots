# Security Policy

## Supported versions

Only the latest published version is supported.

## Dependency hygiene

The repository commits `package-lock.json`, `crates/game-core/Cargo.lock`, and `src-tauri/Cargo.lock` so web, authoritative game-core, and native dependency graphs are reproducible. Required CI uses `npm ci`, rejects high or critical npm advisories, verifies both Cargo lockfiles with `--locked`, and runs Rust core tests and Clippy before the production build. A dedicated Rust dependency-security workflow scans both lockfiles against the RustSec advisory database on relevant pull requests and `main` changes, on a weekly schedule, and on demand. The native shell check and native release automation also resolve Cargo dependencies with `--locked`. Dependabot monitors npm packages, both Cargo manifests, and GitHub Actions.

## Native and signing security

The Tauri shell is intentionally thin and does not own game rules, AI decisions, score, or saved game state. Native capabilities are kept minimal; the opener permission is restricted to the project URL.

Android signing material is not committed to the repository. Release automation restores the upload key from GitHub Actions secrets only for the build, writes generated signing configuration outside tracked source, and removes temporary key/configuration files after verification. RuStore app-signing private material must remain outside the repository.

## Reporting a vulnerability

Please do not disclose security vulnerabilities in public issues.

Use GitHub Private Vulnerability Reporting when it is enabled for this repository. If it is unavailable, contact the repository owner privately through an established private channel.

Do not include credentials, private keys, tokens, personal data, or other secrets in public reports.
