import {
  STAGE15F_PROJECT_ID,
  ids
} from "./stage15f-paper-beta-fixtures.mjs";

const liveIntentIds = {
  binanceReady: "live_sandbox_stage15h_binance_ready",
  bybitReady: "live_sandbox_stage15h_bybit_ready",
  productionRejected: "live_sandbox_stage15h_production_rejected",
  completedPreview: "live_sandbox_stage15h_completed_preview"
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

function documentsBaseUrl() {
  return `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${STAGE15F_PROJECT_ID}/databases/(default)/documents`;
}

function decodeValue(value) {
  if ("stringValue" in value) {
    return value.stringValue;
  }

  if ("booleanValue" in value) {
    return value.booleanValue;
  }

  if ("integerValue" in value) {
    return Number(value.integerValue);
  }

  if ("doubleValue" in value) {
    return Number(value.doubleValue);
  }

  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map((entry) => decodeValue(entry));
  }

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

function isWorkerConsumable(intent) {
  return intent.executionMode === "live_sandbox" &&
    intent.status === "ready_for_live" &&
    intent.environment === "sandbox";
}

configureEmulator();

console.log("Running Stage 15H live sandbox QA against Firestore emulator.");
console.log(`Project: ${STAGE15F_PROJECT_ID}`);
console.log(`Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);

const platformControl = await getRequired("platform_live_execution_controls/current");
const workspaceControl = await getRequired(`workspaces/${ids.workspaceId}/live_execution_controls/current`);
assert(platformControl.sandboxTestnetEnabled === true, "platform live sandbox/testnet control is enabled");
assert(workspaceControl.sandboxTestnetEnabled === true, "workspace live sandbox/testnet control is enabled");
assert(platformControl.killSwitchEnabled === false && workspaceControl.killSwitchEnabled === false, "live sandbox kill switches are off in default fixtures");

const studentAllowlist = await getRequired(`workspaces/${ids.workspaceId}/live_allowlists/students`);
assert(studentAllowlist.studentIds.includes(ids.students.binanceSandbox), "Binance sandbox student is allowlisted");
assert(studentAllowlist.studentIds.includes(ids.students.bybitSandbox), "Bybit sandbox student is allowlisted");
assert(!studentAllowlist.studentIds.includes(ids.students.fundedBlocked), "funded/prop-firm student is not live sandbox allowlisted");

const binanceConsent = await getRequired(`workspaces/${ids.workspaceId}/students/${ids.students.binanceSandbox}/live_consents/current`);
assert(binanceConsent.status === "accepted", "Binance sandbox student has explicit live sandbox consent fixture");
assert(binanceConsent.liveLossRiskConfirmed === true, "live sandbox consent includes loss-risk confirmation");

const pausedConsent = await getRequired(`workspaces/${ids.workspaceId}/students/${ids.students.paused}/live_consents/current`);
assert(pausedConsent.status === "paused", "paused student live sandbox consent is paused");

const fundedStudent = await getRequired(`workspaces/${ids.workspaceId}/students/${ids.students.fundedBlocked}`);
assert(fundedStudent.brokerLink?.type === "prop_firm", "funded fixture remains prop-firm posture");

const sandboxConnection = await getRequired(
  `workspaces/${ids.workspaceId}/students/${ids.students.binanceSandbox}/exchange_connections/${ids.connections.binanceSandbox}`
);
assert(sandboxConnection.environment === "sandbox", "Binance executable fixture uses sandbox environment");
assert(sandboxConnection.permissionVerification === "passed", "Binance sandbox permission verification passed");
assert(sandboxConnection.withdrawalPermission === "confirmed_disabled", "Binance sandbox withdrawal state is confirmed disabled");

const productionConnection = await getRequired(
  `workspaces/${ids.workspaceId}/students/${ids.students.sandboxPreferred}/exchange_connections/${ids.connections.preferredProduction}`
);
assert(productionConnection.environment === "production", "production connection fixture exists for negative testing");

const readyBinance = await getRequired(`workspaces/${ids.workspaceId}/live_execution_intents/${liveIntentIds.binanceReady}`);
const readyBybit = await getRequired(`workspaces/${ids.workspaceId}/live_execution_intents/${liveIntentIds.bybitReady}`);
assert(isWorkerConsumable(readyBinance), "Binance ready intent is sandbox/testnet worker-consumable");
assert(isWorkerConsumable(readyBybit), "Bybit ready intent is sandbox/testnet worker-consumable");

const productionIntent = await getRequired(`workspaces/${ids.workspaceId}/live_execution_intents/${liveIntentIds.productionRejected}`);
assert(productionIntent.environment === "production", "production ready_for_live fixture exists");
assert(!isWorkerConsumable(productionIntent), "production ready_for_live fixture is not worker-consumable");

const liveIntents = await list(`workspaces/${ids.workspaceId}/live_execution_intents`);
const workerConsumable = liveIntents.filter(isWorkerConsumable);
assert(workerConsumable.every((intent) => intent.environment === "sandbox"), "all worker-consumable live intents are sandbox/testnet only");
assert(workerConsumable.every((intent) => intent.executionMode === "live_sandbox"), "all worker-consumable live intents use live_sandbox mode");

const completedAttempt = await getRequired("workspaces/ws_stage15f_paper_beta/live_order_attempts/live_attempt_live_sandbox_stage15h_completed_preview_1");
assert(completedAttempt.environment === "sandbox", "completed preview attempt is sandbox/testnet only");
assert(completedAttempt.status === "filled_live", "completed preview attempt is filled_live");

const attempts = await list(`workspaces/${ids.workspaceId}/live_order_attempts`);
const attemptKeys = new Set(attempts.map((attempt) => `${attempt.intentId}:${attempt.idempotencyKey}`));
assert(attemptKeys.size === attempts.length, "live sandbox fixture attempts have unique idempotency keys");

const reconciliation = await getRequired(
  "workspaces/ws_stage15f_paper_beta/live_reconciliation_records/reconcile_stage15h_completed_preview"
);
assert(reconciliation.status === "reconciled", "live sandbox reconciliation fixture is support-safe and reconciled");

const gateDecision = await getRequired(
  `workspaces/${ids.workspaceId}/live_gate_decisions/live_gate_${liveIntentIds.productionRejected}`
);
assert(gateDecision.status === "blocked", "production live sandbox gate decision is blocked");
assert(
  Array.isArray(gateDecision.checks) &&
    gateDecision.checks.some((check) => check.status === "blocked" && check.key === "environment"),
  "production gate decision records an environment blocker"
);

assert(!process.env.CRYPTO_EXECUTION_LIVE_ENABLED || process.env.CRYPTO_EXECUTION_LIVE_ENABLED !== "true", "CRYPTO_EXECUTION_LIVE_ENABLED is not used for Stage 15H QA");

if (process.env.CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED === "true") {
  console.log("Optional real testnet exchange calls are enabled by env, but this fixture QA does not submit orders.");
} else {
  console.log("CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED is not true; no real sandbox/testnet exchange calls were made.");
}

console.log("Stage 15H live sandbox QA passed.");
