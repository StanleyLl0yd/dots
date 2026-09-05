import type { Player } from "./game/types";

type ToneShape = OscillatorType;

export class GameSoundController {
  private context: AudioContext | undefined;
  private output: GainNode | undefined;

  constructor(private enabled: boolean) {}

  get isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.context && this.output) {
      this.output.gain.setValueAtTime(enabled ? 1 : 0, this.context.currentTime);
    }
    if (!enabled) return;
    this.unlock();
    this.playToggle();
  }

  unlock(): void {
    if (!this.enabled) return;
    const context = this.getContext();
    if (context?.state === "suspended") void context.resume().catch(() => undefined);
  }

  playMove(player: Player): void {
    const base = player === "red" ? 300 : 390;
    this.tone(base, base * 0.84, 0.042, 0.045, "triangle");
  }

  playCapture(player: Player, amount: number): void {
    const context = this.runningContext();
    if (!context) return;
    const bonus = Math.min(Math.max(amount, 1), 8) * 8;
    const base = (player === "red" ? 360 : 440) + bonus;
    const start = context.currentTime + 0.052;
    this.toneAt(context, base, base * 1.16, start, 0.085, 0.055, "sine");
    this.toneAt(context, base * 1.5, base * 1.62, start + 0.052, 0.11, 0.038, "triangle");
  }

  playInvalid(): void {
    this.tone(145, 105, 0.045, 0.022, "square");
  }

  playUndo(): void {
    this.tone(350, 220, 0.07, 0.032, "triangle");
  }

  private playToggle(): void {
    this.tone(470, 560, 0.055, 0.026, "sine");
  }

  private tone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    volume: number,
    shape: ToneShape
  ): void {
    const context = this.runningContext();
    if (!context) return;
    this.toneAt(context, startFrequency, endFrequency, context.currentTime, duration, volume, shape);
  }

  private toneAt(
    context: AudioContext,
    startFrequency: number,
    endFrequency: number,
    start: number,
    duration: number,
    volume: number,
    shape: ToneShape
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const attack = Math.min(0.006, duration / 4);
    const end = start + duration;

    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, end);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(this.output ?? context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }

  private runningContext(): AudioContext | undefined {
    if (!this.enabled) return undefined;
    const context = this.getContext();
    return context?.state === "running" ? context : undefined;
  }

  private getContext(): AudioContext | undefined {
    if (this.context) return this.context;
    if (typeof AudioContext === "undefined") return undefined;
    try {
      this.context = new AudioContext({ latencyHint: "interactive" });
      this.output = this.context.createGain();
      this.output.gain.value = this.enabled ? 1 : 0;
      this.output.connect(this.context.destination);
      return this.context;
    } catch {
      return undefined;
    }
  }
}
