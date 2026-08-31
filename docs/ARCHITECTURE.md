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

The engine should:

1. apply one candidate move to immutable or safely cloned state;
2. inspect only topology that can change because of that move;
3. find closed same-color boundaries using 8-direction adjacency;
4. reject self-intersecting or invalid boundaries;
5. determine which opponent dots lie strictly inside each boundary;
6. discard boundaries with no capturable opponent dots;
7. resolve overlaps using the minimum-area rule;
8. update active captures and release dots when captures themselves are surrounded;
9. derive score from active captured dots;
10. return rule events that the renderer can animate without recomputing rules.

## Testing priorities

The capture suite should cover:

- a single-dot enclosure;
- diagonal boundary segments;
- one-gap almost-enclosure;
- a house with no opponent dots;
- entering a house;
- multiple captures closed by one move;
- nested captures;
- release after surrounding an opponent capture;
- competing valid boundary paths;
- minimum-area selection;
- self-touching and self-intersecting candidate chains;
- large coordinate values independent of viewport position.
