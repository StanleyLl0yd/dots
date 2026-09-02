export default function init(): Promise<unknown>;
export function coreCreate(): string;
export function coreMove(stateJson: string, x: bigint, y: bigint): string;
export function coreReplay(movesJson: string): string;
export function coreAi(stateJson: string, optionsJson: string): string;
