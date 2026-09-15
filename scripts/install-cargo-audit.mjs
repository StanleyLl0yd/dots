import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  createReadStream,
  mkdirSync,
  readdirSync,
  rmSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "0.22.2";
const RELEASE = {
  url: `https://github.com/RustSec/rustsec/releases/download/cargo-audit/v${VERSION}/cargo-audit-x86_64-unknown-linux-musl-v${VERSION}.tgz`,
  sha256: "7fb9497f8594b389e5fce5ef9b92db08432996895b2e0c5a0167a69ed445c428"
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workDir = resolve(root, "target/verified-cargo-audit");
const archive = resolve(workDir, `cargo-audit-${VERSION}.tgz`);
const cargoHome = process.env.CARGO_HOME || resolve(process.env.HOME ?? "", ".cargo");
const installDir = resolve(cargoHome, "bin");
const installed = resolve(installDir, "cargo-audit");

const run = (command, args, { capture = false } = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: capture ? "pipe" : "inherit",
    encoding: capture ? "utf8" : undefined,
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = capture ? `: ${(result.stderr || result.stdout || "").trim()}` : "";
    throw new Error(`${command} failed with exit code ${result.status}${detail}`);
  }
  return result;
};

const sha256File = (path) =>
  new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });

const findExecutable = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = findExecutable(path);
      if (nested) return nested;
    } else if ((entry.isFile() || entry.isSymbolicLink()) && entry.name === "cargo-audit") {
      return path;
    }
  }
  return null;
};

if (process.platform !== "linux" || process.arch !== "x64") {
  throw new Error(`Verified cargo-audit installer supports Linux x64 CI only, got ${process.platform}/${process.arch}`);
}

rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });
mkdirSync(installDir, { recursive: true });

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
  archive,
  RELEASE.url
]);

const actual = await sha256File(archive);
if (actual !== RELEASE.sha256) {
  throw new Error(`cargo-audit archive SHA-256 mismatch: expected ${RELEASE.sha256}, got ${actual}`);
}

run("tar", ["-xzf", archive, "-C", workDir]);
const extracted = findExecutable(workDir);
if (!extracted) throw new Error("Verified cargo-audit archive did not contain cargo-audit");

copyFileSync(extracted, installed);
chmodSync(installed, 0o755);

const version = run(installed, ["--version"], { capture: true }).stdout.trim();
if (version !== `cargo-audit ${VERSION}`) {
  throw new Error(`Unexpected cargo-audit version: expected cargo-audit ${VERSION}, got ${version}`);
}

console.log(`Installed verified ${version} from SHA-256 ${RELEASE.sha256}.`);
