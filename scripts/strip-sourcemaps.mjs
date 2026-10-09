// Safety net after every build: never publish source maps, even if the Sentry upload failed.
import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../.output/public", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
let removed = 0;
function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith(".map")) {
      rmSync(path);
      removed++;
    }
  }
}
walk(root);
if (removed) console.log(`strip-sourcemaps: removed ${removed} map file(s) from .output/public`);
