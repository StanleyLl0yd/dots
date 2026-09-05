import { version } from "../package.json";
import "./about.css";
import { resolveLocale, t } from "./i18n";

const copy = t(resolveLocale());
const app = document.querySelector<HTMLDivElement>("#app");
const brand = document.querySelector<HTMLElement>(".brand");
if (!app || !brand) throw new Error("About UI initialization failed");

const button = document.createElement("button");
button.className = "about-button";
button.type = "button";
button.setAttribute("aria-label", copy.aboutLabel);
button.title = copy.aboutLabel;
button.innerHTML = '<span aria-hidden="true">i</span>';

const dialog = document.createElement("dialog");
dialog.className = "game-dialog about-dialog";
dialog.setAttribute("aria-labelledby", "about-title");
dialog.innerHTML = `
  <form method="dialog">
    <h2 id="about-title">${copy.aboutTitle}</h2>
    <p>${copy.aboutIntro}</p>
    <p class="about-meta">${copy.aboutVersion} ${version}</p>
    <a class="about-link" href="https://github.com/StanleyLl0yd/dots" target="_blank" rel="noreferrer">${copy.aboutGithub}</a>
    <p class="about-rights">${copy.aboutRights}</p>
    <div class="dialog-actions"><button value="close" autofocus>${copy.close}</button></div>
  </form>
`;

brand.append(button);
app.append(dialog);
const openAbout = (): void => {
  if (!dialog.open) dialog.showModal();
};

button.addEventListener("click", openAbout);
document.addEventListener("dots:open-about", openAbout);
