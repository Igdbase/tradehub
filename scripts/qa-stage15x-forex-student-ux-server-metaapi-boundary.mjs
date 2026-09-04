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

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  if (startIndex < 0 || endIndex <= startIndex) {
    throw new Error(`Could not locate source block ${start} -> ${end}.`);
  }

  return source.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const studentUi = read("src/components/student-app/student-copier-client.tsx");
const provisioningRepo = read("src/lib/crypto-execution/forex-provisioning-repository.ts");
const connectionRepo = read("src/lib/crypto-execution/forex-connection-repository.ts");
const adminConnectionRoute = read("src/app/api/admin/crypto-execution/forex-live-canary/connections/route.ts");
const studentConnectionRoute = read("src/app/api/student/forex-execution/live-canary/connections/route.ts");
const liveCanary = read("src/lib/crypto-execution/forex-live-canary-execution.ts");
const provisioningPreview = read("src/components/crypto-execution/forex-provisioning-preview.tsx");
const connectionPreview = read("src/components/crypto-execution/forex-connection-readiness-preview.tsx");
const liveCanaryPreview = read("src/components/crypto-execution/forex-live-canary-preview.tsx");
const adminUi = read("src/components/admin/crypto-execution-ops-panel.tsx");
const envExample = read(".env.example");
const rules = read("firestore.rules");

const forexSetupBlock = sliceBetween(
  studentUi,
  "Forex AutoCopy broker setup",
  "ForexPaperExecutionPreviewCard"
);
const studentNormalSurface = sliceBetween(
  studentUi,
  "function StudentCopierBody",
  "export function StudentCopierClient"
);

assert(
  packageJson.scripts?.["stage15x:qa"] === "node scripts/qa-stage15x-forex-student-ux-server-metaapi-boundary.mjs",
  "package.json exposes npm run stage15x:qa."
);

assertIncludesAll(
  studentUi,
  [
    "Forex AutoCopy broker setup",
    "Platform",
    "Broker name/server",
    "Broker login/account number",
    "Broker password",
    "This is my personal MT4/MT5 broker account",
    "Forex AutoCopy is billed separately",
    "real-money risk",
    "does not custody",
    "does not need withdrawal access"
  ],
  "Normal student copier renders the MT4/MT5 broker setup product flow."
);
assert(
  !studentNormalSurface.includes("MetaAPI access token") &&
    !studentNormalSurface.includes("MetaAPI account ID") &&
    !studentNormalSurface.includes("Production MetaAPI connection for tiny live Forex canary") &&
    !studentNormalSurface.includes("/api/student/forex-execution/live-canary/connections") &&
    !studentNormalSurface.includes("metaApiToken") &&
    !studentNormalSurface.includes("metaApiAccountId"),
  "Normal student copier does not render MetaAPI token/account fields or call the production canary setup route."
);
assert(
  !forexSetupBlock.includes("cryptoBilling") &&
    !forexSetupBlock.includes("cryptoAutoCopyPaid") &&
    !forexSetupBlock.includes("eligible &&") &&
    forexSetupBlock.includes("response.forexProvisioning?.billing.entitled"),
  "Crypto unpaid state does not hide Forex setup; Forex billing alone locks broker setup."
);
assertIncludesAll(
  forexSetupBlock,
  [
    "disabled={!response.forexProvisioning?.billing.entitled}",
    "Purchase Forex AutoCopy",
    "startForexAutoCopyCheckout",
    "cancelForexAutoCopySubscription"
  ],
  "Forex unpaid/cancelled billing blocks broker setup while keeping the setup surface visible."
);

assertIncludesAll(
  provisioningRepo,
  [
    "prepareServerManagedMetaApiProvisioning",
    "ServerManagedMetaApiProvisioningInput",
    "passwordForOneTimeSubmission",
    "TradeHub-managed MetaAPI provisioning is not configured yet",
    "passwordHandling: serverManagedBoundary.passwordHandling",
    "noMetaApiResourceCreated: serverManagedBoundary.noMetaApiResourceCreated",
    "assertForexProvisioningAllowed(base)"
  ],
  "Provisioning repo has a clear server-managed MetaAPI boundary and remains paid-gated."
);
assert(
  !provisioningRepo.includes("brokerPassword: input.brokerPassword") &&
    !provisioningRepo.includes("brokerPassword: brokerPassword") &&
    !provisioningRepo.includes("metaApiToken:") &&
    !provisioningRepo.includes("metaApiAccountId:"),
  "Broker password is accepted only for one-time server handling and is not stored with MetaAPI token/account material."
);

assertIncludesAll(
  adminConnectionRoute,
  [
    "requireSuperAdmin",
    "createOperatorForexLiveCanaryConnection",
    "getAdminWorkspaceCryptoExecutionOverview"
  ],
  "Production MetaAPI canary connection setup is Super Admin/operator-only."
);
assertIncludesAll(
  studentConnectionRoute,
  [
    "forex_live_canary_operator_only",
    "Normal students use MT4/MT5 broker setup."
  ],
  "Student production MetaAPI canary setup endpoint fails closed."
);
assertIncludesAll(
  connectionRepo,
  [
    "createOperatorForexLiveCanaryConnection",
    "auditActorType: \"student\" | \"super_admin\" = \"student\"",
    "actorType: auditActorType",
    "base.forexBilling.status !== \"active_paid\"",
    "loadForexLiveCanarySetupGate(base.workspace.workspaceId)",
    "storeForexMetaApiToken",
    "providerAccountFingerprint: verification.providerAccountFingerprint",
    "Live order calls remain separately gated."
  ],
  "Operator canary setup keeps active-paid billing, setup controls, encrypted token storage, safe fingerprint, and separate order gates."
);

const previewSources = `${provisioningPreview}\n${connectionPreview}\n${liveCanaryPreview}\n${adminUi}`;
assert(
  previewSources.includes("providerAccountFingerprint") &&
    previewSources.includes("tokenVaultStatus") &&
    !previewSources.includes("brokerPassword") &&
    !previewSources.includes("metaApiToken") &&
    !previewSources.includes("metaApiAccountId") &&
    !previewSources.includes("credentialRefPath") &&
    !previewSources.includes("secretManagerSecretName") &&
    !previewSources.includes("rawProviderPayload") &&
    !previewSources.includes("agiliumtrade"),
  "Admin/student previews show safe fingerprint/provider/vault status only and never raw secrets, vault refs, endpoints, or provider payloads."
);
assertIncludesAll(
  adminUi,
  [
    "Workspace Forex Connection Ops",
    "Super Admin diagnostic proof-lane metadata",
    "Broker passwords, raw broker server/login, MetaAPI IDs, vault refs, and provider payloads are hidden.",
    "Tiny live Forex canary",
    "Real money risk"
  ],
  "Super Admin area keeps operator-only safe canary setup/status context."
);

assertIncludesAll(
  envExample,
  [
    "FOREX_LIVE_CANARY_SETUP_ENABLED=false",
    "FOREX_LIVE_CANARY_ENABLED=false",
    "FOREX_LIVE_ORDER_CALLS_ENABLED=false",
    "FOREX_LIVE_DRY_RUN=true"
  ],
  "Live Forex canary and setup env defaults remain disabled/fail-closed."
);
assertIncludesAll(
  liveCanary,
  [
    "liveOrderCallsEnabled: process.env.FOREX_LIVE_ORDER_CALLS_ENABLED === \"true\"",
    "liveDryRun: process.env.FOREX_LIVE_DRY_RUN !== \"false\"",
    "if (!orderCallsEnabled)",
    "Tiny live Forex canary dry-run recorded; no MetaAPI broker call was made."
  ],
  "Live order calls remain disabled and dry-run/fail-closed by default."
);

assertIncludesAll(
  rules,
  [
    "match /broker_keys/{workspaceId}/students/{studentId}/forex_connections/{connectionId}",
    "match /workspaces/{workspaceId}/students/{studentId}/forex_connections/{connectionId}",
    "match /workspaces/{workspaceId}/students/{studentId}/forex_provisioning/{documentId}",
    "match /workspaces/{workspaceId}/students/{studentId}/forex_provisioning_requests/{documentId}",
    "match /workspaces/{workspaceId}/forex_demo_execution_queue/{documentId}",
    "match /workspaces/{workspaceId}/forex_live_canary_intents/{documentId}",
    "match /workspaces/{workspaceId}/forex_live_canary_order_attempts/{documentId}",
    "allow read, write: if false;"
  ],
  "Firestore rules deny client reads/writes for sensitive Forex connection, provisioning, vault, demo queue, and live canary paths."
);

console.log("Stage 15X Forex student UX/server MetaAPI boundary QA passed.");
