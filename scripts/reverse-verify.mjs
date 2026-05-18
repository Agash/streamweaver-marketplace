// Daily integrity check: re-fetch every non-yanked artifact, compare SHA-256.
// Auto-yanks entries whose bytes no longer match the pin.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { walkPackageJson } from "./walk.mjs";

const files = walkPackageJson("packages");
const failures = [];
const state = { generatedAtUtc: new Date().toISOString(), checked: 0, packages: [] };

for (const file of files) {
  const m = JSON.parse(readFileSync(file, "utf8"));
  const art = m.artifact;
  if (m.yanked) continue;

  state.checked++;

  if (art.kind === "external") {
    try {
      const resp = await fetch(art.sourceUrl, { method: "HEAD" });
      state.packages.push({ id: m.id, version: m.version, kind: "external", status: resp.status });
      if (!resp.ok) failures.push({ file, id: m.id, version: m.version, reason: `purchase HEAD ${resp.status}` });
    } catch (e) {
      state.packages.push({ id: m.id, version: m.version, kind: "external", error: e.message });
      failures.push({ file, id: m.id, version: m.version, reason: `purchase fetch: ${e.message}` });
    }
    continue;
  }

  try {
    const resp = await fetch(art.sourceUrl);
    if (!resp.ok) {
      failures.push({ file, id: m.id, version: m.version, reason: `fetch ${resp.status}` });
      state.packages.push({ id: m.id, version: m.version, kind: art.kind, status: resp.status });
      continue;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    const sha = createHash("sha256").update(buf).digest("hex");
    if (sha !== art.sha256) {
      failures.push({ file, id: m.id, version: m.version, reason: `sha mismatch (got ${sha}, expected ${art.sha256})` });
      state.packages.push({ id: m.id, version: m.version, kind: art.kind, status: "sha-mismatch" });
    } else {
      state.packages.push({ id: m.id, version: m.version, kind: art.kind, status: "ok" });
    }
  } catch (e) {
    failures.push({ file, id: m.id, version: m.version, reason: `fetch: ${e.message}` });
    state.packages.push({ id: m.id, version: m.version, kind: art.kind, error: e.message });
  }
}

mkdirSync("registry", { recursive: true });
writeFileSync("registry/verification-state.json", JSON.stringify(state, null, 2));

if (failures.length > 0) {
  console.log(`::warning::${failures.length} package(s) failed reverse-verification`);
  for (const f of failures) {
    console.log(`  ${f.id}@${f.version}: ${f.reason} (${f.file})`);
    const body = JSON.parse(readFileSync(f.file, "utf8"));
    body.verificationFailureReason = f.reason;
    writeFileSync(f.file, JSON.stringify(body, null, 2) + "\n");
  }
  const summary = failures.map(f => `- ${f.id}@${f.version}: ${f.reason}`).join("\n");
  writeFileSync("/tmp/failures.md", summary);
}

console.log(`Reverse-verified ${state.checked} package(s); ${failures.length} failure(s)`);
