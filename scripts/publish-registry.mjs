// Post-merge: regenerate registry shards + index from packages/.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { walkPackageJson } from "./walk.mjs";

function pickLatest(versions) {
  const keys = Object.keys(versions).filter(v => !versions[v].yanked);
  if (keys.length === 0) return "";
  keys.sort((a, b) => {
    const [aM, am, ap] = a.split("-")[0].split(".").map(Number);
    const [bM, bm, bp] = b.split("-")[0].split(".").map(Number);
    if (aM !== bM) return aM - bM;
    if (am !== bm) return am - bm;
    if (ap !== bp) return ap - bp;
    return a.localeCompare(b);
  });
  return keys[keys.length - 1];
}

const perType = {};
for (const file of walkPackageJson("packages")) {
  const m = JSON.parse(readFileSync(file, "utf8"));
  if (!perType[m.type]) perType[m.type] = {};
  if (!perType[m.type][m.id]) perType[m.type][m.id] = { id: m.id, versions: {} };
  perType[m.type][m.id].versions[m.version] = m;
}

const now = new Date().toISOString();
mkdirSync("registry", { recursive: true });

const indexShards = {};
for (const [type, byId] of Object.entries(perType)) {
  const shard = {
    schemaVersion: 1,
    type,
    generatedAtUtc: now,
    packages: Object.values(byId).map(p => ({
      id: p.id,
      latestVersion: pickLatest(p.versions),
      versions: p.versions,
    })),
  };
  const shardPath = `registry/${type}.json`;
  writeFileSync(shardPath, JSON.stringify(shard, null, 2));
  indexShards[type] = shardPath;
  console.log(`Wrote ${shardPath} (${shard.packages.length} package(s))`);
}

const index = {
  schemaVersion: 1,
  generatedAtUtc: now,
  shards: indexShards,
  featured: [],
  starterPack: null,
  verificationStateUrl: null,
};
try {
  const curated = JSON.parse(readFileSync("registry/featured.json", "utf8"));
  const allIds = new Set();
  for (const byId of Object.values(perType)) {
    for (const id of Object.keys(byId)) allIds.add(id);
  }
  index.featured = (curated.featured ?? []).filter(id => allIds.has(id));
  if (curated.starterPack && typeof curated.starterPack === "object") {
    index.starterPack = curated.starterPack;
  }
} catch {
  // No curated file; that's OK.
}
writeFileSync("registry/index.json", JSON.stringify(index, null, 2));
console.log("Wrote registry/index.json");
