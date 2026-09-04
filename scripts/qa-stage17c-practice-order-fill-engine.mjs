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
const fillEngine = read("src/lib/practice/practice-fill-engine.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const ledger = read("src/lib/journal/account-linked-performance-ledger.ts");
const journalUi = read("src/components/student-app/student-journal-client.tsx");
const orderRoute = read("src/app/api/student/practice/sessions/[sessionId]/orders/route.ts");
const evaluateRoute = read("src/app/api/student/practice/sessions/[sessionId]/orders/evaluate/route.ts");
const cancelRoute = read("src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/cancel/route.ts");
const closeRoute = read("src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/close/route.ts");
const rules = read("firestore.rules");
const practiceModules = [
  practiceTypes,
  fillEngine,
  practiceRepo,
  replayClient,
  orderRoute,
  evaluateRoute,
  cancelRoute,
  closeRoute,
  ledger,
  journalUi
].join("\n");

assert(
  packageJson.scripts?.["stage17c:qa"] === "node scripts/qa-stage17c-practice-order-fill-engine.mjs",
  "package.json exposes npm run stage17c:qa."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeOrderStatus",
    "\"pending\"",
    "\"open\"",
    "\"closed\"",
    "\"cancelled\"",
    "\"rejected\"",
    "PracticeOrderType = \"market\" | \"limit\" | \"stop\"",
    "notional?: number",
    "riskAmount?: number",
    "evaluatedThroughCandleIndex?: number",
    "safeMessage?: string",
    "PracticeSessionOrdersResponse",
    "PracticeOrderEvaluationResponse"
  ],
  "Stage 17C simulated order lifecycle types exist."
);

assertIncludesAll(
  fillEngine,
  [
    "import \"server-only\"",
    "calculatePracticeRiskSizing",
    "riskAmount = input.startingBalance * input.riskPct / 100",
    "stopDistance = Math.abs(input.entryPrice - input.stopLoss)",
    "size = riskAmount / stopDistance",
    "notional = size * input.entryPrice",
    "validateDirectionalPracticeLevels",
    "input.stopLoss < input.entryPrice && input.entryPrice < input.takeProfit",
    "input.takeProfit < input.entryPrice && input.entryPrice < input.stopLoss",
    "MAX_PRACTICE_NOTIONAL",
    "MAX_PRACTICE_SIZE",
    "TODO InstrumentSpec"
  ],
  "Risk sizing helper exists and validates directional SL/TP with bounded finite size/notional."
);

assertIncludesAll(
  fillEngine,
  [
    "marketOrderFillPriceFromLatestRevealedCandle",
    "latest revealed candle close",
    "order.orderType === \"limit\" && order.direction === \"buy\"",
    "candle.low <= order.requestedPrice",
    "order.orderType === \"limit\" && order.direction === \"sell\"",
    "candle.high >= order.requestedPrice",
    "order.orderType === \"stop\" && order.direction === \"buy\"",
    "order.orderType === \"stop\" && order.direction === \"sell\""
  ],
  "Market, limit, and stop simulated fill rules exist."
);

assertIncludesAll(
  fillEngine,
  [
    "buy",
    "candle.high >= order.takeProfit",
    "candle.low <= order.stopLoss",
    "sell",
    "candle.low <= order.takeProfit",
    "candle.high >= order.stopLoss",
    "Same-candle SL/TP conflict is intentionally conservative: stop loss wins.",
    "TODO Stage 17D/17E"
  ],
  "Buy/sell TP/SL close rules exist with conservative SL-first same-candle fallback."
);

assertIncludesAll(
  fillEngine,
  [
    "evaluatePracticeOrderAgainstRevealedCandles",
    "revealedCandles",
    "currentCandleIndex",
    "for (let candleIndex = startIndex; candleIndex <= input.currentCandleIndex",
    "input.revealedCandles[candleIndex]"
  ],
  "Fill evaluation uses only revealed candles through currentCandleIndex."
);

assertIncludesAll(
  practiceRepo,
  [
    "getPracticeSessionSnapshot",
    "assertPracticeSessionMutable",
    "workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_orders",
    "createStudentPracticeOrder",
    "listStudentPracticeSessionOrders",
    "cancelStudentPracticeOrder",
    "manuallyCloseStudentPracticeOrder",
    "evaluateStudentPracticeSessionOrders",
    "candlesResult.candles.slice(0, session.currentCandleIndex + 1)",
    "writePracticeLedgerIfClosed",
    "Practice orders are simulated only; no broker, exchange, AutoCopy, or live execution adapter is called."
  ],
  "Repository enforces ownership/session mutability and exposes simulated order create/list/cancel/close/evaluate helpers."
);

for (const route of [orderRoute, evaluateRoute, cancelRoute, closeRoute]) {
  assertIncludesAll(
    route,
    ["requireStudent", "apiJson", "apiError"],
    "Simulated practice order route requires signed-in student auth."
  );
}
assertIncludesAll(
  `${orderRoute}\n${evaluateRoute}\n${cancelRoute}\n${closeRoute}`,
  [
    "createStudentPracticeOrder",
    "listStudentPracticeSessionOrders",
    "evaluateStudentPracticeSessionOrders",
    "cancelStudentPracticeOrder",
    "manuallyCloseStudentPracticeOrder"
  ],
  "Create/list/evaluate/cancel/manual-close routes exist."
);

assertIncludesAll(
  replayClient,
  [
    "Submit simulated order",
    "Market",
    "Limit",
    "Stop",
    "Direction",
    "Stop loss",
    "Take profit",
    "estimatedRiskAmount",
    "estimatedSize",
    "estimatedNotional",
    "/orders/evaluate",
    "/orders/${encodeURIComponent(orderId)}/cancel",
    "/orders/${encodeURIComponent(orderId)}/close",
    "Manual close",
    "Practice orders"
  ],
  "Replay UI enables simulated order tools, sizing preview, and order status actions."
);
assert(
  !replayClient.includes("disabled variant=\"secondary\">Market order") &&
    !replayClient.includes("fill simulation arrive in the next stage"),
  "Stage 17C replay UI no longer leaves order tools disabled as placeholders."
);

assertIncludesAll(
  ledger,
  [
    "mapPracticeBacktestOrderToLedgerEntry",
    "source: \"practice_backtest\"",
    "executionMode: \"practice\"",
    "safeBrokerOrExchangeLabel: \"Practice backtesting\"",
    "maskedConnectionRef: \"practice_simulated\""
  ],
  "Closed practice orders map to support-safe practice_backtest ledger entries."
);
assertIncludesAll(
  `${ledger}\n${journalUi}`,
  [
    "Practice/backtesting activity is shown separately from AutoCopy.",
    "performance.practice.totalLedgerItems",
    "Practice trades",
    "Practice P&L"
  ],
  "Student journal shows practice/backtesting activity separately from AutoCopy."
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
  "Practice order modules do not import or call AutoCopy/live execution adapters."
);
assert(
  !practiceModules.includes("apiSecret") &&
    !practiceModules.includes("brokerPassword") &&
    !practiceModules.includes("metaApiToken") &&
    !practiceModules.includes("credentialRefPath") &&
    !practiceModules.includes("rawProviderPayload") &&
    !practiceModules.includes("raw external account"),
  "Practice order modules do not expose secrets, vault refs, raw provider payloads, or account IDs."
);

assertIncludesAll(
  rules,
  [
    "practice_orders",
    "allow read, write: if false;"
  ],
  "Firestore practice order paths remain client-denied."
);

console.log("Stage 17C practice order placement/fill engine QA passed.");
