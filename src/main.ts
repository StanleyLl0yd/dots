import "./styles.css";
import AiWorker from "./game/ai-worker?worker";
import type { AiDifficulty } from "./game/ai";
import type { AiWorkerRequest, AiWorkerResponse } from "./game/ai-worker-protocol";
import { createSession, playMove, resetSession, undoMove } from "./game/session";
import type { Capture, Player, Point } from "./game/types";
import { resolveLocale, t } from "./i18n";
import { clearSavedGame, loadSession, saveSession, type StorageLike } from "./persistence";
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences, type GameMode } from "./preferences";
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
      <div class="brand">
        <h1>${copy.title}</h1>
        <p>${copy.subtitle}</p>
      </div>
      <div class="game-actions">
        <div class="settings-group">
          <label class="mode-control">
            <span>${copy.mode}</span>
            <select data-game-mode aria-label="${copy.mode}">
              <option value="local">${copy.localGame}</option>
              <option value="computer">${copy.computerGame}</option>
            </select>
          </label>
          <label class="mode-control difficulty-control" data-difficulty-control>
            <span>${copy.difficulty}</span>
            <select data-ai-difficulty aria-label="${copy.difficulty}">
              <option value="easy">${copy.difficultyEasy}</option>
              <option value="normal">${copy.difficultyNormal}</option>
              <option value="hard">${copy.difficultyHard}</option>
              <option value="expert">${copy.difficultyExpert}</option>
            </select>
          </label>
        </div>
        <div class="action-buttons">
          <button class="undo" type="button" aria-label="${copy.undo}" title="${copy.undo}"><span class="action-symbol" aria-hidden="true">↶</span><span class="action-label">${copy.undo}</span></button>
          <button class="fit-game" type="button" aria-label="${copy.fitPosition}" title="${copy.fitPosition}"><span class="action-symbol" aria-hidden="true">◎</span><span class="action-label">${copy.fitPosition}</span></button>
          <button class="help" type="button" aria-label="${copy.help}" title="${copy.help}"><span class="action-symbol" aria-hidden="true">?</span><span class="action-label">${copy.help}</span></button>
          <button class="new-game" type="button" aria-label="${copy.newGame}" title="${copy.newGame}"><span class="action-symbol" aria-hidden="true">＋</span><span class="action-label">${copy.newGame}</span></button>
        </div>
      </div>
    </header>
    <section class="scorebar" aria-live="polite" aria-atomic="true">
      <span class="player red"><span data-red-label>${copy.red}</span>: <strong data-score-red>0</strong></span>
      <span class="turn-stack"><span data-turn></span><small data-move-count></small></span>
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
      <div class="game-feedback" data-game-feedback role="status" hidden></div>
      <div class="notice" data-hint>${copy.hint}</div>
      <div class="sr-only" data-a11y-status aria-live="polite" aria-atomic="true"></div>
    </section>
  </main>
  <dialog class="game-dialog" data-help-dialog aria-labelledby="help-title">
    <form method="dialog">
      <h2 id="help-title">${copy.helpTitle}</h2>
      <p>${copy.helpIntro}</p>
      <p>${copy.helpNavigation}</p>
      <p>${copy.helpKeyboard}</p>
      <div class="dialog-actions"><button value="close" autofocus>${copy.close}</button></div>
    </form>
  </dialog>
  <dialog class="game-dialog" data-new-game-dialog aria-labelledby="new-game-title">
    <form method="dialog">
      <h2 id="new-game-title">${copy.newGameTitle}</h2>
      <p>${copy.resetConfirm}</p>
      <div class="dialog-actions">
        <button value="cancel" autofocus>${copy.cancel}</button>
        <button class="danger" value="confirm">${copy.newGame}</button>
      </div>
    </form>
  </dialog>
`;

const canvas = app.querySelector<HTMLCanvasElement>("canvas");
const turn = app.querySelector<HTMLElement>("[data-turn]");
const moveCount = app.querySelector<HTMLElement>("[data-move-count]");
const scoreRed = app.querySelector<HTMLElement>("[data-score-red]");
const scoreBlue = app.querySelector<HTMLElement>("[data-score-blue]");
const redLabel = app.querySelector<HTMLElement>("[data-red-label]");
const blueLabel = app.querySelector<HTMLElement>("[data-blue-label]");
const modeSelect = app.querySelector<HTMLSelectElement>("[data-game-mode]");
const difficultyControl = app.querySelector<HTMLElement>("[data-difficulty-control]");
const difficultySelect = app.querySelector<HTMLSelectElement>("[data-ai-difficulty]");
const undo = app.querySelector<HTMLButtonElement>(".undo");
const fitGame = app.querySelector<HTMLButtonElement>(".fit-game");
const help = app.querySelector<HTMLButtonElement>(".help");
const newGame = app.querySelector<HTMLButtonElement>(".new-game");
const appStatus = app.querySelector<HTMLElement>("[data-app-status]");
const gameFeedback = app.querySelector<HTMLElement>("[data-game-feedback]");
const hint = app.querySelector<HTMLElement>("[data-hint]");
const updatePrompt = app.querySelector<HTMLElement>("[data-update-prompt]");
const updateNow = app.querySelector<HTMLButtonElement>("[data-update-now]");
const a11yStatus = app.querySelector<HTMLElement>("[data-a11y-status]");
const helpDialog = app.querySelector<HTMLDialogElement>("[data-help-dialog]");
const newGameDialog = app.querySelector<HTMLDialogElement>("[data-new-game-dialog]");
if (
  !canvas ||
  !turn ||
  !moveCount ||
  !scoreRed ||
  !scoreBlue ||
  !redLabel ||
  !blueLabel ||
  !modeSelect ||
  !difficultyControl ||
  !difficultySelect ||
  !undo ||
  !fitGame ||
  !help ||
  !newGame ||
  !appStatus ||
  !gameFeedback ||
  !hint ||
  !updatePrompt ||
  !updateNow ||
  !a11yStatus ||
  !helpDialog ||
  !newGameDialog
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
const initialPreferences = storage ? loadPreferences(storage) : DEFAULT_PREFERENCES;
let gameMode: GameMode = initialPreferences.gameMode;
let aiDifficulty: AiDifficulty = initialPreferences.aiDifficulty;
modeSelect.value = gameMode;
difficultySelect.value = aiDifficulty;
const initialViewport = storage ? loadViewport(storage) : undefined;
let hintDismissed = session.history.length > 0;
let statusTimer: number | undefined;
let feedbackTimer: number | undefined;
let viewportSaveTimer: number | undefined;
let pendingViewport: Viewport | undefined;
let computerTimer: number | undefined;
let computerWorker: Worker | undefined;
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

const clearGameFeedback = (): void => {
  if (feedbackTimer !== undefined) window.clearTimeout(feedbackTimer);
  feedbackTimer = undefined;
  gameFeedback.hidden = true;
  gameFeedback.textContent = "";
};

const showGameFeedback = (message: string, duration = 2200): void => {
  clearGameFeedback();
  gameFeedback.textContent = message;
  gameFeedback.hidden = false;
  feedbackTimer = window.setTimeout(clearGameFeedback, duration);
};

const dismissHint = (): void => {
  if (hintDismissed) return;
  hintDismissed = true;
  hint.hidden = true;
};

hint.hidden = hintDismissed;

const persist = (): void => {
  if (!storage) return;
  if (session.history.length === 0) clearSavedGame(storage);
  else saveSession(storage, session);
};

const persistPreferences = (): void => {
  if (storage) savePreferences(storage, { gameMode, aiDifficulty });
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

const difficultyName = (difficulty: AiDifficulty): string => {
  if (difficulty === "easy") return copy.difficultyEasy;
  if (difficulty === "hard") return copy.difficultyHard;
  if (difficulty === "expert") return copy.difficultyExpert;
  return copy.difficultyNormal;
};

const lastMove = (): Point | undefined => session.history.at(-1)?.placed;

const renderStatus = (): void => {
  const state = session.state;
  const current = playerName(state.currentPlayer);
  turn.textContent = computerThinking && isComputerTurn()
    ? `${copy.turn}: ${current} · ${copy.computerThinking}`
    : `${copy.turn}: ${current}`;
  moveCount.textContent = `${copy.moveNumber}${session.history.length}`;
  redLabel.textContent = gameMode === "computer" ? copy.youRed : copy.red;
  blueLabel.textContent = gameMode === "computer" ? copy.computerBlue : copy.blue;
  scoreRed.textContent = String(state.score.red);
  scoreBlue.textContent = String(state.score.blue);
  difficultyControl.hidden = gameMode !== "computer";
  undo.disabled = session.history.length === 0;
  fitGame.disabled = state.stones.size === 0;
  difficultySelect.disabled = gameMode !== "computer";
};

const pointMessage = (prefix: string, point: Point): string => `${prefix}: ${point.x}, ${point.y}`;
const captureIdentity = (capture: Capture): string => {
  const boundary = capture.boundary.map((point) => `${point.x},${point.y}`).join(";");
  const captured = capture.captured
    .map((stone) => `${stone.player}:${stone.x},${stone.y}`)
    .sort()
    .join(";");
  return `${capture.owner}|${boundary}|${captured}`;
};
const isPoint = (value: unknown): value is Point => {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<Point>;
  return Number.isSafeInteger(point.x) && Number.isSafeInteger(point.y);
};

let board: CanvasBoard;

const cancelComputerMove = (): void => {
  computerGeneration += 1;
  if (computerTimer !== undefined) window.clearTimeout(computerTimer);
  computerTimer = undefined;
  if (computerWorker) computerWorker.terminate();
  computerWorker = undefined;
  computerThinking = false;
};

const fallBackToLocalMode = (): void => {
  cancelComputerMove();
  gameMode = "local";
  modeSelect.value = gameMode;
  persistPreferences();
  renderStatus();
  showStatus(copy.computerFallback, 5000);
  announce(copy.computerFallback);
};

const applyMove = (
  next: typeof session,
  point: Point,
  computerMove: boolean
): void => {
  const previousState = session.state;
  const previousCaptureKeys = new Set(previousState.captures.map(captureIdentity));
  const createdCaptures = next.state.captures.filter((capture) => !previousCaptureKeys.has(captureIdentity(capture)));

  session = next;
  computerThinking = false;
  persist();
  board.setState(session.state, lastMove());
  renderStatus();
  dismissHint();

  if (createdCaptures.length > 0) {
    board.flashCaptures(createdCaptures);
    const owner = createdCaptures[0].owner;
    const scoreGain = next.state.score[owner] - previousState.score[owner];
    const capturedCount = createdCaptures
      .filter((capture) => capture.owner === owner)
      .reduce((sum, capture) => sum + capture.captured.length, 0);
    const amount = Math.max(1, scoreGain, capturedCount);
    const message = `${copy.capture}: ${playerName(owner)} +${amount}`;
    showGameFeedback(message);
    announce(`${pointMessage(computerMove ? copy.computerPlaced : copy.placed, point)}. ${message}`);
  } else {
    announce(pointMessage(computerMove ? copy.computerPlaced : copy.placed, point));
  }
};

const scheduleComputerMove = (): void => {
  if (document.visibilityState === "hidden" || !isComputerTurn() || computerThinking) return;
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

    let worker: Worker;
    try {
      worker = new AiWorker();
    } catch {
      fallBackToLocalMode();
      return;
    }
    computerWorker = worker;

    const finishWorker = (): void => {
      if (computerWorker === worker) computerWorker = undefined;
      worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<AiWorkerResponse>) => {
      finishWorker();
      if (generation !== computerGeneration || !isComputerTurn()) {
        computerThinking = false;
        renderStatus();
        return;
      }
      const response = event.data;
      if (response.requestId !== generation || response.error || !isPoint(response.move)) {
        fallBackToLocalMode();
        return;
      }

      const next = playMove(session, response.move);
      if (next === session) {
        fallBackToLocalMode();
        return;
      }

      applyMove(next, response.move, true);
    };

    worker.onerror = () => {
      finishWorker();
      if (generation === computerGeneration && isComputerTurn()) fallBackToLocalMode();
    };

    const request: AiWorkerRequest = {
      requestId: generation,
      state: session.state,
      options: {
        player: COMPUTER_PLAYER,
        focus: session.history.at(-1)?.placed,
        difficulty: aiDifficulty
      }
    };

    try {
      worker.postMessage(request);
    } catch {
      finishWorker();
      fallBackToLocalMode();
    }
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
      board.showInvalidPoint(point);
      announce(pointMessage(copy.unavailable, point));
      return false;
    }
    applyMove(next, point, false);
    scheduleComputerMove();
    return true;
  }
});
board.setState(session.state, lastMove());

undo.addEventListener("click", () => {
  cancelComputerMove();
  let previous = undoMove(session);
  if (previous === session) {
    renderStatus();
    return;
  }

  if (gameMode === "computer" && previous.state.currentPlayer === COMPUTER_PLAYER && previous.history.length > 0) {
    previous = undoMove(previous);
  }

  session = previous;
  persist();
  board.setState(session.state, lastMove());
  clearGameFeedback();
  renderStatus();
  scheduleComputerMove();
});

const resetGame = (): void => {
  cancelComputerMove();
  session = resetSession();
  persist();
  board.setState(session.state);
  board.resetViewport();
  clearGameFeedback();
  renderStatus();
};

newGame.addEventListener("click", () => {
  if (session.history.length === 0) {
    resetGame();
    return;
  }
  cancelComputerMove();
  renderStatus();
  newGameDialog.returnValue = "";
  newGameDialog.showModal();
});

newGameDialog.addEventListener("close", () => {
  if (newGameDialog.returnValue === "confirm") resetGame();
  else {
    renderStatus();
    scheduleComputerMove();
  }
});

fitGame.addEventListener("click", () => {
  if (board.fitPosition()) announce(copy.fitPosition);
});

help.addEventListener("click", () => {
  if (!helpDialog.open) helpDialog.showModal();
});

modeSelect.addEventListener("change", () => {
  cancelComputerMove();
  gameMode = modeSelect.value === "computer" ? "computer" : "local";
  persistPreferences();
  renderStatus();
  announce(gameMode === "computer" ? copy.modeComputer : copy.modeLocal);
  scheduleComputerMove();
});

difficultySelect.addEventListener("change", () => {
  cancelComputerMove();
  const value = difficultySelect.value;
  aiDifficulty = value === "easy" || value === "hard" || value === "expert" ? value : "normal";
  difficultySelect.value = aiDifficulty;
  persistPreferences();
  renderStatus();
  announce(`${copy.difficultyChanged}: ${difficultyName(aiDifficulty)}`);
  scheduleComputerMove();
});

window.addEventListener("offline", () => showStatus(copy.offline));
window.addEventListener("online", () => showStatus(copy.online, 2500));
window.addEventListener("pagehide", () => {
  cancelComputerMove();
  flushViewport();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    cancelComputerMove();
    renderStatus();
  } else {
    scheduleComputerMove();
  }
});
window.addEventListener("pageshow", scheduleComputerMove);
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
