import "./styles.css";
import { createGameState, placeStone } from "./game/board";
import { resolveLocale, t } from "./i18n";
import { CanvasBoard } from "./ui/canvas-board";

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
      <button class="new-game" type="button">${copy.newGame}</button>
    </header>
    <section class="scorebar" aria-live="polite">
      <span class="player red">${copy.red}: <strong data-score-red>0</strong></span>
      <span data-turn></span>
      <span class="player blue">${copy.blue}: <strong data-score-blue>0</strong></span>
    </section>
    <section class="board-wrap">
      <canvas class="board" aria-label="${copy.title}"></canvas>
      <div class="notice">${copy.scaffold}</div>
    </section>
  </main>
`;

const canvas = app.querySelector<HTMLCanvasElement>("canvas");
const turn = app.querySelector<HTMLElement>("[data-turn]");
const scoreRed = app.querySelector<HTMLElement>("[data-score-red]");
const scoreBlue = app.querySelector<HTMLElement>("[data-score-blue]");
const newGame = app.querySelector<HTMLButtonElement>(".new-game");
if (!canvas || !turn || !scoreRed || !scoreBlue || !newGame) throw new Error("UI initialization failed");

let state = createGameState();

const renderStatus = (): void => {
  turn.textContent = `${copy.turn}: ${state.currentPlayer === "red" ? copy.red : copy.blue}`;
  scoreRed.textContent = String(state.score.red);
  scoreBlue.textContent = String(state.score.blue);
};

const board = new CanvasBoard(canvas, state, {
  onPoint: (point) => {
    state = placeStone(state, point);
    board.setState(state);
    renderStatus();
  }
});

newGame.addEventListener("click", () => {
  state = createGameState();
  board.setState(state);
  renderStatus();
});

renderStatus();
