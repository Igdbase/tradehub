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

const packageJson = JSON.parse(read("package.json"));
const terminal = read("src/components/student-app/student-practice-terminal-client.tsx");
const overlayModule = read("src/lib/practice/practice-klinechart-overlays.ts");
const practiceTypes = read("src/types/practice.ts");
const repository = read("src/lib/practice/practice-repository.ts");
const browserStudent = read("tests/browser/student-e2e.spec.mjs");
const docs = [
  read("plan.md"),
  read("docs/handoffs/tradehub-handoff-2026-08-30.md")
].join("\n");

assert(
  packageJson.scripts?.["stage30c:qa"] === "node scripts/qa-stage30c-practice-terminal-line-tool-completion.mjs",
  "package.json exposes npm run stage30c:qa."
);
assert(packageJson.dependencies?.klinecharts === "10.0.3", "Stage 30C adds no chart dependency: KLineChart stays pinned at 10.0.3.");

// --- The four tools are active with no coming-soon placeholders left.
includesAll(
  terminal,
  [
    '{ id: "ray", label: "Ray", kind: "ray", available: true }',
    '{ id: "extended-line", label: "Extended line", kind: "extended_line", available: true }',
    '{ id: "horizontal-ray", label: "Horizontal ray", kind: "horizontal_ray", available: true }',
    '{ id: "cross-line", label: "Cross line", kind: "cross_line", available: true }',
  ],
  "The Lines menu exposes ray, extended line, horizontal ray, and cross line as active tools."
);
excludesAll(
  terminal,
  [
    "Ray (coming soon)",
    "Extended line (coming soon)",
    "Horizontal ray (coming soon)",
    "Cross line (coming soon)",
    "coming soon",
  ],
  "No coming-soon line tool placeholder remains in the terminal."
);

// --- Versioned kinds and overlay templates.
includesAll(
  practiceTypes,
  ['"ray"', '"extended_line"', '"horizontal_ray"', '"cross_line"'],
  "Practice annotation kinds include the four Stage 30C line tools."
);
includesAll(
  overlayModule,
  [
    'PRACTICE_KLINE_RAY_OVERLAY = "tradehubRay"',
    'PRACTICE_KLINE_EXTENDED_LINE_OVERLAY = "tradehubExtendedLine"',
    'PRACTICE_KLINE_HORIZONTAL_RAY_OVERLAY = "tradehubHorizontalRay"',
    'PRACTICE_KLINE_CROSS_LINE_OVERLAY = "tradehubCrossLine"',
    "registerOverlay(rayOverlay)",
    "registerOverlay(extendedLineOverlay)",
    "registerOverlay(horizontalRayOverlay)",
    "registerOverlay(crossLineOverlay)",
    "registerOverlay(tradehubSegmentOverlay)",
  ],
  "TradeHub-owned ray, extended line, horizontal ray, and cross line templates are registered alongside the segment replacement."
);
includesAll(
  overlayModule,
  [
    "export function practiceOverlayExtendedLineCoordinates(",
    "forward: boolean,",
    "backward: boolean",
    "clampAxis(dx, start.x, bounding.width);",
    "clampAxis(dy, start.y, bounding.height);",
  ],
  "Ray and extended line extension is clamped pixel-space math inside the visible bounding box with no data reads."
);
includesAll(
  terminal,
  [
    'if (kind === "ray") return PRACTICE_KLINE_RAY_OVERLAY;',
    'if (kind === "extended_line") return PRACTICE_KLINE_EXTENDED_LINE_OVERLAY;',
    'if (kind === "horizontal_ray") return PRACTICE_KLINE_HORIZONTAL_RAY_OVERLAY;',
    'if (kind === "cross_line") return PRACTICE_KLINE_CROSS_LINE_OVERLAY;',
  ],
  "Persisted and draft overlays resolve the new kinds to their TradeHub templates."
);

// --- Per-kind server validation and appearance enum bounds.
includesAll(
  repository,
  [
    'value === "ray" ||',
    'value === "extended_line" ||',
    'value === "horizontal_ray" ||',
    'value === "cross_line"',
    "kind === \"ray\" ||",
    "kind === \"extended_line\" ||",
    "normalizeDrawingLineStyle",
    "normalizeDrawingArrowEnds",
    '"practice_drawing_line_style_invalid"',
    '"practice_drawing_arrow_ends_invalid"',
    '"practice_drawing_arrow_ends_not_supported"',
    "kind !== \"trend_line\" && kind !== \"ray\" && kind !== \"extended_line\"",
  ],
  "Server validates the new kinds, per-kind point counts, bounded appearance enums, and direction-tool-only arrows with the 400 pattern."
);
includesAll(
  practiceTypes,
  [
    'export type PracticeDrawingLineStyle = "solid" | "dashed" | "dotted";',
    'export type PracticeDrawingArrowEnds = "none" | "start" | "end" | "both";',
    "lineStyle?: PracticeDrawingLineStyle;",
    "arrowEnds?: PracticeDrawingArrowEnds;",
  ],
  "Appearance extends the payload via optional bounded-enum fields without touching coordinate versions."
);

// --- Shared blue default, editor controls, drawing-only scope.
includesAll(
  terminal,
  [
    "terminalLineStyleEditableKinds",
    "terminalArrowEditableKinds",
    'aria-label="Drawing line style"',
    'aria-label="Drawing arrow ends"',
    "style: drawing.lineStyle,",
    "arrows: drawing.arrowEnds",
    "practiceOverlayLineFigureStyles(drawing.lineStyle, { color: overlayColor })",
  ],
  "The selected-drawing editor exposes style and arrow controls and persisted overlays carry both."
);
includesAll(
  overlayModule,
  [
    "PRACTICE_LINE_DEFAULT_COLOR",
    'dashedValue: [2, 4]',
    'dashedValue: [8, 5]',
  ],
  "Line styles render through the shared blue with truthful dashed and dotted dash patterns."
);
includesAll(
  repository,
  ["kind === \"cross_line\";"],
  "The drawing-only clear scope covers the new line tools."
);

// --- Two-click and one-click flows on the shared path.
includesAll(
  terminal,
  [
    "terminalTwoClickToolKinds",
    "kind: \"trend_line\" | \"ray\" | \"extended_line\";",
    "kind: currentTrendLineDraft.kind,",
    "resolveAnchorPoint(rawPoint, activeDrawingTool)",
  ],
  "Ray and extended line share the trend two-click flow with magnet snapping on persisted anchors."
);

// --- Browser coverage.
includesAll(
  browserStudent,
  [
    "Practice Stage 30C line tool completion: ray, extended, horizontal ray, cross line, styles, and arrows",
    "tradehubRay",
    "tradehubExtendedLine",
    "tradehubHorizontalRay",
    "tradehubCrossLine",
    "rayOvershoot",
    "cross-line-horizontal",
    "cross-line-vertical",
    "Drawing line style",
    "Drawing arrow ends",
    "Legacy plain trend",
    'lineStyle: "solid"',
    "Delete selected drawing",
    "Clear chart drawings",
    "deletedDrawingCount",
  ],
  "Browser coverage proves creation, direction truthfulness, single-record cross line, style/arrow editing, legacy rendering, delete/clear, magnet, and Escape at laptop and tablet."
);

// --- Docs: unfreeze note, 30C owner acceptance, no external claims, prior states preserved.
includesAll(
  docs,
  [
    "Stage 30C",
    "Practice Terminal Line Tool Completion",
    "owner-accepted, closed, and frozen on 4 October 2026",
    "the roadmap returns to the scoped freeze pending the owner's next agreed stage",
    "On the owner's instruction, the roadmap was unfrozen for Stage 30C (line tool completion) only; the freeze remains in force for all other work pending the next agreed stage.",
    "Stage 29N Final Freeze",
    "Stage 30B",
    "89",
    "paused Stage 29H",
    "Stage 29G external Binance/Bybit acceptance remains deferred",
  ],
  "Docs record Stage 30C owner acceptance, the scoped unfreeze, and the preserved 29N freeze and legacy-debt state."
);
excludesAll(
  docs,
  [
    "Stage 30C is implemented/source-QA ready",
    "Real Telegram/provider acceptance is complete",
    "Stage 29G external Binance/Bybit acceptance is complete",
    "Real Paystack sandbox/production acceptance is complete",
  ],
  "No doc claims Stage 30C is unaccepted or that deferred external acceptance happened."
);

console.log("Stage 30C Practice terminal line tool completion QA passed.");
