<div align="center">

# 🔴·🔵 DOTS

### SURROUND · CAPTURE · CONTROL

<img src="docs/assets/readme/dots-board.svg" alt="Dots game board" width="100%">

[![CI](https://img.shields.io/github/actions/workflow/status/StanleyLl0yd/dots/ci.yml?branch=main&label=CI&labelColor=2b2925&color=16A34A)](https://github.com/StanleyLl0yd/dots/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-2563EB?labelColor=2b2925&logo=githubpages&logoColor=ffffff)](https://stanleyll0yd.github.io/dots/)
[![PWA](https://img.shields.io/badge/PWA-ready%20foundation-E11D48?labelColor=2b2925&logo=pwa&logoColor=ffffff)](https://stanleyll0yd.github.io/dots/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-2563EB?labelColor=2b2925&logo=typescript&logoColor=ffffff)](https://www.typescriptlang.org/)
[![Source version](https://img.shields.io/badge/source-0.1.0-16A34A?labelColor=2b2925)](package.json)
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-E11D48?labelColor=2b2925)](LICENSE)

[![English](https://img.shields.io/badge/lang-EN-2563EB?labelColor=2b2925)](README.md)
[![Русский](https://img.shields.io/badge/lang-RU-E11D48?labelColor=2b2925)](README_RU.md)

A minimalist digital version of the classic **Dots / Tochki** surround-and-capture strategy game.

[**▶ Open current web build**](https://stanleyll0yd.github.io/dots/)

</div>

**Dots** turns squared paper and two colored pens into a clean browser game. Players alternate placing dots on grid intersections. A closed chain of your dots captures opponent dots inside it and claims the enclosed area.

Current source version: **0.1.0** · repository foundation · Web + PWA · GitHub Pages live

## 🎯 Rules

1. Red moves first by default.
2. Players alternate placing one dot on a legal empty grid intersection.
3. Every two consecutive dots of a boundary must be on neighboring grid intersections: exactly one grid step horizontally, vertically, or diagonally. Gaps and long segments are not allowed.
4. The last boundary dot must also be adjacent to the first, forming a closed chain.
5. A closed chain captures when it encloses at least one opponent dot.
6. Captured opponent dots count toward the surrounding player's score.
7. A closed empty area is a **house**, not a scored capture.
8. Captured areas can themselves be surrounded, allowing previously captured dots to be released.
9. The player with more currently captured opponent dots has the higher score.

The authoritative implementation rules and edge cases are tracked in [`docs/PRODUCT.md`](docs/PRODUCT.md).

## ✨ Repository foundation

- TypeScript game core;
- HTML5 Canvas board shell;
- local two-player placement scaffold;
- Russian UI when Russian is present in browser/system locales, English otherwise;
- responsive desktop/mobile layout;
- light and dark presentation;
- installable PWA foundation;
- offline-ready build pipeline;
- Vitest test setup;
- CI on pushes and pull requests;
- automatic GitHub Pages deployment workflow;
- proprietary All Rights Reserved license;
- architecture and product documentation for the capture engine.

The capture engine is intentionally specified before implementation because enclosure topology is the critical correctness problem in this game.

## 🧱 Technology

| Category | Technology |
| --- | --- |
| Language | TypeScript 5.9 |
| Rendering | HTML5 Canvas |
| Build | Vite 7 |
| PWA | vite-plugin-pwa / Workbox |
| Tests | Vitest |
| Persistence | planned localStorage |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

## 🗂 Architecture

```text
src/
├── game/
│   ├── board.ts           board state and legal occupancy
│   ├── board.test.ts      game-core tests
│   └── types.ts           domain types
├── ui/
│   └── canvas-board.ts    Canvas rendering and pointer input
├── i18n.ts                Russian / English interface
├── i18n.test.ts           locale tests
├── main.ts                application composition
└── styles.css             notebook-inspired visual layer
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the capture-engine design target.

## 🛠 Development

Requirements: Node.js 22+ and npm.

```bash
git clone https://github.com/StanleyLl0yd/dots.git
cd dots
npm install
npm run dev
```

Verification:

```bash
npm test
npm run build
```

## 🗺 Roadmap

1. Complete and test the classic capture engine.
2. Add houses, nested captures, capture release, and score derivation.
3. Add board panning/zooming, persistence, undo, and polished touch controls.
4. Stabilize PWA/offline behavior and publish the first complete web release.
5. Consider AI only after the rules engine is proven.
6. Optionally package the same codebase for Android through Capacitor later.

## 📄 License

Copyright © 2026 **Stanley Lloyd**. All rights reserved.

This repository is publicly visible for source inspection. Public availability **does not grant permission** to copy, modify, adapt, translate, distribute, publish, mirror, create derivative works, incorporate the code into another product, or otherwise reuse repository contents.

Only end-user use of the officially hosted Dots application is permitted. Any other use requires prior written permission from the copyright holder. See [`LICENSE`](LICENSE) for the authoritative terms.

## 👨‍💻 Author

**Stanley Lloyd** · [@StanleyLl0yd](https://github.com/StanleyLl0yd)

---

<div align="center">

**🔴 · 🔵 · CLOSE THE LOOP**

</div>
