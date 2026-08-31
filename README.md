<div align="center">

# 🔴·🔵 DOTS

### SURROUND · CAPTURE · CONTROL

<img src="docs/assets/readme/dots-board.webp" alt="Dots game board" width="100%">

[![CI](https://img.shields.io/github/actions/workflow/status/StanleyLl0yd/dots/ci.yml?branch=main&label=CI&labelColor=2b2925&color=16A34A)](https://github.com/StanleyLl0yd/dots/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-2563EB?labelColor=2b2925&logo=githubpages&logoColor=ffffff)](https://stanleyll0yd.github.io/dots/)
[![PWA](https://img.shields.io/badge/PWA-ready-E11D48?labelColor=2b2925&logo=pwa&logoColor=ffffff)](https://stanleyll0yd.github.io/dots/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-2563EB?labelColor=2b2925&logo=typescript&logoColor=ffffff)](https://www.typescriptlang.org/)
[![Source version](https://img.shields.io/badge/source-0.4.0-16A34A?labelColor=2b2925)](package.json)
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-E11D48?labelColor=2b2925)](LICENSE)

[![English](https://img.shields.io/badge/lang-EN-2563EB?labelColor=2b2925)](README.md)
[![Русский](https://img.shields.io/badge/lang-RU-E11D48?labelColor=2b2925)](README_RU.md)

A minimalist digital version of the classic **Dots / Tochki** surround-and-capture strategy game.

[**▶ Open current web build**](https://stanleyll0yd.github.io/dots/)

</div>

**Dots** turns squared paper and two colored pens into a clean browser game. Players alternate placing dots on grid intersections. When a valid neighboring-dot boundary is actually closed around opponent dots, the captured area is outlined and lightly hatched.

Current source version: **0.4.0** · advanced capture rules + reversible sessions + practically unbounded board navigation · Web + PWA · GitHub Pages live

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
- **Drag** with one pointer to pan the board. A small movement threshold keeps ordinary clicks/taps from becoming accidental pans.
- **Mouse wheel / trackpad scroll** zooms around the pointer position.
- **Two-finger pinch** zooms and pans around the gesture midpoint.
- The viewport is restored after reload independently from the saved game. Starting a new game resets the viewport to the origin at 100% zoom.

Viewport movement never changes game coordinates. A pointer is transformed through the current viewport and snapped exactly once to an integer grid intersection before the game core sees it.

## ✨ Current build

- TypeScript game core separated from Canvas rendering;
- local two-player placement on grid intersections;
- real closed-enclosure detection using neighboring dots in 8 directions;
- rejection of open contours and empty houses as scored captures;
- house activation when an opponent enters an empty house without completing a direct capture;
- multiple independent captures completed by one move;
- deterministic minimum-face selection when several valid boundaries compete;
- capture-of-capture with deactivation of fully surrounded opponent captures and release of previously captured own dots;
- score derived from active captured dots rather than an irreversible counter;
- captured areas blocked from further placement;
- capture outline, translucent fill, and light diagonal hatching;
- undo that restores the previous player, capture set, released/captured dots, and score together;
- new-game reset with confirmation when a game is in progress;
- versioned automatic local save using a legal move log, with full game and undo-history restoration after reload;
- invalid, corrupted, or unsupported saves discarded safely instead of becoming game state;
- practically unbounded pan/zoom viewport with mouse, trackpad, touch, and pinch interaction;
- anchor-preserving zoom and exact screen↔game coordinate conversion with integer placement snapping;
- separately versioned local viewport persistence with safe validation and numerical bounds;
- visible-range grid and stone rendering plus capture hatching bounded to the screen for stable navigation performance;
- topology and viewport regression tests, CI, automatic GitHub Pages deployment, and automated GitHub releases;
- Russian UI when Russian is present in browser/system locales, English otherwise;
- responsive desktop/mobile layout with light and dark presentation;
- installable PWA and offline-ready build pipeline;
- proprietary All Rights Reserved license.

Version **0.4.0** completes the core board-navigation phase. The next work is PWA/mobile polish, accessibility/reduced-motion handling, and continued rule/performance stress testing before AI is considered.

## 🧱 Technology

| Category | Technology |
| --- | --- |
| Language | TypeScript 5.9 |
| Rendering | HTML5 Canvas |
| Build | Vite 7 |
| PWA | vite-plugin-pwa / Workbox |
| Tests | Vitest |
| Persistence | versioned localStorage move log + separate viewport state |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

## 🗂 Architecture

```text
src/
├── game/
│   ├── board.ts           game state and legal placement
│   ├── board.test.ts      move/capture integration tests
│   ├── capture.ts         topology, house, release, and scoring logic
│   ├── capture.test.ts    capture-geometry regression tests
│   ├── session.ts         move history, undo, and reset state
│   ├── session.test.ts    session/undo regression tests
│   ├── topology.test.ts   adversarial topology hardening tests
│   └── types.ts           domain types
├── ui/
│   ├── canvas-board.ts    Canvas rendering and pointer/touch gestures
│   ├── viewport.ts        pan/zoom and screen↔game transforms
│   └── viewport.test.ts   viewport mathematics regression tests
├── persistence.ts         versioned move-log save and restore
├── persistence.test.ts    persistence validation/replay tests
├── viewport-persistence.ts       independent viewport save/restore
├── viewport-persistence.test.ts  viewport persistence validation tests
├── i18n.ts                Russian / English interface
├── i18n.test.ts           locale tests
├── main.ts                application composition
└── styles.css             notebook-inspired visual layer
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

## 🗺 Roadmap

1. Harden PWA/offline behavior across desktop and mobile browsers and improve accessibility/reduced-motion handling.
2. Continue topology and viewport/performance stress testing on large and difficult positions.
3. Add optional import/export only if it remains simple and genuinely useful.
4. Consider AI only after the complete local game and board interaction remain stable under broader testing.
5. Optionally package the same codebase for Android through Capacitor later.

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
