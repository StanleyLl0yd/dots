import type { AiMoveOptions } from "./ai";
import type { GameState, Point } from "./types";

export interface AiWorkerRequest {
  requestId: number;
  state: GameState;
  options: AiMoveOptions;
}

export interface AiWorkerResponse {
  requestId: number;
  move?: Point;
  error?: string;
}
