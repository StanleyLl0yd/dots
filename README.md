<div align="center">

# 🔴·🔵 DOTS

### SURROUND · CAPTURE · CONTROL

<img src="docs/assets/readme/dots-board.webp" alt="Dots game board" width="100%">

[![CI](https://img.shields.io/github/actions/workflow/status/StanleyLl0yd/dots/ci.yml?branch=main&label=CI&labelColor=2b2925&color=16A34A)](https://github.com/StanleyLl0yd/dots/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-2563EB?labelColor=2b2925&logo=githubpages&logoColor=ffffff)](https://stanleyll0yd.github.io/dots/)
[![PWA](https://img.shields.io/badge/PWA-ready-E11D48?labelColor=2b2925&logo=pwa&logoColor=ffffff)](https://stanleyll0yd.github.io/dots/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-2563EB?labelColor=2b2925&logo=typescript&logoColor=ffffff)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-game--core-B7410E?labelColor=2b2925&logo=rust&logoColor=ffffff)](https://www.rust-lang.org/)
[![Source version](https://img.shields.io/badge/source-0.9.5-16A34A?labelColor=2b2925)](package.json)
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-E11D48?labelColor=2b2925)](LICENSE)

[![English](https://img.shields.io/badge/lang-EN-2563EB?labelColor=2b2925)](README.md)
[![Русский](https://img.shields.io/badge/lang-RU-E11D48?labelColor=2b2925)](README_RU.md)

A minimalist digital version of the classic **Dots / Tochki** surround-and-capture strategy game.

[**▶ Open current web build**](https://stanleyll0yd.github.io/dots/)

</div>

**Dots** turns squared paper and two colored pens into a clean browser game. Players place dots on grid intersections and build neighboring-dot boundaries around the opponent. Completed captures are outlined and lightly hatched.

Current source version: **0.9.5** · RuStore-ready AAB release + native Tauri shell + classic advanced rules + four-level local computer play + hardened Worker/PWA lifecycle + audited reproducible toolchain

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

The computer opponent is completely local and offline. It does not use a server, external API, machine-learning model, analytics, or randomness. Rules, scoring, replay validation, and AI search live in the shared Rust `crates/game-core`; the browser executes the WASM-backed search in a cancellable Web Worker, and every returned coordinate is still accepted through the authoritative Rust move path.

Version 0.8.1 keeps the strategic 0.8 search model and closes concrete tactical gaps exposed by fixed benchmark positions. Expert performs wider bounded authoritative root discovery, rejects an immediately self-capturing entry into an opponent house when a safe alternative exists, and gives safe immediate captures root priority. Hard and Expert still use cycle-closing pressure, local danger, and bounded authoritative threat/setup probes; actual legality and scoring still come only from `placeStone()`. Version 0.8.2 does not change gameplay or AI behavior.

Search uses stronger tactical ordering and alpha-beta pruning. Near the normal search horizon, Hard/Expert may selectively continue only score-changing capture/release moves, reducing obvious horizon mistakes without making the whole tree deeper. Expensive setup analysis and extensions are automatically reduced on large positions.

The human always plays **Red** and the computer plays **Blue**. Switching game mode or difficulty does not reset the current board. If Blue is already to move when computer mode is enabled, the computer takes over that turn. In computer mode, **Undo** rolls back the computer move and the preceding human move when both exist, returning to the previous human decision point.

Existing 0.6.0 computer-mode preferences migrate automatically to **Normal** difficulty. See [`docs/AI.md`](docs/AI.md) for the AI contract, strategic analysis, search model, and limitations.

### AI strength regression

The Rust regression suite runs short paired **Expert vs Normal** and **Expert vs Hard** games with color assignment swapped. Expert must not lose either paired comparison and must keep a positive aggregate captured-score margin. Six fixed Rust tactical regressions lock down concrete Expert decisions including double captures, house safety, counter-capture, threat blocking, and capture-of-capture release. These are tactical regression guards, not an Elo rating or a hardware benchmark.

## 🖱 Board navigation

- **Click / tap** an intersection to place a dot.
- **Drag** with one pointer to pan the board; a movement threshold separates placement from pan.
- **Mouse wheel / trackpad scroll** zooms around the pointer position.
- **Two-finger pinch** zooms and pans around the moving gesture midpoint.
- **Keyboard:** focus the board, use arrow keys to move the intersection cursor, **Enter / Space** to place a dot, and **+ / -** to zoom.
- Viewport state is restored separately from the saved game. New game resets the viewport to origin at 100% zoom.

Viewport movement never changes game coordinates. Pointer and keyboard placement both resolve to integer grid intersections before the authoritative game core sees a move.

### 0.9.0 interaction polish

- **Mouse hover** previews the exact snapped grid intersection on desktop without claiming legality.
- **Fit game** recenters and scales the viewport so every placed stone is visible, with bounded automatic zoom.
- The latest legal move has a subtle ring marker; rejected placements get a short point-local marker.
- Newly confirmed captures receive brief visual emphasis plus localized visible/screen-reader feedback.
- The first-run navigation hint disappears after the first legal move; **Help** remains available at any time.

## ♿ Accessibility & mobile

- keyboard-operable board with screen-reader instructions and live announcements;
- skip link directly to the board;
- mobile-sized touch targets and visible keyboard focus;
- safe-area and dynamic viewport handling for mobile/installed PWA use;
- explicit dark-mode, forced-colors, and reduced-motion handling;
- bounded Canvas DPR to avoid excessive backing-buffer memory on extreme-density screens;
- localized computer-thinking, computer-move, mode, and difficulty controls reuse the same accessible status path.

### 0.9.0 responsive controls

Computer search runs off the UI thread. Pending Worker computation can be cancelled by Undo, New game, mode/difficulty changes, or page hiding; stale Worker generations are ignored. The mobile toolbar keeps Undo, Fit game, Help, and New game visible as compact icon actions, while New game confirmation uses an accessible in-app dialog instead of `window.confirm()`.

## 📦 PWA & offline lifecycle

The application shell is precached for offline use. Saved games, viewport state, game mode, and AI difficulty are local browser data and do not depend on the network or service worker.

When a newer application version is waiting, Dots prompts before applying it instead of silently replacing an active game. Update checks occur after reconnecting, on foreground return, and periodically while the app remains open. If explicit activation fails, the update action becomes available again and the existing PWA error status is shown so the user can retry. The production build verifies the generated manifest, service worker, install icons, and mobile icon linkage.

## ✨ Current build

- authoritative Rust game core shared by native Tauri and web/PWA via WASM, separated from Canvas and browser UI;
- strict 8-direction neighboring-dot topology, houses, multiple captures, capture-of-capture, release, and derived scoring;
- local two-player mode plus deterministic offline Blue computer opponent;
- four AI levels with bounded multi-ply search, adaptive budgets, real game-core simulation, and ephemeral transposition reuse;
- strategic same-color cycle-closing/house pressure and defensive blocking of likely opponent closing points;
- local active-stone danger evaluation plus bounded immediate-capture and short setup threat probes on Hard/Expert;
- tactical move ordering, alpha-beta pruning, and selective forcing capture/release horizon extensions;
- deterministic AI-vs-AI paired strength regression tests plus six fixed Expert tactical benchmark positions;
- versioned preference persistence for game mode and AI difficulty with 0.6.0 migration;
- exact Undo, accessible confirmed New game, versioned move-log persistence, deterministic replay restore, and fail-closed safe-integer move validation;
- shared guarded JSON-storage transport without merging the independent game/preference/viewport schemas;
- cancellable AI Web Worker orchestration with generation-isolated stale-response guards and authoritative `playMove()` acceptance;
- latest-move marker, move counter, capture/invalid-placement feedback, desktop snap preview, first-run Help, Fit game, and responsive mobile action toolbar;
- practically unbounded pan/zoom viewport for mouse, trackpad, touch, pinch, and keyboard;
- separate validated viewport persistence and bounded visible-range rendering;
- accessible responsive controls, screen-reader/live-status support, safe-area mobile UI, reduced-motion and forced-colors handling;
- explicit offline/update PWA lifecycle with user-confirmed refresh, retryable activation failure, and lifecycle regression coverage;
- build-time verification of generated PWA/offline artifacts;
- committed npm and Cargo lockfiles for reproducible web and native dependency graphs;
- CI security gate rejecting high/critical npm advisories, currently reporting zero vulnerabilities;
- Node-24-compatible GitHub Actions runtimes for checkout/setup and Pages actions, plus Dependabot coverage for npm, Cargo, and GitHub Actions;
- regression/stress coverage for rules, persistence, all AI levels, long histories, large viewport transforms, and bounded 8K rendering ranges;
- Russian UI when Russian is present in browser/system locales, English otherwise;
- CI, automatic GitHub Pages deployment, automated GitHub releases, and proprietary All Rights Reserved license.

Version **0.9.5** refreshes the application identity from one preserved raster master across Web/PWA, Tauri desktop, Android launcher, and RuStore store assets. Gameplay, rules, saves, AI, accessibility, and native hardening are unchanged.

Version **0.9.4** hardens the 0.9.3 native/RuStore baseline by moving authoritative rules, capture/scoring, replay validation, and deterministic AI into the shared Rust core used directly by Tauri and through WASM on the web. Gameplay rules, save schema, AI policy/difficulty semantics, accessibility, and PWA behavior are intentionally preserved.

## 🧱 Technology

| Category | Technology |
| --- | --- |
| Languages | Rust game core + TypeScript 5.9 UI/orchestration |
| Rendering | HTML5 Canvas |
| Build | Vite 7.3.6 |
| PWA | vite-plugin-pwa / Workbox |
| Native shell | Tauri 2 |
| Tests | Vitest 3.2.7 + build artifact verification |
| Persistence | versioned localStorage move log + viewport + game-mode/difficulty preferences |
| AI | deterministic bounded Rust minimax; native direct call, browser WASM in a Web Worker |
| Dependencies | committed npm + Cargo lockfiles, `npm ci`, high/critical npm audit gate, Dependabot |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

## 🗂 Architecture

```text
crates/game-core/                 authoritative Rust rules/capture/replay/AI core
├── src/board.rs
├── src/capture.rs
├── src/ai.rs
├── src/types.rs
└── src/wasm.rs                   four coarse WASM exports

src/game/                         thin TypeScript boundary only
├── core.ts                       DTO conversion + shared frontend API
├── core-web.ts                   lazy Rust/WASM transport
├── core-native.ts                four Tauri IPC calls
├── ai-worker.ts                  cancellable browser AI orchestration
├── session.ts                    move-log history over Rust core
└── types.ts                      rendering-facing DTO types

src/ui/                           Canvas input/rendering + viewport only
src-tauri/                        Tauri shell linking the same game-core crate
scripts/                          WASM build + source/artifact hardening verification
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/AI.md`](docs/AI.md), [`docs/HARDENING.md`](docs/HARDENING.md), and [`CHANGELOG.md`](CHANGELOG.md).

## 🛠 Development

Requirements: Node.js 22+, npm, Rust with the `wasm32-unknown-unknown` target, `wasm-bindgen-cli` 0.2.127, and Binaryen (`wasm-opt`).

```bash
git clone https://github.com/StanleyLl0yd/dots.git
cd dots
npm ci
npm run dev
```

Verification:

```bash
npm audit --audit-level=high
npm test
npm run build
```

`npm run dev`, `npm test`, and `npm run build` generate the ignored Rust/WASM output automatically. Production build verification rejects source maps, TypeScript/test leakage, legacy game-core identifiers, and missing PWA/WASM/Worker assets.

## 🗺 Roadmap

1. Publish and validate the 0.9.5 Android AAB in RuStore using the dedicated app-signing/upload-key flow.
2. Continue real-device Android/macOS and installed-PWA validation and fix concrete regressions only.
3. Continue adversarial topology and tactical AI validation without speculative feature expansion before 1.0.
4. Release **1.0.0** after clean real-device, persistence, offline/update, Worker-cancellation, accessibility, and long-game checks.

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
