# Architecture

## Layers

```text
src/
├── game/                  pure game state and rules
│   ├── types.ts
│   ├── board.ts
│   ├── board.test.ts
│   └── capture.ts
├── ui/                    Canvas rendering and pointer/touch input
│   └── canvas-board.ts
├── i18n.ts                locale resolution and user-facing copy
├── i18n.test.ts           locale tests
├── main.ts                application composition
└── styles.css             page chrome and visual system
```

The capture engine lives under `src/game/` and does not import DOM or Canvas APIs. Rendering consumes capture state; it does not decide whether an enclosure exists.

## Capture engine

Capture detection is deterministic game logic. The current implementation builds an 8-direction adjacency graph from same-color dots, extracts closed simple faces, rejects open or self-intersecting candidates, finds opponent dots strictly inside valid faces, and resolves each newly captured dot against the smallest valid face created by the closing move.

Boundary adjacency is a hard rule invariant. Two boundary vertices are connected only when their Chebyshev distance is exactly one grid step. Horizontal, vertical, and diagonal neighbors are valid; skipped intersections and edges spanning multiple grid steps are invalid. The same rule applies to the final edge from the last boundary point back to the first.

The move flow is:

1. reject occupied intersections and intersections inside active captures;
2. clone the board state and place the current player's dot;
3. inspect same-color topology affected by the move;
4. extract closed simple boundaries using strict 8-direction neighboring-point adjacency;
5. discard boundaries that contain no uncaptured opponent dots;
6. resolve the minimum valid capture face for each newly captured dot;
7. derive score from active captures;
8. pass capture boundaries to the Canvas renderer for outline, translucent fill, and light hatching.

## Current limitations

The ordinary closed-enclosure flow is implemented. The following classic-rule cases still require dedicated rule logic and regression coverage:

- entering and activating a previously empty house;
- capture-of-capture and release of previously captured dots;
- nested capture resolution;
- broader verification of several independent captures closed by one move;
- adversarial competing-boundary and self-touching topologies.

These cases must stay in the game layer and must not be patched in the renderer.

## Testing priorities

Already covered at integration level:

- ordinary single-dot enclosure;
- an almost-enclosure with a gap;
- an empty closed house that does not score;
- blocking a move inside an active capture.

Still required as the engine is hardened:

- horizontal, vertical, and diagonal boundary segments;
- rejection of an edge spanning two or more grid steps;
- explicit closing-edge adjacency from last point to first;
- entering a house;
- several captures closed by one move;
- nested captures and release after surrounding an opponent capture;
- competing valid paths and minimum-area selection;
- self-touching and self-intersecting candidate chains;
- large game coordinates independent of viewport position.
