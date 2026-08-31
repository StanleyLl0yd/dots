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

Version 0.7.0 provides four deterministic levels. They use the same candidate generator, evaluation, and authoritative move simulation; only bounded search depth and breadth change.

| Level | Search behavior |
| --- | --- |
| **Easy** | Ranks and simulates a small set of immediate computer moves. No opponent-reply search. |
| **Normal** | Adds a bounded opponent reply and selects the best worst-case result. This is the default and roughly preserves the 0.6.0 strength profile. |
| **Hard** | Adds a selective computer continuation after each searched opponent reply, allowing short attack/defense sequences. |
| **Expert** | Adds one more bounded opponent reply after the computer continuation and uses the widest search budget. |

All profiles shrink their candidate budgets as the number of stones grows. Difficulty changes therefore increase tactical depth without creating an unbounded search tree.

## Search model

`src/game/ai.ts` is pure TypeScript and imports no DOM, Canvas, storage, network, or service-worker APIs.

The search is intentionally bounded for browser responsiveness:

1. Build a frontier from empty intersections neighboring active stones.
2. Rank frontier points with a cheap local heuristic that values own connectivity, contact with opponent structure, likely closing points, and proximity to the latest move.
3. Validate shortlisted moves by applying them through `placeStone()`; illegal points and captured territory are rejected by the same core used for human moves.
4. Evaluate real resulting score/capture state, not guessed Canvas geometry.
5. Apply deterministic minimax over the number of plies enabled by the selected difficulty.
6. Reduce per-ply candidate budgets as the position grows.
7. Reuse equivalent searched positions through a bounded per-move transposition cache.

Capture score changes dominate the evaluation. Structural same-color links are a secondary tie-breaker. Immediate captures therefore remain high priority at every level, while Normal and above can explicitly account for opponent tactical replies.

The transposition signature includes player-to-move, score, all stones, inactive captured stones, and active capture geometry. Cache entries exist only for the current `chooseAiMove()` call and are discarded afterward, so they cannot become persistent or authoritative state.

The implementation is deterministic: identical `GameState`, difficulty, options, and focus produce the same move. There is no randomness, remote service, machine-learning model, analytics, or network dependency.

## Preference migration

AI difficulty is stored in preference format version 2. Existing version-1 preferences from Dots 0.6.0 are migrated automatically: the saved local/computer mode is preserved and computer difficulty defaults to **Normal**. Invalid newer preference data fails closed without touching the saved game.

## Safety and invariants

- The AI may suggest only a coordinate; `playMove()` remains responsible for accepting the move into session history.
- The AI cannot invent captures, scores, houses, releases, or legal moves.
- Captured stones are excluded from the AI's active-structure heuristic while their holding capture remains active.
- Difficulty changes search policy only; they never modify game rules or persisted moves.
- Search and transposition caches are ephemeral implementation details and never become trusted game state.
- If the AI cannot produce a legal move, the UI fails safe by returning to two-player mode instead of fabricating a move or blocking the saved game.
- A pending computer turn is suspended when the document is hidden and resumed when the app returns to the foreground.
- Game saves remain a versioned legal move log. Computer-generated moves are persisted exactly like human moves and replay through the same core after reload.

## Current strength

Version 0.7.0 turns the original tactical opponent into a selectable four-level opponent. It is still a bounded tactical engine rather than a solved-game system. Hard and Expert can see short multi-ply exchanges that Easy and Normal cannot, while adaptive budgets keep long games practical for the browser/PWA target.

Future AI work should focus on measured tactical quality, pruning, and real-device responsiveness rather than increasing depth without a bound.
