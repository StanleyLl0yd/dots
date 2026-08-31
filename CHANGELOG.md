# Changelog

All notable project changes are recorded here.

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
