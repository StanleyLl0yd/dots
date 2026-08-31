import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url);
const files = await readdir(dist);
const manifestName = files.find((file) => file.endsWith(".webmanifest"));

if (!manifestName) throw new Error("PWA manifest was not generated");
for (const file of ["index.html", "sw.js", "pwa-192.png", "icon.svg", "apple-touch-icon.png"]) {
  await access(new URL(file, dist));
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

console.log(`Verified PWA build: ${join("dist", manifestName)} and offline assets are present.`);
