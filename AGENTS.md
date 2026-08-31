# AGENTS.md

## Project rules

- Inspect the existing implementation before changing it.
- Preserve the core product: classic Dots / Tochki based on surrounding and capturing opponent dots. Do not add progression systems, resources, power-ups, world maps, unrelated meta mechanics, or rule-changing features unless explicitly approved.
- Keep the web implementation based on TypeScript, HTML5 Canvas, Vite, and PWA unless a change is explicitly approved.
- Keep game rules, capture detection, scoring, and future AI independent from rendering and browser UI where practical.
- Treat the rules in `docs/PRODUCT.md` as authoritative for this repository.
- Prefer the smallest correct implementation and avoid speculative abstractions.
- Do not introduce a dependency without a concrete need.
- Do not add analytics, ads, accounts, backend services, tracking, or unnecessary network access unless explicitly requested.
- Preserve offline/PWA behavior and GitHub Pages compatibility.
- Maintain Russian and English user-facing text. Russian must be selected when the browser or resolved system locale includes Russian; English is the fallback.
- Add or update tests for game rules, capture detection, scoring, locale handling, and regressions where practical.
- Run relevant tests and the production build before considering a task complete.
- Never commit passwords, API keys, tokens, private keys, signing material, local environment files, or generated secrets.
- Comments must be minimal, necessary, current, and English-only.
- Do not keep commented-out code or obsolete TODOs.
- Source identifiers must be English.
- Keep `main` buildable and use focused commits and pull requests.
- After every release, review and update all repository text files so they accurately reflect the released state.
- Preserve the established formatting and visual presentation of text files during release updates; add, change, or remove formatting only when there is a compelling or urgent need.
