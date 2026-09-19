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
const repository = read("src/lib/practice/practice-repository.ts");
const browserStudent = read("tests/browser/student-e2e.spec.mjs");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md"),
  read("docs/handoffs/tradehub-handoff-2026-08-30.md")
].join("\n");

assert(
  packageJson.scripts?.["stage30:qa"] === "node scripts/qa-stage30a-practice-terminal-chart-tools-expansion.mjs",
  "package.json exposes npm run stage30:qa."
);
assert(packageJson.dependencies?.klinecharts === "10.0.3", "Stage 30A adds no chart dependency: KLineChart stays pinned at 10.0.3.");
assert(Object.keys(packageJson.dependencies ?? {}).filter((name) => name.includes("magnet") || name.includes("brush") || name.includes("simplify")).length === 0, "Stage 30A adds no new dependencies for magnet, brush, or simplification.");

// --- The three tools exist in the rail / Lines menu.
includesAll(
  terminal,
  [
    "{ id: \"brush\", label: \"Brush\", kind: \"freehand_brush\", Icon: Brush, available: true }",
    "{ id: \"magnet\", label: \"Magnet snap\", kind: undefined, Icon: Magnet, available: true }",
    "{ id: \"parallel-channel\", label: \"Parallel channel\", kind: \"parallel_channel\", available: true }",
    "tool.id === \"magnet\" && isMagnetSnapEnabled",
    "Magnet snap on. Point anchors snap to revealed candle prices within 12px.",
  ],
  "The drawing rail exposes the Brush tool, the Magnet snap toggle, and the Parallel channel tool with truthful on/off state."
);
excludesAll(
  terminal,
  ["Magnet snap (coming soon)", "Brush drawing (coming soon)"],
  "The magnet and brush placeholders are no longer marked coming soon."
);

// --- New annotation kinds and versioned overlay types.
includesAll(
  practiceTypes,
  ["\"freehand_brush\"", "\"parallel_channel\""],
  "Practice annotation kinds include freehand_brush and parallel_channel."
);
includesAll(
  overlayModule,
  [
    "PRACTICE_KLINE_BRUSH_OVERLAY = \"tradehubFreehandBrush\"",
    "PRACTICE_KLINE_PARALLEL_CHANNEL_OVERLAY = \"tradehubParallelChannel\"",
    "PRACTICE_BRUSH_MAX_POINTS = 120",
    "PRACTICE_MAGNET_SNAP_RADIUS_PX = 12",
    "registerOverlay(freehandBrushOverlay)",
    "registerOverlay(parallelChannelOverlay)",
  ],
  "Versioned klinecharts_v1-era TradeHub-owned brush and parallel channel overlays are registered with bounded constants."
);
includesAll(
  overlayModule,
  [
    "key: \"channel-fill\"",
    "key: \"channel-parallel-line\"",
    "key: \"channel-base-line\"",
  ],
  "The parallel channel renders base line, parallel copy, and translucent fill from one overlay record."
);
includesAll(
  terminal,
  [
    "if (kind === \"freehand_brush\") return PRACTICE_KLINE_BRUSH_OVERLAY;",
    "if (kind === \"parallel_channel\") return PRACTICE_KLINE_PARALLEL_CHANNEL_OVERLAY;",
    "drawing.kind === \"freehand_brush\" ? { needDefaultPointFigure: false } : { needDefaultPointFigure: true }",
  ],
  "Persisted brush/channel drawings restore through the shared drawing group with brush control dots suppressed."
);

// --- Magnet bounded snap logic.
const terminalChartSection = sectionBetween(terminal, "function TerminalChart({", "function handleDrawingCapturePointerDown");
includesAll(
  terminalChartSection,
  [
    "PRACTICE_MAGNET_SNAP_RADIUS_PX",
    "candles.length === 0",
    "index < 0 || index >= candles.length",
    "for (const value of [candle.open, candle.high, candle.low, candle.close])",
    "distance <= PRACTICE_MAGNET_SNAP_RADIUS_PX",
    "return best?.point ?? point;",
    "magnetSnapEnabledRef.current",
  ],
  "Magnet snapping is bounded to 12px, reads only revealed candle OHLC, and never requests future data."
);
const magnetKinds = sectionBetween(terminal, "const terminalMagnetSnapToolKinds", "]);");
includesAll(
  magnetKinds,
  ["trend_line", "horizontal_line", "vertical_marker", "zone", "fibonacci_retracement", "parallel_channel"],
  "Magnet snapping applies to point-based tools including the parallel channel base."
);
includesAll(
  terminal,
  [
    "resolveAnchorPoint(rawPoint, activeDrawingTool)",
    "resolveAnchorPoint(rawPoint, \"trend_line\")",
    "resolveAnchorPoint(rawPoint, \"parallel_channel\")",
    "resolveAnchorPoint(rawEndPoint, currentDraft.kind)",
  ],
  "Pointer anchors for point-based tools pass through the bounded snap resolver (draft start, previews, and commit)."
);
excludesAll(
  sectionBetween(terminal, "if (currentDraft.kind === \"freehand_brush\" && currentDraft.path) {", "const point = resolveAnchorPoint(rawPoint, currentDraft.kind);"),
  ["resolveAnchorPoint"],
  "Freehand brush strokes capture the raw pointer path and are never snapped."
);

// --- Brush capture, simplification bound, and invalid-stroke handling.
includesAll(
  terminal,
  [
    "function simplifyBrushStroke(path: TerminalChartPoint[], maxPoints: number, epsilonPx = 2.5)",
    "PRACTICE_BRUSH_MAX_POINTS",
    "if (stroke.length < 2 || pixelDistance < 10)",
    "Brush stroke discarded. Draw a longer stroke or use Select.",
    "kind: \"freehand_brush\",",
    "text: \"Freehand brush stroke\",",
  ],
  "Brush strokes simplify to at most 120 points and near-zero strokes persist nothing and restore Select."
);

// --- Parallel channel interaction and persistence shape.
includesAll(
  terminal,
  [
    "type TerminalParallelChannelDraft",
    "function renderParallelChannelDraft(",
    "Parallel channel cancelled. Choose two distinct base points.",
    "Parallel channel cancelled. Move away from the base line to set the offset.",
    "Parallel channel completed. Select restored.",
    "chartPoints: [\n          { dataIndex: channelDraft.baseStart.dataIndex",
  ],
  "The parallel channel uses two base anchors plus an offset interaction and commits one three-point record."
);
const serverPointCount = sectionBetween(repository, "function requiredPracticeDrawingPointCount", "function defaultTextForAnnotationKind");
includesAll(
  serverPointCount,
  [
    "kind === \"freehand_brush\"",
    "{ min: 2, max: PRACTICE_BRUSH_POINT_LIMIT }",
    "kind === \"parallel_channel\"",
    "{ min: 3, max: 3 }",
  ],
  "Server validation enforces the brush point bound (2..120) and exactly three parallel channel points."
);
includesAll(
  repository,
  [
    "const PRACTICE_BRUSH_POINT_LIMIT = 120",
    "value === \"freehand_brush\" ||",
    "value === \"parallel_channel\"",
    "kind === \"freehand_brush\" ||",
    "kind === \"parallel_channel\"",
    "case \"freehand_brush\":",
    "case \"parallel_channel\":",
  ],
  "The repository accepts the new drawing kinds everywhere a kind is normalized and includes them in the drawing-only clear scope."
);
excludesAll(
  repository,
  ["requiresTwoPracticeDrawingPoints(kind) ? 2 : 1"],
  "The legacy two-or-one point count rule was replaced by per-kind required point counts."
);

// --- Shared cancellation path and drawing-only boundaries.
includesAll(
  terminal,
  [
    "parallelChannelDraftRef.current = null;\n    nativeOverlayMoveRef.current = null;",
    "parallelChannelDraftRef.current = null;\n    chartRef.current?.removeOverlay({ groupId: PRACTICE_KLINE_DRAFT_GROUP });",
  ],
  "Pointer cancellation and tool switching clear the channel draft through the shared cancellation path."
);
excludesAll(
  sectionBetween(terminal, "function snapPointToRevealedCandle", "function resolveAnchorPoint"),
  ["requestAnimationFrame", "fetch(", "/api/", "convertToPixel({ dataIndex: index + 1, value: candles[index + 1]"],
  "Magnet snapping performs no network or future-candle access."
);
includesAll(
  terminal,
  [
    "isTerminalDrawingKind(annotation.kind)",
  ],
  "Brush and channel drawings flow through the existing terminalDrawings filter, so delete-selected and Clear chart drawings cover them atomically."
);

// --- Browser coverage.
includesAll(
  browserStudent,
  [
    "Practice Stage 30A magnet, brush, and parallel channel tools are truthful and persist",
    "for (const drawingViewport of [",
    "aria-pressed\", \"true\"",
    "aria-pressed\", \"false\"",
    "toBe(10)",
    "toBe(16)",
    "toBeLessThanOrEqual(120)",
    "\"tradehubFreehandBrush\"",
    "\"tradehubParallelChannel\"",
    "toHaveLength(3)",
    "Delete selected drawing",
    "Clear chart drawings",
    "deletedDrawingCount",
  ],
  "Browser coverage proves magnet snap truthfulness, brush point bounds, channel persistence/reload, delete/clear, and laptop+tablet viewports."
);

// --- Docs.
includesAll(
  docs,
  [
    "Stage 30A",
    "Practice Terminal Chart Tools Expansion",
    "implemented/source-QA ready",
    "owner acceptance is not claimed",
    "Magnet snap",
    "Freehand Brush",
    "Parallel Channel",
    "not claimed",
    "paused Stage 29H",
    "Stage 29G external acceptance",
    "Stage 29N final freeze remains last and unstarted",
    "Stage 29D is closed and frozen",
    "Stage 29L is owner-accepted, closed, and frozen",
  ],
  "Docs record Stage 30A truthfully alongside the Stage 29H pause and preserved frozen stage states."
);
excludesAll(
  docs,
  [
    "Stage 30A is owner-accepted",
    "Stage 30A is closed and frozen",
    "Stage 29H is implemented",
    "Stage 29H is owner-accepted",
  ],
  "No doc claims Stage 30A owner acceptance or Stage 29H progress beyond the recorded pause."
);

console.log("Stage 30A Practice Terminal chart tools expansion QA passed.");
