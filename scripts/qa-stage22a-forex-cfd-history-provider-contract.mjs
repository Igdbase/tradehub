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
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertExcludesAll(source, forbidden, message) {
  const found = forbidden.filter((entry) => source.includes(entry));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const envExample = read(".env.example");
const practiceTypes = read("src/types/practice.ts");
const contract = read("src/lib/practice/forex-cfd-history-provider-contract.ts");
const historicalService = read("src/lib/practice/historical-data-service.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const candleRoute = read("src/app/api/student/practice/candles/route.ts");
const sessionCandleRoute = read("src/app/api/student/practice/sessions/[sessionId]/candles/route.ts");
const rules = read("firestore.rules");

const stage22aSources = [
  contract,
  historicalService,
  practiceRepo,
  practiceClient,
  candleRoute,
  sessionCandleRoute,
  practiceTypes
].join("\n");

assert(
  packageJson.scripts?.["stage22a:qa"] === "node scripts/qa-stage22a-forex-cfd-history-provider-contract.mjs",
  "package.json exposes npm run stage22a:qa."
);

assertIncludesAll(
  envExample,
  [
    "PRACTICE_FOREX_CFD_REAL_HISTORY_ENABLED=false",
    "PRACTICE_FOREX_CFD_HISTORY_PROVIDER=disabled",
    "PRACTICE_FOREX_CFD_HISTORY_DRY_RUN=true",
    "PRACTICE_FOREX_CFD_HISTORY_VAULT_READY=false",
    "PRACTICE_FOREX_CFD_HISTORY_SECRET_MANAGER_PROJECT_ID=",
    "PRACTICE_FOREX_CFD_HISTORY_SECRET_NAME=",
    "PRACTICE_FOREX_CFD_PROVIDER_SYMBOL_MAP="
  ],
  ".env.example documents disabled-by-default real Forex/CFD history and vault gates."
);

assertIncludesAll(
  contract,
  [
    "import \"server-only\";",
    "ForexCfdHistoricalProviderContract",
    "ForexCfdHistoryProviderReadiness",
    "disabled",
    "tradehub_static_demo",
    "metaapi_utility",
    "FOREX_CFD_HISTORY_SUPPORTED_SYMBOLS",
    "\"XAUUSD\"",
    "\"EURUSD\"",
    "\"GBPUSD\"",
    "\"USDJPY\"",
    "\"USDCHF\"",
    "\"USDCAD\"",
    "\"AUDUSD\"",
    "\"NZDUSD\"",
    "FOREX_CFD_HISTORY_SUPPORTED_TIMEFRAMES",
    "safeForexCfdProviderSymbol",
    "forexCfdProviderSymbolMatchesCanonical",
    "provider.startsWith(canonical)",
    "PRACTICE_FOREX_CFD_PROVIDER_SYMBOL_MAP",
    "resolveForexCfdHistoryProviderSymbol"
  ],
  "Server-only Forex/CFD provider contract defines safe symbols, timeframes, and provider-symbol mapping."
);

assertIncludesAll(
  contract,
  [
    "PRACTICE_FOREX_CFD_REAL_HISTORY_ENABLED",
    "PRACTICE_FOREX_CFD_HISTORY_PROVIDER",
    "PRACTICE_FOREX_CFD_HISTORY_DRY_RUN",
    "PRACTICE_FOREX_CFD_HISTORY_VAULT_READY",
    "PRACTICE_FOREX_CFD_HISTORY_SECRET_MANAGER_PROJECT_ID",
    "PRACTICE_FOREX_CFD_HISTORY_SECRET_NAME",
    "getForexCfdHistoryProviderReadiness",
    "real_forex_cfd_history_provider_disabled",
    "real_forex_cfd_history_env_disabled",
    "real_forex_cfd_history_vault_unavailable",
    "real_forex_cfd_history_dry_run",
    "real_forex_cfd_history_adapter_pending",
    "assertForexCfdRealHistoryReady"
  ],
  "Real Forex/CFD provider readiness is explicitly env, dry-run, vault, and adapter gated."
);

assertIncludesAll(
  historicalService,
  [
    "binancePublicCryptoProvider",
    "https://api.binance.com/api/v3/klines",
    "generateTradeHubStaticForexCfdCandles",
    "getForexCfdHistoryProviderReadiness",
    "assertForexCfdRealHistoryReady",
    "readiness.provider === \"disabled\"",
    "readiness.provider === \"tradehub_static_demo\"",
    "readiness.provider === \"metaapi_utility\"",
    "practice_forex_cfd_history_not_configured",
    "practice_forex_cfd_history_provider_invalid",
    "providerSymbolForCache",
    "providerSymbol: cached.providerSymbol ?? providerSymbol",
    "MAX_CANDLES_PER_REQUEST",
    "MAX_RANGE_MS",
    "SUPPORTED_TIMEFRAMES"
  ],
  "Historical service keeps crypto path working, static demo separate, and real Forex/CFD fail-closed."
);

assertIncludesAll(
  historicalService,
  [
    "provider: \"binance\"",
    "provider: \"metaapi_mt5\"",
    "assetClass: \"forex_cfd\"",
    "providerSymbol,",
    "validateCandleShape",
    "Historical candles could not be normalized safely."
  ],
  "Historical output remains normalized and provider metadata is safe/separate."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeForexCfdHistoryReadinessSummary",
    "providerLabel: string",
    "vaultReady: boolean",
    "failClosedReason?: string",
    "NormalizedCandle",
    "providerSymbol?: string",
    'StudentPracticeCandle = Omit<NormalizedCandle, "provider" | "providerSymbol">'
  ],
  "Practice types keep provider readiness server-side and expose a provider-free candle shape to students."
);

assertIncludesAll(
  practiceRepo,
  [
    "toStudentPracticeCandle",
    "Historical candles are normalized server-side and returned only for the requested bounded range.",
    "Replay candles are sliced server-side through the current reveal index; unrevealed future candles are not returned."
  ],
  "Practice repository strips provider fields and preserves revealed-candle boundaries."
);

assertExcludesAll(
  `${practiceTypes}\n${practiceRepo}\n${practiceClient}`,
  [
    "forexCfdHistoryReadiness?: PracticeForexCfdHistoryReadinessSummary",
    "forexCfdHistoryReadiness: historicalDataLimits.forexCfdHistoryReadiness",
    "provider: result.provider",
    "providerSymbol: result.providerSymbol",
    "cacheId: result.cacheId"
  ],
  "Student practice responses do not expose provider readiness, provider symbols, or cache identifiers."
);

for (const route of [candleRoute, sessionCandleRoute]) {
  assertIncludesAll(
    route,
    ["requireStudent(request)", "apiJson", "apiError"],
    "Practice candle routes remain signed-in-student protected."
  );
}

assertIncludesAll(
  rules,
  [
    "historical_candle_cache",
    "practice_sessions",
    "practice_orders",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for protected practice/cache paths."
);

assertIncludesAll(
  plan,
  [
    "Stage 22A - Real Forex/CFD Historical Provider Contract And Vault Gate",
    "TH-2026-08-22-STAGE22A-FOREX-CFD-HISTORY-CONTRACT-HANDOFF",
    "real provider fetch remains disabled until Stage 22B",
    "Practice/backtesting MVP remains frozen",
    "Course/lesson MVP remains frozen",
    "Ops/CRM/payments/support MVP remains frozen",
    "Manual Journal MVP remains frozen"
  ],
  "plan.md records Stage 22A as a contract/gate stage and preserves frozen foundations."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 22A Real Forex/CFD Historical Provider Contract And Vault Gate",
    "BTCUSDT practice candles still work.",
    "Forex/CFD with real provider disabled fails closed safely.",
    "Static demo provider still works only when explicitly configured.",
    "Safe readiness preview shows no secrets/vault refs/account IDs/raw payloads.",
    "Unsupported symbol/timeframe/date range fails safely.",
    "No hidden unrevealed candles appear in browser responses."
  ],
  "manual-test-backlog.md records Stage 22A deferred manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-22-STAGE22A-FOREX-CFD-HISTORY-CONTRACT-HANDOFF",
    "Stage 22A - Real Forex/CFD Historical Provider Contract And Vault Gate",
    "Stage 22B should add the real adapter",
    "Practice/backtesting MVP remains source-QA frozen at Stage 18X",
    "Manual Journal MVP remains source-QA frozen at Stage 21D"
  ],
  "prompt summary advances current stop to Stage 22A and keeps frozen references."
);

assertExcludesAll(
  stage22aSources,
  [
    "submitOrder(",
    "postTrade(",
    "getExchangeOrderAdapter",
    "getForexDemoOrderPlacementAdapter",
    "getForexLiveCanaryOrderPlacementAdapter",
    "studentMetaApi",
    "studentBroker",
    "brokerPassword",
    "apiSecret",
    "rawProviderPayload",
    "providerPayload",
    "Paystack",
    "sendSms",
    "sendWhatsApp",
    "uploadBytes",
    "generatePdf",
    "AutoCopy execution"
  ],
  "Stage 22A source does not add execution, student credentials, provider payloads, payments, uploads, messaging, PDFs, or AutoCopy coupling."
);

assert(
  !practiceClient.includes("PRACTICE_FOREX_CFD_HISTORY_SECRET_NAME") &&
    !practiceClient.includes("PRACTICE_FOREX_CFD_HISTORY_SECRET_MANAGER_PROJECT_ID") &&
    !practiceClient.includes("FOREX_METAAPI_UTILITY_TOKEN") &&
    !practiceClient.includes("FOREX_METAAPI_UTILITY_ACCOUNT_ID") &&
    !practiceClient.includes("vaultRef") &&
    !practiceClient.includes("accountId"),
  "Browser practice UI does not expose provider secret names, project IDs, vault refs, account IDs, or legacy token envs."
);

console.log("Stage 22A Forex/CFD historical provider contract QA passed.");
