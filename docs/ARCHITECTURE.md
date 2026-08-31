# Architecture

## Layers

```text
src/
├── game/                  pure game state and rules
│   ├── types.ts
│   ├── board.ts
│   ├── board.test.ts
│   ├── capture.ts
│   └── capture.test.ts
├── ui/                    Canvas rendering and pointer/touch input
│   └── canvas-board.ts
├── i18n.ts                locale resolution and user-facing copy
├── i18n.test.ts           locale tests
├── main.ts                application composition
└── styles.css             page chrome and visual system
```

The capture engine lives under `src/game/` and does not import DOM or Canvas APIs. Rendering consumes confirmed capture state; it does not decide whether an enclosure exists.

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

## Current hardening targets

Version 0.2.0 implements the main house, multiple-capture, capture-of-capture, nested-release, and minimum-face flows. Remaining rule-engine work is concentrated on difficult geometric cases rather than missing primary mechanics:

- adversarial self-touching graphs with many legal diagonal adjacencies;
- crossing-edge configurations where graph embedding becomes ambiguous;
- broader competing-boundary stress cases;
- performance on very long games before viewport/persistence work is added.

These cases must remain in the game layer and must not be patched in the renderer.

## Regression coverage

Covered by the current game tests:

- ordinary single-dot enclosure;
- almost-enclosure with a gap;
- empty house that does not score;
- house activation after opponent entry;
- blocking placement inside an active capture;
- several independent captures closed by one move;
- rejection of two-step boundary gaps;
- capture-of-capture with release and score reversal;
- removal of several surrounded opponent captures by one outer capture;
- deterministic minimum-area face selection;
- strict polygon boundary-versus-interior handling;
- de-duplicated score derivation;
- large game coordinates independent of viewport position.
