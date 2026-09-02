# Computer Opponent

Dots includes a deterministic offline computer opponent for the blue side. The AI is a consumer of the authoritative game core, not a second rules implementation.

## Behavior

- The human plays red and moves first.
- The computer plays blue.
- The existing two-player local mode remains available.
- Switching modes does not rewrite or reset the current move history. If the game is switched to computer mode while blue is to move, the computer takes over that turn.
- In computer mode, Undo rolls back the computer move and the preceding human move when both are present, returning control to the human decision point.
- Game mode and AI difficulty are stored together as versioned preferences, separately from the authoritative move log and viewport state.

## Difficulty levels

Dots provides four deterministic levels. They use the same authoritative move simulation and game rules; bounded search policy and strategic analysis increase with difficulty.

| Level | Search behavior |
| --- | --- |
| **Easy** | Ranks and simulates a small set of immediate computer moves. No opponent-reply search. |
| **Normal** | Adds a bounded opponent reply and selects the best worst-case result. |
| **Hard** | Adds a selective computer continuation, strategic enclosure/threat ordering, and one forcing-capture extension beyond the nominal horizon on ordinary-size positions. |
| **Expert** | Adds one more bounded opponent reply, the widest strategic analysis, alpha-beta pruning, and up to two forcing-capture extensions on ordinary-size positions. |

All profiles shrink their candidate budgets as the number of stones grows. At 250+ stones the most expensive setup probes are disabled and forcing extensions are reduced so long games remain bounded.

## Search model

`src/game/ai.ts` is pure TypeScript and imports no DOM, Canvas, storage, network, or service-worker APIs.

The search is intentionally bounded for browser responsiveness:

1. Build a frontier from empty intersections neighboring active stones.
2. Build active same-color connectivity components and identify frontier points that would close an existing connected path into a cycle. These points are useful for both capture/house construction and blocking an opponent closing point.
3. Rank candidates using local connectivity, opponent contact, cycle-closing pressure, blocked opponent closures, and bounded distance from the latest move.
4. On Hard/Expert, use a wider but bounded root pre-scan through `placeStone()` before the expensive strategic search so real score-changing moves are not hidden solely by heuristic seed order.
5. Validate retained moves through `placeStone()`; illegal points and captured territory are rejected by the same core used for human moves.
6. Evaluate real score/capture state plus secondary structure, local stone danger, and near-cycle pressure.
7. On Expert, discard immediately self-capturing root moves when at least one safe candidate exists and give safe immediate captures root tactical priority.
8. On Hard and Expert, probe a bounded set of authoritative immediate capture threats for both sides and short setup sequences that can create a capture opportunity on the attacker's next turn.
9. Search alternating real turns with deterministic minimax and alpha-beta pruning over the depth enabled by the selected difficulty.
10. At the nominal horizon, Hard/Expert may selectively continue only forcing score-changing capture/release moves instead of blindly increasing full-tree depth.
11. Reuse equivalent searched positions through per-move evaluation/transposition caches.

Capture score changes still dominate evaluation. Strategic features never override actual score at comparable search depth; they improve move ordering and choose among non-scoring or pre-tactical positions. Expert's root immediate-capture priority is deliberately stronger: a safe real capture discovered by the authoritative core is resolved as a tactical fact before deeper speculative comparison.

## Enclosure and house pressure

A frontier point is marked as a cycle-closing point when at least two adjacent active stones of one color are already connected through that color's active graph. Placing a dot there closes a cycle in the heuristic graph. The real rules engine still decides whether the result is an empty house, a scoring capture, a capture-of-capture, or no valid capture.

This lets Hard and Expert value useful house/capture construction and occupy likely opponent closing points before they are completed. It does not add a parallel house implementation to the AI.

## Short-horizon threat analysis

Hard and Expert use bounded threat probes in addition to ordinary alternating minimax:

- immediate capture probes temporarily give one side the turn and test a small ranked set through `placeStone()` to discover real score-changing closures and the stones they threaten;
- setup probes test a small non-scoring setup move and then ask whether another move by the same side would create an authoritative capture opportunity;
- local danger evaluation penalizes own active stones under concentrated opponent contact and rewards comparable pressure against opponent stones.

The same-side setup probe is an evaluation heuristic for recognizing two-own-move plans across an intervening opponent turn. It never enters session history, never changes `GameState`, and never replaces alternating minimax. The opponent's real reply is still handled by the normal search tree.

## Alpha-beta and forcing extensions

Minimax consumes candidates in tactical order and maintains alpha/beta bounds. A branch that cannot improve the already established bound is skipped. Transposition values are cached only when the node was fully searched; cutoff nodes are not stored as exact values.

Hard and Expert also use a small quiescence-style extension at the nominal horizon. Only moves that immediately change the score balance through capture/release are eligible. This reduces obvious horizon effects without turning every position into a deeper full-width search.

## Search caches

Every `chooseAiMove()` call creates fresh in-memory caches for evaluation, search results, canonical state signatures, inactive captured-stone sets, connected components, closure pressure, capture-threat probes, and setup probes.

The transposition signature includes player-to-move, score, all stones, and active capture owner/boundary/captured geometry. Cache entries exist only for the current AI move and are discarded afterward, so they cannot become persistent or authoritative state.

The implementation is deterministic: identical `GameState`, difficulty, options, and focus produce the same move. There is no randomness, remote service, machine-learning model, analytics, or network dependency.

## Strength regression matches

`src/game/ai-match.ts` provides a pure deterministic AI-vs-AI harness used only for tests and analysis. It applies every generated move back through `placeStone()` and can run paired matches with the stronger level once as Red and once as Blue.

The CI suite includes short paired Expert-vs-Normal and Expert-vs-Hard positions. Expert must not lose either paired comparison and must retain a positive aggregate margin across the suite. The suite is deliberately short and has no wall-clock assertion; it is a tactical regression guard, not an Elo rating or hardware benchmark.

## Tactical benchmark suite

`src/game/ai-tactical-benchmark.test.ts` contains six deterministic fixed Expert positions. They cover a two-target immediate capture, a mandatory one-point threat block, rejecting a tempting empty false closure, avoiding a hostile empty house, choosing counter-capture when two independent threats cannot both be blocked, and surrounding an active capture to release a held stone.

All six are required tests in 0.8.1. A position discovered as a real AI weakness may be introduced as an explicit known gap during investigation, but a released fix must promote it to an ordinary required regression rather than weakening the expected result.

## Browser Worker isolation

Version **0.9.0** changes browser orchestration, not AI policy. `main.ts` starts `src/game/ai-worker.ts` as a dedicated Web Worker and sends a structured-cloned `GameState`, focus point, player, difficulty, and request generation through `ai-worker-protocol.ts`. Structured clone preserves the state's `Map`; a regression test locks down that transport assumption.

The Worker returns only the request generation and a proposed coordinate (or an error). The browser rejects stale generations and still calls `playMove()` before a move can enter session history or persistence. Undo, New game, mode/difficulty changes, page hide, and hidden-document transitions can terminate active Worker work. If Blue remains to move after a legitimate cancellation, foreground scheduling starts a fresh calculation.

Version **0.9.1** hardens generation ownership so stale or cancelled timer/Worker callbacks cannot clear the thinking state of a newer computer request. Search depth, evaluation, deterministic tie-breaking, difficulty behavior, and tactical benchmark expectations remain unchanged.

This keeps long Hard/Expert calculations off the UI thread without changing search depth, evaluation, deterministic tie-breaking, tactical benchmarks, or game rules. Production verification requires the generated `ai-worker-*.js` asset.

## Preference migration

AI difficulty is stored in preference format version 2. Existing version-1 preferences from Dots 0.6.0 are migrated automatically: the saved local/computer mode is preserved and computer difficulty defaults to **Normal**. Invalid newer preference data fails closed without touching the saved game.

## Safety and invariants

- The AI may suggest only a safe-integer coordinate; `playMove()` remains responsible for accepting the move into session history.
- The AI cannot invent captures, scores, houses, releases, or legal moves.
- Captured stones are excluded from the AI's active-structure heuristic while their holding capture remains active.
- Difficulty changes search policy only; they never modify game rules or persisted moves.
- Threat/setup probes are speculative evaluation only and never mutate the supplied state or session history.
- Hard/Expert root pre-scan remains bounded and uses only authoritative `placeStone()` outcomes.
- Expert may reject a root move only from a real immediate opponent-score increase returned by the core and only when a safe candidate exists.
- Search and transposition caches are ephemeral implementation details and never become trusted game state.
- Alpha-beta cutoffs must not be cached as exact transposition values.
- Search remains bounded as the board grows; expensive setup analysis and extensions are reduced on large positions.
- If the AI cannot produce a legal move, the UI fails safe by returning to two-player mode instead of fabricating a move or blocking the saved game.
- Browser AI work is terminated when hidden or superseded, stale generations are ignored, and a needed Blue turn is rescheduled when the app returns to the foreground.
- Game saves remain a versioned legal move log. Computer-generated moves are persisted exactly like human moves and replay through the same core after reload.

## Current strength

Version **0.9.3** retains the bounded deterministic AI policy established in 0.8.1: the fixed tactical suite covers missed multi-target immediate capture, self-capturing entry into an opponent house, defensive blocking, counter-capture, false closures, and capture-of-capture release. Later 0.9.x work moves browser computation into an isolated Worker and optimizes ephemeral derived-state caches without changing search depth, weights, deterministic tie-breaking, or benchmark expectations.

The engine remains a bounded tactical opponent rather than a solved-game system. Future strength work should be justified by concrete failing positions or match regressions and must preserve deterministic legality and browser/PWA responsiveness.
