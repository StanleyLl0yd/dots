import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const outputDir = resolve(process.argv[2] ?? "store/rustore/generated");
const baseUrl = process.env.DOTS_BASE_URL ?? "http://127.0.0.1:4173";

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

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

const take = async (name, moves, preferences, action) => {
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    locale: "ru-RU",
    colorScheme: "light"
  });

  await context.addInitScript(
    ({ savedMoves, savedPreferences }) => {
      localStorage.setItem("dots.game", JSON.stringify({ version: 1, moves: savedMoves }));
      localStorage.setItem("dots.preferences", JSON.stringify({ version: 2, ...savedPreferences }));
    },
    { savedMoves: moves, savedPreferences: preferences }
  );

  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#game-board").waitFor({ state: "visible" });
  await page.locator(".fit-game").click();
  await page.waitForTimeout(300);

  if (action) {
    await action(page);
    await page.waitForTimeout(150);
  }

  await page.screenshot({ path: resolve(outputDir, name), fullPage: false });
  await context.close();
};

const local = { gameMode: "local", aiDifficulty: "normal" };
const computer = { gameMode: "computer", aiDifficulty: "expert" };

await take("01-game-capture.png", captureMoves, local);
await take("02-vs-computer.png", computerMoves, computer);
await take("03-help.png", captureMoves, local, (page) => page.locator(".help").click());
await take("04-about.png", captureMoves, local, (page) => page.locator(".about-button").click());

await browser.close();
