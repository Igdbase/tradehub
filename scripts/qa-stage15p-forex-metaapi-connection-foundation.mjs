import fs from "node:fs";

const checks = [];

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/crypto-execution.ts");
const vault = read("src/lib/crypto-execution/credential-vault.ts");
const forexAdapter = read("src/lib/crypto-execution/forex/metaapi-adapter.ts");
const forexRepo = read("src/lib/crypto-execution/forex-connection-repository.ts");
const overviewRepo = read("src/lib/crypto-execution/crypto-execution-repository.ts");
const studentUi = read("src/components/student-app/student-copier-client.tsx");
const workspaceOps = read("src/components/workspace/crypto-execution-ops-section.tsx");
const adminUi = read("src/components/admin/crypto-execution-ops-panel.tsx");
const readinessCard = read("src/components/crypto-execution/forex-connection-readiness-preview.tsx");
const createRoute = read("src/app/api/student/forex-execution/connections/route.ts");
const refreshRoute = read("src/app/api/student/forex-execution/connections/[connectionId]/refresh/route.ts");
const disableRoute = read("src/app/api/student/forex-execution/connections/[connectionId]/disable/route.ts");
const forexPaper = read("src/lib/crypto-execution/forex-paper-execution.ts");
const rules = read("firestore.rules");
const rulesTest = read("scripts/firestore-rules-stage15f.test.mjs");
const indexes = read("firestore.indexes.json");

check(
  "stage15p script registered",
  packageJson.scripts?.["stage15p:qa"] === "node scripts/qa-stage15p-forex-metaapi-connection-foundation.mjs",
  "package.json must expose npm run stage15p:qa."
);
check(
  "forex connection support-safe types exist",
  types.includes("ForexBrokerConnectionRecord") &&
    types.includes("ForexConnectionReadinessPreview") &&
    types.includes("ForexConnectionProvider") &&
    types.includes("ForexConnectionEnvironment") &&
    !types.includes("metaApiToken: string;"),
  "Stage 15P must add connection/readiness types without token-bearing public summary fields."
);
check(
  "MetaAPI vault helpers are server-only and fail-closed",
  vault.includes("storeForexMetaApiToken") &&
    vault.includes("loadForexMetaApiToken") &&
    vault.includes("revokeForexMetaApiToken") &&
    vault.includes("forex_connections") &&
    vault.includes("assertCloudSecretManagerAvailable") &&
    vault.includes("FOREX_EXECUTION_MOCK_METAAPI"),
  "Forex tokens must go through server-only vault helpers with production Secret Manager fail-closed behavior."
);
check(
  "MetaAPI verifier remains metadata only",
  forexAdapter.includes("GET") &&
    forexAdapter.includes("/users/current/accounts/") &&
    forexAdapter.includes("auth-token") &&
    forexAdapter.includes("FOREX_EXECUTION_MOCK_METAAPI") &&
    !forexAdapter.includes("account-information") &&
    !forexAdapter.includes("createTrade") &&
    forexAdapter.indexOf("export const verifyMetaApiConnection") < forexAdapter.indexOf("export const metaApiDemoOrderAdapter"),
  "Stage 15P connection verification must remain account metadata-only; Stage 15Q demo order methods stay isolated behind the later server-only demo worker."
);
check(
  "student routes are server-side only",
  createRoute.includes("requireStudent") &&
    createRoute.includes("createStudentForexConnection") &&
    refreshRoute.includes("requireStudent") &&
    refreshRoute.includes("refreshStudentForexConnection") &&
    disableRoute.includes("requireStudent") &&
    disableRoute.includes("disableStudentForexConnection"),
  "Create/refresh/disable forex connection routes must require authenticated student API access."
);
check(
  "repository preserves Stage 16 entitlement gate",
  forexRepo.includes("resolveStudentEntitlements") &&
    forexRepo.includes("autoCopyEntitlement.access") &&
    forexRepo.includes("personal_account") &&
    forexRepo.includes("killSwitchEnabled") &&
    forexRepo.includes("storeForexMetaApiToken") &&
    forexRepo.includes("loadForexMetaApiToken") &&
    forexRepo.includes("revokeForexMetaApiToken"),
  "Forex connection writes must resolve Stage 16 entitlements and use vault helpers server-side."
);
check(
  "overview responses include safe readiness previews for admin diagnostics",
  overviewRepo.includes("loadForexConnectionReadinessPreview") &&
    overviewRepo.includes("forexConnections") &&
    !studentUi.includes("ForexConnectionReadinessCard") &&
    !workspaceOps.includes("ForexConnectionReadinessCard") &&
    adminUi.includes("ForexConnectionReadinessCard"),
  "MetaAPI readiness is hidden from normal student/workspace product UI and remains Super Admin diagnostic metadata."
);
check(
  "student UI hides MetaAPI proof fields and keeps broker provisioning productized",
  !studentUi.includes("metaApiToken") &&
    !studentUi.includes("metaApiAccountId") &&
    !studentUi.includes("Verify MetaAPI metadata") &&
    studentUi.includes("setForexProvisioningForm(emptyForexProvisioningForm)") &&
    studentUi.includes("Broker password") &&
    studentUi.includes("provisioning dry-run") &&
    readinessCard.includes("No broker execution"),
  "Normal student UI must ask for MT4/MT5 broker provisioning details only after paid Forex AutoCopy, not MetaAPI token/account ID."
);
check(
  "protected forex connection paths are denied",
  rules.includes("broker_keys/{workspaceId}/students/{studentId}/forex_connections") &&
    rules.includes("students/{studentId}/forex_connections") &&
    rules.includes("forex_connection_audit_events") &&
    rulesTest.includes("forex_connections") &&
    rulesTest.includes("forex_connection_audit_events"),
  "Firestore client SDK access to forex token/connection/audit paths must stay denied and tested."
);
check(
  "forex connection audit index declared",
  indexes.includes("forex_connection_audit_events") &&
    indexes.includes("studentId") &&
    indexes.includes("createdAt"),
  "Student-filtered forex connection audit preview requires a bounded composite index."
);
check(
  "forex paper worker remains paper-only",
  forexPaper.includes("runForexPaperExecutionWorker") &&
    forexPaper.includes("No MetaAPI or broker call was made") &&
    !forexPaper.includes("loadForexMetaApiToken") &&
    !forexPaper.includes("/trade"),
  "Stage 15P must not wire MetaAPI tokens into forex paper execution."
);
check(
  "no browser-side broker execution authority",
  !studentUi.includes("metaapi-adapter") &&
    !workspaceOps.includes("metaapi-adapter") &&
    !adminUi.includes("metaapi-adapter") &&
    !studentUi.includes("order-placement") &&
    !workspaceOps.includes("order-placement"),
  "Client/browser surfaces must not import MetaAPI provider adapters or exchange order placement."
);

const failed = checks.filter((entry) => !entry.ok);

for (const entry of checks) {
  console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.name}: ${entry.detail}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
