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
  packageJson.scripts?.["stage29d7:qa"] === "node scripts/qa-stage29d7-practice-terminal-interactive-tools-history.mjs",
  "package.json exposes npm run stage29d7:qa."
);

includesAll(terminal, [
  "TerminalChartDrawingPlacement",
  "MouseEventParams",
  "chart.subscribeClick(handleChartClick)",
  "createTerminalDrawingFromChartPoint",
  "Click the chart to place it.",
  "data-active-drawing-tool={activeDrawingTool}"
], "Working chart tools are wired to click-to-place drawing creation.");

includesAll(terminal, [
  "practice-terminal-order-chip-list",
  "practice-terminal-order-chip",
  "orderChipStatusLabel",
  "order.direction.toUpperCase()",
  "Selected order",
  "Show all",
  "visibleOrderCards"
], "Order history is represented by compact selectable chart chips and selected-order detail.");

excludesAll(terminal, [
  "selected. Add it from Journal/Review.",
  "Open review tools",
  "No drawings yet. Use the left toolbar or this drawer to add text-only chart notes."
], "Old non-working Journal/Review placement copy is removed.");

const chartComponent = sectionBetween(
  terminal,
  "function TerminalChart",
  "function TerminalBody"
);

includesAll(chartComponent, [
  "positionedDrawings.map",
  "horizontal_line",
  "vertical_marker",
  "zone",
  "measurement_placeholder",
  "text_note",
  "onSelectDrawing(drawing.annotationId)"
], "Chart renders selectable overlays for supported saved drawing objects.");

const quickSubmit = sectionBetween(
  terminal,
  "async function submitQuickMarketOrder",
  "async function submitTerminalOrder"
);

excludesAll(quickSubmit, [
  "openUtilityPanel(\"order\")",
  "focusTerminalTicket"
], "Quick Buy/Sell still submits directly without opening the detailed order popout.");

includesAll(docs, [
  "Stage 29D.7: Practice Terminal Interactive Tools And Clean Order History",
  "TH-2026-08-28-STAGE29D7-PRACTICE-TERMINAL-INTERACTIVE-TOOLS-HISTORY-HANDOFF",
  "click the chart to place supported objects",
  "compact BUY/SELL order chips"
], "Roadmap, runbooks, backlog, complaint roadmap, and prompt summary record Stage 29D.7.");

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
], "Stage 29D.7 adds no live execution, private provider calls, AutoCopy coupling, or secret-bearing fields.");

console.log("Stage 29D.7 Practice terminal interactive tools and clean order history QA passed.");
