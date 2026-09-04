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
  packageJson.scripts?.["stage29d12:qa"] === "node scripts/qa-stage29d12-practice-terminal-clear-drawings-fib-declutter.mjs",
  "package.json exposes npm run stage29d12:qa."
);

const terminalTools = sectionBetween(terminal, "const terminalTools = [", "const TERMINAL_WARMUP_CANDLE_COUNT");
includesAll(terminalTools, [
  'label: "Clear chart drawings"',
  "Icon: Trash2",
  "available: true"
], "Left rail trash is labelled as a chart-wide drawing clear action.");
excludesAll(terminalTools, [
  'label: "Delete selected drawing"'
], "Old selected-delete rail label is removed.");

const deleteAll = sectionBetween(
  terminal,
  "const deleteAllTerminalDrawings = useCallback(async () => {",
  "useEffect(() => {"
);
includesAll(deleteAll, [
  "const deletableDrawings = drawings;",
  "const previousAnnotations = annotations;",
  "const deletedDrawingIds = new Set",
  "annotations: current.annotations.filter((annotation) => !deletedDrawingIds.has(annotation.annotationId))",
  "annotations: previousAnnotations",
  "All chart drawings cleared for this practice session."
], "Clear-all drawings removes every chart drawing optimistically and rolls back on failure.");
excludesAll(deleteAll, [
  "drawings.slice(0, 100)",
  "let latestResponse",
  "applyDrawingMutation(latestResponse)"
], "Clear-all drawing cleanup is not capped to a partial batch or synced only from the last delete response.");

const rail = sectionBetween(
  terminal,
  'data-testid="practice-terminal-left-tool-rail"',
  '<div className="flex min-h-0 min-w-0 flex-col">'
);
includesAll(rail, [
  "setIsDeleteMenuOpen(false)",
  "void deleteAllTerminalDrawings()"
], "Clicking the left rail trash immediately clears chart drawings.");
excludesAll(rail, [
  "setIsDeleteMenuOpen((current) => !current)"
], "Left rail trash no longer opens a delete menu instead of clearing the chart.");

const chart = sectionBetween(terminal, "function TerminalChart", "function TerminalBody");
includesAll(chart, [
  "const selectedTerminalDrawing = useMemo",
  "data-testid=\"practice-terminal-selected-drawing-chip\""
], "Chart shows only the selected drawing chip instead of a noisy drawing history strip.");
excludesAll(chart, [
  "terminalDrawings.slice(0, 3).map"
], "Chart no longer renders the old first-three drawing chip stack.");

includesAll(chart, [
  "const visibleLevelRows = levelRows.length",
  "data-practice-terminal-fib-label-mode={isSelected ? \"detailed\" : \"minimal\"}",
  "pointer-events-auto absolute z-10 text-left opacity-55",
  "pointer-events-auto absolute z-20 text-left focus:outline-none ring-1 ring-white/70",
  "fibonacciLevelColor(row.level)",
  "formatTerminalPrice(row.price)"
], "Fibonacci drawings render quiet unselected overlays and detailed selected labels only.");

includesAll(docs, [
  "Stage 29D.12",
  "TH-2026-08-28-STAGE29D12-PRACTICE-TERMINAL-CLEAR-DRAWINGS-FIB-DECLUTTER-HANDOFF",
  "clear all chart drawings",
  "selected Fibonacci"
], "Docs record the Stage 29D.12 drawing cleanup handoff.");

excludesAll(terminal, [
  "live broker/exchange execution"
], "Stage 29D.12 did not introduce live-execution language into the terminal component.");

console.log("Stage 29D.12 Practice Terminal clear-drawings/Fibonacci de-clutter QA passed.");
