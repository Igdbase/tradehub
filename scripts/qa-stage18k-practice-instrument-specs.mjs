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
const practiceTypes = read("src/types/practice.ts");
const instrumentSpecs = read("src/lib/practice/practice-instrument-specs.ts");
const fillEngine = read("src/lib/practice/practice-fill-engine.ts");
const analytics = read("src/lib/practice/practice-performance-analytics.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const journalClient = read("src/components/student-app/student-journal-client.tsx");
const ledger = read("src/lib/journal/account-linked-performance-ledger.ts");
const rules = read("firestore.rules");

const stage18kModules = [
  instrumentSpecs,
  fillEngine,
  analytics,
  practiceRepo,
  terminalClient,
  replayClient,
  practiceClient,
  journalClient,
  ledger
].join("\n");

assert(
  packageJson.scripts?.["stage18k:qa"] === "node scripts/qa-stage18k-practice-instrument-specs.mjs",
  "package.json exposes npm run stage18k:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18K - Practice Instrument Specs And Sizing Accuracy",
    "safe practice-only instrument spec abstraction",
    "BTCUSDT, ETHUSDT, XAUUSD, and major Forex pairs",
    "Server remains the source of truth for simulated sizing and lifecycle."
  ],
  "plan.md documents Stage 18K practice instrument specs and server authority."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeInstrumentSpecSummary",
    "PracticeInstrumentCategory",
    "instrument?: PracticeInstrumentSpecSummary",
    "stopDistanceInPips?: number",
    "notional?: number"
  ],
  "Practice types carry safe instrument summaries on orders and close events."
);

assertIncludesAll(
  instrumentSpecs,
  [
    "PRACTICE_INSTRUMENT_SPECS",
    "\"BTCUSDT\"",
    "\"ETHUSDT\"",
    "\"XAUUSD\"",
    "\"EURUSD\"",
    "\"GBPUSD\"",
    "\"USDJPY\"",
    "\"USDCHF\"",
    "\"USDCAD\"",
    "\"AUDUSD\"",
    "\"NZDUSD\"",
    "pricePrecision",
    "quantityPrecision",
    "quantityLabel",
    "pipSize",
    "pipLabel",
    "contractMultiplier",
    "minSimulatedSize",
    "maxSimulatedNotional",
    "Practice instrument specs are bounded simulation estimates"
  ],
  "Instrument spec helper includes safe metadata for crypto, XAUUSD, and Forex majors."
);

assertIncludesAll(
  fillEngine,
  [
    "getPracticeInstrumentSpec",
    "practiceNotionalForInstrument",
    "practicePnlForInstrument",
    "practicePipDistance",
    "roundPracticeQuantity",
    "riskAmount / (stopDistance * instrument.contractMultiplier)",
    "stopDistanceInPips",
    "instrument: sizing.instrument",
    "riskAmountForPracticeQuantity"
  ],
  "Fill engine uses instrument-aware server-side sizing, P&L, notional, and pip/tick distance."
);

assert(
  !fillEngine.includes("TODO InstrumentSpec") &&
    !fillEngine.includes("const notional = size * input.entryPrice") &&
    !fillEngine.includes("(input.exitPrice - input.entryPrice) * input.size"),
  "Fill engine no longer uses the old raw crypto-style sizing/P&L shortcut."
);

assertIncludesAll(
  practiceRepo,
  [
    "instrument: sizing.instrument",
    "stopDistance: sizing.stopDistance",
    "stopDistanceInPips: sizing.stopDistanceInPips",
    "riskAmountForPracticeQuantity",
    "mapInstrumentSpec",
    "instrumentDisplayName",
    "quantityLabel",
    "pipTickLabel",
    "closedTradeExportHeaders"
  ],
  "Practice repository stores safe instrument snapshots and exports instrument-aware columns."
);

assertIncludesAll(
  terminalClient,
  [
    "getPracticeInstrumentSpec",
    "formatPracticePrice",
    "formatPracticeQuantity",
    "practiceNotionalForInstrument",
    "practicePipDistance",
    "instrumentSpec.contractMultiplier",
    "Practice estimates use TradeHub instrument specs and may differ by broker.",
    "quantityLabel",
    "stopDistanceInPips"
  ],
  "Practice terminal previews and order cards show instrument-aware price, size, notional, and pip/tick labels."
);

assertIncludesAll(
  replayClient,
  [
    "getPracticeInstrumentSpec",
    "formatPracticePrice",
    "formatPracticeQuantity",
    "practiceNotionalForInstrument",
    "practicePipDistance",
    "instrumentSpec.contractMultiplier",
    "Estimates may differ by broker",
    "stopDistanceInPips"
  ],
  "Old replay route remains instrument-aware without changing protected practice routes."
);

assertIncludesAll(
  practiceClient,
  [
    "formatPracticePrice",
    "formatPracticeQuantity",
    "Practice spec:",
    "broker estimates may differ"
  ],
  "/app/practice overview shows compact safe practice instrument metadata."
);

assertIncludesAll(
  journalClient,
  [
    "formatPracticeQuantity",
    "getPracticeInstrumentSpec",
    "Practice backtesting",
    "Volume"
  ],
  "Journal practice summaries can format volume with safe instrument specs while staying separate from AutoCopy."
);

assertIncludesAll(
  ledger,
  [
    "practiceNotionalForInstrument",
    "input.event.notional",
    "practice_backtest",
    "practice_simulated"
  ],
  "Practice ledger close events use instrument-aware notional summaries."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18K Practice Instrument Specs And Sizing Accuracy",
    "BTCUSDT simulated order still sizes and closes correctly.",
    "XAUUSD static demo session shows gold/CFD-friendly precision, lots, ticks, notional, and P&L display.",
    "EURUSD and USDJPY sessions show Forex-friendly lots and pip/tick display.",
    "Export/journal remain safe and do not expose hidden candles, provider internals"
  ],
  "manual-test-backlog.md records Stage 18K manual QA."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "historical_candle_cache",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for protected practice paths."
);

assert(
  !stage18kModules.includes("getForexDemoOrderPlacementAdapter") &&
    !stage18kModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !stage18kModules.includes("getExchangeOrderAdapter") &&
    !stage18kModules.includes("submitOrder(") &&
    !stage18kModules.includes("postTrade(") &&
    !stage18kModules.includes("private Binance") &&
    !stage18kModules.includes("private Bybit") &&
    !stage18kModules.includes("brokerPassword") &&
    !stage18kModules.includes("metaApiToken") &&
    !stage18kModules.includes("vaultRef") &&
    !stage18kModules.includes("rawProviderPayload") &&
    !stage18kModules.includes("accountId"),
  "Stage 18K does not add forbidden execution/provider/private exchange/MetaAPI credential code."
);

console.log("Stage 18K practice instrument specs and sizing accuracy QA passed.");
