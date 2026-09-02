# Dots — Product Specification

## Product

**Dots** is a minimalist digital implementation of the classic paper-and-pencil game known in Russian as **«Точки»**. Players place colored dots on intersections of a square grid and try to surround opponent dots with closed chains of their own dots.

The product should feel like squared notebook paper with two pens rather than a generic board-game interface.

## Core principles

- The capture mechanic is the product.
- No progression, currencies, power-ups, loot, energy, quests, world map, or unrelated meta systems.
- Game rules stay independent from rendering and platform UI.
- The browser version is the primary implementation.
- The same core is shared by the web/PWA build and the current Tauri native shell; platform packaging must not duplicate rules.
- No backend, account, analytics, advertising, tracking, or required network connection in the initial product.
- Computer play must consume the same authoritative game core rather than duplicating rules.

## Rules

### Board and turns

1. The game is played on intersections of a square grid.
2. Two sides use different colors: red and blue.
3. Players alternate turns.
4. One turn places exactly one dot on a legal empty intersection.
5. The first side is red by default.

### Connectivity

Two distinct dots of the same color are adjacent only when they occupy neighboring grid intersections. Formally, for coordinate difference `(dx, dy)`, adjacency requires `max(abs(dx), abs(dy)) = 1`. This gives 8-direction connectivity: horizontal, vertical, and diagonal neighbors are allowed.

Every pair of consecutive vertices in a capture boundary must satisfy this adjacency rule, including the closing pair from the last vertex back to the first. A boundary may not skip an intersection, bridge a gap, or use a straight or diagonal segment spanning more than one grid step.

### Capture

1. A direct capture occurs when a move completes a closed, non-self-intersecting chain of the current side's active dots in which every consecutive pair is adjacent under the rule above.
2. At least one uncaptured opponent dot must be strictly inside the closed chain when it resolves.
3. If one move completes several independent captures, all valid minimum faces created by that move resolve.
4. If several valid boundaries could capture the same dot, the engine resolves the minimum valid captured face deterministically.
5. The captured area is outlined through the surrounding side's boundary dots and visually filled or lightly hatched with that side's color.
6. Captured opponent dots are inactive while the capture holding them remains active and count toward the surrounding side's score.
7. No new dot may be placed strictly inside an active captured area.

### Houses

A closed chain containing no opponent dots is a **house** and is not a capture while empty. It is not scored or rendered as captured territory.

If the opponent later places a dot strictly inside the house and that move does not complete a direct capture for the entering side, the smallest valid containing house activates immediately as a capture by the house owner. The entering opponent dot and any other eligible opponent dots inside that face become captured.

Direct capture by the mover has priority over house activation on the same move.

### Capturing an opponent capture

Active captured areas may themselves be surrounded. When a new capture fully surrounds one or more active captures owned by the opponent:

1. the surrounded opponent captures are deactivated;
2. dots previously captured by those deactivated captures are released and become active again;
3. eligible opponent dots inside the new outer capture, including surrounded opponent boundary dots, are captured by the new owner;
4. score is recalculated from the resulting active capture state.

This resolution can remove several opponent captures at once. Score must never depend on an irreversible accumulated counter.

### End of game

The primary score is the number of currently captured opponent dots. A later complete release may support agreed ending conditions such as mutual finish/pass or a configured finite board. The web implementation should not invent a victory condition that changes classic capture scoring.

## Game modes

Dots provides two browser-local modes:

- **Two players** — both Red and Blue are controlled locally by people.
- **Vs computer** — the human controls Red and the computer controls Blue.

The selected mode is presentation/session preference rather than game-rule state. Switching modes does not rewrite the authoritative move log or reset the board. If computer mode is enabled while Blue is already to move, the computer takes over that Blue turn.

The computer opponent is deterministic and offline. It may propose only a coordinate. Acceptance of that coordinate still occurs through the same `playMove()` / `placeStone()` path as every human move.

## Computer opponent

Version **0.8.1** keeps the four selectable strengths introduced in 0.7.0, the strategic analysis added in 0.8.0, and hardens concrete Expert tactical decisions without creating a second rules engine. Version **0.8.2** is toolchain-only and does not alter these AI contracts.

- **Easy** evaluates a small bounded set of immediate computer moves and does not search an opponent reply.
- **Normal** searches a bounded opponent reply and chooses the best worst-case result.
- **Hard** adds a selective computer continuation, strategic enclosure/threat ordering, and a bounded forcing-capture extension on ordinary-size positions.
- **Expert** adds one further bounded opponent reply, the widest strategic analysis, alpha-beta pruning, up to two forcing-capture extensions on ordinary-size positions, and root tactical safety/priority rules backed only by real game-core outcomes.

All four levels share these invariants:

- AI logic lives in `src/game/ai.ts` and imports no DOM, Canvas, storage, service-worker, or network APIs.
- Candidate moves are generated from empty intersections adjacent to active stones.
- Active same-color connectivity components are used to identify frontier points that can close an already connected path into a cycle. This helps rank likely house/capture construction and likely opponent closing points without declaring a capture itself.
- Hard/Expert use a wider bounded authoritative root pre-scan before expensive search so real score-changing moves are not lost solely to heuristic seed ordering; all retained candidates are still simulated through `placeStone()`. Houses, captures, capture-of-capture, releases, blocked territory, and score therefore remain authoritative game-core behavior.
- Expert rejects a root move that immediately increases the opponent's score when at least one safe candidate exists, and safe immediate captures take root tactical priority before deeper comparison.
- Capture-score changes dominate evaluation. Secondary evaluation includes connected structure, local stone danger, and near-cycle pressure.
- Hard and Expert use bounded authoritative probes for immediate capture threats and short setup sequences that may create a capture opportunity on a later own move.
- Search uses deterministic bounded minimax with tactical move ordering and alpha-beta pruning.
- Hard and Expert may selectively extend the nominal horizon only through immediate score-changing capture/release moves.
- Per-ply candidate limits and expensive strategic probes shrink as positions grow. At 250+ stones setup probing is disabled and forcing extensions are reduced.
- Repeated equivalent search states may be reused through ephemeral per-move caches keyed by rule-relevant position state, including active capture geometry.
- Identical game state/difficulty/options produce the same move; no randomness or external service is used.
- If no legal AI move can be produced, the UI must fail safe to local two-player mode rather than inventing a move or leaving the saved game unusable.

Difficulty and strategic heuristics affect search policy only. They cannot change rules, scoring, legality, saved moves, or viewport state.

### AI strength regression

`src/game/ai-match.ts` runs deterministic AI-vs-AI games by feeding every proposed move back through the authoritative `placeStone()` path. The CI suite uses short paired Expert-vs-Normal and Expert-vs-Hard matches, swapping Red/Blue assignment. Expert must not lose either paired comparison and must maintain a positive aggregate score margin across the suite.

`src/game/ai-tactical-benchmark.test.ts` complements those paired games with six fixed Expert positions: double capture, mandatory blocking, false-closure rejection, hostile-house safety, counter-capture under two independent threats, and capture-of-capture release. All six are required regressions in 0.8.1.

These are deterministic tactical regression guards, not an Elo system or a wall-clock benchmark. Match length remains deliberately short so CI does not become hardware-sensitive.

### Browser AI orchestration in 0.9.0

The browser sends a structured-cloned `GameState` plus AI options to a dedicated Web Worker. Worker results are proposals only: the UI validates the request generation and coordinate, then accepts it through the same authoritative `playMove()` path. Undo, New game, mode/difficulty changes, page hide, and hidden-document transitions may terminate pending work; stale generations must never apply a move. AI search policy, rule evaluation, and saved-game format are unchanged.

Version **0.9.1** further hardens generation ownership so callbacks from cancelled or stale timers/Workers cannot clear the thinking state owned by a newer computer request. Search depth, evaluation, difficulty semantics, and deterministic move selection are unchanged.

## Game-state ergonomics

- **Undo** in two-player mode reverses one legal move and restores the player to move, active captures, released/captured status, and score to the exact previous rule state.
- In computer mode, when the usual human+computer pair exists, Undo removes the latest computer move and the preceding human move so the human returns to the previous decision point.
- Illegal clicks do not create undo history.
- **New game** resets the board and uses an accessible in-app confirmation dialog when a game is in progress.
- An unfinished game is saved automatically in browser-local storage after every legal move and Undo.
- Persistence stores a versioned ordered move log rather than trusting serialized derived capture/score state.
- Loading a save replays every stored move through the same game core used for live play, rebuilding captures, score, current player, and Undo history deterministically.
- Computer-generated moves are persisted as ordinary legal moves and require no AI-specific save format.
- Malformed, illegal, corrupted, unsupported, or non-safe-integer move data is discarded instead of being accepted as game state.
- Starting a new game clears the saved unfinished game.
- Game mode and AI difficulty are versioned preferences stored separately from both the game move log and viewport state.
- Preference format version 2 migrates valid 0.6.0 version-1 mode data and assigns **Normal** difficulty.

## Board navigation

The visible board is a viewport over integer game coordinates rather than a finite board object.

- Pointer placement is inverse-transformed through the viewport and rounded exactly once to the nearest integer intersection before reaching game logic.
- One-pointer drag pans with a movement threshold that separates placement from navigation.
- Wheel/trackpad zoom preserves the game point below the pointer.
- Two-pointer pinch preserves the game point below the moving gesture midpoint, providing combined zoom and pan.
- Keyboard focus exposes an integer intersection cursor. Arrow keys move it one grid step, Enter/Space attempt placement, and plus/minus zoom around that cursor.
- The keyboard cursor is kept visible by presentation-only viewport recentering.
- Zoom and viewport center values are numerically bounded for rendering safety, not as gameplay board edges.
- Grid/capture/stone rendering work is limited to visible or bounded screen-space ranges.

Viewport state is independently persisted and may be discarded without affecting moves, captures, score, current player, Undo, game mode, or AI difficulty. Starting a new game resets it to `(0, 0, 1)`.

### UX feedback in 0.9.0

Latest-move rings, move counters, desktop snap previews, invalid-placement markers, capture emphasis, first-run Help, and the mobile action toolbar are presentation only. **Fit game** derives a bounded viewport from placed-stone coordinates and cannot alter rule-space coordinates or history. Capture feedback is derived from confirmed before/after active capture state; reduced-motion mode may suppress transient emphasis but not essential textual/assistive feedback.

A compact localized **About** control sits beside the product title and opens version, copyright, and project-link information without touching game/session state.

## Browser, accessibility, and PWA behavior

- The browser UI must remain fully usable without a network connection once the PWA shell has been cached; game-state persistence and AI never depend on the service worker or network.
- A waiting service-worker update is presented to the user and applied only after explicit activation from the running UI. The application must not silently reload an active local game merely because a new build exists. If explicit activation fails, the update action remains recoverable and the failure is reported as presentation status only.
- Update checks may occur on reconnect, foreground return, and a bounded periodic cadence.
- Offline/online/update status is presentation state only and must never alter game rules or persisted moves.
- A pending computer turn should not continue consuming work while the page is hidden; if Blue is still to move, scheduling resumes when the app returns to the foreground.
- The game board is keyboard focusable, includes assistive instructions, and reports keyboard cursor movement and placement results through live regions.
- Computer-thinking, computer-move, mode, and difficulty feedback use accessible localized controls/status paths.
- Primary controls maintain practical touch targets and visible focus states.
- Mobile layout accounts for safe-area insets and dynamic viewport height.
- Dark mode, forced-colors, and reduced-motion preferences must not hide essential game state.
- Canvas backing resolution may be bounded independently from CSS/game-space geometry to prevent extreme device pixel ratios from causing disproportionate memory use.

## Current implementation status

Version **0.9.3** is the current pre-1.0 baseline for the complete classic local game, strategically refined four-level computer opponent, fixed tactical regressions, generation-isolated browser AI turns, polished board feedback/navigation, PWA/accessibility, the shared Tauri native shell, RuStore delivery tooling, and the reproducible audited toolchain:

- alternating placement and strict 8-direction neighboring-dot topology;
- direct captures, houses, multiple captures, deterministic minimum faces, capture-of-capture, releases, active-state score, and placement blocking;
- Canvas capture outline, translucent fill, and light diagonal hatching;
- local two-player and human-Red-vs-computer-Blue modes;
- Easy / Normal / Hard / Expert deterministic AI levels with progressively deeper bounded search;
- cycle-closing/house pressure, opponent-closing-point blocking, local stone-danger evaluation, bounded immediate-threat and setup probes on Hard/Expert;
- tactical move ordering, alpha-beta pruning, forcing capture/release horizon extensions, adaptive large-position budgets, and per-move caches;
- wider bounded Hard/Expert root discovery, Expert hostile-house safety, and safe immediate-capture root priority;
- deterministic AI-vs-AI regression harness with paired Expert-vs-Normal/Hard strength guards plus six fixed Expert tactical benchmark positions;
- exact Undo semantics for local mode and full human decision rollback in computer mode;
- confirmed New game;
- versioned move-log persistence with replay restoration of rules and Undo history plus fail-closed safe-integer coordinate validation;
- separately versioned game-mode/difficulty preferences and viewport persistence;
- pan/zoom viewport independent from rules, pointer/touch/pinch interaction, anchor-preserving transforms, and keyboard board control;
- safe-area/dynamic-viewport mobile layout, practical touch targets, focus-visible, dark, forced-colors, and reduced-motion handling;
- installable offline-ready PWA shell with explicit update prompt, reconnect/foreground/periodic update checks, retryable activation failure, and lifecycle regression coverage;
- build-time verification of generated manifest, service worker, and required install/mobile assets;
- bounded visible-grid rendering, DPR cap, debounced viewport persistence, and stress tests for long histories and repeated/extreme viewport transforms;
- AI regression tests covering all four search profiles and a 300-stone Expert position;
- committed npm and Cargo lockfiles, `npm ci` in CI/Pages, high/critical npm audit gating, maintained Node-24-compatible GitHub Actions, and Dependabot coverage for npm, Cargo, and GitHub Actions;
- a thin Tauri 2 shell that packages the same frontend/core without introducing platform-specific game rules;
- signed Android AAB and universal macOS DMG release paths plus RuStore screenshot/signing/export tooling.

Remaining pre-1.0 work is empirical real-device/browser and installed-PWA validation, keyboard/accessibility/forced-colors/reduced-motion checks, long-game responsiveness, continued adversarial topology coverage, and AI refinement only when driven by concrete failing positions. No principal software layer is missing.

## Delivery phases

### Phase 0 — repository and web foundation — complete

- repository structure;
- TypeScript + Canvas + Vite + PWA;
- CI and GitHub Pages deployment;
- Russian/English locale handling;
- visual notebook-grid shell;
- proprietary license and project documentation.

### Phase 1 — advanced local capture rules — complete in 0.2.0

- legal placement, ordinary capture detection, strict adjacency, minimum-area resolution;
- house activation, multiple captures, capture-of-capture/release, nested capture removal;
- score recalculation, topology tests, captured-area rendering, and placement blocking.

### Phase 2 — game-state ergonomics — complete in 0.3.0

- confirmed new-game/reset;
- rule-state Undo;
- versioned local move-log persistence and deterministic replay restore;
- restored Undo history and fail-closed invalid-save handling.

### Phase 3 — board navigation — complete in 0.4.0

- practically unbounded viewport;
- mouse/touch pan, wheel/trackpad zoom, two-pointer pinch;
- anchor-preserving math, visible-range rendering, off-screen culling;
- separate viewport persistence, reset, regression tests, and numeric safety bounds.

### Phase 4 — browser/PWA/accessibility hardening — complete in 0.5.0

- keyboard-operable board and assistive live feedback;
- mobile safe areas, dynamic viewport sizing, touch-target and focus polish;
- dark/forced-colors/reduced-motion handling;
- install/offline metadata and icons;
- explicit service-worker update prompt plus reconnect/foreground/periodic checks;
- production PWA artifact verification;
- bounded DPR/render work, persistence-write debouncing, and performance/stress regression coverage.

### Phase 5 — computer opponent — complete in 0.6.0

- local/computer mode selector and versioned preference;
- human Red / computer Blue turn orchestration;
- pure deterministic AI module over the game core;
- bounded frontier search and adaptive budgets;
- immediate capture and obvious one-move threat handling;
- one-reply minimax evaluation;
- full-round Undo semantics in computer mode;
- foreground/background scheduling safety;
- deterministic tactical and large-position tests.

### Phase 5.1 — four AI difficulty levels — complete in 0.7.0

- Easy / Normal / Hard / Expert selector;
- progressive bounded 1/2/3/4-ply search behavior;
- adaptive per-level budgets;
- ephemeral evaluation/transposition reuse;
- version-2 preference persistence and migration from 0.6.0;
- difficulty-aware regression and large-position tests.

### Phase 5.2 — strategic AI quality — complete in 0.8.0

- active same-color component and cycle-closing analysis;
- house/capture construction pressure and opponent closing-point blocking;
- local active-stone danger evaluation;
- bounded authoritative immediate-capture and short setup threat probes;
- improved tactical move ordering and alpha-beta pruning;
- selective forcing capture/release horizon extensions;
- adaptive reduction of expensive probes/extensions on large positions;
- deterministic AI-vs-AI paired strength regression harness.

### Phase 5.3 — tactical Expert hardening — complete in 0.8.1

- six-position fixed tactical benchmark suite;
- wider bounded authoritative root discovery for real scoring moves;
- safe-root guard against immediate hostile-house self-capture;
- safe immediate-capture priority for Expert;
- all three benchmark-discovered gaps promoted from known gaps to required regressions.

### Phase 5.4 — technical/toolchain hardening — complete in 0.8.2

- patched Vite and Vitest versions that clear the high/critical advisories reported against the previous toolchain;
- committed lockfile v3 and reproducible `npm ci` installs;
- mandatory high/critical npm audit gate before tests/build in CI;
- maintained Node-24-compatible checkout/setup and Pages GitHub Actions;
- Dependabot coverage for both npm and GitHub Actions.

### Phase 6 — game UX polish / release-candidate foundation — complete in 0.9.0

- cancellable browser Web Worker for computer search without changing AI decisions or core rules;
- latest-move marker and move counter;
- Fit game viewport recovery;
- capture and invalid-placement feedback plus desktop snap preview;
- compact first-run guidance with persistent Help dialog;
- compact mobile primary-action toolbar;
- accessible in-app New game confirmation;
- production verification that the AI Worker bundle is generated.

### Phase 6.1 — stabilization patch / release-candidate baseline — complete in 0.9.1

- safe-integer authoritative and persisted move validation;
- stale Worker/timer generation isolation from current thinking state;
- recoverable explicit PWA update activation failure;
- regression coverage for coordinate boundaries and PWA lifecycle behavior.

### Phase 6.2 — shared native shell — complete in 0.9.2

- Tauri 2 wrapper around the same compiled frontend and authoritative TypeScript game core;
- Android and macOS bundle configuration without a second rules implementation;
- localized About surface and native-safe external project link;
- native builds use relative assets and disable the browser PWA/service-worker layer.

### Phase 6.3 — RuStore/native delivery hardening — complete in 0.9.3

- signed Android App Bundle as the primary Android release artifact;
- dedicated upload-key/app-signing handoff and PEPK support without storing private signing material in the repository;
- reproducible Android emulator/CDP RuStore screenshots and publication assets;
- committed Cargo lockfile and Cargo Dependabot coverage for the native dependency graph.

### Phase 7 — 1.0 validation and optional post-1.0 work

Use 0.9.3 as the release-candidate baseline for empirical browser/PWA, Android, and macOS testing plus concrete bug fixes. Further AI work must be driven by failing positions or measured regressions. Import/export remains optional post-1.0 work rather than a prerequisite for the stable release.

## Visual direction

- warm squared-paper background;
- restrained red and blue ink colors;
- thin notebook-like grid;
- captured areas shown with a clear boundary plus translucent fill and subtle hatching;
- minimal controls around the board;
- no glossy casino/game-dashboard styling;
- dark/high-contrast modes may reinterpret the paper aesthetic without reducing dot/boundary legibility.

## Technical invariants

- Game coordinates are safe integers and are never derived from viewport pixels after input conversion.
- Rendering cannot be the source of truth for rules.
- Capture boundaries are ordered game-coordinate paths and every consecutive pair, including last-to-first, has Chebyshev distance exactly `1`.
- Captured stones do not participate in boundary construction until their holding capture is deactivated.
- Direct captures resolve before opponent-house activation; surrounded opponent captures are removed before score derivation.
- Capture visuals may be rendered only from confirmed active capture state; score is reproducible from that state.
- Undo restores authoritative rule state rather than approximating it visually.
- Persisted games are versioned move logs replayed through the authoritative core; persisted capture geometry/score is never trusted.
- Computer moves are ordinary core moves and require no parallel AI persistence format.
- AI may rank/propose coordinates only; legality and resulting captures/score remain authoritative core responsibilities.
- AI must not import or depend on Canvas, DOM, viewport, service worker, storage, or network state. Browser Worker transport may carry a structured-cloned `GameState` and options but must not become a rules authority.
- Worker responses are proposals only. Stale/cancelled generations must be ignored, and every accepted computer coordinate must still enter through `playMove()`.
- AI difficulty and strategic heuristics may change only bounded search/evaluation policy, never game rules or authoritative persistence.
- AI threat/setup probes are speculative evaluation only. They may not mutate the supplied `GameState`, session history, or persisted move log.
- Hard/Expert root tactical discovery must remain bounded and use authoritative `placeStone()` outcomes.
- Expert root safety/priority may use only actual immediate score changes produced by the core; it may not infer a parallel house or capture result.
- AI search must remain bounded independently from world-coordinate distance and must reduce expensive strategic work as positions grow.
- AI caches must be ephemeral and keyed by rule-relevant position state; they are never trusted or persisted as `GameState`.
- Alpha-beta cutoff nodes must not be cached as exact transposition values.
- AI-vs-AI regression games and fixed tactical positions must feed every tested move through the authoritative core and remain deterministic and hardware-independent.
- Invalid or unsupported persisted move logs fail closed to a fresh game.
- Game-mode/difficulty preference and viewport are presentation/session preferences stored separately from the move log.
- Screen input is transformed to game space and snapped to a safe-integer intersection before the core receives a move.
- Pan/zoom, Fit game, desktop snap preview, latest-move/invalid markers, and accessibility camera-follow may change only presentation.
- Rendering loops operate on visible/bounded work rather than arbitrary world extents.
- Offline/online/service-worker state cannot alter or replace `GameState` or its persistence.
- A waiting service-worker update must not silently reload an active game; the user controls activation from the update prompt, and activation failure must leave a retryable user action.
- Keyboard placement must call the same game-core path as pointer placement; accessibility is not a parallel rules implementation.
- Essential state must remain perceivable with reduced motion and forced colors; focus must remain visible for keyboard interaction.
- Production builds must fail if required PWA/offline install artifacts or the browser AI Worker bundle are missing.
- `package-lock.json` must remain committed and synchronized with package metadata/dependencies; CI and Pages must use `npm ci`.
- `src-tauri/Cargo.lock` must remain committed so native builds resolve one reviewed transitive Rust dependency graph.
- The Tauri/native layer may package or expose platform capabilities but must not become a second authority for rules, AI decisions, score, or saved game state.
- Native builds must not register the browser PWA/service-worker layer.
- High or critical dependency advisories must fail CI through `npm audit --audit-level=high` unless an explicit approved risk exception exists.
- GitHub Actions used for checkout/runtime setup must remain on maintained Node-24-compatible releases, with automated dependency monitoring enabled across npm, Cargo, and Actions.
