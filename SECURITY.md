# Security Policy

## Supported versions

Only the latest published version is supported.

## Dependency hygiene

The repository commits both `package-lock.json` and `src-tauri/Cargo.lock` so web and native dependency graphs are reproducible. CI uses `npm ci` and runs `npm audit --audit-level=high` before tests and production builds; high or critical npm advisories fail verification. Native release automation verifies that the committed Cargo lockfile still resolves with `--locked`. Dependabot monitors npm packages, Cargo dependencies, and GitHub Actions.

## Native and signing security

The Tauri shell is intentionally thin and does not own game rules, AI decisions, score, or saved game state. Native capabilities are kept minimal; the opener permission is restricted to the project URL.

Android signing material is not committed to the repository. Release automation restores the upload key from GitHub Actions secrets only for the build, writes generated signing configuration outside tracked source, and removes temporary key/configuration files after verification. RuStore app-signing private material must remain outside the repository.

## Reporting a vulnerability

Please do not disclose security vulnerabilities in public issues.

Use GitHub Private Vulnerability Reporting when it is enabled for this repository. If it is unavailable, contact the repository owner privately through an established private channel.

Do not include credentials, private keys, tokens, personal data, or other secrets in public reports.
