# Dots — Product Specification

## Product

**Dots** is a minimalist digital implementation of the classic paper-and-pencil game known in Russian as **«Точки»**. Two players alternately place colored dots on intersections of a square grid and try to surround opponent dots with closed chains of their own dots.

The product should feel like squared notebook paper with two pens rather than a generic board-game interface.

## Core principles

- The capture mechanic is the product.
- No progression, currencies, power-ups, loot, energy, quests, world map, or unrelated meta systems.
- Game rules stay independent from rendering and platform UI.
- The browser version is the primary implementation.
- The same core should remain suitable for later Android packaging through Capacitor.
- No backend, account, analytics, advertising, tracking, or required network connection in the initial product.

## Rules

### Board and turns

1. The game is played on intersections of a square grid.
2. Two players use different colors: red and blue.
3. Players alternate turns.
4. One turn places exactly one dot on a legal empty intersection.
5. The first player is red by default.

### Connectivity

Two distinct dots of the same color are adjacent only when they occupy neighboring grid intersections. Formally, for coordinate difference `(dx, dy)`, adjacency requires `max(abs(dx), abs(dy)) = 1`. This gives 8-direction connectivity: horizontal, vertical, and diagonal neighbors are allowed.

Every pair of consecutive vertices in a capture boundary must satisfy this adjacency rule, including the closing pair from the last vertex back to the first. A boundary may not skip an intersection, bridge a gap, or use a straight or diagonal segment spanning more than one grid step.

### Capture

1. A direct capture occurs when a move completes a closed, non-self-intersecting chain of the current player's active dots in which every consecutive pair is adjacent under the rule above.
2. At least one uncaptured opponent dot must be strictly inside the closed chain when it resolves.
3. If one move completes several independent captures, all valid minimum faces created by that move resolve.
4. If several valid boundaries could capture the same dot, the engine resolves the minimum valid captured face deterministically.
5. The captured area is outlined through the surrounding player's boundary dots and visually filled or lightly hatched with that player's color.
6. Captured opponent dots are inactive while the capture holding them remains active and count toward the surrounding player's score.
7. No new dot may be placed strictly inside an active captured area.

### Houses

A closed chain containing no opponent dots is a **house** and is not a capture while empty. It is not scored or rendered as captured territory.

If the opponent later places a dot strictly inside the house and that move does not complete a direct capture for the entering player, the smallest valid containing house activates immediately as a capture by the house owner. The entering opponent dot and any other eligible opponent dots inside that face become captured.

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

## Game-state ergonomics

- **Undo** reverses one legal move and restores the player to move, active captures, released/captured status, and score to the exact previous rule state.
- Illegal clicks do not create undo history.
- **New game** resets the board and asks for confirmation when a game is in progress.
- An unfinished game is saved automatically in browser-local storage after every legal move and undo.
- Persistence stores a versioned ordered move log rather than trusting serialized derived capture/score state.
- Loading a save replays every stored move through the same game core used for live play, rebuilding captures, score, current player, and undo history deterministically.
- Malformed, illegal, corrupted, or unsupported save data is discarded instead of being accepted as game state.
- Starting a new game clears the saved unfinished game.

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

Viewport state is independently persisted and may be discarded without affecting moves, captures, score, current player, or Undo. Starting a new game resets it to `(0, 0, 1)`.

## Browser, accessibility, and PWA behavior

- The browser UI must remain fully usable without a network connection once the PWA shell has been cached; game-state persistence never depends on the service worker.
- A waiting service-worker update is presented to the user and applied only after explicit activation from the running UI. The application must not silently reload an active local game merely because a new build exists.
- Update checks may occur on reconnect, foreground return, and a bounded periodic cadence.
- Offline/online/update status is presentation state only and must never alter game rules or persisted moves.
- The game board is keyboard focusable, includes assistive instructions, and reports keyboard cursor movement and placement results through live regions.
- Primary controls maintain practical touch targets and visible focus states.
- Mobile layout accounts for safe-area insets and dynamic viewport height.
- Dark mode, forced-colors, and reduced-motion preferences must not hide essential game state.
- Canvas backing resolution may be bounded independently from CSS/game-space geometry to prevent extreme device pixel ratios from causing disproportionate memory use.

## Current implementation status

Version **0.5.0** supports the complete planned local capture/session/navigation flow plus browser/PWA/accessibility hardening:

- alternating local two-player placement and strict 8-direction neighboring-dot topology;
- direct captures, houses, multiple captures, deterministic minimum faces, capture-of-capture, releases, active-state score, and placement blocking;
- Canvas capture outline, translucent fill, and light diagonal hatching;
- exact one-move Undo and confirmed New game;
- versioned move-log persistence with replay restoration of rules and Undo history;
- pan/zoom viewport independent from rules, pointer/touch/pinch interaction, anchor-preserving transforms, and separate viewport persistence;
- keyboard board cursor, keyboard placement/zoom, cursor-follow camera behavior, assistive instructions, and live announcements;
- safe-area/dynamic-viewport mobile layout, practical touch targets, focus-visible, dark, forced-colors, and reduced-motion handling;
- installable offline-ready PWA shell with explicit update prompt, reconnect/foreground/periodic update checks, and status feedback;
- corrected install icon geometry and mobile/PWA icon assets;
- build-time verification of generated manifest, service worker, and required install/mobile assets;
- bounded visible-grid rendering, DPR cap, debounced viewport persistence, and stress tests for long histories and repeated/extreme viewport transforms.

Remaining rule-engine work is ongoing adversarial coverage rather than a missing principal rule. Real-device/browser validation remains useful, but no major local-game/PWA/accessibility layer is intentionally missing before optional AI work.

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

### Phase 5 — computer opponent

AI may be added now that the rules engine, history model, viewport interaction, persistence, PWA lifecycle, and accessibility path are stable. AI logic must use the game core without depending on Canvas or browser UI.

### Phase 6 — optional Android packaging

Package the same web codebase with Capacitor only after the PWA version has sufficient real-device validation.

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
- Undo restores rule state rather than approximating it visually.
- Persisted games are versioned move logs replayed through the authoritative core; persisted capture geometry/score is never trusted.
- Invalid or unsupported persisted move logs fail closed to a fresh game.
- Viewport is presentation state only, stored separately, and cannot alter rules.
- Screen input is transformed to game space and snapped to an integer intersection before the core receives a move.
- Pan/zoom and accessibility camera-follow may change only presentation.
- Rendering loops operate on visible/bounded work rather than arbitrary world extents.
- Offline/online/service-worker state cannot alter or replace `GameState` or its persistence.
- A waiting service-worker update must not silently reload an active game; the user controls activation from the update prompt.
- Keyboard placement must call the same game-core path as pointer placement; accessibility is not a parallel rules implementation.
- Essential state must remain perceivable with reduced motion and forced colors; focus must remain visible for keyboard interaction.
- Production builds must fail if required PWA/offline install artifacts are missing.
