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
const analytics = read("src/lib/practice/practice-performance-analytics.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const overviewClient = read("src/components/student-app/student-practice-client.tsx");
const journalLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const journalUi = read("src/components/student-app/student-journal-client.tsx");
const assumptionsRoute = read("src/app/api/student/practice/sessions/[sessionId]/assumptions/route.ts");
const rules = read("firestore.rules");
const practiceModules = [
  practiceTypes,
  analytics,
  practiceRepo,
  replayClient,
  overviewClient,
  journalLedger,
  journalUi,
  assumptionsRoute
].join("\n");

assert(
  packageJson.scripts?.["stage17e:qa"] === "node scripts/qa-stage17e-practice-performance-analytics.mjs",
  "package.json exposes npm run stage17e:qa."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticePerformanceAssumptions",
    "PracticePerformanceSummary",
    "startingBalance",
    "endingBalance",
    "netPnl",
    "winRate",
    "lossRate",
    "totalTrades",
    "openTrades",
    "closedTrades",
    "averageR",
    "bestTrade",
    "worstTrade",
    "maxDrawdown",
    "profitFactor",
    "expectancy",
    "feeBps?: number",
    "spreadBps?: number",
    "slippageBps?: number",
    "PracticeSessionAssumptionsMutationResponse"
  ],
  "Practice analytics and assumption types include all Stage 17E fields."
);

assertIncludesAll(
  analytics,
  [
    "import \"server-only\"",
    "computePracticePerformanceSummary",
    "normalizePracticePerformanceAssumptions",
    "order.status === \"closed\"",
    "openTrades",
    "costForOrder",
    "assumptions.feeBps + assumptions.spreadBps + assumptions.slippageBps",
    "endingBalance",
    "maxDrawdown",
    "profitFactor",
    "expectancy",
    "Practice analytics are computed server-side from student-owned simulated orders only."
  ],
  "Server-only analytics helper computes closed-order summary, assumptions, costs, drawdown, profit factor, and expectancy."
);

assert(
  !analytics.includes("fetch(") &&
    !analytics.includes("MetaAPI") &&
    !analytics.includes("Binance") &&
    !analytics.includes("Bybit"),
  "Practice analytics helper never calls broker/exchange/provider APIs."
);

assertIncludesAll(
  practiceRepo,
  [
    "computePracticePerformanceSummary",
    "sessionPerformance",
    "orders.filter((order) => order.sessionId === session.sessionId)",
    "performance: computePracticePerformanceSummary",
    "updateStudentPracticeSessionAssumptions",
    "normalizeAssumptionBps",
    "Practice fee/spread/slippage assumptions affect simulated analytics only and never call external providers.",
    "candlesResult.candles.slice(0, session.currentCandleIndex + 1)"
  ],
  "Repository derives summaries from owned practice orders and keeps order evaluation reveal-bounded."
);

assertIncludesAll(
  assumptionsRoute,
  ["requireStudent", "updateStudentPracticeSessionAssumptions", "apiJson", "apiError", "export async function PATCH"],
  "Practice assumption update route is protected by signed-in student auth."
);

assertIncludesAll(
  replayClient,
  [
    "Performance analytics",
    "Start balance",
    "End balance",
    "Net P&L",
    "Win rate",
    "Loss rate",
    "Max DD",
    "Profit factor",
    "Expectancy",
    "Fee bps",
    "Spread bps",
    "Slippage bps",
    "Save assumptions",
    "/assumptions"
  ],
  "Replay page renders full server-computed analytics and editable practice assumptions."
);
assertIncludesAll(
  overviewClient,
  ["sessionPerformance", "Net P&L", "Win", "DD"],
  "Practice overview session cards show compact analytics."
);
assertIncludesAll(
  `${journalLedger}\n${journalUi}`,
  [
    "practice_backtest",
    "partialCloseCount",
    "fullCloseCount",
    "averageR",
    "winRate",
    "Practice win",
    "Avg R",
    "Practice/backtesting"
  ],
  "Journal shows compact practice analytics separately from AutoCopy."
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
  "Stage 17E practice analytics modules do not import or call AutoCopy/live execution adapters."
);
assert(
  !practiceModules.includes("apiSecret") &&
    !practiceModules.includes("brokerPassword") &&
    !practiceModules.includes("metaApiToken") &&
    !practiceModules.includes("credentialRefPath") &&
    !practiceModules.includes("rawProviderPayload") &&
    !practiceModules.includes("vaultRef"),
  "Stage 17E practice analytics modules do not expose secrets, vault refs, raw provider payloads, or MetaAPI credentials."
);

assertIncludesAll(
  rules,
  [
    "historical_candle_cache",
    "practice_sessions",
    "practice_orders",
    "allow read, write: if false;"
  ],
  "Firestore browser rules still deny direct practice summary/order/session/cache writes."
);

console.log("Stage 17E practice performance analytics QA passed.");
