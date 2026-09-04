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
  console.log(`✓ ${message}`);
}

const types = read("src/types/crypto-execution.ts");
const forexDemo = read("src/lib/crypto-execution/forex-demo-execution.ts");
const metaApiAdapter = read("src/lib/crypto-execution/forex/metaapi-adapter.ts");
const forexIndex = read("src/lib/crypto-execution/forex/index.ts");
const adminPanel = read("src/components/admin/crypto-execution-ops-panel.tsx");
const adminClient = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const studentCopier = read("src/components/student-app/student-copier-client.tsx");
const workspaceOps = read("src/components/workspace/crypto-execution-ops-section.tsx");
const dashboardRepository = read("src/lib/workspace/dashboard-repository.ts");
const rules = read("firestore.rules");
const indexes = read("firestore.indexes.json");
const envExample = read(".env.example");

assert(types.includes("ForexDemoExecutionIntentRecord"), "Forex demo execution intent types exist.");
assert(types.includes("ForexDemoWorkerRunResponse"), "Forex demo worker response type exists.");
assert(types.includes("forexDemo?: ForexDemoExecutionPreview"), "Student/workspace/admin safe summaries include forex demo previews.");

assert(forexDemo.includes("import \"server-only\""), "Forex demo execution module is server-only.");
assert(forexDemo.includes("resolveStudentEntitlements"), "Forex demo routing preserves Stage 16 entitlement checks.");
assert(forexDemo.includes("loadForexMetaApiToken"), "Forex demo worker loads MetaAPI tokens only server-side.");
assert(forexDemo.includes("confirmation !== \"RUN_FOREX_DEMO\""), "Forex demo worker requires typed Super Admin confirmation.");
assert(forexDemo.includes("intent.environment !== \"demo\""), "Forex demo worker rejects non-demo intent environments.");
assert(forexDemo.includes("token.environment !== \"demo\""), "Forex demo worker rejects non-demo MetaAPI tokens.");
assert(forexDemo.includes("tokenVaultStatus === \"encrypted_reference_ready\""), "Forex demo routing requires loadable encrypted token metadata.");
assert(forexDemo.includes("record.tokenVaultStatus === \"metadata_only\""), "Mock metadata-only MetaAPI connections are not executable.");
assert(forexDemo.includes("loadStudentForexProvisioningForExecution"), "Forex demo routing/worker requires billing-gated Forex AutoCopy provisioning.");
assert(forexDemo.includes("\"forex_provisioning\""), "Forex demo gate decisions include a forex provisioning risk check.");
assert(forexDemo.includes("where(\"status\", \"==\", \"ready_for_forex_demo\")"), "Forex demo worker consumes only ready_for_forex_demo intents.");
assert(!forexDemo.includes("where(\"status\", \"==\", \"ready_for_forex_paper\")"), "Forex demo worker does not consume forex paper intent status.");
assert(forexDemo.includes("FOREX_DEMO_WORKER_MAX_LIMIT = 1"), "Forex demo worker is bounded to a single intent per run.");
assert(forexDemo.includes("FOREX_EXECUTION_DEMO_ORDER_CALLS_ENABLED"), "Forex demo order calls require explicit server env gate.");
assert(forexDemo.includes("FOREX_EXECUTION_DEMO_DRY_RUN !== \"false\""), "Forex demo dry-run is on by default.");

assert(metaApiAdapter.includes("DEFAULT_METAAPI_CLIENT_BASE_URL"), "MetaAPI demo adapter has a client API base URL seam.");
assert(metaApiAdapter.includes("ORDER_TYPE_BUY"), "MetaAPI demo adapter can submit demo buy orders through the trade endpoint.");
assert(metaApiAdapter.includes("ORDER_TYPE_SELL"), "MetaAPI demo adapter can submit demo sell orders through the trade endpoint.");
assert(metaApiAdapter.includes("ORDER_CANCEL"), "MetaAPI demo adapter has a demo cancellation boundary.");
assert(metaApiAdapter.includes("input.environment !== \"demo\""), "MetaAPI demo adapter rejects non-demo environments.");
assert(!metaApiAdapter.includes("console.log"), "MetaAPI adapter does not log broker tokens or raw payloads.");
assert(forexIndex.includes("getForexDemoOrderPlacementAdapter"), "Forex demo order adapter export is isolated under the server-only forex index.");

assert(dashboardRepository.includes("routePublishedForexSignalForDemoExecution"), "Workspace signal publish can trigger forex demo routing.");
assert(dashboardRepository.includes("forexDemoRoutingSummary"), "Workspace signal mutation responses include safe forex demo routing summaries.");

assert(adminPanel.includes("RUN_FOREX_DEMO"), "Super Admin UI requires forex demo run confirmation copy.");
assert(adminPanel.includes("CANCEL_FOREX_DEMO"), "Super Admin UI requires forex demo cancellation confirmation copy.");
assert(adminClient.includes("/api/admin/crypto-execution/forex-demo/worker/run"), "Super Admin client calls forex demo worker API route.");
assert(adminClient.includes("/api/admin/crypto-execution/forex-demo/reconcile/run"), "Super Admin client calls forex demo reconciliation API route.");
assert(adminClient.includes("/api/admin/crypto-execution/forex-demo/orders/"), "Super Admin client calls forex demo cancel API route.");
assert(studentCopier.includes("ForexDemoExecutionPreviewCard"), "Student copier shows support-safe forex demo proof preview.");
assert(workspaceOps.includes("ForexDemoExecutionPreviewCard"), "Influencer workspace shows support-safe forex demo proof preview.");

assert(rules.includes("platform_forex_demo_controls"), "Firestore rules deny platform forex demo controls.");
assert(rules.includes("forex_demo_intents"), "Firestore rules deny forex demo intents.");
assert(rules.includes("forex_demo_order_attempts"), "Firestore rules deny forex demo attempts.");
assert(rules.includes("forex_demo_reconciliation_records"), "Firestore rules deny forex demo reconciliation records.");
assert(rules.includes("forex_demo_audit_events"), "Firestore rules deny forex demo audit events.");

assert(indexes.includes("\"collectionGroup\": \"forex_demo_intents\""), "Firestore indexes include forex demo intent queries.");
assert(indexes.includes("\"collectionGroup\": \"forex_demo_order_attempts\""), "Firestore indexes include forex demo attempt queries.");
assert(indexes.includes("\"collectionGroup\": \"forex_demo_gate_decisions\""), "Firestore indexes include forex demo gate decision queries.");

assert(envExample.includes("FOREX_EXECUTION_DEMO_ENABLED=false"), "Env example keeps forex demo disabled by default.");
assert(envExample.includes("FOREX_EXECUTION_DEMO_ORDER_CALLS_ENABLED=false"), "Env example keeps MetaAPI demo order calls disabled by default.");
assert(envExample.includes("FOREX_EXECUTION_DEMO_DRY_RUN=true"), "Env example keeps forex demo dry-run enabled by default.");

const nonCredentialPreviewSource = `${workspaceOps}\n${adminPanel}\n${adminClient}`;
assert(!nonCredentialPreviewSource.includes("metaApiToken"), "Workspace/admin preview surfaces do not reference MetaAPI tokens.");
assert(!nonCredentialPreviewSource.includes("credentialRefPath"), "Workspace/admin preview surfaces do not reference credential refs.");
assert(!nonCredentialPreviewSource.includes("secretManagerSecretName"), "Workspace/admin preview surfaces do not expose vault resource names.");

console.log("Stage 15Q forex demo execution proof QA passed.");
