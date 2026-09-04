import { readFile } from "node:fs/promises";
import {
  STAGE15F_PROJECT_ID,
  ids
} from "./stage15f-paper-beta-fixtures.mjs";

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

async function readSource(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function getRequired(path) {
  const response = await fetch(`${documentsBaseUrl()}/${path}`, {
    headers: { "Authorization": "Bearer owner" }
  });

  if (response.status === 404) {
    fail(`Missing required fixture: ${path}. Run the Stage 15F/15H/15I seed commands first.`);
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

function canonical(value) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function assertNoUiLeak(source, path, options = {}) {
  const unsafeTerms = options.allowOneTimeSecretState
    ? ["credentialRefPath", "encryptedSecretRef", "rawExchange"]
    : ["credentialRefPath", "encryptedSecretRef", "rawExchange", "apiSecret"];

  for (const unsafe of unsafeTerms) {
    assert(!source.includes(unsafe), `${path} does not render ${unsafe}`);
  }
}

configureEmulator();

console.log("Running Stage 15K crypto completion QA.");
console.log(`Project: ${STAGE15F_PROJECT_ID}`);
console.log(`Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);

const packageJson = await readSource("package.json");
assert(packageJson.includes('"stage15k:qa"'), "package.json exposes stage15k:qa");

const signalSymbols = await readSource("src/lib/workspace/signal-symbols.ts");
const dashboardValidation = await readSource("src/lib/workspace/dashboard-validation.ts");
assert(signalSymbols.includes('"BTCUSDT"') && signalSymbols.includes('"ETHUSDT"'), "crypto spot symbol allowlist remains explicit");
assert(signalSymbols.includes('"EURUSD"') && signalSymbols.includes('"GBPUSD"'), "forex pair allowlist remains separate");
assert(dashboardValidation.includes("normalizeSignalPairForMarket"), "workspace signal validation remains market-aware");
assert(dashboardValidation.includes("For buy signals, take profit must be above entry"), "buy directional level validation remains in POST/PATCH validation");
assert(dashboardValidation.includes("For sell signals, take profit must be below entry"), "sell directional level validation remains in POST/PATCH validation");

const riskEngine = await readSource("src/lib/crypto-execution/crypto-risk-engine.ts");
const liveSandbox = await readSource("src/lib/crypto-execution/crypto-live-sandbox.ts");
const liveProduction = await readSource("src/lib/crypto-execution/crypto-live-production.ts");
assert(riskEngine.includes("crypto_symbol_invalid_for_market"), "paper routing blocks invalid crypto symbols");
assert(liveSandbox.includes("crypto_symbol_invalid_for_market"), "testnet routing blocks invalid crypto symbols");
assert(liveProduction.includes("crypto_symbol_invalid_for_market"), "production dry-run routing blocks invalid crypto symbols");
assert(liveProduction.includes("productionVaultReady") && liveProduction.includes("productionDryRun"), "production routing still checks vault and dry-run gates");
assert(liveProduction.includes("CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED"), "production order env is explicit but not sufficient on its own");

const repositorySource = await readSource("src/lib/crypto-execution/crypto-execution-repository.ts");
assert(repositorySource.includes("invalid-market crypto execution rows were hidden"), "invalid-market historical rows are hidden with support-safe warnings");
assert(liveSandbox.includes("maskReference(record.exchangeOrderId)") && liveProduction.includes("maskReference(record.exchangeOrderId)"), "safe previews mask exchange order refs");

const displaySafety = await readSource("src/components/crypto-execution/display-safety.ts");
assert(displaySafety.includes("productSafeText") && displaySafety.includes("Stage 15F"), "non-admin execution UI has fixture wording scrubber");
assert(displaySafety.includes("productionBetaStatusLabel") && displaySafety.includes("gated preview"), "production preview status labels are gated when production is not enabled");

const stage15fFixtureSource = await readSource("scripts/stage15f-paper-beta-fixtures.mjs");
assert(!stage15fFixtureSource.includes("Stage 15F fixture metadata only"), "fresh connection fixtures use product-safe metadata copy");
assert(!stage15fFixtureSource.includes("Default Stage 15F fixture rail"), "fresh workspace rail fixtures use product-safe copy");
assert(!stage15fFixtureSource.includes("Binance Stage 15F sandbox"), "fresh Binance sandbox labels are product-safe");

const stage15hSeedSource = await readSource("scripts/seed-stage15h-live-sandbox.mjs");
assert(!stage15hSeedSource.includes("Stage 15H fixture order"), "fresh testnet proof fixtures use product-safe order copy");

const studentUi = await readSource("src/components/student-app/student-copier-client.tsx");
assert(studentUi.includes("Paper Auto-Copy") && studentUi.includes("Testnet Proof") && studentUi.includes("Production Beta"), "student copier uses product labels");
assert(!studentUi.includes("Stage 15") && !studentUi.includes("fixture"), "student copier default copy does not expose prompt or fixture wording");
assert(studentUi.includes("Accept live beta terms") && studentUi.includes("Revoke live consent"), "student production consent controls remain visible");
assert(studentUi.includes("does not") && studentUi.includes("enable real orders"), "student consent copy does not imply production trading is active");
assert(studentUi.includes("productSafeText(connection.connectionLabel)") && studentUi.includes("productSafeText(connection.supportSafeMessage)"), "student connection metadata is scrubbed before display");
assertNoUiLeak(studentUi, "student copier UI", { allowOneTimeSecretState: true });

const workspaceOpsUi = await readSource("src/components/workspace/crypto-execution-ops-section.tsx");
assert(workspaceOpsUi.includes("Crypto Auto-Copy") && workspaceOpsUi.includes("Workspace execution health"), "workspace crypto ops uses product labels");
assert(workspaceOpsUi.includes("forex paper simulation") && workspaceOpsUi.includes("No broker or MetaAPI execution is active"), "workspace crypto ops keeps forex paper-only and out of Binance/Bybit execution");
assert(!workspaceOpsUi.includes("Stage 15") && !workspaceOpsUi.includes("fixture"), "workspace crypto ops default copy does not expose prompt or fixture wording");
assertNoUiLeak(workspaceOpsUi, "workspace crypto ops UI");

const paperPreview = await readSource("src/components/crypto-execution/paper-execution-preview.tsx");
const testnetPreview = await readSource("src/components/crypto-execution/live-sandbox-execution-preview.tsx");
const productionPreview = await readSource("src/components/crypto-execution/live-production-execution-preview.tsx");
assert(paperPreview.includes("Paper activity"), "paper preview labels simulated activity cleanly");
assert(testnetPreview.includes("Testnet Proof") && testnetPreview.includes("Order ref"), "testnet preview uses product labels and masked refs");
assert(productionPreview.includes("Production state") && productionPreview.includes("Gated beta"), "production preview presents production as gated");
assert(productionPreview.includes("productionBetaStatusLabel") && !productionPreview.includes("submitted live") && !productionPreview.includes("filled live"), "production preview does not render live-status labels while gated");
assertNoUiLeak(paperPreview, "paper preview");
assertNoUiLeak(testnetPreview, "testnet preview");
assertNoUiLeak(productionPreview, "production preview");

const workspaceSignalUi = await readSource("src/components/workspace/signal-management-section.tsx");
assert(workspaceSignalUi.includes("directionalLevelError"), "workspace signal form blocks invalid directional levels before publish");
assert(workspaceSignalUi.includes("BTCUSDT, ETHUSDT") && workspaceSignalUi.includes("EURUSD, GBPUSD"), "workspace signal form shows market-specific placeholders");

const completionEvidence = await readSource("prompt/15H-sandbox-testnet-live-order-worker-completion-note.md");
assert(completionEvidence.includes("filled_live"), "Binance testnet filled_live evidence is documented");
assert(completionEvidence.includes("bybit_order_ret_170131") && completionEvidence.includes("usable USDT"), "Bybit insufficient-balance proof is documented as exchange-reached");

const workspace = await getRequired(`workspaces/${ids.workspaceId}`);
assert(workspace.workspaceId === ids.workspaceId, "Stage 15 workspace fixture exists");

const validCryptoSignal = await getRequired(`workspaces/${ids.workspaceId}/signals/${ids.signals.buyValid}`);
assert(validCryptoSignal.market === "crypto" && canonical(validCryptoSignal.pair) === "BTCUSDT", "fresh crypto fixture remains BTCUSDT");
assert(Number(validCryptoSignal.takeProfit) > Number(validCryptoSignal.entry), "fresh buy crypto fixture has TP above entry");
assert(Number(validCryptoSignal.stopLoss) < Number(validCryptoSignal.entry), "fresh buy crypto fixture has SL below entry");

const signals = await list(`workspaces/${ids.workspaceId}/signals`);
const invalidCryptoSignals = signals.filter((signal) => signal.market === "crypto" && canonical(signal.pair) === "EURUSD");
if (invalidCryptoSignals.length > 0) {
  console.log(`ℹ Historical invalid EURUSD crypto signal count: ${invalidCryptoSignals.length}. Completion posture requires hidden/blocked handling, not silent rewrite.`);
}

const paperIntents = await list(`workspaces/${ids.workspaceId}/execution_intents`);
const liveIntents = await list(`workspaces/${ids.workspaceId}/live_execution_intents`);
const workerConsumableStatuses = new Set([
  "ready_for_paper",
  "queued_paper",
  "ready_for_live",
  "queued_live",
  "submitting_live",
  "submitted_live"
]);
const unsafeEurusdIntents = [...paperIntents, ...liveIntents].filter((intent) =>
  canonical(intent.symbol) === "EURUSD" && workerConsumableStatuses.has(intent.status)
);
assert(unsafeEurusdIntents.length === 0, "EURUSD is not worker-consumable as crypto execution");

const productionConsent = await getRequired(`workspaces/${ids.workspaceId}/students/${ids.students.binanceSandbox}/live_consents/current`);
assert(["accepted", "paused", "revoked"].includes(productionConsent.productionStatus), "student production consent state is explicit");
assert(productionConsent.productionLiveLossRiskConfirmed === true, "student production consent includes live-loss risk confirmation");
assert(productionConsent.tradeHubNoCustodyConfirmed === true, "student production consent includes no-custody confirmation");

const productionAttempts = await list(`workspaces/${ids.workspaceId}/live_order_attempts`);
assert(productionAttempts.every((attempt) => !attempt.apiSecret && !attempt.rawExchange && !attempt.credentialRefPath), "attempt fixtures contain no secret-bearing fields");

assert(process.env.CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED !== "true", "production order calls are not enabled for Stage 15K QA");
assert(process.env.CRYPTO_EXECUTION_PRODUCTION_DRY_RUN !== "false", "production dry-run remains on for Stage 15K QA");
assert(process.env.CRYPTO_EXECUTION_LIVE_ENABLED !== "true", "legacy live flag is not active for Stage 15K QA");

console.log("Stage 15K crypto completion QA passed. No real exchange credentials or production order calls were used.");
