<div align="center">

# 🔴·🔵 DOTS

### SURROUND · CAPTURE · CONTROL

<img src="docs/assets/readme/dots-board.webp" alt="Dots game board" width="100%">

[![CI](https://img.shields.io/github/actions/workflow/status/StanleyLl0yd/dots/ci.yml?branch=main&label=CI&labelColor=2b2925&color=16A34A)](https://github.com/StanleyLl0yd/dots/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-2563EB?labelColor=2b2925&logo=githubpages&logoColor=ffffff)](https://stanleyll0yd.github.io/dots/)
[![PWA](https://img.shields.io/badge/PWA-ready-E11D48?labelColor=2b2925&logo=pwa&logoColor=ffffff)](https://stanleyll0yd.github.io/dots/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-2563EB?labelColor=2b2925&logo=typescript&logoColor=ffffff)](https://www.typescriptlang.org/)
[![Source version](https://img.shields.io/badge/source-0.5.0-16A34A?labelColor=2b2925)](package.json)
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-E11D48?labelColor=2b2925)](LICENSE)

[![English](https://img.shields.io/badge/lang-EN-2563EB?labelColor=2b2925)](README.md)
[![Русский](https://img.shields.io/badge/lang-RU-E11D48?labelColor=2b2925)](README_RU.md)

A minimalist digital version of the classic **Dots / Tochki** surround-and-capture strategy game.

[**▶ Open current web build**](https://stanleyll0yd.github.io/dots/)

</div>

**Dots** turns squared paper and two colored pens into a clean browser game. Players alternate placing dots on grid intersections. When a valid neighboring-dot boundary is actually closed around opponent dots, the captured area is outlined and lightly hatched.

Current source version: **0.5.0** · advanced capture rules + reversible sessions + practically unbounded board + hardened PWA/accessibility · GitHub Pages live

## 🎯 Rules

1. Red moves first by default.
2. Players alternate placing one dot on a legal empty grid intersection.
3. Every two consecutive dots of a boundary must be on neighboring grid intersections: exactly one grid step horizontally, vertically, or diagonally. Gaps and long segments are not allowed.
4. The last boundary dot must also be adjacent to the first, forming a closed chain.
5. A closed chain captures when it encloses at least one opponent dot.
6. Captured opponent dots count toward the surrounding player's score.
7. A closed empty area is a **house** and does not score while empty. If the opponent enters it without completing a direct capture on that move, the house activates as a capture.
8. Active opponent captures can themselves be surrounded. A fully surrounded opponent capture is deactivated, its previously captured dots are released, and score is recalculated from the active capture state.
9. The player with more currently captured opponent dots has the higher score.

The authoritative rules and implementation status are tracked in [`docs/PRODUCT.md`](docs/PRODUCT.md).

## 🖱 Board navigation

- **Click / tap** an intersection to place a dot.
- **Drag** with one pointer to pan the board; the movement threshold keeps an ordinary click/tap from becoming a pan.
- **Mouse wheel / trackpad scroll** zooms around the pointer position.
- **Two-finger pinch** zooms and pans around the moving gesture midpoint.
- **Keyboard:** focus the board, use the arrow keys to move the intersection cursor, **Enter / Space** to place a dot, and **+ / -** to zoom.
- The viewport is restored after reload independently from the saved game. Starting a new game resets the viewport to the origin at 100% zoom.

Viewport movement never changes game coordinates. Pointer and keyboard placement both resolve to integer grid intersections before the authoritative game core sees a move.

## ♿ Accessibility & mobile

- the board is keyboard-operable and has screen-reader instructions/live announcements for cursor movement and placement results;
- a skip link moves keyboard focus directly to the board;
- primary buttons use mobile-sized touch targets and visible keyboard focus;
- mobile layouts respect display cutouts and safe areas, dynamic viewport height, and installed-PWA browser chrome;
- dark mode, forced-colors mode, and reduced-motion preferences receive explicit handling;
- Canvas DPR is bounded to avoid excessive backing-buffer memory on extreme-density screens.

## 📦 PWA & offline lifecycle

The game is installable and its application shell is precached for offline use. A local saved game remains available without a network connection because game/session persistence is independent from the service worker.

When a newer application version is waiting, Dots **prompts before applying it** instead of silently replacing the running page. The app checks for updates after reconnecting, when returning to the foreground, and periodically while open. The production build also verifies that the manifest, service worker, required install assets, and mobile icon linkage were actually generated.

## ✨ Current build

- complete local two-player game core separated from Canvas rendering;
- strict 8-direction neighboring-dot enclosure topology, houses, multiple captures, capture-of-capture, release, and derived scoring;
- capture outline, translucent fill, light hatching, and placement blocking inside active captured areas;
- exact one-move Undo, confirmed New game, versioned move-log persistence, and deterministic replay restore;
- practically unbounded pan/zoom viewport with mouse, trackpad, touch, pinch, and keyboard interaction;
- separate validated viewport persistence and bounded visible-range rendering;
- screen-reader/live-status support, focus-visible states, safe-area mobile UI, reduced-motion and forced-colors handling;
- explicit offline/update PWA lifecycle with user-confirmed refresh;
- corrected scalable/PWA icon geometry that follows the same adjacency/intersection rules as the game;
- build-time verification of generated PWA/offline artifacts;
- regression/stress coverage for topology, persistence, long histories, large viewport transforms, and bounded 8K rendering ranges;
- Russian UI when Russian is present in browser/system locales, English otherwise;
- CI, automatic GitHub Pages deployment, automated GitHub releases, and proprietary All Rights Reserved license.

Version **0.5.0** completes the planned browser/PWA/accessibility hardening phase. The principal local-game rules, reversible state, navigation, persistence, offline shell, and accessibility path are now in place; remaining work is continued real-device/topology validation and optional higher-level features such as AI.

## 🧱 Technology

| Category | Technology |
| --- | --- |
| Language | TypeScript 5.9 |
| Rendering | HTML5 Canvas |
| Build | Vite 7 |
| PWA | vite-plugin-pwa / Workbox |
| Tests | Vitest + build artifact verification |
| Persistence | versioned localStorage move log + separate viewport state |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

## 🗂 Architecture

```text
src/
├── game/
│   ├── board.ts           game state and legal placement
│   ├── capture.ts         topology, houses, release, and scoring
│   ├── session.ts         history, undo, and reset
│   ├── *.test.ts          rule/session/topology/stress regression tests
│   └── types.ts           domain types
├── ui/
│   ├── canvas-board.ts    Canvas, pointer/touch/keyboard interaction
│   ├── viewport.ts        pan/zoom, visible bounds, screen↔game transforms
│   └── viewport.test.ts   viewport/performance regression tests
├── persistence.ts         authoritative move-log save/restore adapter
├── viewport-persistence.ts  separate viewport save/restore adapter
├── pwa.ts                 service-worker update/offline lifecycle
├── i18n.ts                Russian / English interface and a11y copy
├── main.ts                application composition and browser status UI
└── styles.css             notebook/mobile/accessibility visual layer

scripts/
└── verify-build.mjs       production PWA artifact verification
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the current architecture and [`CHANGELOG.md`](CHANGELOG.md) for release changes.

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

`npm run build` includes TypeScript validation, the Vite/PWA production build, and a post-build check of the generated manifest/service worker/install assets.

## 🗺 Roadmap

1. Continue real-device/browser validation and topology/performance stress testing as difficult positions are found.
2. Add optional import/export only if it remains simple and genuinely useful.
3. Consider a computer opponent now that the rule engine, reversible local flow, viewport, persistence, PWA lifecycle, and accessibility path are stable.
4. Optionally package the same codebase for Android through Capacitor later.

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
