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

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const envExample = read(".env.example");
const practiceTypes = read("src/types/practice.ts");
const historicalService = read("src/lib/practice/historical-data-service.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const candleRoute = read("src/app/api/student/practice/candles/route.ts");
const sessionRoute = read("src/app/api/student/practice/sessions/route.ts");
const rules = read("firestore.rules");

const stage18jModules = [
  practiceTypes,
  historicalService,
  practiceRepo,
  practiceClient,
  candleRoute,
  sessionRoute
].join("\n");

assert(
  packageJson.scripts?.["stage18j:qa"] === "node scripts/qa-stage18j-historical-data-provider-expansion.mjs",
  "package.json exposes npm run stage18j:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18J - Historical Data Provider Expansion",
    "Add provider interfaces for Forex/CFD historical data using a platform utility account or approved public provider.",
    "Support XAUUSD and major Forex pairs first.",
    "Keep fail-closed behavior when provider credentials/configuration are missing.",
    "Do not use student MetaAPI credentials for practice historical data.",
    "Keep symbol normalization explicit: canonical symbol stays separate from provider symbol."
  ],
  "plan.md documents Stage 18J provider expansion and safety boundaries."
);

assertIncludesAll(
  envExample,
  [
    "PRACTICE_FOREX_CFD_HISTORY_PROVIDER=",
    "PRACTICE_FOREX_CFD_PROVIDER_SYMBOL_MAP="
  ],
  ".env.example documents disabled-by-default Forex/CFD practice history provider gates."
);

assertIncludesAll(
  practiceTypes,
  [
    "providerSymbol?: string",
    "HistoricalCandleCacheRecord",
    "HistoricalCandlesResponse",
    "RevealedPracticeCandlesResponse",
    "supportedForexCfdSymbols?: string[]"
  ],
  "Practice types carry safe providerSymbol metadata separately from canonical symbol."
);

assertIncludesAll(
  historicalService,
  [
    "SUPPORTED_FOREX_CFD_SYMBOLS",
    "\"XAUUSD\"",
    "\"EURUSD\"",
    "\"GBPUSD\"",
    "\"USDJPY\"",
    "\"USDCHF\"",
    "\"USDCAD\"",
    "\"AUDUSD\"",
    "\"NZDUSD\"",
    "safeProviderSymbol",
    "providerSymbolMatchesCanonical",
    "provider.startsWith(canonical)",
    "PRACTICE_FOREX_CFD_PROVIDER_SYMBOL_MAP",
    "resolveForexCfdProviderSymbol",
    "PRACTICE_FOREX_CFD_HISTORY_PROVIDER",
    "practice_forex_cfd_history_not_configured",
    "tradehub_static_demo",
    "generateTradeHubStaticForexCfdCandles",
    "metaapi_utility",
    "Student MetaAPI credentials are never used for practice data.",
    "practice_forex_cfd_history_provider_invalid"
  ],
  "Historical service supports XAUUSD/major Forex-CFD symbols with safe provider symbol mapping and fail-closed config."
);

assertIncludesAll(
  historicalService,
  [
    "buildHistoricalCandleCacheKey",
    "input.provider",
    "input.assetClass",
    "input.symbol",
    "input.providerSymbol",
    "String(input.timeframeMinutes)",
    "providerSymbolForCache",
    "providerSymbol: cached.providerSymbol ?? providerSymbol",
    "providerSymbol,",
    "supportedForexCfdSymbols: [...SUPPORTED_FOREX_CFD_SYMBOLS]"
  ],
  "Cache and response metadata separate provider/asset/canonical/providerSymbol to prevent crypto/forex cache cross-contamination."
);

assertIncludesAll(
  practiceRepo,
  [
    "providerSymbol: result.providerSymbol",
    "supportedForexCfdSymbols: historicalDataLimits.supportedForexCfdSymbols",
    "Historical candles are normalized server-side and returned only for the requested bounded range.",
    "Replay candles are sliced server-side through the current reveal index; unrevealed future candles are not returned."
  ],
  "Practice repository returns safe provider symbol metadata and preserves revealed-candle boundaries."
);

assertIncludesAll(
  practiceClient,
  [
    "supportedSymbols",
    "overview?.limits.supportedForexCfdSymbols",
    "overview?.limits.supportedCryptoSymbols",
    "Forex-CFD uses platform utility practice data when configured and fails closed safely otherwise.",
    "Provider symbol",
    "Fetch candles",
    "/api/student/practice/candles"
  ],
  "/app/practice guides students through supported symbols and safe provider-symbol previews."
);

for (const route of [candleRoute, sessionRoute]) {
  assertIncludesAll(
    route,
    ["requireStudent(request)", "apiJson", "apiError"],
    "Practice candle/session routes remain signed-in-student protected."
  );
}

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18J Historical Data Provider Expansion",
    "PRACTICE_FOREX_CFD_HISTORY_PROVIDER=tradehub_static_demo",
    "Confirm canonical symbol and provider symbol stay separate.",
    "Confirm no student MetaAPI credentials are used for practice data.",
    "Confirm no raw provider payloads, account IDs, vault refs, broker passwords, MetaAPI tokens, or AutoCopy internals appear in browser responses."
  ],
  "manual-test-backlog.md records Stage 18J manual QA for fail-closed and configured provider paths."
);

assertIncludesAll(
  rules,
  [
    "historical_candle_cache",
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "practice_bookmarks",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for protected practice/cache paths."
);

assert(
  !stage18jModules.includes("getForexDemoOrderPlacementAdapter") &&
    !stage18jModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !stage18jModules.includes("getExchangeOrderAdapter") &&
    !stage18jModules.includes("submitOrder(") &&
    !stage18jModules.includes("postTrade(") &&
    !stage18jModules.includes("private Binance") &&
    !stage18jModules.includes("private Bybit") &&
    !stage18jModules.includes("brokerPassword") &&
    !stage18jModules.includes("metaApiToken") &&
    !stage18jModules.includes("vaultRef") &&
    !stage18jModules.includes("rawProviderPayload"),
  "Stage 18J modules do not add forbidden execution/provider/private exchange/MetaAPI credential code."
);

assert(
  !stage18jModules.includes("studentMetaApi") &&
    !stage18jModules.includes("studentBroker") &&
    !stage18jModules.includes("accountId") &&
    !stage18jModules.includes("apiSecret"),
  "Practice historical data expansion does not depend on student credentials, account IDs, or private exchange secrets."
);

console.log("Stage 18J historical data provider expansion QA passed.");
