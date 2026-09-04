import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};
const includesAll = (source, values, message) => {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
};
const excludesAll = (source, values, message) => {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
};

const packageJson = JSON.parse(read("package.json"));
const client = read("src/components/student-app/student-journal-client.tsx");
const route = read("src/app/api/student/journal/connected-trades/route.ts");
const repository = read("src/lib/journal/connected-journal-repository.ts");
const practiceRepository = read("src/lib/practice/practice-repository.ts");
const practicePerformance = read("src/lib/practice/practice-performance-analytics.ts");
const practiceTypes = read("src/types/practice.ts");
const types = read("src/types/journal-workspace.ts");
const browser = read("tests/browser/student-e2e.spec.mjs");
const browserHelpers = read("tests/browser/helpers/student-flows.mjs");
const seed = read("scripts/seed-demo-data.mjs");
const plan = read("plan.md");
const manualDemo = read("manual-demo-qa.md");
const manualBacklog = read("manual-test-backlog.md");
const docs = ["plan.md", "manual-test-backlog.md", "manual-demo-qa.md", "complaint-resolution-roadmap.md", "prompt/promptsumary.md", "docs/handoffs/tradehub-handoff-2026-08-30.md"]
  .map(read).join("\n");

assert(packageJson.scripts?.["stage29f:qa"] === "node scripts/qa-stage29f-journal-redesign-data-separation.mjs", "package.json exposes npm run stage29f:qa.");
includesAll(client, ["My Trades", "Backtesting", "journal-tab-${tab}", "useState<JournalTab>(\"my_trades\")", "journal-my-trades-view", "journal-backtesting-view"], "Journal exposes My Trades by default and a separate Backtesting tab.");
includesAll(client, ["Equity curve", "Drawdown", "Performance calendar", "Monthly results", "Confirmed history", "Simulated sessions", "Symbols", "Strategies", 'label="Account"', 'label="Market"', 'label="Symbol"', 'label="Status"', 'label="Source"', 'label="Period"'], "Both journal datasets use the requested analytics, calendar, full filter, and dense-list language.");
includesAll(client, ["points.length === 0", "points.length === 1", 'data-testid="journal-equity-empty-state"', 'data-testid="journal-equity-visual"', 'data-testid="journal-equity-single-point"', 'data-testid="journal-equity-final-value"', "Final equity"], "Shared EquityChart distinguishes truthful zero, visible one-point, and existing multi-point states.");
excludesAll(client, ["if (points.length < 2) return null"], "A single authoritative equity point cannot be collapsed into the empty state.");
includesAll(client, ["journal-kpi-${item.label.toLowerCase()", "journal-month-result", "journal-symbol-result", "journal-strategy-result", "journal-backtesting-session"], "Backtesting result surfaces expose stable non-visual selectors for reconciliation coverage.");
includesAll(client, ["response.cohortCoverage.excludedOrderCount > 0", "response.cohortCoverage.safeMessage", "response.cohortCoverage.eligibleClosedOrderCount", 'data-testid="journal-backtesting-coverage-warning"'], "Backtesting visibly discloses incomplete bounded cohort coverage before its KPIs using safe counts only.");
excludesAll(client, ["/api/student/journal/manual-trades", "Manual CRUD", "Add manual trade", "Edit manual trade", "Import / export", "AI Insight"], "Main Journal has no manual CRUD/import/export request path or AI Insight promise.");
includesAll(route, ["requireStudent(request)", "getStudentConnectedJournal", "journal_filter_invalid"], "Connected journal API is student-protected and validates bounded filters.");
includesAll(types, ['ConnectedJournalTradeStatus = "open" | "partial" | "closed" | "execution_only"', "ConnectedJournalProviderStatus", "ConnectedJournalResultWindow", "scannedCount", "matchedCount", "visibleCount", "hasMore", "truncated"], "Public DTO separates Journal lifecycle from provider execution status and reports bounded result coverage.");
excludesAll(types, ['ConnectedJournalTradeStatus = "open" | "closed" | "partial" | "filled"'], "Raw provider filled status is not a public closed-capable Journal lifecycle.");
includesAll(repository, ["isProviderConfirmedConnectedTrade", "normalizeConnectedJournalLifecycle", "A provider-filled entry confirms an execution, not the position's closure.", "providerClosureConfirmed", "trade.status === \"closed\"", "providerConfirmed === true", "executionMode === \"production_gated\"", "executionMode === \"live_canary\"", "record.dryRun !== true", "CONNECTED_TRADE_SCAN_LIMIT", "CONNECTED_TRADE_VISIBLE_LIMIT"], "Repository requires explicit real provider confirmation and authoritative Journal closure semantics.");
includesAll(repository, ["paper", "testnet", "sandbox", "demo", "practice", "dry_run", "source === \"connected_provider\"", "provider_manual", "copied"], "Repository excludes simulated environments and distinguishes copied/provider-placed history.");
excludesAll(repository, ["exchange_connections", "forex_provisioning"], "Journal readiness does not reuse Copier exchange/provisioning setup.");
includesAll(repository, ['orderBy("updatedAt", "desc")', "const matchedTrades = allConfirmed.filter", "buildPerformance(matchedTrades)", "buildEquityCurve(matchedTrades)", "buildPeriodPnl(matchedTrades", "hasMore: scanBoundaryReached || visibleRowsTruncated", "truncated: scanBoundaryReached || visibleRowsTruncated", "listStudentJournalCryptoConnectionSummaries", "journalSyncConfigured = activeJournalConnections.length > 0"], "Repository queries newest-first, computes before slicing, reports truthful scan/list truncation, and keeps Journal Sync readiness dedicated to Journal connections.");
excludesAll(types, ["workspaceId", "studentId", "sourceRecordId", "connectionId", "sanitizedFailure", "providerPayload", "vaultRef"], "Student journal DTO omits private identifiers and diagnostics.");
includesAll(seed, ["journal_demo_crypto_paper_excluded", "journal_demo_crypto_testnet_excluded", "journal_demo_forex_demo_excluded", "journal_demo_production_unconfirmed_excluded"], "Demo seed includes deterministic unsafe-ledger exclusion fixtures.");
excludesAll(seed, ["stage29f_browser_closed_win", "stage29f_browser_closed_loss"], "Positive real-trade fixtures are not left in the normal demo seed.");
includesAll(practiceTypes, ["fees?: number"], "Practice order summaries preserve bounded persisted simulated fees.");
includesAll(practicePerformance, ["computePracticeOrderNetResult", "Persisted fees replace the fee-bps estimate", "feeCost = persistedFees ??", "spreadCost", "slippageCost", "netPnl / inferredRiskAmount"], "One shared order result defines persisted fee precedence and net P&L/R after simulated costs.");
const orderNetResultBlock = practicePerformance.slice(
  practicePerformance.indexOf("export function computePracticeOrderNetResult"),
  practicePerformance.indexOf("export function computePracticePerformanceSummary")
);
includesAll(orderNetResultBlock, ["assumptions: PracticePerformanceAssumptions", "const assumptions = input.assumptions"], "Closed-order net results require explicit authoritative performance assumptions.");
excludesAll(orderNetResultBlock, ["session?:", "assumptions?:", "feeBps: 0", "spreadBps: 0", "slippageBps: 0", "No session assumptions were available"], "Closed-order net results cannot fabricate zero-cost assumptions when a session is unavailable.");
const playbookNetBlock = practicePerformance.slice(
  practicePerformance.indexOf("export function computePracticePlaybookPerformance"),
  practicePerformance.indexOf("export function selectBestWorstPracticePlaybooks")
);
excludesAll(playbookNetBlock, ["safeNumber(order.pnl) > 0", "total + safeNumber(order.pnl)", "equity += safeNumber(order.pnl)"], "Playbook analytics do not aggregate raw gross order P&L.");
const practiceAggregateBlock = practiceRepository.slice(
  practiceRepository.indexOf("function computeOrdersAggregate"),
  practiceRepository.indexOf("function buildChallengeAnalyticsSummary")
);
includesAll(practiceAggregateBlock, ["computePracticeOrderNetResult", "buildPracticeEquityAndDrawdownCurves", "buildDailyPracticePnl", "buildSymbolBreakdown"], "Equity, drawdown, daily, and symbol analytics share the authoritative net-result calculation.");
excludesAll(practiceAggregateBlock, ["const pnl = safeNumber(order.pnl", "total + safeNumber(order.pnl", "equity += safeNumber(order.pnl"], "Backtesting aggregate paths cannot silently return to gross order P&L.");
const practiceAnalyticsBlock = practiceRepository.slice(
  practiceRepository.indexOf("function buildPracticeAnalyticsCohort"),
  practiceRepository.indexOf("export async function exportStudentPracticeData")
);
includesAll(practiceAnalyticsBlock, ["eligibleSessionIds", "eligibleOrders", "eligibleClosedOrders", "excludedOrderCount", "hasClosedTrades: eligibleClosedOrders.length > 0", "cohortCoverage: analyticsCohort.coverage", "orders: eligibleOrders", "buildChallengeAnalyticsSummary({ sessions, orders: eligibleOrders })"], "One bounded session-backed order cohort drives every Backtesting aggregate and reports unmatched exclusions truthfully.");
includesAll(practiceTypes, ["cohortCoverage", "scannedOrderCount", "eligibleOrderCount", "eligibleClosedOrderCount", "excludedOrderCount"], "Practice analytics expose safe bounded-cohort coverage counts without record identifiers.");
includesAll(`${browser}\n${browserHelpers}`, ["Journal separates confirmed account history from simulated backtesting", "installConnectedJournalFixtures", "clearConnectedJournalFixtures", 'status: "open"', 'providerStatus: "filled"', 'journalLifecycle: "partial"', 'journalLifecycle: "closed"', "providerClosureConfirmed: true", "closedTrades: 2", "maxDrawdown: 25", "matchedCount: 5", "provider_manual", "journalSyncConfigured: false", "journalSyncConfigured: true", "/api/student/journal/manual-trades", "/api/student/practice/analytics", "journal-tab-backtesting", "scrollWidth"], "Browser QA proves positive lifecycle analytics, filtering, cleanup, dedicated Journal Sync readiness, dataset separation, privacy, and responsive width.");
includesAll(`${browser}\n${browserHelpers}`, ["practice_order_demo_closed_win", "netPnl: 1452", "pnl: 1452", "equity: 101452", 'toContainText("+1,452")', "installPracticeAnalyticsLossFixture", "clearPracticeAnalyticsLossFixture", "netPnl: -108", "drawdown: 108", "losses: 1"], "Browser QA reconciles the seeded net result across API/UI and covers cost-adjusted loss drawdown with cleanup.");
includesAll(browser, ['getByTestId("journal-equity-empty-state")).toBeVisible()', 'getByTestId("journal-equity-visual")).toHaveCount(0)', 'getByTestId("journal-equity-visual")).toBeVisible()', 'getByTestId("journal-equity-single-point")).toBeVisible()', 'getByTestId("journal-equity-empty-state")).toHaveCount(0)', 'getByTestId("journal-equity-final-value")).toContainText("101,452")', 'not.toContainText("Complete simulated trades to build a backtesting equity curve.")'], "Browser QA proves zero points retain the empty state while one completed seeded trade renders a visible 101,452 equity state.");
includesAll(`${browser}\n${browserHelpers}`, ["installPracticeAnalyticsUnmatchedFixture", "clearPracticeAnalyticsUnmatchedFixture", "stage29f_browser_practice_missing_session", "stage29f_browser_practice_unmatched_order", "excludedOrderCount: 1", "eligibleClosedOrderCount: 2", "netPnl: 1344", "hasClosedTrades", "challengeSummary).toEqual(practicePayload.challengeSummary)"], "Browser QA proves an unmatched closed order receives no fabricated assumptions and is excluded consistently from the eligible Backtesting cohort.");
includesAll(browser, ['getByTestId("journal-backtesting-coverage-warning")).toHaveCount(0)', 'getByTestId("journal-backtesting-coverage-warning")).toBeVisible()', "1 bounded order record was excluded", "2 eligible closed trades", 'not.toContain("9999")', 'toContainText("+1,344")'], "Browser QA proves the coverage warning is absent for complete data, visible for one exclusion, and the unmatched +9,999 result reaches no displayed analytics.");

const journalTestStart = browser.indexOf('test("Journal separates confirmed account history from simulated backtesting"');
const journalTestEnd = browser.indexOf('test("Wrong role student', journalTestStart);
assert(journalTestStart >= 0 && journalTestEnd > journalTestStart, "Stage 29F browser lifecycle is isolated for structural cleanup checks.");
const journalTest = browser.slice(journalTestStart, journalTestEnd);
const cleanupOffsets = [...journalTest.matchAll(/await clearConnectedJournalFixtures\(page\);/g)].map((match) => match.index ?? -1);
const tryOffset = journalTest.indexOf("try {");
const openOffset = journalTest.indexOf('await openStudentPage(page, "/app/journal"');
const installOffset = journalTest.indexOf("await installConnectedJournalFixtures(page);");
const finallyOffset = journalTest.indexOf("} finally {");
assert(
  cleanupOffsets.length >= 2 &&
    tryOffset >= 0 &&
    tryOffset < cleanupOffsets[0] &&
    cleanupOffsets[0] < openOffset &&
    openOffset < installOffset &&
    installOffset < finallyOffset &&
    finallyOffset < cleanupOffsets.at(-1),
  "Connected-Journal browser fixtures are cleared before the initial zero state and again in finally after the complete test lifecycle."
);

const demoJournalStart = manualDemo.indexOf("3. Journal My Trades and Backtesting");
const demoJournalEnd = manualDemo.indexOf("4. Courses/lesson/check/proof flow", demoJournalStart);
assert(demoJournalStart >= 0 && demoJournalEnd > demoJournalStart, "Active demo runbook contains the Stage 29F Journal walkthrough.");
const activeDemoJournal = manualDemo.slice(demoJournalStart, demoJournalEnd);
includesAll(activeDemoJournal, ["My Trades", "Backtesting", "filled without authoritative closure remains open", "manual trade forms", "CSV import/export"], "Active demo Journal steps cover read-only connected history and separate Backtesting.");
excludesAll(activeDemoJournal, ["Create a planned/open/closed manual trade", "Edit strategy, tags, notes", "/app/journal/trades/[tradeId]", "analytics/calendar/export/import areas"], "Active demo Journal steps do not instruct users to find removed manual controls.");

const backlogJournalStart = manualBacklog.indexOf("### Stage 29F Journal Must Test Before Demo");
const backlogJournalEnd = manualBacklog.indexOf("## Nice To Test", backlogJournalStart);
assert(backlogJournalStart >= 0 && backlogJournalEnd > backlogJournalStart, "Active backlog contains a bounded Stage 29F Journal section.");
const activeBacklogJournal = manualBacklog.slice(backlogJournalStart, backlogJournalEnd);
includesAll(activeBacklogJournal, ["My Trades", "Backtesting", "authoritative closed trades", "no `/api/student/journal/manual-trades*` request", "Historical Stage 21 Manual Journal Compatibility Coverage"], "Active backlog verifies current read-only Journal behavior and labels Stage 21 as historical compatibility.");
excludesAll(activeBacklogJournal, ["Student creates a manual closed trade", "Student creates a planned/open trade", "Student archives a trade", "Click Review from `/app/journal`", "Import valid manual trade CSV"], "Active backlog does not retain obsolete manual CRUD demo instructions.");
excludesAll(manualDemo, ["Manual journal CRUD/review/analytics", "/app/journal/trades/[tradeId]", "Create a planned/open/closed manual trade"], "Current demo runbook no longer directs presenters to removed manual-Journal routes or controls.");
excludesAll(manualBacklog, ["Confirm `/app/journal` shows manual analytics, import/export", "Confirm `/app/journal/trades/manual_aaaaaaaaaaaaaaaaaaaaaaaa`", "Edit manual trade review notes/tags/strategy"], "Current backlog no longer carries obsolete Stage 28C manual-Journal instructions.");

includesAll(plan, ["Stage 29D.15: Practice Terminal Responsive Workstation", "vertically scrolling left rail", "Stage 29D.16: Practice Terminal KLineChart Drawing Tools", "KLineChart 10.0.3", "Pointer cancellation", "bounded Fibonacci", "10/10 in Chromium", "Stage 29D.17: Practice Terminal Owner Acceptance Closure", "closed and frozen"], "Plan preserves detailed frozen Stage 29D.15-D.17 acceptance evidence.");
includesAll(docs, ["Stage 29F", "Journal Product Redesign And Data Separation", "TH-2026-09-03-STAGE29F-JOURNAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF", "10/10", "owner accepted the visual layout", "numerical reconciliation", "owner-accepted, closed, and frozen on 3 September 2026", "gross `+1,500` less `48` costs", "net `+1,452`", "final equity `101,452`", "authoritative session assumptions", "bounded session-backed order cohort", "coverage warning", "unmatched-session order", "Stage 29G"], "Stage 29F closure handoff, one-point Equity evidence, accepted layout/reconciliation, closed owner acceptance, and provider-sync roadmap are recorded.");
excludesAll(docs, ["final Stage 29F owner acceptance remains pending", "Stage 29F owner acceptance remains pending", "awaiting final owner acceptance"], "Stage 29F documentation no longer describes owner acceptance as pending.");

console.log("Stage 29F Journal redesign and data separation QA passed.");
