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
const practiceTypes = read("src/types/practice.ts");
const practiceRepository = read("src/lib/practice/practice-repository.ts");
const browser = read("tests/browser/student-e2e.spec.mjs");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d9:qa"] === "node scripts/qa-stage29d9-practice-terminal-chart-tools-engine.mjs",
  "package.json exposes npm run stage29d9:qa."
);

includesAll(practiceTypes, [
  '"trend_line"',
  '"fibonacci_retracement"',
  '"measurement_placeholder"'
], "Practice annotation types include trend, Fibonacci, and measure drawings.");

includesAll(practiceRepository, [
  'value === "trend_line"',
  'value === "fibonacci_retracement"',
  'return "Trend line"',
  'return "Fib retracement"',
  'return "Measure"',
  '"practice_annotation_future_candle_blocked"',
  '"practice_drawing_future_candle_blocked"'
], "Repository accepts new drawing kinds while preserving revealed-candle-only validation.");

includesAll(terminal, [
  "TerminalDrawingPlacementStart",
  "drawingPlacementStart",
  "requiresTwoChartPoints",
  "fibonacciRetracementLevels",
  "trend_line",
  "fibonacci_retracement",
  "buildMeasurementSummary",
  "editableKeyboardTarget"
], "Terminal contains a real multi-tool drawing engine.");

const tools = sectionBetween(terminal, "const terminalTools = [", "const TERMINAL_WARMUP_CANDLE_COUNT");
includesAll(tools, [
  'label: "Lines and trend tools"',
  'label: "Rectangle zone", kind: "zone"',
  'label: "Text note", kind: "text_note"',
  'label: "Fibonacci retracement", kind: "fibonacci_retracement"',
  'label: "Measure", kind: "measurement_placeholder"',
  "Brush drawing (coming soon)",
  "Magnet snap (coming soon)",
  "available: false"
], "Tool rail exposes working chart tools and keeps remaining unfinished tools disabled.");
const lineTools = sectionBetween(terminal, "const terminalLineTools = [", "const terminalObjectFilters");
includesAll(lineTools, [
  'label: "Trend line", kind: "trend_line"',
  'label: "Horizontal price line", kind: "horizontal_line"',
  'label: "Vertical line", kind: "vertical_marker"',
  "coming soon"
], "Line tools are grouped under the Lines menu with disabled future variants.");

const chartComponent = sectionBetween(terminal, "function TerminalChart", "function TerminalBody");
includesAll(chartComponent, [
  "chart.subscribeClick(handleChartClick)",
  "timeScale.timeToCoordinate",
  "series.priceToCoordinate",
  "series.coordinateToPrice",
  'data-practice-drawing-kind="trend_line"',
  'data-practice-drawing-kind="fibonacci_retracement"',
  'data-practice-drawing-kind="horizontal_line"',
  'data-practice-drawing-kind="vertical_marker"',
  'data-practice-drawing-kind="zone"',
  'data-practice-drawing-kind="text_note"',
  'data-practice-drawing-kind="measurement_placeholder"',
  "fibonacciRetracementLevels",
  "onSelectDrawing(drawing.annotationId)"
], "Chart renders selectable, timeScale-positioned overlays for real drawing tools.");

const createFromChart = sectionBetween(
  terminal,
  "async function createTerminalDrawingFromChartPoint",
  "async function updateSelectedDrawing"
);

includesAll(createFromChart, [
  "requiresTwoChartPoints(placement.kind)",
  "setDrawingPlacementStart(boundedClickPoint)",
  "start selected. Click second point.",
  "secondCandleIndex",
  "secondPriceLevel",
  "Math.max(0, Math.min(placement.candleIndex, currentIndex))",
  "setSelectedToolKind(placement.kind)",
  "setMobilePanelTab(\"objects\")"
], "Drawing placement supports one-click and two-click objects, clamps to revealed candles, and returns to Objects.");

const keyboard = sectionBetween(
  terminal,
  "function handleTerminalKeyboard",
  "window.addEventListener(\"keydown\", handleTerminalKeyboard)"
);

includesAll(keyboard, [
  'event.key === "Escape"',
  'event.key === "Delete"',
  'event.key === "Backspace"',
  "editableKeyboardTarget(event.target)",
  "setDrawingPlacementStart(null)",
  "setSelectedDrawingId(\"\")",
  "void deleteSelectedDrawing()"
], "Escape and Delete/Backspace keyboard interactions are wired safely.");

const objectPanel = sectionBetween(
  terminal,
  'data-testid="practice-terminal-object-tree"',
  'data-testid="practice-terminal-journal-panel"'
);

includesAll(objectPanel, [
  'data-practice-terminal-object-tree="compact-real-tools"',
  'data-practice-terminal-drawing-list="compact-object-tree"',
  'data-testid="practice-terminal-object-tree-row"',
  'data-testid="practice-terminal-selected-object-editor"',
  "Selected object",
  "Edit the focused chart object or delete it here.",
  "Drawing second candle index",
  "Drawing second price",
  "Delete selected"
], "Objects panel has compact rows and exactly one selected drawing editor.");

excludesAll(objectPanel, [
  "No drawings yet. Use the left toolbar, then click the chart to place one.",
  "Measure placeholder"
], "Objects panel no longer carries old placeholder-heavy drawing copy.");

const quickSubmit = sectionBetween(
  terminal,
  "async function submitQuickMarketOrder",
  "async function submitTerminalOrder"
);

excludesAll(quickSubmit, [
  "focusTerminalTicket",
  "openUtilityPanel(\"order\")"
], "Bottom Buy/Sell still submit quick simulated orders without opening the detailed popout.");

includesAll(browser, [
  "practice-terminal-open-order-ticket",
  "practice-terminal-quick-buy",
  "practice-terminal-quick-sell",
  "practice-terminal-object-tree",
  "practice-terminal-order-ticket"
], "Student browser suite still covers core terminal order and object surfaces.");

excludesAll(`${terminal}\n${practiceRepository}\n${browser}`, [
  "FX Replay",
  "fxreplay",
  "/api/v3/order",
  "/v5/order/create",
  "executeAutoCopy(",
  "submitLiveOrder(",
  "metaApiToken",
  "brokerPassword",
  "vaultRef",
  "rawProviderPayload",
  "Live order"
], "Stage 29D.9 adds no copied branding, live execution, private provider calls, AutoCopy coupling, or secret-bearing fields.");

includesAll(docs, [
  "Stage 29D.9: Professional Practice Terminal Chart Tools Engine",
  "TH-2026-08-28-STAGE29D9-PRACTICE-TERMINAL-CHART-TOOLS-ENGINE-HANDOFF",
  "Trend Line",
  "Fibonacci",
  "compact object tree"
], "Roadmap, runbooks, backlog, complaint roadmap, and prompt summary record Stage 29D.9.");

console.log("Stage 29D.9 Practice terminal chart tools engine QA passed.");
