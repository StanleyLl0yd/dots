# Security Policy

## Supported versions

Only the latest published version is supported.

## Dependency hygiene

The repository commits `package-lock.json` and uses `npm ci` in CI and GitHub Pages for reproducible installs. CI runs `npm audit --audit-level=high` before tests and production build; high or critical dependency advisories fail verification. Dependabot monitors both npm packages and GitHub Actions.

## Reporting a vulnerability

Please do not disclose security vulnerabilities in public issues.

Use GitHub Private Vulnerability Reporting when it is enabled for this repository. If it is unavailable, contact the repository owner privately through an established private channel.

Do not include credentials, private keys, tokens, personal data, or other secrets in public reports.
