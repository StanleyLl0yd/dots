import "./start-menu.css";
import type { GameMode } from "./preferences";

export interface StartMenuCopy {
  title: string;
  subtitle: string;
  continueGame: string;
  newGame: string;
  computerGame: string;
  localGame: string;
  help: string;
  aboutLabel: string;
  exit: string;
}

interface StartMenuHandlers {
  onContinue: () => void;
  onNewGame: (mode: GameMode) => void;
  onHelp: () => void;
  onAbout: () => void;
  onExit: () => void;
}

interface StartMenuOptions {
  root: HTMLElement;
  copy: StartMenuCopy;
  canContinue: boolean;
  showExit: boolean;
  handlers: StartMenuHandlers;
}

export interface StartMenuController {
  show: () => void;
  hide: () => void;
  setCanContinue: (value: boolean) => void;
}

const requiredElement = <T extends Element>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error("Start menu initialization failed");
  return element;
};

export const createStartMenu = ({
  root,
  copy,
  canContinue: initialCanContinue,
  showExit,
  handlers
}: StartMenuOptions): StartMenuController => {
  const menu = document.createElement("section");
  menu.className = "start-menu";
  menu.hidden = true;
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-modal", "true");
  menu.setAttribute("aria-labelledby", "start-menu-title");
  menu.innerHTML = `
    <div class="start-menu-decoration" aria-hidden="true">
      <span class="start-menu-dot red-dot" style="--dot-x:-196px;--dot-y:-168px"></span>
      <span class="start-menu-dot blue-dot" style="--dot-x:196px;--dot-y:-140px"></span>
      <span class="start-menu-dot blue-dot" style="--dot-x:-224px;--dot-y:84px"></span>
      <span class="start-menu-dot red-dot" style="--dot-x:224px;--dot-y:112px"></span>
      <span class="start-menu-dot red-dot" style="--dot-x:-140px;--dot-y:196px"></span>
      <span class="start-menu-dot blue-dot" style="--dot-x:168px;--dot-y:196px"></span>
    </div>
    <div class="start-menu-panel">
      <div class="start-menu-mark" aria-hidden="true">
        <span class="red-dot"></span>
        <span class="blue-dot"></span>
      </div>
      <h1 id="start-menu-title">${copy.title}</h1>
      <p class="start-menu-tagline">${copy.subtitle}</p>
      <div class="start-menu-actions">
        <button class="start-menu-button start-menu-primary" type="button" data-start-continue>${copy.continueGame}</button>
        <p class="start-menu-section-label">${copy.newGame}</p>
        <button class="start-menu-button" type="button" data-start-computer>${copy.computerGame}</button>
        <button class="start-menu-button" type="button" data-start-local>${copy.localGame}</button>
        <div class="start-menu-secondary">
          <button class="start-menu-text-button" type="button" data-start-help>${copy.help}</button>
          <button class="start-menu-text-button" type="button" data-start-about>${copy.aboutLabel}</button>
        </div>
        <button class="start-menu-exit" type="button" data-start-exit>${copy.exit}</button>
      </div>
    </div>
  `;
  root.append(menu);

  const continueButton = requiredElement<HTMLButtonElement>(menu, "[data-start-continue]");
  const computerButton = requiredElement<HTMLButtonElement>(menu, "[data-start-computer]");
  const localButton = requiredElement<HTMLButtonElement>(menu, "[data-start-local]");
  const helpButton = requiredElement<HTMLButtonElement>(menu, "[data-start-help]");
  const aboutButton = requiredElement<HTMLButtonElement>(menu, "[data-start-about]");
  const exitButton = requiredElement<HTMLButtonElement>(menu, "[data-start-exit]");

  exitButton.hidden = !showExit;

  const setCanContinue = (canContinue: boolean): void => {
    continueButton.hidden = !canContinue;
    continueButton.classList.toggle("start-menu-primary", canContinue);
    computerButton.classList.toggle("start-menu-primary", !canContinue);
  };

  continueButton.addEventListener("click", handlers.onContinue);
  computerButton.addEventListener("click", () => handlers.onNewGame("computer"));
  localButton.addEventListener("click", () => handlers.onNewGame("local"));
  helpButton.addEventListener("click", handlers.onHelp);
  aboutButton.addEventListener("click", handlers.onAbout);
  exitButton.addEventListener("click", handlers.onExit);

  setCanContinue(initialCanContinue);

  return {
    show: () => {
      menu.hidden = false;
      window.requestAnimationFrame(() => {
        (continueButton.hidden ? computerButton : continueButton).focus();
      });
    },
    hide: () => {
      menu.hidden = true;
    },
    setCanContinue
  };
};
