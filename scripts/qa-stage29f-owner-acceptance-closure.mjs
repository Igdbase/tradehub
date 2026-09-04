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
  packageJson.scripts?.["stage29f:closure:qa"] === "node scripts/qa-stage29f-owner-acceptance-closure.mjs",
  "package.json exposes npm run stage29f:closure:qa."
);
assert(
  packageJson.scripts?.["stage29f:qa"] === "node scripts/qa-stage29f-journal-redesign-data-separation.mjs",
  "Existing Stage 29F behavioral QA remains wired."
);

const closureRequired = [
  "Stage 29F",
  "3 September 2026",
  "owner-accepted",
  "closed",
  "frozen",
  "Stage 29G",
  "unstarted",
  "manual",
  "removed",
  "My Trades",
  "Backtesting",
  "Journal Sync",
  "Copier",
  "net `+1,452`",
  "101,452",
];

for (const docPath of authoritativeDocs) {
  const source = read(docPath);
  includesAll(source, closureRequired, `${docPath} records Stage 29F owner acceptance, closure, separation, and next-stage status.`);
  includesAll(
    source,
    ["TH-2026-09-03-STAGE29F-JOURNAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF"],
    `${docPath} records the Stage 29F closure handoff reference.`
  );
  excludesAll(
    source,
    [
      "final Stage 29F owner acceptance remains pending",
      "Stage 29F owner acceptance remains pending",
      "Final Stage 29F owner acceptance remains pending",
      "awaiting final owner acceptance",
    ],
    `${docPath} no longer says Stage 29F is awaiting owner acceptance.`
  );
}

const combinedDocs = authoritativeDocs.map(read).join("\n");
includesAll(
  combinedDocs,
  [
    "read-only",
    "manual trade-entry workflow",
    "My Trades",
    "Backtesting",
    "financially separate",
    "Journal Sync readiness is independent from Copier",
    "gross `+1,500` less `48` costs",
    "net `+1,452`",
    "final equity `101,452`",
    "Stage 29G",
  ],
  "Stage 29F closure preserves product, financial, sync, and numerical evidence."
);

console.log("Stage 29F owner acceptance closure QA passed.");
