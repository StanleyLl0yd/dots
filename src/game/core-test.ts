import * as wasm from "#game-core-wasm";
import type * as WasmApi from "./wasm-api";

export const backendKind: "native" | "web" = "web";

let initialized = false;

const loadCore = (): typeof WasmApi => {
  if (!initialized) {
    const process = (globalThis as unknown as {
      process: {
        getBuiltinModule(name: "fs"): {
          readFileSync(path: URL): Uint8Array;
        };
      };
    }).process;
    const bytes = process.getBuiltinModule("fs").readFileSync(
      new URL("../wasm/game_core_bg.wasm", import.meta.url)
    );
    wasm.initSync({ module: bytes as unknown as BufferSource });
    initialized = true;
  }
  return wasm;
};

export const coreCreate = async (): Promise<string> => loadCore().coreCreate();

export const coreMove = async (stateJson: string, x: number, y: number): Promise<string> =>
  loadCore().coreMove(stateJson, BigInt(x), BigInt(y));

export const coreReplay = async (movesJson: string): Promise<string> => loadCore().coreReplay(movesJson);

export const coreAi = async (stateJson: string, optionsJson: string): Promise<string> =>
  loadCore().coreAi(stateJson, optionsJson);
