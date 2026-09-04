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
const insightsRoute = read("src/app/api/workspace/practice/insights/route.ts");
const workspaceClient = read("src/app/(influencer)/workspace/workspace-page-client.tsx");
const insightsSection = read("src/components/workspace/workspace-practice-insights-section.tsx");
const rules = read("firestore.rules");

const insightsType = sliceBetween(
  practiceTypes,
  "export type WorkspacePracticeInsightsStatusFilter",
  "export interface RevealedPracticeCandlesResponse"
);
const insightsFunction = sliceBetween(
  practiceRepo,
  "export async function getWorkspacePracticeInsights",
  "function normalizePracticeAssignmentMutationPayload"
);
const recentCompletionBuilder = sliceBetween(
  practiceRepo,
  "const recentCompletedSessions = sessions",
  "return {\n    ...createSourceMeta"
);
const stage18oModules = [
  practiceTypes,
  practiceRepo,
  insightsRoute,
  workspaceClient,
  insightsSection
].join("\n");

assert(
  packageJson.scripts?.["stage18o:qa"] === "node scripts/qa-stage18o-workspace-practice-insights.mjs",
  "package.json exposes npm run stage18o:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18O - Workspace-Safe Practice Insights",
    "protected workspace practice insights API",
    "aggregate/bounded/safe summaries only",
    "masked student identifiers",
    "Do not expose raw journal entries, full trade-by-trade history, hidden candles"
  ],
  "plan.md documents Stage 18O aggregate educator-safe scope."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18O Workspace-Safe Practice Insights",
    "Open `/workspace` as an influencer.",
    "Confirm Practice Insights section appears.",
    "Confirm empty state works with no practice data.",
    "Confirm aggregates update after students create and complete practice sessions.",
    "Confirm filters work for status, symbol, timeframe, and date range.",
    "masked student identifiers only"
  ],
  "manual-test-backlog.md records Stage 18O manual QA."
);

assertIncludesAll(
  insightsType,
  [
    "WorkspacePracticeInsightsResponse",
    "WorkspacePracticeInsightsFilters",
    "WorkspacePracticeSymbolInsight",
    "WorkspacePracticePlaybookInsight",
    "WorkspacePracticeRecentCompletedSessionInsight",
    "totalActivePracticeStudents",
    "totalPracticeSessions",
    "completedPracticeSessions",
    "archivedPracticeSessions",
    "totalSimulatedClosedTrades",
    "aggregatePracticePnl",
    "averageWinRate",
    "averageR",
    "challengePassed",
    "challengeFailed",
    "challengeInProgress",
    "mostPracticedSymbols",
    "mostUsedPlaybooks",
    "recentCompletedSessions",
    "maskedSessionRef",
    "maskedStudentId"
  ],
  "Practice types define aggregate workspace insights with masked recent completions."
);

assert(
  !insightsType.includes("sessionId: string") &&
    !insightsType.includes("studentId: string") &&
  !insightsType.includes("orders: PracticeOrderSummary[]") &&
    !insightsType.includes("candles:") &&
    !insightsType.includes("journal") &&
    !insightsType.includes("email") &&
    !insightsType.includes("brokerPassword") &&
    !insightsType.includes("metaApiToken") &&
    !insightsType.includes("vaultRef") &&
    !insightsType.includes("rawProviderPayload"),
  "Workspace practice insights response does not expose raw session IDs, student IDs, trades, candles, journal entries, emails, or secrets."
);

assertIncludesAll(
  practiceRepo,
  [
    "parseWorkspacePracticeInsightsRequest",
    "getWorkspacePracticeInsights",
    "WORKSPACE_PRACTICE_INSIGHTS_SESSION_LIMIT",
    "WORKSPACE_PRACTICE_INSIGHTS_ORDER_LIMIT",
    "WORKSPACE_PRACTICE_INSIGHTS_PLAYBOOK_LIMIT",
    "collectionGroup(\"practice_sessions\")",
    "collectionGroup(\"practice_orders\")",
    "collectionGroup(\"playbooks\")",
    ".where(\"workspaceId\", \"==\", actor.workspaceId)",
    "maskPracticeStudentId",
    "maskPracticeSessionRef",
    "mostPracticedSymbols",
    "mostUsedPlaybooks",
    "recentCompletedSessions",
    "Workspace practice insights are aggregate, bounded, and educator-safe."
  ],
  "Practice repository computes workspace insights from bounded workspace-scoped collection-group reads."
);

assert(
  insightsFunction.includes("computePracticePerformanceSummary") &&
    insightsFunction.includes("computePracticeChallengeStatus") &&
    !insightsFunction.includes("fetchSessionCandles") &&
    !insightsFunction.includes("fetchHistoricalCandlesWithCache") &&
    !insightsFunction.includes("listVisibleEventsForSession") &&
    !insightsFunction.includes("annotations") &&
    !insightsFunction.includes("journal_summary"),
  "Workspace practice insights reuse practice summary helpers without fetching candles, annotations, or journal internals."
);

assertIncludesAll(
  recentCompletionBuilder,
  [
    "maskedSessionRef: maskPracticeSessionRef",
    "maskedStudentId: maskPracticeStudentId",
    "symbol: session.symbol",
    "closedTrades: performance.closedTrades"
  ],
  "Workspace recent completions return masked refs and aggregate completion fields."
);

assert(
  !recentCompletionBuilder.includes("sessionId: session.sessionId") &&
    !recentCompletionBuilder.includes("studentId: session.studentId"),
  "Workspace recent completions do not return raw session IDs or raw student IDs."
);

assertIncludesAll(
  insightsRoute,
  [
    "requireInfluencer(request)",
    "parseWorkspacePracticeInsightsRequest",
    "getWorkspacePracticeInsights",
    "apiJson",
    "apiError"
  ],
  "Workspace practice insights route is protected by influencer workspace auth."
);

assertIncludesAll(
  workspaceClient,
  [
    "WorkspacePracticeInsightsSection",
    "WorkspacePracticeInsightsResponse",
    "WorkspacePracticeInsightsFilters",
    "/api/workspace/practice/insights",
    "buildPracticeInsightsPath",
    "practiceInsightsFilters",
    "loadPracticeInsights",
    "isLoadingPracticeInsights",
    "practiceInsightsErrorMessage"
  ],
  "/workspace loads and renders the Practice Insights section with filters."
);

assertIncludesAll(
  insightsSection,
  [
    "Practice Insights",
    "Student backtesting progress",
    "Aggregate simulated-practice activity only",
    "Private journal entries, raw trade history, hidden candles, and execution internals are not shown.",
    "Status",
    "Symbol",
    "Timeframe",
    "From",
    "To",
    "Active students",
    "Closed trades",
    "Practice P&L",
    "Most practiced symbols",
    "Most used playbooks",
    "Recent completed sessions",
    "maskedSessionRef",
    "maskedStudentId",
    "No student practice data matches these filters yet."
  ],
  "Workspace Practice Insights UI is compact, filtered, aggregate-only, and has empty states."
);

assert(
  insightsSection.includes("key={session.maskedSessionRef}") &&
    !insightsSection.includes("key={session.sessionId}"),
  "Workspace Practice Insights UI keys recent completions with the safe masked session ref."
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
  !stage18oModules.includes("getForexDemoOrderPlacementAdapter") &&
    !stage18oModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !stage18oModules.includes("getExchangeOrderAdapter") &&
    !stage18oModules.includes("submitOrder(") &&
    !stage18oModules.includes("postTrade(") &&
    !stage18oModules.includes("private Binance") &&
    !stage18oModules.includes("private Bybit") &&
    !stage18oModules.includes("brokerPassword") &&
    !stage18oModules.includes("metaApiToken") &&
    !stage18oModules.includes("vaultRef") &&
    !stage18oModules.includes("rawProviderPayload") &&
    !stage18oModules.includes("apiSecret") &&
    !stage18oModules.includes("autocopy_internal"),
  "Stage 18O does not add forbidden execution/provider/private exchange/MetaAPI credential or AutoCopy internals."
);

assert(
  !stage18oModules.includes("jsPDF") &&
    !stage18oModules.includes("html2canvas") &&
    !stage18oModules.includes("captureScreenshot") &&
    !stage18oModules.includes("uploadBytes") &&
    !stage18oModules.includes("paid analytics") &&
    !stage18oModules.includes("paid storage") &&
    !stage18oModules.includes("twilio") &&
    !stage18oModules.includes("sendgrid"),
  "Stage 18O does not add PDF generation, screenshots/uploads, paid analytics/storage, or messaging services."
);

console.log("Stage 18O workspace-safe practice insights QA passed.");
