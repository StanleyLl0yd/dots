import { createHash } from "node:crypto";
import {
  chmodSync,
  createReadStream,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = resolve(root, "crates/game-core/Cargo.lock");
const toolsRoot = resolve(root, "target/verified-wasm-tools");

const wasmBindgenReleases = {
  "0.2.128": {
    url: "https://github.com/wasm-bindgen/wasm-bindgen/releases/download/0.2.128/wasm-bindgen-0.2.128-x86_64-unknown-linux-musl.tar.gz",
    sha256: "b51f0208fdff83515a787bd8ab9ac5865ed84dabb66d0c709957bb59793c645f"
  }
};

const binaryenRelease = {
  version: "132",
  url: "https://github.com/WebAssembly/binaryen/releases/download/version_132/binaryen-version_132-x86_64-linux.tar.gz",
  sha256: "195ddc94f9bc89f45abdabb0b9eea86023d727ba90eac8b35b80f2544fc30572"
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: options.capture ? "pipe" : "inherit",
    encoding: options.capture ? "utf8" : undefined,
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? `: ${(result.stderr || result.stdout || "").trim()}` : "";
    throw new Error(`${command} failed with exit code ${result.status}${detail}`);
  }
  return result;
};

const gameCoreWasmBindgenVersion = () => {
  const lock = readFileSync(lockPath, "utf8");
  const match = lock.match(/\[\[package\]\]\s+name = "wasm-bindgen"\s+version = "([^"]+)"/m);
  if (!match) throw new Error("Cargo.lock does not contain the wasm-bindgen package");
  return match[1];
};

const sha256File = (path) =>
  new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });

const downloadVerifiedArchive = async ({ url, sha256 }, destination) => {
  rmSync(destination, { force: true });
  run("curl", [
    "--fail",
    "--location",
    "--proto",
    "=https",
    "--tlsv1.2",
    "--retry",
    "3",
    "--retry-all-errors",
    "--connect-timeout",
    "20",
    "--output",
    destination,
    url
  ]);
  const actual = await sha256File(destination);
  if (actual !== sha256) {
    rmSync(destination, { force: true });
    throw new Error(`SHA-256 mismatch for ${url}: expected ${sha256}, got ${actual}`);
  }
};

const findExecutable = (directory, name) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = findExecutable(path, name);
      if (nested) return nested;
    } else if ((entry.isFile() || entry.isSymbolicLink()) && entry.name === name) {
      return path;
    }
  }
  return null;
};

const commandOutput = (command, args) => run(command, args, { capture: true }).stdout.trim();

const verifyWasmBindgenVersion = (command, expected) => {
  const output = commandOutput(command, ["--version"]);
  const match = output.match(/\bwasm-bindgen\s+([0-9]+\.[0-9]+\.[0-9]+)\b/);
  if (!match || match[1] !== expected) {
    throw new Error(
      `wasm-bindgen CLI must exactly match Cargo.lock: expected ${expected}, got ${output || "unknown"}`
    );
  }
};

const verifyBinaryenVersion = (command) => {
  const output = commandOutput(command, ["--version"]);
  if (!new RegExp(`\\bversion\\s+${binaryenRelease.version}\\b`).test(output)) {
    throw new Error(`Unexpected wasm-opt version: expected Binaryen ${binaryenRelease.version}, got ${output}`);
  }
};

const ensureWasmTarget = () => {
  const installed = commandOutput("rustup", ["target", "list", "--installed"])
    .split(/\r?\n/)
    .includes("wasm32-unknown-unknown");
  if (!installed) run("rustup", ["target", "add", "wasm32-unknown-unknown"]);
};

const verifiedCiToolchain = async (wasmBindgenVersion) => {
  const release = wasmBindgenReleases[wasmBindgenVersion];
  if (!release) {
    throw new Error(
      `No reviewed CI asset is pinned for wasm-bindgen ${wasmBindgenVersion}; add its official release URL and SHA-256 before updating Cargo.lock`
    );
  }

  const directory = resolve(
    toolsRoot,
    `wasm-bindgen-${wasmBindgenVersion}-binaryen-${binaryenRelease.version}`
  );
  const wasmBindgenArchive = resolve(directory, `wasm-bindgen-${wasmBindgenVersion}.tar.gz`);
  const binaryenArchive = resolve(directory, `binaryen-${binaryenRelease.version}.tar.gz`);
  mkdirSync(directory, { recursive: true });

  let wasmBindgen = findExecutable(directory, "wasm-bindgen");
  let wasmOpt = findExecutable(directory, "wasm-opt");

  if (!wasmBindgen) {
    await downloadVerifiedArchive(release, wasmBindgenArchive);
    run("tar", ["-xzf", wasmBindgenArchive, "-C", directory]);
    rmSync(wasmBindgenArchive, { force: true });
    wasmBindgen = findExecutable(directory, "wasm-bindgen");
  }
  if (!wasmOpt) {
    await downloadVerifiedArchive(binaryenRelease, binaryenArchive);
    run("tar", ["-xzf", binaryenArchive, "-C", directory]);
    rmSync(binaryenArchive, { force: true });
    wasmOpt = findExecutable(directory, "wasm-opt");
  }

  if (!wasmBindgen) throw new Error("Verified wasm-bindgen archive did not contain wasm-bindgen");
  if (!wasmOpt) throw new Error("Verified Binaryen archive did not contain wasm-opt");
  if (!statSync(wasmBindgen).isFile() || !statSync(wasmOpt).isFile()) {
    throw new Error("Verified WASM tool paths are not regular files");
  }
  chmodSync(wasmBindgen, 0o755);
  chmodSync(wasmOpt, 0o755);
  verifyWasmBindgenVersion(wasmBindgen, wasmBindgenVersion);
  verifyBinaryenVersion(wasmOpt);
  return { wasmBindgen, wasmOpt };
};

export const resolveWasmToolchain = async () => {
  ensureWasmTarget();
  const wasmBindgenVersion = gameCoreWasmBindgenVersion();
  const useVerifiedCiAssets =
    process.env.GITHUB_ACTIONS === "true" && process.platform === "linux" && process.arch === "x64";

  if (useVerifiedCiAssets) return verifiedCiToolchain(wasmBindgenVersion);

  verifyWasmBindgenVersion("wasm-bindgen", wasmBindgenVersion);
  verifyBinaryenVersion("wasm-opt");
  return { wasmBindgen: "wasm-bindgen", wasmOpt: "wasm-opt" };
};
