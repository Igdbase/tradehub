import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};
const includesAll = (source, values, message) => {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
};
const excludesAll = (source, values, message) => {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
};

const authoritativeDocs = [
  "plan.md",
  "complaint-resolution-roadmap.md",
  "manual-test-backlog.md",
  "manual-demo-qa.md",
  "prompt/promptsumary.md",
  "docs/handoffs/tradehub-handoff-2026-08-30.md",
];

const packageJson = JSON.parse(read("package.json"));

assert(
  packageJson.scripts?.["stage29j:closure:qa"] === "node scripts/qa-stage29j-owner-acceptance-closure.mjs",
  "package.json exposes npm run stage29j:closure:qa."
);
assert(
  packageJson.scripts?.["stage29j:qa"] === "node scripts/qa-stage29j-signals-feed-routing.mjs",
  "Existing Stage 29J behavioral QA remains wired."
);
assert(
  packageJson.scripts?.["stage29j:routing:qa"] === "node scripts/qa-stage29j-routing-emulator.mjs",
  "Existing Stage 29J routing emulator QA remains wired."
);

const closureRequired = [
  "Stage 29J",
  "Signals Feed And TradeHub Signal Routing",
  "7 September 2026",
  "owner-accepted",
  "closed",
  "frozen",
  "TH-2026-09-07-STAGE29J-SIGNALS-FEED-ROUTING-OWNER-ACCEPTANCE-CLOSURE-HANDOFF",
  "Stage 29I",
  "closed and frozen",
  "Stage 29G external Binance/Bybit acceptance remains deferred",
  "Stage 29H remains deferred/unstarted",
  "Stage 29J remains owner-accepted, closed, and frozen",
  "Stage 29K",
];

for (const docPath of authoritativeDocs) {
  const source = read(docPath);
  includesAll(source, closureRequired, `${docPath} records Stage 29J owner acceptance, closure, deferred dependencies, and next-stage status.`);
  excludesAll(
    source,
    [
      "Stage 29J Signals Feed And TradeHub Signal Routing is implemented/source-QA ready for adviser review; owner acceptance is not claimed",
      "Status: implemented/source-QA ready for adviser review. Owner acceptance is not claimed.",
      "Owner acceptance pending criteria",
      "Stage 29J is implemented/source-QA ready for adviser review",
      "Stage 29J owner acceptance remains pending",
    ],
    `${docPath} no longer says Stage 29J owner acceptance is pending.`
  );
}

const combinedDocs = authoritativeDocs.map(read).join("\n");
includesAll(
  combinedDocs,
  [
    "compact",
    "All, Forex, Crypto, and Open",
    "provider-confirmed",
    "server-only `tradeHubSignalId` linkage",
    "typed canonical `authoritativePnl`",
    "Load More",
    "bounded-history notice",
    "unapproved external-preview candidates remain absent",
    "Trade Copier billing",
    "kill-switch",
    "live-execution gates remain in force",
    "loads no credentials",
    "calls no provider",
    "External provider acceptance remains deferred",
  ],
  "Stage 29J closure preserves Signals feed behavior, routing evidence, projection-repair evidence, and external-provider boundary."
);
excludesAll(
  combinedDocs,
  [
    "Stage 29K started",
    "Stage 29K owner-accepted",
    "Stage 29G external Binance/Bybit acceptance is complete",
    "external-provider acceptance is complete",
  ],
  "Stage 29J closure preserves frozen acceptance status and does not claim external-provider acceptance."
);

console.log("Stage 29J owner acceptance closure QA passed.");
