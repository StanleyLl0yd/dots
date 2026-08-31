# Architecture

## Layers

```text
src/
├── game/                  pure game state, rules, and reversible session state
│   ├── types.ts
│   ├── board.ts
│   ├── board.test.ts
│   ├── capture.ts
│   ├── capture.test.ts
│   ├── session.ts
│   ├── session.test.ts
│   └── topology.test.ts
├── ui/                    Canvas rendering, gestures, and viewport math
│   ├── canvas-board.ts
│   ├── viewport.ts
│   └── viewport.test.ts
├── persistence.ts         versioned local move-log persistence
├── persistence.test.ts    persistence replay/validation tests
├── viewport-persistence.ts       independent viewport persistence
├── viewport-persistence.test.ts  viewport persistence tests
├── i18n.ts                locale resolution and user-facing copy
├── i18n.test.ts           locale tests
├── main.ts                application composition
└── styles.css             page chrome and visual system
```

The capture engine and session history live under `src/game/` and do not import DOM, Canvas, viewport, or storage APIs. Rendering consumes confirmed capture state; it does not decide whether an enclosure exists. Browser game persistence rebuilds authoritative state by replaying moves through the game core. Viewport state is a separate presentation model.

## Capture engine

Capture detection is deterministic game logic. The engine builds an 8-direction adjacency graph from active same-color dots, extracts closed simple faces, rejects open or self-intersecting candidates, identifies opponent dots strictly inside valid faces, and resolves each newly captured dot against the smallest valid face affected by the move.

Boundary adjacency is a hard rule invariant. Two boundary vertices are connected only when their Chebyshev distance is exactly one grid step. Horizontal, vertical, and diagonal neighbors are valid; skipped intersections and edges spanning multiple grid steps are invalid. The same rule applies to the final edge from the last boundary point back to the first.

Captured dots are excluded from boundary construction while the capture holding them remains active. When that capture is later deactivated by a surrounding opponent capture, those dots immediately return to the active topology.

## Move resolution

The move pipeline is:

1. reject occupied intersections and intersections strictly inside active captures;
2. clone the board state and place the current player's dot;
3. inspect same-color topology affected by the move;
4. extract closed simple boundaries using strict 8-direction neighboring-point adjacency;
5. resolve all direct captures completed by the mover, grouping independent minimum valid faces;
6. if the mover completed no direct capture, test whether the new dot entered an opponent house and activate the smallest containing house;
7. when a new capture fully surrounds active captures owned by the opponent, deactivate those inner captures and release the dots they previously held;
8. derive score from the resulting active capture set;
9. pass active capture boundaries to the Canvas renderer for outline, translucent fill, and light hatching.

Direct capture therefore has priority over house activation on the same move. Score is never maintained as an irreversible increment/decrement counter.

## Capture state

`GameState.captures` contains only active captures. A capture records:

- `owner`: the surrounding player;
- `boundary`: the ordered game-coordinate path of the confirmed enclosure;
- `captured`: opponent stones currently held by that capture.

A newly created capture removes any fully enclosed active opponent captures before the new active state is scored. Same-owner captures may coexist when they represent separate or previously established captured regions; score de-duplicates captured stone coordinates.

## Session history and undo

`src/game/session.ts` wraps `GameState` with reversible move history without making the UI a rule authority.

For every legal move, the history entry stores only the information needed to restore the exact previous rule state:

- the placed game-coordinate point;
- the player who was about to move;
- the previous active capture set.

Undo removes the most recently placed stone, restores the previous active captures and player, and derives score again from those captures. Illegal placement attempts return the same session object and do not create history entries.

This avoids keeping a complete copied stone map for every historical move while preserving exact capture/release reversal.

## Game persistence

`src/persistence.ts` uses browser-local storage only as a persistence transport, never as a second rule engine.

Save format version 1 stores:

```text
{
  version: 1,
  moves: [{ x, y }, ...]
}
```

Derived data such as score, active captures, current player, and rendering geometry is deliberately not persisted as authoritative state. On load, every saved point must be an integer game coordinate and every move is replayed in order through `playMove()` from a fresh session.

If any stored move becomes illegal during replay, or the JSON/version/coordinate format is invalid, the save is removed and the application starts fresh. Successful replay reconstructs the same game state and the full undo history.

Saving occurs after every legal move and undo. Returning to an empty history or starting a new game removes the saved unfinished game.

## Viewport model

`src/ui/viewport.ts` contains pure pan/zoom and coordinate-conversion functions. The viewport is deliberately not part of `GameState`.

The viewport stores:

```text
{
  centerX: number,
  centerY: number,
  zoom: number
}
```

`centerX`/`centerY` identify the game-space coordinate shown at the center of the canvas. They may be fractional because panning is continuous. `zoom` scales a base cell size of 32 CSS pixels and is clamped to `0.4…3.5`.

For a viewport `V`, canvas size `W×H`, and base cell size `C`, game point `(gx, gy)` maps to screen pixels as:

```text
sx = W/2 + (gx - V.centerX) * C * V.zoom
sy = H/2 + (gy - V.centerY) * C * V.zoom
```

The inverse transform is used for pointer input. A placement is rounded to the nearest integer game intersection only after the inverse transform. No pixel coordinate enters the rule engine.

Viewport centers are clamped to a very large safe range (`±1,000,000,000` grid coordinates). The bound is not a gameplay board edge; it prevents pathological numeric values from creating non-terminating visible-grid loops or unusable persisted camera state.

## Pan and zoom interaction

`src/ui/canvas-board.ts` owns pointer gesture state but not game rules.

### One pointer

Pointer down starts a potential tap. Movement under a small screen-space threshold remains a tap. Once movement reaches the threshold, the gesture becomes a pan and placement is suppressed. Pan is calculated from the gesture-start viewport so sub-threshold movement is not lost when dragging begins.

### Wheel / trackpad

Wheel input converts the wheel delta to a scale factor and calls the pure viewport zoom transform. The game-space coordinate below the pointer before zoom is preserved below the same pointer position after zoom.

### Two pointers

When two pointers are active, the gesture midpoint is converted to a game-space anchor at pinch start. Current pointer distance controls zoom while current midpoint controls pan. The same game-space anchor remains beneath the moving midpoint.

Ending a pinch never creates a placement. If one pointer remains after a pinch, it may continue panning but its eventual release is also suppressed as a tap.

## Rendering and viewport performance

Canvas draws in CSS-pixel coordinates after applying the device-pixel-ratio transform.

The renderer computes the visible game-space rectangle by inverse-transforming canvas corners. Grid lines are generated only from the integer range intersecting that rectangle. Stones outside the screen plus their visible radius are skipped.

Capture polygons still come from authoritative game state. A capture whose screen-space bounding box does not intersect the canvas is skipped. Hatching is generated across the bounded visible canvas and clipped to the capture path, rather than iterating across the capture's potentially huge world-space extent.

This keeps navigation work proportional to the visible viewport rather than the distance from the game origin.

## Viewport persistence

`src/viewport-persistence.ts` stores camera state under a key separate from the game save. Viewport save format version 1 contains only center and zoom values.

Load validates:

- exact viewport format version;
- finite numeric center and zoom values;
- center values within the numeric safety bound;
- zoom within the supported range.

Invalid viewport data is removed and the default viewport is used. A valid game save remains untouched. Starting a new game resets the viewport to `(0, 0, 1)` and persists that default through the normal viewport callback.

This separation guarantees that deleting or corrupting viewport state cannot change moves, captures, score, current player, or undo history.

## Current hardening targets

Version 0.4.0 completes the core viewport architecture. Remaining work is concentrated on broader operational polish and stress behavior:

- very long games with many visible and off-screen stones;
- very large or numerous active capture polygons;
- mobile-browser pointer edge cases and installed-PWA lifecycle behavior;
- accessibility and reduced-motion behavior for future UI/animation work;
- continued unusual dense topology cases discovered during play.

These improvements must preserve the same separation between rule state, session history, persistence, and viewport state.

## Regression coverage

Covered by the current tests:

- ordinary single-dot enclosure;
- almost-enclosure with a gap;
- empty house that does not score;
- house activation after opponent entry;
- direct-capture priority over house activation;
- nested-house minimum-face selection;
- blocking placement inside an active capture;
- several independent captures closed by one move;
- rejection of two-step boundary gaps;
- capture-of-capture with release and score reversal;
- removal of several surrounded opponent captures by one outer capture;
- partial-overlap preservation of opponent captures;
- deterministic minimum-area face selection;
- dense legal adjacency around the minimum capture face;
- strict polygon boundary-versus-interior handling;
- de-duplicated score derivation;
- large game coordinates independent of viewport position;
- legal-move history and invalid-move history rejection;
- undo of ordinary and capture-producing moves;
- versioned game persistence replay, capture/score reconstruction, malformed save rejection, and undo-history restoration;
- game↔screen viewport transform round-trip under pan/zoom;
- integer intersection snapping after viewport transforms;
- screen-direction pan behavior;
- anchor-preserving zoom;
- zoom and viewport-center safety clamps;
- independent viewport persistence round-trip, malformed data rejection, unsupported-version rejection, and unsafe-range rejection.
