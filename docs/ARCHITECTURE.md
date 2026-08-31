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
│   ├── board.test.ts
│   ├── capture.test.ts
│   ├── session.test.ts
│   ├── ai.test.ts
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

The game layer imports no DOM, Canvas, viewport, service-worker, storage, or network APIs. Rendering consumes confirmed game state; it never decides whether a capture exists. Game persistence replays moves through the game core. The AI is another consumer of the same core and may propose coordinates but does not own legality or capture resolution. Viewport, preferences, and PWA lifecycle remain separate platform/presentation state.

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

### Candidate frontier

The AI first builds a finite frontier from empty intersections one grid step away from active stones. Captured stones are removed from the AI's active-structure view while their holding capture remains active.

Frontier points receive a cheap local score based on:

- adjacent same-color stones;
- adjacent opponent stones;
- bonuses for two-or-more same-color neighbors, which often marks a possible closing point;
- bonuses for two-or-more opponent neighbors, which often marks a useful blocking point;
- a small bounded distance penalty from the latest move when a focus point is supplied.

This ranking is not authoritative legality. Ranked candidates are subsequently passed to `placeStone()`. Occupied/captured/otherwise illegal points are rejected by the real game core.

### Position evaluation

For each shortlisted legal move, the resulting state is evaluated from the computer side. Actual score difference is weighted overwhelmingly above structural heuristics, so real captures/releases dominate shape preferences.

The secondary structural score counts active same-color adjacency links and active-stone balance. It exists only to choose among otherwise similar non-scoring moves.

### Difficulty profiles and minimax

The engine uses one recursive deterministic minimax path with a per-difficulty array of bounded candidate limits. The four user-facing levels differ only in how many plies are enabled and how wide each ply is searched:

- **Easy** — computer move only; no opponent-reply search;
- **Normal** — computer move → bounded opponent reply;
- **Hard** — computer move → opponent reply → selective computer continuation;
- **Expert** — computer move → opponent reply → computer continuation → final bounded opponent reply.

Small positions use the widest profile. At 80+ and 250+ stones each level reduces its limits. The current small-position root budgets are 4 / 7 / 9 / 10 candidates for Easy / Normal / Hard / Expert respectively; deeper plies use smaller limits. Large positions reduce those values further.

The root candidate still receives small deterministic tactical/seed tie-break weights after minimax evaluation. Coordinate ordering is the final tie-break, so identical state/difficulty/options produce the same move.

### Search caches

Every `chooseAiMove()` call creates fresh in-memory caches:

- an evaluation cache for equivalent state/perspective pairs;
- a minimax/transposition cache for equivalent state/depth/perspective combinations;
- a `WeakMap` that avoids rebuilding the canonical signature for the same `GameState` object.

The canonical signature contains rule-relevant data: player-to-move, current score, all stones, inactive captured stones, and active capture owner/boundary/captured geometry. Including capture geometry is required because two positions with the same stones and score may still have different blocked territory or future capture behavior.

These caches are ephemeral and are discarded after the AI chooses one move. They are not game persistence, are never exposed as `GameState`, and cannot become a parallel rules authority.

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
- During the short pending-computer state, mode/difficulty/Undo/New game controls are disabled and accessible status announces that the computer is thinking.
- A pending computer timer is cancelled on `pagehide`. If the document returns visible while Blue still owns the turn, scheduling resumes through `visibilitychange`/`pageshow`.
- If the AI unexpectedly produces no legal move or a proposed point is rejected, the UI switches to two-player mode rather than fabricating a move or leaving Blue permanently inaccessible.

In computer mode, Undo first removes the latest move. If that returns the session to Blue with an earlier human move still present, Undo is applied once more so the user returns to the previous Red decision point. The underlying `undoMove()` behavior itself remains unchanged and rule-authoritative.

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

In computer mode `main.ts` rejects attempted human placement while Blue is to move before calling `playMove()`. The board itself remains a presentation/input adapter and does not know which player is automated or which AI difficulty is selected.

## Rendering and performance bounds

Canvas geometry is expressed in CSS pixels. The backing buffer uses device pixel ratio capped at 3; this preserves geometry while bounding memory and rasterization cost on extreme-density displays.

Grid lines are generated only from `visibleGridBounds()`. Off-screen stones are culled. Capture polygons whose screen bounding boxes miss the viewport are skipped. Hatching is generated across the finite canvas and then clipped to active capture geometry rather than being generated across arbitrary world extents.

Viewport persistence writes are debounced during navigation and flushed on `pagehide`, reducing synchronous localStorage churn without changing the independently versioned viewport format.

Stress coverage includes a 500-move sparse reversible game, an 8K/minimum-zoom visible-grid bound, 2,000 repeated pan/zoom transforms, and Expert AI legality search over a 300-stone sparse position. These are deterministic regression guards, not hardware benchmarks.

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
- game↔screen coordinate round-trip, integer snapping, pan direction, anchor zoom, numeric clamps, visible-grid work bounds, and repeated-transform stress;
- long sparse game history with deterministic partial Undo;
- TypeScript validation and the complete Vite/PWA production build;
- post-build verification of generated service-worker/manifest/install artifacts.

Version **0.7.0** completes the four-level AI-strength phase. Remaining product work is measured AI quality/performance refinement, continued empirical real-device/topology validation, import/export if justified, and possible Android packaging—not a second rules architecture.
