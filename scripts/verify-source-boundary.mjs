import { access, readFile, readdir } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const src = new URL("../src/", import.meta.url);
const game = new URL("../src/game/", import.meta.url);

const forbiddenFiles = [
  "ai.ts",
  "board.ts",
  "capture.ts",
  "ai-match.ts"
];
for (const file of forbiddenFiles) {
  try {
    await access(new URL(file, game));
    throw new Error(`Forbidden TypeScript game-core implementation exists: src/game/${file}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const collect = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) files.push(...await collect(child));
    else files.push(child);
  }
  return files;
};

const productionSources = (await collect(src)).filter((file) => {
  const name = file.pathname;
  return /\.(?:ts|tsx)$/i.test(name) && !/\.(?:test|spec)\.(?:ts|tsx)$/i.test(name);
});

const forbiddenImports = [
  /from\s+["'][^"']*\/ai["']/,
  /from\s+["'][^"']*\/board["']/,
  /from\s+["'][^"']*\/capture["']/
];
const forbiddenIdentifiers = [
  "chooseAiMove",
  "evaluateState",
  "findNewCaptures",
  "findHouseCapture",
  "closurePressure",
  "setupPotential",
  "rankedMoves",
  "minimaxValue"
];

for (const file of productionSources) {
  const content = await readFile(file, "utf8");
  const name = relative(fileURLToPath(root), fileURLToPath(file)).replaceAll("\\", "/");
  for (const pattern of forbiddenImports) {
    if (pattern.test(content)) throw new Error(`Legacy game-core import found in ${name}: ${pattern}`);
  }
  for (const identifier of forbiddenIdentifiers) {
    if (content.includes(identifier)) throw new Error(`Legacy game-core identifier found in ${name}: ${identifier}`);
  }
}

console.log(`Verified Rust game-core boundary across ${productionSources.length} production TypeScript files.`);
