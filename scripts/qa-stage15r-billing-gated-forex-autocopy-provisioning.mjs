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
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/crypto-execution.ts");
const repository = read("src/lib/crypto-execution/forex-provisioning-repository.ts");
const overviewRepo = read("src/lib/crypto-execution/crypto-execution-repository.ts");
const forexDemo = read("src/lib/crypto-execution/forex-demo-execution.ts");
const studentUi = read("src/components/student-app/student-copier-client.tsx");
const workspaceUi = read("src/components/workspace/crypto-execution-ops-section.tsx");
const adminUi = read("src/components/admin/crypto-execution-ops-panel.tsx");
const provisioningCard = read("src/components/crypto-execution/forex-provisioning-preview.tsx");
const createRoute = read("src/app/api/student/forex-execution/provisioning/route.ts");
const disableRoute = read("src/app/api/student/forex-execution/provisioning/disable/route.ts");
const rules = read("firestore.rules");
const rulesTest = read("scripts/firestore-rules-stage15f.test.mjs");
const indexes = read("firestore.indexes.json");

assert(packageJson.scripts?.["stage15r:qa"] === "node scripts/qa-stage15r-billing-gated-forex-autocopy-provisioning.mjs", "package.json must expose npm run stage15r:qa.");

assert(
  types.includes("ForexAutoCopyBillingStatus") &&
    types.includes("ForexProvisioningPreview") &&
    types.includes("ForexProvisionedAccountRecord") &&
    types.includes("ForexProvisioningRequestRecord"),
  "Stage 15R shared forex provisioning types must exist."
);

assert(
  repository.includes("forex_autocopy_subscriptions/current") &&
    repository.includes("resolveStudentEntitlements") &&
    repository.includes("autoCopyEntitlement.access !== \"allowed\"") &&
    repository.includes("base.entitlements.riskPosture !== \"personal_account\"") &&
    repository.includes("base.entitlements.subscriptionStatus === \"trial\"") &&
    repository.includes("!base.forexBilling.entitled"),
  "Broker provisioning must be gated by paid Forex AutoCopy billing, Stage 16 entitlements, and personal-account posture."
);

assert(
  repository.includes("passwordHandling: \"discarded_mock_dry_run\"") &&
    repository.includes("brokerPassword") &&
    !repository.includes("brokerPassword: input.brokerPassword") &&
    !repository.includes("brokerPassword: brokerPassword") &&
    !repository.includes("brokerPasswordFingerprint") &&
    repository.includes("noMetaApiResourceCreated: true") &&
    repository.includes("provider: \"mock\"") &&
    repository.includes("providerMode: \"dry_run\""),
  "Mock provisioning must not store the raw broker password or create MetaAPI resources."
);

assert(
  createRoute.includes("requireStudent") &&
    createRoute.includes("createStudentForexProvisioning") &&
    disableRoute.includes("requireStudent") &&
    disableRoute.includes("disableStudentForexProvisioning"),
  "Student provisioning mutations must go through authenticated server API routes."
);

assert(
  overviewRepo.includes("loadForexProvisioningPreview") &&
    overviewRepo.includes("forexProvisioning"),
  "Student/workspace/admin overviews must include support-safe forex provisioning previews."
);

assert(
  studentUi.includes("Forex AutoCopy broker setup") &&
    studentUi.includes("Broker server") &&
    studentUi.includes("Broker login") &&
    studentUi.includes("Broker password") &&
    studentUi.includes("Record dry-run provisioning") &&
    !studentUi.includes("metaApiToken") &&
    !studentUi.includes("metaApiAccountId") &&
    !studentUi.includes("Verify MetaAPI metadata"),
  "Normal student UI must use MT4/MT5 broker provisioning and hide MetaAPI token/account-ID proof fields."
);

assert(
  workspaceUi.includes("ForexProvisioningPreviewCard") &&
    workspaceUi.includes("Billing-gated MT4/MT5 provisioning counts") &&
    !workspaceUi.includes("vault refs") &&
    !workspaceUi.includes("ForexConnectionReadinessCard"),
  "Influencer workspace should show provisioning counts only, not MetaAPI connection readiness diagnostics."
);

assert(
  adminUi.includes("ForexProvisioningPreviewCard") &&
    adminUi.includes("ForexConnectionReadinessCard") &&
    adminUi.includes("Super Admin diagnostic proof-lane metadata"),
  "Super Admin should see provisioning ops plus clearly separated proof-lane diagnostics."
);

assert(
  provisioningCard.includes("brokerLoginRef") &&
    !provisioningCard.includes("brokerPassword") &&
    provisioningCard.includes("No mock provisioned Forex AutoCopy accounts"),
  "Provisioning previews must show masked refs and never broker passwords."
);

assert(
  forexDemo.includes("loadStudentForexProvisioningForExecution") &&
    forexDemo.includes("\"forex_provisioning\"") &&
    forexDemo.includes("Paid Forex AutoCopy provisioning is required before demo execution proof can run."),
  "15Q demo proof must be blocked for unpaid or unprovisioned students."
);

assert(
  rules.includes("forex_autocopy_subscriptions") &&
    rules.includes("forex_provisioning_requests") &&
    rules.includes("forex_provisioned_accounts") &&
    rules.includes("forex_provisioning_audit_events") &&
    rulesTest.includes("forex_autocopy_subscriptions") &&
    rulesTest.includes("forex_provisioning_requests") &&
    rulesTest.includes("forex_provisioned_accounts") &&
    rulesTest.includes("forex_provisioning_audit_events"),
  "Firestore rules and tests must deny protected Forex AutoCopy provisioning paths."
);

assert(
  indexes.includes("forex_provisioned_accounts") &&
    indexes.includes("forex_provisioning_audit_events"),
  "Bounded provisioning preview indexes must be declared."
);

const clientSources = `${studentUi}\n${workspaceUi}`;
assert(!clientSources.includes("forex/metaapi-adapter"), "Client UI must not import MetaAPI adapters.");
assert(!clientSources.includes("getForexDemoOrderPlacementAdapter"), "Client UI must not import broker execution adapters.");
assert(!clientSources.includes("credentialRef") && !clientSources.includes("vault ref"), "Student/influencer UI must not expose credential or vault refs.");

console.log("Stage 15R billing-gated forex provisioning QA passed.");
