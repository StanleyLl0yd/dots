import type * as WasmApi from "./wasm-api";

export const backendKind: "native" | "web" = "web";

let modulePromise: Promise<typeof WasmApi> | undefined;

const loadCore = async (): Promise<typeof WasmApi> => {
  modulePromise ??= import("#game-core-wasm").then(async (module) => {
    await module.default();
    return module;
  });
  return modulePromise;
};

export const coreCreate = async (): Promise<string> => (await loadCore()).coreCreate();

export const coreMove = async (stateJson: string, x: number, y: number): Promise<string> =>
  (await loadCore()).coreMove(stateJson, BigInt(x), BigInt(y));

export const coreReplay = async (movesJson: string): Promise<string> =>
  (await loadCore()).coreReplay(movesJson);

export const coreAi = async (stateJson: string, optionsJson: string): Promise<string> =>
  (await loadCore()).coreAi(stateJson, optionsJson);
