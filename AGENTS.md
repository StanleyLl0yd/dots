# AGENTS.md

## Project rules

- Inspect the existing implementation before changing it.
- Preserve the core product: classic Dots / Tochki based on surrounding and capturing opponent dots. Do not add progression systems, resources, power-ups, world maps, unrelated meta mechanics, or rule-changing features unless explicitly approved.
- Keep the web implementation based on TypeScript, HTML5 Canvas, Vite, and PWA unless a change is explicitly approved.
- Keep game rules, capture detection, scoring, history, and AI independent from rendering, viewport state, service-worker state, storage transport, network state, and browser UI where practical.
- Treat the rules in `docs/PRODUCT.md` as authoritative for this repository.
- Preserve the boundary-adjacency invariant: every consecutive pair of dots in an enclosure path, including last-to-first, must be neighboring grid intersections exactly one step apart horizontally, vertically, or diagonally. Never connect across a gap or multiple grid steps.
- Resolve each move in rule order: direct captures completed by the mover first; only when none resolve may the new dot activate an opponent house.
- When a new capture fully surrounds active opponent captures, deactivate those inner captures and release the dots they held before deriving the new score.
- Render enclosure outlines, fills, hatching, and other capture visuals only from confirmed active game-state captures. Never infer or create captures in the UI layer.
- AI may rank and propose only integer game-coordinate moves. Every computer move must still be validated and accepted through the authoritative `placeStone()` / `playMove()` path; never let AI create captures, score, releases, or legality as parallel state.
- Keep the authoritative rules, capture/scoring engine, replay validation, and AI search in `crates/game-core`. TypeScript may provide DTO/session/transport/Worker orchestration only and must not reintroduce a parallel rules or AI implementation. AI behavior must remain usable offline and independently testable from the browser shell.
- Browser AI computation may run in a dedicated Web Worker, but Worker transport is orchestration only: it may carry structured-cloned rule state/options and a proposed coordinate, never parallel legality/capture/score state.
- Treat Worker results as cancellable proposals. Ignore stale generations and validate every accepted computer coordinate through `playMove()` after it returns to the browser shell.
- Keep computer search deterministic unless a future product requirement explicitly introduces selectable randomness. Identical state/difficulty/options should produce identical moves so regressions remain reproducible.
- Preserve the four difficulty contracts: Easy has no opponent-reply search, Normal searches one opponent reply, Hard adds a selective computer continuation, and Expert adds a final bounded opponent reply. Changes may tune bounded budgets but should not collapse all levels into cosmetic labels.
- Strategic AI features such as cycle-closing pressure, stone danger, house pressure, threat probes, setup probes, or move-ordering scores are heuristics only. They may influence ranking/evaluation but must never declare legal moves, captures, releases, houses, or score independently from the authoritative core.
- Same-side immediate/setup threat probes are speculative evaluation only. They must operate on derived states, must not mutate the supplied `GameState`, session history, move log, or persisted state, and must not replace normal alternating-turn minimax.
- Keep AI search bounded. Per-difficulty simulation budgets must not grow with arbitrary world-coordinate distance or without an explicit cap as the position grows.
- Reduce expensive AI budgets, setup probes, and forcing extensions as positions grow rather than allowing higher difficulty to create unbounded browser work.
- AI evaluation/transposition/component/threat caches must be ephemeral to one move calculation and keyed by rule-relevant state. They must never become persisted or authoritative game state; rule-relevant cache identity must include active capture geometry when future legality can depend on it.
- Alpha-beta cutoff nodes must not be stored as exact transposition values. Cache only values whose searched scope justifies the semantics under which they will be reused.
- Selective horizon extensions must stay forcing and bounded. The current extension path may continue immediate score-changing capture/release moves; do not turn it into an implicit unbounded full-width search.
- AI-vs-AI regression harnesses must submit every generated move through the same authoritative game core as ordinary play. Keep match regressions deterministic, short, and hardware-independent; do not use wall-clock thresholds as strength criteria.
- Strength-regression assertions should measure stable tactical outcomes such as legal deterministic replay, paired non-losing results, or score margins rather than assume every short matchup must produce a win.
- The current computer mode assigns Red to the human and Blue to the computer. Changing that contract requires synchronized UI, persistence, Undo, accessibility, tests, and documentation changes.
- Computer-generated moves are ordinary session moves and must use the same persisted move log as human moves. Do not add a trusted AI-specific game-state or capture save format.
- Game-mode, AI-difficulty, and sound-enabled preferences must remain separately versioned from the authoritative game move log and viewport state. Invalid preference data must fail closed without changing a valid game; supported older preference versions should be migrated explicitly when practical.
- Switching local/computer mode or AI difficulty must not rewrite the move log or silently reset the current board unless the user explicitly starts a new game.
- In computer mode, Undo should return the human to the previous decision point by reversing the computer move and preceding human move when that normal pair exists. The underlying one-move `undoMove()` primitive remains authoritative.
- A pending computer turn should not continue scheduled work while the document is hidden. If Blue is still to move when the app returns to the foreground, scheduling must resume without requiring a fabricated input.
- If AI cannot produce an accepted legal move, fail safely to local two-player mode rather than inventing a move, corrupting history, or leaving the game permanently blocked.
- Undo must restore authoritative rule state, including player, active captures, released/captured status, and derived score; do not implement visual-only rollback.
- Persist unfinished games with an explicit format version. Rebuild saved games by replaying the persisted legal move log through the authoritative game core; do not trust persisted score or capture geometry as a parallel source of truth.
- Invalid, malformed, unsupported, or no-longer-legal persisted move logs must be rejected safely.
- Keep viewport center/zoom separate from integer game coordinates, `GameState`, scoring, capture detection, AI search state, and persisted move history.
- Convert pointer coordinates from screen space through the viewport and snap them to an integer grid intersection before passing a placement to the game core. Never make rule decisions in screen coordinates.
- Keyboard placement must call the same authoritative placement path as pointer placement. Do not create a separate keyboard rules implementation.
- Pan, zoom, Fit game, keyboard camera-follow, resize, and device-pixel ratio may change only presentation. The same game coordinate must remain the same rule-space point. Fit game must derive only a viewport from existing placed-stone coordinates and must not alter the move log or rules.
- Preserve anchor-based zoom behavior: wheel/trackpad zoom keeps the game point under the pointer fixed, and pinch keeps the game point under the gesture midpoint fixed while that midpoint may move.
- A drag gesture must not also place a dot. Preserve a deliberate movement threshold separating click/tap placement from one-pointer pan, and suppress placement after pinch gestures.
- Viewport persistence must use a separate versioned storage key, validate finite safe numeric values, and fail closed without invalidating a valid saved game.
- Starting a new game must reset the viewport to the origin at default zoom as well as reset rule/session state.
- Keep rendering work bounded by the visible viewport or finite screen-space work. Do not iterate across arbitrary world extents merely because the camera/capture is far from the origin.
- Keep Canvas backing resolution bounded independently from CSS/game geometry when needed for mobile memory safety; changing the DPR cap must not change game coordinates or snapping.
- Last-move markers, mouse snap previews, invalid-placement feedback, move counters, Help/first-run hints, and toolbar layout are presentation only. They must not become legality or persistence authorities.
- Capture feedback must be derived only from confirmed before/after active capture state. Reduced-motion may suppress transient visual emphasis but not essential text/live feedback.
- Destructive in-app dialogs must preserve keyboard/focus accessibility and must not change New game/Undo semantics.
- Preserve the prompt-based service-worker update lifecycle. A waiting PWA update must not silently reload or replace an active local game; activation requires an explicit user action from the update prompt.
- Offline, online, update-available, and service-worker error states are presentation only. They must never alter `GameState`, move history, score, captures, AI legality, or saved moves.
- Preserve offline/PWA behavior and GitHub Pages compatibility. Required manifest/service-worker/install assets and the generated browser AI Worker bundle must continue to be verified by the production build.
- Preserve keyboard accessibility: board focus, visible intersection cursor, arrow navigation, Enter/Space placement, zoom shortcuts, assistive instructions/live announcements, and visible focus states unless an equivalent or better path replaces them.
- Computer mode, difficulty, computer-thinking state, and computer moves must remain understandable through accessible localized controls/status and must not rely on color alone.
- Essential game information and controls must remain usable with reduced motion, forced colors, dark mode, mobile safe areas, and touch input.
- Maintain Russian and English user-facing text. Russian must be selected when the browser or resolved system locale includes Russian; English is the fallback.
- Prefer the smallest correct implementation and avoid speculative abstractions.
- Do not introduce a dependency without a concrete need.
- Keep `package-lock.json` committed and synchronized with `package.json` whenever package metadata or dependencies change.
- Use `npm ci` for CI and GitHub Pages so automated verification uses the committed dependency graph rather than re-resolving versions.
- Keep `npm audit --audit-level=high` as a CI release gate. High or critical advisories must block release unless an exceptional, explicitly documented risk decision is approved.
- Keep GitHub Actions on maintained Node-24-compatible action versions and keep Dependabot coverage for both npm and GitHub Actions.
- Do not add analytics, ads, accounts, backend services, tracking, or unnecessary network access unless explicitly requested.
- Add or update tests for rules, capture detection, scoring, history, persistence, AI legality/tactics/determinism/difficulty profiles, strategic threat behavior, AI-vs-AI regressions, preference migration, viewport transforms/persistence, locale handling, bounded rendering math, and regressions where practical.
- Keep deterministic stress tests meaningful but hardware-independent; do not turn CI into a fragile wall-clock benchmark.
- Run relevant tests and the full production build, including PWA artifact verification, before considering a task complete.
- Never commit passwords, API keys, tokens, private keys, signing material, local environment files, or generated secrets.
- Comments must be minimal, necessary, current, and English-only.
- Do not keep commented-out code or obsolete TODOs.
- Source identifiers must be English.
- Keep `main` buildable and use focused commits and pull requests.
- Repository cleanup must include a review of open pull requests and stale branches. Close PRs that are obsolete, superseded, conflicting with the current dependency/version strategy, or otherwise no longer intended to merge; remove obsolete branches when practical.
- For a release, keep the package version, README version/status text, `CHANGELOG.md` entry, and GitHub release tag aligned.
- When behavior, architecture, or project status changes, update the relevant repository documentation in the same work.
- After every release, review and update all repository text files so they accurately reflect the released state.
- Preserve the established formatting and visual presentation of text files during release updates; add, change, or remove formatting only when there is a compelling or urgent need.

## Mandatory repository-wide audit and deep-refactoring protocol

When a task requests a full audit, cleanup, optimization, simplification, or deep refactoring, the rules in this section are mandatory.

A repository-wide audit is an implementation task, not merely a request for recommendations.

### Objective

Audit the entire repository and reduce the codebase to the minimum necessary complexity while preserving 100% of its current functionality and externally observable behavior.

The refactored project must preserve, unless an explicitly requested bug fix requires otherwise:

- user-facing functionality;
- application behavior;
- UI/UX;
- business or game logic;
- public APIs and contracts;
- persisted and exchanged data formats;
- platform-specific behavior;
- documented capabilities;
- edge-case semantics.

The goal is minimum **necessary complexity**, not minimum line count.

Do not perform code golf.

A change is justified only when it objectively reduces one or more of:

- code volume;
- duplication;
- conceptual complexity;
- branching or state;
- coupling;
- maintenance burden;
- dependency surface;
- runtime cost;
- regression risk.

If a change merely makes the implementation different without making it demonstrably smaller, simpler, safer, clearer, or more efficient, leave the code unchanged.

Default decision rule:

- if code is proven unnecessary, delete it;
- if code can be objectively simplified, simplify it;
- if duplicate responsibilities can be safely consolidated, consolidate them;
- if an abstraction no longer provides value, remove it;
- if the benefit is uncertain, preserve the existing working behavior.

### Required audit scope

Before making repository-wide refactoring changes, inspect the complete repository rather than only recently changed files or obvious hotspots.

Review all relevant areas, including:

- production source code;
- tests and test utilities;
- resources and assets;
- configuration files;
- build scripts and build configuration;
- CI/CD workflows;
- release tooling;
- dependencies and development dependencies;
- static-analysis and security configuration;
- documentation;
- platform-specific integration;
- generated-code integration points;
- directory and module structure.

First establish:

1. the actual architecture;
2. authoritative sources of state and business logic;
3. all current user-visible functionality;
4. important internal behavior and contracts;
5. persistence and compatibility requirements;
6. framework-, build-, platform-, or convention-driven entry points.

Only then begin removing or consolidating code.

### Required removal candidates

Actively search for and remove, when proven safe:

- dead code;
- unreachable code;
- unused functions;
- unused classes;
- unused methods;
- unused variables;
- unused constants;
- unused types;
- unused interfaces;
- unused imports and exports;
- unused files;
- unused resources and assets;
- obsolete legacy code that no longer participates in current behavior;
- temporary workarounds whose original constraint no longer exists;
- duplicate or near-duplicate implementations;
- unnecessary abstraction layers;
- unnecessary wrappers;
- unnecessary helper functions;
- adapter chains that add no meaningful semantics;
- redundant data conversions;
- redundant intermediate objects;
- redundant intermediate state;
- redundant copies and transformations;
- defensive checks for states already guaranteed by types, architecture, invariants, or earlier validation;
- repeated validation of already validated data;
- repeated checks of the same condition;
- redundant fallbacks;
- obsolete compatibility branches;
- unused feature flags;
- obsolete configuration options;
- unused dependencies;
- unused development dependencies;
- duplicate-purpose dependencies;
- commented-out historical code;
- stale TODO/FIXME items;
- leftovers from previous migrations or refactors.

Pay particular attention to patterns such as:

- repeated null/state/bounds checks;
- nested checks of the same condition;
- repeated validation across adjacent layers;
- unnecessary `try/catch` blocks;
- wrapper -> wrapper -> wrapper call chains;
- DTO/model conversion chains;
- multiple representations of the same authoritative state;
- temporary states that duplicate existing state;
- compatibility paths left behind after migrations;
- helpers with only one trivial caller;
- abstractions created for future scenarios that never materialized.

### Proving code is unused

Do not classify code as unused solely because a textual search finds no direct call.

Before removing anything, check for indirect or convention-driven use through:

- callbacks;
- events;
- observers;
- dependency injection;
- reflection;
- dynamic loading;
- serialization/deserialization;
- framework conventions;
- lifecycle hooks;
- manifests;
- resources;
- routing;
- configuration;
- generated code;
- build scripts;
- CI/CD;
- release tooling;
- plugins;
- native/platform integration;
- test or debug tooling;
- external/public contracts.

When uncertainty remains, preserve the code until its lack of use can be demonstrated.

### Required simplification review

Look for opportunities to safely:

- shorten code without reducing readability;
- simplify control flow;
- reduce nesting;
- reduce mutable state;
- reduce the number of branches;
- merge equivalent paths;
- merge components with the same responsibility;
- remove unnecessary temporary values;
- remove unnecessary objects and allocations;
- remove redundant copies;
- remove repeated transformations;
- remove redundant loops or passes over the same data;
- compute invariant values once instead of repeatedly;
- replace custom code with standard language, platform, framework, or library facilities when clearly simpler;
- eliminate repeated business logic;
- centralize genuinely shared logic when doing so reduces total code and conceptual complexity;
- reduce coupling;
- remove premature generalization;
- remove architecture that exists only for hypothetical future requirements.

Do not introduce an abstraction merely to satisfy DRY.

Similar-looking code should only be unified when the resulting abstraction reduces real duplication and overall complexity.

### Architecture review

Explicitly determine whether:

- historical layers are still necessary;
- historical components are still necessary;
- abstractions are disproportionate to the actual problem;
- interfaces exist with only one implementation and no meaningful boundary benefit;
- classes or modules can be safely merged;
- classes or modules can be safely deleted;
- responsibilities are unnecessarily fragmented;
- there is premature generalization;
- there is speculative extensibility;
- infrastructure exists only for hypothetical future features;
- current architecture reflects requirements that no longer exist;
- duplicated state or business logic creates unnecessary coupling;
- implementation complexity is proportional to actual product complexity.

Prefer the simplest architecture that fully supports the current product.

Do not perform a large rewrite merely because another architecture appears cleaner, newer, or more fashionable.

### Performance review

Review performance only where there is practical value.

Look for:

- repeated calculations;
- repeated queries;
- repeated reads;
- unnecessary parsing;
- repeated transformations of unchanged data;
- avoidable allocations;
- unnecessary copies;
- redundant loops;
- multiple passes that can safely become one;
- unnecessary render/re-render/rebuild/recompute work;
- inappropriate data structures for actual access patterns;
- invariant operations performed repeatedly instead of once;
- unnecessary work in frequently executed paths.

Do not introduce micro-optimizations that reduce readability or maintainability without an obvious or measurable benefit.

### Dependency review

Review every production and development dependency.

For each dependency:

- verify that it is actually used;
- verify that its purpose is still required;
- remove unused dependencies;
- remove obsolete dependencies;
- identify multiple libraries serving the same purpose;
- consolidate overlapping dependencies where safe;
- prefer standard language/platform/framework functionality when it clearly replaces a dependency with less total complexity.

A dependency may be replaced by a small local implementation only when doing so clearly reduces overall complexity, risk, maintenance cost, or artifact size.

Do not replace a mature, well-maintained library with custom code merely to reduce the dependency count.

### Non-negotiable behavior-preservation rules

Unless explicitly requested, a repository-wide cleanup or refactor must not intentionally:

- remove user-facing functionality;
- change existing UX;
- change visual behavior;
- change business logic;
- change game rules;
- change public APIs;
- change public contracts;
- change persisted data formats;
- change exchanged data formats;
- change edge-case behavior;
- change platform behavior;
- weaken compatibility;
- weaken accessibility;
- weaken security or privacy controls;
- reduce functionality merely to reduce code size;
- add unrelated functionality;
- introduce new architectural layers only to satisfy generic best practices;
- perform a broad rewrite without a demonstrated need.

Repository-specific invariants defined elsewhere in this file remain mandatory throughout the refactor.

### Required execution workflow

For a repository-wide audit or deep refactor:

1. Inspect the entire repository.

2. Establish the current:
   - architecture;
   - feature set;
   - user-visible behavior;
   - internal contracts;
   - authoritative state;
   - persistence behavior;
   - platform constraints.

3. Collect reliable baseline statistics where practical.

4. Build an internal candidate list grouped into:
   - deletion;
   - consolidation;
   - simplification;
   - architecture reduction;
   - dependency cleanup;
   - practical performance optimization.

5. Validate every removal against both direct and indirect usage.

6. Rank candidates by:
   - confidence;
   - regression risk;
   - complexity reduction;
   - maintenance benefit.

7. Apply changes in small, logically coherent groups rather than as one uncontrolled rewrite.

8. After every meaningful group, run the relevant available checks, such as:
   - unit tests;
   - integration tests;
   - regression tests;
   - lint;
   - formatting checks;
   - type checking;
   - compilation;
   - build;
   - static analysis;
   - dependency/security checks;
   - project-specific validation.

9. If critical behavior lacks sufficient test coverage for a contemplated risky change, first add the minimum regression test required to capture the existing behavior.

10. Keep behavior-preserving refactoring separate from unrelated feature development.

11. When a candidate cannot be proven safe, leave it unchanged and record the reason.

12. Complete the first refactoring pass.

13. Perform a mandatory second full pass over the already-refactored repository.

14. During the second pass, look again for:
   - newly exposed simplification opportunities;
   - remaining dead code;
   - residual duplication;
   - unnecessary abstractions;
   - unnecessary wrappers;
   - redundant checks;
   - unused dependencies;
   - residual legacy;
   - temporary structures made obsolete by the first pass.

15. Finish with the complete available project verification suite.

### Validation requirements

The final verification should include every applicable repository check.

Examples include:

- clean build;
- complete unit-test suite;
- integration tests;
- regression tests;
- lint;
- formatting verification;
- type checking;
- static analysis;
- dependency audit;
- security checks;
- platform-specific builds;
- production build;
- project-specific verification scripts.

Do not claim a check passed unless it was actually executed successfully.

If a check cannot be run because of environment, credentials, hardware, platform, unavailable tooling, or another external limitation, state that explicitly.

### Comments during refactoring

Preserve the repository's comment policy.

As a default:

- keep comments to the minimum necessary;
- keep source-code comments in English;
- remove stale comments;
- remove misleading comments;
- remove redundant comments;
- do not add comments that merely narrate obvious code;
- retain comments that explain a non-obvious reason, constraint, workaround, invariant, compatibility requirement, or important contract.

Do not replace clear code with explanatory comments when the code itself can be made self-explanatory.

### Completion standard

A repository-wide audit/refactoring task is not complete merely because:

- code was formatted;
- static analysis was run;
- recommendations were listed;
- potential improvements were described;
- only recently modified files were reviewed.

Safe and justified improvements must be implemented directly.

The final codebase should be objectively smaller, simpler, less duplicated, less coupled, easier to reason about, or easier to maintain while preserving behavior.

### Required final report

At completion, report:

1. **Removed**
   - dead code;
   - unused files/resources;
   - obsolete compatibility code;
   - unnecessary abstractions;
   - other removed components.

2. **Consolidated**
   - duplicated logic;
   - equivalent components;
   - repeated validation;
   - shared responsibilities.

3. **Simplified**
   - control flow;
   - state;
   - architecture;
   - transformations;
   - hot paths.

4. **Dependencies**
   - dependencies removed;
   - duplicate-purpose dependencies consolidated;
   - dependency changes intentionally not made and why.

5. **Legacy**
   - legacy components found;
   - which were removed;
   - which remain and why.

6. **Intentionally unchanged**
   - candidates reviewed but preserved;
   - reason removal or simplification could not be proven safe.

7. **Verification**
   - tests run;
   - builds run;
   - lint/typecheck/static-analysis/security checks run;
   - their results.

8. **Limitations**
   - areas that could not be safely optimized;
   - missing coverage;
   - unavailable environment/tooling;
   - external constraints.

9. **Before/after statistics**, when they can be measured reliably:
   - file count;
   - source line count;
   - dependency count;
   - test count;
   - production/build artifact size;
   - other project-relevant metrics.

Never invent statistics.

Use the same counting method for before and after values.

### Final principle

When choosing between:

- preserving working code whose necessity is uncertain;
- deleting code because it appears unnecessary;

preserve the working behavior until the code is proven unnecessary.

The final goal is a codebase containing only the complexity required to implement the project's current functionality: as small, clean, understandable, maintainable, and efficient as reasonably possible, without functional regressions.

## App icon source artwork

- When the project owner provides a new app icon as a PNG and identifies it as the app icon, treat that exact PNG as the canonical source artwork.
- Keep that source as the original raster PNG. Do not trace, vectorize, redraw, restyle, recreate, or convert it to SVG, vector PDF, Android VectorDrawable, SF Symbol, or any other vector representation unless the project owner explicitly requests it.
- Do not overwrite, recompress, optimize in place, or otherwise rewrite the canonical PNG. Keep the uploaded source unchanged.
- Platform-required derivatives may be generated only as raster derivatives of that PNG. Resizing and required raster packaging/container formats such as PNG size variants, ICO, or ICNS are allowed, but the visible artwork must remain unchanged: no cropping, padding, color changes, removed details, or other design edits unless explicitly requested.
- If an older icon in another format is currently canonical, keep it until the project owner explicitly supplies a replacement PNG as the new app icon. Once supplied, that PNG becomes the canonical source and the asset pipeline should derive required icons from it rather than converting it to a vector source.
