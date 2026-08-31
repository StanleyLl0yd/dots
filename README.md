<div align="center">

# 🔴·🔵 DOTS

### SURROUND · CAPTURE · CONTROL

<img src="docs/assets/readme/dots-board.webp" alt="Dots game board" width="100%">

[![CI](https://img.shields.io/github/actions/workflow/status/StanleyLl0yd/dots/ci.yml?branch=main&label=CI&labelColor=2b2925&color=16A34A)](https://github.com/StanleyLl0yd/dots/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-2563EB?labelColor=2b2925&logo=githubpages&logoColor=ffffff)](https://stanleyll0yd.github.io/dots/)
[![PWA](https://img.shields.io/badge/PWA-ready-E11D48?labelColor=2b2925&logo=pwa&logoColor=ffffff)](https://stanleyll0yd.github.io/dots/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-2563EB?labelColor=2b2925&logo=typescript&logoColor=ffffff)](https://www.typescriptlang.org/)
[![Source version](https://img.shields.io/badge/source-0.8.1-16A34A?labelColor=2b2925)](package.json)
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-E11D48?labelColor=2b2925)](LICENSE)

[![English](https://img.shields.io/badge/lang-EN-2563EB?labelColor=2b2925)](README.md)
[![Русский](https://img.shields.io/badge/lang-RU-E11D48?labelColor=2b2925)](README_RU.md)

A minimalist digital version of the classic **Dots / Tochki** surround-and-capture strategy game.

[**▶ Open current web build**](https://stanleyll0yd.github.io/dots/)

</div>

**Dots** turns squared paper and two colored pens into a clean browser game. Players place dots on grid intersections and build neighboring-dot boundaries around the opponent. Completed captures are outlined and lightly hatched.

Current source version: **0.8.1** · advanced classic capture rules + local two-player mode + strategically refined four-level computer opponent + reversible sessions + practically unbounded board + hardened PWA/accessibility

## 🎯 Rules

1. Red moves first by default.
2. Players alternate placing one dot on a legal empty grid intersection.
3. Consecutive boundary dots must be neighboring intersections: exactly one grid step horizontally, vertically, or diagonally.
4. The closing edge from the last boundary dot to the first follows the same one-step rule.
5. A closed chain captures when it encloses at least one opponent dot.
6. Captured opponent dots count toward the surrounding player's score.
7. A closed empty area is a **house** and does not score while empty. If the opponent enters it without completing a direct capture on that move, the house activates as a capture.
8. Active opponent captures can themselves be surrounded. Fully surrounded opponent captures deactivate, their held dots are released, and score is derived again from the active capture state.
9. The player with more currently captured opponent dots has the higher score.

The authoritative rules and implementation status are tracked in [`docs/PRODUCT.md`](docs/PRODUCT.md).

## 🤖 Computer opponent

Choose **Vs computer** from the mode selector to play Red against the Blue computer opponent. The original **Two players** mode remains available.

| Difficulty | Behavior |
| --- | --- |
| **Easy** | Fast immediate-move evaluation with no opponent-reply search. |
| **Normal** | Searches a bounded opponent reply and chooses the best worst-case result. This is the default. |
| **Hard** | Adds a selective computer continuation, strategic enclosure/threat analysis, and a forcing-capture horizon extension. |
| **Expert** | Adds another bounded opponent reply, the widest strategic analysis, alpha-beta pruning, and deeper forcing-capture extensions. |

The computer opponent is completely local and offline. It does not use a server, external API, machine-learning model, analytics, or randomness. `src/game/ai.ts` consumes the same authoritative `GameState`, and every candidate is validated through the existing game core.

Version 0.8.1 keeps the strategic 0.8 search model and closes concrete tactical gaps exposed by fixed benchmark positions. Expert now performs wider bounded authoritative root discovery, rejects an immediately self-capturing entry into an opponent house when a safe alternative exists, and gives safe immediate captures root priority. Hard and Expert still use cycle-closing pressure, local danger, and bounded authoritative threat/setup probes; actual legality and scoring still come only from `placeStone()`.

Search uses stronger tactical ordering and alpha-beta pruning. Near the normal search horizon, Hard/Expert may selectively continue only score-changing capture/release moves, reducing obvious horizon mistakes without making the whole tree deeper. Expensive setup analysis and extensions are automatically reduced on large positions.

The human always plays **Red** and the computer plays **Blue**. Switching game mode or difficulty does not reset the current board. If Blue is already to move when computer mode is enabled, the computer takes over that turn. In computer mode, **Undo** rolls back the computer move and the preceding human move when both exist, returning to the previous human decision point.

Existing 0.6.0 computer-mode preferences migrate automatically to **Normal** difficulty. See [`docs/AI.md`](docs/AI.md) for the AI contract, strategic analysis, search model, and limitations.

### AI strength regression

The repository includes a deterministic `src/game/ai-match.ts` harness. CI runs short paired **Expert vs Normal** and **Expert vs Hard** games with color assignment swapped. Expert must not lose either paired comparison and must keep a positive aggregate captured-score margin. A separate six-position `ai-tactical-benchmark.test.ts` suite locks down concrete Expert decisions including double captures, house safety, counter-capture, threat blocking, and capture-of-capture release. These are tactical regression guards, not an Elo rating or a hardware benchmark.

## 🖱 Board navigation

- **Click / tap** an intersection to place a dot.
- **Drag** with one pointer to pan the board; a movement threshold separates placement from pan.
- **Mouse wheel / trackpad scroll** zooms around the pointer position.
- **Two-finger pinch** zooms and pans around the moving gesture midpoint.
- **Keyboard:** focus the board, use arrow keys to move the intersection cursor, **Enter / Space** to place a dot, and **+ / -** to zoom.
- Viewport state is restored separately from the saved game. New game resets the viewport to origin at 100% zoom.

Viewport movement never changes game coordinates. Pointer and keyboard placement both resolve to integer grid intersections before the authoritative game core sees a move.

## ♿ Accessibility & mobile

- keyboard-operable board with screen-reader instructions and live announcements;
- skip link directly to the board;
- mobile-sized touch targets and visible keyboard focus;
- safe-area and dynamic viewport handling for mobile/installed PWA use;
- explicit dark-mode, forced-colors, and reduced-motion handling;
- bounded Canvas DPR to avoid excessive backing-buffer memory on extreme-density screens;
- localized computer-thinking, computer-move, mode, and difficulty controls reuse the same accessible status path.

## 📦 PWA & offline lifecycle

The application shell is precached for offline use. Saved games, viewport state, game mode, and AI difficulty are local browser data and do not depend on the network or service worker.

When a newer application version is waiting, Dots prompts before applying it instead of silently replacing an active game. Update checks occur after reconnecting, on foreground return, and periodically while the app remains open. The production build verifies the generated manifest, service worker, install icons, and mobile icon linkage.

## ✨ Current build

- complete classic local rule engine separated from Canvas and browser UI;
- strict 8-direction neighboring-dot topology, houses, multiple captures, capture-of-capture, release, and derived scoring;
- local two-player mode plus deterministic offline Blue computer opponent;
- four AI levels with bounded multi-ply search, adaptive budgets, real game-core simulation, and ephemeral transposition reuse;
- strategic same-color cycle-closing/house pressure and defensive blocking of likely opponent closing points;
- local active-stone danger evaluation plus bounded immediate-capture and short setup threat probes on Hard/Expert;
- tactical move ordering, alpha-beta pruning, and selective forcing capture/release horizon extensions;
- deterministic AI-vs-AI paired strength regression tests plus six fixed Expert tactical benchmark positions;
- versioned preference persistence for game mode and AI difficulty with 0.6.0 migration;
- exact Undo, confirmed New game, versioned move-log persistence, and deterministic replay restore;
- practically unbounded pan/zoom viewport for mouse, trackpad, touch, pinch, and keyboard;
- separate validated viewport persistence and bounded visible-range rendering;
- accessible responsive controls, screen-reader/live-status support, safe-area mobile UI, reduced-motion and forced-colors handling;
- explicit offline/update PWA lifecycle with user-confirmed refresh;
- build-time verification of generated PWA/offline artifacts;
- regression/stress coverage for rules, persistence, all AI levels, long histories, large viewport transforms, and bounded 8K rendering ranges;
- Russian UI when Russian is present in browser/system locales, English otherwise;
- CI, automatic GitHub Pages deployment, automated GitHub releases, and proprietary All Rights Reserved license.

Version **0.8.1** closes the first tactical gaps found by the fixed Expert benchmark suite. Further AI changes should continue to start from concrete failing positions or measured match regressions rather than unbounded depth increases.

## 🧱 Technology

| Category | Technology |
| --- | --- |
| Language | TypeScript 5.9 |
| Rendering | HTML5 Canvas |
| Build | Vite 7 |
| PWA | vite-plugin-pwa / Workbox |
| Tests | Vitest + build artifact verification |
| Persistence | versioned localStorage move log + viewport + game-mode/difficulty preferences |
| AI | deterministic bounded strategic minimax over the game core |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

## 🗂 Architecture

```text
src/
├── game/
│   ├── ai.ts              pure multi-level strategic computer search
│   ├── ai-match.ts        deterministic AI-vs-AI regression harness
│   ├── ai.test.ts         difficulty/tactics/determinism/large-position tests
│   ├── ai-match.test.ts   paired strength regression tests
│   ├── ai-tactical-benchmark.test.ts  fixed Expert tactical positions
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
├── preferences.ts         versioned game-mode + AI-difficulty preference
├── viewport-persistence.ts  separate viewport save/restore adapter
├── pwa.ts                 service-worker update/offline lifecycle
├── i18n.ts                Russian / English interface and a11y copy
├── main.ts                application composition, computer-turn scheduling, status UI
└── styles.css             notebook/mobile/accessibility visual layer

scripts/
└── verify-build.mjs       production PWA artifact verification
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/AI.md`](docs/AI.md), and [`CHANGELOG.md`](CHANGELOG.md).

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

`npm run build` includes TypeScript validation, the Vite/PWA production build, and post-build verification of generated PWA artifacts.

## 🗺 Roadmap

1. Continue real-device/browser and adversarial topology validation, including Expert-mode responsiveness on mobile hardware.
2. Improve AI only from concrete failing positions or strength-regression evidence while preserving deterministic bounded search.
3. Add optional import/export only if it stays simple and useful.
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
