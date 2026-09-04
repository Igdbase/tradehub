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
const d13Qa = read("scripts/qa-stage29d13-practice-terminal-trendline-menu.mjs");
const browser = read("tests/browser/student-e2e.spec.mjs");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d14:qa"] === "node scripts/qa-stage29d14-practice-terminal-drawing-reliability.mjs",
  "package.json exposes npm run stage29d14:qa."
);

const chart = sectionBetween(terminal, "function TerminalChart", "function TerminalBody");
includesAll(chart, [
  "const dragDraftRef = useRef<TerminalChartDragDraft | null>(null);",
  "const setTerminalDragDraft = useCallback",
  "dragDraftRef.current = nextDraft;",
  "setDragDraft(nextDraft);",
  "ReactPointerEvent<HTMLDivElement>",
  "const currentDraft = dragDraftRef.current;",
  "setTerminalDragDraft({",
  "setTerminalDragDraft(null);",
  "setPointerCapture(event.pointerId)",
  "releasePointerCapture(event.pointerId)",
  "style={{ touchAction: \"none\" }}",
  "z-[60]",
  "activeDrawingTool !== \"select\" && !textDraft",
  "role=\"presentation\""
], "Drawing capture uses ref-backed drag state and an elevated pointer-safe capture layer.");

const captureLayer = sectionBetween(
  chart,
  "data-testid=\"practice-terminal-drawing-capture-layer\"",
  "textDraft ? ("
);
excludesAll(captureLayer, [
  "type=\"button\""
], "Drawing capture layer is no longer a button that can lose pointer intent.");

includesAll(chart, [
  "if (currentDraft.kind === \"zoom\")",
  "pixelDistance < 14",
  "timeScale.setVisibleLogicalRange({ from, to })",
  "terminalToolRequiresDrag(currentDraft.kind) && pixelDistance >= 10",
  "secondCandleIndex: endPoint.candleIndex",
  "secondPriceLevel: endPoint.priceLevel"
], "Zoom and drag-required drawings commit from the actual pointer-up draft.");

const selectTool = sectionBetween(
  terminal,
  "function selectDrawingTool(kind: TerminalActiveTool)",
  "const applyDrawingMutation"
);
includesAll(selectTool, [
  "setSelectedDrawingId(\"\")",
  "setSelectedOrderId(\"\")",
  "setDrawingPlacementStart(null)",
  "setSelectedToolKind(\"select\");",
  "setDrawingError(\"Reveal one candle before adding chart tools.\");",
  "Reveal one candle before adding chart tools."
], "Tool selection resets stale state and fails closed before candles are revealed.");

const deleteAll = sectionBetween(
  terminal,
  "const deleteAllTerminalDrawings = useCallback(async () => {",
  "useEffect(() => {"
);
includesAll(deleteAll, [
  "const deletableDrawings = drawings;",
  "const previousAnnotations = annotations;",
  "setSelectedDrawingId(\"\");",
  "setSelectedOrderId(\"\");",
  "setSelectedToolKind(\"select\");",
  "setIsLinesMenuOpen(false);",
  "annotations: current.annotations.filter((annotation) => !deletedDrawingIds.has(annotation.annotationId))",
  "annotations: previousAnnotations",
  "All chart drawings cleared for this practice session."
], "Clear chart drawings resets active tool state and removes only tool-created drawings.");
excludesAll(deleteAll, [
  "/orders/",
  "/bookmarks/",
  "/events/",
  "/candles",
  "/complete",
  "/report"
], "Clear chart drawings does not touch orders, bookmarks, events, candles, completion, or reports.");

const linesButton = sectionBetween(
  terminal,
  "if (tool.id === \"lines\")",
  "if (tool.id === \"zoom\")"
);
includesAll(linesButton, [
  "setSelectedToolKind(\"select\");",
  "setSelectedDrawingId(\"\");",
  "setSelectedOrderId(\"\");",
  "setDrawingError(null);",
  "setDrawingPlacementStart(null);"
], "Opening the Lines menu clears stale active tool, selected object, and placement state before choosing a line tool.");

includesAll(d13Qa, [
  "dragDraftRef.current",
  "setTerminalDragDraft({",
  "ReactPointerEvent<HTMLDivElement>",
  "z-[60]"
], "Stage 29D.13 compatibility QA now watches the ref-backed drag implementation.");

includesAll(browser, [
  "Lines and trend tools",
  "practice-terminal-lines-menu",
  "Horizontal price line",
  "Vertical line"
], "Student browser suite still covers the Lines menu entry points.");

excludesAll(terminal, [
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
], "Stage 29D.14 adds no copied branding, live execution, private provider calls, AutoCopy coupling, or secret-bearing fields.");

includesAll(docs, [
  "Stage 29D.14: Practice Terminal Drawing Reliability Patch",
  "TH-2026-08-29-STAGE29D14-PRACTICE-TERMINAL-DRAWING-RELIABILITY-HANDOFF",
  "ref-backed drag state",
  "elevated drawing capture layer",
  "clear chart drawings"
], "Plan, backlog, demo runbook, complaint roadmap, and prompt summary record Stage 29D.14.");

console.log("Stage 29D.14 Practice terminal drawing reliability QA passed.");
