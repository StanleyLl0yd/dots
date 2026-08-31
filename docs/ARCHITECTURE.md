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
├── ui/                    Canvas rendering and pointer/touch input
│   └── canvas-board.ts
├── persistence.ts         versioned local move-log persistence
├── persistence.test.ts    persistence replay/validation tests
├── i18n.ts                locale resolution and user-facing copy
├── i18n.test.ts           locale tests
├── main.ts                application composition
└── styles.css             page chrome and visual system
```

The capture engine and session history live under `src/game/` and do not import DOM, Canvas, or storage APIs. Rendering consumes confirmed capture state; it does not decide whether an enclosure exists. Browser persistence is a separate adapter that rebuilds authoritative state by replaying moves through the game core.

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

## Persistence

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

## Current hardening targets

Version 0.3.0 adds targeted regression cases around difficult rule-order and graph interactions:

- direct capture versus opponent-house activation priority;
- minimum containing face with nested houses;
- opponent captures that overlap but are not fully enclosed;
- dense legal diagonal adjacency around a captured point;
- invalid repeated or malformed moves in persisted logs.

Further rule-engine work remains ongoing stress coverage for unusual large/dense positions. The next architectural feature is a viewport model for pan/zoom that must remain independent from integer game coordinates and persisted rule history.

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
- versioned persistence replay, capture/score reconstruction, malformed save rejection, and undo-history restoration.
