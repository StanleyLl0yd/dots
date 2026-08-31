# Architecture

## Layers

```text
src/
├── game/                         pure rules and reversible session state
│   ├── types.ts
│   ├── board.ts
│   ├── capture.ts
│   ├── session.ts
│   ├── board.test.ts
│   ├── capture.test.ts
│   ├── session.test.ts
│   ├── topology.test.ts
│   └── stress.test.ts
├── ui/                           Canvas input/rendering and viewport math
│   ├── canvas-board.ts
│   ├── viewport.ts
│   └── viewport.test.ts
├── persistence.ts                versioned authoritative move-log adapter
├── persistence.test.ts
├── viewport-persistence.ts       independent presentation-state adapter
├── viewport-persistence.test.ts
├── pwa.ts                        service-worker update/offline lifecycle
├── i18n.ts                       locale and user/a11y copy
├── i18n.test.ts
├── main.ts                       application composition and browser statuses
├── styles.css                    notebook/mobile/accessibility visual system
└── vite-env.d.ts                 Vite/PWA virtual-module types

scripts/
└── verify-build.mjs              post-build PWA/offline artifact verification
```

The game layer imports no DOM, Canvas, viewport, service-worker, or storage APIs. Rendering consumes confirmed game state; it never decides whether a capture exists. Game persistence replays moves through the game core. Viewport and PWA lifecycle are presentation/platform layers that may disappear without changing the meaning of a game.

## Capture and move engine

Capture detection builds an 8-direction adjacency graph from active same-color dots, extracts closed simple faces, rejects open/self-intersecting candidates, identifies opponent dots strictly inside valid faces, and resolves the smallest valid affected face deterministically.

Boundary adjacency is a hard invariant: each consecutive boundary vertex, including last-to-first, is exactly one grid step away under Chebyshev distance. Captured dots are excluded from boundary construction until a later surrounding capture releases them.

Move resolution remains:

1. reject an occupied point or point strictly inside an active capture;
2. place the current player's integer-coordinate dot;
3. find direct captures affected by that move;
4. if no direct capture resolves, test opponent-house activation;
5. remove fully surrounded opponent captures and release their held dots;
6. derive score from the resulting active capture set;
7. render only that confirmed state.

Pointer, touch, and keyboard input all converge on this same placement path.

## Session history and game persistence

`src/game/session.ts` wraps `GameState` with reversible history. A legal move records the placed point, previous active captures, and previous player. Undo removes that stone, restores the previous capture set/player, and derives score again. Illegal placement attempts create no history entry.

`src/persistence.ts` stores save format version 1 as an ordered list of integer move coordinates. Loading starts from a fresh session and replays every move through `playMove()`. Score, captures, player, and rendering geometry are never trusted from storage. Invalid JSON/version/coordinates or a move that is no longer legal invalidates only the game save.

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

The keyboard cursor is a Canvas focus ring derived entirely from presentation state. Its position and placement result are mirrored into an assistive live region by `main.ts`.

## Rendering and performance bounds

Canvas geometry is expressed in CSS pixels. The backing buffer uses device pixel ratio capped at 3; this preserves geometry while bounding memory and rasterization cost on extreme-density displays.

Grid lines are generated only from `visibleGridBounds()`. Off-screen stones are culled. Capture polygons whose screen bounding boxes miss the viewport are skipped. Hatching is generated across the finite canvas and then clipped to active capture geometry rather than being generated across arbitrary world extents.

Viewport persistence writes are debounced during navigation and flushed on `pagehide`, reducing synchronous localStorage churn without changing the independently versioned viewport format.

Stress coverage includes a 500-move sparse reversible game, an 8K/minimum-zoom visible-grid bound, and 2,000 repeated pan/zoom transforms. These are deterministic regression guards, not hardware benchmarks.

## Viewport persistence

`src/viewport-persistence.ts` uses a key/version separate from the game save. It accepts only finite center/zoom values inside supported numeric bounds. Invalid viewport data is removed without touching a valid game save.

Starting a new game resets the viewport to `(0, 0, 1)` and persists that presentation state through the normal callback.

## PWA and update lifecycle

`vite-plugin-pwa`/Workbox generates the application manifest and service worker. The shell and install assets are precached for offline startup; outdated Workbox caches are cleaned up.

`src/pwa.ts` owns runtime service-worker registration:

1. register immediately so an installed/offline-capable build becomes available promptly;
2. report `onOfflineReady` without altering game/session state;
3. when a waiting worker signals `onNeedRefresh`, show a non-destructive update prompt;
4. apply the waiting worker only after the user chooses Update;
5. request update checks when connectivity returns, when the visible app returns to the foreground, and hourly while the app stays open.

Network and worker failures remain status UI only. The persisted move log is independent of service-worker caches, so offline or update behavior cannot invent, discard, or mutate game moves.

`scripts/verify-build.mjs` runs after every production build and fails if the generated PWA manifest, service worker, key install/mobile assets, expected standalone metadata, or Apple touch-icon linkage is missing. This makes offline/install packaging part of CI rather than an unchecked configuration promise.

## Mobile and accessibility shell

`index.html` declares viewport-fit cover, standalone/mobile app metadata, light/dark theme colors, and Apple touch icon linkage.

`styles.css` uses dynamic viewport units and safe-area insets, practical touch targets, overscroll suppression, focus-visible treatment, reduced-motion safeguards, forced-colors fallback, and explicit light/dark Canvas variables.

`main.ts` provides a skip link, hidden board instructions, live regions for keyboard cursor and placement feedback, connection/offline status, and the update prompt. Accessibility never bypasses the core: a keyboard placement reaches exactly the same `playMove()` operation as a pointer placement.

## Regression and operational verification

Automated coverage includes:

- enclosure topology, houses, capture-of-capture, release, multiple/minimum captures, and large coordinates;
- reversible sessions, invalid moves, save replay, malformed/unsupported persistence, and viewport persistence validation;
- game↔screen coordinate round-trip, integer snapping, pan direction, anchor zoom, numeric clamps, visible-grid work bounds, and repeated-transform stress;
- long sparse game history with deterministic partial Undo;
- TypeScript validation and the complete Vite/PWA production build;
- post-build verification of generated service-worker/manifest/install artifacts.

Version **0.5.0** completes the planned browser/PWA/accessibility hardening phase. Remaining hardening is mainly empirical real-device/browser testing and continued adversarial game positions, not a second rules or platform architecture.
