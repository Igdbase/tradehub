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
const manualBacklog = read("manual-test-backlog.md");
const practiceTypes = read("src/types/practice.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const analyticsHelper = read("src/lib/practice/practice-performance-analytics.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const analyticsRoute = read("src/app/api/student/practice/analytics/route.ts");
const rules = read("firestore.rules");

const stage18mModules = [
  practiceTypes,
  practiceRepo,
  analyticsHelper,
  practiceClient,
  analyticsRoute
].join("\n");
const analyticsFunction = practiceRepo.slice(
  practiceRepo.indexOf("export async function getStudentPracticeAnalytics"),
  practiceRepo.indexOf("export async function exportStudentPracticeData")
);

assert(
  packageJson.scripts?.["stage18m:qa"] === "node scripts/qa-stage18m-practice-analytics-comparison.mjs",
  "package.json exposes npm run stage18m:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18M - Practice Analytics And Session Comparison",
    "server-computed analytics from bounded student-owned simulated practice sessions and orders only",
    "equity curve, drawdown curve, daily P&L, symbol breakdown, playbook breakdown",
    "two-session comparison",
    "Do not fetch hidden candles or expose provider payloads"
  ],
  "plan.md documents Stage 18M analytics and safety boundaries."
);

assertIncludesAll(
  practiceTypes,
  [
    "StudentPracticeAnalyticsResponse",
    "PracticeAnalyticsCurvePoint",
    "PracticeDailyPnlSummary",
    "PracticeSymbolBreakdownSummary",
    "PracticeSessionAnalyticsSummary",
    "PracticeChallengeAnalyticsSummary",
    "equityCurve",
    "drawdownCurve",
    "dailyPnl",
    "symbolBreakdown",
    "playbookBreakdown",
    "bestSessions",
    "worstSessions",
    "recentCompletedSessions",
    "challengeSummary"
  ],
  "Practice types define support-safe analytics response surfaces."
);

assertIncludesAll(
  practiceRepo,
  [
    "PRACTICE_ANALYTICS_SESSION_LIMIT",
    "PRACTICE_ANALYTICS_ORDER_LIMIT",
    "listAnalyticsSessions",
    "listAnalyticsOrders",
    "getStudentPracticeAnalytics",
    "buildPracticeEquityAndDrawdownCurves",
    "buildDailyPracticePnl",
    "buildSymbolBreakdown",
    "buildChallengeAnalyticsSummary",
    "buildPracticeSessionAnalyticsSummary",
    "computePracticePerformanceSummary",
    "computePracticePlaybookPerformance",
    "computePracticeChallengeStatus",
    "Practice analytics are computed server-side from bounded student-owned simulated sessions and orders only.",
    "Analytics never fetch hidden unrevealed candles, provider payloads, AutoCopy internals, credentials, account IDs, or vault references."
  ],
  "Practice repository computes bounded server-side analytics from simulated practice records only."
);

assert(
  !analyticsFunction.includes("fetchSessionCandles") &&
    !analyticsFunction.includes("fetchHistoricalCandlesWithCache"),
  "Practice analytics do not fetch hidden candles or historical provider data."
);

assertIncludesAll(
  analyticsRoute,
  [
    "requireStudent(request)",
    "getStudentPracticeAnalytics",
    "apiJson",
    "apiError"
  ],
  "Practice analytics route is protected by signed-in student auth and Admin SDK repository boundary."
);

assertIncludesAll(
  practiceClient,
  [
    "StudentPracticeAnalyticsResponse",
    "/api/student/practice/analytics",
    "Practice analytics",
    "Equity curve",
    "Drawdown curve",
    "Daily P&L",
    "Symbol breakdown",
    "Playbook breakdown",
    "Best sessions",
    "Worst sessions",
    "Recent completed sessions",
    "Session comparison",
    "compareLeftSessionId",
    "compareRightSessionId",
    "No closed simulated trades yet",
    "closed orders only"
  ],
  "/app/practice renders analytics sections, comparison selectors, and empty states."
);

assertIncludesAll(
  practiceClient,
  [
    "Starting",
    "Ending",
    "Net P&L",
    "Win",
    "Avg R",
    "Max DD",
    "PF",
    "Expectancy",
    "Trades",
    "Playbook",
    "Symbol",
    "Challenge"
  ],
  "Session comparison includes required safe metrics."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18M Practice Analytics And Session Comparison",
    "Confirm equity curve updates from closed simulated trades only.",
    "Confirm drawdown curve updates.",
    "Confirm daily P&L summary updates.",
    "Confirm symbol breakdown updates.",
    "Confirm playbook breakdown updates.",
    "Compare two sessions and confirm safe metrics",
    "Confirm empty state when no closed simulated trades exist."
  ],
  "manual-test-backlog.md records Stage 18M manual QA."
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
  !stage18mModules.includes("getForexDemoOrderPlacementAdapter") &&
    !stage18mModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !stage18mModules.includes("getExchangeOrderAdapter") &&
    !stage18mModules.includes("submitOrder(") &&
    !stage18mModules.includes("postTrade(") &&
    !stage18mModules.includes("private Binance") &&
    !stage18mModules.includes("private Bybit") &&
    !stage18mModules.includes("brokerPassword") &&
    !stage18mModules.includes("metaApiToken") &&
    !stage18mModules.includes("vaultRef") &&
    !stage18mModules.includes("rawProviderPayload") &&
    !stage18mModules.includes("accountId") &&
    !stage18mModules.includes("apiSecret") &&
    !stage18mModules.includes("autocopy_internal"),
  "Stage 18M does not add forbidden execution/provider/private exchange/MetaAPI credential or AutoCopy internals."
);

assert(
  !stage18mModules.includes("jsPDF") &&
    !stage18mModules.includes("html2canvas") &&
    !stage18mModules.includes("captureScreenshot") &&
    !stage18mModules.includes("paid analytics") &&
    !stage18mModules.includes("paid storage"),
  "Stage 18M does not add paid analytics, PDF, screenshots/uploads, or paid storage."
);

console.log("Stage 18M practice analytics and session comparison QA passed.");
