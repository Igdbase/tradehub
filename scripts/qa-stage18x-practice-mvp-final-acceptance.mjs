import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function assertExistsAll(paths, message) {
  const missing = paths.filter((entry) => !exists(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertIncludesAll(source, expected, message) {
  const missing = expected.filter((entry) => !source.includes(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertExcludesAll(source, forbidden, message) {
  const hits = forbidden.filter((entry) => source.includes(entry));
  assert(hits.length === 0, `${message}${hits.length ? ` Hits: ${hits.join(", ")}` : ""}`);
}

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert(startIndex >= 0, `Found source slice start marker: ${start}`);
  assert(endIndex > startIndex, `Found source slice end marker: ${end}`);

  return source.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const rules = read("firestore.rules");
const practiceTypes = read("src/types/practice.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const historicalService = read("src/lib/practice/historical-data-service.ts");
const instrumentSpecs = read("src/lib/practice/practice-instrument-specs.ts");
const fillEngine = read("src/lib/practice/practice-fill-engine.ts");
const analytics = read("src/lib/practice/practice-performance-analytics.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const reportClient = read("src/components/student-app/student-practice-report-client.tsx");
const journalClient = read("src/components/student-app/student-journal-client.tsx");
const workspaceInsights = read("src/components/workspace/workspace-practice-insights-section.tsx");
const workspaceAssignments = read("src/components/workspace/workspace-practice-assignments-section.tsx");
const exportRoute = read("src/app/api/student/practice/export/route.ts");
const importRoute = read("src/app/api/student/practice/import/playbooks/route.ts");

const clientPracticeSurfaces = [
  practiceClient,
  replayClient,
  terminalClient,
  reportClient,
  journalClient,
  workspaceInsights,
  workspaceAssignments
].join("\n");

const protectedPracticeSources = [
  practiceTypes,
  practiceRepo,
  historicalService,
  instrumentSpecs,
  fillEngine,
  analytics,
  exportRoute,
  importRoute
].join("\n");

assert(
  packageJson.scripts?.["stage18x:qa"] === "node scripts/qa-stage18x-practice-mvp-final-acceptance.mjs",
  "package.json exposes npm run stage18x:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18X - Practice MVP Final Acceptance And Deferred QA Closeout",
    "practice/backtesting MVP as source-QA frozen",
    "TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF",
    "Recommended next-stage options outside practice",
    "Practice/backtesting should not receive more major feature stages until browser demo QA is complete."
  ],
  "plan.md documents Stage 18X closeout, source-QA freeze, and next product-area options."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18X Practice MVP Final Acceptance And Deferred QA Closeout",
    "TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF",
    "Seeded login notes",
    "## Must Test Before Demo",
    "## Nice To Test",
    "## Later Regression",
    "Terminal event marker hover after pan/zoom.",
    "Assignment/cohort/feedback/resubmission flow.",
    "Import/export smoke."
  ],
  "manual-test-backlog.md organizes deferred manual QA into demo, nice-to-test, and later regression groups."
);

assertIncludesAll(
  manualBacklog,
  [
    "./node_modules/.bin/firebase emulators:start --project trade-hub-4d8df --only auth,firestore",
    "npm run stage15f:seed",
    "npm run stage15f:seed-auth",
    "npm run clean:next",
    "npm run dev:stage15f",
    "student_stage15f_binance_sandbox@example.test",
    "Stage15F!Pass123"
  ],
  "manual-test-backlog.md keeps exact local setup commands and seeded student login notes."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF",
    "Stage 18X - Practice MVP Final Acceptance And Deferred QA Closeout",
    "final practice MVP summary",
    "source-QA frozen",
    "what was added beyond the original MVP",
    "next product area should be chosen separately",
    "npm run stage18x:qa"
  ],
  "prompt summary sets the current stop to Stage 18X and explains the final practice MVP."
);

assertExistsAll(
  [
    "src/app/(student)/app/practice/page.tsx",
    "src/app/(student)/app/practice/[sessionId]/page.tsx",
    "src/app/(student)/app/practice/[sessionId]/terminal/page.tsx",
    "src/app/(student)/app/practice/[sessionId]/report/page.tsx",
    "src/app/(student)/app/journal/page.tsx",
    "src/app/(influencer)/workspace/page.tsx",
    "src/app/api/student/practice/playbooks/route.ts",
    "src/app/api/student/practice/sessions/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/candles/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/navigation/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/orders/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/orders/evaluate/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/close/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/partial-close/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/cancel/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/levels/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/finish/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/reflection/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/report/route.ts",
    "src/app/api/student/practice/analytics/route.ts",
    "src/app/api/student/practice/export/route.ts",
    "src/app/api/student/practice/import/playbooks/route.ts",
    "src/app/api/student/practice/assignments/route.ts",
    "src/app/api/student/practice/notifications/route.ts",
    "src/app/api/workspace/practice/insights/route.ts",
    "src/app/api/workspace/practice/assignments/route.ts",
    "src/app/api/workspace/practice/assignments/feedback/route.ts",
    "src/app/api/workspace/practice/cohorts/route.ts"
  ],
  "Final practice MVP routes and protected API surfaces exist."
);

assertIncludesAll(
  practiceClient,
  [
    "Recommended practice flow",
    "Practice Notifications",
    "Practice Task Inbox",
    "Practice analytics",
    "Export practice data",
    "Import Strategies",
    "All orders in Practice are simulated."
  ],
  "/app/practice dashboard covers onboarding, analytics, assignments, notifications, and import/export."
);

assertIncludesAll(
  terminalClient,
  [
    "practice-terminal-chart-first-shell",
    "Simulated orders only. Entries use revealed candles and never place a broker or exchange order.",
    "Submit simulated order",
    "Indicators use revealed candles only.",
    "Object tree",
    "practice-terminal-object-tree",
    "Bookmarks",
    "Simulated challenge rules use practice orders only.",
    "data-practice-event-marker-lane=\"bottom\"",
    "timeScale.timeToCoordinate(closestTime)",
    "subscribeVisibleLogicalRangeChange",
    "unsubscribeVisibleLogicalRangeChange",
    "Session report"
  ],
  "Terminal route retains simulated order ticket, indicators, drawings, bookmarks, challenge, report shortcut, and timeScale-based event markers."
);

assertIncludesAll(
  replayClient,
  [
    "Practice replay",
    "This practice session is completed",
    "Reflection stays in the practice journal summary and is separate from AutoCopy.",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/evaluate"
  ],
  "Old replay route still works and preserves completed-session/revealed-candle practice copy."
);

assertIncludesAll(
  reportClient,
  [
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/report",
    "window.print()",
    "Print / Save PDF",
    "@media print",
    "No closed trades yet.",
    "No instructor feedback has been submitted yet."
  ],
  "Practice report route is protected and browser-print-only."
);

assertIncludesAll(
  journalClient,
  [
    "Practice/backtesting",
    "Practice/backtesting performance will appear here.",
    "Latest instructor feedback",
    "AutoCopy"
  ],
  "Journal practice/backtesting section exists and stays separate from AutoCopy."
);

assertIncludesAll(
  workspaceInsights,
  [
    "Practice Insights",
    "Aggregate simulated-practice activity only.",
    "maskedSessionRef",
    "maskedStudentId",
    "Recent rows use masked student and session references only."
  ],
  "Workspace insights are aggregate-safe and use masked recent-completion refs."
);

assertIncludesAll(
  workspaceAssignments,
  [
    "Practice Assignments",
    "Assignment calendar",
    "Instructor feedback",
    "Needs review",
    "Feedback draft",
    "Feedback published",
    "students see feedback only after it is published",
    "notificationCounts.needsReview",
    "notificationCounts.overdue",
    "notificationCounts.resubmissionsRequested",
    "notificationCounts.feedbackDraftsNotPublished",
    "maskedSessionRef",
    "maskedStudentId"
  ],
  "Workspace assignment/cohort/feedback/review/notification surfaces remain masked and aggregate-safe."
);

assertIncludesAll(
  historicalService,
  [
    "SUPPORTED_TIMEFRAMES",
    "SUPPORTED_BINANCE_SYMBOLS",
    "SUPPORTED_FOREX_CFD_SYMBOLS",
    "PRACTICE_FOREX_CFD_HISTORY_PROVIDER",
    "tradehub_static_demo",
    "providerSymbolMatchesCanonical",
    "MAX_CANDLES_PER_REQUEST"
  ],
  "Historical provider layer remains bounded and uses allowed symbols/timeframes."
);

assertIncludesAll(
  instrumentSpecs,
  [
    "BTCUSDT",
    "ETHUSDT",
    "XAUUSD",
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "USDCHF",
    "USDCAD",
    "AUDUSD",
    "NZDUSD",
    "Practice instrument specs are bounded simulation estimates"
  ],
  "Instrument specs cover supported crypto, gold/CFD, and Forex practice symbols."
);

assertIncludesAll(
  analytics,
  [
    "computePracticePerformanceSummary",
    "maxDrawdown",
    "profitFactor",
    "expectancy",
    "averageR"
  ],
  "Practice analytics helper exposes source-level performance metrics."
);

assertIncludesAll(
  fillEngine,
  [
    "evaluatePracticeOrderAgainstRevealedCandles",
    "validateDirectionalPracticeLevels",
    "currentCandleIndex",
    "revealedCandles",
    "stopLoss",
    "takeProfit"
  ],
  "Practice fill engine remains driven by revealed candles and validated SL/TP fields."
);

assertIncludesAll(
  practiceRepo,
  [
    "Practice orders are simulated only; no broker, exchange, AutoCopy, or live execution adapter is called.",
    "Practice fill evaluation uses only candles sliced through currentCandleIndex; future candles are not evaluated.",
    "Replay candles are sliced server-side through the current reveal index; unrevealed future candles are not returned.",
    "Practice backup export is student-scoped and excludes hidden candles, provider payloads, credentials, vault refs, and AutoCopy internals.",
    "Workspace assignment progress never returns raw student trades, notes, candles, annotations, reflections, journal entries, provider payloads, credentials, vault refs, or AutoCopy internals.",
    "No raw session IDs, student IDs, trades, journal entries, candles, provider payloads, credentials, vault refs, or AutoCopy internals are returned."
  ],
  "Practice repository retains explicit source-level safety boundaries for orders, candles, exports, workspace aggregates, and notifications."
);

const exportFunction = sliceBetween(
  practiceRepo,
  "export async function exportStudentPracticeData",
  "export async function importStudentPracticePlaybooks"
);

assert(
  !exportFunction.includes("fetchSessionCandles") &&
    !exportFunction.includes("fetchHistoricalCandlesWithCache") &&
    !exportFunction.includes("NormalizedCandle") &&
    !exportFunction.includes("candles:") &&
    !exportFunction.includes("cacheId"),
  "Practice export does not export hidden/unrevealed candles or candle cache internals."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "practice_bookmarks",
    "practice_notification_state",
    "practice_instructor_feedback",
    "practice_drawings",
    "playbooks",
    "practice_assignments",
    "practice_cohorts",
    "allow read, write: if false;"
  ],
  "Firestore rules retain deny-by-default coverage for protected practice paths."
);

const workspaceRecentType = sliceBetween(
  practiceTypes,
  "export interface WorkspacePracticeRecentCompletedSessionInsight",
  "export interface WorkspacePracticeInsightsResponse"
);

assert(
  workspaceRecentType.includes("maskedSessionRef") &&
    workspaceRecentType.includes("maskedStudentId") &&
    !workspaceRecentType.includes("sessionId") &&
    !workspaceRecentType.includes("studentId:"),
  "Workspace recent completion type excludes raw sessionId/studentId and keeps masked refs."
);

assert(
  !workspaceInsights.includes("session.sessionId") &&
    !workspaceInsights.includes("completion.sessionId") &&
    !workspaceAssignments.includes("completion.sessionId") &&
    !workspaceInsights.includes("session.studentId") &&
    !workspaceAssignments.includes("completion.studentId"),
  "Workspace UI does not render raw student/session identifiers."
);

assertExcludesAll(
  clientPracticeSurfaces,
  [
    "getForexDemoOrderPlacementAdapter",
    "getForexLiveCanaryOrderPlacementAdapter",
    "getExchangeOrderAdapter",
    "loadForexMetaApiToken",
    "metaapi-adapter",
    "binance-adapter",
    "bybit-adapter",
    "submitOrder(",
    "placeOrder(",
    "private Binance",
    "private Bybit",
    "MetaAPI access token",
    "metaApiToken",
    "brokerPassword",
    "vaultRef",
    "rawProviderPayload",
    "providerPayload",
    "accountId:",
    "paystack",
    "Notification.requestPermission",
    "sendEmail",
    "sendSms",
    "twilio",
    "whatsapp",
    "pushSubscription",
    "uploadBytes(",
    "html2canvas",
    "jsPDF",
    "pdfkit",
    "puppeteer"
  ],
  "Practice UI does not add forbidden execution/provider/private exchange/secret/payment/messaging/upload/PDF surfaces."
);

assertExcludesAll(
  protectedPracticeSources,
  [
    "getForexDemoOrderPlacementAdapter",
    "getForexLiveCanaryOrderPlacementAdapter",
    "getExchangeOrderAdapter",
    "loadForexMetaApiToken",
    "metaapi-adapter",
    "binance-adapter",
    "bybit-adapter",
    "private/order",
    "private Binance",
    "private Bybit",
    "MetaAPI access token",
    "metaApiToken",
    "brokerPassword",
    "vaultRef",
    "rawProviderPayload",
    "providerPayload",
    "paystack",
    "Notification.requestPermission",
    "sendEmail",
    "sendSms",
    "twilio",
    "whatsapp",
    "pushSubscription",
    "uploadBytes(",
    "html2canvas",
    "jsPDF",
    "pdfkit",
    "puppeteer"
  ],
  "Practice server/types layer does not couple to live execution, MetaAPI credentials, private exchange APIs, paid messaging/storage, or server-side PDF generation."
);

assert(
  !practiceClient.includes("fetch(\"http") &&
    !practiceClient.includes("fetch('http") &&
    !terminalClient.includes("fetch(\"http") &&
    !terminalClient.includes("fetch('http") &&
    !replayClient.includes("fetch(\"http") &&
    !replayClient.includes("fetch('http") &&
    !reportClient.includes("fetch(\"http") &&
    !reportClient.includes("fetch('http"),
  "Browser practice surfaces do not fetch external providers directly."
);

console.log("Stage 18X practice MVP final acceptance and deferred QA closeout passed.");
