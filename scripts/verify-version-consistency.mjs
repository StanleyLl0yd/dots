import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const tauriConfig = readJson("src-tauri/tauri.conf.json");

const cargoPackageVersion = (path) => {
  const text = fs.readFileSync(path, "utf8");
  const marker = "[package]";
  const start = text.indexOf(marker);
  if (start < 0) {
    throw new Error(`Missing [package] section in ${path}`);
  }
  const remainder = text.slice(start + marker.length);
  const nextSection = remainder.search(/^\[/m);
  const packageSection = nextSection < 0 ? remainder : remainder.slice(0, nextSection);
  const version = packageSection.match(/^version\s*=\s*"([^"]+)"\s*$/m)?.[1];
  if (!version) {
    throw new Error(`Missing package version in ${path}`);
  }
  return version;
};

const expected = packageJson.version;
if (typeof expected !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(expected)) {
  throw new Error(`Invalid package.json version: ${String(expected)}`);
}

const versions = new Map([
  ["package-lock.json", packageLock.version],
  ["package-lock.json root package", packageLock.packages?.[""]?.version],
  ["crates/game-core/Cargo.toml", cargoPackageVersion("crates/game-core/Cargo.toml")],
  ["src-tauri/Cargo.toml", cargoPackageVersion("src-tauri/Cargo.toml")],
  ["src-tauri/tauri.conf.json", tauriConfig.version],
]);

for (const [source, version] of versions) {
  if (version !== expected) {
    throw new Error(`Version mismatch: ${source} has ${String(version)}, expected ${expected}`);
  }
}

const rustoreMetadataPath = "store/rustore/metadata-ru.md";
const rustoreMetadata = fs.readFileSync(rustoreMetadataPath, "utf8");
const rustoreVersion = rustoreMetadata.match(/^- Version name: `([^`]+)`\s*$/m)?.[1];
if (rustoreVersion !== expected) {
  throw new Error(`Version mismatch: ${rustoreMetadataPath} has ${String(rustoreVersion)}, expected ${expected}`);
}
if (!rustoreMetadata.includes(`## What's new — ${expected}\n`)) {
  throw new Error(`${rustoreMetadataPath}: missing What's new heading for ${expected}`);
}

const rustoreWhatsNewPath = `store/rustore/console-copy/05-whats-new-${expected}.txt`;
if (!fs.existsSync(rustoreWhatsNewPath) || !fs.readFileSync(rustoreWhatsNewPath, "utf8").trim()) {
  throw new Error(`${rustoreWhatsNewPath}: missing or empty RuStore What's New copy`);
}

console.log(`Verified source/store version ${expected} across npm, Rust, Tauri, and RuStore metadata.`);
