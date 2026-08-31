import "./styles.css";
import { createSession, playMove, resetSession, undoMove } from "./game/session";
import { resolveLocale, t } from "./i18n";
import { clearSavedGame, loadSession, saveSession, type StorageLike } from "./persistence";
import { CanvasBoard } from "./ui/canvas-board";
import { loadViewport, saveViewport } from "./viewport-persistence";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root is missing");

const locale = resolveLocale();
const copy = t(locale);
document.documentElement.lang = locale;
document.title = copy.title;

app.innerHTML = `
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
    <section class="scorebar" aria-live="polite">
      <span class="player red">${copy.red}: <strong data-score-red>0</strong></span>
      <span data-turn></span>
      <span class="player blue">${copy.blue}: <strong data-score-blue>0</strong></span>
    </section>
    <section class="board-wrap">
      <canvas class="board" aria-label="${copy.title}"></canvas>
      <div class="notice">${copy.hint}</div>
    </section>
  </main>
`;

const canvas = app.querySelector<HTMLCanvasElement>("canvas");
const turn = app.querySelector<HTMLElement>("[data-turn]");
const scoreRed = app.querySelector<HTMLElement>("[data-score-red]");
const scoreBlue = app.querySelector<HTMLElement>("[data-score-blue]");
const undo = app.querySelector<HTMLButtonElement>(".undo");
const newGame = app.querySelector<HTMLButtonElement>(".new-game");
if (!canvas || !turn || !scoreRed || !scoreBlue || !undo || !newGame) throw new Error("UI initialization failed");

let storage: StorageLike | undefined;
try {
  storage = window.localStorage;
} catch {
  storage = undefined;
}

let session = storage ? loadSession(storage) ?? createSession() : createSession();
const initialViewport = storage ? loadViewport(storage) : undefined;

const persist = (): void => {
  if (!storage) return;
  if (session.history.length === 0) clearSavedGame(storage);
  else saveSession(storage, session);
};

const renderStatus = (): void => {
  const state = session.state;
  turn.textContent = `${copy.turn}: ${state.currentPlayer === "red" ? copy.red : copy.blue}`;
  scoreRed.textContent = String(state.score.red);
  scoreBlue.textContent = String(state.score.blue);
  undo.disabled = session.history.length === 0;
};

const board = new CanvasBoard(canvas, session.state, {
  initialViewport,
  onViewportChange: (viewport) => {
    if (storage) saveViewport(storage, viewport);
  },
  onPoint: (point) => {
    const next = playMove(session, point);
    if (next === session) return;
    session = next;
    persist();
    board.setState(session.state);
    renderStatus();
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

renderStatus();
