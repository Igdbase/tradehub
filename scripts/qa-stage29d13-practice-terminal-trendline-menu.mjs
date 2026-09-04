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
const d12Qa = read("scripts/qa-stage29d12-practice-terminal-clear-drawings-fib-declutter.mjs");
const d11Qa = read("scripts/qa-stage29d11-practice-terminal-advanced-tools.mjs");
const browser = read("tests/browser/student-e2e.spec.mjs");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d13:qa"] === "node scripts/qa-stage29d13-practice-terminal-trendline-menu.mjs",
  "package.json exposes npm run stage29d13:qa."
);

includesAll(practiceTypes, [
  '"trend_line"',
  '"horizontal_line"',
  '"vertical_marker"',
  '"fibonacci_retracement"',
  '"measurement_placeholder"'
], "Practice annotation types still include all terminal drawing tools.");

includesAll(repository, [
  'value === "trend_line"',
  'value === "horizontal_line"',
  'value === "vertical_marker"',
  '"practice_drawing_future_candle_blocked"',
  '"practice_annotation_future_candle_blocked"'
], "Repository keeps drawing kinds and revealed-candle validation intact.");

const tools = sectionBetween(terminal, "const terminalTools = [", "const TERMINAL_WARMUP_CANDLE_COUNT");
includesAll(tools, [
  'label: "Lines and trend tools"',
  'label: "Clear chart drawings"',
  'Icon: Trash2',
  'label: "Rectangle zone"',
  'label: "Text note"',
  'label: "Fibonacci retracement"',
  'label: "Measure"'
], "Primary rail keeps one Lines tool and the chart drawing actions.");
excludesAll(tools, [
  'label: "Horizontal price line", kind: "horizontal_line"',
  'label: "Vertical line", kind: "vertical_marker"',
  'label: "Trend line", kind: "trend_line"'
], "Trend, Horizontal, and Vertical line variants are not standalone primary rail buttons.");

const lineTools = sectionBetween(terminal, "const terminalLineTools = [", "const terminalObjectFilters");
includesAll(lineTools, [
  'label: "Trend line", kind: "trend_line", available: true',
  'label: "Horizontal price line", kind: "horizontal_line", available: true',
  'label: "Vertical line", kind: "vertical_marker", available: true',
  'label: "Ray (coming soon)", kind: undefined, available: false',
  'label: "Extended line (coming soon)", kind: undefined, available: false',
  'label: "Cross line (coming soon)", kind: undefined, available: false'
], "Lines menu contains implemented line tools and honest disabled future variants.");

const chart = sectionBetween(terminal, "function TerminalChart", "function TerminalBody");
includesAll(chart, [
  "const dragDraftRef = useRef<TerminalChartDragDraft | null>(null);",
  "const setTerminalDragDraft = useCallback",
  "dragDraftRef.current",
  "handleDrawingCapturePointerDown",
  "handleDrawingCapturePointerMove",
  "handleDrawingCapturePointerUp",
  "ReactPointerEvent<HTMLDivElement>",
  "setPointerCapture(event.pointerId)",
  "releasePointerCapture(event.pointerId)",
  "setTerminalDragDraft({",
  "current: point",
  "z-[60]",
  "data-testid=\"practice-terminal-drawing-drag-preview\"",
  'dragDraft.kind === "trend_line"',
  "pixelDistance >= 10",
  "secondCandleIndex: endPoint.candleIndex",
  "secondPriceLevel: endPoint.priceLevel"
], "Trend Line uses explicit pointer down/move/up drag capture and saves the drag start/end points.");

includesAll(chart, [
  "if (isTerminalDrawingKind(activeDrawingTool) && terminalToolRequiresDrag(activeDrawingTool))",
  "return;",
  "chart.subscribeClick(handleChartClick)"
], "Drag tools do not rely on the old click-only chart subscription path.");

includesAll(chart, [
  'data-practice-drawing-kind="trend_line"',
  'data-practice-drawing-kind="horizontal_line"',
  'data-practice-drawing-kind="vertical_marker"',
  'timeScale.timeToCoordinate',
  'series.priceToCoordinate',
  'group-hover:opacity-100',
  'group-focus:opacity-100'
], "Saved line drawings are time/price positioned and labels stay quiet until selected or hovered.");

const selectTool = sectionBetween(
  terminal,
  "function selectDrawingTool(kind: TerminalActiveTool)",
  "const applyDrawingMutation"
);
includesAll(selectTool, [
  "setSelectedDrawingId(\"\")",
  "setSelectedOrderId(\"\")",
  "setDrawingPlacementStart(null)",
  "Unlock chart drawings before placing a new object.",
  "Drag on the chart, preview, then release."
], "Tool switching clears stale selected-object state and locked drawings fail with clear copy.");

const createDrawing = sectionBetween(
  terminal,
  "async function createTerminalDrawingFromChartPoint",
  "async function updateSelectedDrawing"
);
includesAll(createDrawing, [
  "setSelectedToolKind(placement.kind)",
  "setSelectedDrawingId(response.annotation.annotationId)",
  "secondCandleIndex",
  "secondPriceLevel"
], "Drawing save keeps the active tool available for repeated trendline creation.");

const deleteAll = sectionBetween(
  terminal,
  "const deleteAllTerminalDrawings = useCallback(async () => {",
  "useEffect(() => {"
);
includesAll(deleteAll, [
  "const deletableDrawings = drawings;",
  "const previousAnnotations = annotations;",
  "annotations: current.annotations.filter((annotation) => !deletedDrawingIds.has(annotation.annotationId))",
  "annotations: previousAnnotations",
  "All chart drawings cleared for this practice session."
], "Clear-all deletes all tool-created drawings optimistically and rolls back on failure.");
excludesAll(deleteAll, [
  "/orders/",
  "/bookmarks/",
  "/events/",
  "/candles",
  "/complete",
  "/report"
], "Clear-all drawing cleanup does not touch orders, bookmarks, events, candles, session completion, or reports.");

const rail = sectionBetween(
  terminal,
  'data-testid="practice-terminal-left-tool-rail"',
  '<div className="flex min-h-0 min-w-0 flex-col lg:col-start-2 lg:row-start-1 xl:col-start-auto xl:row-start-auto">'
);
includesAll(rail, [
  "practice-terminal-lines-menu",
  "data-practice-terminal-lines-menu=\"trend-horizontal-vertical\"",
  "setSelectedDrawingId(\"\")",
  "setSelectedOrderId(\"\")",
  "void deleteAllTerminalDrawings()"
], "Lines menu opens without creating drawings, and the main trash action clears chart drawings.");

const objectPanel = sectionBetween(
  terminal,
  'data-testid="practice-terminal-object-tree"',
  'data-testid="practice-terminal-journal-panel"'
);
includesAll(objectPanel, [
  "drawingObjectTypeLabel(drawing.kind)",
  "practice-terminal-drawing-list=\"compact-object-tree\"",
  "practice-terminal-selected-object-editor",
  "Choose a drawing tool, then draw on the chart.",
  "No object",
  "Delete selected"
], "Objects panel lists created line tools separately and avoids stale selected-object copy.");
excludesAll(objectPanel, [
  "Select a drawing tool, then click the revealed chart area.",
  "Text note</Badge>"
], "Old confusing selected-object guidance is removed.");

includesAll(browser, [
  "Lines and trend tools",
  "practice-terminal-lines-menu",
  "Horizontal price line",
  "Vertical line",
  "Ray (coming soon)"
], "Student browser suite still opens and checks the Lines menu.");

includesAll(`${d12Qa}\n${d11Qa}`, [
  "stage29d12:qa",
  "stage29d11:qa"
], "Stage 29D.13 preserves the previous chart-tool acceptance scripts.");

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
], "Stage 29D.13 adds no copied branding, live execution, private provider calls, AutoCopy coupling, or secret-bearing fields.");

includesAll(docs, [
  "Stage 29D.13: Practice Terminal Trendline Interaction And Line Tool Menu Fix",
  "TH-2026-08-28-STAGE29D13-PRACTICE-TERMINAL-TRENDLINE-MENU-HANDOFF",
  "drag-to-draw",
  "Lines menu",
  "clear all chart drawings"
], "Plan, backlog, demo runbook, complaint roadmap, and prompt summary record Stage 29D.13.");

console.log("Stage 29D.13 Practice terminal trendline/menu QA passed.");
