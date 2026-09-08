import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const tauriConfig = readJson("src-tauri/tauri.conf.json");

const cargoPackageVersion = (path) => {
  const text = fs.readFileSync(path, "utf8");
  const packageSection = text.match(/^\[package\]\s*$([\s\S]*?)(?=^\[|\s*$)/m);
  if (!packageSection) {
    throw new Error(`Missing [package] section in ${path}`);
  }
  const version = packageSection[1].match(/^version\s*=\s*"([^"]+)"\s*$/m)?.[1];
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

console.log(`Verified source version ${expected} across npm, Rust, and Tauri manifests.`);
