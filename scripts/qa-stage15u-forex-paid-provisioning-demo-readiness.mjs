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
const subscriptionRepo = read("src/lib/crypto-execution/forex-autocopy-subscription-repository.ts");
const provisioningRepo = read("src/lib/crypto-execution/forex-provisioning-repository.ts");
const connectionRepo = read("src/lib/crypto-execution/forex-connection-repository.ts");
const forexDemo = read("src/lib/crypto-execution/forex-demo-execution.ts");
const metaApiAdapter = read("src/lib/crypto-execution/forex/metaapi-adapter.ts");
const credentialVault = read("src/lib/crypto-execution/credential-vault.ts");
const studentUi = read("src/components/student-app/student-copier-client.tsx");
const workspaceUi = read("src/components/workspace/crypto-execution-ops-section.tsx");
const adminUi = read("src/components/admin/crypto-execution-ops-panel.tsx");
const provisioningPreview = read("src/components/crypto-execution/forex-provisioning-preview.tsx");
const demoPreview = read("src/components/crypto-execution/forex-demo-execution-preview.tsx");
const connectionPreview = read("src/components/crypto-execution/forex-connection-readiness-preview.tsx");
const provisioningRoute = read("src/app/api/student/forex-execution/provisioning/route.ts");
const connectionRoute = read("src/app/api/student/forex-execution/connections/route.ts");
const demoWorkerRoute = read("src/app/api/admin/crypto-execution/forex-demo/worker/run/route.ts");
const rules = read("firestore.rules");
const rulesTest = read("scripts/firestore-rules-stage15f.test.mjs");
const indexes = read("firestore.indexes.json");
const envExample = read(".env.example");
const refreshConnectionSource = sliceBetween(
  connectionRepo,
  "export async function refreshStudentForexConnection",
  "export async function disableStudentForexConnection"
);
const disableConnectionSource = sliceBetween(
  connectionRepo,
  "export async function disableStudentForexConnection",
  "export function emptyForexConnectionReadinessPreview"
);

assert(
  packageJson.scripts?.["stage15u:qa"] === "node scripts/qa-stage15u-forex-paid-provisioning-demo-readiness.mjs",
  "package.json exposes npm run stage15u:qa."
);

assertIncludesAll(
  types,
  [
    "ForexAutoCopyBillingStatus",
    "ForexProvisioningPreview",
    "ForexProvisionedAccountRecord",
    "ForexDemoExecutionIntentRecord",
    "ForexDemoWorkerRunResponse"
  ],
  "Stage 15U has the paid billing, provisioning, and forex demo proof types."
);

assertIncludesAll(
  provisioningRepo,
  [
    "function mapForexBillingState(record: Record<string, unknown> | null): ForexBillingState",
    "rawStatus === \"active_paid\"",
    "rawStatus === \"payment_pending\"",
    "rawStatus === \"payment_failed\"",
    "rawStatus === \"past_due\"",
    "rawStatus === \"cancelled\"",
    "rawStatus === \"expired\"",
    "entitled: true",
    "entitled: false",
    "billing.entitled && status !== \"disabled\" && status !== \"cancelled\"",
    "Purchase Forex AutoCopy before connecting an MT4/MT5 broker account."
  ],
  "Forex provisioning billing state unlocks only active_paid and relocks unpaid, failed, cancelled, expired, and past_due statuses."
);

assertIncludesAll(
  provisioningRepo,
  [
    "resolveStudentEntitlements",
    "autoCopyEntitlement.access !== \"allowed\"",
    "base.entitlements.riskPosture !== \"personal_account\"",
    "base.entitlements.subscriptionStatus === \"trial\"",
    "base.entitlements.subscriptionStatus === \"past_due\"",
    "base.entitlements.subscriptionStatus === \"cancelled\"",
    "base.entitlements.subscriptionStatus === \"expired\"",
    "if (!base.forexBilling.entitled)",
    "\"forex_autocopy_not_purchased\""
  ],
  "Broker provisioning preserves Stage 16 entitlements, personal-account posture, active course billing, and paid Forex add-on gates."
);
assertBefore(
  provisioningRepo,
  "assertForexProvisioningAllowed(base);",
  "batch.set(db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/forex_provisioning/current`)",
  "Paid Forex provisioning checks run before any provisioning document is written."
);

assertIncludesAll(
  provisioningRepo,
  [
    "providerMode(): ForexProvisioningProviderMode",
    "return \"dry_run\";",
    "provider: \"mock\"",
    "providerMode: \"dry_run\"",
    "passwordHandling: \"discarded_mock_dry_run\"",
    "noBrokerExecution: true",
    "noMetaApiResourceCreated: true",
    "No MetaAPI resource, terminal, demo order, or live order was created.",
    "Mock Forex AutoCopy account is provisioned for readiness only. No MetaAPI cost or broker execution is active."
  ],
  "Forex provisioning path is mock/dry-run only and does not store broker passwords or create MetaAPI/cloud/broker resources."
);
assert(
  !provisioningRepo.includes("brokerPassword: input.brokerPassword") &&
    !provisioningRepo.includes("brokerPassword: brokerPassword") &&
    !provisioningRepo.includes("createMetaApi") &&
    !provisioningRepo.includes("createAccount") &&
    !provisioningRepo.includes("deployTerminal") &&
    !provisioningRepo.includes("submitOrder({"),
  "Provisioning repository has no raw broker password storage, MetaAPI account creation, terminal deploy, or order submission."
);

assertIncludesAll(
  connectionRepo,
  [
    "getForexAutoCopyBillingState(actor.workspaceId, actor.studentId)",
    "function assertForexConnectionCreationAllowed",
    "if (!base.forexBilling.entitled)",
    "\"forex_autocopy_not_purchased\"",
    "if (environment !== \"demo\")",
    "\"forex_metaapi_demo_only\"",
    "MetaAPI proof is demo-only until live Forex trading is explicitly enabled."
  ],
  "MetaAPI proof connection creation is paid Forex AutoCopy gated and demo-only."
);
assertBefore(
  connectionRepo,
  "assertForexConnectionCreationAllowed(base, input.environment);",
  "const adapter = getForexConnectionVerificationAdapter(input.provider);",
  "Paid/demo-only MetaAPI proof checks run before provider verification."
);
assertBefore(
  connectionRepo,
  "assertForexConnectionCreationAllowed(base, input.environment);",
  "storeForexMetaApiToken({",
  "Paid/demo-only MetaAPI proof checks run before any MetaAPI token is stored."
);

assertIncludesAll(
  connectionRepo,
  [
    "function assertForexConnectionRefreshAllowed",
    "if (!base.forexBilling.entitled)",
    "\"forex_autocopy_not_purchased\"",
    "if (connection.environment !== \"demo\")",
    "MetaAPI refresh proof is demo-only until live Forex trading is explicitly enabled."
  ],
  "MetaAPI proof refresh guard is paid Forex AutoCopy gated and demo-only."
);
assertIncludesAll(
  refreshConnectionSource,
  [
    "assertForexConnectionRefreshAllowed(base, connection);",
    "await appendForexConnectionAuditEvent({",
    "action: \"forex_connection.refresh_attempted\"",
    "const credential = await loadForexMetaApiToken({",
    "const adapter = getForexConnectionVerificationAdapter(connection.provider);"
  ],
  "MetaAPI proof refresh path contains the paid/demo guard before audit, token loading, and provider verification."
);
assertBefore(
  refreshConnectionSource,
  "assertForexConnectionRefreshAllowed(base, connection);",
  "await appendForexConnectionAuditEvent({",
  "Refresh paid/demo-only checks run before refresh audit events."
);
assertBefore(
  refreshConnectionSource,
  "assertForexConnectionRefreshAllowed(base, connection);",
  "const credential = await loadForexMetaApiToken({",
  "Refresh paid/demo-only checks run before stored MetaAPI token loading."
);
assertBefore(
  refreshConnectionSource,
  "assertForexConnectionRefreshAllowed(base, connection);",
  "const adapter = getForexConnectionVerificationAdapter(connection.provider);",
  "Refresh paid/demo-only checks run before provider verification adapter selection."
);
assert(
  !disableConnectionSource.includes("assertForexConnectionRefreshAllowed") &&
    !disableConnectionSource.includes("forex_autocopy_not_purchased"),
  "Disabling/revoking stored Forex credentials remains usable without the paid refresh gate."
);

assertIncludesAll(
  forexDemo,
  [
    "loadStudentForexProvisioningForExecution",
    "loadForexDemoWorkerPrerequisites",
    "\"forex_provisioning\"",
    "Paid Forex AutoCopy provisioning is required before demo execution proof can run.",
    "intent.environment !== \"demo\"",
    "intent.demoOnly !== true",
    "confirmation !== \"RUN_FOREX_DEMO\"",
    "FOREX_DEMO_WORKER_MAX_LIMIT = 1",
    "FOREX_EXECUTION_DEMO_ORDER_CALLS_ENABLED",
    "FOREX_EXECUTION_DEMO_DRY_RUN !== \"false\"",
    "Forex demo dry-run recorded; no MetaAPI broker call was made.",
    "Forex demo worker recorded a dry-run attempt. MetaAPI order calls remain disabled.",
    "token.environment !== \"demo\""
  ],
  "Forex demo proof is provisioning-gated, demo-only, bounded, typed-confirmed, and dry-run by default."
);
assertBefore(
  forexDemo,
  "const prerequisites = await loadForexDemoWorkerPrerequisites(workspaceId, intent);",
  "const token = await loadForexMetaApiToken({",
  "Forex demo worker checks paid billing, provisioning, and demo connection before loading MetaAPI tokens."
);
assertBefore(
  forexDemo,
  "if (!orderCallsEnabled) {",
  "const token = await loadForexMetaApiToken({",
  "Forex demo worker records dry-run/no-broker-call attempts before token loading or provider calls."
);

assertIncludesAll(
  metaApiAdapter,
  [
    "input.environment !== \"demo\"",
    "Forex demo order proof rejects non-demo MetaAPI environments.",
    "FOREX_EXECUTION_MOCK_METAAPI",
    "auth-token"
  ],
  "MetaAPI adapter rejects non-demo order proof and supports explicit mock/demo verification mode."
);
assert(!metaApiAdapter.includes("console.log"), "MetaAPI adapter does not log tokens or raw provider payloads.");

assertIncludesAll(
  credentialVault,
  [
    "storeForexMetaApiToken",
    "loadForexMetaApiToken",
    "mock_metadata_only",
    "Local encrypted credential storage is disabled in production.",
    "Production MetaAPI token vault metadata is incomplete."
  ],
  "Forex token material stays behind server-only vault helpers and production storage is fail-closed."
);

assert(
  provisioningRoute.includes("requireStudent") &&
    provisioningRoute.includes("createStudentForexProvisioning") &&
    connectionRoute.includes("requireStudent") &&
    connectionRoute.includes("createStudentForexConnection") &&
    demoWorkerRoute.includes("requireSuperAdmin") &&
    demoWorkerRoute.includes("runForexDemoExecutionWorker"),
  "Provisioning, MetaAPI proof, and demo worker mutations go through authenticated server API routes."
);

const normalClientSources = `${studentUi}\n${workspaceUi}`;
assert(
    studentUi.includes("Forex AutoCopy broker setup") &&
    studentUi.includes("Purchase Forex AutoCopy") &&
    studentUi.includes("Broker password") &&
    studentUi.includes("will not place a demo or live broker order in this stage.") &&
    !normalClientSources.includes("metaApiToken") &&
    !normalClientSources.includes("metaApiAccountId") &&
    !normalClientSources.includes("credentialRefPath") &&
    !normalClientSources.includes("secretManagerSecretName") &&
    !normalClientSources.includes("rawProviderPayload") &&
    !normalClientSources.includes("getForexDemoOrderPlacementAdapter") &&
    !normalClientSources.includes("forex/metaapi-adapter"),
  "Student/workspace browser surfaces use broker dry-run provisioning and do not expose MetaAPI tokens, provider payloads, vault refs, or broker adapters."
);

const previewSources = `${provisioningPreview}\n${demoPreview}\n${connectionPreview}\n${adminUi}`;
assert(
  previewSources.includes("brokerLoginRef") &&
    previewSources.includes("providerOrderRef") &&
    !previewSources.includes("brokerPassword") &&
    !previewSources.includes("metaApiToken") &&
    !previewSources.includes("metaApiAccountId") &&
    !previewSources.includes("credentialRefPath") &&
    !previewSources.includes("secretManagerSecretName") &&
    !previewSources.includes("rawProviderPayload"),
  "Support-safe previews show masked refs only and never broker passwords, MetaAPI tokens, raw provider payloads, or vault references."
);

assertIncludesAll(
  rules,
  [
    "forex_autocopy_payment_intents",
    "forex_autocopy_subscriptions",
    "forex_provisioned_accounts",
    "forex_provisioning_audit_events",
    "forex_provisioning_controls",
    "students/{studentId}/forex_provisioning/{documentId}",
    "students/{studentId}/forex_provisioning_requests/{documentId}",
    "students/{studentId}/forex_connections/{connectionId}",
    "allow read, write: if false;"
  ],
  "Firestore rules deny paid Forex billing, provisioning, and MetaAPI proof records to client SDKs."
);
assertIncludesAll(
  rulesTest,
  [
    "forex_autocopy_payment_intents",
    "forex_autocopy_subscriptions",
    "forex_provisioned_accounts",
    "forex_provisioning_audit_events",
    "forex_provisioning_controls",
    "forex_provisioning/current",
    "forex_provisioning_requests",
    "forex_connections"
  ],
  "Firestore rules tests cover protected Forex billing, provisioning, and connection paths."
);

assertIncludesAll(
  indexes,
  [
    "forex_autocopy_payment_intents",
    "forex_provisioned_accounts",
    "forex_provisioning_audit_events",
    "forex_demo_intents",
    "forex_demo_order_attempts",
    "forex_demo_gate_decisions"
  ],
  "Firestore indexes support bounded Forex paid provisioning and demo proof previews."
);

assertIncludesAll(
  envExample,
  [
    "PAYSTACK_FOREX_AUTOCOPY_PLAN_CODE",
    "FOREX_AUTOCOPY_PRICE_NGN",
    "FOREX_EXECUTION_MOCK_METAAPI=false",
    "FOREX_EXECUTION_DEMO_ENABLED=false",
    "FOREX_EXECUTION_DEMO_ORDER_CALLS_ENABLED=false",
    "FOREX_EXECUTION_DEMO_DRY_RUN=true"
  ],
  "Environment defaults keep paid Forex checkout explicit and demo/provisioning proof disabled or dry-run by default."
);

assert(
  !subscriptionRepo.includes("metaapi.com") &&
    !subscriptionRepo.includes("brokerPassword:") &&
    !subscriptionRepo.includes("submitOrder") &&
    !subscriptionRepo.includes("createAccount"),
  "Forex billing lifecycle never creates MetaAPI resources, stores broker credentials, or places broker orders."
);

console.log("Stage 15U Forex paid provisioning/demo readiness QA passed.");
