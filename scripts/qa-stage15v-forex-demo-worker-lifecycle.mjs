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

  assert(missing.length === 0, `${message}${missing.length > 0 ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, message);
}

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  if (startIndex < 0 || endIndex <= startIndex) {
    throw new Error(`Could not locate source block ${start} -> ${end}.`);
  }

  return source.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/crypto-execution.ts");
const signalSymbols = read("src/lib/workspace/signal-symbols.ts");
const dashboardValidation = read("src/lib/workspace/dashboard-validation.ts");
const autoCopyPreferences = read("src/lib/crypto-execution/auto-copy-preferences.ts");
const forexDemo = read("src/lib/crypto-execution/forex-demo-execution.ts");
const forexPaper = read("src/lib/crypto-execution/forex-paper-execution.ts");
const cryptoLiveSandbox = read("src/lib/crypto-execution/crypto-live-sandbox.ts");
const cryptoLiveProduction = read("src/lib/crypto-execution/crypto-live-production.ts");
const provisioningRepo = read("src/lib/crypto-execution/forex-provisioning-repository.ts");
const connectionRepo = read("src/lib/crypto-execution/forex-connection-repository.ts");
const credentialVault = read("src/lib/crypto-execution/credential-vault.ts");
const metaApiAdapter = read("src/lib/crypto-execution/forex/metaapi-adapter.ts");
const forexIndex = read("src/lib/crypto-execution/forex/index.ts");
const workerRoute = read("src/app/api/admin/crypto-execution/forex-demo/worker/run/route.ts");
const studentUi = read("src/components/student-app/student-copier-client.tsx");
const signalManagementUi = read("src/components/workspace/signal-management-section.tsx");
const workspaceUi = read("src/components/workspace/crypto-execution-ops-section.tsx");
const adminUi = read("src/components/admin/crypto-execution-ops-panel.tsx");
const demoPreview = read("src/components/crypto-execution/forex-demo-execution-preview.tsx");
const rules = read("firestore.rules");
const indexes = read("firestore.indexes.json");
const envExample = read(".env.example");
const workerSource = sliceBetween(
  forexDemo,
  "export async function runForexDemoExecutionWorker",
  "export async function runForexDemoReconciliation"
);
const prerequisitesSource = sliceBetween(
  forexDemo,
  "async function loadForexDemoWorkerPrerequisites",
  "function queueAuditEvent"
);
const connectionByIdSource = sliceBetween(
  forexDemo,
  "async function loadVerifiedDemoConnectionById",
  "async function loadForexDemoWorkerPrerequisites"
);
const evaluationSource = sliceBetween(
  forexDemo,
  "function evaluateCandidate",
  "function buildIntentId"
);
const routingSource = sliceBetween(
  forexDemo,
  "export async function routePublishedForexSignalForDemoExecution",
  "function normalizeStatus"
);
const adapterSubmitSource = sliceBetween(
  metaApiAdapter,
  "async function submitMetaApiDemoOrder",
  "async function lookupMetaApiDemoOrder"
);
const provisioningExecutionSource = provisioningRepo.slice(
  provisioningRepo.indexOf("export async function loadStudentForexProvisioningForExecution")
);

assert(
  packageJson.scripts?.["stage15v:qa"] === "node scripts/qa-stage15v-forex-demo-worker-lifecycle.mjs",
  "package.json exposes npm run stage15v:qa."
);

assertIncludesAll(
  types,
  [
    "ForexDemoExecutionIntentRecord",
    "ForexDemoExecutionQueueRecord",
    "ForexDemoOrderAttemptRecord",
    "ForexDemoWorkerRunResponse",
    "environment: \"demo\"",
    "demoOnly: true"
  ],
  "Forex demo lifecycle types are explicitly demo-only."
);

assertIncludesAll(
  signalSymbols,
  [
    "const supportedCryptoSpotSymbols = new Set([",
    "\"BTCUSDT\"",
    "const supportedForexDemoCfdSymbols = new Set([",
    "\"BTCUSD\"",
    "\"XAUUSD\"",
    "export function normalizeSignalPairForForexDemoProof",
    "isSupportedForexDemoProofSymbol(normalized) && !isSupportedCryptoSpotSymbol(normalized)"
  ],
  "Server-side signal allowlists include BTCUSD/XAUUSD only for Forex demo proof while preserving crypto spot separation."
);
assert(
  !signalSymbols.slice(
    signalSymbols.indexOf("const supportedCryptoSpotSymbols = new Set(["),
    signalSymbols.indexOf("const supportedForexPairs = new Set([")
  ).includes("\"BTCUSD\""),
  "BTCUSD is not added to crypto exchange spot routing allowlists."
);
assert(
  !signalSymbols.slice(
    signalSymbols.indexOf("const supportedForexPairs = new Set(["),
    signalSymbols.indexOf("const supportedForexDemoCfdSymbols = new Set([")
  ).includes("\"BTCUSD\""),
  "BTCUSD is not added to the shared Forex paper/live pair allowlist."
);
assertIncludesAll(
  dashboardValidation,
  [
    "normalizeSignalPairForForexDemoProof(pair)",
    "normalizeSignalPairForMarket(pair, market)",
    "XAUUSD, or BTCUSD"
  ],
  "Workspace signal validation accepts demo CFD pairs only through the Forex demo proof validator."
);
assertIncludesAll(
  signalManagementUi,
  [
    "isSupportedForexDemoProofSymbol",
    "isSupportedForexDemoProofSymbol(currentPair)",
    "isSupportedForexDemoProofSymbol(draft.pair)",
    "Forex demo proof supports EURUSD, GBPUSD, XAUUSD, or BTCUSD.",
    "EURUSD, BTCUSD",
    "forex paper simulation; MetaAPI demo proof when gated",
    "Live forex broker execution is not enabled."
  ],
  "Workspace SignalManagementSection accepts BTCUSD for Forex MetaAPI demo proof without presenting it as live Forex."
);
assert(
  !signalManagementUi.includes("isSupportedForexPair"),
  "Workspace SignalManagementSection no longer blocks BTCUSD with the shared Forex pair-only helper."
);
assertIncludesAll(
  autoCopyPreferences,
  [
    "normalizeSignalPairForForexDemoProof",
    "normalizeSignalPairForMarket(entry, \"crypto\")",
    "normalizeSignalPairForForexDemoProof(entry)",
    "const fairnessAccepted = payload.executionFairnessDisclosureAccepted === true",
    "const suitabilityAccepted = payload.suitabilityAcknowledged === true",
    "requestedConsentStatus === \"accepted\" && fairnessAccepted && suitabilityAccepted"
  ],
  "Student Auto-Copy preference storage preserves BTCUSD and only accepts market consent after required acknowledgements."
);
assertIncludesAll(
  studentUi,
  [
    "const nextConsentStatus =",
    "autoCopyForm.executionFairnessDisclosureAccepted && autoCopyForm.suitabilityAcknowledged",
    "consentStatus: nextConsentStatus",
    "Forex Auto-Copy is demo-proof only in this stage.",
    "live forex orders are not enabled."
  ],
  "Student Auto-Copy UI can save accepted market consent for eligible Forex demo routing without presenting live Forex."
);

assertIncludesAll(
  forexDemo,
  [
    "import \"server-only\"",
    "normalizeSignalPairForForexDemoProof",
    "getForexAutoCopyBillingState",
    "loadStudentForexProvisioningForExecution",
    "loadVerifiedDemoConnectionById",
    "loadForexMetaApiToken",
    "getForexDemoOrderPlacementAdapter"
  ],
  "Forex demo worker runs in a server-only module with billing, provisioning, connection, vault, and provider boundaries."
);
assertIncludesAll(
  forexDemo,
  [
    "function buildQueueRecord",
    "satisfies ForexDemoExecutionQueueRecord",
    "\"post_signal_publish\"",
    "forex_demo_execution_queue",
    "forex_demo.execution_queue.queued",
    "Forex demo execution was queued for server-side processing after signal publish.",
    "targetType: \"execution_queue\""
  ],
  "Published Forex signals create protected server-side demo execution queue records after allowed routing."
);
assertIncludesAll(
  evaluationSource,
  [
    "autoCopyPreferences.executionMode === \"full_auto\"",
    "autoCopyPreferences.consentStatus === \"accepted\"",
    "autoCopyPreferences.studentPaused",
    "symbol_allowlist",
    "max_risk_per_trade",
    "sandbox_only",
    "const failed = checks.filter((check) => check.status === \"blocked\");"
  ],
  "Forex demo candidate gate requires full-auto consent, pause-off state, allowed pairs, demo controls, and capped notional."
);
assertIncludesAll(
  routingSource,
  [
    "const queueRecord = buildQueueRecord(intent, now);",
    "batch.set(db.doc(`workspaces/${actor.workspaceId}/forex_demo_execution_queue/${queueRecord.queueId}`), queueRecord, { merge: true });"
  ],
  "Automatic Forex demo queue path creates server-side queue records only for allowed intents."
);
assertBefore(
  routingSource,
  "const intent = buildIntentRecord({",
  "const queueRecord = buildQueueRecord(intent, now);",
  "Forex demo queue records are created from already-gated demo intents."
);
assertBefore(
  evaluationSource,
  "autoCopyPreferences.consentStatus === \"accepted\"",
  "const failed = checks.filter((check) => check.status === \"blocked\");",
  "Student consent is evaluated before allowed Forex demo queue creation."
);
assert(
  !forexPaper.includes("normalizeSignalPairForForexDemoProof") &&
    !cryptoLiveSandbox.includes("normalizeSignalPairForForexDemoProof") &&
    !cryptoLiveProduction.includes("normalizeSignalPairForForexDemoProof"),
  "BTCUSD CFD support is not wired into Forex paper, crypto sandbox, or crypto production routing."
);

assertIncludesAll(
  prerequisitesSource,
  [
    "getForexAutoCopyBillingState(workspaceId, intent.studentId)",
    "loadStudentForexProvisioningForExecution(workspaceId, intent.studentId)",
    "loadVerifiedDemoConnectionById(workspaceId, intent.studentId, intent.connectionId)",
    "if (!billing.entitled)",
    "blockedReason: \"forex_autocopy_not_purchased\"",
    "if (!provisioning)",
    "blockedReason: \"forex_provisioning_required\"",
    "if (!connection)",
    "blockedReason: \"forex_demo_connection_required\""
  ],
  "Worker prerequisite loader requires active paid billing, active provisioning, and a verified demo MetaAPI connection."
);

assertIncludesAll(
  provisioningRepo,
  [
    "rawStatus === \"active_paid\"",
    "rawStatus === \"payment_failed\"",
    "rawStatus === \"past_due\"",
    "rawStatus === \"cancelled\"",
    "rawStatus === \"expired\"",
    "entitled: true",
    "entitled: false"
  ],
  "Forex billing maps only active_paid to entitlement and relocks failed, past_due, cancelled, expired, and unpaid states."
);
assertIncludesAll(
  provisioningExecutionSource,
  [
    "loadForexBillingState(workspaceId, studentId)",
    "if (!billing.entitled || !currentSnapshot.exists)",
    "account.provider !== \"mock\"",
    "account.providerMode !== \"dry_run\"",
    "account.status !== \"provisioning_dry_run_complete\"",
    "account.noBrokerExecution !== true",
    "account.noMetaApiResourceCreated !== true",
    "!account.active"
  ],
  "Execution provisioning loader accepts only active paid mock dry-run no-broker provisioning records."
);

assertIncludesAll(
  connectionByIdSource,
  [
    "workspaces/${workspaceId}/students/${studentId}/forex_connections/${connectionId}",
    "isVerifiedExecutableDemoConnection(connection) ? connection : null"
  ],
  "Worker reloads the specific stored connection before broker proof."
);
assertIncludesAll(
  forexDemo,
  [
    "function isVerifiedExecutableDemoConnection",
    "connection?.environment === \"demo\"",
    "connection.status === \"verified\"",
    "connection.readinessStatus === \"paper_only_ready\"",
    "connection.tokenVaultStatus === \"encrypted_reference_ready\""
  ],
  "Worker accepts only verified demo MetaAPI connections with loadable encrypted token metadata."
);

assertIncludesAll(
  workerSource,
  [
    "confirmation !== \"RUN_FOREX_DEMO\"",
    "intent.executionMode !== \"forex_demo\"",
    "intent.environment !== \"demo\"",
    "intent.demoOnly !== true",
    "intent.status !== \"ready_for_forex_demo\"",
    "const prerequisites = await loadForexDemoWorkerPrerequisites(workspaceId, intent);",
    "if (!prerequisites.ok)",
    "after: { blockedReason: prerequisites.blockedReason }",
    "const token = await loadForexMetaApiToken({",
    "const adapter = getForexDemoOrderPlacementAdapter(intent.provider);"
  ],
  "Worker validates confirmation, demo-only intent shape, current prerequisites, and server-side token/provider boundaries."
);
assertBefore(
  workerSource,
  "const prerequisites = await loadForexDemoWorkerPrerequisites(workspaceId, intent);",
  "if (!orderCallsEnabled) {",
  "Worker checks current paid billing/provisioning/demo connection before recording dry-run attempts."
);
assertBefore(
  workerSource,
  "const prerequisites = await loadForexDemoWorkerPrerequisites(workspaceId, intent);",
  "const token = await loadForexMetaApiToken({",
  "Worker checks current paid billing/provisioning/demo connection before token loading."
);
assertBefore(
  workerSource,
  "const prerequisites = await loadForexDemoWorkerPrerequisites(workspaceId, intent);",
  "const adapter = getForexDemoOrderPlacementAdapter(intent.provider);",
  "Worker checks current paid billing/provisioning/demo connection before provider adapter selection."
);
assertBefore(
  workerSource,
  "intent.environment !== \"demo\"",
  "const prerequisites = await loadForexDemoWorkerPrerequisites(workspaceId, intent);",
  "Worker rejects production/live intent environments before prerequisite or token work."
);

assertIncludesAll(
  workerSource,
  [
    "const orderCallsEnabled = env.demoOrderCallsEnabled",
    "!env.demoDryRun",
    "!controls.platformControl.dryRun",
    "!controls.workspaceControl.dryRun",
    "Forex demo dry-run recorded; no MetaAPI broker call was made.",
    "Forex demo worker recorded a dry-run attempt. MetaAPI order calls remain disabled.",
    "token.environment !== \"demo\"",
    "Forex demo worker only accepts demo MetaAPI tokens."
  ],
  "Worker remains dry-run by default and rejects non-demo token material before provider calls."
);
assertBefore(
  workerSource,
  "if (!orderCallsEnabled) {",
  "const token = await loadForexMetaApiToken({",
  "Dry-run path completes before token loading or provider calls."
);
assertBefore(
  workerSource,
  "token.environment !== \"demo\"",
  "const adapter = getForexDemoOrderPlacementAdapter(intent.provider);",
  "Token demo environment check runs before provider adapter selection."
);

assertIncludesAll(
  envExample,
  [
    "FOREX_EXECUTION_DEMO_ENABLED=false",
    "FOREX_EXECUTION_DEMO_ORDER_CALLS_ENABLED=false",
    "FOREX_EXECUTION_DEMO_DRY_RUN=true"
  ],
  "Environment defaults keep Forex demo execution disabled and dry-run by default."
);
assertIncludesAll(
  metaApiAdapter,
  [
    "input.environment !== \"demo\"",
    "Forex demo order proof rejects non-demo MetaAPI environments.",
    "FOREX_EXECUTION_MOCK_METAAPI",
    "safeProviderErrorFromResponse",
    "safeProviderErrorText",
    "safeProviderExecutionErrorFromPayload",
    "safeProviderExecutionStatus",
    "safeProviderExecutionAccepted",
    "SUCCESSFUL_TRADE_RETCODES",
    "TRADE_RETCODE_MARKET_CLOSED",
    "resolveMetaApiDemoProviderSymbol",
    "validateStopLossTakeProfitAgainstQuote",
    "getCurrentPrice",
    "forex_provider_quote_unavailable",
    "forex_demo_invalid_sl_tp",
    "providerSymbolMatchesCanonical",
    "forex_provider_symbol_unavailable",
    "providerHttpStatus",
    "canonicalSymbol",
    "providerSymbol",
    "sanitizedProviderErrorCode",
    "sanitizedProviderErrorMessage"
  ],
  "MetaAPI adapter rejects production/live Forex order proof and sanitizes provider diagnostics."
);
assertIncludesAll(
  adapterSubmitSource,
  [
    "const symbolResolution = await resolveMetaApiDemoProviderSymbol(input);",
    "const quoteValidation = await validateStopLossTakeProfitAgainstQuote(",
    "if (!quoteValidation.ok)",
    "postTrade(input, metaApiDemoMarketOrderPayload(input, symbolResolution.providerSymbol))",
    "const providerExecutionError = safeProviderExecutionErrorFromPayload(payload);",
    "if (providerExecutionError)",
    "const providerExecutionStatus = safeProviderExecutionStatus(payload);",
    "if (!safeProviderExecutionAccepted(payload) || !providerExecutionStatus)",
    "\"metaapi_demo_submit_failed\"",
    "providerHttpStatus: response.status",
    "canonicalSymbol: symbolResolution.canonicalSymbol",
    "providerSymbol: symbolResolution.providerSymbol",
    "...providerError",
    "MetaAPI returned HTTP ${response.status}"
  ],
  "MetaAPI submit resolves provider symbols and stores safe HTTP/provider diagnostics for failed responses."
);
assertBefore(
  adapterSubmitSource,
  "const quoteValidation = await validateStopLossTakeProfitAgainstQuote(",
  "postTrade(input, metaApiDemoMarketOrderPayload(input, symbolResolution.providerSymbol))",
  "MetaAPI demo submit validates SL/TP against current provider quote before trade submission."
);
assertIncludesAll(
  metaApiAdapter,
  [
    "/current-price",
    "extractProviderQuote",
    "input.side === \"buy\"",
    "stopLoss < referencePrice && takeProfit > referencePrice",
    "stopLoss > referencePrice && takeProfit < referencePrice",
    "MetaAPI current price response did not include a safe bid or ask.",
    "Stop-loss and take-profit were not valid against the current MetaAPI demo quote.",
    "failureCode = \"forex_demo_invalid_sl_tp\"",
    "sanitizedProviderErrorCode: failureCode"
  ],
  "MetaAPI demo adapter requires valid SL/TP against the current provider quote without storing raw quote payloads."
);
assert(
  !forexDemo.includes("currentProviderQuote") &&
    !forexDemo.includes("providerQuote") &&
    !forexDemo.includes("currentBid") &&
    !forexDemo.includes("currentAsk"),
  "Forex demo lifecycle records do not store raw/current provider quote values."
);
assertBefore(
  adapterSubmitSource,
  "const providerExecutionError = safeProviderExecutionErrorFromPayload(payload);",
  "const providerOrderId = providerOrderIdFrom(payload);",
  "MetaAPI 2xx payload error codes are interpreted before provider order IDs."
);
assertIncludesAll(
  metaApiAdapter,
  [
    "record.stringCode",
    "record.retcode",
    "record.returnCode",
    "record.numericCode",
    "record.id",
    "record.orderId",
    "/^ERR[_A-Z0-9-]+$/i.test(entry)",
    "sanitizedProviderErrorCode: errorCode"
  ],
  "MetaAPI 2xx ERR_* payloads are failed safely with sanitized provider error code."
);
assertIncludesAll(
  metaApiAdapter,
  [
    "TRADE_RETCODE_DONE",
    "TRADE_RETCODE_PLACED",
    "TRADE_RETCODE_DONE_PARTIAL",
    "\"10018\": \"TRADE_RETCODE_MARKET_CLOSED\"",
    "/^TRADE_RETCODE[_A-Z0-9-]+$/.test(value)",
    "tradeRetcode && !successfulTradeRetcode(tradeRetcode)",
    "sanitizedProviderErrorCode: tradeRetcode",
    "MetaAPI returned HTTP 2xx without a recognized successful trade retcode or order status.",
    "metaapi_demo_unknown_success_state"
  ],
  "MetaAPI 2xx TRADE_RETCODE_MARKET_CLOSED and unknown TRADE_RETCODE_* payloads fail safely."
);
assertBefore(
  adapterSubmitSource,
  "const providerExecutionError = safeProviderExecutionErrorFromPayload(payload);",
  "const providerExecutionStatus = safeProviderExecutionStatus(payload);",
  "MetaAPI reject/error retcodes are handled before success retcode/status interpretation."
);
assertBefore(
  adapterSubmitSource,
  "const providerExecutionStatus = safeProviderExecutionStatus(payload);",
  "const providerOrderId = providerOrderIdFrom(payload);",
  "Only known successful retcodes/statuses are interpreted before provider order IDs."
);
assertIncludesAll(
  metaApiAdapter,
  [
    "function canonicalForexSymbol",
    "/^[A-Z]{6}$/.test(canonical)",
    "function providerSymbolMatchesCanonical",
    "providerSymbol.toUpperCase().startsWith(canonicalSymbol)",
    "const suffix = providerSymbol.slice(canonicalSymbol.length)",
    "/^[A-Za-z0-9._-]+$/.test(suffix)",
    "function extractTradableSymbols",
    "getAccountSymbols(input)",
    "No MetaAPI tradable symbol matched ${canonicalSymbol}."
  ],
  "Broker symbol mapping supports safe suffixes without weakening canonical TradeHub pair allowlists."
);
assertBefore(
  workerSource,
  "symbol: intent.pair",
  "clientOrderId: intent.providerClientOrderId",
  "Worker passes the canonical TradeHub pair to the adapter after existing pair allowlists."
);
assertIncludesAll(
  forexDemo,
  [
    "const entryPrice = firstNumericLevel(signal.entry);",
    "const stopLoss = firstNumericLevel(signal.stopLoss);",
    "const takeProfit = firstNumericLevel(signal.takeProfit);",
    "entryPrice: entryPrice ?? undefined",
    "stopLoss: stopLoss ?? undefined",
    "takeProfit: takeProfit ?? undefined",
    "entryPrice: intent.entryPrice",
    "stopLoss: intent.stopLoss",
    "takeProfit: intent.takeProfit"
  ],
  "Forex demo intents and attempts preserve audited signal entry, stop-loss, and take-profit levels."
);
assertIncludesAll(
  metaApiAdapter,
  [
    "stopLoss: input.stopLoss",
    "takeProfit: input.takeProfit"
  ],
  "MetaAPI demo market-order payload includes signal stop-loss and take-profit when present."
);
assertBefore(
  workerSource,
  "stopLoss: intent.stopLoss",
  "clientOrderId: intent.providerClientOrderId",
  "Worker passes signal stop-loss into MetaAPI before the provider client id."
);
assertBefore(
  workerSource,
  "takeProfit: intent.takeProfit",
  "clientOrderId: intent.providerClientOrderId",
  "Worker passes signal take-profit into MetaAPI before the provider client id."
);
assert(
  !adapterSubmitSource.includes("comment: input.clientOrderId") &&
    !adapterSubmitSource.includes("clientId: input.clientOrderId") &&
    !adapterSubmitSource.includes("clientOrderId: input.clientOrderId"),
  "MetaAPI submit payload does not send the long internal providerClientOrderId as broker comment/client id."
);
assert(
  !metaApiAdapter.includes("rawProviderPayload") &&
    !metaApiAdapter.includes("providerPayload") &&
    !metaApiAdapter.includes("sanitizedProviderErrorMessage: payload") &&
    !metaApiAdapter.includes("sanitizedProviderErrorCode: payload"),
  "MetaAPI adapter never stores raw provider payloads as diagnostics."
);
assert(forexIndex.includes("import \"server-only\""), "Forex provider adapter index is server-only.");
assert(!metaApiAdapter.includes("console.log"), "MetaAPI adapter does not log secrets or raw provider payloads.");
assertIncludesAll(
  credentialVault,
  [
    "loadForexMetaApiToken",
    "Production MetaAPI token vault metadata is incomplete.",
    "Local encrypted credential storage is disabled in production."
  ],
  "MetaAPI token loading remains behind fail-closed server vault helpers."
);

assertIncludesAll(
  workerRoute,
  [
    "requireSuperAdmin",
    "runForexDemoExecutionWorker"
  ],
  "Forex demo worker mutation is Super Admin server-routed."
);
assertIncludesAll(
  workerSource,
  [
    "export async function runForexDemoExecutionWorker(actor: VerifiedSuperAdmin, payload: unknown)",
    "confirmation !== \"RUN_FOREX_DEMO\"",
    "actorType: \"super_admin\""
  ],
  "RUN_FOREX_DEMO remains a Super Admin operator QA surface only."
);
assert(
  !studentUi.includes("RUN_FOREX_DEMO") &&
    !workspaceUi.includes("RUN_FOREX_DEMO") &&
    !signalManagementUi.includes("RUN_FOREX_DEMO") &&
    !studentUi.includes("/api/admin/crypto-execution/forex-demo/worker/run") &&
    !workspaceUi.includes("/api/admin/crypto-execution/forex-demo/worker/run") &&
    !signalManagementUi.includes("/api/admin/crypto-execution/forex-demo/worker/run"),
  "Student and workspace browser surfaces cannot invoke the Super Admin Forex demo worker."
);
assertIncludesAll(
  rules,
  [
    "forex_demo_intents",
    "forex_demo_execution_queue",
    "forex_demo_order_attempts",
    "forex_demo_gate_decisions",
    "forex_demo_audit_events",
    "forex_connections",
    "allow read, write: if false;"
  ],
  "Firestore rules keep Forex demo and connection records protected from client SDK writes."
);
assertIncludesAll(
  indexes,
  [
    "\"collectionGroup\": \"forex_demo_intents\"",
    "\"collectionGroup\": \"forex_demo_order_attempts\"",
    "\"collectionGroup\": \"forex_demo_gate_decisions\""
  ],
  "Firestore indexes support bounded Forex demo worker lifecycle queries."
);

const browserSources = `${studentUi}\n${workspaceUi}\n${adminUi}\n${demoPreview}`;
const demoPreviewSources = `${workspaceUi}\n${adminUi}\n${demoPreview}`;
assert(
  !browserSources.includes("metaApiToken") &&
    !browserSources.includes("metaApiAccountId") &&
    !browserSources.includes("credentialRefPath") &&
    !browserSources.includes("secretManagerSecretName") &&
    !browserSources.includes("rawProviderPayload") &&
    !browserSources.includes("getForexDemoOrderPlacementAdapter") &&
    !browserSources.includes("forex/metaapi-adapter") &&
    !browserSources.includes("agiliumtrade"),
  "Browser surfaces never expose MetaAPI tokens, vault refs, raw payloads, provider adapters, or MetaAPI endpoints."
);
assert(
  !demoPreviewSources.includes("brokerPassword"),
  "Forex demo preview/admin surfaces never expose broker passwords."
);
assert(
  !connectionRepo.includes("submitOrder({") &&
    !provisioningRepo.includes("submitOrder({"),
  "Forex connection and provisioning setup never submit broker orders."
);

console.log("Stage 15V Forex demo worker lifecycle QA passed.");
