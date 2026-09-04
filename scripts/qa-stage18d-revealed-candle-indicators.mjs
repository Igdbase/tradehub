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
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const terminalPage = read("src/app/(student)/app/practice/[sessionId]/terminal/page.tsx");
const oldReplayPage = read("src/app/(student)/app/practice/[sessionId]/page.tsx");
const rules = read("firestore.rules");

const terminalModules = [
  terminalClient,
  terminalPage
].join("\n");

assert(
  packageJson.scripts?.["stage18d:qa"] === "node scripts/qa-stage18d-revealed-candle-indicators.mjs",
  "package.json exposes npm run stage18d:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18D - Indicators And Revealed-Candle Overlays",
    "Compute indicators only from revealed candles",
    "Do not compute using the full hidden candle range.",
    "Do not add paid data providers or external indicator services."
  ],
  "plan.md documents the Stage 18D revealed-candle-only indicator boundary."
);

assertIncludesAll(
  terminalClient,
  [
    "TerminalIndicatorSettings",
    "computePracticeTerminalIndicators",
    "revealedCandlesOnly: NormalizedCandle[]",
    "computeSimpleMovingAverage",
    "computeExponentialMovingAverage",
    "computeRelativeStrengthIndex",
    "computeAverageTrueRange",
    "volumeMa",
    "hasVolume"
  ],
  "Terminal implements SMA, EMA, RSI, ATR, and Volume MA helpers."
);

assertIncludesAll(
  terminalClient,
  [
    "const revealedCandlesOnly = useMemo(() => revealed?.candles ?? [], [revealed?.candles])",
    "computePracticeTerminalIndicators(revealedCandlesOnly, indicatorSettings)",
    "Indicators are computed client-side from revealed candles only. Hidden future candles are never used.",
    "revealed?.candles ?? []"
  ],
  "Indicators are computed only from the protected revealed candle response."
);

assert(
  !terminalClient.includes("availableCandleCount.map") &&
    !terminalClient.includes("candlesResult") &&
    !terminalClient.includes("fetchSessionCandles") &&
    !terminalClient.includes("historical_candle_cache") &&
    !terminalClient.includes("/api/student/practice/candles") &&
    !terminalClient.includes("rangeStart") &&
    !terminalClient.includes("rangeEnd"),
  "Terminal indicator calculations do not use hidden/full candle arrays or historical cache APIs."
);

assertIncludesAll(
  terminalClient,
  [
    "Indicators",
    "isIndicatorPanelOpen",
    "SMA",
    "EMA",
    "RSI",
    "ATR",
    "Vol MA",
    "SMA ${indicatorSettings.smaPeriod}",
    "EMA ${indicatorSettings.emaPeriod}",
    "RSI ${indicatorSettings.rsiPeriod}",
    "ATR ${indicatorSettings.atrPeriod}",
    "Vol ${indicatorSettings.volumeMaPeriod}",
    "localStorage.setItem",
    "tradehub.practiceTerminal.indicators.${sessionId}"
  ],
  "Terminal exposes compact indicator controls, active summaries, and per-session setting persistence."
);

assertIncludesAll(
  terminalClient,
  [
    "LineSeries",
    "smaSeriesRef",
    "emaSeriesRef",
    "indicators.sma.map",
    "indicators.ema.map"
  ],
  "SMA/EMA chart overlays are rendered through lightweight chart line series."
);

assertIncludesAll(
  terminalClient,
  [
    "Reveal more candles",
    "No volume",
    "indicator.points <= 0",
    "latestRsi === undefined ? \"Reveal more\"",
    "latestAtr === undefined ? \"Reveal more\""
  ],
  "Too-few-candles and missing-volume states are safe and explicit."
);

assert(
  terminalClient.includes("order.status === \"pending\" ? (") &&
    terminalClient.includes("Cancel pending") &&
    terminalClient.includes("order.status === \"open\" ? (") &&
    terminalClient.includes("Manual close") &&
    terminalClient.includes("Save SL/TP") &&
    terminalClient.includes("Close partial") &&
    terminalClient.includes("order.status === \"closed\" ? (") &&
    terminalClient.includes("Read-only outcome"),
  "Terminal order cards hide mutation actions for closed orders and show status-appropriate actions only."
);

assertIncludesAll(
  terminalPage,
  ["StudentPracticeTerminalClient", "Practice Terminal", "sessionId"],
  "Terminal route still exists."
);

assertIncludesAll(
  oldReplayPage,
  ["StudentPracticeReplayClient", "Practice Replay", "sessionId"],
  "Existing old replay route still works."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "practice_drawings",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for protected practice paths."
);

assert(
  !terminalModules.includes("getForexDemoOrderPlacementAdapter") &&
    !terminalModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !terminalModules.includes("getExchangeOrderAdapter") &&
    !terminalModules.includes("submitOrder(") &&
    !terminalModules.includes("private Binance") &&
    !terminalModules.includes("private Bybit") &&
    !terminalModules.includes("metaApiToken") &&
    !terminalModules.includes("brokerPassword") &&
    !terminalModules.includes("accountId") &&
    !terminalModules.includes("vaultRef") &&
    !terminalModules.includes("rawProviderPayload") &&
    !terminalModules.includes("AutoCopy"),
  "Stage 18D terminal modules do not add forbidden execution/provider/private exchange/MetaAPI credential code."
);

assert(
  !terminalModules.includes("screenshotUrls:") &&
    !terminalModules.includes("pdf") &&
    !terminalModules.includes("upload") &&
    !terminalModules.includes("paid storage") &&
    !terminalModules.includes("WhatsApp") &&
    !terminalModules.includes("SMS"),
  "Stage 18D indicators do not add screenshots, PDFs, uploads, paid storage, or messaging integrations."
);

console.log("Stage 18D revealed-candle indicator QA passed.");
