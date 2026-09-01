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
- Keep `src/game/ai.ts` free of DOM, Canvas, viewport, storage, service-worker, and network dependencies. AI behavior must remain usable offline and independently testable from the browser shell.
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
- Game-mode and AI-difficulty preferences must remain separately versioned from the authoritative game move log and viewport state. Invalid preference data must fail closed without changing a valid game; supported older preference versions should be migrated explicitly when practical.
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

## Mandatory repository-wide audit and deep-refactoring rule

When a task requests a full audit, cleanup, optimization, simplification, or deep refactoring of the project, treat the following as a mandatory execution contract rather than a recommendation.

### Objective

- Audit the entire repository, not only recently changed files or the area named in the latest task.
- Reduce the codebase to the minimum necessary complexity while preserving 100% of current functionality, behavior, UI/UX, public interfaces, documented capabilities, data formats, and edge-case semantics.
- Prefer deletion, simplification, or consolidation only when the result is objectively smaller or clearer without weakening correctness or maintainability.
- Do not pursue the smallest line count at the expense of readability. This is complexity reduction, not code golf.
- If a change merely makes the code different rather than demonstrably simpler, smaller, safer, or more efficient, do not make it.

### Required audit scope

Before changing code, inspect the complete repository, including:

- application source;
- game and UI logic;
- tests and fixtures;
- configuration files;
- build scripts;
- CI/CD workflows;
- dependencies and devDependencies;
- documentation;
- static resources/assets;
- directory structure;
- platform-specific or convention-driven code, if present.

Establish the actual architecture and enumerate the existing user-visible and internal behaviors that must remain intact before refactoring critical paths.

### Required removal candidates

Actively search for and remove, when proven safe:

- dead or unreachable code;
- unused functions, classes, methods, variables, constants, types, interfaces, imports, exports, and files;
- legacy code that no longer participates in current application behavior;
- obsolete compatibility branches;
- temporary workarounds whose original constraint no longer exists;
- duplicate or near-duplicate code;
- unnecessary abstraction layers;
- wrapper/helper chains that add no useful semantics;
- unnecessary data conversions and intermediate representations;
- defensive checks for states already guaranteed by architecture, types, or earlier validation;
- repeated validation of the same invariant;
- redundant fallbacks;
- unused dependencies and devDependencies;
- obsolete configuration options;
- unused feature flags;
- commented-out historical code;
- stale TODO/FIXME items;
- unused assets and resources.

Do not classify something as unused solely because a textual search finds no direct call. Check indirect use through callbacks, events, dynamic loading, framework conventions, configuration, build tooling, serialization, platform integration, and other non-obvious entry points.

### Required simplification candidates

Look for opportunities to:

- make code shorter without reducing readability;
- simplify control flow;
- merge equivalent or nearly equivalent paths;
- replace custom code with appropriate language/platform/library primitives;
- remove unnecessary intermediate objects, states, copies, transformations, and allocations;
- reduce duplicate loops or passes over the same data;
- perform invariant work once rather than repeatedly;
- reduce the number of branches and mutable states;
- reduce coupling between components;
- eliminate repeated business/rule logic;
- centralize genuinely shared logic only when doing so reduces total code and conceptual complexity.

Do not create a shared abstraction merely because two pieces of code look similar. The abstraction must reduce real duplication or complexity.

### Architecture review requirements

Explicitly examine whether:

- historical layers/components are still necessary;
- abstractions exceed the actual complexity of the problem;
- modules or classes can be safely deleted or merged;
- the repository contains premature generalization;
- there is architecture built for hypothetical future requirements that provides no current value;
- the implementation complexity is proportional to the real problem being solved.

Do not perform a large rewrite merely because another architecture appears cleaner. Preserve the current architecture when the benefit of replacement is not clearly proven.

### Performance review requirements

Optimize only where there is a practical or obvious benefit. Look for:

- unnecessary computation;
- repeated requests or repeated reads;
- unnecessary allocations;
- repeated render/rebuild/recompute work;
- repeated parsing or transformation of the same data;
- inefficient data structures for the actual access pattern;
- work repeated inside loops that can safely be performed once.

Do not apply micro-optimizations that reduce readability without a measurable or clearly evident benefit.

### Dependency review requirements

For every dependency and devDependency:

- verify that it is actually used;
- remove unused packages;
- identify overlapping libraries that serve the same purpose;
- prefer a few lines of standard/native code over a dependency only when that objectively reduces project complexity;
- do not replace a well-maintained library with custom code without a strong reason;
- preserve reproducible lockfile and audit requirements defined elsewhere in this file.

### Non-negotiable compatibility constraints

A cleanup/refactor must not intentionally:

- remove user-facing functionality;
- change existing UX;
- change game/business logic;
- change public APIs/contracts without absolute necessity;
- change persisted or exchanged data formats;
- change existing edge-case behavior;
- reduce functionality merely to reduce code size;
- add unrelated features;
- introduce architecture solely for best-practice aesthetics;
- weaken accessibility, offline/PWA behavior, deterministic AI behavior, persistence semantics, or any other established project invariant.

When uncertain whether apparently unnecessary code is actually required, preserve it until its redundancy is proven.

### Execution workflow

For a repository-wide cleanup/refactor:

1. Inspect the whole repository and establish the current architecture and behavior.
2. Build an internal candidate list grouped into removal, consolidation, simplification, and optimization.
3. Validate each candidate against direct and indirect usage before changing it.
4. Make changes in small, logically coherent groups rather than one uncontrolled rewrite.
5. After each meaningful group, run the relevant available checks: tests, lint, typecheck, build, static analysis, and project-specific verification.
6. If critical behavior is not sufficiently covered for a contemplated change, add the minimum regression test necessary to lock down current behavior before refactoring it.
7. Keep behavior-preserving changes separate from unrelated feature work.
8. After the first refactoring pass, perform a second full simplification pass over the already-refactored repository and again look for dead code, duplicate logic, unnecessary abstractions, redundant checks, unused dependencies, and residual legacy.
9. Finish with the complete project verification suite available to the repository.

Pay special attention to patterns such as:

- repeated nested checks of the same condition;
- repeated validation of already validated data;
- unnecessary `try`/`catch` layers;
- wrapper-to-wrapper call chains;
- unnecessary DTO/model conversions;
- transient states that duplicate authoritative state;
- compatibility branches left behind by previous migrations or refactors.

### Comments during refactoring

- Follow the repository's existing comment rules.
- Do not add comments that restate obvious code.
- Remove stale, misleading, or useless comments.
- Keep comments only when they explain a non-obvious reason, constraint, invariant, or architectural contract.

### Mandatory final verification

Before declaring a full audit/refactor complete, run every applicable available check, including:

- clean/reproducible install where applicable;
- dependency/security audit;
- complete test suite;
- lint, if configured;
- typecheck;
- production build;
- project-specific artifact/static verification;
- relevant deterministic stress/regression suites.

A green format-only or typecheck-only result is insufficient for this class of task.

### Mandatory final report

The completion report for a repository-wide audit/refactor must state:

1. What was removed.
2. What was consolidated or merged.
3. What was simplified.
4. Which dependencies were removed, if any.
5. Which potential legacy components were found.
6. Which areas were deliberately left unchanged and why.
7. Which tests, builds, static checks, audits, and project-specific verifications were run and their results.
8. Which areas could not be safely optimized without additional information, coverage, or empirical testing.
9. Before/after statistics when they can be measured reliably, including as applicable: file count, source line count, dependency count, test count, and production/build artifact size.

Do not stop at recommendations when safe improvements can be made directly. Apply proven-safe cleanup/refactoring changes to the project.

The governing decision rule is: when choosing between keeping known-working code and deleting code that merely appears unnecessary, keep the working code until there is sufficient evidence that removal is safe.
