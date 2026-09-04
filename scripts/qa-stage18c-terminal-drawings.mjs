import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function assertIncludesAll(source, expected, message) {
  const missing = expected.filter((entry) => !source.includes(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const practiceTypes = read("src/types/practice.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const drawingsRoute = read("src/app/api/student/practice/sessions/[sessionId]/drawings/route.ts");
const drawingRoute = read("src/app/api/student/practice/sessions/[sessionId]/drawings/[drawingId]/route.ts");
const journalLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const journalUi = read("src/components/student-app/student-journal-client.tsx");
const rules = read("firestore.rules");

const drawingModules = [
  practiceTypes,
  practiceRepo,
  terminalClient,
  drawingsRoute,
  drawingRoute,
  journalLedger,
  journalUi
].join("\n");
const drawingExecutionBoundaryModules = [
  practiceTypes,
  terminalClient,
  drawingsRoute,
  drawingRoute
].join("\n");
const drawingRecord = practiceTypes.slice(
  practiceTypes.indexOf("export interface PracticeAnnotationRecord"),
  practiceTypes.indexOf("export type PracticeAnnotationSummary")
);

assert(
  packageJson.scripts?.["stage18c:qa"] === "node scripts/qa-stage18c-terminal-drawings.mjs",
  "package.json exposes npm run stage18c:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18C - Drawing Tools And Chart Annotation Layer",
    "Store only safe drawing metadata",
    "Enforce server-side ownership and no future candle references beyond currentCandleIndex.",
    "Do not store screenshots or uploaded image files."
  ],
  "plan.md documents the Stage 18C practice drawing boundary."
);

assertIncludesAll(
  practiceTypes,
  [
    "horizontal_line",
    "vertical_marker",
    "zone",
    "text_note",
    "measurement_placeholder",
    "drawingId?: string",
    "secondCandleIndex?: number",
    "secondPriceLevel?: number",
    "label?: string",
    "colorToken?: PracticeDrawingColorToken"
  ],
  "Practice annotation model stores safe terminal drawing metadata."
);

assertIncludesAll(
  practiceRepo,
  [
    "normalizeDrawingColorToken",
    "defaultTextForAnnotationKind",
    "practice_drawing_future_candle_blocked",
    "secondCandleIndex !== undefined && secondCandleIndex > input.session.currentCandleIndex",
    "assertPracticeSessionMutable(session)",
    "createStudentPracticeDrawing",
    "updateStudentPracticeDrawing",
    "deleteStudentPracticeDrawing",
    "unsetOtherMainLessons",
    "completedReviewForSession"
  ],
  "Repository has drawing helpers, future-candle rejection, completed-session locks, and main-lesson review integration."
);

assertIncludesAll(
  drawingsRoute,
  ["requireStudent", "getStudentPracticeSessionDetail", "createStudentPracticeDrawing", "drawings: detail.annotations", "export async function GET", "export async function POST"],
  "Drawing collection route is student-owned and server-routed."
);

assertIncludesAll(
  drawingRoute,
  ["requireStudent", "updateStudentPracticeDrawing", "deleteStudentPracticeDrawing", "export async function PATCH", "export async function DELETE"],
  "Drawing item route supports server-routed edit/delete."
);

assertIncludesAll(
  terminalClient,
  [
    "Horizontal price line",
    "Vertical time marker",
    "Rectangle zone",
    "Text note",
    "Measurement placeholder",
    "Delete selected",
    "drawingKindOptions",
    "Drawings / Notes",
    "Add drawing",
    "Save drawing",
    "Delete selected",
    "selectedDrawingId",
    "onSelectDrawing={setSelectedDrawingId}",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/drawings",
    "/drawings/${encodeURIComponent(selectedDrawing.annotationId)}"
  ],
  "Terminal toolbar and right drawer support drawing create/select/edit/delete through protected drawing routes."
);

assertIncludesAll(
  terminalClient,
  [
    "createPriceLine",
    "drawing.kind === \"horizontal_line\"",
    "drawing.kind === \"zone\"",
    "Vertical marker",
    "Zone overlay TODO: approximate line/list rendering",
    "revealed?.candles ?? []"
  ],
  "Terminal chart renders horizontal/zone price lines and safe overlay/list markers from revealed candle state."
);

assertIncludesAll(
  `${journalLedger}\n${journalUi}`,
  [
    "latestMainLesson",
    "horizontal_line",
    "vertical_marker",
    "zone",
    "text_note",
    "measurement_placeholder",
    "Latest practice main lesson"
  ],
  "Main-lesson drawings surface safely in completed review/journal paths."
);

assertIncludesAll(
  rules,
  [
    "practice_annotations",
    "practice_drawings",
    "allow read, write: if false;"
  ],
  "Firestore browser rules deny direct drawing/annotation storage access."
);

assertIncludesAll(
  terminalClient,
  [
    "formatCompactFinancial",
    "return `${sign}${Number((absolute / 1_000).toFixed",
    "label=\"Start\"",
    "label=\"Equity\"",
    "label=\"Realized\"",
    "label=\"Unreal\""
  ],
  "Terminal bottom bar uses compact financial formatting and compact labels."
);

assert(
  !terminalClient.includes(".toFixed(2)} />") &&
    !terminalClient.includes("label=\"Unreal.\"") &&
    !terminalClient.includes("value={(session?.startingBalance ?? 0).toFixed(2)}") &&
    !terminalClient.includes("value={currentBalance.toFixed(2)}"),
  "Terminal bottom bar no longer renders long raw/truncating financial values."
);

assert(
  !drawingExecutionBoundaryModules.includes("getForexDemoOrderPlacementAdapter") &&
    !drawingExecutionBoundaryModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !drawingExecutionBoundaryModules.includes("getExchangeOrderAdapter") &&
    !drawingExecutionBoundaryModules.includes("submitOrder(") &&
    !drawingExecutionBoundaryModules.includes("private Binance") &&
    !drawingExecutionBoundaryModules.includes("private Bybit") &&
    !drawingExecutionBoundaryModules.includes("metaApiToken") &&
    !drawingExecutionBoundaryModules.includes("brokerPassword") &&
    !drawingExecutionBoundaryModules.includes("accountId") &&
    !drawingExecutionBoundaryModules.includes("vaultRef") &&
    !drawingExecutionBoundaryModules.includes("rawProviderPayload") &&
    !drawingExecutionBoundaryModules.includes("AutoCopy"),
  "Stage 18C drawing modules do not add forbidden execution/provider/private exchange/MetaAPI credential code."
);

assert(
  !`${drawingRecord}\n${terminalClient}\n${drawingsRoute}\n${drawingRoute}`.includes("screenshotUrls") &&
    !`${drawingRecord}\n${terminalClient}\n${drawingsRoute}\n${drawingRoute}`.includes("pdf") &&
    !`${drawingRecord}\n${terminalClient}\n${drawingsRoute}\n${drawingRoute}`.includes("upload") &&
    !`${drawingRecord}\n${terminalClient}\n${drawingsRoute}\n${drawingRoute}`.includes("paid storage") &&
    !`${drawingRecord}\n${terminalClient}\n${drawingsRoute}\n${drawingRoute}`.includes("WhatsApp") &&
    !`${drawingRecord}\n${terminalClient}\n${drawingsRoute}\n${drawingRoute}`.includes("SMS"),
  "Stage 18C drawings do not add screenshots, PDFs, uploads, paid storage, or messaging integrations."
);

console.log("Stage 18C terminal drawings QA passed.");
