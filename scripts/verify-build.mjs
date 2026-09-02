import { access, readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const dist = new URL("../dist/", import.meta.url);
const native = process.argv.includes("--native");

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) files.push(...await collectFiles(child));
    else files.push(child);
  }
  return files;
};

await access(new URL("index.html", dist));
const files = await collectFiles(dist);
const names = files.map((file) => relative(fileURLToPath(dist), fileURLToPath(file)).replaceAll("\\", "/"));

for (const name of names) {
  if (/\.map$/i.test(name)) throw new Error(`Source map leaked into production bundle: ${name}`);
  if (/\.(?:ts|tsx)$/i.test(name)) throw new Error(`TypeScript source leaked into production bundle: ${name}`);
  if (/(?:^|\/)__tests__(?:\/|$)|\.(?:test|spec)\./i.test(name)) {
    throw new Error(`Test source leaked into production bundle: ${name}`);
  }
}

const sensitiveIdentifiers = [
  "chooseAiMove",
  "evaluateState",
  "findNewCaptures",
  "findHouseCapture",
  "closurePressure",
  "setupPotential",
  "rankedMoves",
  "minimaxValue"
];
for (const file of files) {
  if (!/\.(?:js|mjs|cjs|html|css|json|webmanifest)$/i.test(file.pathname)) continue;
  const content = await readFile(file, "utf8");
  for (const identifier of sensitiveIdentifiers) {
    if (content.includes(identifier)) {
      throw new Error(`Sensitive legacy game-core identifier leaked into ${relative(fileURLToPath(dist), fileURLToPath(file))}: ${identifier}`);
    }
  }
}

if (native) {
  if (names.some((name) => name.endsWith(".wasm"))) {
    throw new Error("WASM game core must not be bundled into native Tauri frontend assets");
  }
  console.log(`Verified native frontend bundle: ${names.length} files, no source maps, tests, TypeScript, or WASM core.`);
  process.exit(0);
}

const manifestName = names.find((name) => name.endsWith(".webmanifest"));
if (!manifestName) throw new Error("PWA manifest was not generated");
for (const file of ["sw.js", "pwa-192.png", "icon.svg", "apple-touch-icon.png"]) {
  await access(new URL(file, dist));
}
if (!names.some((name) => /(?:^|\/)ai-worker-.*\.js$/.test(name))) {
  throw new Error("AI Web Worker bundle was not generated");
}
if (!names.some((name) => name.endsWith(".wasm"))) {
  throw new Error("Rust game-core WASM was not emitted");
}

const manifest = JSON.parse(await readFile(new URL(manifestName, dist), "utf8"));
if (manifest.name !== "Dots" || manifest.display !== "standalone") throw new Error("Unexpected PWA manifest metadata");
if (!Array.isArray(manifest.icons)) throw new Error("PWA manifest icons are missing");
if (!manifest.icons.some((icon) => icon.sizes === "192x192" && icon.type === "image/png")) {
  throw new Error("Missing 192x192 PNG PWA icon");
}
if (!manifest.icons.some((icon) => icon.sizes === "any" && icon.type === "image/svg+xml")) {
  throw new Error("Missing scalable SVG PWA icon");
}

const index = await readFile(new URL("index.html", dist), "utf8");
if (!index.includes("apple-touch-icon.png")) throw new Error("Apple touch icon is not linked");

const serviceWorker = await readFile(new URL("sw.js", dist), "utf8");
if (serviceWorker.length < 100) throw new Error("Generated service worker is unexpectedly empty");

console.log(`Verified PWA build: ${join("dist", manifestName)}, Rust WASM core, AI worker, and offline assets are present.`);
