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
const studentSignalTypes = read("src/types/student-signals.ts");
const workspaceSignalTypes = read("src/types/workspace-dashboard.ts");
const studentSignalRepository = read("src/lib/student-app/student-signals-repository.ts");
const studentSignalRoute = read("src/app/api/student/signals/route.ts");
const studentSignalClient = read("src/components/student-app/student-signals-client.tsx");
const dashboardMappers = read("src/lib/workspace/dashboard-mappers.ts");
const dashboardRepository = read("src/lib/workspace/dashboard-repository.ts");
const accountLinkedLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const executableRoutingQa = read("scripts/qa-stage29j-routing-emulator.mjs");
const routingFiles = [
  "src/lib/crypto-execution/crypto-signal-routing.ts",
  "src/lib/crypto-execution/crypto-live-sandbox.ts",
  "src/lib/crypto-execution/crypto-live-production.ts",
  "src/lib/crypto-execution/forex-paper-execution.ts",
  "src/lib/crypto-execution/forex-demo-execution.ts",
  "src/lib/crypto-execution/forex-live-canary-execution.ts"
].map((file) => [file, read(file)]);
const cryptoProductionRouting = routingFiles.find(([file]) => file === "src/lib/crypto-execution/crypto-live-production.ts")?.[1] ?? "";
const forexLiveCanaryRouting = routingFiles.find(([file]) => file === "src/lib/crypto-execution/forex-live-canary-execution.ts")?.[1] ?? "";
const browser = read("tests/browser/student-e2e.spec.mjs");
const browserHelpers = read("tests/browser/helpers/student-flows.mjs");
const docs = [
  "plan.md",
  "complaint-resolution-roadmap.md",
  "manual-test-backlog.md",
  "manual-demo-qa.md",
  "prompt/promptsumary.md",
  "docs/handoffs/tradehub-handoff-2026-08-30.md"
].map(read).join("\n");

assert(
  packageJson.scripts?.["stage29j:qa"] === "node scripts/qa-stage29j-signals-feed-routing.mjs",
  "package.json exposes npm run stage29j:qa."
);
assert(
  packageJson.scripts?.["stage29j:routing:qa"] === "node scripts/qa-stage29j-routing-emulator.mjs",
  "package.json exposes npm run stage29j:routing:qa for executable emulator-backed signal/feed regressions."
);

includesAll(
  studentSignalTypes,
  [
    "StudentSignalFilter",
    '"all" | "forex" | "crypto" | "open"',
    "StudentSignalLifecycle",
    '"open" | "cancelled" | "closed" | "unavailable"',
    "StudentSignalExecutionSummary",
    "StudentSignalsPageInfo",
    "scannedCount",
    "matchedCount",
    "visibleCount",
    "hasMore",
    "truncated",
    "StudentSignalsResponse"
  ],
  "Student Signals DTO is dedicated, allowlisted, filterable, lifecycle-aware, and reports bounded pagination/truncation metadata."
);
excludesAll(
  studentSignalTypes,
  [
    "workspaceId",
    "studentId",
    "tierId",
    "connectionId",
    "intentId",
    "providerId",
    "credential",
    "providerPayload",
    "diagnostics",
    "riskDecision",
    "executionIntent",
    "vault",
    "providerExecutionIdentity"
  ],
  "Student Signals DTO omits workspace/student IDs, execution internals, provider details, credentials, and diagnostics."
);

includesAll(
  studentSignalRoute,
  ["requireStudent(request)", "listStudentSignalFeed(actor, request)", "apiJson(response)"],
  "Student Signals API is authenticated through requireStudent and returns the allowlisted feed DTO."
);
excludesAll(
  studentSignalRoute,
  ["StudentSignalsResponse } from \"@/types/student-app\"", "listStudentSignals", "StudentCryptoExecutionOverviewResponse"],
  "Student Signals API no longer returns the broad legacy student-app signal response or execution overview."
);

includesAll(
  studentSignalRepository,
  [
    "server-only",
    "SIGNAL_FILTER_SCAN_LIMIT",
    "SIGNAL_VISIBLE_LIMIT_MAX",
    "LINKED_EXECUTION_SCAN_LIMIT",
    'parseFilter(params.get("filter"))',
    "decodeCursor",
    "encodeCursor",
    '.collection(`workspaces/${actor.workspaceId}/signals`)',
    '.orderBy("updatedAt", "desc")',
    "FieldPath.documentId()",
    ".limit(SIGNAL_FILTER_SCAN_LIMIT + 1)",
    "account_linked_trade_ledger",
    ".limit(LINKED_EXECUTION_SCAN_LIMIT)",
    'record.source === "in_app"',
    'record.source === "legacy_in_app"',
    'record.status === "published"',
    'record.status === "cancelled"',
    "tradeHubSignalId",
    "linkedSignalId !== signal.signalId",
    "supportedRealExecutionMode(record)",
    "marketMatchesLedger(signal, record)",
    "normalizeSignalSymbol",
    'tradeOrigin !== "copied"',
    'safeString(record.source) !== "crypto_autocopy"',
    'safeString(record.source) !== "forex_autocopy"',
    "matchesFilter",
    "providerConfirmed === true",
    'record.confirmationState === "provider_confirmed"',
    "providerClosureConfirmed",
    "authoritativePnlForSignal",
    "record.authoritativePnl",
    'kind !== "realized"',
    'kind !== "floating"',
    'source !== "provider_closure"',
    'source !== "provider_valuation"',
    "matched.length > visible.length",
    "hasMoreInCohort",
    "hitScanBoundary",
    "nextCursor"
  ],
  "Student Signals repository is server-only, student/workspace scoped, stable newest-first, bounded, source/status fail-closed, linked through canonical ledger fields, and truthful about typed authoritative copied/P&L state."
);
excludesAll(
  studentSignalRepository,
  [
    "external_signal_candidates",
    "manual-trades",
    "exchange_connections",
    "forex_provisioning",
    "StudentCryptoExecutionOverviewResponse",
    'safeString(record.pnlCurrency, "USD")',
    "record.pnlCurrency",
    "record.currentValuationAuthoritative",
    "record.floatingPnlAuthoritative",
    "record.floatingPnl",
    "record.realizedPnl",
    "record.signalId, safeString(record.linkedSignalId"
  ],
  "Student Signals repository does not read external previews, manual journal rows, Copier setup collections, broad execution DTOs, legacy raw signal linkage, loose P&L fields, or default missing P&L currency."
);

includesAll(
  accountLinkedLedger,
  [
    "safeAuthoritativePnl",
    "AccountLinkedTradeLedgerRecord[\"authoritativePnl\"]",
    "authoritativePnl: safeAuthoritativePnl",
    "tradeHubSignalId",
    "mapCryptoProductionAttemptToLedgerEntry",
    "mapForexDemoAttemptToLedgerEntry",
    "mapForexLiveCanaryAttemptToLedgerEntry",
    "providerExecutionIdentity",
    "tradeOrigin: \"copied\"",
    "providerConfirmed",
    "confirmationState",
    "journalLifecycle",
    "writeAccountLinkedLedgerEntry"
  ],
  "Canonical account-linked ledger mappers persist server-only TradeHub signal linkage, provider execution identity, lifecycle, and typed authoritative P&L for provider-confirmed Crypto and Forex execution paths."
);
excludesAll(
  accountLinkedLedger,
  [
    "tradeHubSignalId: safeString(record.signalId",
    "tradeHubSignalId: safeString(record.linkedSignalId"
  ],
  "Canonical ledger mappers do not derive Stage 29J linkage from legacy browser-supplied signal linkage aliases."
);

includesAll(
  workspaceSignalTypes,
  [
    "WorkspaceSignalSource",
    '"in_app"',
    '"legacy_in_app"',
    '"unknown"',
    '"telegram_channel"',
    '"webhook_source"',
    '"master_trader_feed"',
    "WorkspaceSignalLifecycle",
    'source: WorkspaceSignalSource'
  ],
  "Workspace signal model can represent non-in-app sources without making them routable."
);
includesAll(
  dashboardMappers,
  ["normalizeSignalSource", 'value === "in_app"', 'return "legacy_in_app"', 'return "unknown"', 'value === "telegram_channel"', "lifecycle: normalizeSignalLifecycle(record.lifecycle)", "normalizeSignalStatus"],
  "Workspace signal mapper preserves explicit external-like sources, marks source-less legacy direct signals explicitly, and fails closed for unknown source/status values."
);
includesAll(
  dashboardRepository,
  ['source: "in_app"', "routePublishedCryptoSignalForPaperExecution", "routePublishedForexSignalForPaperExecution"],
  "Workspace-created TradeHub signals are explicitly marked in-app before existing routing modules are invoked."
);

for (const [file, source] of routingFiles) {
  includesAll(
    source,
    ["isPublishedRoutableTradeHubSignalForMarket"],
    `${file} fails closed unless a published direct in-app signal reaches the existing routing path.`
  );
}

includesAll(
  cryptoProductionRouting,
  [
    "actor.workspaceId !== signal.workspaceId",
    "revalidateCryptoIntentBeforeProvider",
    "signalSnapshot",
    "isPublishedRoutableTradeHubSignalForMarket",
    "normalizedSymbol !== intent.symbol",
    "signal.direction !== intent.side",
    "signal.updatedAt !== intent.sourceSignalVersion",
    "isTradeCopierBillingActive",
    "evaluateProductionGate",
    "const finalValidation = await revalidateCryptoIntentBeforeProvider",
    "const credential = await loadExchangeCredential",
    "ledgerProjectionStatus",
    "finalizeCryptoLedgerProjection",
    "queryCryptoLedgerProjectionWork",
    "projectCryptoProductionAttemptToLedger",
    "repairPendingCryptoLedgerProjections",
    'current.ledgerProjectionStatus !== "in_progress"',
    "current.ledgerProjectionLeaseOwner !== ownerToken",
    'ledgerProjectionStatus: terminal ? "final_failed" : "retry_scheduled"',
    'ledgerProjectionStatus: "in_progress"',
    'ledgerProjectionStatus: "projected"',
    'where("ledgerProjectionStatus", "in", ["pending", "retry_scheduled", "failed"])',
    'where("ledgerProjectionNextAttemptAt", "<=", now)',
    'where("ledgerProjectionStatus", "==", "in_progress")',
    'where("ledgerProjectionLeaseExpiresAt", "<=", now)',
    "Promise.all",
    "left.id.localeCompare(right.id)",
    ".slice(0, boundedLimit)",
    'ledgerProjectionLeaseOwner',
    'claim.outcome === "final_failed"',
    "skippedCount",
    "notApplicableCount",
    'LEDGER_PROJECTION_MAX_ATTEMPTS',
    "projectionClaim.outcome === \"claimed\""
  ],
  "Crypto production routing revalidates before provider calls, enforces workspace ownership, and keeps provider success durable through indexed, leased, bounded ledger projection repair."
);
assert(
  cryptoProductionRouting.indexOf("const finalValidation = await revalidateCryptoIntentBeforeProvider") <
    cryptoProductionRouting.indexOf("const credential = await loadExchangeCredential"),
  "Crypto production final revalidation occurs before credential loading."
);
excludesAll(
  cryptoProductionRouting,
  [
    "normalizeSignalPairForMarket(signal.pair, \"crypto\") ?? canonicalSymbol",
    ".limit(Math.max(1, Math.min(limit, PRODUCTION_WORKER_MAX_LIMIT)) + 5)",
    "const repairedProjectionCount = await repairPendingCryptoLedgerProjections(workspaceId, 1)",
    "if (repairedProjectionCount > 0)",
    'where("ledgerProjectionStatus", "in", ["pending", "retry_scheduled", "failed", "in_progress"])',
    "if (dueSnapshot.size >= boundedLimit) {\n    return dueSnapshot.docs;\n  }",
    "limit(boundedLimit - dueSnapshot.size)"
  ],
  "Crypto production final revalidation does not fall back to loose symbols, and projection repair no longer scans a small unfiltered attempt prefix, returns early when due work fills the batch, or emits repaired warnings from a boolean."
);

includesAll(
  forexLiveCanaryRouting,
  [
    "actor.workspaceId !== signal.workspaceId",
    "revalidateForexIntentBeforeProvider",
    "signalSnapshot",
    "isPublishedRoutableTradeHubSignalForMarket",
    "normalizedPair !== intent.pair",
    "signal.direction !== intent.side",
    "signal.updatedAt !== intent.sourceSignalVersion",
    "loadForexLiveCanaryWorkerPrerequisites",
    "const prerequisites = await revalidateForexIntentBeforeProvider",
    "const token = await loadForexMetaApiToken",
    "ledgerProjectionStatus",
    "finalizeForexLedgerProjection",
    "queryForexLedgerProjectionWork",
    "projectForexLiveCanaryAttemptToLedger",
    "repairPendingForexLedgerProjections",
    'current.ledgerProjectionStatus !== "in_progress"',
    "current.ledgerProjectionLeaseOwner !== ownerToken",
    'ledgerProjectionStatus: terminal ? "final_failed" : "retry_scheduled"',
    'ledgerProjectionStatus: "in_progress"',
    'ledgerProjectionStatus: "projected"',
    'where("ledgerProjectionStatus", "in", ["pending", "retry_scheduled", "failed"])',
    'where("ledgerProjectionNextAttemptAt", "<=", now)',
    'where("ledgerProjectionStatus", "==", "in_progress")',
    'where("ledgerProjectionLeaseExpiresAt", "<=", now)',
    "Promise.all",
    "left.id.localeCompare(right.id)",
    ".slice(0, boundedLimit)",
    'ledgerProjectionLeaseOwner',
    'claim.outcome === "final_failed"',
    "skippedCount",
    "notApplicableCount",
    'LEDGER_PROJECTION_MAX_ATTEMPTS',
    "providerResultCommitted",
    "const failureBatch = db.batch()",
    "projectionClaim.outcome === \"claimed\""
  ],
  "Forex live-canary routing revalidates before provider calls, enforces workspace ownership, and keeps provider success durable through indexed, leased, bounded ledger projection repair."
);
excludesAll(
  forexLiveCanaryRouting,
  [
    ".limit(Math.max(1, Math.min(limit, FOREX_LIVE_CANARY_WORKER_LIMIT)) + 5)",
    "const repairedProjectionCount = await repairPendingForexLedgerProjections(workspaceId, 1)",
    "if (repairedProjectionCount > 0)",
    'where("ledgerProjectionStatus", "in", ["pending", "retry_scheduled", "failed", "in_progress"])',
    "if (dueSnapshot.size >= boundedLimit) {\n    return dueSnapshot.docs;\n  }",
    "limit(boundedLimit - dueSnapshot.size)"
  ],
  "Forex live-canary projection repair no longer scans a small unfiltered attempt prefix, returns early when due work fills the batch, or emits repaired warnings from a boolean."
);
assert(
  forexLiveCanaryRouting.indexOf("const prerequisites = await revalidateForexIntentBeforeProvider") <
    forexLiveCanaryRouting.indexOf("const token = await loadForexMetaApiToken"),
  "Forex live-canary final revalidation occurs before credential loading."
);

includesAll(
  studentSignalClient,
  [
    "student-signals-workspace",
    "student-signals-filters",
    "student-signal-card",
    "student-signal-pnl",
    "student-signals-load-more",
    "TradeHub signals",
    "All",
    "Forex",
    "Crypto",
    "Open",
    "Entry",
    "SL",
    "TP",
    "Copied",
    "Executed",
    "Load more"
  ],
  "Student Signals page exposes the compact trading feed, required filters, fields, copied/executed labels, and a visible Load More action."
);
excludesAll(
  studentSignalClient,
  [
    "worker",
    "vault",
    "canary",
    "stage",
    "source-QA",
    "provider payload",
    "readiness gate",
    "execution internals",
    "P&L unavailable"
  ],
  "Student Signals page does not reintroduce engineering, worker, vault, stage, provider terminology, or unsupported-P&L placeholders."
);

includesAll(
  `${browser}\n${browserHelpers}`,
  [
    "installStudentSignalFixtures",
    "clearStudentSignalFixtures",
    "studentSignalFixtureIds",
    "stage29j_browser_crypto_open",
    "stage29j_browser_forex_open",
    "stage29j_browser_external_preview",
    "stage29j_browser_external_telegram_like",
    "stage29j_browser_external_unknown",
    "stage29j_browser_bulk_",
    "stage29j_browser_equal_a",
    "stage29j_browser_equal_b",
    'source: "telegram_channel"',
    'source: "telegram"',
    'source: "future_source"',
    "tradeHubSignalId",
    "wrongMarketExecution",
    "paperExecution",
    "missingCurrencyExecution",
    "authoritativePnl",
    "provider_valuation",
    "provider_closure",
    "Signals feed shows direct TradeHub signals without execution or external-preview leakage",
    "/api/student/signals",
    "expectStudentSignalsResponseSafe",
    "BTCUSDT",
    "XAUUSD",
    "EURUSD",
    "ETHUSDT",
    "DOGEUSDT",
    "filter=forex",
    "filter=crypto",
    "filter=open",
    "providerConfirmed",
    "student-signals-load-more",
    "student-signals-truncation-notice",
    "nextCursor",
    "toHaveCount(initialPayload.signals.length + loadMorePayload.signals.length)",
    "wrongRoleApiResponse.status()).toBe(403)",
    "scrollWidth > window.innerWidth",
    "finally"
  ],
  "Browser coverage seeds direct/external/equal-timestamp/paginated signal fixtures, exercises filters and Load More, confirms strict copied/executed/P&L truthfulness, probes privacy, checks wrong-role denial, layout widths, and cleanup."
);
excludesAll(
  browser,
  ["external-preview can execute", "routePublishedExternal", "telegram execution"],
  "Browser coverage does not fabricate external routing or Telegram execution."
);

includesAll(
  executableRoutingQa,
  [
    "firebase-admin/app",
    "firebase-admin/firestore",
    "routePublishedCryptoSignalForLiveProductionExecution",
    "runLiveProductionCanaryWorker",
    "routePublishedForexSignalForLiveCanaryExecution",
    "runForexLiveCanaryWorker",
    "getExchangeOrderPlacementAdapter",
    "getForexLiveCanaryOrderPlacementAdapter",
    "tradeCopierBilling",
    "Production crypto routing blocks",
    "Production Forex routing blocks",
    "providerCalls.cryptoOrders",
    "providerCalls.forexOrders",
    "mapCryptoProductionAttemptToLedgerEntry",
    "mapForexLiveCanaryAttemptToLedgerEntry",
    "writeAccountLinkedLedgerEntry",
    "listStudentSignalFeed",
    "stage29j_feed_unknown_source",
    "stage29j_feed_future_source",
    "runCryptoFinalBoundaryRaceCoverage",
    "runForexFinalBoundaryRaceCoverage",
    "route then cancel",
    "route then edit",
    "route then pause",
    "route then revoke",
    "route then student kill switch",
    "assertPostRoutingRaceBlocked",
    "assertWorkspaceMismatchRejected",
    "runCryptoLedgerProjectionFailureCoverage",
    "runForexLedgerProjectionFailureCoverage",
    "runCryptoLedgerProjectionRepairDiscoveryCoverage",
    "runForexLedgerProjectionRepairDiscoveryCoverage",
    "runCryptoLedgerProjectionDisabledGateCoverage",
    "runForexLedgerProjectionDisabledGateCoverage",
    "runCryptoLedgerProjectionRetryBoundCoverage",
    "runForexLedgerProjectionRetryBoundCoverage",
    "runCryptoLedgerProjectionConcurrentCoverage",
    "runForexLedgerProjectionConcurrentCoverage",
    "runCryptoLedgerProjectionFencedLateSuccessCoverage",
    "runForexLedgerProjectionFencedLateSuccessCoverage",
    "runCryptoLedgerProjectionFencedLateFailureCoverage",
    "runForexLedgerProjectionFencedLateFailureCoverage",
    "runCryptoLedgerProjectionLeaseStarvationCoverage",
    "runForexLedgerProjectionLeaseStarvationCoverage",
    "runCryptoLedgerProjectionFairExpiredOrderingCoverage",
    "runForexLedgerProjectionFairExpiredOrderingCoverage",
    "runCryptoLedgerProjectionFairDueOrderingCoverage",
    "runForexLedgerProjectionFairDueOrderingCoverage",
    "runCryptoLedgerProjectionClaimFinalFailedCoverage",
    "runForexLedgerProjectionClaimFinalFailedCoverage",
    "prepareLedgerProjectionWriteGate",
    "waitForLedgerProjectionWriteGate",
    "releaseLedgerProjectionWriteGate",
    "stale-created deterministic ledger row",
    "cannot overwrite attempts, clear another lease, or regress projected state",
    "do not consume every actionable projection repair batch slot",
    "selects an older expired lease even when the normal due query fills the batch",
    "selects an older normal due item even when the expired-lease query fills the batch",
    "tie-breaks by global eligible time before applying the batch limit",
    "counts claim-time final_failed transitions without reporting a projection attempt",
    "stage29j_injected_ledger_projection_failure",
    "ledgerProjectionFailures.remainingWrites",
    "ledgerProjectionStatus === \"retry_scheduled\"",
    "ledgerProjectionStatus === \"final_failed\"",
    "ledgerProjectionStatus === \"projected\"",
    "projectionRepair?.repairedCount === 1",
    "first.attemptedCount + second.attemptedCount === 1",
    "performs zero provider or credential-dependent work",
    "calls the provider zero additional times",
    "stage29j_exact_",
    "stage29j_mixed_",
    "pageInfo.hasMore === true",
    "pageInfo.truncated === false",
    "pageInfo.truncated === true",
    "Older records may be omitted",
    "nextCursor.includes(\"stage29j\")",
    "filter=forex",
    "JSON.stringify(response) === JSON.stringify(reloadedResponse)"
  ],
  "Executable Stage 29J routing/feed QA invokes production Crypto and Forex routing/worker exports with deterministic provider adapters, proves blocked cases create no provider side effects, verifies projection repair discovery/leases/retry bounds/disabled-gate independence/truthful counters, verifies typed P&L, and covers final-page plus bounded-truncation pagination."
);

includesAll(
  docs,
  [
    "Stage 29J",
    "Signals Feed And TradeHub Signal Routing",
    "TH-2026-09-07-STAGE29J-SIGNALS-FEED-ROUTING-OWNER-ACCEPTANCE-CLOSURE-HANDOFF",
    "owner-accepted",
    "closed",
    "frozen",
    "7 September 2026",
    "All, Forex, Crypto, and Open",
    "direct in-app TradeHub signals",
    "unapproved external-preview candidates remain absent",
    "server-only `tradeHubSignalId` linkage",
    "matching market",
    "explicit currency",
    "Load More",
    "reload the authoritative signal after claiming an intent",
    "before credential/token loading or provider calls",
    "Ledger projection failure records indexed due-work state",
    "Repair queries due pending/retry/failed work and expired in-progress leases through separate bounded indexed queries",
    "reports attempted/repaired/retry/skipped/not-applicable/final-failed counts truthfully",
    "stale workers cannot clear another worker's lease or regress projected state",
    "without a second provider request or duplicate ledger row",
    "actor/signal workspace mismatches",
    "Stage 29K Telegram Signal Ingestion And Controlled Bridge is implemented/source-QA ready",
    "Stage 29L remains unstarted",
    "External provider acceptance remains deferred"
  ],
  "Stage 29J implementation, boundaries, evidence, and next-stage status are recorded in authoritative docs."
);
excludesAll(
  docs,
  [
    "Stage 29J remains unstarted",
    "Owner acceptance pending criteria",
    "Stage 29J owner acceptance remains pending",
    "Stage 29J Signals Feed And TradeHub Signal Routing is implemented/source-QA ready for adviser review; owner acceptance is not claimed"
  ],
  "Stage 29J docs no longer say unstarted/pending."
);

console.log("Stage 29J Signals Feed And TradeHub Signal Routing QA passed.");
