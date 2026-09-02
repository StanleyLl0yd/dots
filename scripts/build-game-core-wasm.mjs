import { existsSync, mkdirSync, rmSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "src/wasm");
const targetDir = resolve(root, "target/game-core-wasm");
const sourceWasm = resolve(targetDir, "wasm32-unknown-unknown/release/game_core.wasm");
const outputWasm = resolve(outDir, "game_core_bg.wasm");
const optimizedWasm = resolve(outDir, "game_core_bg.optimized.wasm");

const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
};

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

run("cargo", [
  "build",
  "--manifest-path",
  "crates/game-core/Cargo.toml",
  "--release",
  "--features",
  "wasm",
  "--target",
  "wasm32-unknown-unknown",
  "--target-dir",
  targetDir
]);

if (!existsSync(sourceWasm)) throw new Error(`Missing compiled WASM: ${sourceWasm}`);

run("wasm-bindgen", [
  sourceWasm,
  "--target",
  "web",
  "--no-typescript",
  "--out-dir",
  outDir,
  "--out-name",
  "game_core"
]);

run("wasm-opt", [
  outputWasm,
  "-Oz",
  "--enable-bulk-memory",
  "--enable-sign-ext",
  "--strip-debug",
  "--strip-producers",
  "-o",
  optimizedWasm
]);
renameSync(optimizedWasm, outputWasm);
