# Architecture

## Layers

```text
src/
├── game/                  pure game state and rules
│   ├── types.ts
│   └── board.ts
├── ui/                    Canvas rendering and pointer/touch input
│   └── canvas-board.ts
├── i18n.ts                locale resolution and user-facing copy
├── main.ts                application composition
└── styles.css             page chrome and visual system
```

The capture engine belongs under `src/game/` and must not import DOM or Canvas APIs.

## Capture engine design target

Capture detection is the highest-risk part of the project. It should be implemented as deterministic game logic with topology-focused tests before UI polish.

Boundary adjacency is a hard rule invariant. Two boundary vertices are connected only when their Chebyshev distance is exactly one grid step. Horizontal, vertical, and diagonal neighbors are valid; skipped intersections and edges spanning multiple grid steps are invalid. The same check applies to the final edge that closes the path from the last vertex to the first.

The engine should:

1. apply one candidate move to immutable or safely cloned state;
2. inspect only topology that can change because of that move;
3. find closed same-color boundaries using strict 8-direction neighboring-point adjacency;
4. reject any candidate containing a non-adjacent consecutive pair, a gap, a long edge, a self-intersection, or another invalid boundary condition;
5. determine which opponent dots lie strictly inside each boundary;
6. discard boundaries with no capturable opponent dots;
7. resolve overlaps using the minimum-area rule;
8. update active captures and release dots when captures themselves are surrounded;
9. derive score from active captured dots;
10. return rule events that the renderer can animate without recomputing rules.

## Testing priorities

The capture suite should cover:

- a single-dot enclosure;
- horizontal and vertical neighboring boundary segments;
- diagonal neighboring boundary segments;
- rejection of a boundary edge spanning two or more grid steps;
- a one-gap almost-enclosure that must remain open;
- closing-edge adjacency from the last boundary dot back to the first;
- a house with no opponent dots;
- entering a house;
- multiple captures closed by one move;
- nested captures;
- release after surrounding an opponent capture;
- competing valid boundary paths;
- minimum-area selection;
- self-touching and self-intersecting candidate chains;
- large coordinate values independent of viewport position.
