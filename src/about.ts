import { version } from "../package.json";
import "./about.css";
import { resolveLocale } from "./i18n";

const messages = {
  ru: {
    label: "О приложении",
    title: "О приложении",
    intro: "«Точки» — минималистичная цифровая версия классической игры. Окружайте точки соперника, захватывайте область и играйте вдвоём или против компьютера.",
    version: "Версия",
    github: "Проект на GitHub",
    rights: "© 2026 Stanley Lloyd. Все права защищены.",
    close: "Закрыть"
  },
  en: {
    label: "About",
    title: "About",
    intro: "Dots is a minimalist digital version of the classic game. Surround opponent dots, capture territory, and play locally or against the computer.",
    version: "Version",
    github: "Project on GitHub",
    rights: "© 2026 Stanley Lloyd. All rights reserved.",
    close: "Close"
  }
} as const;

const copy = messages[resolveLocale()];
const app = document.querySelector<HTMLDivElement>("#app");
const brand = document.querySelector<HTMLElement>(".brand");
if (!app || !brand) throw new Error("About UI initialization failed");

const button = document.createElement("button");
button.className = "about-button";
button.type = "button";
button.setAttribute("aria-label", copy.label);
button.title = copy.label;
button.innerHTML = '<span aria-hidden="true">i</span>';

const dialog = document.createElement("dialog");
dialog.className = "game-dialog about-dialog";
dialog.setAttribute("aria-labelledby", "about-title");
dialog.innerHTML = `
  <form method="dialog">
    <h2 id="about-title">${copy.title}</h2>
    <p>${copy.intro}</p>
    <p class="about-meta">${copy.version} ${version}</p>
    <a class="about-link" href="https://github.com/StanleyLl0yd/dots" target="_blank" rel="noreferrer">${copy.github}</a>
    <p class="about-rights">${copy.rights}</p>
    <div class="dialog-actions"><button value="close" autofocus>${copy.close}</button></div>
  </form>
`;

brand.append(button);
app.append(dialog);
button.addEventListener("click", () => {
  if (!dialog.open) dialog.showModal();
});
