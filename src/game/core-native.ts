import { invoke } from "@tauri-apps/api/core";

export const backendKind = "native" as const;

export const coreCreate = (): Promise<string> => invoke<string>("core_create");

export const coreMove = (stateJson: string, x: number, y: number): Promise<string> =>
  invoke<string>("core_move", { stateJson, x, y });

export const coreReplay = (movesJson: string): Promise<string> =>
  invoke<string>("core_replay", { movesJson });

export const coreAi = (stateJson: string, optionsJson: string): Promise<string> =>
  invoke<string>("core_ai", { stateJson, optionsJson });
