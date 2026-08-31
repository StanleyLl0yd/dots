export type Player = "red" | "blue";

export interface Point {
  x: number;
  y: number;
}

export interface Stone extends Point {
  player: Player;
}

export interface Capture {
  owner: Player;
  boundary: Point[];
  captured: Stone[];
}

export interface GameState {
  currentPlayer: Player;
  stones: Map<string, Stone>;
  captures: Capture[];
  score: Record<Player, number>;
}
