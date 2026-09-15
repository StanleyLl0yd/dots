import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const icnsPath = "src-tauri/icons/icon.icns";

const parseIcns = (bytes, source) => {
  if (bytes.length < 8 || bytes.subarray(0, 4).toString("ascii") !== "icns") {
    throw new Error(`${source}: invalid ICNS header`);
  }
  const declaredLength = bytes.readUInt32BE(4);
  if (declaredLength !== bytes.length) {
    throw new Error(`${source}: ICNS length mismatch: header=${declaredLength}, actual=${bytes.length}`);
  }

  const entries = [];
  for (let offset = 8; offset < bytes.length;) {
    if (offset + 8 > bytes.length) throw new Error(`${source}: truncated ICNS entry header at ${offset}`);
    const type = bytes.subarray(offset, offset + 4).toString("latin1");
    const length = bytes.readUInt32BE(offset + 4);
    if (length < 8 || offset + length > bytes.length) {
      throw new Error(`${source}: invalid ICNS entry ${JSON.stringify(type)} length ${length}`);
    }
    const payload = bytes.subarray(offset + 8, offset + length);
    const digest = createHash("sha256").update(payload).digest("hex");
    entries.push(`${Buffer.from(type, "latin1").toString("hex")}:${payload.length}:${digest}`);
    offset += length;
  }
  return entries.sort();
};

const committed = execFileSync("git", ["show", `HEAD:${icnsPath}`], {
  encoding: "buffer",
  maxBuffer: 8 * 1024 * 1024
});
const generated = readFileSync(icnsPath);
const committedEntries = parseIcns(committed, `HEAD:${icnsPath}`);
const generatedEntries = parseIcns(generated, icnsPath);

if (
  committedEntries.length !== generatedEntries.length ||
  committedEntries.some((entry, index) => entry !== generatedEntries[index])
) {
  throw new Error(`${icnsPath}: regenerated ICNS payloads differ from the committed icon`);
}

console.log(`Verified ${generatedEntries.length} ICNS payload(s) independent of container entry order.`);
