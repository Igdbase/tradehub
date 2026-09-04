import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

function includesAll(source, values, message) {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function excludesAll(source, values, message) {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
}

const packageJson = JSON.parse(read("package.json"));
const roadmap = read("complaint-resolution-roadmap.md");
const docsByPath = new Map([
  ["plan.md", read("plan.md")],
  ["complaint-resolution-roadmap.md", roadmap],
  ["manual-test-backlog.md", read("manual-test-backlog.md")],
  ["manual-demo-qa.md", read("manual-demo-qa.md")],
  ["prompt/promptsumary.md", read("prompt/promptsumary.md")],
  ["docs/handoffs/tradehub-handoff-2026-08-30.md", read("docs/handoffs/tradehub-handoff-2026-08-30.md")]
]);
const docs = [...docsByPath.values()].join("\n");

assert(
  packageJson.scripts?.["stage29d17:qa"] ===
    "node scripts/qa-stage29d17-practice-terminal-owner-acceptance-closure.mjs",
  "package.json exposes npm run stage29d17:qa."
);

assert(
  packageJson.scripts?.["stage29d16:qa"] === "node scripts/qa-stage29d16-practice-terminal-drawing-tools.mjs" &&
    packageJson.scripts?.["stage29d15:qa"] ===
      "node scripts/qa-stage29d15-practice-terminal-responsive-workstation.mjs",
  "Stage 29D.15 and Stage 29D.16 QA remain wired."
);

for (const [docPath, source] of docsByPath) {
  includesAll(source, [
    "Stage 29D.17",
    "31 August 2026",
    "owner-accepted",
    "closed",
    "frozen"
  ], `${docPath} records the Stage 29D.17 owner-accepted closure.`);
}

includesAll(docs, [
  "real Chrome and Safari",
  "KLineChart 10.0.3",
  "TradeHub-owned overlays",
  "Stage 29D.15",
  "Stage 29D.16"
], "Closure documentation records the accepted production architecture and real-browser evidence.");

includesAll(roadmap, [
  "### Stage 29E: Shared App Full-Preview Layout Stabilization",
  "### Stage 29F - Journal Product Redesign And Data Separation",
  "### Stage 29G - Crypto Journal Sync",
  "### Stage 29H - Forex And MT5 Journal Sync",
  "### Stage 29I - Copier Purchase And Account Setup Experience",
  "### Stage 29J - Signals Feed And TradeHub Signal Routing",
  "### Stage 29K - Telegram Signal Ingestion And Controlled Bridge",
  "### Stage 29L - Workspace Navigation And Focused Views",
  "### Stage 29M - Super Admin Navigation And Demo Account Reliability",
  "### Stage 29N - Responsive, Browser, Security, And Product Freeze"
], "The completed Stage 29E and remaining Stage 29F-N roadmap are reconciled.");

excludesAll(roadmap, [
  "### Stage 29E - Journal Product Redesign And Data Separation",
  "### Stage 29F - Crypto Journal Sync",
  "### Stage 29G - Forex And MT5 Journal Sync",
  "### Stage 29H - Copier Purchase And Account Setup Experience",
  "### Stage 29I - Signals Feed And TradeHub Signal Routing",
  "### Stage 29J - Telegram Signal Ingestion And Controlled Bridge",
  "### Stage 29K - Workspace Navigation And Focused Views",
  "### Stage 29L - Super Admin Navigation And Demo Account Reliability",
  "### Stage 29M - Responsive, Browser, Security, And Product Freeze"
], "The superseded Stage 29E-M complaint-roadmap numbering is absent.");

excludesAll(docs, [
  "Adviser/owner Safari/Chrome visual acceptance remains deferred",
  "Adviser/owner browser acceptance remains deferred",
  "Real Safari/Chrome adviser and owner visual acceptance remains pending",
  "Real Safari/Chrome adviser and owner visual acceptance remains deferred",
  "Owner Chrome/Safari visual acceptance remains pending",
  "Next planned stage: adviser/owner browser review of Stage 29D.16",
  "Owner should retest the Stage 29D.15 responsive shell",
  "Complete adviser/owner visual acceptance in real Safari and Chrome"
], "Current documentation no longer presents Stage 29D.15/29D.16 owner acceptance as pending.");

includesAll(docs, [
  "student-owned",
  "revealed-candle-only",
  "simulated-only",
  "No live execution",
  "AutoCopy",
  "hidden-candle"
], "Practice ownership, reveal, simulation, and execution boundaries remain documented.");

includesAll(docs, [
  "Stage 29D is frozen unless a new reproducible defect is reported",
  "Stage 29F is now owner-accepted, closed, and frozen",
  "Stage 29G",
  "Stage 29H remains unstarted"
], "Stage 29D remains frozen while later Stage 29F closure and Stage 29G/29H statuses are current.");

console.log("Stage 29D.17 Practice Terminal owner acceptance closure QA passed.");
