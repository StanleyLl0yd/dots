import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const packageLock = JSON.parse(fs.readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const policy = packageJson.allowScripts ?? {};

const packageName = (path) => {
  const marker = "node_modules/";
  const index = path.lastIndexOf(marker);
  return index === -1 ? undefined : path.slice(index + marker.length);
};

const scripted = Object.entries(packageLock.packages ?? {})
  .filter(([, metadata]) => metadata?.hasInstallScript)
  .map(([path, metadata]) => {
    const name = packageName(path);
    if (!name || typeof metadata.version !== "string") {
      throw new Error(`Unable to identify install-script package at ${path}`);
    }
    return { name, version: metadata.version };
  });

for (const { name, version } of scripted) {
  const exact = `${name}@${version}`;
  if (!(exact in policy) && !(name in policy)) {
    throw new Error(`Install script for ${exact} has no explicit allowScripts decision`);
  }
}

for (const [entry, allowed] of Object.entries(policy)) {
  if (typeof allowed !== "boolean") {
    throw new Error(`allowScripts decision for ${entry} must be boolean`);
  }
  const matches = scripted.some(({ name, version }) => entry === name || entry === `${name}@${version}`);
  if (!matches) {
    throw new Error(`Stale allowScripts decision for ${entry}`);
  }
  if (allowed && !scripted.some(({ name, version }) => entry === `${name}@${version}`)) {
    throw new Error(`Allowed install script must be version-pinned: ${entry}`);
  }
}

console.log(`Verified explicit install-script policy for ${scripted.length} package(s).`);
