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
const forexLive = read("src/lib/crypto-execution/forex-live-canary-execution.ts");
const forexConnectionRepo = read("src/lib/crypto-execution/forex-connection-repository.ts");
const forexDemo = read("src/lib/crypto-execution/forex-demo-execution.ts");
const metaApiAdapter = read("src/lib/crypto-execution/forex/metaapi-adapter.ts");
const forexTypes = read("src/lib/crypto-execution/forex/types.ts");
const forexIndex = read("src/lib/crypto-execution/forex/index.ts");
const dashboardRepo = read("src/lib/workspace/dashboard-repository.ts");
const cryptoRepo = read("src/lib/crypto-execution/crypto-execution-repository.ts");
const workerRoute = read("src/app/api/admin/crypto-execution/forex-live-canary/worker/run/route.ts");
const adminLiveCanaryConnectionRoute = read("src/app/api/admin/crypto-execution/forex-live-canary/connections/route.ts");
const studentLiveCanaryConnectionRoute = read("src/app/api/student/forex-execution/live-canary/connections/route.ts");
const demoForexConnectionRoute = read("src/app/api/student/forex-execution/connections/route.ts");
const adminUi = read("src/components/admin/crypto-execution-ops-panel.tsx");
const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const preview = read("src/components/crypto-execution/forex-live-canary-preview.tsx");
const studentUi = read("src/components/student-app/student-copier-client.tsx");
const workspaceUi = read("src/components/workspace/crypto-execution-ops-section.tsx");
const signalUi = read("src/components/workspace/signal-management-section.tsx");
const cryptoSandbox = read("src/lib/crypto-execution/crypto-live-sandbox.ts");
const cryptoProduction = read("src/lib/crypto-execution/crypto-live-production.ts");
const rules = read("firestore.rules");
const indexes = read("firestore.indexes.json");
const envExample = read(".env.example");

const envSource = sliceBetween(forexLive, "function forexLiveCanaryEnv", "function sanitizeList");
const evaluationSource = sliceBetween(forexLive, "async function evaluateCandidate", "export async function routePublishedForexSignalForLiveCanaryExecution");
const routingSource = sliceBetween(forexLive, "export async function routePublishedForexSignalForLiveCanaryExecution", "function normalizeStatus");
const prerequisitesSource = sliceBetween(forexLive, "async function loadForexLiveCanaryWorkerPrerequisites", "function buildAttempt");
const workerSource = forexLive.slice(forexLive.indexOf("export async function runForexLiveCanaryWorker"));
const setupGateSource = sliceBetween(forexLive, "export async function loadForexLiveCanarySetupGate", "function mapForexConnection");
const liveCanaryConnectionSource = sliceBetween(
  forexConnectionRepo,
  "export async function createStudentForexLiveCanaryConnection",
  "export async function refreshStudentForexConnection"
);
const demoConnectionSource = sliceBetween(
  forexConnectionRepo,
  "export async function createStudentForexConnection",
  "export async function createStudentForexLiveCanaryConnection"
);
const liveSubmitSource = sliceBetween(metaApiAdapter, "async function submitMetaApiLiveCanaryOrder", "async function lookupMetaApiDemoOrder");
const demoSubmitSource = sliceBetween(metaApiAdapter, "async function submitMetaApiDemoOrder", "async function submitMetaApiLiveCanaryOrder");

assert(
  packageJson.scripts?.["stage15w:qa"] === "node scripts/qa-stage15w-forex-live-canary.mjs",
  "package.json exposes npm run stage15w:qa."
);

assertIncludesAll(
  types,
  [
    "ForexLiveCanaryControlRecord",
    "ForexLiveCanaryGateDecisionRecord",
    "ForexLiveCanaryIntentRecord",
    "ForexLiveCanaryOrderAttemptRecord",
    "ForexLiveCanaryExecutionPreview",
    "ForexLiveCanaryWorkerRunResponse",
    "productionConnectionSetupEnabled: boolean",
    "liveCanarySetup?:",
    "environment: \"production\"",
    "executionMode: \"forex_live_canary\"",
    "liveCanary: true"
  ],
  "Stage 15W has typed live Forex canary controls, gates, intents, attempts, previews, and worker response."
);

assertIncludesAll(
  envExample,
  [
    "FOREX_LIVE_CANARY_ENABLED=false",
    "FOREX_LIVE_CANARY_SETUP_ENABLED=false",
    "FOREX_LIVE_ORDER_CALLS_ENABLED=false",
    "FOREX_LIVE_DRY_RUN=true",
    "FOREX_LIVE_MAX_NOTIONAL_USD=5",
    "FOREX_LIVE_MAX_DAILY_NOTIONAL_USD=5",
    "FOREX_LIVE_MAX_VOLUME=0.01"
  ],
  "Live Forex canary env defaults are disabled and dry-run with tiny caps."
);
assertIncludesAll(
  envSource,
  [
    "process.env.FOREX_LIVE_CANARY_ENABLED === \"true\"",
    "process.env.FOREX_LIVE_CANARY_SETUP_ENABLED === \"true\"",
    "process.env.FOREX_LIVE_ORDER_CALLS_ENABLED === \"true\"",
    "process.env.FOREX_LIVE_DRY_RUN !== \"false\"",
    "Math.min(safeNumber(process.env.FOREX_LIVE_MAX_NOTIONAL_USD, 5), 5)",
    "Math.min(safeNumber(process.env.FOREX_LIVE_MAX_VOLUME, 0.01), 0.01)"
  ],
  "Live canary code requires explicit env gates and clamps tiny notional/volume caps."
);
assertIncludesAll(
  setupGateSource,
  [
    "loadForexLiveCanarySetupGate",
    "env.liveCanarySetupEnabled",
    "env.liveCanaryEnabled",
    "controls.platformControl.productionConnectionSetupEnabled",
    "controls.workspaceControl.productionConnectionSetupEnabled",
    "!controls.platformControl.killSwitchEnabled",
    "!controls.workspaceControl.killSwitchEnabled",
    "setupEnabled",
    "Production MetaAPI setup is disabled by server environment."
  ],
  "Production MetaAPI setup is hidden/disabled unless setup env, canary env, platform control, and workspace control gates are enabled."
);

assertIncludesAll(
  forexLive,
  [
    "import \"server-only\"",
    "normalizeSignalPairForMarket(value, \"forex\")",
    "getForexAutoCopyBillingState",
    "resolveStudentEntitlements",
    "loadForexMetaApiToken",
    "getForexLiveCanaryOrderPlacementAdapter"
  ],
  "Live Forex canary is server-only and uses billing, entitlement, vault, and provider boundaries."
);
assertIncludesAll(
  evaluationSource,
  [
    "entitlements.riskPosture === \"personal_account\"",
    "autoCopyPreferences.consentStatus === \"accepted\"",
    "autoCopyPreferences.studentPaused",
    "autoCopyPreferences.consentStatus === \"revoked\"",
    "platformControl.allowedWorkspaceIds.includes(signal.workspaceId)",
    "platformControl.allowedStudentIds.includes(studentId)",
    "workspaceControl.allowedStudentIds.includes(studentId)",
    "platformControl.allowedPairs.includes(pair)",
    "workspaceControl.allowedPairs.includes(pair)",
    "\"student_allowlist\"",
    "\"workspace_allowlist\"",
    "accountAllowedByBothControls(platformControl, workspaceControl, accountFingerprint)",
    "withdrawal_capability_unavailable_unverified",
    "existingOpenOrders < 1",
    "usedToday + requestedNotionalUsd <= env.maxDailyNotionalUsd",
    "volume <= env.maxVolume"
  ],
  "Live canary routing requires personal posture, accepted consent, pause off, workspace/student/account/symbol allowlists, withdrawal safety, and tiny caps."
);
assertIncludesAll(
  routingSource,
  [
    "routePublishedForexSignalForLiveCanaryExecution",
    "Forex live canary routing only runs for newly published forex signals.",
    "Tiny live Forex canary routing started",
    "No broker order is placed by publish routing.",
    "forex_live_canary_gate_decisions",
    "forex_live_canary_intents"
  ],
  "Influencer signal publish creates only server-side live canary gate/intent records."
);
assert(!routingSource.includes("loadForexMetaApiToken") && !routingSource.includes("submitOrder("), "Publish routing never loads MetaAPI tokens or submits live orders.");

assertIncludesAll(
  prerequisitesSource,
  [
    "getForexAutoCopyBillingState(workspaceId, intent.studentId)",
    "loadVerifiedLiveConnectionById(workspaceId, intent.studentId, intent.connectionId)",
    "if (!billing.entitled)",
    "forex_autocopy_not_purchased",
    "preferences.executionMode !== \"full_auto\"",
    "preferences.consentStatus !== \"accepted\"",
    "preferences.studentPaused",
    "controls.platformControl.killSwitchEnabled",
    "controls.workspaceControl.killSwitchEnabled",
    "controls.platformControl.allowedWorkspaceIds.includes(workspaceId)",
    "controls.platformControl.allowedStudentIds.includes(intent.studentId)",
    "controls.workspaceControl.allowedStudentIds.includes(intent.studentId)",
    "controls.platformControl.allowedPairs.includes(intent.pair)",
    "controls.workspaceControl.allowedPairs.includes(intent.pair)",
    "openOrderCount(workspaceId, intent.studentId)",
    "todayNotionalUsd(workspaceId, intent.studentId)",
    "A verified production MetaAPI connection with encrypted token storage is required; demo connections are rejected.",
    "accountAllowedByBothControls"
  ],
  "Worker prerequisites re-check current billing, consent, pause, controls, allowlists, caps, production connection, and account allowlist before token loading."
);
assertBefore(
  workerSource,
  "const prerequisites = await loadForexLiveCanaryWorkerPrerequisites(workspaceId, intent);",
  "const token = await loadForexMetaApiToken",
  "Live canary worker checks prerequisites before token loading."
);
assertBefore(
  workerSource,
  "const prerequisites = await loadForexLiveCanaryWorkerPrerequisites(workspaceId, intent);",
  "const adapter = getForexLiveCanaryOrderPlacementAdapter(intent.provider);",
  "Live canary worker checks prerequisites before provider adapter selection."
);
assertIncludesAll(
  workerSource,
  [
    "confirmation !== \"RUN_FOREX_LIVE_CANARY\"",
    ".limit(FOREX_LIVE_CANARY_WORKER_LIMIT + 1)",
    "candidateLimit: 1",
    "intent.environment !== \"production\"",
    "intent.liveCanary !== true",
    "token.environment !== \"production\"",
    "Tiny live Forex canary only accepts production MetaAPI tokens.",
    "env.liveOrderCallsEnabled",
    "!env.liveDryRun",
    "!prerequisites.controls.platformControl.dryRun",
    "!prerequisites.controls.workspaceControl.dryRun",
    "Tiny live Forex canary dry-run recorded; no MetaAPI broker call was made."
  ],
  "Worker is typed-confirmed, max-one, production-only, and dry-run/order-call gated."
);
assertBefore(
  workerSource,
  "if (!orderCallsEnabled) {",
  "const token = await loadForexMetaApiToken",
  "Dry-run live canary path completes before token loading or provider calls."
);

assertIncludesAll(
  forexTypes,
  [
    "ForexLiveCanaryOrderInput",
    "environment: \"production\"",
    "liveCanary: true",
    "ForexLiveCanaryOrderPlacementAdapter"
  ],
  "Provider types separate production live canary order input from demo order input."
);
assertIncludesAll(
  forexIndex,
  [
    "metaApiLiveCanaryOrderAdapter",
    "getForexLiveCanaryOrderPlacementAdapter"
  ],
  "Forex provider index exposes a separate live canary adapter."
);
assertIncludesAll(
  liveSubmitSource,
  [
    "input.environment !== \"production\" || input.liveCanary !== true",
    "forex_live_canary_environment_required",
    "const symbolResolution = await resolveMetaApiDemoProviderSymbol(input);",
    "const quoteValidation = await validateStopLossTakeProfitAgainstQuote(",
    "\"forex_live_canary_invalid_sl_tp\"",
    "postTrade(input, metaApiDemoMarketOrderPayload(input, symbolResolution.providerSymbol))",
    "metaapi_live_canary_submit_failed",
    "providerHttpStatus: response.status",
    "canonicalSymbol: symbolResolution.canonicalSymbol",
    "providerSymbol: symbolResolution.providerSymbol",
    "providerOrderRef: maskRef"
  ],
  "MetaAPI live canary adapter rejects demo, validates quote SL/TP before order POST, and stores only safe diagnostics."
);
assertBefore(
  liveSubmitSource,
  "const quoteValidation = await validateStopLossTakeProfitAgainstQuote(",
  "postTrade(input, metaApiDemoMarketOrderPayload(input, symbolResolution.providerSymbol))",
  "Live canary quote validation happens before order POST."
);
assertIncludesAll(
  demoSubmitSource,
  [
    "input.environment !== \"demo\"",
    "Forex demo order proof rejects non-demo MetaAPI environments."
  ],
  "Forex demo execution remains demo-only and keeps its demo SL/TP diagnostics."
);
assert(metaApiAdapter.includes("forex_demo_invalid_sl_tp"), "MetaAPI adapter keeps demo-specific SL/TP diagnostics.");

assertIncludesAll(
  workerRoute,
  [
    "requireSuperAdmin",
    "runForexLiveCanaryWorker"
  ],
  "Live Forex canary worker API route is Super Admin only."
);
assertIncludesAll(
  adminLiveCanaryConnectionRoute,
  [
    "requireSuperAdmin",
    "createOperatorForexLiveCanaryConnection",
    "getAdminWorkspaceCryptoExecutionOverview"
  ],
  "Production MetaAPI setup has a separate Super Admin Forex live-canary connection route."
);
assertIncludesAll(
  studentLiveCanaryConnectionRoute,
  [
    "forex_live_canary_operator_only",
    "Normal students use MT4/MT5 broker setup."
  ],
  "Normal student production MetaAPI setup route is operator-only and fails closed."
);
assertIncludesAll(
  demoForexConnectionRoute,
  [
    "createStudentForexConnection"
  ],
  "Existing Forex MetaAPI connection route remains the demo connection route."
);
assert(
  !demoForexConnectionRoute.includes("createStudentForexLiveCanaryConnection"),
  "Demo Forex connection route does not reuse the production live-canary setup handler."
);
assertIncludesAll(
  forexConnectionRepo,
  [
    "assertForexConnectionCreationAllowed(base, input.environment)",
    "if (environment !== \"demo\")",
    "forex_metaapi_demo_only"
  ],
  "Existing demo MetaAPI connection creation remains demo-only."
);
assertIncludesAll(
  liveCanaryConnectionSource,
  [
    "validateForexLiveCanaryConnectionPayload(payload)",
    "assertEligibleForForexConnection(base)",
    "assertForexLiveCanaryConnectionSetupAllowed(base)",
    "environment: \"production\"",
    "getForexConnectionVerificationAdapter(input.provider)",
    "const productionVerified = verification.ok && verification.environment === \"production\"",
    "forex_live_canary_production_account_required",
    "storeForexMetaApiToken",
    "providerAccountFingerprint: verification.providerAccountFingerprint",
    "noTradeExecution: true",
    "Live order calls remain separately gated."
  ],
  "Production MetaAPI connection setup requires active paid billing, setup gates, production metadata verification, encrypted storage, and safe fingerprint metadata."
);
assertIncludesAll(
  forexConnectionRepo,
  [
    "base.forexBilling.status !== \"active_paid\"",
    "loadForexLiveCanarySetupGate(base.workspace.workspaceId)",
    "forex_live_canary_setup_disabled"
  ],
  "Production MetaAPI setup helper enforces active paid Forex billing and live-canary setup gate before provider verification."
);
assert(
  !liveCanaryConnectionSource.includes("submitOrder(") &&
    !liveCanaryConnectionSource.includes("postTrade(") &&
    !liveCanaryConnectionSource.includes("getForexLiveCanaryOrderPlacementAdapter"),
  "Production MetaAPI connection verification never submits orders or selects the live order adapter."
);
assertIncludesAll(
  forexConnectionRepo,
  [
    "NO_WITHDRAWAL_NO_CUSTODY",
    "notFundedOrPropFirmAcknowledged",
    "realMoneyRiskAcknowledged",
    "noWithdrawalNoCustodyConfirmationText",
    "providerAccountFingerprintAvailable",
    "productionConnectionReady"
  ],
  "Production connection setup requires live-canary acknowledgements and previews only safe setup/fingerprint readiness."
);
assertIncludesAll(
  adminUi,
  [
    "Tiny live Forex canary",
    "Real money risk",
    "RUN_FOREX_LIVE_CANARY",
    "onRunForexLiveCanary",
    "ForexLiveCanaryPreviewCard"
  ],
  "Admin UI clearly labels tiny live Forex canary and real money risk."
);
assertIncludesAll(
  adminPage,
  [
    "ForexLiveCanaryWorkerRunResponse",
    "/api/admin/crypto-execution/forex-live-canary/worker/run",
    "runForexLiveCanary"
  ],
  "Admin page calls the Super Admin live Forex canary route only from operator controls."
);
assertIncludesAll(
  preview,
  [
    "Tiny live canary",
    "Real money risk",
    "providerOrderRef",
    "sanitizedFailureReason"
  ],
  "Live canary preview shows safe status only."
);
assertIncludesAll(
  adminLiveCanaryConnectionRoute,
  [
    "requireSuperAdmin"
  ],
  "Production MetaAPI canary setup is under an operator-only API path."
);
assert(
  studentUi.includes("/api/student/crypto-execution/connections") &&
    !studentUi.includes("/api/student/forex-execution/live-canary/connections") &&
    studentUi.includes("Forex AutoCopy broker setup"),
  "Crypto Binance/Bybit connection form is not reused for production Forex MetaAPI setup and normal students see broker setup instead."
);
assertIncludesAll(
  studentUi,
  [
    "!baseEligible ?",
    "{eligible ? (",
    "Crypto AutoCopy billing",
    "Forex AutoCopy broker setup"
  ],
  "Crypto AutoCopy paid status does not hide the independent Forex AutoCopy and MetaAPI setup sections."
);

assertIncludesAll(
  dashboardRepo,
  [
    "routePublishedForexSignalForLiveCanaryExecution",
    "forexLiveCanaryRoutingSummary"
  ],
  "Workspace Forex signal publish is wired to server-side live canary candidate/gate routing."
);
assertIncludesAll(
  cryptoRepo,
  [
    "loadForexLiveCanaryExecutionPreview",
    "forexLiveCanary: workspaceExecution.forexLiveCanary",
    "emptyForexLiveCanaryExecutionPreview"
  ],
  "Admin/workspace overviews include safe live Forex canary preview data."
);

assertIncludesAll(
  rules,
  [
    "platform_forex_live_canary_controls",
    "forex_live_canary_controls",
    "forex_live_canary_intents",
    "forex_live_canary_order_attempts",
    "forex_live_canary_gate_decisions",
    "forex_live_canary_audit_events",
    "allow read, write: if false;"
  ],
  "Firestore rules deny all live Forex canary collections to client SDKs."
);
assertIncludesAll(
  indexes,
  [
    "\"collectionGroup\": \"forex_live_canary_intents\"",
    "\"collectionGroup\": \"forex_live_canary_order_attempts\"",
    "\"collectionGroup\": \"forex_live_canary_gate_decisions\"",
    "\"collectionGroup\": \"forex_live_canary_audit_events\""
  ],
  "Firestore indexes support bounded live Forex canary preview and worker queries."
);

const browserSources = `${studentUi}\n${workspaceUi}\n${signalUi}\n${adminUi}\n${preview}`;
assert(
  !browserSources.includes("metaApiToken") &&
    !browserSources.includes("metaApiAccountId") &&
    !browserSources.includes("credentialRefPath") &&
    !browserSources.includes("secretManagerSecretName") &&
    !browserSources.includes("rawProviderPayload") &&
    !browserSources.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !browserSources.includes("forex/metaapi-adapter") &&
    !browserSources.includes("agiliumtrade"),
  "Browser surfaces never expose MetaAPI tokens, account IDs, vault refs, raw payloads, provider adapters, or MetaAPI endpoints."
);
assert(
  !preview.includes("brokerPassword") &&
    !adminUi.includes("brokerPassword"),
  "Live canary UI does not expose broker passwords."
);
assert(
  !forexDemo.includes("forex_live_canary") &&
    !cryptoSandbox.includes("forex_live_canary") &&
    !cryptoProduction.includes("forex_live_canary"),
  "Forex demo and crypto execution paths are not weakened by the live Forex canary path."
);
assert(
  !metaApiAdapter.includes("rawProviderPayload") &&
    !metaApiAdapter.includes("providerPayload") &&
    !metaApiAdapter.includes("console.log"),
  "MetaAPI adapter does not store/log raw provider payloads or secrets."
);

console.log("Stage 15W tiny live Forex canary QA passed.");
