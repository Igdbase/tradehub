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
const envExample = read(".env.example");
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const contract = read("src/lib/practice/forex-cfd-history-provider-contract.ts");
const adapter = read("src/lib/practice/metaapi-utility-history-adapter.ts");
const historicalService = read("src/lib/practice/historical-data-service.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const rules = read("firestore.rules");

const stage22bServerSources = [contract, adapter, historicalService, practiceRepo].join("\n");

assert(
  packageJson.scripts?.["stage22b:qa"] === "node scripts/qa-stage22b-forex-cfd-real-history-adapter.mjs",
  "package.json exposes npm run stage22b:qa."
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
    "PRACTICE_FOREX_CFD_HISTORY_BASE_URL=",
    "PRACTICE_FOREX_CFD_HISTORY_HTTP_TIMEOUT_MS=25000"
  ],
  ".env.example keeps real Forex/CFD history disabled by default and documents server-only adapter config."
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
    "return readiness;",
    "Real Forex/CFD practice history is configured through platform-managed server credentials.",
    "FOREX_CFD_HISTORY_ADAPTER_PENDING_REASON"
  ],
  "Stage 22B gates allow the adapter only after env, provider, dry-run, and vault readiness pass."
);

assertIncludesAll(
  adapter,
  [
    "import \"server-only\";",
    "SecretManagerServiceClient",
    "accessSecretVersion",
    "PRACTICE_FOREX_CFD_HISTORY_SECRET_MANAGER_PROJECT_ID",
    "PRACTICE_FOREX_CFD_HISTORY_SECRET_NAME",
    "PRACTICE_FOREX_CFD_HISTORY_BASE_URL",
    "PRACTICE_FOREX_CFD_HISTORY_HTTP_TIMEOUT_MS",
    "DEFAULT_METAAPI_MARKET_DATA_BASE_URL",
    "https://mt-market-data-client-api-v1.new-york.agiliumtrade.ai",
    "auth-token",
    "historical-market-data",
    "timeframes",
    "candles",
    "startTime",
    "limit",
    "MAX_METAAPI_CANDLES_PER_REQUEST"
  ],
  "MetaAPI utility adapter is server-only, vault-backed, and calls the bounded historical candles endpoint."
);

assertIncludesAll(
  adapter,
  [
    "metaApiTimeframe",
    "case 15",
    "return \"15m\"",
    "case 60",
    "return \"1h\"",
    "case 240",
    "return \"4h\"",
    "case 1440",
    "return \"1d\"",
    "candleLimit(input)",
    "Math.min(MAX_METAAPI_CANDLES_PER_REQUEST",
    "controller.abort()",
    "timeoutMs()"
  ],
  "Adapter maps approved timeframes and bounds provider request size/time."
);

assertIncludesAll(
  adapter,
  [
    "normalizeMetaApiCandle",
    "finiteNumber(record.open)",
    "finiteNumber(record.high)",
    "finiteNumber(record.low)",
    "finiteNumber(record.close)",
    "high < low",
    "symbol !== providerSymbol",
    "timeframe !== expectedTimeframe",
    "forexCfdProviderSymbolMatchesCanonical",
    "provider: \"metaapi_mt5\"",
    "assetClass: \"forex_cfd\"",
    "providerSymbol",
    "timeframeMinutes: input.timeframeMinutes",
    ".filter((candle) =>",
    ".sort((left, right)",
    "metaapi_utility_history_empty"
  ],
  "Adapter strictly normalizes MetaAPI candles into safe normalized candle records."
);

assertIncludesAll(
  adapter,
  [
    "readSafeProviderError",
    "metaapi_utility_history_fetch_failed",
    "metaapi_utility_history_response_invalid",
    "practice_forex_cfd_history_secret_invalid",
    "provider returned a safe failure",
    "provider returned an unsupported candle response",
    "credentials could not be loaded from the server vault"
  ],
  "Adapter uses safe failure messages and does not return raw provider payloads."
);

assertIncludesAll(
  historicalService,
  [
    "fetchMetaApiUtilityForexCfdCandles",
    "readiness.provider === \"disabled\"",
    "readiness.provider === \"tradehub_static_demo\"",
    "generateTradeHubStaticForexCfdCandles(input, providerSymbol)",
    "readiness.provider === \"metaapi_utility\"",
    "assertForexCfdRealHistoryReady()",
    "return fetchMetaApiUtilityForexCfdCandles(input, providerSymbol)",
    "binancePublicCryptoProvider",
    "https://api.binance.com/api/v3/klines",
    "writeHistoricalCandleCache",
    "candles,"
  ],
  "Historical service wires real adapter behind gates while preserving crypto and static demo paths."
);

assertIncludesAll(
  practiceRepo,
  [
    "toStudentPracticeCandle",
    "Historical candles are normalized server-side and returned only for the requested bounded range.",
    "Replay candles are sliced server-side through the current reveal index; unrevealed future candles are not returned."
  ],
  "Practice repository returns provider-free normalized/revealed candle data through protected server APIs."
);

assertIncludesAll(
  rules,
  [
    "historical_candle_cache",
    "practice_sessions",
    "practice_orders",
    "allow read, write: if false;"
  ],
  "Firestore rules continue to deny direct browser access to practice/cache paths."
);

assertIncludesAll(
  plan,
  [
    "Stage 22B - Server-Only Forex/CFD Historical Adapter MVP",
    "TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF",
    "No live broker/exchange execution",
    "raw provider payloads are never returned or stored",
    "tradehub_static_demo remains separate"
  ],
  "plan.md documents Stage 22B adapter handoff and boundaries."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 22B Server-Only Forex/CFD Historical Adapter MVP",
    "BTCUSDT practice candles still work.",
    "Forex/CFD real provider disabled still fails closed.",
    "Static demo provider still works only when explicitly configured.",
    "With real provider env enabled and dry-run off, XAUUSD/EURUSD fetch bounded normalized candles.",
    "Provider symbol mapping works, for example `XAUUSD:XAUUSDm`.",
    "Browser responses expose no raw provider payloads, vault refs, account IDs, tokens, broker passwords, or hidden candles."
  ],
  "manual-test-backlog.md records Stage 22B deferred manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF",
    "Stage 22B - Server-Only Forex/CFD Historical Adapter MVP",
    "Stage 22A gates",
    "Stage 23A"
  ],
  "prompt summary advances current stop to Stage 22B and points next to Stage 23A."
);

assertExcludesAll(
  stage22bServerSources,
  [
    "FOREX_METAAPI_UTILITY_TOKEN",
    "FOREX_METAAPI_UTILITY_ACCOUNT_ID",
    "studentMetaApi",
    "studentBroker",
    "brokerPassword",
    "getExchangeOrderAdapter",
    "getForexDemoOrderPlacementAdapter",
    "getForexLiveCanaryOrderPlacementAdapter",
    "submitOrder(",
    "postTrade(",
    "createMarket",
    "private Binance",
    "private Bybit",
    "uploadBytes",
    "generatePdf",
    "sendSms",
    "sendWhatsApp",
    "aiAnalysis"
  ],
  "Stage 22B server source does not add student credential use, execution, private exchange APIs, uploads, PDFs, messaging, or AI."
);

assert(
  !practiceClient.includes("PRACTICE_FOREX_CFD_HISTORY_SECRET_NAME") &&
    !practiceClient.includes("PRACTICE_FOREX_CFD_HISTORY_SECRET_MANAGER_PROJECT_ID") &&
    !practiceClient.includes("PRACTICE_FOREX_CFD_HISTORY_BASE_URL") &&
    !practiceClient.includes("authToken") &&
    !practiceClient.includes("accountId") &&
    !practiceClient.includes("vaultRef") &&
    !practiceClient.includes("providerPayload"),
  "Browser practice UI does not expose vault config, token fields, account IDs, vault refs, or provider payloads."
);

assert(
  !historicalService.includes("rawProviderPayload") &&
    !historicalService.includes("providerPayload") &&
    !historicalService.includes("payload,") &&
    !historicalService.includes("raw:"),
  "Historical cache path stores normalized candles only, not raw provider payloads."
);

console.log("Stage 22B server-only Forex/CFD historical adapter QA passed.");
