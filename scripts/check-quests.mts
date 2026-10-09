import { readFileSync } from "node:fs";
import { getQuest } from "@/lib/quests/data";
import { checkContractQuest } from "@/lib/server/quest-checks";

// Runs each contract quest check against the scenarios built by scripts/testnet-e2e.sh.
const s = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const cases: [string, string, boolean][] = [
  ["first-contract", s.escrow, true],
  ["the-freelancer", s.escrow, true],
  ["the-freelancer", s.escrowNoFlow, false],
  ["mini-boss", s.tickets, true],
  ["mini-boss", s.ticketsSelf, false],
  ["asset-forge", s.atlas, true],
  ["asset-forge", s.escrow, false],
  ["fund-the-impossible", s.crowd, true],
  ["fund-the-impossible", s.boss, false],
  ["security-dungeon", s.vaultOk, true],
  ["security-dungeon", s.vaultBad, false],
  ["final-boss", s.boss, true],
  ["final-boss", s.crowd, false],
];
let bad = 0;
for (const [slug, id, expected] of cases) {
  const t = Date.now();
  const r = await checkContractQuest(getQuest(slug)!, id, s.player);
  const pass = r.ok === expected;
  if (!pass) bad++;
  console.log(
    `${pass ? "PASS" : "FAIL"} ${slug.padEnd(20)} expected=${expected} got=${r.ok} (${Date.now() - t}ms) :: ${r.message}`,
  );
  if (r.details) console.log("      ", JSON.stringify(r.details));
}
console.log(bad ? `${bad} unexpected` : "all as expected");

if (bad) process.exit(1);
