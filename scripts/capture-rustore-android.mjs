import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDir = resolve(process.argv[2] ?? "store/rustore/generated");
const cdpUrl = process.env.DOTS_CDP_URL ?? "http://127.0.0.1:9222";

const captureMoves = [
  { x: 0, y: -1 },
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 5, y: 5 },
  { x: 0, y: 1 },
  { x: 6, y: 5 },
  { x: -1, y: 0 }
];

const computerMoves = [
  { x: 0, y: 0 },
  { x: 3, y: 3 },
  { x: 1, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 1 },
  { x: 5, y: 3 }
];

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const adb = (...args) => execFileSync("adb", args, { encoding: "utf8" }).trim();

class Cdp {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.opened = new Promise((resolveOpen, rejectOpen) => {
      this.socket = new WebSocket(url);
      this.socket.addEventListener("open", resolveOpen, { once: true });
      this.socket.addEventListener("error", rejectOpen, { once: true });
      this.socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (!message.id) return;
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      });
    });
  }

  async send(method, params = {}) {
    await this.opened;
    const id = this.nextId++;
    const result = new Promise((resolveResult, rejectResult) => {
      this.pending.set(id, { resolve: resolveResult, reject: rejectResult });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return result;
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text ?? "CDP evaluation failed");
    }
    return result.result?.value;
  }

  close() {
    this.socket.close();
  }
}

const connect = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const targets = await fetch(`${cdpUrl}/json`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return new Cdp(page.webSocketDebuggerUrl);
    } catch {}
    await sleep(500);
  }
  throw new Error("Android WebView DevTools target was not found");
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const waitFor = async (cdp, expression, message) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await cdp.evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error(message);
};

const seed = async (cdp, moves, preferences) => {
  await cdp.evaluate(`
    localStorage.setItem("dots.game", ${JSON.stringify(JSON.stringify({ version: 1, moves }))});
    localStorage.setItem("dots.preferences", ${JSON.stringify(JSON.stringify({ version: 2, ...preferences }))});
    location.reload();
  `);
  await waitFor(cdp, `document.readyState === "complete" && document.querySelector("#game-board") !== null`, "Dots UI did not reload");
  await sleep(350);
  await cdp.evaluate(`document.querySelector('.fit-game')?.click()`);
  await sleep(300);
};

const screenshot = async (name) => {
  const png = execFileSync("adb", ["exec-out", "screencap", "-p"]);
  await writeFile(resolve(outputDir, name), png);
};

await mkdir(outputDir, { recursive: true });
adb("shell", "cmd", "uimode", "night", "no");

const cdp = await connect();
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    Object.defineProperty(navigator, "language", { configurable: true, get: () => "ru-RU" });
    Object.defineProperty(navigator, "languages", { configurable: true, get: () => ["ru-RU", "ru"] });
  `
});

await seed(cdp, captureMoves, { gameMode: "local", aiDifficulty: "normal" });
assert(await cdp.evaluate(`document.documentElement.lang === "ru"`), "Russian locale was not applied");
assert(await cdp.evaluate(`document.querySelector('[data-red-label]')?.textContent === "Красные"`), "Russian game labels are missing");
assert(Number(await cdp.evaluate(`document.querySelector('[data-score-red]')?.textContent ?? "0"`)) > 0, "Expected real capture was not produced by the game engine");
await screenshot("01-game-capture.png");

await seed(cdp, computerMoves, { gameMode: "computer", aiDifficulty: "expert" });
assert(await cdp.evaluate(`document.querySelector('[data-game-mode]')?.value === "computer"`), "Computer mode was not applied");
assert(await cdp.evaluate(`document.querySelector('[data-ai-difficulty]')?.value === "expert"`), "Expert difficulty was not applied");
await screenshot("02-vs-computer.png");

await seed(cdp, captureMoves, { gameMode: "local", aiDifficulty: "normal" });
await cdp.evaluate(`document.querySelector('.help')?.click()`);
await waitFor(cdp, `document.querySelector('[data-help-dialog]')?.open === true`, "Help dialog did not open");
await sleep(200);
await screenshot("03-help.png");

await cdp.evaluate(`document.querySelector('[data-help-dialog]')?.close(); document.querySelector('.about-button')?.click()`);
await waitFor(cdp, `document.querySelector('.about-dialog')?.open === true`, "About dialog did not open");
await sleep(200);
await screenshot("04-about.png");

cdp.close();
