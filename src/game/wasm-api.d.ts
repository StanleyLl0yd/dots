export interface InitSyncOptions {
  module: WebAssembly.Module | BufferSource;
}

export function initSync(options: InitSyncOptions): WebAssembly.Exports;

export default function init(
  input?: { module_or_path?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module }
): Promise<WebAssembly.Exports>;

export function coreCreate(): string;
export function coreMove(stateJson: string, x: bigint, y: bigint): string;
export function coreReplay(movesJson: string): string;
export function coreAi(stateJson: string, optionsJson: string): string;
