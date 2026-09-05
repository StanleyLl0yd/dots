# Changelog

All notable project changes are recorded here.

## [Unreleased]

### Added

- localized Dots-style start menu on the notebook grid with saved/current-game Continue, explicit Vs computer and Two players starts, Help, About, and native-only Exit;
- compact in-game Menu action for returning to the start screen without restarting the application.

### Changed

- the game surface is inert while the start menu is open, and pending computer play is paused until the player explicitly continues or starts a game.

## [0.9.5] - 2026-09-03

### Added

- canonical `branding/dots-icon-master.png` raster source of truth plus deterministic platform icon preparation for Web/PWA and Tauri builds;
- explicit raster-source preservation rules preventing accidental tracing, vector replacement, in-place recompression, cropping, padding, recoloring, or other artwork changes.

### Changed

- Web/PWA favicon and install icons, Tauri desktop/macOS icons, Android launcher/adaptive/round icons, and the RuStore 512×512 store icon now derive from the same approved raster master;
- removed the legacy SVG/PWA icon path and the separately drawn RuStore icon, and removed stale Android icon generation from native/store release workflows;
- source version advanced to 0.9.5 with no gameplay, rules, save-format, AI, scoring, accessibility, SDK/NDK/ABI, or native-hardening behavior changes.

## [0.9.4] - 2026-09-02

### Added

- shared Rust `crates/game-core` as the single production implementation of move legality, capture/house topology, release/scoring, replay validation, and deterministic AI search for both native Tauri and web/PWA builds;
- Rust topology/tactical/paired-strength regression coverage migrated from the removed TypeScript rules/AI implementation, plus frontend session/persistence tests that execute against the compiled WASM core;
- permanent Rust CI, source-boundary enforcement, hardened web/native artifact verification, and dedicated Dependabot coverage for the shared Rust core.

### Changed

- web/PWA now executes the shared Rust core through optimized WASM while native Tauri links the same crate directly through four coarse IPC commands; the TypeScript layer is limited to DTO/session/persistence/Worker/UI orchestration;
- removed the duplicate TypeScript rules, capture/scoring, AI search, AI-match harness, and their superseded reference tests after equivalent Rust regressions were established;
- hardened Android release output with explicit non-debuggable JNI/app settings, minification/resource shrinking, native symbol/debug-section checks, and 16 KB ELF alignment validation, while macOS verification now checks universal architectures and stripped implementation symbols;
- preserved gameplay rules, save format, AI policy/difficulty semantics, deterministic decisions, accessibility behavior, and PWA lifecycle while changing the implementation boundary;
- source version advanced to 0.9.4 so hardened artifacts have a tag/source provenance distinct from the already published 0.9.3 release.

- consolidated failure-tolerant JSON storage transport and record validation while keeping game, preference, and viewport schemas, keys, versions, and fail-closed behavior independent;
- reduced repeated AI derived-state work with per-search inactive-stone caching and reuse of the existing danger difference without changing search policy, weights, deterministic ordering, or game rules;
- committed `src-tauri/Cargo.lock`, added Cargo Dependabot coverage, and made native/store automation verify the resolved Rust dependency graph with `--locked`;
- removed the one-off duplicate RuStore AAB workflow so `Native Release` is the single Android release path, while RuStore asset generation now runs automatically only for relevant `main` release/tooling changes or manually on demand;
- synchronized security, product, architecture, AI, and EN/RU repository documentation with the current Tauri/RuStore 0.9.3 structure and fixed stale repository/script references.

## [0.9.3] - 2026-09-01

### Added

- RuStore publication package with privacy policy, user agreement, Russian store metadata, and reproducible 512×512 icon, 1080×607 promo banner, and four 1080×1920 screenshots;
- dedicated local signing helpers that keep the RuStore app-signing private key offline and store only the separate AAB upload key in GitHub Actions secrets;
- AAB verification through JAR signature validation, Bundletool manifest inspection, and universal-APK generation before release upload.

### Changed

- Android native releases now produce an upload-key-signed Android App Bundle (`.aab`) instead of an APK while macOS continues to publish a universal DMG;
- source version advanced to 0.9.3 with no gameplay, rules, save-format, AI, scoring, or web/PWA behavior changes.

## [0.9.2] - 2026-09-01

### Added

- compact localized About dialog with current package version, copyright notice, and project link;
- minimal Tauri 2 native shell sharing the existing TypeScript/Canvas UI across Android and macOS;
- native release workflow producing a signed universal Android APK and a universal Intel/Apple Silicon macOS DMG and attaching both artifacts to the matching GitHub Release.

### Changed

- native builds use relative frontend assets and disable the browser PWA/service-worker layer while the GitHub Pages PWA remains unchanged;
- the About project link opens through the platform default browser in native builds with a GitHub-only opener permission scope;
- GitHub Pages deployment now runs the same high/critical npm audit gate before tests and production build;
- GitHub Release publication now independently runs reproducible install, dependency audit, the full test suite, TypeScript validation, production/PWA build, and artifact verification before creating a new tag/release;
- source version advanced to 0.9.2 with no gameplay, rules, save-format, AI, scoring, or web/PWA behavior changes.

## [0.9.1] - 2026-09-01

### Added

- regression coverage for invalid and unsafe authoritative game coordinates, unsafe persisted move logs, and PWA reconnect/foreground/periodic/update/cleanup lifecycle behavior.

### Fixed

- authoritative placement and persisted move replay now reject coordinates outside JavaScript's safe-integer range instead of accepting ambiguous grid positions;
- stale cancelled browser AI generations no longer clear the thinking state of a newer computer request;
- failed explicit PWA update activation restores the update action and reports the existing PWA error status instead of leaving the action disabled.

### Changed

- source version advanced to 0.9.1 as the stabilized pre-1.0 release-candidate baseline;
- game rules, save schema, AI search policy/difficulty semantics, scoring, and user-facing feature set are unchanged from 0.9.0.

## [0.9.0] - 2026-09-01

### Added

- dedicated browser Web Worker entry and typed request/response protocol for computer-turn computation while keeping `src/game/ai.ts` browser-independent;
- structured-clone regression coverage proving Map-based `GameState` survives the Worker transport contract;
- **Fit game** viewport recovery that recenters/scales all placed stones with bounded automatic zoom;
- subtle latest-move ring and a move counter derived directly from session history;
- brief capture feedback derived from confirmed before/after active capture state, with reduced-motion-safe visual emphasis and localized live feedback;
- point-local invalid-placement feedback plus desktop mouse snap preview at the exact integer intersection that would be submitted;
- compact first-run board hint with persistent accessible Help dialog;
- responsive mobile primary-action toolbar keeping Undo, Fit game, Help, and New game visible;
- accessible in-app New game confirmation dialog replacing browser-native `window.confirm()`;
- production-build verification that requires the generated `ai-worker-*.js` asset in addition to the existing PWA/offline artifacts.

### Changed

- browser computer search now executes off the UI thread; returned coordinates remain proposals and are accepted only through authoritative `playMove()`;
- pending computer work can be cancelled by Undo, New game, mode/difficulty changes, page hiding, or a newer request generation, and stale Worker responses are ignored;
- primary controls remain responsive while the computer is thinking so pending work can be cancelled or redirected safely;
- the first-run navigation hint disappears after the first legal move while Help remains available on demand;
- Canvas rendering now owns presentation-only latest-move, snap-preview, invalid-point, and confirmed-capture emphasis without changing legality or persistence;
- game rules, saved-game schema, AI search policy/difficulty behavior, tactical benchmark expectations, and scoring semantics are unchanged;
- source version advanced to 0.9.0 as the pre-1.0 game-UX/release-candidate foundation.

## [0.8.2] - 2026-09-01

### Added

- committed npm lockfile (lockfile v3) for reproducible dependency resolution;
- CI high/critical dependency audit gate with `npm audit --audit-level=high`;
- monthly Dependabot coverage for GitHub Actions in addition to npm dependencies;
- explicit Node.js `>=22` engine requirement.

### Fixed

- upgraded Vite from 7.1.3 to 7.3.6, clearing the high-severity Vite development-server/path advisories reported by npm audit;
- upgraded Vitest from 3.2.4 to 3.2.7, clearing the critical Vitest UI-server advisory;
- upgraded GitHub Actions to maintained Node-24 generations: `actions/checkout`/`actions/setup-node` v4→v7, `actions/configure-pages` v5→v6, `actions/upload-pages-artifact` v3→v5, and `actions/deploy-pages` v4→v5, eliminating the Node 20 runtime deprecation warnings from CI and Pages.

### Changed

- CI and GitHub Pages now install exactly the committed dependency graph with `npm ci`;
- release and Pages workflows use maintained Node-24-compatible action runtimes;
- dependency/tooling hardening is now part of repository operational verification; gameplay, saves, PWA behavior, accessibility, and AI behavior are unchanged;
- source version advanced to 0.8.2.

## [0.8.1] - 2026-08-31

### Added

- fixed-position Expert tactical benchmark suite covering a two-target capture, mandatory threat blocking, false-closure rejection, hostile-house avoidance, counter-capture under double threat, and capture-of-capture release;
- all six tactical fixtures now run as required regressions instead of keeping the three discovered weaknesses as skipped known gaps.

### Fixed

- Expert now converts the available two-target immediate capture instead of allowing heuristic shortlist/search preference to choose a quiet move;
- Expert avoids entering an opponent empty house when that move would activate the house and a safe legal frontier move exists;
- Expert prefers its own safe immediate counter-capture when independent opponent threats cannot all be neutralized by one defensive move.

### Changed

- Hard/Expert root candidate discovery performs a wider but bounded authoritative `placeStone()` pre-scan so real score-changing moves cannot be hidden solely by heuristic seed ordering;
- Expert gives safe immediate captures explicit root tactical priority before deeper minimax comparison while keeping legality, houses, captures, releases, and score authoritative to the game core;
- repository AI/product/architecture documentation and both READMEs now describe the tactical benchmark contract and the 0.8.1 root-safety policy;
- source version advanced to 0.8.1.

## [0.8.0] - 2026-08-31

### Added

- deterministic offline computer opponent for local play with four difficulty levels: Easy, Normal, Hard, and Expert;
- bounded strategic minimax search with adaptive candidate budgets, alpha-beta pruning, forcing capture/release extensions, and deterministic per-move transposition caches;
- cycle-closing/house pressure, opponent closure blocking, local active-stone danger evaluation, immediate-capture threat probes, and short setup-potential probes;
- dedicated AI-vs-AI regression harness plus tactical benchmark coverage for multi-target captures, threat blocking, false closures, hostile houses, counter-captures, and capture-of-capture release;
- versioned game-mode and AI-difficulty preferences with automatic migration from the 0.6.0 mode-only format.

### Changed

- computer turns are still accepted only through the authoritative core/session path and persisted as ordinary legal moves;
- search budgets shrink on larger positions and expensive setup probes/extensions are disabled or reduced to keep browser responsiveness bounded.

## [0.7.0] - 2026-08-31

### Added

- persisted pan/zoom viewport with independent validation and new-game reset;
- practically unbounded pan/zoom navigation for mouse wheel, trackpad, touch pinch, and keyboard;
- accessible keyboard cursor with arrow movement, Enter/Space placement, plus/minus zoom, and automatic viewport recentering;
- responsive mobile/PWA shell with safe-area handling, dynamic viewport units, forced-colors support, reduced-motion handling, and a skip link;
- bounded visible-range grid rendering, off-screen stone/capture culling, and DPR cap for Canvas backing-buffer safety;
- stress coverage for long sparse games, large-coordinate transforms, repeated pan/zoom, and 8K/minimum-zoom rendering bounds.

### Changed

- viewport state remains separate from authoritative `GameState` and persisted move history;
- pointer and keyboard input converge on integer grid coordinates before legal placement.

## [0.6.0] - 2026-08-31

### Added

- versioned local/computer mode preference storage;
- local two-player mode plus deterministic blue-side computer control;
- PWA installation metadata, offline precache, explicit update prompt, reconnect/foreground update checks, and install/mobile icons;
- localized Russian/English UI, help text, and accessibility copy.

### Changed

- saved games remain a versioned move log replayed through the authoritative session core;
- PWA/network lifecycle remains presentation-only and cannot mutate saved game state.

## [0.5.0] - 2026-08-30

### Added

- reversible game sessions with legal-move history and exact Undo;
- versioned move-log persistence with deterministic replay through `playMove()`;
- fail-closed handling of malformed saves and illegal replay moves.

## [0.4.0] - 2026-08-30

### Added

- full classic capture topology with 8-neighbor boundary rules, houses, multiple captures, capture-of-capture, release, and derived scoring;
- topology/stress regression tests for enclosure geometry, large coordinates, and reversible capture state.

## [0.3.0] - 2026-08-30

### Added

- Canvas-based infinite-grid board with pointer placement and rendering;
- pure viewport transforms and bounded visible-grid calculations.

## [0.2.0] - 2026-08-30

### Added

- authoritative pure TypeScript game state, legal placement, scoring, and core domain types.

## [0.1.0] - 2026-08-30

### Added

- initial Vite/TypeScript application shell and project documentation.
