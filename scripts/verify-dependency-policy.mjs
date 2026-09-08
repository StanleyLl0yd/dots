import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const packageLock = JSON.parse(fs.readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const policy = packageJson.allowScripts ?? {};

const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
for (const section of ["dependencies", "devDependencies"]) {
  for (const [name, version] of Object.entries(packageJson[section] ?? {})) {
    if (typeof version !== "string" || !exactVersion.test(version)) {
      throw new Error(`Direct dependency must use an exact version: ${name}@${String(version)}`);
    }
  }
}

for (const [path, metadata] of Object.entries(packageLock.packages ?? {})) {
  if (!path) continue;
  if (typeof metadata?.resolved !== "string" || !metadata.resolved.startsWith("https://registry.npmjs.org/")) {
    throw new Error(`Non-registry dependency source in lockfile: ${path}`);
  }
  if (typeof metadata.integrity !== "string" || !metadata.integrity.startsWith("sha512-")) {
    throw new Error(`Missing SHA-512 integrity for lockfile package: ${path}`);
  }
}

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
  if (exact in policy && name in policy) {
    throw new Error(`Ambiguous allowScripts decisions for ${exact}`);
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

console.log(`Verified registry/integrity policy and explicit install-script decisions for ${scripted.length} scripted package(s).`);
