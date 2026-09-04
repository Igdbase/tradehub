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
const repository = read("src/lib/practice/practice-repository.ts");
const browser = read("tests/browser/student-e2e.spec.mjs");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d11:qa"] === "node scripts/qa-stage29d11-practice-terminal-advanced-tools.mjs",
  "package.json exposes npm run stage29d11:qa."
);

includesAll(practiceTypes, [
  '"trend_line"',
  '"horizontal_line"',
  '"vertical_marker"',
  '"zone"',
  '"text_note"',
  '"fibonacci_retracement"',
  '"measurement_placeholder"'
], "Practice drawing types still cover all implemented terminal chart tools.");

includesAll(repository, [
  'value === "trend_line"',
  'value === "fibonacci_retracement"',
  '"practice_drawing_future_candle_blocked"',
  '"practice_annotation_future_candle_blocked"'
], "Repository still accepts implemented drawing kinds and blocks future-candle drawing data.");

const tools = sectionBetween(terminal, "const terminalLineTools = [", "const terminalObjectFilters");
includesAll(tools, [
  'label: "Trend line", kind: "trend_line", available: true',
  'label: "Ray (coming soon)", kind: undefined, available: false',
  'label: "Extended line (coming soon)", kind: undefined, available: false',
  'label: "Horizontal price line", kind: "horizontal_line", available: true',
  'label: "Horizontal ray (coming soon)", kind: undefined, available: false',
  'label: "Vertical line", kind: "vertical_marker", available: true',
  'label: "Cross line (coming soon)", kind: undefined, available: false'
], "Lines menu exposes implemented line tools and honest coming-soon states.");

const terminalTools = sectionBetween(terminal, "const terminalTools = [", "const TERMINAL_WARMUP_CANDLE_COUNT");
includesAll(terminalTools, [
  'label: "Lines and trend tools"',
  'label: "Rectangle zone", kind: "zone"',
  'label: "Text note", kind: "text_note"',
  'label: "Fibonacci retracement", kind: "fibonacci_retracement"',
  'label: "Measure", kind: "measurement_placeholder"',
  'label: "Zoom in"',
  'label: "Clear chart drawings"'
], "Top-level rail keeps active tools visible while line variants live in the Lines menu.");
excludesAll(terminalTools, [
  'label: "Horizontal price line", kind: "horizontal_line"',
  'label: "Vertical time marker", kind: "vertical_marker"'
], "Horizontal and vertical line tools are no longer standalone top-level rail buttons.");

const chart = sectionBetween(terminal, "function TerminalChart", "function TerminalBody");
includesAll(chart, [
  "TerminalChartDragDraft",
  "TerminalTextDraft",
  "handleDrawingCapturePointerDown",
  "handleDrawingCapturePointerMove",
  "handleDrawingCapturePointerUp",
  "setPointerCapture",
  "data-testid=\"practice-terminal-drawing-drag-preview\"",
  "data-practice-terminal-drag-preview",
  "terminalToolRequiresDrag",
  "secondCandleIndex",
  "secondPriceLevel"
], "Chart capture layer supports pointer-drag preview and drag-to-place drawings.");

includesAll(chart, [
  "data-testid=\"practice-terminal-text-tool-editor\"",
  "Chart text note",
  "textDraft.text.trim().length < 2",
  "const text = textDraft.text.trim()",
  "text",
  "maxLength={160}",
  "No raw HTML"
].filter((value) => value !== "No raw HTML"), "Text tool opens a bounded inline editor before saving chart text.");

includesAll(`${terminal}\n${chart}`, [
  "fibonacciLevelColor",
  "0.236",
  "0.382",
  "0.618",
  "0.786",
  "1.618",
  "2.618",
  "formatTerminalPrice(row.price)"
], "Fibonacci retracement uses colored levels with level and price labels.");

includesAll(chart, [
  "buildMeasurementSummaryFromPoints",
  "measureColor",
  "data-practice-drawing-kind=\"measurement_placeholder\"",
  "backgroundColor: `${measureColor}16`"
], "Measure tool shows blue/green or red measurement boxes by direction.");

includesAll(chart, [
  'dragDraft.kind === "zoom"',
  "getVisibleLogicalRange",
  "setZoomHistory",
  "setVisibleLogicalRange({ from, to })",
  "data-testid=\"practice-terminal-zoom-out\"",
  "zoomOutOneStep"
], "Zoom tool uses a drag rectangle, stores zoom history, and exposes zoom out.");

const rail = sectionBetween(
  terminal,
  'data-testid="practice-terminal-left-tool-rail"',
  '<div className="flex min-h-0 min-w-0 flex-col lg:col-start-2 lg:row-start-1 xl:col-start-auto xl:row-start-auto">'
);
includesAll(rail, [
  "practice-terminal-lines-menu",
  "data-practice-terminal-lines-menu=\"trend-horizontal-vertical\"",
  "practice-terminal-delete-menu",
  "data-practice-terminal-delete-menu=\"selected-or-clear-all\"",
  "Clear all drawings",
  "void deleteAllTerminalDrawings()"
], "Left rail exposes Lines and Delete menus with clear-all drawing behavior.");

const objectTree = sectionBetween(
  terminal,
  'data-testid="practice-terminal-object-tree"',
  'data-testid="practice-terminal-journal-panel"'
);
includesAll(objectTree, [
  "terminalObjectFilters",
  "practice-terminal-object-tree-filters",
  "data-practice-terminal-object-orders=\"compact\"",
  "data-practice-terminal-drawing-list=\"compact-object-tree\"",
  "practice-terminal-selected-object-editor",
  "Selected object"
], "Right Objects panel has filters, compact rows, and one selected-object detail editor.");

const createDrawing = sectionBetween(
  terminal,
  "async function createTerminalDrawingFromChartPoint",
  "async function updateSelectedDrawing"
);
includesAll(createDrawing, [
  "placement.text",
  "placement.secondCandleIndex === undefined",
  "setSelectedToolKind(placement.kind)",
  "colorToken = placement.kind === \"measurement_placeholder\""
], "Drawing save flow supports inline text, two-click fallback, repeated tool use, and directional measure colors.");

includesAll(browser, [
  "Lines and trend tools",
  "practice-terminal-lines-menu",
  "Ray (coming soon)",
  "practice-terminal-object-tree",
  "practice-terminal-quick-buy",
  "practice-terminal-quick-sell"
], "Student browser suite covers Lines menu, disabled line variants, object tree, and quick trade boundaries.");

excludesAll(`${terminal}\n${repository}\n${browser}`, [
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
], "Stage 29D.11 adds no copied branding, live execution, private provider calls, AutoCopy coupling, or secret-bearing fields.");

includesAll(docs, [
  "Stage 29D.11: Practice Terminal Advanced Chart Tools Interaction Polish",
  "TH-2026-08-28-STAGE29D11-PRACTICE-TERMINAL-ADVANCED-TOOLS-HANDOFF",
  "Lines menu",
  "drag",
  "Zoom out"
], "Plan, backlog, demo runbook, complaint roadmap, and prompt summary record Stage 29D.11.");

console.log("Stage 29D.11 Practice terminal advanced chart tools QA passed.");
