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
  packageJson.scripts?.["stage29d6:qa"] === "node scripts/qa-stage29d6-practice-terminal-quick-trade-tools.mjs",
  "package.json exposes npm run stage29d6:qa."
);

includesAll(terminal, [
  "buildQuickMarketOrderDraft",
  "alignTerminalPriceToTick",
  "terminalLevelsAreDirectional",
  "quick default SL/TP",
  "Quick Buy/Sell needs a valid revealed price and instrument size.",
  "bottomPreviewSize",
  "formatTerminalQuantity(bottomPreviewSize, instrumentSpec)"
], "Quick Buy/Sell now generates safe default SL/TP when the detailed ticket is empty.");

excludesAll(terminal, [
  "Quick Buy/Sell needs valid SL and TP values from the order setup.",
  "Set valid SL/TP values so the calculated simulated quantity is above zero."
], "Old quick-trade SL/TP blocking messages were removed.");

const quickSubmit = sectionBetween(
  terminal,
  "async function submitQuickMarketOrder",
  "async function submitTerminalOrder"
);

includesAll(quickSubmit, [
  "orderType: \"market\"",
  "direction,",
  "stopLoss: quickDraft.stopLoss",
  "takeProfit: quickDraft.takeProfit",
  "latestCandle.close",
  "usedAutoLevels"
], "Quick submit posts a market order with safe generated levels and latest revealed price context.");

excludesAll(quickSubmit, [
  "focusTerminalTicket",
  "openUtilityPanel(\"order\")"
], "Quick Buy/Sell still does not open the detailed order popout.");

const toolRail = sectionBetween(
  terminal,
  'data-testid="practice-terminal-left-tool-rail"',
  "<TerminalChart"
);

includesAll(toolRail, [
  "Chart drawings locked.",
  "Chart drawings unlocked.",
  "Chart drawings shown.",
  "Chart drawings hidden.",
  "disabled={isDisabled}"
], "Tool rail has visible feedback for working tools and disabled-state wiring.");

includesAll(terminal, [
  "Zoom selected. Drag a rectangle over the chart area.",
  "practice-terminal-zoom-out"
], "Terminal exposes a visible Zoom out control for drag zoom.");

includesAll(terminal, [
  "Brush drawing (coming soon)",
  "Magnet snap (coming soon)"
], "Remaining coming-soon tool labels remain clear and honest.");

includesAll(terminal, [
  "Cursor selected. Pick a chart object to review it.",
  "Reveal one candle before adding chart tools.",
  "Click the chart to place it."
], "Drawing tool selection gives feedback and opens the direct chart placement path.");

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
], "Quick-trade/tool feedback patch adds no live execution, private provider calls, AutoCopy coupling, or secret-bearing fields.");

includesAll(docs, [
  "Stage 29D.6: Practice Terminal Quick Trade And Tool Feedback Patch",
  "TH-2026-08-28-STAGE29D6-PRACTICE-TERMINAL-QUICK-TRADE-TOOLS-HANDOFF",
  "Quick Buy/Sell uses safe default SL/TP when the detailed ticket is empty",
  "Tool rail clicks now show visible feedback"
], "Roadmap, runbooks, backlog, complaint roadmap, and prompt summary record Stage 29D.6.");

console.log("Stage 29D.6 Practice terminal quick trade and tool feedback QA passed.");
