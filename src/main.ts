import "./styles.css";
import { chooseAiMove } from "./game/ai";
import { createSession, playMove, resetSession, undoMove } from "./game/session";
import type { Player, Point } from "./game/types";
import { resolveLocale, t } from "./i18n";
import { clearSavedGame, loadSession, saveSession, type StorageLike } from "./persistence";
import { loadGameMode, saveGameMode, type GameMode } from "./preferences";
import { setupPwaLifecycle } from "./pwa";
import { CanvasBoard } from "./ui/canvas-board";
import type { Viewport } from "./ui/viewport";
import { loadViewport, saveViewport } from "./viewport-persistence";

const COMPUTER_PLAYER: Player = "blue";
const COMPUTER_DELAY_MS = 120;

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
        <label class="mode-control">
          <span>${copy.mode}</span>
          <select data-game-mode aria-label="${copy.mode}">
            <option value="local">${copy.localGame}</option>
            <option value="computer">${copy.computerGame}</option>
          </select>
        </label>
        <button class="undo" type="button">${copy.undo}</button>
        <button class="new-game" type="button">${copy.newGame}</button>
      </div>
    </header>
    <section class="scorebar" aria-live="polite" aria-atomic="true">
      <span class="player red"><span data-red-label>${copy.red}</span>: <strong data-score-red>0</strong></span>
      <span data-turn></span>
      <span class="player blue"><span data-blue-label>${copy.blue}</span>: <strong data-score-blue>0</strong></span>
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
const redLabel = app.querySelector<HTMLElement>("[data-red-label]");
const blueLabel = app.querySelector<HTMLElement>("[data-blue-label]");
const modeSelect = app.querySelector<HTMLSelectElement>("[data-game-mode]");
const undo = app.querySelector<HTMLButtonElement>(".undo");
const newGame = app.querySelector<HTMLButtonElement>(".new-game");
const appStatus = app.querySelector<HTMLElement>("[data-app-status]");
const updatePrompt = app.querySelector<HTMLElement>("[data-update-prompt]");
const updateNow = app.querySelector<HTMLButtonElement>("[data-update-now]");
const a11yStatus = app.querySelector<HTMLElement>("[data-a11y-status]");
if (
  !canvas ||
  !turn ||
  !scoreRed ||
  !scoreBlue ||
  !redLabel ||
  !blueLabel ||
  !modeSelect ||
  !undo ||
  !newGame ||
  !appStatus ||
  !updatePrompt ||
  !updateNow ||
  !a11yStatus
) {
  throw new Error("UI initialization failed");
}

let storage: StorageLike | undefined;
try {
  storage = window.localStorage;
} catch {
  storage = undefined;
}

let session = storage ? loadSession(storage) ?? createSession() : createSession();
let gameMode: GameMode = storage ? loadGameMode(storage) : "local";
modeSelect.value = gameMode;
const initialViewport = storage ? loadViewport(storage) : undefined;
let statusTimer: number | undefined;
let viewportSaveTimer: number | undefined;
let pendingViewport: Viewport | undefined;
let computerTimer: number | undefined;
let computerGeneration = 0;
let computerThinking = false;

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

const isComputerTurn = (): boolean => gameMode === "computer" && session.state.currentPlayer === COMPUTER_PLAYER;

const playerName = (player: Player): string => {
  if (gameMode === "computer") return player === "red" ? copy.youRed : copy.computerBlue;
  return player === "red" ? copy.red : copy.blue;
};

const renderStatus = (): void => {
  const state = session.state;
  const current = playerName(state.currentPlayer);
  turn.textContent = computerThinking && isComputerTurn()
    ? `${copy.turn}: ${current} · ${copy.computerThinking}`
    : `${copy.turn}: ${current}`;
  redLabel.textContent = gameMode === "computer" ? copy.youRed : copy.red;
  blueLabel.textContent = gameMode === "computer" ? copy.computerBlue : copy.blue;
  scoreRed.textContent = String(state.score.red);
  scoreBlue.textContent = String(state.score.blue);
  undo.disabled = computerThinking || session.history.length === 0;
  newGame.disabled = computerThinking;
  modeSelect.disabled = computerThinking;
};

const pointMessage = (prefix: string, point: Point): string => `${prefix}: ${point.x}, ${point.y}`;

let board: CanvasBoard;

const cancelComputerMove = (): void => {
  computerGeneration += 1;
  if (computerTimer !== undefined) window.clearTimeout(computerTimer);
  computerTimer = undefined;
  computerThinking = false;
};

const fallBackToLocalMode = (): void => {
  gameMode = "local";
  modeSelect.value = gameMode;
  if (storage) saveGameMode(storage, gameMode);
  computerThinking = false;
  renderStatus();
  showStatus(copy.computerFallback, 5000);
  announce(copy.computerFallback);
};

const scheduleComputerMove = (): void => {
  if (!isComputerTurn() || computerThinking) return;
  const generation = ++computerGeneration;
  computerThinking = true;
  renderStatus();
  announce(copy.computerThinking);

  computerTimer = window.setTimeout(() => {
    computerTimer = undefined;
    if (generation !== computerGeneration || !isComputerTurn()) {
      computerThinking = false;
      renderStatus();
      return;
    }

    const focus = session.history.at(-1)?.placed;
    const move = chooseAiMove(session.state, { player: COMPUTER_PLAYER, focus });
    if (!move) {
      fallBackToLocalMode();
      return;
    }

    const next = playMove(session, move);
    if (next === session) {
      fallBackToLocalMode();
      return;
    }

    session = next;
    computerThinking = false;
    persist();
    board.setState(session.state);
    renderStatus();
    announce(pointMessage(copy.computerPlaced, move));
  }, COMPUTER_DELAY_MS);
};

board = new CanvasBoard(canvas, session.state, {
  initialViewport,
  onViewportChange: persistViewport,
  onKeyboardCursorChange: (point) => announce(pointMessage(copy.cursor, point)),
  onPoint: (point) => {
    if (isComputerTurn()) {
      announce(copy.waitComputer);
      scheduleComputerMove();
      return false;
    }

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
    scheduleComputerMove();
    return true;
  }
});

undo.addEventListener("click", () => {
  if (computerThinking) return;
  let previous = undoMove(session);
  if (previous === session) return;

  if (gameMode === "computer" && previous.state.currentPlayer === COMPUTER_PLAYER && previous.history.length > 0) {
    previous = undoMove(previous);
  }

  session = previous;
  persist();
  board.setState(session.state);
  renderStatus();
});

newGame.addEventListener("click", () => {
  if (computerThinking) return;
  if (session.history.length > 0 && !window.confirm(copy.resetConfirm)) return;
  cancelComputerMove();
  session = resetSession();
  persist();
  board.setState(session.state);
  board.resetViewport();
  renderStatus();
});

modeSelect.addEventListener("change", () => {
  if (computerThinking) return;
  gameMode = modeSelect.value === "computer" ? "computer" : "local";
  if (storage) saveGameMode(storage, gameMode);
  renderStatus();
  announce(gameMode === "computer" ? copy.modeComputer : copy.modeLocal);
  scheduleComputerMove();
});

window.addEventListener("offline", () => showStatus(copy.offline));
window.addEventListener("online", () => showStatus(copy.online, 2500));
window.addEventListener("pagehide", () => {
  cancelComputerMove();
  flushViewport();
});
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
scheduleComputerMove();
