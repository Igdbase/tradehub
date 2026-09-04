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
const practiceTypes = read("src/types/practice.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const journalLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const journalUi = read("src/components/student-app/student-journal-client.tsx");
const cryptoTypes = read("src/types/crypto-execution.ts");
const annotationsRoute = read("src/app/api/student/practice/sessions/[sessionId]/annotations/route.ts");
const annotationRoute = read("src/app/api/student/practice/sessions/[sessionId]/annotations/[annotationId]/route.ts");
const rules = read("firestore.rules");

const practiceModules = [
  practiceTypes,
  practiceRepo,
  replayClient,
  journalLedger,
  journalUi,
  annotationsRoute,
  annotationRoute
].join("\n");
const annotationRecord = practiceTypes.slice(
  practiceTypes.indexOf("export interface PracticeAnnotationRecord"),
  practiceTypes.indexOf("export type PracticeAnnotationSummary")
);
const annotationRepo = practiceRepo.slice(practiceRepo.indexOf("async function unsetOtherMainLessons"));

assert(
  packageJson.scripts?.["stage17h:qa"] === "node scripts/qa-stage17h-practice-trade-annotations.mjs",
  "package.json exposes npm run stage17h:qa."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeAnnotationKind",
    "entry_note",
    "mistake_note",
    "structure_note",
    "support_resistance_zone",
    "chart_marker_note",
    "PracticeAnnotationRecord",
    "orderId?: string",
    "candleIndex?: number",
    "priceLevel?: number",
    "isMainLesson: boolean",
    "PracticeAnnotationMutationResponse",
    "PracticeAnnotationDeleteResponse",
    "annotations: PracticeAnnotationSummary[]",
    "mainLesson?: PracticeAnnotationSummary"
  ],
  "Practice types include text-only annotation records, targets, and mutation responses."
);

assertIncludesAll(
  practiceRepo,
  [
    "listAnnotationsForSession",
    "getPracticeAnnotationSnapshot",
    "normalizeAnnotationKind",
    "normalizeAnnotationText",
    "practice_annotation_future_candle_blocked",
    "candleIndex > input.session.currentCandleIndex",
    "getPracticeOrderSnapshot",
    "unsetOtherMainLessons",
    "createStudentPracticeAnnotation",
    "updateStudentPracticeAnnotation",
    "deleteStudentPracticeAnnotation",
    "No screenshots, PDFs, brokers, exchanges, or storage providers are called.",
    "buildCompletedSessionReview",
    "mainLesson: input.annotations.find"
  ],
  "Repository manages student-owned annotations, enforces currentCandleIndex bounds, and includes annotations in completed reviews."
);

assertIncludesAll(
  annotationsRoute,
  ["requireStudent", "getStudentPracticeSessionDetail", "createStudentPracticeAnnotation", "export async function GET", "export async function POST"],
  "Annotation collection route uses signed-in student/Admin SDK boundaries."
);

assertIncludesAll(
  annotationRoute,
  ["requireStudent", "updateStudentPracticeAnnotation", "deleteStudentPracticeAnnotation", "export async function PATCH", "export async function DELETE"],
  "Annotation item route supports edit/delete through signed-in student/Admin SDK boundaries."
);

assertIncludesAll(
  replayClient,
  [
    "annotationKindOptions",
    "Entry note",
    "Mistake note",
    "Structure note",
    "Support/resistance zone",
    "Screenshot-free chart marker",
    "Practice annotations",
    "Text-only review notes",
    "Add annotation",
    "Save annotation",
    "Delete",
    "Main lesson",
    "annotations={annotations}",
    "Review annotations",
    "No annotations were saved for this completed review.",
    "candle annotations cannot point beyond the current revealed index"
  ],
  "Replay UI renders annotation tools, side/overlay markers, edit/delete, main lesson, and completed-review annotations."
);

assertIncludesAll(
  `${journalLedger}\n${journalUi}\n${cryptoTypes}`,
  [
    "latestMainLesson",
    "mapPracticeMainLesson",
    "practice_annotations",
    "Latest practice main lesson",
    "PracticeAnnotationSummary"
  ],
  "Journal shows the latest completed-session main lesson under Practice/backtesting."
);

assertIncludesAll(
  rules,
  [
    "practice_annotations",
    "practice_sessions",
    "practice_orders",
    "historical_candle_cache",
    "allow read, write: if false;"
  ],
  "Firestore browser rules deny direct practice annotation/session/order/cache writes."
);

assert(
  !annotationRecord.includes("screenshotUrls") &&
    !annotationRecord.includes("pdf") &&
    !`${annotationRepo}\n${annotationsRoute}\n${annotationRoute}`.includes("screenshotUrls:") &&
    !`${annotationRepo}\n${replayClient}\n${annotationsRoute}\n${annotationRoute}`.includes("pdf") &&
    !`${annotationRepo}\n${replayClient}\n${annotationsRoute}\n${annotationRoute}`.includes("upload") &&
    !`${annotationRepo}\n${replayClient}\n${annotationsRoute}\n${annotationRoute}`.includes("paid storage"),
  "Stage 17H annotations do not add screenshot/PDF/upload/paid-storage surfaces."
);

assert(
  !practiceModules.includes("getForexDemoOrderPlacementAdapter") &&
    !practiceModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !practiceModules.includes("getExchangeOrderAdapter") &&
    !practiceModules.includes("submitOrder(") &&
    !practiceModules.includes("crypto-live-production") &&
    !practiceModules.includes("crypto-live-sandbox") &&
    !practiceModules.includes("forex-demo-execution") &&
    !practiceModules.includes("forex-live-canary-execution"),
  "Stage 17H annotation modules do not import or call AutoCopy/live execution adapters."
);

assert(
  !practiceModules.includes("apiSecret") &&
    !practiceModules.includes("brokerPassword") &&
    !practiceModules.includes("metaApiToken") &&
    !practiceModules.includes("credentialRefPath") &&
    !practiceModules.includes("rawProviderPayload") &&
    !practiceModules.includes("vaultRef") &&
    !practiceModules.includes("accountId"),
  "Stage 17H annotation modules do not expose secrets, account IDs, vault refs, or raw provider payloads."
);

console.log("Stage 17H practice trade annotations QA passed.");
