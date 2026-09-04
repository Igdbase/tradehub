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
const allowlist = read("src/lib/practice/practice-crypto-spot-allowlist.ts");
const adapter = read("src/lib/practice/binance-public-spot-catalogue.ts");
const historical = read("src/lib/practice/historical-data-service.ts");
const specs = read("src/lib/practice/practice-instrument-specs.ts");
const types = read("src/types/practice.ts");
const repository = read("src/lib/practice/practice-repository.ts");
const fillEngine = read("src/lib/practice/practice-fill-engine.ts");
const accountLinkedLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const journalClient = read("src/components/student-app/student-journal-client.tsx");
const seed = read("scripts/seed-demo-data.mjs");
const studentSpec = read("tests/browser/student-e2e.spec.mjs");
const rules = read("firestore.rules");
const docs = [
  read("plan.md"), read("manual-test-backlog.md"), read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"), read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29c2:qa"] === "node scripts/qa-stage29c2-expanded-crypto-catalogue.mjs",
  "package.json exposes npm run stage29c2:qa."
);

const candidateSymbols = [...allowlist.matchAll(/\{ symbol: "([A-Z0-9]+USDT)"/g)].map((match) => match[1]);
assert(candidateSymbols.length >= 50, `Approved Crypto allowlist has at least 50 candidates (${candidateSymbols.length}).`);
assert(new Set(candidateSymbols).size === candidateSymbols.length, "Approved Crypto allowlist contains no duplicate canonical symbols.");
assertIncludesAll(
  candidateSymbols.join(" "),
  ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "LINKUSDT"],
  "Foundation pairs and LINKUSDT remain approved."
);
assert(
  ["BTCUPUSDT", "BTCDOWNUSDT", "ETHBULLUSDT", "ETHBEARUSDT", "USDCUSDT", "FDUSDUSDT"]
    .every((symbol) => !candidateSymbols.includes(symbol)),
  "Allowlist excludes leveraged and stablecoin-to-stablecoin pairs."
);

assertIncludesAll(
  adapter,
  [
    'import "server-only"', "api/v3/exchangeInfo", 'record.status !== "TRADING"',
    'record.quoteAsset !== "USDT"', "isSpotTradingAllowed", 'permissions.includes("SPOT")',
    'safeFilter(record.filters, "PRICE_FILTER")', 'safeFilter(record.filters, "LOT_SIZE")',
    'safeFilter(record.filters, "NOTIONAL")', 'safeFilter(record.filters, "MIN_NOTIONAL")',
    "tickSize", "minQuantity", "maxQuantity", "stepSize", "minNotional",
    "decimalPlaces", "MAX_PROVIDER_RESPONSE_BYTES", "MAX_PROVIDER_SYMBOLS",
    "CATALOGUE_CACHE_TTL_MS = 15 * 60 * 1000", "AbortController",
    "platform_practice_crypto_catalogue/current", "getVerifiedBinanceSpotInstrument",
    "unavailableApprovedCryptoSpotCatalogue"
  ],
  "Server-only Binance spot verification is bounded, filter-aware, cached, and fail-closed."
);
assertExcludesAll(
  adapter,
  ["apiKey", "secretKey", "X-MBX-APIKEY", "/fapi/", "/dapi/", "margin"],
  "Crypto catalogue adapter uses no credentials, futures, delivery, or margin endpoints."
);

assertIncludesAll(
  `${types}\n${repository}\n${fillEngine}`,
  [
    "quantityStep: number", "tickSize?: number", "minSimulatedNotional?: number", "maxSimulatedNotional",
    "tickSize: Math.max", "minSimulatedNotional: Math.max", "practice_price_tick_invalid",
    "quantityStep: Math.max", "notional < (instrument.minSimulatedNotional ?? 0)",
    "instrument: candleResult.instrument ?? validatedInstrument"
  ],
  "Verified instrument snapshots drive order validation and remain stored on new sessions/orders."
);
assertIncludesAll(
  `${adapter}\n${repository}\n${fillEngine}`,
  [
    "quantityStep: stepSize", "quantityStep: safeNumber(spec.quantityStep)",
    '"quantityStep"', "quantityStep: instrument?.quantityStep",
    "quantizePracticeQuantityDown", "practiceQuantityAlignsWithStep",
    "practiceQuantityStepCount", "practiceQuantityFromStepCount",
    "actualRiskAmount > riskAmount + 0.000001"
  ],
  "Binance LOT_SIZE stepSize persists through snapshots/exports and sizing rounds down to bounded step units."
);
assertIncludesAll(
  `${fillEngine}\n${repository}`,
  [
    "validatePracticePriceTickAlignment", "prices: [entryPrice, stopLoss, takeProfit]",
    "practice_partial_close_remainder_invalid", "practice_partial_close_notional_invalid",
    "previouslyClosedStepCount + remainingStepCount !== totalStepCount",
    "previouslyClosedStepCount + closeStepCount !== totalStepCount - remainingAfterStepCount",
    "closedSize: alignedClosedSize", "remainingSize: alignedRemainingSize"
  ],
  "SL/TP edits recheck ticks and partial closes conserve step-aligned quantities without float drift."
);
assertIncludesAll(
  `${historical}\n${repository}`,
  [
    "getVerifiedBinanceSpotCatalogue", "getVerifiedBinanceSpotInstrument",
    "const assetCatalogue = await getPracticeAssetCatalogue()", "fetchHistoricalCandlesWithCache",
    "Historical candles are not available for that session setup right now."
  ],
  "Session creation rechecks catalogue availability, instrument filters, and candles before persistence."
);
assert(
  repository.indexOf("const assetCatalogue = await getPracticeAssetCatalogue()") < repository.indexOf("practice_sessions/${sessionId}`).set"),
  "Session persistence occurs only after protected catalogue and candle validation."
);
assertIncludesAll(
  `${repository}\n${specs}`,
  [
    "pricePrecision", "quantityPrecision", "quantityLabel", "tickSize",
    "quantityStep",
    "minSimulatedSize", "maxSimulatedSize", "minSimulatedNotional", "maxSimulatedNotional",
    "EXPANDED_CRYPTO_SPOT_SPECS", "instrumentDisplayName"
  ],
  "Snapshots remain available to formatting, reports, analytics, journal records, and CSV/JSON exports."
);
assertIncludesAll(
  `${accountLinkedLedger}\n${journalClient}`,
  [
    "practiceInstrument?: PracticeInstrumentSpecSummary", "practiceInstrument: instrument",
    "mapLedgerPracticeInstrument", "record.quantityStep", "entry.practiceInstrument ?? getPracticeInstrumentSpec"
  ],
  "Private practice journal ledger entries preserve sanitized dynamic instrument metadata including quantityStep."
);

assertIncludesAll(
  practiceClient,
  [
    'useState<PracticeAssetCategoryFilter>("all")', "availableAssetCountByCategory",
    "practice-asset-category-count-", "Search assets", "practice-selected-asset",
    "practice-asset-toggle", "isAssetPickerOpen", "ChevronDown", "ChevronUp",
    'role="combobox"', 'role="listbox"', 'aria-expanded={isAssetPickerOpen}',
    "handleAssetComboboxKeyDown", "moveActiveAsset", 'document.addEventListener("pointerdown"',
    "z-[70]", "max-h-60", "overflow-x-hidden", "bg-black", 'label: "Indices"', 'label: "Energies"',
    "sessionSubmissionLockRef", "trapQuickSessionFocus"
  ],
  "Quick Session uses a collapsed, counted, searchable, keyboard-accessible asset combobox with a bounded opaque popup."
);
assertExcludesAll(
  practiceClient,
  ["exchangeInfo", "rawProviderPayload", "providerSymbol", "vaultRef", "apiKey", "executeAutoCopy(", "submitLiveOrder("],
  "Student Practice UI contains no exchange internals, secrets, AutoCopy, or live execution hooks."
);
assertIncludesAll(
  `${terminalClient}\n${replayClient}`,
  [
    "practice-terminal-instrument-format", "instrumentSpec?.pricePrecision", "instrumentSpec?.quantityPrecision",
    "quantizePracticeQuantityDown(riskAmount", "quantizePracticeQuantityDown(estimatedRiskAmount"
  ],
  "Terminal/replay previews expose verified formatting and round sizing down to the server quantity step."
);

const demoSymbolsBlock = seed.match(/const DEMO_CRYPTO_SPOT_ASSETS = \[([\s\S]*?)\n\];/)?.[1] ?? "";
const demoSymbols = [...demoSymbolsBlock.matchAll(/\["([A-Z0-9]+USDT)"/g)].map((match) => match[1]);
assert(demoSymbols.length >= 40, `Demo seed contains at least 40 normalized Crypto instruments (${demoSymbols.length}).`);
assert(new Set(demoSymbols).size === demoSymbols.length, "Demo Crypto catalogue has no duplicate pairs.");
assertIncludesAll(
  seed,
  [
    "demoCryptoSpotCatalogueDoc", 'symbol: "LINKUSDT"', "basePrice: 24",
    "quantityStep: minSimulatedSize", "demoBtcPracticeInstrument", "quantityStep: 0.00001",
    "quantizePrice", "open = quantizePrice", "close = quantizePrice", "high = quantizePrice", "low = quantizePrice",
    'practiceHistoricalCacheDoc({ symbol: "LINKUSDT", basePrice: 24, tickSize: 0.001 })',
    'platform_practice_crypto_catalogue/current', "minSimulatedNotional: 5", "demoSeed: true"
  ],
  "Emulator seed includes quantity steps, snapshots, and tick-quantized deterministic LINKUSDT OHLC candles."
);
const linkFirstClose = Number((Math.round((24 + 24 * 0.0005 * 1.6) / 0.001) * 0.001).toFixed(3));
assert(linkFirstClose === 24.019 && linkFirstClose !== 24.0192, "LINKUSDT first seeded close resolves to its 0.001 tick (24.019). ");

assertIncludesAll(
  studentSpec,
  [
    "expanded verified Crypto catalogue", "practice-asset-category-count-crypto",
    "toBeGreaterThanOrEqual(40)", "LINKUSDT, Chainlink \\/ Tether, available",
    "practice-asset-catalogue", "toHaveCount(0)", "Open asset catalogue", "Close asset catalogue",
    'assetField.fill("LINKUSDT")', 'toHaveValue("LINKUSDT · Chainlink / Tether")',
    'toHaveAttribute("aria-selected", "true")', 'page.keyboard.press("Escape")', "await expect(modal).toBeVisible()",
    "Stage 29C2 LINK Session", "Price 3 dp · Qty 2 dp", "createRequests).toBe(1)",
    "Submit simulated order", 'expect(openedOrder.status).toBe("open")',
    "Partial close percent", "Close partial", "closedStepUnits + remainingStepUnits",
    "USOIL, US Crude Oil, available"
  ],
  "Playwright covers the collapsed LINKUSDT picker contract, one-submit creation, terminal order acceptance, aligned close conservation, P&L state, cleanup, and the USOIL flow."
);

assertIncludesAll(
  rules,
  ["match /platform_practice_crypto_catalogue/{documentId}", "allow read, write: if false;"],
  "Direct browser access to normalized catalogue cache remains denied."
);
assertIncludesAll(
  docs,
  [
    "Stage 29C.2: Expanded Verified Crypto Asset Catalogue",
    "TH-2026-08-26-STAGE29C2-EXPANDED-CRYPTO-CATALOGUE-HANDOFF",
    "Stage 29C.3: Broader Forex/CFD Asset Catalogue Completion",
    "Stage 29C.3 is implemented",
    "Stage 29D remains pending",
    "Owner browser acceptance remains deferred"
  ],
  "Roadmap preserves Stage 29C.2 acceptance while recording Stage 29C.3 and keeping Stage 29D pending."
);

console.log("Stage 29C.2 expanded verified Crypto catalogue QA passed.");
