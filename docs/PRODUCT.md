# Dots — Product Specification

## Product

**Dots** is a minimalist digital implementation of the classic paper-and-pencil game known in Russian as **«Точки»**. Players place colored dots on intersections of a square grid and try to surround opponent dots with closed chains of their own dots.

The product should feel like squared notebook paper with two pens rather than a generic board-game interface.

## Core principles

- The capture mechanic is the product.
- No progression, currencies, power-ups, loot, energy, quests, world map, or unrelated meta systems.
- Game rules stay independent from rendering and platform UI.
- The browser version is the primary implementation.
- The same core should remain suitable for later Android packaging through Capacitor.
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

Version 0.7.0 provides four selectable computer strengths over one shared deterministic engine.

- **Easy** evaluates a small bounded set of immediate computer moves and does not search an opponent reply.
- **Normal** searches a bounded opponent reply and chooses the best worst-case result. It is the default and preserves the intended 0.6.0 tactical strength profile.
- **Hard** adds a selective computer continuation after each searched opponent reply.
- **Expert** adds one further bounded opponent reply and uses the widest candidate budget.

All four levels share these invariants:

- AI logic lives in `src/game/ai.ts` and imports no DOM, Canvas, storage, service-worker, or network APIs.
- Candidate moves are generated from empty intersections adjacent to active stones.
- A cheap local ranking prioritizes likely closing points, blocking points, same-color connectivity, contact with opponent structure, and recent local pressure.
- Shortlisted candidates are validated and simulated through `placeStone()`. The AI therefore observes real houses, captures, capture-of-capture, releases, blocked territory, and score rather than approximating those rules itself.
- Capture-score changes dominate evaluation; structural same-color connectivity is secondary.
- Search uses deterministic bounded minimax to the depth enabled by the selected difficulty.
- Per-ply candidate limits shrink as positions grow so browser work remains bounded.
- Repeated equivalent search states may be reused through an ephemeral per-move transposition cache. The cache key includes player-to-move, score, stones, inactive captured stones, and active capture geometry.
- Identical game state/difficulty/options produce the same move; no randomness or external service is used.
- If no legal AI move can be produced, the UI must fail safe to local two-player mode rather than inventing a move or leaving the saved game unusable.

Difficulty affects search policy only. It cannot change rules, scoring, legality, saved moves, or viewport state.

## Game-state ergonomics

- **Undo** in two-player mode reverses one legal move and restores the player to move, active captures, released/captured status, and score to the exact previous rule state.
- In computer mode, when the usual human+computer pair exists, Undo removes the latest computer move and the preceding human move so the human returns to the previous decision point.
- Illegal clicks do not create undo history.
- **New game** resets the board and asks for confirmation when a game is in progress.
- An unfinished game is saved automatically in browser-local storage after every legal move and Undo.
- Persistence stores a versioned ordered move log rather than trusting serialized derived capture/score state.
- Loading a save replays every stored move through the same game core used for live play, rebuilding captures, score, current player, and Undo history deterministically.
- Computer-generated moves are persisted as ordinary legal moves and require no AI-specific save format.
- Malformed, illegal, corrupted, or unsupported save data is discarded instead of being accepted as game state.
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

## Browser, accessibility, and PWA behavior

- The browser UI must remain fully usable without a network connection once the PWA shell has been cached; game-state persistence and AI never depend on the service worker or network.
- A waiting service-worker update is presented to the user and applied only after explicit activation from the running UI. The application must not silently reload an active local game merely because a new build exists.
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

Version **0.7.0** supports the planned classic local game, browser/PWA/accessibility stack, and four-level computer opponent:

- alternating placement and strict 8-direction neighboring-dot topology;
- direct captures, houses, multiple captures, deterministic minimum faces, capture-of-capture, releases, active-state score, and placement blocking;
- Canvas capture outline, translucent fill, and light diagonal hatching;
- local two-player and human-Red-vs-computer-Blue modes;
- Easy / Normal / Hard / Expert deterministic AI levels with progressively deeper bounded search;
- immediate-capture preference, opponent-reply analysis from Normal upward, selective continuation search on Hard/Expert, and a final opponent reply on Expert;
- adaptive per-level budgets and per-move evaluation/transposition reuse;
- exact Undo semantics for local mode and full human decision rollback in computer mode;
- confirmed New game;
- versioned move-log persistence with replay restoration of rules and Undo history;
- separately versioned game-mode/difficulty preferences and viewport persistence;
- pan/zoom viewport independent from rules, pointer/touch/pinch interaction, anchor-preserving transforms, and keyboard board control;
- safe-area/dynamic-viewport mobile layout, practical touch targets, focus-visible, dark, forced-colors, and reduced-motion handling;
- installable offline-ready PWA shell with explicit update prompt, reconnect/foreground/periodic update checks, and status feedback;
- build-time verification of generated manifest, service worker, and required install/mobile assets;
- bounded visible-grid rendering, DPR cap, debounced viewport persistence, and stress tests for long histories and repeated/extreme viewport transforms;
- AI regression tests covering all four search profiles and a 300-stone Expert position.

Remaining work is mainly empirical real-device/browser testing, continued adversarial topology coverage, and measured AI-quality/performance refinement rather than a missing principal game layer.

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

### Phase 6 — optional refinement and Android packaging

Further AI refinement must be driven by measured weaknesses and remain bounded. Package the same web codebase with Capacitor only after sufficient real-device PWA validation.

## Visual direction

- warm squared-paper background;
- restrained red and blue ink colors;
- thin notebook-like grid;
- captured areas shown with a clear boundary plus translucent fill and subtle hatching;
- minimal controls around the board;
- no glossy casino/game-dashboard styling;
- dark/high-contrast modes may reinterpret the paper aesthetic without reducing dot/boundary legibility.

## Technical invariants

- Game coordinates are integers and are never derived from viewport pixels after input conversion.
- Rendering cannot be the source of truth for rules.
- Capture boundaries are ordered game-coordinate paths and every consecutive pair, including last-to-first, has Chebyshev distance exactly `1`.
- Captured stones do not participate in boundary construction until their holding capture is deactivated.
- Direct captures resolve before opponent-house activation; surrounded opponent captures are removed before score derivation.
- Capture visuals may be rendered only from confirmed active capture state; score is reproducible from that state.
- Undo restores authoritative rule state rather than approximating it visually.
- Persisted games are versioned move logs replayed through the authoritative core; persisted capture geometry/score is never trusted.
- Computer moves are ordinary core moves and require no parallel AI persistence format.
- AI may rank/propose coordinates only; legality and resulting captures/score remain authoritative core responsibilities.
- AI must not import or depend on Canvas, DOM, viewport, service worker, storage, or network state.
- AI difficulty may change only bounded search policy, never game rules or authoritative persistence.
- AI search must remain bounded independently from world-coordinate distance and must fail safely if no move is produced.
- AI caches must be ephemeral and keyed by rule-relevant position state; they are never trusted or persisted as `GameState`.
- Invalid or unsupported persisted move logs fail closed to a fresh game.
- Game-mode/difficulty preference and viewport are presentation/session preferences stored separately from the move log.
- Screen input is transformed to game space and snapped to an integer intersection before the core receives a move.
- Pan/zoom and accessibility camera-follow may change only presentation.
- Rendering loops operate on visible/bounded work rather than arbitrary world extents.
- Offline/online/service-worker state cannot alter or replace `GameState` or its persistence.
- A waiting service-worker update must not silently reload an active game; the user controls activation from the update prompt.
- Keyboard placement must call the same game-core path as pointer placement; accessibility is not a parallel rules implementation.
- Essential state must remain perceivable with reduced motion and forced colors; focus must remain visible for keyboard interaction.
- Production builds must fail if required PWA/offline install artifacts are missing.
