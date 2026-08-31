import { chooseAiMove, type AiDifficulty } from "./ai";
import { createGameState, placeStone } from "./board";
import type { GameState, Player, Point } from "./types";

export interface AiMatchOptions {
  red: AiDifficulty;
  blue: AiDifficulty;
  maxMoves?: number;
  opening?: Point[];
}

export interface AiMatchResult {
  state: GameState;
  moves: Point[];
  stopped: "move-limit" | "no-move";
}

const difficultyFor = (player: Player, options: AiMatchOptions): AiDifficulty =>
  player === "red" ? options.red : options.blue;

export const runAiMatch = (options: AiMatchOptions): AiMatchResult => {
  let state = createGameState();
  const moves: Point[] = [];
  let focus: Point | undefined;

  for (const point of options.opening ?? []) {
    const next = placeStone(state, point);
    if (next === state) throw new Error(`Illegal benchmark opening move: ${point.x},${point.y}`);
    state = next;
    focus = point;
    moves.push({ ...point });
  }

  const maxMoves = Math.max(0, options.maxMoves ?? 32);
  while (moves.length < maxMoves) {
    const player = state.currentPlayer;
    const move = chooseAiMove(state, {
      player,
      focus,
      difficulty: difficultyFor(player, options)
    });
    if (!move) return { state, moves, stopped: "no-move" };

    const next = placeStone(state, move);
    if (next === state) throw new Error(`AI proposed an illegal benchmark move: ${move.x},${move.y}`);
    state = next;
    focus = move;
    moves.push({ ...move });
  }

  return { state, moves, stopped: "move-limit" };
};

export const pairedMatchMargin = (
  stronger: AiDifficulty,
  weaker: AiDifficulty,
  maxMoves: number,
  opening: Point[] = []
): number => {
  const asRed = runAiMatch({ red: stronger, blue: weaker, maxMoves, opening });
  const asBlue = runAiMatch({ red: weaker, blue: stronger, maxMoves, opening });
  return (
    asRed.state.score.red -
    asRed.state.score.blue +
    asBlue.state.score.blue -
    asBlue.state.score.red
  );
};
