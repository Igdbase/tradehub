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
  packageJson.scripts?.["stage29l:closure:qa"] === "node scripts/qa-stage29l-owner-acceptance-closure.mjs",
  "package.json exposes npm run stage29l:closure:qa."
);
assert(
  packageJson.scripts?.["stage29l:qa"] === "node scripts/qa-stage29l-workspace-navigation-focused-views.mjs",
  "Existing Stage 29L behavioral/source QA remains wired."
);
assert(
  packageJson.scripts?.["stage29k:closure:qa"] === "node scripts/qa-stage29k-owner-acceptance-closure.mjs",
  "Stage 29K closure QA remains wired."
);
assert(
  packageJson.scripts?.["stage29j:closure:qa"] === "node scripts/qa-stage29j-owner-acceptance-closure.mjs",
  "Stage 29J closure QA remains wired."
);
assert(
  packageJson.scripts?.["stage29i:closure:qa"] === "node scripts/qa-stage29i-owner-acceptance-closure.mjs",
  "Stage 29I closure QA remains wired."
);
assert(
  packageJson.scripts?.["stage29f:closure:qa"] === "node scripts/qa-stage29f-owner-acceptance-closure.mjs",
  "Stage 29F closure QA remains wired."
);

const closureRequired = [
  "Stage 29L",
  "Workspace Navigation And Focused Views",
  "8 September 2026",
  "owner-accepted",
  "closed",
  "frozen",
  "TH-2026-09-08-STAGE29L-WORKSPACE-NAVIGATION-OWNER-ACCEPTANCE-CLOSURE-HANDOFF",
  "focused Workspace navigation",
  "concise Home",
  "all nine responsibility views",
  "direct routes",
  "browser history",
  "scoped loading",
  "responsive navigation",
  "Stage 29M remains unstarted and next",
  "Stage 29K is owner-accepted, closed, and frozen",
  "Stage 29J remains owner-accepted, closed, and frozen",
  "Stage 29I remains closed and frozen",
  "Stage 29F remains owner-accepted, closed, and frozen",
  "Stage 29G external Binance/Bybit acceptance remains deferred",
  "Stage 29H remains deferred/unstarted",
];

for (const docPath of authoritativeDocs) {
  const source = read(docPath);
  includesAll(source, closureRequired, `${docPath} records Stage 29L owner acceptance closure and sequencing.`);
  excludesAll(
    source,
    [
      "Stage 29L Workspace Navigation And Focused Views is implemented/source-QA ready and awaiting adviser review",
      "Stage 29L is implemented/source-QA ready pending adviser review",
      "Stage 29L is implemented/source-QA ready and awaiting adviser review",
      "Status: implemented/source-QA ready and awaiting adviser review. Owner acceptance is not claimed.",
      "Stage 29L owner acceptance remains pending",
    ],
    `${docPath} no longer describes Stage 29L as awaiting adviser or owner acceptance.`
  );
}

const combinedDocs = authoritativeDocs.map(read).join("\n");
includesAll(
  combinedDocs,
  [
    "stage29l:qa",
    "stage29l:closure:qa",
    "all nine workspace destinations",
    "Student and Signal post-mutation request isolation",
    "visible active nav geometry",
    "Stage 29K publication",
  ],
  "Stage 29L closure preserves implementation and QA evidence."
);
excludesAll(
  combinedDocs,
  [
    "Stage 29M is implemented",
    "Stage 29M is owner-accepted",
    "Stage 29M is closed and frozen",
    "Real Telegram/provider acceptance is complete",
    "Stage 29G external Binance/Bybit acceptance is complete",
  ],
  "Stage 29L closure does not start Stage 29M or overclaim deferred external acceptance."
);

console.log("Stage 29L owner acceptance closure QA passed.");
