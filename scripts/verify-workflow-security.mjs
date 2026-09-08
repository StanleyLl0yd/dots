import fs from "node:fs";
import path from "node:path";

const workflowDir = ".github/workflows";
const workflowFiles = fs
  .readdirSync(workflowDir)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

const shaRef = /^[0-9a-f]{40}$/;
const violations = [];

for (const name of workflowFiles) {
  const file = path.join(workflowDir, name);
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  if (/^\s*pull_request_target\s*:/m.test(text)) {
    violations.push(`${file}: pull_request_target is not allowed`);
  }
  if (/^\s*permissions\s*:\s*write-all\s*$/m.test(text)) {
    violations.push(`${file}: permissions: write-all is not allowed`);
  }
  if (text.includes("ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION")) {
    violations.push(`${file}: insecure GitHub Actions Node fallback is not allowed`);
  }

  const checkouts = [];
  let persistedCredentialDenials = 0;

  for (const [index, line] of lines.entries()) {
    const usesMatch = line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/);
    if (usesMatch) {
      const action = usesMatch[1];
      if (!action.startsWith("./")) {
        const at = action.lastIndexOf("@");
        const ref = at >= 0 ? action.slice(at + 1) : "";
        if (!shaRef.test(ref)) {
          violations.push(`${file}:${index + 1}: external action must be pinned to a 40-character commit SHA`);
        }
      }
      if (action.startsWith("actions/checkout@")) {
        checkouts.push(index + 1);
      }
    }

    const imageMatch = line.match(/^\s*image:\s*([^\s#]+)(?:\s+#.*)?$/);
    if (imageMatch && !/@sha256:[0-9a-f]{64}$/.test(imageMatch[1])) {
      violations.push(`${file}:${index + 1}: container image must be pinned by SHA-256 digest`);
    }

    if (/^\s*persist-credentials:\s*false\s*$/.test(line)) {
      persistedCredentialDenials += 1;
    }
  }

  if (checkouts.length !== persistedCredentialDenials) {
    violations.push(
      `${file}: expected persist-credentials:false for every checkout (${checkouts.length} checkout(s), ${persistedCredentialDenials} denial(s))`,
    );
  }
}

if (violations.length) {
  throw new Error(`Workflow security policy failed:\n${violations.join("\n")}`);
}

console.log(`Verified workflow security policy for ${workflowFiles.length} workflow(s).`);
