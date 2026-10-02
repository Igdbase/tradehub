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
const overlayModule = read("src/lib/practice/practice-klinechart-overlays.ts");
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
assert(packageJson.dependencies?.klinecharts === "10.0.3", "The drawing engine stays on the pinned KLineChart 10.0.3.");

// --- Versioned drawing model.
includesAll(practiceTypes, [
  '"trend_line"',
  '"fibonacci_retracement"',
  '"measurement_placeholder"',
  '"freehand_brush"',
  '"parallel_channel"',
  '"klinecharts_v1"',
  '"klinecharts_v2"',
  "interface PracticeDrawingChartPoint"
], "Practice annotation types include the multi-tool drawing kinds and the versioned klinecharts_v1/v2 coordinate model.");

// --- TradeHub-owned overlay templates registered on the chart.
includesAll(overlayModule, [
  'PRACTICE_KLINE_TREND_OVERLAY = "segment"',
  'PRACTICE_KLINE_HORIZONTAL_OVERLAY = "tradehubHorizontalLine"',
  'PRACTICE_KLINE_VERTICAL_OVERLAY = "tradehubVerticalLine"',
  'PRACTICE_KLINE_FIBONACCI_OVERLAY = "tradehubBoundedFibonacci"',
  'PRACTICE_KLINE_ZONE_OVERLAY = "tradehubZone"',
  'PRACTICE_KLINE_MEASURE_OVERLAY = "tradehubDirectionalMeasure"',
  'PRACTICE_KLINE_TEXT_OVERLAY = "tradehubTextNote"',
  'PRACTICE_KLINE_BRUSH_OVERLAY = "tradehubFreehandBrush"',
  'PRACTICE_KLINE_PARALLEL_CHANNEL_OVERLAY = "tradehubParallelChannel"',
  "registerOverlay(horizontalLineOverlay)",
  "registerOverlay(verticalLineOverlay)",
  "registerOverlay(boundedFibonacciOverlay)",
  "registerOverlay(zoneOverlay)",
  "registerOverlay(directionalMeasureOverlay)",
  "registerOverlay(textNoteOverlay)",
  "registerOverlay(freehandBrushOverlay)",
  "registerOverlay(parallelChannelOverlay)",
  "PRACTICE_FIBONACCI_LEVELS"
], "The TradeHub overlays module owns and registers every drawing overlay template, including the bounded Fibonacci levels.");
includesAll(terminal, [
  "registerPracticeKLineChartOverlays",
  "practiceKLineOverlayName(drawing.kind)",
  "PRACTICE_KLINE_DRAWING_GROUP",
  "PRACTICE_KLINE_DRAFT_GROUP"
], "The terminal renders persisted and draft drawings through the registered TradeHub overlay templates.");

// --- Terminal multi-tool drawing engine (current klinecharts-era implementation).
includesAll(terminal, [
  "TerminalDrawingPlacementStart",
  "drawingPlacementStart",
  "requiresTwoChartPoints",
  "buildMeasurementSummary",
  "editableKeyboardTarget",
  "coordinateVersion: \"klinecharts_v2\""
], "Terminal contains a real multi-tool drawing engine committing versioned klinecharts_v2 chart points.");

// --- Per-kind server point-count validation and revealed-candle-only boundaries.
includesAll(practiceRepository, [
  'value === "trend_line"',
  'value === "fibonacci_retracement"',
  'value === "freehand_brush"',
  'value === "parallel_channel"',
  'return "Trend line"',
  'return "Fib retracement"',
  'return "Measure"',
  "requiredPracticeDrawingPointCount",
  "{ min: 2, max: PRACTICE_BRUSH_POINT_LIMIT }",
  "{ min: 3, max: 3 }",
  '"practice_annotation_future_candle_blocked"',
  '"practice_drawing_future_candle_blocked"'
], "Repository accepts every drawing kind with per-kind required point counts while preserving revealed-candle-only validation.");

// --- Shared cancellation path in the chart capture layer.
const cancellation = sectionBetween(
  terminal,
  "function handleDrawingCapturePointerCancel",
  "async function commitTextDraft"
);
includesAll(cancellation, [
  "releasePointerCapture",
  "dragDraftRef.current = null",
  "trendLineDraftRef.current = null",
  "parallelChannelDraftRef.current = null",
  "clearTextDraft()",
  "clearKLineDraft()",
  'onCancelTool("Drawing cancelled. Select restored.");'
], "Pointer cancellation clears every draft kind and restores Select through the shared cancellation path.");
includesAll(terminal, [
  "}, [activeDrawingTool]);"
], "Tool switching resets drafts through the same draft-clearing path.");

// --- Tool rail and Lines menu (current reality including the Stage 30A tools).
const tools = sectionBetween(terminal, "const terminalTools = [", "const TERMINAL_WARMUP_CANDLE_COUNT");
includesAll(tools, [
  'label: "Lines and trend tools"',
  'label: "Rectangle zone", kind: "zone"',
  'label: "Text note", kind: "text_note"',
  'label: "Brush", kind: "freehand_brush"',
  'label: "Fibonacci retracement", kind: "fibonacci_retracement"',
  'label: "Measure", kind: "measurement_placeholder"',
  'label: "Magnet snap"',
  'label: "Delete selected drawing"',
  'label: "Clear chart drawings"'
], "Tool rail exposes the working chart tools including the Stage 30A Brush and Magnet snap.");
const lineTools = sectionBetween(terminal, "const terminalLineTools = [", "const terminalObjectFilters");
includesAll(lineTools, [
  'label: "Trend line", kind: "trend_line"',
  'label: "Parallel channel", kind: "parallel_channel"',
  'label: "Horizontal price line", kind: "horizontal_line"',
  'label: "Vertical line", kind: "vertical_marker"',
  'label: "Ray", kind: "ray"',
  'label: "Extended line", kind: "extended_line"',
  'label: "Horizontal ray", kind: "horizontal_ray"',
  'label: "Cross line", kind: "cross_line"'
], "Line tools are grouped under the Lines menu with every Stage 30C variant active.");

// --- Placement flow: clamped to revealed candles, one- and two-click objects.
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
  "Math.max(0, Math.min(placement.candleIndex, currentIndex))"
], "Drawing placement supports one-click and two-click objects and clamps anchors to revealed candles.");

// --- Keyboard and object-tree surfaces.
const keyboard = sectionBetween(
  terminal,
  "function handleTerminalKeyboard",
  "window.addEventListener(\"keydown\", handleTerminalKeyboard)"
);
includesAll(keyboard, [
  'event.key === "Escape"',
  'event.key === "Delete"',
  'event.key === "Backspace"',
  "editableKeyboardTarget(event.target)"
], "Escape and Delete/Backspace keyboard interactions are wired safely.");

const objectPanel = sectionBetween(
  terminal,
  'data-testid="practice-terminal-object-tree"',
  'data-testid="practice-terminal-journal-panel"'
);
includesAll(objectPanel, [
  'data-practice-terminal-object-tree="compact-real-tools"',
  'data-testid="practice-terminal-selected-object-editor"',
  "Edit the focused chart object or delete it here.",
  "Delete selected"
], "Objects panel has compact rows and exactly one selected drawing editor.");

// --- Simulated-only quick orders remain decoupled from the drawing tools.
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

// Scoped to the terminal and repository sources: the browser spec legitimately contains
// secret-shaped strings inside its own negated forbidden-text assertions.
excludesAll(`${terminal}\n${practiceRepository}`, [
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
