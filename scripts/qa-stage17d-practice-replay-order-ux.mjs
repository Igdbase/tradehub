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
const levelsRoute = read("src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/levels/route.ts");
const partialRoute = read("src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/partial-close/route.ts");
const rules = read("firestore.rules");
const practiceModules = [
  practiceTypes,
  fillEngine,
  practiceRepo,
  replayClient,
  ledger,
  journalUi,
  levelsRoute,
  partialRoute
].join("\n");
// The journal client also hosts the Journal Sync exchange-connection form (students submit their
// own read-only API key/secret), so the secret-scan below covers the practice modules only.
const practiceModulesForSecretScan = [
  practiceTypes,
  fillEngine,
  practiceRepo,
  replayClient,
  ledger,
  levelsRoute,
  partialRoute
].join("\n");

assert(
  packageJson.scripts?.["stage17d:qa"] === "node scripts/qa-stage17d-practice-replay-order-ux.mjs",
  "package.json exposes npm run stage17d:qa."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeOrderCloseEvent",
    "PracticeOrderCloseEventType",
    "\"partial_close\"",
    "\"full_close\"",
    "remainingSize?: number",
    "closedSize?: number",
    "closeEvents?: PracticeOrderCloseEvent[]"
  ],
  "Practice order model supports close events, remaining size, and partial/full labels."
);

assertIncludesAll(
  fillEngine,
  [
    "buildPracticeCloseEvent",
    "eventType: \"partial_close\" | \"full_close\"",
    "remainingSize",
    "closedSize",
    "pnlForPracticeOrder",
    "Same-candle SL/TP conflict is intentionally conservative: stop loss wins.",
    "input.revealedCandles[candleIndex]"
  ],
  "Fill engine builds support-safe close events and remains forward-bias-safe."
);

assertIncludesAll(
  practiceRepo,
  [
    "updateStudentPracticeOrderLevels",
    "partiallyCloseStudentPracticeOrder",
    "validateDirectionalPracticeLevels",
    "order.status !== \"open\" && order.status !== \"pending\"",
    "closeSize < minimumCloseSize || closeSize >= remainingSize",
    "Partial close quantity must meet this instrument's minimum and quantity step, and remain below the open quantity.",
    "candlesResult.candles.slice(0, session.currentCandleIndex + 1)",
    "writePracticeCloseEventLedger",
    "mapPracticeBacktestCloseEventToLedgerEntry"
  ],
  "Repository validates SL/TP edits, partial close size, ownership, and revealed-candle-only close pricing."
);

for (const route of [levelsRoute, partialRoute]) {
  assertIncludesAll(
    route,
    ["requireStudent", "apiJson", "apiError"],
    "Stage 17D order UX route requires signed-in student auth."
  );
}
assertIncludesAll(
  `${levelsRoute}\n${partialRoute}`,
  ["updateStudentPracticeOrderLevels", "partiallyCloseStudentPracticeOrder", "export async function PATCH", "export async function POST"],
  "SL/TP edit and partial close routes exist."
);

assertIncludesAll(
  replayClient,
  [
    "orders.slice(0, 5).map",
    "Entry {formatReplayPrice(order.filledPrice ?? order.requestedPrice, order.instrument)}",
    "Save SL/TP",
    "Close partial",
    "Close %",
    "Or quantity",
    "Remaining",
    "Partial close",
    "Full close",
    "[grid-template-columns:repeat(auto-fit,minmax(min(100%,8rem),1fr))]",
    "Reveal at least one candle before submitting simulated orders."
  ],
  "Replay UI shows chart tickets, editable SL/TP, partial close controls, remaining size, and empty/disabled states."
);

assertIncludesAll(
  ledger,
  [
    "mapPracticeBacktestCloseEventToLedgerEntry",
    "Practice backtesting partial close",
    "Practice backtesting full close",
    "source: \"practice_backtest\"",
    "executionMode: \"practice\"",
    "maskedConnectionRef: \"practice_simulated\""
  ],
  "Partial/full practice close events write support-safe practice_backtest ledger entries."
);
assertIncludesAll(
  journalUi,
  [
    "value=\"partial\">Partial",
    "value=\"closed\">Closed",
    "/api/student/practice/analytics",
    "\"backtesting\", \"Backtesting\""
  ],
  "Journal shows practice/backtesting entries with partial/full close labels."
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
  "Stage 17D practice modules do not import or call AutoCopy/live execution adapters."
);
assert(
  !practiceModulesForSecretScan.includes("apiSecret") &&
    !practiceModulesForSecretScan.includes("brokerPassword") &&
    !practiceModulesForSecretScan.includes("metaApiToken") &&
    !practiceModulesForSecretScan.includes("credentialRefPath") &&
    !practiceModulesForSecretScan.includes("rawProviderPayload") &&
    !practiceModulesForSecretScan.includes("accountId"),
  "Stage 17D practice modules do not expose secrets, vault refs, raw provider payloads, or account IDs."
);

assertIncludesAll(
  rules,
  [
    "historical_candle_cache",
    "practice_sessions",
    "practice_orders",
    "allow read, write: if false;"
  ],
  "Firestore browser rules still deny direct practice session/order/cache access."
);

console.log("Stage 17D richer practice replay order UX QA passed.");
