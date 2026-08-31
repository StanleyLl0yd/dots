# Architecture

## Layers

```text
src/
├── game/                         pure rules, AI, and reversible session state
│   ├── types.ts
│   ├── board.ts
│   ├── capture.ts
│   ├── session.ts
│   ├── ai.ts
│   ├── ai-match.ts
│   ├── board.test.ts
│   ├── capture.test.ts
│   ├── session.test.ts
│   ├── ai.test.ts
│   ├── ai-match.test.ts
│   ├── ai-tactical-benchmark.test.ts
│   ├── topology.test.ts
│   └── stress.test.ts
├── ui/                           Canvas input/rendering and viewport math
│   ├── canvas-board.ts
│   ├── viewport.ts
│   └── viewport.test.ts
├── persistence.ts                versioned authoritative move-log adapter
├── persistence.test.ts
├── preferences.ts                versioned mode + AI-difficulty preference
├── preferences.test.ts
├── viewport-persistence.ts       independent presentation-state adapter
├── viewport-persistence.test.ts
├── pwa.ts                        service-worker update/offline lifecycle
├── i18n.ts                       locale and user/a11y copy
├── i18n.test.ts
├── main.ts                       application composition and browser/AI orchestration
├── styles.css                    notebook/mobile/accessibility visual system
└── vite-env.d.ts                 Vite/PWA virtual-module types

scripts/
└── verify-build.mjs              post-build PWA/offline artifact verification
```

The game layer imports no DOM, Canvas, viewport, service-worker, storage, or network APIs. Rendering consumes confirmed game state; it never decides whether a capture exists. Game persistence replays moves through the game core. The AI and AI-match harness are consumers of the same core and may propose/apply coordinates but do not own legality or capture resolution. Viewport, preferences, and PWA lifecycle remain separate platform/presentation state.

## Capture and move engine

Capture detection builds an 8-direction adjacency graph from active same-color dots, extracts closed simple faces, rejects open/self-intersecting candidates, identifies opponent dots strictly inside valid faces, and resolves the smallest valid affected face deterministically.

Boundary adjacency is a hard invariant: each consecutive boundary vertex, including last-to-first, is exactly one grid step away under Chebyshev distance. Captured dots are excluded from boundary construction until a later surrounding capture releases them.

Move resolution remains:

1. reject an occupied point or point strictly inside an active capture;
2. place the current side's integer-coordinate dot;
3. find direct captures affected by that move;
4. if no direct capture resolves, test opponent-house activation;
5. remove fully surrounded opponent captures and release their held dots;
6. derive score from the resulting active capture set;
7. expose only that confirmed state to rendering, persistence, and AI evaluation.

Pointer, touch, keyboard, and computer moves all converge on this same placement path.

## Computer opponent

`src/game/ai.ts` is a deterministic bounded-search module. It accepts `GameState` plus optional search options, including `AiDifficulty`, and returns a proposed integer `Point` or `undefined`. It imports only game-core modules.

### Candidate frontier and cycle pressure

The AI builds a finite frontier from empty intersections one grid step away from active stones. Captured stones are removed from its active-structure view while their holding capture remains active.

For both colors, the engine builds connected components over active 8-neighbor stones. A frontier point receives cycle-closing pressure when at least two adjacent stones of one color already belong to the same connected component. Adding a stone at that point would close an existing graph path into a cycle.

This is only a move-ordering/evaluation heuristic. The cycle may become a house, a scoring capture, a capture-of-capture, or no valid capture at all; only `placeStone()` and the capture engine decide that.

Frontier ranking uses:

- adjacent same-color and opponent stones;
- same-color cycle-closing pairs;
- opponent cycle-closing pairs that can be occupied defensively;
- bonuses for locally dense own/opponent contact;
- a bounded distance penalty from the most recent focus point.

Every retained coordinate is subsequently passed through `placeStone()`. Hard/Expert perform a wider but bounded root pre-scan so real score-changing moves cannot be excluded solely by heuristic seed order. Occupied, captured-territory, or otherwise illegal points are rejected by the authoritative core.

At the Expert root, candidates that immediately increase the opponent's score are excluded when at least one safe candidate exists. Safe immediate captures take tactical priority before deeper minimax comparison. These are move-selection policies only; the score change used by the policy is still the result returned by `placeStone()`.

### Position evaluation

Actual score difference is weighted overwhelmingly above every heuristic so real captures/releases dominate evaluation.

Secondary evaluation includes:

- active same-color adjacency links and active-stone balance;
- local stone danger: concentrated opponent contact, reduced escape space, and local own support;
- cycle-closing pressure available to each side.

Easy uses the lightest evaluation. Normal adds local danger. Hard and Expert also compare enclosure/cycle pressure, with Expert applying the strongest danger weighting.

### Strategic threat probes

Hard and Expert add bounded speculative analysis that still uses the real move engine.

`immediateCaptureThreat()` temporarily evaluates a chosen side as the mover, tests a small ranked set through `placeStone()`, and measures actual score-changing capture/release outcomes plus newly threatened stones.

`setupPotential()` tries a small non-scoring setup move and then probes whether another move by the same side could create a real capture opportunity. This recognizes short two-own-move plans across an intervening opponent turn. It is evaluation-only: it does not enter session history, persist state, or replace the alternating-turn minimax tree.

On positions with 250 or more stones the expensive setup probe is disabled and immediate-threat budgets are reduced.

### Difficulty profiles and minimax

The engine uses one recursive deterministic minimax implementation. Per-difficulty arrays bound the number of candidates considered at each ply:

- **Easy** — computer move only;
- **Normal** — computer move → bounded opponent reply;
- **Hard** — computer move → opponent reply → selective computer continuation;
- **Expert** — computer move → opponent reply → computer continuation → final bounded opponent reply.

Small positions use the widest profiles. At 80+ and 250+ stones each level reduces candidate limits. Root budgets remain 4 / 7 / 9 / 10 on small positions for Easy / Normal / Hard / Expert; larger positions reduce them.

Hard/Expert root ordering includes the bounded strategic threat forecast. Expert may also include the strategic forecast at the first searched reply layer. In 0.8.1, the root also applies the bounded authoritative tactical pre-scan and Expert safety/immediate-capture policy before deeper minimax comparison.

### Alpha-beta pruning

Minimax consumes candidates in strongest-first tactical order and maintains alpha/beta bounds. Once a branch cannot improve the already established bound it is skipped.

The transposition cache stores only nodes that were fully searched. Nodes that ended via alpha-beta cutoff are not recorded as exact values.

### Forcing horizon extensions

At the nominal minimax horizon, Hard and Expert may enter a small quiescence-style extension. Only moves that immediately change score balance through capture/release are eligible.

- Hard uses at most one forcing extension on ordinary-size positions.
- Expert uses at most two forcing extensions on ordinary-size positions.
- At 250+ stones Expert is reduced to one extension and Hard to none.

This handles short capture/release sequences near the horizon without increasing full-width search depth everywhere.

### Search caches

Every `chooseAiMove()` call creates fresh in-memory caches:

- evaluation values;
- exact minimax/transposition results;
- canonical state signatures;
- active connected components;
- closure-pressure values;
- immediate-capture threat probes;
- setup-potential probes.

The canonical signature contains player-to-move, score, all stones, and active capture owner/boundary/captured geometry. Capture geometry is required because identical stones and score can still produce different blocked territory and future capture behavior.

All caches are discarded after the move is selected. They are never persisted, never exposed as `GameState`, and cannot become a parallel rules authority.

## AI-vs-AI regression harness

`src/game/ai-match.ts` provides a pure deterministic test/analysis harness. It starts from `createGameState()`, optionally applies a legal opening, then alternates `chooseAiMove()` for Red/Blue and feeds every proposal back through `placeStone()`.

`pairedMatchMargin()` runs a stronger level once as Red and once as Blue against a weaker level, reducing first-move/color bias in short regression comparisons.

The CI suite deliberately uses short deterministic matches rather than a wall-clock benchmark. Expert must not lose the paired Expert-vs-Normal or Expert-vs-Hard comparisons and must maintain a positive aggregate captured-score margin across them. `ai-tactical-benchmark.test.ts` complements those matches with six fixed decisions covering immediate multi-capture, mandatory defense, false closure, hostile-house safety, counter-capture under double threat, and capture-of-capture release. These are regression guards, not Elo claims.

## Computer-mode orchestration

`main.ts` owns browser scheduling and mode/difficulty UX, not AI rules.

- **Two players** leaves both colors under local human control.
- **Vs computer** assigns Red to the human and Blue to the computer.
- Computer mode exposes **Easy / Normal / Hard / Expert** difficulty.
- Mode and difficulty are stored together by `preferences.ts` under their own versioned key.
- Switching mode or difficulty never rewrites the move log or resets the board.
- Enabling computer mode while Blue is to move schedules a Blue AI move against the existing state.
- The selected difficulty is passed to `chooseAiMove()` for each newly scheduled computer turn.
- The computer move is accepted with `playMove()` and persisted as an ordinary move. Save replay needs no special AI metadata.
- During pending computer work, mode/difficulty/Undo/New game controls are disabled and accessible status announces that the computer is thinking.
- A pending computer timer is cancelled on `pagehide`. If the document returns visible while Blue still owns the turn, scheduling resumes through `visibilitychange`/`pageshow`.
- If AI unexpectedly produces no legal move or a proposed point is rejected, the UI switches to two-player mode rather than fabricating a move or leaving Blue permanently inaccessible.

In computer mode, Undo first removes the latest move. If that returns the session to Blue with an earlier human move still present, Undo is applied once more so the user returns to the previous Red decision point. The underlying `undoMove()` primitive remains unchanged and authoritative.

## Session history and game persistence

`src/game/session.ts` wraps `GameState` with reversible history. A legal move records the placed point, previous active captures, and previous player. Undo removes that stone, restores the previous capture set/player, and derives score again. Illegal placement attempts create no history entry.

`src/persistence.ts` stores save format version 1 as an ordered list of integer move coordinates. Loading starts from a fresh session and replays every move through `playMove()`. Score, captures, player, rendering geometry, AI difficulty, and AI intent are never trusted from storage. Computer moves are indistinguishable from human moves in the persisted log.

Invalid JSON/version/coordinates or a move that is no longer legal invalidates only the game save.

## Mode and difficulty preferences

`src/preferences.ts` stores game mode plus AI difficulty under `dots.preferences` with explicit format version 2.

Current legal values are:

- mode: `local` / `computer`;
- difficulty: `easy` / `normal` / `hard` / `expert`.

Version-1 preferences from 0.6.0 contain only game mode. They are migrated in place to version 2 while preserving that mode and assigning `normal` difficulty. Malformed or unsupported preference data is removed and falls back to local mode plus Normal difficulty. Preference failure cannot invalidate or mutate the authoritative game save or viewport state.

## Viewport model

`src/ui/viewport.ts` contains pure screen↔game transforms, pan, anchor-preserving zoom, snapping, and visible-grid-bound calculations. The viewport stores fractional game-space center coordinates plus zoom and is not part of `GameState`.

The base cell is 32 CSS pixels. Zoom is clamped to `0.4…3.5`; viewport centers use the very large numeric safety bound `±1,000,000,000`. The latter prevents pathological numeric/render loops and is not a gameplay board edge.

`visibleGridBounds()` inverse-transforms the canvas corners and returns a small integer range around the visible game rectangle. Grid rendering loops only across that range.

## Pointer, touch, and keyboard interaction

`src/ui/canvas-board.ts` owns presentation input state.

- A one-pointer press remains a placement candidate until movement crosses the drag threshold; after that it is a pan and placement is suppressed.
- Wheel/trackpad zoom preserves the game point under the pointer.
- Two-pointer pinch preserves the starting game-space midpoint below the moving gesture midpoint; pinch release cannot place a dot.
- When the canvas has keyboard focus, arrows move an integer grid cursor, Enter/Space call the same `onPoint()` path as pointer placement, and plus/minus zoom around the cursor.
- Keyboard cursor movement may recenter only the viewport to keep the selected intersection visible; it never moves stones or changes rule coordinates.
- Pointer input clears the keyboard cursor so the two interaction modes do not leave ambiguous visual selection state.

In computer mode `main.ts` rejects attempted human placement while Blue is to move before calling `playMove()`. The board remains a presentation/input adapter and does not know which player is automated or which AI difficulty is selected.

## Rendering and performance bounds

Canvas geometry is expressed in CSS pixels. The backing buffer uses device pixel ratio capped at 3; this preserves geometry while bounding memory and rasterization cost on extreme-density displays.

Grid lines are generated only from `visibleGridBounds()`. Off-screen stones are culled. Capture polygons whose screen bounding boxes miss the viewport are skipped. Hatching is generated across the finite canvas and then clipped to active capture geometry rather than being generated across arbitrary world extents.

Viewport persistence writes are debounced during navigation and flushed on `pagehide`, reducing synchronous localStorage churn without changing the independently versioned viewport format.

Stress coverage includes a 500-move sparse reversible game, an 8K/minimum-zoom visible-grid bound, 2,000 repeated pan/zoom transforms, Expert AI legality search over a 300-stone sparse position, short deterministic AI-vs-AI strength regressions, and the six fixed Expert tactical positions. These are regression guards, not hardware benchmarks.

## Viewport persistence

`src/viewport-persistence.ts` uses a key/version separate from the game save and preferences. It accepts only finite center/zoom values inside supported numeric bounds. Invalid viewport data is removed without touching a valid game save.

Starting a new game resets the viewport to `(0, 0, 1)` and persists that presentation state through the normal callback.

## PWA and update lifecycle

`vite-plugin-pwa`/Workbox generates the application manifest and service worker. The shell and install assets are precached for offline startup; outdated Workbox caches are cleaned up.

`src/pwa.ts` owns runtime service-worker registration:

1. register immediately so an installed/offline-capable build becomes available promptly;
2. report `onOfflineReady` without altering game/session state;
3. when a waiting worker signals `onNeedRefresh`, show a non-destructive update prompt;
4. apply the waiting worker only after the user chooses Update;
5. request update checks when connectivity returns, when the visible app returns to the foreground, and hourly while the app stays open.

Network and worker failures remain status UI only. The persisted move log, viewport, preferences, and AI are independent of service-worker caches.

`scripts/verify-build.mjs` runs after every production build and fails if the generated PWA manifest, service worker, key install/mobile assets, expected standalone metadata, or Apple touch-icon linkage is missing.

## Mobile and accessibility shell

`index.html` declares viewport-fit cover, standalone/mobile app metadata, light/dark theme colors, and Apple touch icon linkage.

`styles.css` uses dynamic viewport units and safe-area insets, practical touch targets, overscroll suppression, focus-visible treatment, reduced-motion safeguards, forced-colors fallback, and explicit light/dark Canvas variables. Mode and difficulty selectors use the same focus/touch conventions and collapse into the responsive mobile action grid.

`main.ts` provides a skip link, hidden board instructions, live regions for keyboard cursor/placement/computer feedback, connection/offline status, and the update prompt. Accessibility never bypasses the core: human keyboard/pointer and computer moves all eventually enter the same legal session path.

## Regression and operational verification

Automated coverage includes:

- enclosure topology, houses, capture-of-capture, release, multiple/minimum captures, and large coordinates;
- reversible sessions, invalid moves, save replay, malformed/unsupported persistence, preference migration/validation, and viewport persistence validation;
- deterministic AI legality at all four levels, progressive profile depth, immediate capture selection, threat blocking from Normal upward, wrong-turn rejection, non-mutation, adaptive large-position budgets, and Expert sparse-position behavior;
- deterministic AI-vs-AI replay plus paired Expert-vs-Normal/Hard non-losing and aggregate-strength guards;
- six fixed Expert tactical positions covering multi-capture, defense, false closure, house safety, counter-capture, and capture-of-capture release;
- game↔screen coordinate round-trip, integer snapping, pan direction, anchor zoom, numeric clamps, visible-grid work bounds, and repeated-transform stress;
- long sparse game history with deterministic partial Undo;
- TypeScript validation and the complete Vite/PWA production build;
- post-build verification of generated service-worker/manifest/install artifacts.

Version **0.8.1** hardens the strategic AI-quality phase with fixed tactical positions, wider bounded root discovery, hostile-house safety, and explicit safe immediate-capture priority for Expert. Further AI work should continue from concrete failing positions or measured match regressions rather than unbounded depth increases.
