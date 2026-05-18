// Tiny native-fs walker for package.json files under packages/.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function walkPackageJson(dir = "packages") {
  const out = [];
  const stat = statSync(dir, { throwIfNoEntry: false });
  if (!stat) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkPackageJson(full));
    } else if (entry.isFile() && entry.name === "package.json") {
      out.push(full);
    }
  }
  return out;
}
