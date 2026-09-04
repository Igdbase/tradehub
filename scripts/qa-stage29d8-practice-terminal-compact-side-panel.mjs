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

function sectionBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert(start >= 0, `Found section start ${startNeedle}.`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert(end > start, `Found section end ${endNeedle}.`);
  return source.slice(start, end);
}

const packageJson = JSON.parse(read("package.json"));
const terminal = read("src/components/student-app/student-practice-terminal-client.tsx");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d8:qa"] === "node scripts/qa-stage29d8-practice-terminal-compact-side-panel.mjs",
  "package.json exposes npm run stage29d8:qa."
);

includesAll(terminal, [
  "data-practice-terminal-tabs=\"compact-icon-tabs\"",
  "<span className=\"sr-only\">{tab.label}</span>",
  "data-practice-terminal-active-panel-title=\"true\"",
  "terminalMobilePanelTabs.find((tab) => tab.value === mobilePanelTab)?.fullLabel",
  "data-practice-terminal-compact-order-list=\"collapsed-until-selected\"",
  "data-testid=\"practice-terminal-order-summary-row\"",
  "Tap a short row or chart chip to open one simulated order.",
  "Only this simulated order is open. Show all returns to the short order list."
], "Right utility panel uses compact icon tabs, one active title, and collapsed order rows.");

const selectionState = sectionBetween(
  terminal,
  "const selectedOrder = orders.find",
  "const selectedDrawing = drawings.find"
);

includesAll(selectionState, [
  "const orderSummaryRows = selectedOrder ? [] : orders.slice(0, 20);",
  "const hiddenOrderRowCount = Math.max(0, orders.length - orderSummaryRows.length);",
  "const visibleOrderCards = selectedOrder ? [selectedOrder] : [];"
], "Full order cards render only after an order is selected.");

excludesAll(terminal, [
  "const visibleOrderCards = selectedOrder ? [selectedOrder] : orders.slice(0, 8);",
  "{orders.slice(0, 3).map((order) => ("
], "Old jampacked right-panel order previews are removed.");

includesAll(docs, [
  "Stage 29D.8: Practice Terminal Compact Side Panel",
  "TH-2026-08-28-STAGE29D8-PRACTICE-TERMINAL-COMPACT-SIDE-PANEL-HANDOFF",
  "short order rows",
  "one expanded order"
], "Plan, manual QA, demo QA, complaint roadmap, and prompt summary record Stage 29D.8.");

excludesAll(terminal, [
  "/api/v3/order",
  "/v5/order/create",
  "executeAutoCopy(",
  "submitLiveOrder(",
  "metaApiToken",
  "brokerPassword",
  "vaultRef",
  "rawProviderPayload",
  "Live order"
], "Stage 29D.8 adds no live execution, private provider calls, AutoCopy coupling, or secret-bearing fields.");

console.log("Stage 29D.8 Practice terminal compact side panel QA passed.");
