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
    fail(`Missing required fixture: ${path}. Run stage15f/stage15h/stage15i seeds first.`);
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

configureEmulator();

console.log("Running Stage 15J student consent, symbol validation, and UI QA.");
console.log(`Project: ${STAGE15F_PROJECT_ID}`);
console.log(`Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);

const signalSymbolsSource = await readSource("src/lib/workspace/signal-symbols.ts");
assert(signalSymbolsSource.includes('"BTCUSDT"') && signalSymbolsSource.includes('"ETHUSDT"'), "crypto symbol helper has explicit spot allowlist");
assert(signalSymbolsSource.includes('"EURUSD"') && signalSymbolsSource.includes('"XAUUSD"'), "forex pair helper has explicit forex allowlist");

const dashboardValidation = await readSource("src/lib/workspace/dashboard-validation.ts");
assert(dashboardValidation.includes("normalizeSignalPairForMarket"), "workspace signal validation is market-aware");
assert(dashboardValidation.includes("Enter a supported crypto spot symbol"), "crypto pair validation returns market-specific copy");
assert(dashboardValidation.includes("Enter a supported forex pair"), "forex pair validation returns market-specific copy");
assert(dashboardValidation.includes("For buy signals, take profit must be above entry") && dashboardValidation.includes("For sell signals, take profit must be below entry"), "workspace signal validation rejects invalid directional levels before routing");

const riskEngine = await readSource("src/lib/crypto-execution/crypto-risk-engine.ts");
const liveSandbox = await readSource("src/lib/crypto-execution/crypto-live-sandbox.ts");
const liveProduction = await readSource("src/lib/crypto-execution/crypto-live-production.ts");
assert(riskEngine.includes("crypto_symbol_invalid_for_market"), "paper risk engine blocks invalid crypto symbols");
assert(liveSandbox.includes("crypto_symbol_invalid_for_market"), "live sandbox gate blocks invalid crypto symbols");
assert(liveProduction.includes("crypto_symbol_invalid_for_market"), "production dry-run gate blocks invalid crypto symbols");

const studentUi = await readSource("src/components/student-app/student-copier-client.tsx");
assert(studentUi.includes("Accept live beta terms"), "student UI exposes production consent accept action");
assert(studentUi.includes("Pause live beta") && studentUi.includes("Resume live beta") && studentUi.includes("Revoke live consent"), "student UI exposes production pause/resume/revoke actions");
assert(studentUi.includes("Accepting it does not") && studentUi.includes("enable real orders"), "student UI explains consent does not enable real production trading");

const workspaceSignalUi = await readSource("src/components/workspace/signal-management-section.tsx");
assert(workspaceSignalUi.includes("directionalLevelError") && workspaceSignalUi.includes("For buy signals, take profit must be above entry"), "workspace signal form shows directional level errors before submit");

for (const route of ["consent", "pause", "resume", "revoke"]) {
  const source = await readSource(`src/app/api/student/crypto-execution/live-production/${route}/route.ts`);
  assert(source.includes("requireStudent") && source.includes("updateStudentLiveProductionConsent"), `${route} route is student-authenticated and server-backed`);
}

const packageJson = await readSource("package.json");
assert(packageJson.includes('"stage15j:qa"'), "package.json exposes stage15j:qa");

const workspaceSignal = await getRequired(`workspaces/${ids.workspaceId}/signals/${ids.signals.buyValid}`);
assert(workspaceSignal.market === "crypto" && canonical(workspaceSignal.pair) === "BTCUSDT", "fresh crypto fixture uses BTCUSDT");

const signals = await list(`workspaces/${ids.workspaceId}/signals`);
const historicalInvalidCryptoSignals = signals.filter((signal) => signal.market === "crypto" && canonical(signal.pair) === "EURUSD");
if (historicalInvalidCryptoSignals.length > 0) {
  console.log(`ℹ Found ${historicalInvalidCryptoSignals.length} historical EURUSD crypto signal(s); Stage 15J must hide/block them rather than silently rewrite history.`);
}

const paperIntents = await list(`workspaces/${ids.workspaceId}/execution_intents`);
const liveIntents = await list(`workspaces/${ids.workspaceId}/live_execution_intents`);
const unsafeEurusdIntents = [...paperIntents, ...liveIntents].filter((intent) =>
  canonical(intent.symbol) === "EURUSD" &&
  ["ready_for_paper", "queued_paper", "ready_for_live", "queued_live", "submitting_live", "submitted_live"].includes(intent.status)
);
assert(unsafeEurusdIntents.length === 0, "no EURUSD fixture is worker-consumable as crypto execution");

const consent = await getRequired(`workspaces/${ids.workspaceId}/students/${ids.students.binanceSandbox}/live_consents/current`);
assert(["accepted", "paused", "revoked"].includes(consent.productionStatus), "production consent fixture uses explicit production status");
assert(consent.productionLiveLossRiskConfirmed === true, "production consent fixture records live-loss risk confirmation");
assert(consent.tradeHubNoCustodyConfirmed === true, "production consent fixture records TradeHub no-custody confirmation");

const previewSource = await readSource("src/lib/crypto-execution/crypto-execution-repository.ts");
assert(previewSource.includes("invalid-market crypto execution rows were hidden"), "paper preview hides invalid-market crypto execution rows safely");

assert(process.env.CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED !== "true", "production order calls are not enabled for Stage 15J QA");
assert(process.env.CRYPTO_EXECUTION_PRODUCTION_DRY_RUN !== "false", "production dry-run remains on for Stage 15J QA");

console.log("Stage 15J QA passed. No real exchange credentials or production order calls were used.");
