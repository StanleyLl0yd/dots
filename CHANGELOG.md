# Changelog

All notable project changes are recorded here.

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
- release workflow uses the maintained checkout action runtime;
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

- active same-color connectivity/component analysis that recognizes frontier points capable of closing an existing path into a cycle, improving capture/house construction pressure and defensive blocking of opponent closing points;
- local active-stone danger evaluation based on concentrated opponent contact, available neighboring space, and same-color support;
- bounded authoritative immediate-capture threat probes for Hard and Expert, including identification of newly threatened stones through real `placeStone()` simulation;
- bounded setup probes that recognize short two-own-move capture plans without changing turn rules, session history, or persisted state;
- alpha-beta pruning over the existing deterministic minimax search with exact transposition caching only for fully searched nodes;
- selective quiescence-style horizon extensions that continue only immediate score-changing capture/release moves on Hard and Expert;
- deterministic `src/game/ai-match.ts` AI-vs-AI harness that validates every generated move through the authoritative game core;
- paired Expert-vs-Normal and Expert-vs-Hard strength-regression tests with swapped colors, non-losing paired requirements, and a positive aggregate captured-score margin.

### Changed

- Hard and Expert move ordering now combines ordinary tactical ranking with cycle-closing pressure, opponent closing-point blocking, immediate threat forecasts, local danger, and bounded setup potential;
- Expert uses the strongest strategic analysis while preserving deterministic behavior and the same four user-facing difficulty contracts introduced in 0.7.0;
- Hard may extend one forcing capture/release continuation beyond its nominal horizon on ordinary-size positions, while Expert may extend up to two;
- at 250+ stones expensive setup probes are disabled, immediate-threat budgets are reduced, Hard forcing extensions are disabled, and Expert is reduced to one extension to keep browser work bounded;
- search caches now also cover connected components, enclosure pressure, threat probes, and setup probes while remaining ephemeral to one AI move;
- AI documentation, architecture, product status, repository rules, and both READMEs now describe strategic quality analysis and deterministic strength regressions;
- source version advanced to 0.8.0.

## [0.7.0] - 2026-08-31

### Added

- four selectable computer difficulty levels: Easy, Normal, Hard, and Expert;
- per-difficulty bounded search profiles with progressively deeper minimax: immediate move only, opponent reply, computer continuation, and final opponent reply;
- adaptive per-level search budgets that shrink as the board grows;
- per-move evaluation and transposition caches keyed by rule-relevant position state, including active capture geometry;
- version-2 preference persistence for game mode plus AI difficulty, with automatic migration of 0.6.0 preferences to Normal difficulty;
- localized and accessible difficulty selector in computer mode;
- AI regression coverage for all four levels, search-profile depth, large-position budget reduction, immediate captures, threat blocking, determinism, and 300-stone Expert search.

### Changed

- Normal difficulty preserves the intended bounded one-reply behavior of the original 0.6.0 opponent;
- Hard now searches a selective computer continuation after each considered opponent reply;
- Expert searches one further bounded opponent reply and uses the widest candidate budget;
- Easy deliberately omits reply search for a faster and more forgiving opponent while still using real game-core simulation and immediate capture scoring;
- the computer difficulty can be changed without resetting or rewriting the current game and is stored separately from the authoritative move log;
- AI documentation and architecture now describe multi-ply search, adaptive profiles, ephemeral transposition reuse, and preference migration;
- source version advanced to 0.7.0.

## [0.6.0] - 2026-08-31

### Added

- deterministic offline computer opponent playing Blue while the human plays Red;
- switchable and independently persisted `Two players` / `Vs computer` game mode without changing the authoritative move-log format;
- pure `src/game/ai.ts` search engine with no DOM, Canvas, storage, service-worker, or network dependencies;
- bounded frontier candidate generation around active stones, tactical move ranking, real core simulation, and one-opponent-reply minimax evaluation;
- immediate-capture preference, obvious one-move threat blocking, capture/house/release awareness through authoritative `placeStone()` simulation, and connected-shape tie-breaking;
- adaptive AI search budgets that decrease as positions grow to keep browser work bounded;
- deterministic AI regression tests covering legal/non-mutating choice, immediate capture, threat blocking, wrong-turn rejection, and a 300-stone sparse position;
- versioned game-mode preference persistence with fail-closed invalid-data handling;
- dedicated `docs/AI.md` describing the AI contract, search model, limitations, and invariants.

### Changed

- the top bar now includes an accessible game-mode selector with responsive mobile layout and localized labels;
- in computer mode the score/turn UI identifies the human as Red and the computer as Blue and announces computer thinking/moves through the existing live region;
- computer turns are scheduled only while the document is visible, cancelled on page hide, and resumed on foreground/pageshow so background suspension cannot strand the saved game on Blue's turn;
- computer-generated moves use `playMove()` and are persisted/replayed exactly like human moves;
- Undo in computer mode rolls back the computer move plus the preceding human move when both exist, returning the user to the previous decision point;
- switching to computer mode while Blue is already to move lets the computer take over that turn without resetting the game;
- if the computer cannot produce a legal move, the UI fails safe to local two-player mode instead of inventing a move or blocking the session;
- Phase 5 computer opponent is complete and source version advanced to 0.6.0.

## [0.5.0] - 2026-08-31

### Added

- explicit PWA update lifecycle with a user-facing refresh prompt instead of silent mid-session replacement, plus update checks when the app returns to the foreground, reconnects, and periodically while open;
- offline-ready, offline, online-restored, and PWA-error status feedback without making network availability part of game state;
- keyboard board interaction: arrow-key intersection navigation, Enter/Space placement, plus/minus zoom, automatic camera follow, visible keyboard cursor, and screen-reader announcements;
- skip-link, board instructions, keyboard shortcut metadata, live status regions, stronger focus-visible treatment, forced-colors support, and reduced-motion safeguards;
- mobile/installed-PWA metadata, safe-area-aware layout, 44px primary touch targets, Apple touch icon, and a PNG PWA icon alongside the scalable SVG icon;
- build-time PWA verification that requires the generated manifest, service worker, install icons, Apple touch icon linkage, and expected standalone metadata;
- stress regression coverage for 500 reversible sparse moves, bounded visible-grid work on an 8K viewport at minimum zoom, and 2,000 repeated pan/zoom transforms.

### Changed

- service-worker registration now uses a prompt-based update flow so the user explicitly applies a waiting version;
- viewport persistence is debounced during navigation and flushed when the page is hidden, reducing synchronous localStorage write churn;
- Canvas backing resolution is capped at device-pixel-ratio 3 to avoid disproportionate memory use on extreme-density displays while CSS-space game geometry remains unchanged;
- visible grid bounds are calculated through a pure tested viewport helper, keeping render loops proportional to the current screen;
- the PWA manifest and precache configuration explicitly cover install/offline assets and remove outdated Workbox caches;
- the application shell now handles dynamic mobile viewport units, display cutouts/safe areas, overscroll suppression, dark theme metadata, and standalone-friendly browser chrome;
- the project icon enclosure was corrected so every boundary point lies on a grid intersection and every consecutive boundary step obeys the game's one-step adjacency rule;
- Phase 4 browser/PWA/accessibility hardening is complete and source version advanced to 0.5.0.

## [0.4.0] - 2026-08-31

### Added

- pure viewport model for screen↔game coordinate conversion, panning, anchored zoom, integer grid snapping, and safe numeric bounds;
- practically unbounded one-pointer board panning for mouse and touch with a movement threshold that preserves ordinary click/tap placement;
- mouse-wheel and trackpad zoom anchored at the pointer position;
- two-pointer pinch zoom/pan anchored at the moving gesture midpoint, with placement suppressed after pinch gestures;
- independently versioned local viewport persistence and restore, separate from authoritative game-state persistence;
- viewport regression tests covering coordinate round-trip, snapping after transforms, pan direction, zoom anchoring, zoom bounds, center bounds, persistence round-trip, malformed data, unsupported versions, and unsafe ranges.

### Changed

- Canvas rendering now derives its visible grid range from the viewport instead of assuming the game origin is permanently centered;
- off-screen stones are culled and capture hatching is generated only across the bounded visible canvas before clipping, avoiding work proportional to distant world extents;
- visual dot radius, capture outline width, and hatch spacing adapt within bounded ranges as zoom changes;
- new-game reset now returns the viewport to origin at default zoom while preserving the existing confirmed rule/session reset behavior;
- user-facing hints, product specification, architecture documentation, and repository rules now describe implemented pan/zoom interaction and viewport-state separation;
- Phase 3 board navigation is complete and the roadmap moves to browser/PWA polish, accessibility, and broader performance stress testing;
- source version advanced to 0.4.0.

## [0.3.0] - 2026-08-31

### Added

- reversible game-session history with one-move undo that restores player, capture state, released/captured dots, and derived score;
- confirmed new-game/reset flow for games already in progress;
- versioned browser-local persistence using an ordered legal move log;
- deterministic restore by replaying saved moves through the authoritative game core, including restoration of undo history;
- safe rejection and removal of malformed, illegal, corrupted, or unsupported persisted move logs;
- persistence regression tests covering state replay, capture/score reconstruction, invalid repeated moves, malformed coordinates, and clearing saved games;
- topology hardening for direct-capture priority, nested-house minimum selection, partial overlap of opponent captures, and dense legal adjacency graphs.

### Changed

- application composition now operates on a game session rather than mutating a standalone current state reference;
- undo availability is reflected directly in the controls and survives a page reload through move-log reconstruction;
- persistence stores no authoritative score or capture geometry; all derived state is rebuilt by rule replay;
- Phase 2 game-state ergonomics is complete and the roadmap now moves to pan/zoom and practically unbounded viewport interaction;
- source version advanced to 0.3.0.

## [0.2.0] - 2026-08-31

### Added

- house activation when an opponent enters an empty house without completing a direct capture on that move;
- capture-of-capture resolution with deactivation of fully surrounded opponent captures;
- release of previously captured own dots when the opponent capture holding them is surrounded;
- multiple independent captures completed by one move;
- deterministic minimum-face selection for competing valid boundaries;
- topology regression coverage for strict boundary/interior handling, long-gap rejection, nested capture release, multiple capture resolution, and large game coordinates.

### Changed

- score is explicitly derived from the current active capture set after every move;
- capture resolution order is now direct mover captures first, then opponent-house activation only when the mover completed no direct capture;
- rule, architecture, and README documentation now describe the implemented advanced capture behavior;
- source version advanced to 0.2.0.

## [0.1.0] - 2026-08-31

### Added

- initial TypeScript, Canvas, Vite, and PWA application;
- local two-player dot placement on grid intersections;
- ordinary neighboring-dot enclosure detection and capture scoring;
- capture outline, translucent fill, and light diagonal hatching;
- Russian/English UI, CI, GitHub Pages deployment, and proprietary All Rights Reserved license.
