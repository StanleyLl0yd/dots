import fs from "node:fs";
import path from "node:path";

const workflowDir = ".github/workflows";
const workflowFiles = fs
  .readdirSync(workflowDir)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

const shaRef = /^[0-9a-f]{40}$/;
const violations = [];

const indentation = (line) => line.match(/^\s*/)?.[0].length ?? 0;

const stepBounds = (lines, index) => {
  let start = index;
  while (start > 0) {
    const line = lines[start];
    if (/^\s*-\s+(?:name|uses):/.test(line)) break;
    start -= 1;
  }
  const indent = indentation(lines[start] ?? "");
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s*-\s+(?:name|uses):/.test(lines[i]) && indentation(lines[i]) === indent) {
      end = i;
      break;
    }
  }
  return [start, end];
};

const runBlock = (lines, index) => {
  const indent = indentation(lines[index]);
  const first = lines[index].replace(/^\s*(?:-\s*)?run:\s*/, "");
  const block = [first];
  for (let i = index + 1; i < lines.length; i += 1) {
    if (lines[i].trim() && indentation(lines[i]) <= indent) break;
    block.push(lines[i]);
  }
  return block.join("\n");
};

for (const name of workflowFiles) {
  const file = path.join(workflowDir, name);
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const pullRequest = /^\s*pull_request\s*:/m.test(text);

  if (!/^permissions\s*:/m.test(text)) {
    violations.push(`${file}: explicit top-level permissions are required`);
  }
  if (/^\s*pull_request_target\s*:/m.test(text)) {
    violations.push(`${file}: pull_request_target is not allowed`);
  }
  if (/^\s*workflow_run\s*:/m.test(text)) {
    violations.push(`${file}: workflow_run is not allowed`);
  }
  if (/^\s*permissions\s*:\s*write-all\s*$/m.test(text)) {
    violations.push(`${file}: permissions: write-all is not allowed`);
  }
  if (text.includes("ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION")) {
    violations.push(`${file}: insecure GitHub Actions Node fallback is not allowed`);
  }
  if (/^\s*persist-credentials:\s*true\s*$/m.test(text)) {
    violations.push(`${file}: checkout credentials must never be persisted`);
  }

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
        const [start, end] = stepBounds(lines, index);
        const step = lines.slice(start, end).join("\n");
        if (!/^\s*persist-credentials:\s*false\s*$/m.test(step)) {
          violations.push(`${file}:${index + 1}: checkout must set persist-credentials: false in the same step`);
        }
      }
    }

    const imageMatch = line.match(/^\s*image:\s*([^\s#]+)(?:\s+#.*)?$/);
    if (imageMatch && !/@sha256:[0-9a-f]{64}$/.test(imageMatch[1])) {
      violations.push(`${file}:${index + 1}: container image must be pinned by SHA-256 digest`);
    }

    if (pullRequest) {
      const permission = line.match(/^\s+([a-z-]+):\s*write\s*$/);
      if (permission && permission[1] !== "security-events") {
        violations.push(`${file}:${index + 1}: pull_request workflows may not grant ${permission[1]}: write`);
      }
    }

    if (/^\s*(?:-\s*)?run:/.test(line)) {
      const script = runBlock(lines, index);
      if (/\$\{\{\s*github\.event\.pull_request\./.test(script) || /\$\{\{\s*github\.head_ref\s*\}\}/.test(script)) {
        violations.push(`${file}:${index + 1}: untrusted pull-request data must not be interpolated directly into shell`);
      }
      if (/\b(?:curl|wget)\b[^\n|]*\|\s*(?:ba)?sh\b/.test(script)) {
        violations.push(`${file}:${index + 1}: downloaded content must not be piped directly to a shell`);
      }
    }
  }
}

if (violations.length) {
  throw new Error(`Workflow security policy failed:\n${violations.join("\n")}`);
}

console.log(`Verified workflow security policy for ${workflowFiles.length} workflow(s).`);
