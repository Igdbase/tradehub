import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function assertIncludesAll(source, values, message) {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertExcludesAll(source, values, message) {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
}

const packageJson = JSON.parse(read("package.json"));
const contract = read("src/lib/practice/forex-cfd-history-provider-contract.ts");
const adapter = read("src/lib/practice/metaapi-utility-history-adapter.ts");
const historical = read("src/lib/practice/historical-data-service.ts");
const specs = read("src/lib/practice/practice-instrument-specs.ts");
const repository = read("src/lib/practice/practice-repository.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const reportClient = read("src/components/student-app/student-practice-report-client.tsx");
const journalClient = read("src/components/student-app/student-journal-client.tsx");
const seed = read("scripts/seed-demo-data.mjs");
const studentSpec = read("tests/browser/student-e2e.spec.mjs");
const docs = [
  read("complaint-resolution-roadmap.md"),
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29c3:qa"] === "node scripts/qa-stage29c3-forex-cfd-catalogue.mjs",
  "package.json exposes npm run stage29c3:qa."
);

const supportedBlock = contract.match(/FOREX_CFD_HISTORY_SUPPORTED_SYMBOLS = \[([\s\S]*?)\n\] as const/)?.[1] ?? "";
const supportedSymbols = [...supportedBlock.matchAll(/"([A-Z0-9]+)"/g)].map((match) => match[1]);
const cfdSymbols = new Set([
  "XAUUSD", "XAGUSD", "US30", "US500", "SPX500", "NAS100", "GER40", "UK100",
  "JP225", "JPN225", "USOIL", "UKOIL", "NATGAS"
]);
const forexSymbols = supportedSymbols.filter((symbol) => /^[A-Z]{6}$/.test(symbol) && !cfdSymbols.has(symbol));

assert(forexSymbols.length >= 40, `Provider contract includes at least 40 Forex candidates (${forexSymbols.length}).`);
assert(new Set(supportedSymbols).size === supportedSymbols.length, "Forex/CFD provider contract has no duplicate canonical symbols.");
assertIncludesAll(
  supportedSymbols.join(" "),
  [
    "EURUSD", "GBPUSD", "USDJPY", "EURGBP", "GBPJPY", "USDCNH", "USDSEK", "USDMXN",
    "XAUUSD", "XAGUSD", "US30", "SPX500", "NAS100", "GER40", "UK100", "JPN225",
    "USOIL", "UKOIL", "NATGAS"
  ],
  "Broad catalogue includes majors, crosses, additional FX candidates, and requested metals/index/energy CFDs."
);

assertIncludesAll(
  contract,
  [
    'SPX500: ["SPX500", "US500", "SP500"]',
    'JPN225: ["JPN225", "JP225", "NIKKEI225"]',
    'NATGAS: ["NATGAS", "XNGUSD", "NGAS", "NATURALGAS"]',
    "PRACTICE_FOREX_CFD_PROVIDER_SYMBOL_MAP",
    "forexCfdProviderSymbolMatchesCanonical",
    "canonicalForexCfdSymbolForProviderSymbol"
  ],
  "Canonical/provider mapping supports common private broker aliases without exposing account configuration."
);

assertIncludesAll(
  historical,
  [
    'LEGACY_FOREX_CFD_CATALOGUE_ALIASES = new Set(["US500", "JP225"])',
    'symbol: "FRA40"',
    "visibleApprovedForexCfdInstruments",
    "unavailableForexCfdCatalogue",
    "discoveredBySymbol",
    "available: Boolean(entry)",
    "Historical candles are not available for this asset right now.",
    'readiness.provider === "tradehub_static_demo"',
    "generateTradeHubStaticForexCfdCandles",
    'case "SPX500"',
    'case "JPN225"',
    'case "NATGAS"'
  ],
  "Catalogue remains broad while availability is derived from provider readiness/discovery and missing assets fail closed."
);

assertIncludesAll(
  specs,
  [
    "USDCNH", "USDHKD", "USDSGD", "USDSEK", "USDNOK", "USDDKK", "USDPLN",
    "USDMXN", "USDZAR", "USDTRY", "EURSEK", "EURNOK", "EURPLN", "GBPSEK",
    '["SPX500", "US 500", 2]', '["JPN225", "Japan 225", 1]', '["NATGAS", "Natural Gas"]',
    "tickSize: isJpy ? 0.001 : 0.00001",
    'quantityLabel: "Lots"',
    'symbol === "NATGAS" ? 10_000 : 1_000'
  ],
  "Newly supported FX/CFD instruments have conservative practice-only tick, lot, pip, and multiplier specs."
);

assertIncludesAll(
  repository,
  [
    "const validatedInstrument = asset.instrument ?? getPracticeInstrumentSpec(assetClass, symbol)",
    "practice_session_instrument_unavailable",
    "normalizeHistoricalCandleRequest",
    "fetchHistoricalCandlesWithCache",
    "instrument: candleResult.instrument ?? validatedInstrument"
  ],
  "Session creation rechecks catalogue availability, instrument specs, bounded request rules, provider readiness, and candles before persistence."
);

assertIncludesAll(
  seed,
  [
    'symbol: "EURGBP"', 'symbol: "USOIL"',
    'provider: "metaapi_mt5"', 'assetClass: "forex_cfd"',
    "eurGbpPracticeCache", "usOilPracticeCache",
    "tickSize: 0.00001", "tickSize: 0.001"
  ],
  "Deterministic emulator data includes tick-aligned EURGBP and USOIL normalized candle caches."
);

assertIncludesAll(
  practiceClient,
  [
    "practice-asset-toggle", 'role="combobox"', 'role="listbox"', "isAssetPickerOpen",
    "ChevronDown", "ChevronUp", "practice-asset-category-count-", "max-h-60", "bg-black"
  ],
  "Stage 29C.2 collapsed searchable picker behavior remains intact."
);

assertIncludesAll(
  studentSpec,
  [
    "static-demo Forex catalogue should expose at least 40 available pairs",
    "toBeGreaterThanOrEqual(40)",
    "practice-asset-category-metals", "practice-asset-category-indices", "practice-asset-category-energies",
    "FRA40, France 40, unavailable", "toBeDisabled()",
    "EURGBP, Euro \\/ British Pound, available",
    "USOIL, US Crude Oil, available",
    "Stage 29C Browser Session.*USOIL",
    "practice-asset-catalogue", "toHaveCount(0)"
  ],
  "Student browser QA covers broad counts, all CFD categories, disabled candidates, a configured CFD session, and the collapsed picker."
);

assertIncludesAll(
  `${terminalClient}\n${replayClient}\n${reportClient}\n${journalClient}`,
  [
    "getPracticeInstrumentSpec",
    "formatPracticePrice",
    "formatPracticeQuantity"
  ],
  "Terminal, replay, report, and journal surfaces continue using instrument-aware formatting."
);

assertExcludesAll(
  `${practiceClient}\n${studentSpec}`,
  [
    "providerSymbol", "accountId", "authToken", "brokerPassword", "metaApiToken",
    "vaultRef", "rawProviderPayload", "executeAutoCopy(", "submitLiveOrder("
  ],
  "Student catalogue and browser coverage expose no provider internals, credentials, AutoCopy, or live execution hooks."
);
assertExcludesAll(
  `${contract}\n${adapter}\n${historical}`,
  [
    "api.binance.com/api/v3/order", "api.bybit.com/v5/order", "executeAutoCopy("
  ],
  "Forex/CFD history expansion adds no private exchange or execution endpoint."
);

assertIncludesAll(
  docs,
  [
    "Stage 29C.3: Broader Forex/CFD Asset Catalogue Completion",
    "TH-2026-08-26-STAGE29C3-FOREX-CFD-CATALOGUE-HANDOFF",
    "Stage 29D remains pending"
  ],
  "Roadmap and handoff record Stage 29C.3 without starting Stage 29D."
);

console.log("Stage 29C.3 broader Forex/CFD catalogue QA passed.");

