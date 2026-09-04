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
const browser = read("tests/browser/student-e2e.spec.mjs");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d10:qa"] === "node scripts/qa-stage29d10-practice-terminal-drawing-capture.mjs",
  "package.json exposes npm run stage29d10:qa."
);

const chartComponent = sectionBetween(terminal, "function TerminalChart", "function TerminalBody");

includesAll(chartComponent, [
  "placeDrawingFromChartCoordinates",
  "handleDrawingCapturePointerDown",
  "ReactPointerEvent<HTMLButtonElement>",
  "event.preventDefault()",
  "event.stopPropagation()",
  "chart.timeScale().coordinateToLogical(boundedX)",
  "series.coordinateToPrice(boundedY)",
  "priceScaleReservePx",
  "data-testid=\"practice-terminal-drawing-capture-layer\"",
  "data-practice-drawing-capture=\"active\"",
  "onPointerDown={handleDrawingCapturePointerDown}",
  "cursor-crosshair",
  "chart.subscribeClick(handleChartClick)"
], "Terminal chart has a dedicated Safari-safe drawing capture layer plus Lightweight Charts fallback.");

includesAll(chartComponent, [
  "kind: activeDrawingTool",
  "Math.max(0, Math.min(Math.round(Number(logical)), maxCandleIndex))",
  "Math.max(0, Math.min(Math.round((boundedX / drawableWidth) * maxCandleIndex), maxCandleIndex))",
  "onPlaceDrawing({"
], "Capture layer converts pointer coordinates into bounded candle/price placement data.");

includesAll(chartComponent, [
  'data-practice-drawing-kind="trend_line"',
  'data-practice-drawing-kind="horizontal_line"',
  'data-practice-drawing-kind="vertical_marker"',
  'data-practice-drawing-kind="zone"',
  'data-practice-drawing-kind="text_note"',
  'data-practice-drawing-kind="fibonacci_retracement"',
  'data-practice-drawing-kind="measurement_placeholder"'
], "Supported drawing overlays still render as selectable chart objects.");

const createFromChart = sectionBetween(
  terminal,
  "async function createTerminalDrawingFromChartPoint",
  "async function updateSelectedDrawing"
);

includesAll(createFromChart, [
  "requiresTwoChartPoints(placement.kind)",
  "setDrawingPlacementStart(boundedClickPoint)",
  "start selected. Click second point.",
  "setSelectedToolKind(placement.kind)",
  "setMobilePanelTab(\"objects\")"
], "One-click and two-click placement still persist through the existing drawing engine.");

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
  "Selected object"
], "Objects panel remains compact and selected-object focused after placement.");

includesAll(terminal, [
  "practice-terminal-chart-click-layer",
  "practice-terminal-drawing-capture-layer"
], "Terminal exposes chart click and drawing capture test hooks.");

includesAll(browser, [
  "practice-terminal-object-tree",
  "practice-terminal-quick-buy",
  "practice-terminal-quick-sell"
], "Student browser suite keeps object and quick-trade anchors.");

excludesAll(`${terminal}\n${browser}`, [
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
], "Stage 29D.10 adds no copied branding, live execution, private provider calls, AutoCopy coupling, or secret-bearing fields.");

includesAll(docs, [
  "Stage 29D.10: Practice Terminal Drawing Capture Reliability",
  "TH-2026-08-28-STAGE29D10-PRACTICE-TERMINAL-DRAWING-CAPTURE-HANDOFF",
  "capture layer",
  "Safari"
], "Roadmap, runbooks, backlog, complaint roadmap, and prompt summary record Stage 29D.10.");

console.log("Stage 29D.10 Practice terminal drawing capture reliability QA passed.");
