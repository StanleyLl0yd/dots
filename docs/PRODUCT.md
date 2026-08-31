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

- A click or tap is converted from screen pixels through the current viewport into game-space coordinates and rounded exactly once to the nearest integer grid intersection before placement is attempted.
- A one-pointer drag pans the viewport. A small screen-space threshold separates taps/clicks from deliberate drag gestures.
- Mouse-wheel and trackpad zoom preserve the game-space point under the pointer as the zoom anchor.
- Two-pointer pinch preserves the game-space point under the gesture midpoint while allowing the midpoint itself to move, producing combined zoom and pan.
- Zoom is clamped to a practical readable range and viewport center coordinates are bounded to a very large safe numeric range to prevent pathological floating-point/render loops.
- Resizing the browser keeps the same game-space viewport center rather than shifting stones in game coordinates.
- Grid rendering is generated only for the currently visible game-coordinate range.
- Off-screen stones are culled; capture hatching is clipped and generated only across the visible canvas.

Viewport state is not game state. It is saved independently with its own format version and may be discarded without changing any move, capture, score, current player, or undo history. Starting a new game resets the viewport to origin `(0, 0)` at zoom `1`.

## Current implementation status

Version **0.4.0** supports the advanced local capture flow, reversible game-state ergonomics, and practically unbounded board navigation:

- alternating local two-player placement on grid intersections;
- strict 8-direction neighboring-dot topology;
- detection of newly closed simple capture boundaries;
- rejection of open contours and long-gap pseudo-boundaries;
- empty houses that do not score until entered;
- house activation on opponent entry when the mover completes no direct capture;
- multiple independent captures completed by one move;
- deterministic minimum-face selection;
- capture-of-capture and release of dots held by fully surrounded opponent captures;
- removal of several nested opponent captures by one outer capture;
- score derived from active captures;
- blocking placement inside active captured areas;
- Canvas outline, translucent fill, and light diagonal hatching for completed captures;
- move history and exact one-move undo;
- confirmed new-game/reset flow;
- versioned automatic local save and deterministic replay restore;
- restoration of undo history after page reload;
- pan/zoom viewport independent from rule state;
- one-pointer drag, wheel/trackpad zoom, and two-pointer pinch interaction;
- anchor-preserving zoom and exact screen↔game transforms;
- separately versioned viewport persistence and safe restore;
- viewport coordinate, snapping, zoom-anchor, persistence, and bounds regression tests.

Remaining rule-engine work is ongoing adversarial/stress coverage rather than a missing principal rule. Remaining product work before AI is mostly browser/mobile polish, accessibility, offline/PWA hardening, and performance testing on very long games.

## Delivery phases

### Phase 0 — repository and web foundation — complete

- repository structure;
- TypeScript + Canvas + Vite + PWA;
- CI and GitHub Pages deployment;
- Russian/English locale handling;
- visual notebook-grid shell;
- proprietary license and project documentation.

### Phase 1 — advanced local capture rules — complete in 0.2.0

- legal basic placement;
- ordinary capture detection;
- strict neighboring-point boundary construction;
- minimum-area capture resolution;
- house activation;
- multiple captures in one move;
- capture-of-capture and release;
- nested opponent-capture removal;
- score recalculation from active state;
- topology regression tests;
- captured-area rendering and placement blocking.

### Phase 2 — game-state ergonomics — complete in 0.3.0

- new-game/reset confirmation flow;
- undo backed by rule-state history;
- versioned local persistence of unfinished games;
- deterministic restore by replaying the legal move log through the game core;
- restored undo history after reload;
- safe rejection of malformed or unsupported saves.

JSON import/export remains optional and should be added only if it is clearly useful without complicating the core flow.

### Phase 3 — board navigation — complete in 0.4.0

- practically unbounded viewport over integer game coordinates;
- one-pointer mouse/touch panning;
- mouse-wheel and trackpad zoom;
- two-pointer pinch zoom/pan;
- anchor-preserving zoom mathematics;
- visible-range grid rendering and off-screen stone culling;
- viewport persistence kept separate from authoritative move history;
- reset to origin on new game;
- viewport regression tests and numeric safety bounds.

### Phase 4 — browser and PWA polish

- accessibility and keyboard-oriented interaction where useful without changing the core game;
- reduced-motion handling for any later animations;
- improved mobile-browser and installed-PWA behavior;
- offline/update lifecycle hardening;
- performance stress testing for very long games and large captured regions.

### Phase 5 — computer opponent

AI may be added only after the rules engine, history model, and viewport interaction are stable. AI logic must use the game core without depending on Canvas or browser UI.

### Phase 6 — optional Android packaging

Package the same web codebase with Capacitor only after the PWA version is stable.

## Visual direction

- warm squared-paper background;
- restrained red and blue ink colors;
- thin notebook-like grid;
- captured areas shown with a clear boundary plus translucent fill and subtle hatching;
- minimal controls around the board;
- no glossy casino/game-dashboard styling;
- dark mode may reinterpret the paper aesthetic without reducing dot/boundary contrast.

## Technical invariants

- Game coordinates are integers and are never derived from viewport pixels after input conversion.
- Rendering cannot be the source of truth for rules.
- Capture boundaries are stored as ordered game-coordinate paths.
- Every consecutive pair of boundary coordinates, including the last-to-first pair, must have Chebyshev distance exactly `1`; longer boundary edges are invalid.
- Captured stones do not participate in boundary construction until the capture holding them is deactivated.
- Direct captures for the mover resolve before opponent-house activation is considered.
- Fully surrounded active opponent captures are removed before score is derived from the resulting active state.
- Capture visuals may be rendered only from confirmed active capture state.
- Score must be reproducible from the current active capture state.
- Undo must restore rule state, not visually approximate it.
- Persisted unfinished games must be versioned.
- Persisted moves must be replayed through the authoritative game core; persisted capture geometry or score must never become a trusted parallel source of truth.
- Invalid or unsupported persisted move logs must fail closed to a fresh game.
- Viewport center and zoom are presentation state only and must never be stored inside `GameState` or alter capture/scoring logic.
- Screen coordinates must be transformed to game space and snapped to an integer intersection before a move reaches the game core.
- Pan and zoom must preserve game coordinates; viewport transforms may change only the screen representation.
- Viewport persistence must use a separate key and explicit version and must fail closed without invalidating a valid saved game.
- Rendering loops must operate on visible coordinate ranges or bounded screen-space work rather than iterating across arbitrary world extents.
