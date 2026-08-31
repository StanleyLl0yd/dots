import type { Capture, GameState, Point } from "../game/types";

interface CanvasBoardOptions {
  onPoint: (point: Point) => void;
}

export class CanvasBoard {
  private readonly context: CanvasRenderingContext2D;
  private state: GameState;
  private readonly cell = 32;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    state: GameState,
    private readonly options: CanvasBoardOptions
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    this.context = context;
    this.state = state;
    this.canvas.addEventListener("pointerup", this.handlePointer);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  setState(state: GameState): void {
    this.state = state;
    this.draw();
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerup", this.handlePointer);
    window.removeEventListener("resize", this.resize);
  }

  private readonly resize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw();
  };

  private readonly handlePointer = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = Math.round((event.clientX - rect.left - centerX) / this.cell);
    const y = Math.round((event.clientY - rect.top - centerY) / this.cell);
    this.options.onPoint({ x, y });
  };

  private screenPoint(point: Point, centerX: number, centerY: number): Point {
    return { x: centerX + point.x * this.cell, y: centerY + point.y * this.cell };
  }

  private drawCapture(capture: Capture, centerX: number, centerY: number): void {
    const points = capture.boundary.map((point) => this.screenPoint(point, centerX, centerY));
    if (points.length < 3) return;

    const color = capture.owner === "red" ? "220, 38, 38" : "37, 99, 235";
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const height = maxY - minY;

    this.context.save();
    this.context.beginPath();
    this.context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) this.context.lineTo(point.x, point.y);
    this.context.closePath();
    this.context.fillStyle = `rgba(${color}, 0.055)`;
    this.context.fill();
    this.context.clip();

    this.context.strokeStyle = `rgba(${color}, 0.16)`;
    this.context.lineWidth = 1;
    for (let x = minX - height; x <= maxX; x += 10) {
      this.context.beginPath();
      this.context.moveTo(x, minY);
      this.context.lineTo(x + height, maxY);
      this.context.stroke();
    }
    this.context.restore();

    this.context.beginPath();
    this.context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) this.context.lineTo(point.x, point.y);
    this.context.closePath();
    this.context.strokeStyle = `rgb(${color})`;
    this.context.lineWidth = 2.5;
    this.context.lineJoin = "round";
    this.context.stroke();
  }

  private draw(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    this.context.clearRect(0, 0, width, height);
    this.context.strokeStyle = "#c9bfae";
    this.context.lineWidth = 1;

    const offsetX = ((centerX % this.cell) + this.cell) % this.cell;
    const offsetY = ((centerY % this.cell) + this.cell) % this.cell;

    for (let x = offsetX; x <= width; x += this.cell) {
      this.context.beginPath();
      this.context.moveTo(x, 0);
      this.context.lineTo(x, height);
      this.context.stroke();
    }

    for (let y = offsetY; y <= height; y += this.cell) {
      this.context.beginPath();
      this.context.moveTo(0, y);
      this.context.lineTo(width, y);
      this.context.stroke();
    }

    for (const capture of this.state.captures) this.drawCapture(capture, centerX, centerY);

    for (const stone of this.state.stones.values()) {
      const { x, y } = this.screenPoint(stone, centerX, centerY);
      this.context.beginPath();
      this.context.arc(x, y, 6.5, 0, Math.PI * 2);
      this.context.fillStyle = stone.player === "red" ? "#dc2626" : "#2563eb";
      this.context.fill();
    }
  }
}
