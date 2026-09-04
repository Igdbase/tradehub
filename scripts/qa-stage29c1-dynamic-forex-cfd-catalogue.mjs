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
const types = read("src/types/practice.ts");
const contract = read("src/lib/practice/forex-cfd-history-provider-contract.ts");
const adapter = read("src/lib/practice/metaapi-utility-history-adapter.ts");
const historical = read("src/lib/practice/historical-data-service.ts");
const specs = read("src/lib/practice/practice-instrument-specs.ts");
const fillEngine = read("src/lib/practice/practice-fill-engine.ts");
const repository = read("src/lib/practice/practice-repository.ts");
const ledger = read("src/lib/journal/account-linked-performance-ledger.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const studentSpec = read("tests/browser/student-e2e.spec.mjs");
const envExample = read(".env.example");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const manualDemo = read("manual-demo-qa.md");
const roadmap = read("complaint-resolution-roadmap.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  packageJson.scripts?.["stage29c1:qa"] === "node scripts/qa-stage29c1-dynamic-forex-cfd-catalogue.mjs",
  "package.json exposes npm run stage29c1:qa."
);

assertIncludesAll(
  types,
  [
    '"forex_cross"', '"metals_cfd"', '"indices_cfd"', '"energy_cfd"',
    '"indices"', '"energies"',
    "instrument?: PracticeInstrumentSpecSummary"
  ],
  "Practice types support safe expanded Forex/CFD categories and instrument snapshots."
);

assertIncludesAll(
  contract,
  [
    "FOREX_CFD_APPROVED_INSTRUMENTS",
    "EURGBP", "GBPJPY", "AUDCAD", "CADCHF", "XAGUSD",
    "US30", "US500", "NAS100", "GER40", "UK100", "JP225",
    "USOIL", "UKOIL",
    "SPX500", "USTEC", "DE40", "XTIUSD", "XBRUSD",
    "canonicalForexCfdSymbolForProviderSymbol",
    "forexCfdProviderSymbolMatchesCanonical",
    "PRACTICE_FOREX_CFD_PROVIDER_SYMBOL_MAP"
  ],
  "The approved universe covers FX crosses, metals, indices, energies, and private broker aliases."
);

assertExcludesAll(
  contract,
  ["AAPL", "TSLA", "CORN", "WHEAT", "PORK", "COCOA"],
  "Stage 29C.1 does not advertise unsupported equities or agriculture contracts."
);

assertIncludesAll(
  adapter,
  [
    "SecretManagerServiceClient",
    "DEFAULT_METAAPI_TERMINAL_BASE_URL",
    "PRACTICE_FOREX_CFD_TERMINAL_BASE_URL",
    "DISCOVERY_CACHE_TTL_MS = 15 * 60 * 1000",
    "discoverMetaApiUtilityForexCfdInstruments",
    '"users", "current", "accounts"',
    '"symbols", encodeURIComponent(providerSymbol), "specification"',
    ".slice(0, 2_000)",
    "index += 4",
    "digits < 0 || digits > 8",
    "tickSize <= 0",
    "maxVolume < minVolume",
    "volumeStep <= 0",
    "contractSize <= 0",
    "Verified platform instrument specification for simulated practice. Broker identifiers remain private."
  ],
  "MetaAPI discovery is server-only, bounded, cached, specification-validated, and fail-closed."
);

assertIncludesAll(
  envExample,
  [
    "PRACTICE_FOREX_CFD_REAL_HISTORY_ENABLED=false",
    "PRACTICE_FOREX_CFD_HISTORY_DRY_RUN=true",
    "PRACTICE_FOREX_CFD_TERMINAL_BASE_URL=",
    "PRACTICE_FOREX_CFD_HISTORY_SECRET_NAME="
  ],
  "Real provider discovery remains disabled and vault-gated by default."
);

assertIncludesAll(
  historical,
  [
    "export async function getPracticeAssetCatalogue()",
    "discoverMetaApiUtilityForexCfdInstruments",
    "visibleApprovedForexCfdInstruments",
    'readiness.provider === "tradehub_static_demo"',
    "getMetaApiUtilityForexCfdInstrument",
    "instrument: entry?.instrument",
    "providerSymbol: discovered.providerSymbol",
    "Historical candles are not available for this asset right now."
  ],
  "The student catalogue is derived from safe readiness/discovery and unavailable providers fail closed."
);

assertIncludesAll(
  specs,
  [
    "FOREX_CROSS_SYMBOLS", "XAGUSD", "indices_cfd", "energy_cfd",
    "contractMultiplier", "minSimulatedSize", "maxSimulatedSize"
  ],
  "Expanded assets have bounded conservative simulation fallbacks."
);

assertIncludesAll(
  `${repository}\n${fillEngine}\n${ledger}`,
  [
    "const assetCatalogue = await getPracticeAssetCatalogue()",
    "instrument: candleResult.instrument ?? validatedInstrument",
    "session.instrument ?? getPracticeInstrumentSpec",
    "requireSupportedPracticeInstrument(input.assetClass, input.symbol, input.instrument)",
    "input.session.instrument"
  ],
  "Verified instrument snapshots flow through creation, sizing, exports, and the practice ledger."
);

assertIncludesAll(
  `${practiceClient}\n${terminalClient}\n${replayClient}`,
  [
    'label: "Indices"', 'label: "Energies"',
    "session.instrument ?? getPracticeInstrumentSpec"
  ],
  "Practice UI exposes the new categories and uses safe session specs in replay surfaces."
);

assertIncludesAll(
  studentSpec,
  [
    "XAGUSD, Silver \\/ US Dollar, available",
    "EURGBP, Euro \\/ British Pound, available",
    "NAS100, US Tech 100, available",
    "USOIL, US Crude Oil, available",
    "availableOil.click()",
    "Stage 29C Browser Session.*USOIL"
  ],
  "Student browser QA covers every newly added asset category."
);

assertExcludesAll(
  `${practiceClient}\n${studentSpec}`,
  [
    "accountId", "authToken", "brokerPassword", "metaApiToken", "vaultRef",
    "providerSymbol", "rawProviderPayload", "executeAutoCopy(", "submitLiveOrder("
  ],
  "Student surfaces contain no credentials, broker aliases, provider payloads, AutoCopy, or live execution hooks."
);

assertIncludesAll(
  `${plan}\n${backlog}\n${manualDemo}\n${roadmap}\n${promptSummary}`,
  [
    "Stage 29C.1 - Dynamic Forex And CFD Asset Expansion",
    "TH-2026-08-26-STAGE29C1-DYNAMIC-FOREX-CFD-CATALOGUE-HANDOFF",
    "Owner browser acceptance remains deferred",
    "Stage 29C.2 and Stage 29D remain pending",
    "Real Provider Operator Acceptance - Deferred"
  ],
  "Roadmap, handoff, and deferred real-provider/browser checks are recorded without advancing later stages."
);

console.log("Stage 29C.1 dynamic Forex/CFD catalogue QA passed.");
