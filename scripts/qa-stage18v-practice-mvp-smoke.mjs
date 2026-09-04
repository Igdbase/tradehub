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

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const reportClient = read("src/components/student-app/student-practice-report-client.tsx");
const journalClient = read("src/components/student-app/student-journal-client.tsx");
const workspaceInsights = read("src/components/workspace/workspace-practice-insights-section.tsx");
const workspaceAssignments = read("src/components/workspace/workspace-practice-assignments-section.tsx");
const courseApiClient = read("src/lib/course-hub/course-api-client.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const rules = read("firestore.rules");

const smokeModules = [
  practiceClient,
  replayClient,
  terminalClient,
  reportClient,
  journalClient,
  workspaceInsights,
  workspaceAssignments
].join("\n");

assert(
  packageJson.scripts?.["stage18v:qa"] === "node scripts/qa-stage18v-practice-mvp-smoke.mjs",
  "package.json exposes npm run stage18v:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18V - Practice MVP Freeze And Browser Smoke Pack",
    "Stop adding major practice/backtesting features",
    "seeded demo/smoke scenario",
    "route/workflow smoke checks",
    "Do not add new major product surfaces",
    "TH-2026-08-20-STAGE18V-PRACTICE-MVP-SMOKE-HANDOFF"
  ],
  "plan.md documents the Stage 18V freeze and smoke scope."
);

assertIncludesAll(
  manualBacklog,
  [
    "Must Test Before Demo",
    "Stage 18V Practice MVP Freeze And Browser Smoke Pack",
    "Create/open a BTCUSDT terminal session.",
    "Confirm event markers hover/click after pan/zoom.",
    "Submit and close a simulated order.",
    "Open report and browser print dialog.",
    "Open `/workspace` and confirm aggregate-only insights/assignments/notifications.",
    "TH-2026-08-20-STAGE18V-PRACTICE-MVP-SMOKE-HANDOFF"
  ],
  "manual-test-backlog.md records Stage 18V browser smoke and demo checklist."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE18V-PRACTICE-MVP-SMOKE-HANDOFF",
    "Stage 18V - Practice MVP Freeze And Browser Smoke Pack",
    "npm run stage18v:qa",
    "Stop adding major practice/backtesting features"
  ],
  "prompt summary points future resumes at the Stage 18V handoff."
);

assertExistsAll(
  [
    "src/app/(student)/app/practice/page.tsx",
    "src/app/(student)/app/practice/[sessionId]/page.tsx",
    "src/app/(student)/app/practice/[sessionId]/terminal/page.tsx",
    "src/app/(student)/app/practice/[sessionId]/report/page.tsx",
    "src/app/(student)/app/journal/page.tsx",
    "src/app/(influencer)/workspace/page.tsx"
  ],
  "Demo-critical student and workspace routes exist."
);

assertExistsAll(
  [
    "src/app/api/student/practice/playbooks/route.ts",
    "src/app/api/student/practice/sessions/route.ts",
    "src/app/api/student/practice/sessions/[sessionId]/route.ts",
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
    "src/app/api/student/practice/notifications/route.ts",
    "src/app/api/student/practice/assignments/route.ts",
    "src/app/api/student/practice/assignments/[assignmentId]/start/route.ts",
    "src/app/api/student/practice/assignments/resubmissions/start/route.ts",
    "src/app/api/workspace/practice/insights/route.ts",
    "src/app/api/workspace/practice/assignments/route.ts",
    "src/app/api/workspace/practice/assignments/feedback/route.ts",
    "src/app/api/workspace/practice/cohorts/route.ts"
  ],
  "Protected practice workflow API routes exist for the MVP smoke path."
);

assertIncludesAll(
  practiceClient,
  [
    "Practice Notifications",
    "Practice Task Inbox",
    "Export practice data",
    "Import playbooks",
    "BTCUSDT",
    "createSession",
    "/api/student/practice/playbooks",
    "/api/student/practice/sessions",
    "/api/student/practice/analytics",
    "/api/student/practice/assignments",
    "/api/student/practice/notifications",
    "Open terminal after create",
    "Resume terminal",
    "Report"
  ],
  "/app/practice exposes playbook/session creation, task inbox, notifications, import/export, terminal, and report entry points."
);

assertIncludesAll(
  terminalClient,
  [
    "Practice Terminal",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/candles",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/navigation",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders",
    "Submit simulated order",
    "Replay and reflection",
    "Indicators are learning tools computed client-side from revealed candles only",
    "Drawings / Notes",
    "Bookmarks",
    "challengeStatus",
    "Simulated challenge rules use practice orders only.",
    "data-practice-event-marker-lane=\"bottom\"",
    "timeScale.timeToCoordinate(closestTime)",
    "subscribeVisibleLogicalRangeChange",
    "Report"
  ],
  "Terminal smoke surface includes revealed candles, replay navigation, simulated orders, indicators, drawings, bookmarks, challenge, event lane, and report shortcut."
);

assertIncludesAll(
  replayClient,
  [
    "Practice replay",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/evaluate",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/finish",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/reflection",
    "Report",
    "This practice session is completed"
  ],
  "Old replay route still exposes safe simulated order lifecycle, finish, reflection, and report workflow."
);

assertIncludesAll(
  reportClient,
  [
    "PracticeSessionReportResponse",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/report",
    "window.print()",
    "Print / Save PDF",
    "@media print",
    "Session Summary",
    "Closed Simulated Orders",
    "Reflection And Main Lesson",
    "Instructor Feedback"
  ],
  "Practice report loads through protected API and uses browser print only."
);

assertIncludesAll(
  journalClient,
  [
    "Practice/backtesting",
    "Latest instructor feedback",
    "Practice/backtesting performance will appear here",
    "AutoCopy"
  ],
  "/app/journal keeps practice/backtesting summaries separate from AutoCopy."
);

assertIncludesAll(
  workspaceInsights,
  [
    "Practice Insights",
    "maskedSessionRef",
    "maskedStudentId",
    "Recent completed sessions",
    "challenge"
  ],
  "Workspace practice insights use aggregate and masked recent-completion fields."
);

assertIncludesAll(
  workspaceAssignments,
  [
    "Practice Assignments",
    "Assignment calendar",
    "Instructor feedback",
    "Needs review",
    "notificationCounts.needsReview",
    "notificationCounts.overdue",
    "notificationCounts.resubmissionsRequested",
    "notificationCounts.feedbackDraftsNotPublished",
    "maskedSessionRef",
    "maskedStudentId"
  ],
  "Workspace assignments expose calendar, review queue, and aggregate notification counts with masked refs."
);

assert(
  courseApiClient.includes("getFirebaseAuthClient") &&
    courseApiClient.includes("user.getIdToken(forceRefresh)") &&
    courseApiClient.includes("Authorization: `Bearer ${token}`"),
  "Browser practice smoke paths use the existing signed-in protected API client."
);

assertIncludesAll(
  practiceRepo,
  [
    "student-owned simulated practice records only",
    "Practice session reports are generated from bounded student-owned simulated practice records only.",
    "No raw session IDs, student IDs, trades, journal entries, candles",
    "maskedSessionRef",
    "maskedStudentId"
  ],
  "Practice repository retains server-owned, student-scoped, and workspace-masked safety notes."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "playbooks",
    "practice_annotations",
    "practice_bookmarks",
    "practice_drawings",
    "practice_assignments",
    "practice_cohorts",
    "practice_notification_state",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for protected practice paths."
);

assert(
  !workspaceInsights.includes("session.sessionId") &&
    !workspaceInsights.includes("studentId") &&
    !workspaceAssignments.includes("completion.sessionId") &&
    !workspaceAssignments.includes("completion.studentId"),
  "Workspace UI avoids raw student/session identifiers in practice surfaces."
);

assertExcludesAll(
  smokeModules,
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
  "Stage 18V smoke-covered UI modules do not add forbidden execution/provider/secret/messaging/upload/PDF surfaces."
);

assert(
  !terminalClient.includes("fetch(\"http") &&
    !terminalClient.includes("fetch('http") &&
    !practiceClient.includes("fetch(\"http") &&
    !practiceClient.includes("fetch('http"),
  "Practice smoke-covered browser modules do not fetch external providers directly."
);

console.log("Stage 18V practice MVP freeze and browser smoke QA passed.");
