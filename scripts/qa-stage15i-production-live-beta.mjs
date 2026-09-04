import {
  STAGE15F_PROJECT_ID,
  ids
} from "./stage15f-paper-beta-fixtures.mjs";

const liveIds = {
  dryRunReady: "live_prod_stage15i_dry_run_ready",
  sandboxRefused: "live_prod_stage15i_sandbox_refused",
  submittedUnsettled: "live_prod_stage15i_submitted_unsettled",
  filledTerminal: "live_prod_stage15i_filled_terminal",
  missingVaultBlocked: "live_prod_stage15i_missing_vault_blocked",
  withdrawalBlocked: "live_prod_stage15i_withdrawal_blocked",
  stalePermissionBlocked: "live_prod_stage15i_stale_permission_blocked"
};

function fail(message) {
  throw new Error(message);
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }

  pass(message);
}

function configureEmulator() {
  process.env.GCLOUD_PROJECT ||= STAGE15F_PROJECT_ID;
  process.env.FIREBASE_CONFIG ||= JSON.stringify({ projectId: STAGE15F_PROJECT_ID });
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
}

function documentsBaseUrl() {
  return `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${STAGE15F_PROJECT_ID}/databases/(default)/documents`;
}

function decodeValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map((entry) => decodeValue(entry));
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields ?? {}).map(([key, entry]) => [key, decodeValue(entry)])
    );
  }
  return null;
}

function decodeDocument(document) {
  return Object.fromEntries(
    Object.entries(document.fields ?? {}).map(([key, value]) => [key, decodeValue(value)])
  );
}

async function getRequired(path) {
  const response = await fetch(`${documentsBaseUrl()}/${path}`, {
    headers: { "Authorization": "Bearer owner" }
  });

  if (response.status === 404) {
    fail(`Missing required fixture: ${path}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${await response.text()}`);
  }

  return decodeDocument(await response.json());
}

async function list(path) {
  const response = await fetch(`${documentsBaseUrl()}/${path}?pageSize=100`, {
    headers: { "Authorization": "Bearer owner" }
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to list ${path}: ${response.status} ${await response.text()}`);
  }

  const body = await response.json();
  return (body.documents ?? []).map((document) => ({
    id: document.name.split("/").pop(),
    ...decodeDocument(document)
  }));
}

function isProductionWorkerConsumable(intent) {
  return intent.executionMode === "live" &&
    intent.status === "ready_for_live" &&
    intent.environment === "production";
}

configureEmulator();

console.log("Running Stage 15I production live beta QA against Firestore emulator.");
console.log(`Project: ${STAGE15F_PROJECT_ID}`);
console.log(`Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);

const platformControl = await getRequired("platform_live_execution_controls/current");
const workspaceControl = await getRequired(`workspaces/${ids.workspaceId}/live_execution_controls/current`);
assert(platformControl.productionBetaEnabled === true, "platform production beta fixture can be enabled only by protected server data");
assert(workspaceControl.productionBetaEnabled === true, "workspace production beta fixture is workspace scoped");
assert(platformControl.productionOrdersEnabled === false && workspaceControl.productionOrdersEnabled === false, "production order-call controls are disabled in fixtures");
assert(platformControl.productionDryRun === true && workspaceControl.productionDryRun === true, "production dry-run is active in fixtures");

const studentAllowlist = await getRequired(`workspaces/${ids.workspaceId}/live_allowlists/production_students`);
assert(studentAllowlist.studentIds.includes(ids.students.binanceSandbox), "production beta allowlist contains the one fixture student");
assert(!studentAllowlist.studentIds.includes(ids.students.fundedBlocked), "funded/prop-firm student is not production allowlisted");

const consent = await getRequired(`workspaces/${ids.workspaceId}/students/${ids.students.binanceSandbox}/live_consents/current`);
assert(consent.productionStatus === "accepted", "production consent is separate from paper/testnet consent");
assert(consent.productionLiveLossRiskConfirmed === true, "production consent includes live-loss risk confirmation");

const productionConnection = await getRequired(
  `workspaces/${ids.workspaceId}/students/${ids.students.binanceSandbox}/exchange_connections/conn_stage15i_binance_production`
);
assert(productionConnection.environment === "production", "production connection fixture is truthfully production");
assert(productionConnection.withdrawalPermission === "confirmed_disabled", "production executable fixture has withdrawals disabled");

const withdrawalConnection = await getRequired(
  `workspaces/${ids.workspaceId}/students/${ids.students.binanceSandbox}/exchange_connections/conn_stage15i_withdrawal_enabled`
);
assert(withdrawalConnection.withdrawalPermission === "detected_enabled", "withdrawal-enabled key path is represented and blocked");

const dryRunIntent = await getRequired(`workspaces/${ids.workspaceId}/live_execution_intents/${liveIds.dryRunReady}`);
assert(isProductionWorkerConsumable(dryRunIntent), "dry-run intent is production worker-consumable only as production/live");
assert(dryRunIntent.gateSnapshot.dryRun === true, "dry-run intent snapshot records dry-run posture");

const sandboxIntent = await getRequired(`workspaces/${ids.workspaceId}/live_execution_intents/${liveIds.sandboxRefused}`);
assert(!isProductionWorkerConsumable(sandboxIntent), "sandbox live-sandbox fixture is not production worker-consumable");

const attempts = await list(`workspaces/${ids.workspaceId}/live_order_attempts`);
const productionAttempts = attempts.filter((attempt) => attempt.environment === "production" && attempt.executionMode === "live");
assert(productionAttempts.every((attempt) => !attempt.exchangeOrderId), "production safe fixtures do not expose full exchange order IDs");
assert(productionAttempts.some((attempt) => attempt.status === "dry_run_live"), "dry-run worker posture is represented as a no-exchange-call attempt");

const unsettled = productionAttempts.filter((attempt) => [
  "submitted_live",
  "partially_filled_live",
  "cancel_requested",
  "cancel_submitted",
  "reconcile_required"
].includes(attempt.status));
assert(unsettled.length === 1, "production reconciliation fixture has one unsettled candidate");
assert(!unsettled.some((attempt) => attempt.intentId === liveIds.filledTerminal), "filled terminal attempts are not reconciliation candidates");

for (const [intentId, expectedKey] of [
  [liveIds.missingVaultBlocked, "production_vault_ready"],
  [liveIds.withdrawalBlocked, "withdrawal_permission"],
  [liveIds.stalePermissionBlocked, "connection_freshness"]
]) {
  const decision = await getRequired(`workspaces/${ids.workspaceId}/live_gate_decisions/live_gate_${intentId}`);
  assert(
    decision.status === "blocked" &&
      Array.isArray(decision.checks) &&
      decision.checks.some((check) => check.key === expectedKey && check.status === "blocked"),
    `${expectedKey} blocked decision is recorded support-safely`
  );
}

assert(process.env.CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED !== "true", "production order-call env is not enabled for automated QA");
assert(process.env.CRYPTO_EXECUTION_PRODUCTION_DRY_RUN !== "false", "production dry-run remains active for automated QA");
assert(process.env.CRYPTO_EXECUTION_LIVE_ENABLED !== "true", "legacy live flag is not used as a production order gate");

console.log("Stage 15I production live beta QA passed. No real production exchange calls were made.");
