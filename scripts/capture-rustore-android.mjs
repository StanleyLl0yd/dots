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
    return this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
  }

  close() {
    this.socket.close();
  }
}

const connect = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`${cdpUrl}/json`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return new Cdp(page.webSocketDebuggerUrl);
    } catch {}
    await sleep(500);
  }
  throw new Error("Android WebView DevTools target was not found");
};

const seed = async (cdp, moves, preferences) => {
  const expression = `
    localStorage.setItem("dots.game", ${JSON.stringify(JSON.stringify({ version: 1, moves }))});
    localStorage.setItem("dots.preferences", ${JSON.stringify(JSON.stringify({ version: 2, ...preferences }))});
    location.reload();
  `;
  await cdp.evaluate(expression);
  await sleep(1400);
  await cdp.evaluate(`document.querySelector('.fit-game')?.click()`);
  await sleep(450);
};

const screenshot = async (name) => {
  const png = execFileSync("adb", ["exec-out", "screencap", "-p"]);
  await writeFile(resolve(outputDir, name), png);
};

await mkdir(outputDir, { recursive: true });
adb("shell", "cmd", "uimode", "night", "no");

const cdp = await connect();
await cdp.send("Runtime.enable");

await seed(cdp, captureMoves, { gameMode: "local", aiDifficulty: "normal" });
await screenshot("01-game-capture.png");

await seed(cdp, computerMoves, { gameMode: "computer", aiDifficulty: "expert" });
await screenshot("02-vs-computer.png");

await seed(cdp, captureMoves, { gameMode: "local", aiDifficulty: "normal" });
await cdp.evaluate(`document.querySelector('.help')?.click()`);
await sleep(300);
await screenshot("03-help.png");

await cdp.evaluate(`document.querySelector('[data-help-dialog]')?.close(); document.querySelector('.about-button')?.click()`);
await sleep(300);
await screenshot("04-about.png");

cdp.close();
