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
  packageJson.scripts?.["stage29k:closure:qa"] === "node scripts/qa-stage29k-owner-acceptance-closure.mjs",
  "package.json exposes npm run stage29k:closure:qa."
);
assert(
  packageJson.scripts?.["stage29k:qa"] === "node scripts/qa-stage29k-telegram-signal-ingestion-bridge.mjs",
  "Existing Stage 29K behavioral/source QA remains wired."
);
assert(
  packageJson.scripts?.["stage29k:ingestion:qa"] === "node scripts/qa-stage29k-ingestion-emulator.mjs",
  "Existing Stage 29K ingestion emulator QA remains wired."
);

const closureRequired = [
  "Stage 29K",
  "Telegram Signal Ingestion And Controlled Bridge",
  "8 September 2026",
  "owner-accepted",
  "closed",
  "frozen",
  "TH-2026-09-08-STAGE29K-TELEGRAM-SIGNAL-BRIDGE-OWNER-ACCEPTANCE-CLOSURE-HANDOFF",
  "visible Super Admin Telegram source setup",
  "server-only conversion of raw Telegram identity",
  "quarantined candidate creation",
  "explicit Super Admin approval",
  "explicit workspace publication",
  "safe student Signals display",
  "absence of raw Telegram identifiers/messages",
  "preserved routing and execution gates",
  "Real Telegram bot ownership, HTTPS webhook hosting, production secrets, source ownership, and real provider behavior remain deferred",
  "Do not claim real Telegram/provider acceptance",
  "Do not claim live execution acceptance",
  "Stage 29J remains owner-accepted, closed, and frozen",
  "Stage 29I remains closed and frozen",
  "Stage 29G external Binance/Bybit acceptance remains deferred",
  "Stage 29H remains deferred/unstarted",
  "Stage 29L is owner-accepted, closed, and frozen",
  "Stage 29M remains unstarted and next",
];

for (const docPath of authoritativeDocs) {
  const source = read(docPath);
  includesAll(source, closureRequired, `${docPath} records Stage 29K owner acceptance closure, deferred external acceptance, and next-stage sequencing.`);
  excludesAll(
    source,
    [
      "Stage 29K Telegram Signal Ingestion And Controlled Bridge is implemented/source-QA ready for adviser review",
      "Status: implemented/source-QA ready for adviser review. Real Telegram/provider acceptance remains pending. Owner acceptance is not claimed.",
      "Stage 29K is implemented/source-QA ready",
      "Stage 29K owner acceptance remains pending",
    ],
    `${docPath} no longer describes Stage 29K as awaiting owner acceptance.`
  );
}

const combinedDocs = authoritativeDocs.map(read).join("\n");
includesAll(
  combinedDocs,
  [
    "default-disabled",
    "keyed opaque",
    "stores no raw Telegram message bodies",
    "Stage 29J Crypto/Forex routing paths",
    "Trade Copier billing",
    "kill-switch",
    "live-execution gates",
    "stage29k:qa",
    "stage29k:ingestion:qa",
  ],
  "Stage 29K closure preserves implementation evidence, privacy posture, routing gate evidence, and QA wiring."
);
excludesAll(
  combinedDocs,
  [
    "Real Telegram/provider acceptance is complete",
    "real Telegram/provider acceptance is complete",
    "live execution acceptance is complete",
    "Stage 29H started",
  ],
  "Stage 29K closure does not claim external provider, live execution, Stage 29M, or Stage 29H acceptance."
);

console.log("Stage 29K owner acceptance closure QA passed.");
