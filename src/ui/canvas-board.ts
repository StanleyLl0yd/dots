import type { Capture, GameState, Point } from "../game/types";
import {
  DEFAULT_VIEWPORT,
  fitViewportToPoints,
  gameToScreen,
  panViewport,
  screenToGame,
  screenToGrid,
  viewportForAnchor,
  visibleGridBounds,
  zoomViewportAt,
  type ScreenPoint,
  type Viewport,
  type ViewportSize
} from "./viewport";

interface CanvasBoardOptions {
  onPoint: (point: Point) => void | Promise<void>;
  initialViewport?: Viewport;
  onViewportChange?: (viewport: Viewport) => void;
  onKeyboardCursorChange?: (point: Point) => void;
}

interface DragGesture {
  pointerId: number;
  start: ScreenPoint;
  startViewport: Viewport;
  moved: boolean;
  allowTap: boolean;
}

interface PinchGesture {
  pointerIds: [number, number];
  startDistance: number;
  startZoom: number;
  anchorGame: ScreenPoint;
}

const DRAG_THRESHOLD = 6;
const KEYBOARD_ZOOM_FACTOR = 1.2;
const KEYBOARD_MARGIN = 48;
const INVALID_FEEDBACK_MS = 240;
const CAPTURE_FLASH_MS = 420;

const distance = (a: ScreenPoint, b: ScreenPoint): number => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: ScreenPoint, b: ScreenPoint): ScreenPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const copyViewport = (viewport: Viewport): Viewport => ({ ...viewport });
const samePoint = (a: Point | undefined, b: Point | undefined): boolean =>
  a?.x === b?.x && a?.y === b?.y;
const captureKey = (capture: Capture): string => {
  const boundary = capture.boundary.map((point) => `${point.x},${point.y}`).join(";");
  const captured = capture.captured
    .map((stone) => `${stone.player}:${stone.x},${stone.y}`)
    .sort()
    .join(";");
  return `${capture.owner}|${boundary}|${captured}`;
};

export class CanvasBoard {
  private readonly context: CanvasRenderingContext2D;
  private state: GameState;
  private viewport: Viewport;
  private readonly pointers = new Map<number, ScreenPoint>();
  private drag?: DragGesture;
  private pinch?: PinchGesture;
  private keyboardCursor?: Point;
  private hoverPoint?: Point;
  private lastMove?: Point;
  private invalidPoint?: Point;
  private readonly highlightedCaptureKeys = new Set<string>();
  private invalidTimer?: number;
  private captureTimer?: number;
  private viewportDirty = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    state: GameState,
    private readonly options: CanvasBoardOptions
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    this.context = context;
    this.state = state;
    this.viewport = copyViewport(options.initialViewport ?? DEFAULT_VIEWPORT);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerCancel);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
    this.canvas.addEventListener("keydown", this.handleKeyDown);
    this.canvas.addEventListener("focus", this.handleFocus);
    this.canvas.addEventListener("blur", this.handleBlur);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  setState(state: GameState, lastMove?: Point): void {
    this.state = state;
    this.lastMove = lastMove ? { ...lastMove } : undefined;
    this.clearTransientFeedback();
    this.draw();
  }

  getViewport(): Viewport {
    return copyViewport(this.viewport);
  }

  fitPosition(): boolean {
    if (this.state.stones.size === 0) return false;
    this.viewport = fitViewportToPoints(this.state.stones.values(), this.size());
    this.viewportDirty = true;
    this.draw();
    this.commitViewport();
    return true;
  }

  flashCaptures(captures: readonly Capture[]): void {
    if (captures.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (this.captureTimer !== undefined) window.clearTimeout(this.captureTimer);
    this.highlightedCaptureKeys.clear();
    for (const capture of captures) this.highlightedCaptureKeys.add(captureKey(capture));
    this.draw();
    this.captureTimer = window.setTimeout(() => {
      this.captureTimer = undefined;
      this.highlightedCaptureKeys.clear();
      this.draw();
    }, CAPTURE_FLASH_MS);
  }

  showInvalidPoint(point: Point): void {
    if (this.invalidTimer !== undefined) window.clearTimeout(this.invalidTimer);
    this.invalidPoint = { ...point };
    this.draw();
    this.invalidTimer = window.setTimeout(() => {
      this.invalidTimer = undefined;
      this.invalidPoint = undefined;
      this.draw();
    }, INVALID_FEEDBACK_MS);
  }

  resetViewport(): void {
    this.viewport = copyViewport(DEFAULT_VIEWPORT);
    this.viewportDirty = true;
    if (this.keyboardCursor) this.keyboardCursor = { x: 0, y: 0 };
    this.draw();
    this.commitViewport();
    if (this.keyboardCursor) this.options.onKeyboardCursorChange?.({ ...this.keyboardCursor });
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerCancel);
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.removeEventListener("wheel", this.handleWheel);
    this.canvas.removeEventListener("keydown", this.handleKeyDown);
    this.canvas.removeEventListener("focus", this.handleFocus);
    this.canvas.removeEventListener("blur", this.handleBlur);
    window.removeEventListener("resize", this.resize);
    if (this.invalidTimer !== undefined) window.clearTimeout(this.invalidTimer);
    if (this.captureTimer !== undefined) window.clearTimeout(this.captureTimer);
  }

  private clearTransientFeedback(): void {
    if (this.invalidTimer !== undefined) window.clearTimeout(this.invalidTimer);
    if (this.captureTimer !== undefined) window.clearTimeout(this.captureTimer);
    this.invalidTimer = undefined;
    this.captureTimer = undefined;
    this.invalidPoint = undefined;
    this.highlightedCaptureKeys.clear();
  }

  private size(): ViewportSize {
    return { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
  }

  private localPoint(event: PointerEvent | WheelEvent): ScreenPoint {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private viewportCenterGrid(): Point {
    return { x: Math.round(this.viewport.centerX), y: Math.round(this.viewport.centerY) };
  }

  private readonly resize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(3, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw();
  };

  private beginPinch(): void {
    if (this.pointers.size < 2) return;
    const entries = [...this.pointers.entries()].slice(0, 2);
    const firstId = entries[0][0];
    const secondId = entries[1][0];
    const first = entries[0][1];
    const second = entries[1][1];
    const anchorScreen = midpoint(first, second);
    this.pinch = {
      pointerIds: [firstId, secondId],
      startDistance: Math.max(1, distance(first, second)),
      startZoom: this.viewport.zoom,
      anchorGame: screenToGame(anchorScreen, this.viewport, this.size())
    };
    this.drag = undefined;
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    this.hoverPoint = undefined;
    if (this.keyboardCursor) this.keyboardCursor = undefined;
    const point = this.localPoint(event);
    this.pointers.set(event.pointerId, point);
    this.canvas.setPointerCapture(event.pointerId);

    if (this.pointers.size === 1) {
      this.drag = {
        pointerId: event.pointerId,
        start: point,
        startViewport: copyViewport(this.viewport),
        moved: false,
        allowTap: true
      };
    } else if (this.pointers.size === 2) {
      this.beginPinch();
    }
    this.draw();
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) {
      if (event.pointerType === "mouse") {
        const next = screenToGrid(this.localPoint(event), this.viewport, this.size());
        if (!samePoint(next, this.hoverPoint)) {
          this.hoverPoint = next;
          this.draw();
        }
      }
      return;
    }

    const point = this.localPoint(event);
    this.pointers.set(event.pointerId, point);

    if (this.pinch) {
      const first = this.pointers.get(this.pinch.pointerIds[0]);
      const second = this.pointers.get(this.pinch.pointerIds[1]);
      if (!first || !second) return;
      const currentMidpoint = midpoint(first, second);
      const zoom = this.pinch.startZoom * (distance(first, second) / this.pinch.startDistance);
      this.viewport = viewportForAnchor(this.pinch.anchorGame, currentMidpoint, this.size(), zoom);
      this.viewportDirty = true;
      this.canvas.classList.add("is-panning");
      this.draw();
      return;
    }

    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const deltaX = point.x - this.drag.start.x;
    const deltaY = point.y - this.drag.start.y;
    if (!this.drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;

    this.drag.moved = true;
    this.viewport = panViewport(this.drag.startViewport, deltaX, deltaY);
    this.viewportDirty = true;
    this.canvas.classList.add("is-panning");
    this.draw();
  };

  private finishPointer(event: PointerEvent, allowPlacement: boolean): void {
    const point = this.localPoint(event);
    if (this.pointers.has(event.pointerId)) this.pointers.set(event.pointerId, point);

    const endedPinch = this.pinch?.pointerIds.includes(event.pointerId) ?? false;
    const drag = this.drag;
    if (
      allowPlacement &&
      !endedPinch &&
      drag?.pointerId === event.pointerId &&
      drag.allowTap &&
      !drag.moved
    ) {
      this.options.onPoint(screenToGrid(point, this.viewport, this.size()));
    }

    this.pointers.delete(event.pointerId);
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);

    if (endedPinch) {
      this.pinch = undefined;
      if (this.pointers.size >= 2) {
        this.beginPinch();
      } else if (this.pointers.size === 1) {
        const [remainingId, remainingPoint] = [...this.pointers.entries()][0];
        this.drag = {
          pointerId: remainingId,
          start: remainingPoint,
          startViewport: copyViewport(this.viewport),
          moved: false,
          allowTap: false
        };
      } else {
        this.drag = undefined;
      }
    } else if (drag?.pointerId === event.pointerId) {
      this.drag = undefined;
    }

    if (this.pointers.size === 0) this.canvas.classList.remove("is-panning");
    if (event.pointerType === "mouse") this.hoverPoint = screenToGrid(point, this.viewport, this.size());
    this.commitViewport();
    this.draw();
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    this.finishPointer(event, true);
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    this.finishPointer(event, false);
  };

  private readonly handlePointerLeave = (): void => {
    if (this.pointers.size > 0 || !this.hoverPoint) return;
    this.hoverPoint = undefined;
    this.draw();
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? this.size().height : 1;
    const factor = Math.exp(-event.deltaY * multiplier * 0.0015);
    const next = zoomViewportAt(this.viewport, this.localPoint(event), this.size(), factor);
    if (next.zoom === this.viewport.zoom && next.centerX === this.viewport.centerX && next.centerY === this.viewport.centerY) return;
    this.viewport = next;
    this.viewportDirty = true;
    this.draw();
    this.commitViewport();
  };

  private readonly handleFocus = (): void => {
    if (!this.keyboardCursor) this.keyboardCursor = this.viewportCenterGrid();
    this.hoverPoint = undefined;
    this.options.onKeyboardCursorChange?.({ ...this.keyboardCursor });
    this.draw();
  };

  private readonly handleBlur = (): void => {
    if (!this.keyboardCursor) return;
    this.keyboardCursor = undefined;
    this.draw();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const current = this.keyboardCursor ?? this.viewportCenterGrid();
    let nextCursor: Point | undefined;

    if (event.key === "ArrowLeft") nextCursor = { x: current.x - 1, y: current.y };
    else if (event.key === "ArrowRight") nextCursor = { x: current.x + 1, y: current.y };
    else if (event.key === "ArrowUp") nextCursor = { x: current.x, y: current.y - 1 };
    else if (event.key === "ArrowDown") nextCursor = { x: current.x, y: current.y + 1 };

    if (nextCursor) {
      event.preventDefault();
      this.keyboardCursor = nextCursor;
      this.ensureKeyboardCursorVisible();
      this.options.onKeyboardCursorChange?.({ ...nextCursor });
      this.draw();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.keyboardCursor = current;
      this.options.onPoint({ ...current });
      return;
    }

    const zoomFactor = event.key === "+" ? KEYBOARD_ZOOM_FACTOR : event.key === "-" ? 1 / KEYBOARD_ZOOM_FACTOR : undefined;
    if (zoomFactor === undefined) return;

    event.preventDefault();
    this.keyboardCursor = current;
    this.ensureKeyboardCursorVisible();
    const anchor = this.screenPoint(current);
    const next = zoomViewportAt(this.viewport, anchor, this.size(), zoomFactor);
    if (next.zoom === this.viewport.zoom && next.centerX === this.viewport.centerX && next.centerY === this.viewport.centerY) return;
    this.viewport = next;
    this.viewportDirty = true;
    this.draw();
    this.commitViewport();
  };

  private ensureKeyboardCursorVisible(): void {
    if (!this.keyboardCursor) return;
    const size = this.size();
    const screen = this.screenPoint(this.keyboardCursor);
    if (
      screen.x >= KEYBOARD_MARGIN &&
      screen.x <= size.width - KEYBOARD_MARGIN &&
      screen.y >= KEYBOARD_MARGIN &&
      screen.y <= size.height - KEYBOARD_MARGIN
    ) return;

    this.viewport = viewportForAnchor(
      this.keyboardCursor,
      { x: size.width / 2, y: size.height / 2 },
      size,
      this.viewport.zoom
    );
    this.viewportDirty = true;
    this.commitViewport();
  }

  private commitViewport(): void {
    if (!this.viewportDirty) return;
    this.viewportDirty = false;
    this.options.onViewportChange?.(copyViewport(this.viewport));
  }

  private screenPoint(point: Point): ScreenPoint {
    return gameToScreen(point, this.viewport, this.size());
  }

  private drawCapture(capture: Capture): void {
    const points = capture.boundary.map((point) => this.screenPoint(point));
    if (points.length < 3) return;

    const highlighted = this.highlightedCaptureKeys.has(captureKey(capture));
    const color = capture.owner === "red" ? "220, 38, 38" : "37, 99, 235";
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const size = this.size();
    if (maxX < 0 || minX > size.width || maxY < 0 || minY > size.height) return;
    const visualScale = Math.sqrt(this.viewport.zoom);

    this.context.save();
    this.context.beginPath();
    this.context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) this.context.lineTo(point.x, point.y);
    this.context.closePath();
    this.context.fillStyle = `rgba(${color}, ${highlighted ? 0.11 : 0.055})`;
    this.context.fill();
    this.context.clip();

    this.context.strokeStyle = `rgba(${color}, ${highlighted ? 0.24 : 0.16})`;
    this.context.lineWidth = 1;
    const hatchStep = Math.min(16, Math.max(7, 10 * visualScale));
    for (let x = -size.height; x <= size.width; x += hatchStep) {
      this.context.beginPath();
      this.context.moveTo(x, 0);
      this.context.lineTo(x + size.height, size.height);
      this.context.stroke();
    }
    this.context.restore();

    this.context.beginPath();
    this.context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) this.context.lineTo(point.x, point.y);
    this.context.closePath();
    this.context.strokeStyle = `rgb(${color})`;
    this.context.lineWidth = Math.min(5, Math.max(1.5, 2.5 * visualScale + (highlighted ? 1.5 : 0)));
    this.context.lineJoin = "round";
    this.context.stroke();
  }

  private drawHoverPreview(radius: number): void {
    if (!this.hoverPoint || this.keyboardCursor) return;
    const { x, y } = this.screenPoint(this.hoverPoint);
    const size = this.size();
    if (x < 0 || x > size.width || y < 0 || y > size.height) return;
    this.context.save();
    this.context.globalAlpha = 0.22;
    this.context.beginPath();
    this.context.arc(x, y, Math.max(3, radius * 0.82), 0, Math.PI * 2);
    this.context.fillStyle = this.state.currentPlayer === "red" ? "#dc2626" : "#2563eb";
    this.context.fill();
    this.context.restore();
  }

  private drawLastMove(radius: number): void {
    if (!this.lastMove) return;
    const { x, y } = this.screenPoint(this.lastMove);
    const size = this.size();
    if (x < -radius || x > size.width + radius || y < -radius || y > size.height + radius) return;
    const color = getComputedStyle(this.canvas).getPropertyValue("--board-last-move").trim() || "#6b6257";
    this.context.save();
    this.context.beginPath();
    this.context.arc(x, y, radius + 4, 0, Math.PI * 2);
    this.context.strokeStyle = color;
    this.context.lineWidth = 1.5;
    this.context.stroke();
    this.context.restore();
  }

  private drawInvalidPoint(radius: number): void {
    if (!this.invalidPoint) return;
    const { x, y } = this.screenPoint(this.invalidPoint);
    const size = this.size();
    if (x < 0 || x > size.width || y < 0 || y > size.height) return;
    const color = getComputedStyle(this.canvas).getPropertyValue("--board-invalid").trim() || "#9a3412";
    const ring = radius + 5;
    this.context.save();
    this.context.strokeStyle = color;
    this.context.lineWidth = 2;
    this.context.beginPath();
    this.context.arc(x, y, ring, 0, Math.PI * 2);
    this.context.stroke();
    this.context.beginPath();
    this.context.moveTo(x - ring * 0.5, y - ring * 0.5);
    this.context.lineTo(x + ring * 0.5, y + ring * 0.5);
    this.context.moveTo(x + ring * 0.5, y - ring * 0.5);
    this.context.lineTo(x - ring * 0.5, y + ring * 0.5);
    this.context.stroke();
    this.context.restore();
  }

  private drawKeyboardCursor(radius: number): void {
    if (!this.keyboardCursor) return;
    const { x, y } = this.screenPoint(this.keyboardCursor);
    const size = this.size();
    if (x < 0 || x > size.width || y < 0 || y > size.height) return;
    const focusColor = getComputedStyle(this.canvas).getPropertyValue("--board-focus").trim() || "#2b2925";
    const ring = Math.max(11, radius + 5);
    this.context.save();
    this.context.beginPath();
    this.context.arc(x, y, ring, 0, Math.PI * 2);
    this.context.strokeStyle = focusColor;
    this.context.lineWidth = 2;
    this.context.setLineDash([3, 3]);
    this.context.stroke();
    this.context.restore();
  }

  private draw(): void {
    const size = this.size();
    const bounds = visibleGridBounds(this.viewport, size);

    this.context.clearRect(0, 0, size.width, size.height);
    const gridColor = getComputedStyle(this.canvas).getPropertyValue("--board-grid").trim() || "#c9bfae";
    this.context.strokeStyle = gridColor;
    this.context.lineWidth = 1;

    for (let gridX = bounds.minX; gridX <= bounds.maxX; gridX += 1) {
      const x = gameToScreen({ x: gridX, y: 0 }, this.viewport, size).x;
      this.context.beginPath();
      this.context.moveTo(x, 0);
      this.context.lineTo(x, size.height);
      this.context.stroke();
    }

    for (let gridY = bounds.minY; gridY <= bounds.maxY; gridY += 1) {
      const y = gameToScreen({ x: 0, y: gridY }, this.viewport, size).y;
      this.context.beginPath();
      this.context.moveTo(0, y);
      this.context.lineTo(size.width, y);
      this.context.stroke();
    }

    for (const capture of this.state.captures) this.drawCapture(capture);

    const radius = Math.min(10, Math.max(3.5, 6.5 * Math.sqrt(this.viewport.zoom)));
    this.drawHoverPreview(radius);
    for (const stone of this.state.stones.values()) {
      const { x, y } = this.screenPoint(stone);
      if (x < -radius || x > size.width + radius || y < -radius || y > size.height + radius) continue;
      this.context.beginPath();
      this.context.arc(x, y, radius, 0, Math.PI * 2);
      this.context.fillStyle = stone.player === "red" ? "#dc2626" : "#2563eb";
      this.context.fill();
    }

    this.drawLastMove(radius);
    this.drawInvalidPoint(radius);
    this.drawKeyboardCursor(radius);
  }
}
