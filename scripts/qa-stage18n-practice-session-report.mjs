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

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert(startIndex >= 0, `Found ${start}.`);
  assert(endIndex > startIndex, `Found ${end} after ${start}.`);

  return source.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const practiceTypes = read("src/types/practice.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const reportRoute = read("src/app/api/student/practice/sessions/[sessionId]/report/route.ts");
const reportPage = read("src/app/(student)/app/practice/[sessionId]/report/page.tsx");
const reportClient = read("src/components/student-app/student-practice-report-client.tsx");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const rules = read("firestore.rules");

const reportType = sliceBetween(
  practiceTypes,
  "export interface PracticeSessionReportResponse",
  "export interface RevealedPracticeCandlesResponse"
);
const reportFunction = sliceBetween(
  practiceRepo,
  "export async function getStudentPracticeSessionReport",
  "export async function createStudentPracticePlaybook"
);
const stage18nModules = [
  practiceTypes,
  practiceRepo,
  reportRoute,
  reportPage,
  reportClient,
  practiceClient,
  replayClient,
  terminalClient
].join("\n");

assert(
  packageJson.scripts?.["stage18n:qa"] === "node scripts/qa-stage18n-practice-session-report.mjs",
  "package.json exposes npm run stage18n:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18N - Practice Session Report And Print Review",
    "protected student report API and /app/practice/[sessionId]/report view",
    "Print / Save PDF using browser print only",
    "Do not generate PDFs server-side, store screenshots/PDFs, fetch hidden candles"
  ],
  "plan.md documents Stage 18N report scope and boundaries."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18N Practice Session Report And Print Review",
    "Open report from `/app/practice`.",
    "Open report from `/app/practice/[sessionId]`.",
    "Open report from `/app/practice/[sessionId]/terminal`.",
    "Print/save PDF through the browser print dialog only.",
    "Confirm active and completed sessions both render safely.",
    "Confirm no closed trades empty state appears",
    "Confirm report exposes no hidden candles"
  ],
  "manual-test-backlog.md records Stage 18N manual QA."
);

assertIncludesAll(
  reportType,
  [
    "PracticeSessionReportResponse",
    "generatedAt",
    "session: PracticeSessionSummary",
    "performance: PracticePerformanceSummary",
    "challengeStatus?: PracticeChallengeSummary",
    "playbookPerformance: PracticePlaybookPerformanceSummary[]",
    "closedOrders: PracticeOrderSummary[]",
    "bestTrade?: PracticeOrderSummary",
    "worstTrade?: PracticeOrderSummary",
    "annotations: PracticeAnnotationSummary[]",
    "drawings: PracticeAnnotationSummary[]",
    "eventLinkedNotes: PracticeAnnotationSummary[]",
    "mainLesson?: PracticeAnnotationSummary",
    "reflection?: PracticeSessionReflection",
    "assumptions: PracticePerformanceAssumptions",
    "reportLimit"
  ],
  "Practice types define a support-safe single-session report response."
);

assert(
  !reportType.includes("candles:") &&
    !reportType.includes("providerPayload") &&
    !reportType.includes("vaultRef") &&
    !reportType.includes("accountId") &&
    !reportType.includes("token"),
  "Practice report response does not expose candles, provider payloads, vault refs, account IDs, or tokens."
);

assertIncludesAll(
  practiceRepo,
  [
    "PRACTICE_REPORT_ORDER_LIMIT",
    "PRACTICE_REPORT_ANNOTATION_LIMIT",
    "listReportOrdersForSession",
    "listReportAnnotationsForSession",
    "getStudentPracticeSessionReport",
    "computePracticePerformanceSummary",
    "computePracticeChallengeStatus",
    "computePracticePlaybookPerformance",
    "normalizePracticePerformanceAssumptions",
    "Practice session reports are generated from bounded student-owned simulated practice records only.",
    "Print and Save PDF use the browser print dialog only"
  ],
  "Practice repository builds bounded student-scoped report data from simulated records only."
);

assert(
  !reportFunction.includes("fetchSessionCandles") &&
    !reportFunction.includes("fetchHistoricalCandlesWithCache") &&
    !reportFunction.includes("listVisibleEventsForSession") &&
    !reportFunction.includes("candles:") &&
    !reportFunction.includes("RevealedPracticeCandlesResponse"),
  "Practice report generation does not fetch or return hidden/revealed candle arrays."
);

assertIncludesAll(
  reportRoute,
  [
    "requireStudent(request)",
    "getStudentPracticeSessionReport",
    "apiJson",
    "apiError"
  ],
  "Practice report API route is protected by signed-in student auth and Admin SDK repository boundary."
);

assertIncludesAll(
  reportPage,
  [
    "StudentPracticeReportClient",
    "Practice Session Report",
    "/app/practice"
  ],
  "Practice report page exists at the student practice session route."
);

assertIncludesAll(
  reportClient,
  [
    "PracticeSessionReportResponse",
    `/api/student/practice/sessions/$\{encodeURIComponent(sessionId)\}/report`,
    "window.print()",
    "@media print",
    "@page",
    "practice-report-no-print",
    "practice-report-section",
    "Session Summary",
    "Practice Challenge",
    "Playbook Summary",
    "Closed Simulated Orders",
    "Best And Worst Trade",
    "Annotations, Drawings, And Events",
    "Reflection And Main Lesson",
    "Practice Assumptions",
    "No closed simulated trades yet",
    "No completed-session reflection has been saved yet"
  ],
  "Report client renders required sections, empty states, and browser print controls."
);

assert(
  !reportClient.includes("jsPDF") &&
    !reportClient.includes("html2canvas") &&
    !reportClient.includes("fetch(\"http") &&
    !reportClient.includes("fetch('http"),
  "Report client uses browser print only and does not call external/PDF/screenshot services."
);

assertIncludesAll(
  practiceClient,
  [
    `/app/practice/$\{encodeURIComponent(session.sessionId)\}/report`,
    "Report"
  ],
  "/app/practice session dashboard links to the printable report."
);

assertIncludesAll(
  replayClient,
  [
    `/app/practice/$\{encodeURIComponent(sessionId)\}/report`,
    "Report",
    "Open terminal"
  ],
  "Old replay route links to terminal and printable report while staying available."
);

assertIncludesAll(
  terminalClient,
  [
    `/app/practice/$\{encodeURIComponent(sessionId)\}/report`,
    "Report",
    "Printable report"
  ],
  "Practice terminal links to the printable report."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "practice_bookmarks",
    "historical_candle_cache",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for protected practice paths."
);

assert(
  !stage18nModules.includes("getForexDemoOrderPlacementAdapter") &&
    !stage18nModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !stage18nModules.includes("getExchangeOrderAdapter") &&
    !stage18nModules.includes("submitOrder(") &&
    !stage18nModules.includes("postTrade(") &&
    !stage18nModules.includes("private Binance") &&
    !stage18nModules.includes("private Bybit") &&
    !stage18nModules.includes("brokerPassword") &&
    !stage18nModules.includes("metaApiToken") &&
    !stage18nModules.includes("vaultRef") &&
    !stage18nModules.includes("rawProviderPayload") &&
    !stage18nModules.includes("apiSecret") &&
    !stage18nModules.includes("autocopy_internal"),
  "Stage 18N does not add forbidden execution/provider/private exchange/MetaAPI credential or AutoCopy internals."
);

assert(
  !stage18nModules.includes("jsPDF") &&
    !stage18nModules.includes("html2canvas") &&
    !stage18nModules.includes("captureScreenshot") &&
    !stage18nModules.includes("uploadBytes") &&
    !stage18nModules.includes("paid storage") &&
    !stage18nModules.includes("paid external"),
  "Stage 18N does not add server-side PDF generation, screenshots/uploads, paid storage, or paid external services."
);

console.log("Stage 18N practice session report and print review QA passed.");
