// PR-time validation: schema check, artifact reachability, sha256 verification.
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { walkPackageJson } from "./walk.mjs";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schema = JSON.parse(readFileSync("registry/schema/package.schema.json", "utf8"));
const validate = ajv.compile(schema);

const files = walkPackageJson("packages");
let failed = 0;

for (const file of files) {
  const body = JSON.parse(readFileSync(file, "utf8"));
  if (!validate(body)) {
    console.error(`::error file=${file}::Schema validation failed:`);
    for (const err of validate.errors ?? []) {
      console.error(`  ${err.instancePath} ${err.message}`);
    }
    failed++;
    continue;
  }

  const art = body.artifact;
  if (art.kind === "external") {
    try {
      const resp = await fetch(art.sourceUrl, { method: "HEAD" });
      if (!resp.ok) {
        console.error(`::error file=${file}::sourceUrl returned ${resp.status}`);
        failed++;
      }
    } catch (e) {
      console.error(`::error file=${file}::external sourceUrl unreachable: ${e.message}`);
      failed++;
    }
    continue;
  }

  try {
    const resp = await fetch(art.sourceUrl);
    if (!resp.ok) {
      console.error(`::error file=${file}::sourceUrl returned ${resp.status}`);
      failed++;
      continue;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    const sha = createHash("sha256").update(buf).digest("hex");
    if (sha !== art.sha256) {
      console.error(`::error file=${file}::sha256 mismatch — computed ${sha}, declared ${art.sha256}`);
      failed++;
    }
  } catch (e) {
    console.error(`::error file=${file}::artifact fetch failed: ${e.message}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`${failed} manifest(s) failed validation.`);
  process.exit(1);
}
console.log(`✓ ${files.length} manifest(s) validated.`);
