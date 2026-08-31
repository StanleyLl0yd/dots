# Computer Opponent

Dots includes a deterministic offline computer opponent for the blue side. The AI is a consumer of the authoritative game core, not a second rules implementation.

## Behavior

- The human plays red and moves first.
- The computer plays blue.
- The existing two-player local mode remains available.
- Switching modes does not rewrite or reset the current move history. If the game is switched to computer mode while blue is to move, the computer takes over that turn.
- In computer mode, Undo rolls back the computer move and the preceding human move when both are present, returning control to the human decision point.
- The selected game mode is stored separately from the authoritative move log and viewport state.

## Search model

`src/game/ai.ts` is pure TypeScript and imports no DOM, Canvas, storage, network, or service-worker APIs.

The search is intentionally bounded for browser responsiveness:

1. Build a frontier from empty intersections neighboring active stones.
2. Rank frontier points with a cheap local heuristic that values own connectivity, contact with opponent structure, likely closing points, and proximity to the latest move.
3. Validate shortlisted moves by applying them through `placeStone()`; illegal points and captured territory are rejected by the same core used for human moves.
4. Evaluate real resulting score/capture state, not guessed Canvas geometry.
5. Search a bounded set of opponent replies and maximize the worst resulting evaluation.
6. Reduce candidate/reply budgets as the position grows so long games remain bounded.

Capture score changes dominate the evaluation. Structural same-color links are a secondary tie-breaker. This makes immediate captures highly valuable and allows one-reply lookahead to block obvious opponent closures when no stronger tactic exists.

The implementation is deterministic: identical `GameState`, options, and focus produce the same move. There is no randomness, remote service, machine-learning model, analytics, or network dependency.

## Safety and invariants

- The AI may suggest only a coordinate; `playMove()` remains responsible for accepting the move into session history.
- The AI cannot invent captures, scores, houses, releases, or legal moves.
- Captured stones are excluded from the AI's active-structure heuristic while their holding capture remains active.
- If the AI cannot produce a legal move, the UI fails safe by returning to two-player mode instead of fabricating a move or blocking the saved game.
- A pending computer turn is suspended when the document is hidden and resumed when the app returns to the foreground.
- Game saves remain a versioned legal move log. Computer-generated moves are persisted exactly like human moves and replay through the same core after reload.

## Current strength

Version 0.6.0 is the first computer-opponent release. It is a tactical bounded-search opponent, not a solved-game engine. It handles immediate capture opportunities, obvious one-move threats, houses and capture-of-capture indirectly through authoritative move simulation, and basic connected-shape development.

Future AI improvements should preserve the same public contract and may add deeper selective search, better threat extraction, transposition caching, or difficulty levels only when they remain responsive and deterministic enough for the browser/PWA target.
