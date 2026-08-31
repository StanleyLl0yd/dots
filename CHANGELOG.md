# Changelog

All notable project changes are recorded here.

## [0.4.0] - 2026-08-31

### Added

- pure viewport model for screen↔game coordinate conversion, panning, anchored zoom, integer grid snapping, and safe numeric bounds;
- practically unbounded one-pointer board panning for mouse and touch with a movement threshold that preserves ordinary click/tap placement;
- mouse-wheel and trackpad zoom anchored at the pointer position;
- two-pointer pinch zoom/pan anchored at the moving gesture midpoint, with placement suppressed after pinch gestures;
- independently versioned local viewport persistence and restore, separate from authoritative game-state persistence;
- viewport regression tests covering coordinate round-trip, snapping after transforms, pan direction, zoom anchoring, zoom bounds, center bounds, persistence round-trip, malformed data, unsupported versions, and unsafe ranges.

### Changed

- Canvas rendering now derives its visible grid range from the viewport instead of assuming the game origin is permanently centered;
- off-screen stones are culled and capture hatching is generated only across the bounded visible canvas before clipping, avoiding work proportional to distant world extents;
- visual dot radius, capture outline width, and hatch spacing adapt within bounded ranges as zoom changes;
- new-game reset now returns the viewport to origin at default zoom while preserving the existing confirmed rule/session reset behavior;
- user-facing hints, product specification, architecture documentation, and repository rules now describe implemented pan/zoom interaction and viewport-state separation;
- Phase 3 board navigation is complete and the roadmap moves to browser/PWA polish, accessibility, and broader performance stress testing;
- source version advanced to 0.4.0.

## [0.3.0] - 2026-08-31

### Added

- reversible game-session history with one-move undo that restores player, capture state, released/captured dots, and derived score;
- confirmed new-game/reset flow for games already in progress;
- versioned browser-local persistence using an ordered legal move log;
- deterministic restore by replaying saved moves through the authoritative game core, including restoration of undo history;
- safe rejection and removal of malformed, illegal, corrupted, or unsupported persisted move logs;
- persistence regression tests covering state replay, capture/score reconstruction, invalid repeated moves, malformed coordinates, and clearing saved games;
- topology hardening for direct-capture priority, nested-house minimum selection, partial overlap of opponent captures, and dense legal adjacency graphs.

### Changed

- application composition now operates on a game session rather than mutating a standalone current state reference;
- undo availability is reflected directly in the controls and survives a page reload through move-log reconstruction;
- persistence stores no authoritative score or capture geometry; all derived state is rebuilt by rule replay;
- Phase 2 game-state ergonomics is complete and the roadmap now moves to pan/zoom and practically unbounded viewport interaction;
- source version advanced to 0.3.0.

## [0.2.0] - 2026-08-31

### Added

- house activation when an opponent enters an empty house without completing a direct capture on that move;
- capture-of-capture resolution with deactivation of fully surrounded opponent captures;
- release of previously captured own dots when the opponent capture holding them is surrounded;
- multiple independent captures completed by one move;
- deterministic minimum-face selection for competing valid boundaries;
- topology regression coverage for strict boundary/interior handling, long-gap rejection, nested capture release, multiple capture resolution, and large game coordinates.

### Changed

- score is explicitly derived from the current active capture set after every move;
- capture resolution order is now direct mover captures first, then opponent-house activation only when the mover completed no direct capture;
- rule, architecture, and README documentation now describe the implemented advanced capture behavior;
- source version advanced to 0.2.0.

## [0.1.0] - 2026-08-31

### Added

- initial TypeScript, Canvas, Vite, and PWA application;
- local two-player dot placement on grid intersections;
- ordinary neighboring-dot enclosure detection and capture scoring;
- capture outline, translucent fill, and light diagonal hatching;
- Russian/English UI, CI, GitHub Pages deployment, and proprietary All Rights Reserved license.
