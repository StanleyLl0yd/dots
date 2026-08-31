import "./styles.css";
import { createSession, playMove, resetSession, undoMove } from "./game/session";
import type { Point } from "./game/types";
import { resolveLocale, t } from "./i18n";
import { clearSavedGame, loadSession, saveSession, type StorageLike } from "./persistence";
import { setupPwaLifecycle } from "./pwa";
import { CanvasBoard } from "./ui/canvas-board";
import type { Viewport } from "./ui/viewport";
import { loadViewport, saveViewport } from "./viewport-persistence";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root is missing");

const locale = resolveLocale();
const copy = t(locale);
document.documentElement.lang = locale;
document.title = copy.title;

app.innerHTML = `
  <a class="skip-link" href="#game-board">${copy.boardLabel}</a>
  <main class="shell">
    <header class="topbar">
      <div>
        <h1>${copy.title}</h1>
        <p>${copy.subtitle}</p>
      </div>
      <div class="game-actions">
        <button class="undo" type="button">${copy.undo}</button>
        <button class="new-game" type="button">${copy.newGame}</button>
      </div>
    </header>
    <section class="scorebar" aria-live="polite" aria-atomic="true">
      <span class="player red">${copy.red}: <strong data-score-red>0</strong></span>
      <span data-turn></span>
      <span class="player blue">${copy.blue}: <strong data-score-blue>0</strong></span>
    </section>
    <section class="board-wrap">
      <p id="board-instructions" class="sr-only">${copy.boardInstructions}</p>
      <canvas
        id="game-board"
        class="board"
        tabindex="0"
        role="application"
        aria-label="${copy.boardLabel}"
        aria-describedby="board-instructions"
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Enter Space + -"
      ></canvas>
      <div class="system-stack" aria-live="polite">
        <div class="status-toast" data-app-status hidden></div>
        <div class="update-prompt" data-update-prompt hidden>
          <span>${copy.updateAvailable}</span>
          <button type="button" data-update-now>${copy.updateNow}</button>
        </div>
      </div>
      <div class="notice">${copy.hint}</div>
      <div class="sr-only" data-a11y-status aria-live="polite" aria-atomic="true"></div>
    </section>
  </main>
`;

const canvas = app.querySelector<HTMLCanvasElement>("canvas");
const turn = app.querySelector<HTMLElement>("[data-turn]");
const scoreRed = app.querySelector<HTMLElement>("[data-score-red]");
const scoreBlue = app.querySelector<HTMLElement>("[data-score-blue]");
const undo = app.querySelector<HTMLButtonElement>(".undo");
const newGame = app.querySelector<HTMLButtonElement>(".new-game");
const appStatus = app.querySelector<HTMLElement>("[data-app-status]");
const updatePrompt = app.querySelector<HTMLElement>("[data-update-prompt]");
const updateNow = app.querySelector<HTMLButtonElement>("[data-update-now]");
const a11yStatus = app.querySelector<HTMLElement>("[data-a11y-status]");
if (!canvas || !turn || !scoreRed || !scoreBlue || !undo || !newGame || !appStatus || !updatePrompt || !updateNow || !a11yStatus) {
  throw new Error("UI initialization failed");
}

let storage: StorageLike | undefined;
try {
  storage = window.localStorage;
} catch {
  storage = undefined;
}

let session = storage ? loadSession(storage) ?? createSession() : createSession();
const initialViewport = storage ? loadViewport(storage) : undefined;
let statusTimer: number | undefined;
let viewportSaveTimer: number | undefined;
let pendingViewport: Viewport | undefined;

const announce = (message: string): void => {
  a11yStatus.textContent = "";
  window.requestAnimationFrame(() => {
    a11yStatus.textContent = message;
  });
};

const showStatus = (message: string, duration = 0): void => {
  if (statusTimer !== undefined) window.clearTimeout(statusTimer);
  appStatus.textContent = message;
  appStatus.hidden = false;
  if (duration <= 0) return;
  statusTimer = window.setTimeout(() => {
    appStatus.hidden = true;
    statusTimer = undefined;
  }, duration);
};

const persist = (): void => {
  if (!storage) return;
  if (session.history.length === 0) clearSavedGame(storage);
  else saveSession(storage, session);
};

const flushViewport = (): void => {
  if (viewportSaveTimer !== undefined) window.clearTimeout(viewportSaveTimer);
  viewportSaveTimer = undefined;
  if (!storage || !pendingViewport) return;
  saveViewport(storage, pendingViewport);
  pendingViewport = undefined;
};

const persistViewport = (viewport: Viewport): void => {
  if (!storage) return;
  pendingViewport = { ...viewport };
  if (viewportSaveTimer !== undefined) window.clearTimeout(viewportSaveTimer);
  viewportSaveTimer = window.setTimeout(flushViewport, 120);
};

const renderStatus = (): void => {
  const state = session.state;
  turn.textContent = `${copy.turn}: ${state.currentPlayer === "red" ? copy.red : copy.blue}`;
  scoreRed.textContent = String(state.score.red);
  scoreBlue.textContent = String(state.score.blue);
  undo.disabled = session.history.length === 0;
};

const pointMessage = (prefix: string, point: Point): string => `${prefix}: ${point.x}, ${point.y}`;

const board = new CanvasBoard(canvas, session.state, {
  initialViewport,
  onViewportChange: persistViewport,
  onKeyboardCursorChange: (point) => announce(pointMessage(copy.cursor, point)),
  onPoint: (point) => {
    const next = playMove(session, point);
    if (next === session) {
      announce(pointMessage(copy.unavailable, point));
      return false;
    }
    session = next;
    persist();
    board.setState(session.state);
    renderStatus();
    announce(pointMessage(copy.placed, point));
    return true;
  }
});

undo.addEventListener("click", () => {
  const previous = undoMove(session);
  if (previous === session) return;
  session = previous;
  persist();
  board.setState(session.state);
  renderStatus();
});

newGame.addEventListener("click", () => {
  if (session.history.length > 0 && !window.confirm(copy.resetConfirm)) return;
  session = resetSession();
  persist();
  board.setState(session.state);
  board.resetViewport();
  renderStatus();
});

window.addEventListener("offline", () => showStatus(copy.offline));
window.addEventListener("online", () => showStatus(copy.online, 2500));
window.addEventListener("pagehide", flushViewport);
if (!navigator.onLine) showStatus(copy.offline);

const pwa = setupPwaLifecycle({
  onNeedRefresh: () => {
    updatePrompt.hidden = false;
  },
  onOfflineReady: () => {
    if (navigator.onLine) showStatus(copy.offlineReady, 4000);
  },
  onError: () => showStatus(copy.pwaError, 5000)
});

updateNow.addEventListener("click", () => {
  updateNow.disabled = true;
  void pwa.applyUpdate();
});

renderStatus();
