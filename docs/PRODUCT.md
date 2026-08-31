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

1. A capture occurs when a move completes a closed, non-self-intersecting chain of the current player's dots in which every consecutive pair is adjacent under the rule above.
2. At least one opponent dot must be inside the closed chain at the moment it closes.
3. The captured area is outlined through the surrounding player's boundary dots and visually filled or lightly hatched with that player's color.
4. Opponent dots inside the captured area are captured and added to the surrounding player's score.
5. Captured intersections are removed from normal play and no new dots may be placed inside the captured area.
6. A move that creates several independent captures may resolve all captures created by that move.
7. If several valid boundaries could capture the same dots, the engine must resolve the minimum valid captured area consistently and deterministically.

### Houses

A closed chain containing no opponent dots is a **house** and is not a capture. It is not scored, not filled, and the intersections inside remain playable. If the opponent later enters such a house without immediately creating a valid counter-capture, the house may become a capture according to the standard house rule.

### Capturing an opponent capture

Captured areas may themselves be surrounded. When an opponent capture is validly surrounded, previously captured dots belonging to the surrounding player are released and the score is recalculated from the resulting active captures. The implementation must derive score from game state rather than accumulating an irreversible counter.

### End of game

The primary score is the number of currently captured opponent dots. A complete release may support agreed ending conditions such as mutual finish/pass or a configured finite board. The initial web implementation should not invent a new victory condition that changes classic scoring.

## Current implementation status

The web build currently supports the ordinary capture loop:

- alternating local two-player placement on grid intersections;
- strict 8-direction neighboring-dot topology;
- detection of newly closed simple capture boundaries;
- rejection of open contours and empty houses as scored captures;
- minimum-face selection for ordinary newly captured dots;
- score derived from active captures;
- blocking placement inside active captured areas;
- Canvas outline, translucent fill, and light diagonal hatching for completed captures.

Advanced classic-rule cases are not yet complete: entering a house, capture-of-capture, release of previously captured dots, nested capture resolution, and the full set of difficult competing-boundary cases.

## Delivery phases

### Phase 0 — repository and web foundation — complete

- repository structure;
- TypeScript + Canvas + Vite + PWA;
- CI and GitHub Pages deployment;
- Russian/English locale handling;
- visual notebook-grid shell;
- proprietary license and project documentation.

### Phase 1 — complete local game — in progress

Completed core pieces:

- legal basic placement;
- ordinary capture detection;
- strict neighboring-point boundary construction;
- ordinary minimum-area capture resolution;
- score recalculation;
- local two-player mode;
- initial topology regression tests;
- captured-area rendering and placement blocking.

Remaining:

- full house behavior;
- capture-of-capture and release;
- nested and competing capture hardening;
- undo;
- persistence of an unfinished game;
- broader unit tests for difficult capture topologies.

### Phase 2 — ergonomics

- panning and zooming;
- large-board / practically infinite-board viewport;
- touch gestures;
- capture animations kept subtle and fast;
- accessibility and reduced-motion handling;
- improved PWA/offline behavior.

### Phase 3 — computer opponent

AI may be added only after the rules engine is stable. AI logic must use the game core without depending on Canvas or browser UI.

### Phase 4 — optional Android packaging

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
- Capture visuals may be rendered only from confirmed capture state.
- Score must be reproducible from the current rule state.
- Serialization must be versioned before persisted game data becomes part of a public release.
