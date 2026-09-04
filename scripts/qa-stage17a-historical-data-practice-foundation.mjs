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
const practiceTypes = read("src/types/practice.ts");
const historicalService = read("src/lib/practice/historical-data-service.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const playbookRoute = read("src/app/api/student/practice/playbooks/route.ts");
const sessionRoute = read("src/app/api/student/practice/sessions/route.ts");
const orderRoute = read("src/app/api/student/practice/orders/route.ts");
const candleRoute = read("src/app/api/student/practice/candles/route.ts");
const studentUi = read("src/components/student-app/student-practice-client.tsx");
const shell = read("src/components/student-app/student-shell.tsx");
const page = read("src/app/(student)/app/practice/page.tsx");
const rules = read("firestore.rules");

const practiceModules = `${historicalService}\n${practiceRepo}\n${playbookRoute}\n${sessionRoute}\n${orderRoute}\n${candleRoute}\n${studentUi}`;

assert(
  packageJson.scripts?.["stage17a:qa"] === "node scripts/qa-stage17a-historical-data-practice-foundation.mjs",
  "package.json exposes npm run stage17a:qa."
);

assertIncludesAll(
  historicalService,
  [
    "export type MarketDataProvider",
    "fetchCandles(input)",
    "supports(assetClass",
    "binancePublicCryptoProvider",
    "https://api.binance.com/api/v3/klines",
    "headers: { Accept: \"application/json\" }",
    "SUPPORTED_BINANCE_SYMBOLS",
    "BTCUSDT",
    "ETHUSDT",
    "normalizeBinanceKline",
    "metaApiMt5ForexProvider",
    "metaapi_utility_history_not_configured",
    "TradeHub will use a platform-owned utility MetaAPI account later, not student credentials."
  ],
  "MarketDataProvider interface, Binance public adapter, candle normalization, and MetaAPI fail-closed placeholder exist."
);
assert(
  !historicalService.includes("apiKey") &&
    !historicalService.includes("apiSecret") &&
    !historicalService.includes("brokerPassword") &&
    !historicalService.includes("student broker"),
  "Historical data service does not require Binance API keys or student broker credentials."
);
assertIncludesAll(
  historicalService,
  [
    "buildHistoricalCandleCacheKey",
    "input.provider",
    "input.assetClass",
    "input.symbol",
    "String(input.timeframeMinutes)",
    "input.rangeStart",
    "input.rangeEnd",
    "MAX_CANDLES_PER_REQUEST",
    "MAX_RANGE_MS",
    "validateRange",
    "validateCandleShape",
    "historical_candle_cache"
  ],
  "Cache key includes provider/assetClass/symbol/timeframe/range and candle fetches are bounded and normalized."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeSessionRecord",
    "PracticeOrderRecord",
    "PracticePlaybookRecord",
    "HistoricalCandleCacheRecord",
    "assetClass: PracticeAssetClass",
    "platformSource: PracticePlatformSource",
    "currentCandleIndex",
    "autoBreakevenTrigger",
    "mfeR",
    "maeR"
  ],
  "Practice session, order, playbook, and historical candle cache types exist."
);

assertIncludesAll(
  practiceRepo,
  [
    "import \"server-only\"",
    "getStudentPracticeOverview",
    "createStudentPracticePlaybook",
    "updateStudentPracticePlaybook",
    "createStudentPracticeSession",
    "createStudentPracticeOrder",
    "fetchStudentHistoricalCandles",
    "workspaces/${actor.workspaceId}/students/${actor.studentId}/playbooks",
    "workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_sessions",
    "workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders",
    "Practice sessions do not connect to live broker or exchange execution.",
    "no broker, exchange, AutoCopy, or live execution adapter is called"
  ],
  "Practice repository is server-only, student-scoped, and explicitly separate from live execution."
);

assertIncludesAll(
  playbookRoute,
  ["export async function GET", "export async function POST", "export async function PATCH", "updateStudentPracticePlaybook"],
  "Student playbook API supports create, list, and update through the protected route."
);

for (const route of [playbookRoute, sessionRoute, orderRoute, candleRoute]) {
  assertIncludesAll(
    route,
    ["requireStudent", "apiJson", "apiError"],
    "Student practice API route requires signed-in student auth and returns API-safe responses."
  );
}

assertIncludesAll(
  rules,
  [
    "historical_candle_cache",
    "practice_sessions",
    "practice_orders",
    "playbooks",
    "allow read, write: if false;"
  ],
  "Firestore rules deny direct client access to protected practice/cache paths."
);

assertIncludesAll(
  `${studentUi}\n${shell}\n${page}`,
  [
    "active=\"practice\"",
    "Backtesting foundation",
    "Playbooks",
    "New practice session",
    "Fetch candles",
    "Create session",
    "overview page does not render chart replay",
    "not AutoCopy and not real trading",
    "/api/student/practice/candles",
    "/app/practice"
  ],
  "Student UI separates Backtesting/Practice from AutoCopy and provides non-chart foundation controls."
);
assert(
  !studentUi.includes("TradingView") &&
    !studentUi.includes("Lightweight") &&
    !studentUi.includes("<canvas") &&
    !studentUi.includes("createChart"),
  "Stage 17A does not render chart replay UI."
);

assert(
  !practiceModules.includes("getForexDemoOrderPlacementAdapter") &&
    !practiceModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !practiceModules.includes("getExchangeOrderAdapter") &&
    !practiceModules.includes("submitOrder(") &&
    !practiceModules.includes("crypto-live-production") &&
    !practiceModules.includes("crypto-live-sandbox") &&
    !practiceModules.includes("forex-demo-execution") &&
    !practiceModules.includes("forex-live-canary-execution"),
  "Backtesting modules do not import or call live/demo AutoCopy execution adapters."
);
assert(
  !practiceModules.includes("apiSecret") &&
    !practiceModules.includes("brokerPassword") &&
    !practiceModules.includes("metaApiToken") &&
    !practiceModules.includes("credentialRefPath") &&
    !practiceModules.includes("rawProviderPayload"),
  "Backtesting modules do not expose secrets, vault refs, or raw provider payloads."
);

console.log("Stage 17A historical data/practice foundation QA passed.");
