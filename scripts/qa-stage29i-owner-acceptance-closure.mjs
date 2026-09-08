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
  packageJson.scripts?.["stage29i:closure:qa"] === "node scripts/qa-stage29i-owner-acceptance-closure.mjs",
  "package.json exposes npm run stage29i:closure:qa."
);
assert(
  packageJson.scripts?.["stage29i:qa"] === "node scripts/qa-stage29i-copier-purchase-setup-experience.mjs",
  "Existing Stage 29I behavioral QA remains wired."
);
assert(
  packageJson.scripts?.["stage29i:repository:qa"] === "node scripts/qa-stage29i-trade-copier-billing-repository.mjs",
  "Existing Stage 29I repository QA remains wired."
);

const closureRequired = [
  "Stage 29I",
  "6 September 2026",
  "owner-accepted",
  "closed",
  "frozen",
  "One Trade Copier purchase unlocks both Crypto Setup and Forex Setup",
  "unified purchase button",
  "local checkout callback",
  "persistent entitlement",
  "separate setup controls",
  "unified cancellation",
  "Real Paystack sandbox/production acceptance remains deferred",
  "Stage 29G external Binance/Bybit acceptance remains deferred",
  "Stage 29H remains deferred/unstarted",
  "Stage 29J",
];

for (const docPath of authoritativeDocs) {
  const source = read(docPath);
  includesAll(source, closureRequired, `${docPath} records Stage 29I owner acceptance, closure, deferred provider acceptance, and next-stage status.`);
  includesAll(
    source,
    ["TH-2026-09-06-STAGE29I-COPIER-OWNER-ACCEPTANCE-CLOSURE-HANDOFF"],
    `${docPath} records the Stage 29I owner-acceptance closure handoff reference.`
  );
  excludesAll(
    source,
    [
      "Stage 29I remains implemented/source-QA ready for adviser review",
      "Stage 29I remains implemented/source-QA ready for owner review",
      "Owner acceptance remains pending",
      "owner acceptance still pending",
      "Do not claim owner acceptance",
    ],
    `${docPath} no longer says Stage 29I owner acceptance is pending.`
  );
}

const combinedDocs = authoritativeDocs.map(read).join("\n");
includesAll(
  combinedDocs,
  [
    "one subscription rather than separate Crypto/Forex products",
    "Trade Copier is a separate paid student add-on",
    "not included in Launch, Pro, or Enterprise",
    "checkout responses minimized to `{ ok, authorizationUrl }`",
    "Paystack subscription code/email token",
    "never exposed",
    "real orders",
    "live execution",
    "Journal Sync remains separate from Copier",
    "Stage 29J Signals Feed And TradeHub Signal Routing",
    "owner-accepted, closed, and frozen after successful local owner testing on 7 September 2026",
  ],
  "Stage 29I closure preserves product model, payment privacy, execution boundaries, Journal separation, and next-stage sequencing."
);

console.log("Stage 29I owner acceptance closure QA passed.");
