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
const practiceTypes = read("src/types/practice.ts");
const challenge = read("src/lib/practice/practice-challenge.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const journalLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const journalUi = read("src/components/student-app/student-journal-client.tsx");
const rules = read("firestore.rules");

const stage18fModules = [
  practiceTypes,
  challenge,
  practiceRepo,
  practiceClient,
  terminalClient,
  replayClient,
  journalLedger,
  journalUi
].join("\n");
const stage18fNewSurfaces = [
  challenge,
  practiceClient,
  terminalClient,
  replayClient,
  journalLedger,
  journalUi
].join("\n");

assert(
  packageJson.scripts?.["stage18f:qa"] === "node scripts/qa-stage18f-practice-challenge-rules.mjs",
  "package.json exposes npm run stage18f:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18F - Practice Challenge Rules",
    "add optional prop-firm-style practice rules without connecting to funded accounts or live execution",
    "Evaluate rules from simulated practice orders only.",
    "Do not connect to real prop firms, brokers, MetaAPI live accounts, or AutoCopy."
  ],
  "plan.md documents the Stage 18F practice-only challenge boundary."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeChallengeConfig",
    "PracticeChallengeSummary",
    "PracticeChallengeStatus",
    "challenge?: PracticeChallengeConfig",
    "challengeResult?: PracticeChallengeSummary",
    "challengeStatus?: PracticeChallengeSummary",
    "sessionChallengeStatus: Record<string, PracticeChallengeSummary>"
  ],
  "Practice types include challenge config, status, result, overview, order, review, and detail surfaces."
);

assertIncludesAll(
  challenge,
  [
    "normalizePracticeChallengeConfig",
    "computePracticeChallengeStatus",
    "assertPracticeChallengeAllowsNewOrder",
    "profitTargetPercent, 10",
    "maxDailyLossPercent, 5",
    "maxTotalDrawdownPercent, 10",
    "safeNumber(record.maxOpenSimulatedTrades, 3)",
    "safeNumber(record.maxTradesPerSession, 20)",
    "Simulated practice challenge status is computed from student-owned practice orders only."
  ],
  "Server challenge helper has conservative defaults and simulated-order-only status calculation."
);

assertIncludesAll(
  challenge,
  [
    "order.status === \"open\" || order.status === \"pending\"",
    "order.status === \"closed\"",
    "practice_challenge_daily_loss_breached",
    "practice_challenge_drawdown_breached",
    "practice_challenge_open_trades_breached",
    "practice_challenge_trade_count_breached",
    "practice_challenge_daily_trade_count_breached"
  ],
  "Challenge evaluation derives breaches from simulated practice order statuses and P&L only."
);

assertIncludesAll(
  practiceRepo,
  [
    "normalizePracticeChallengeConfig(record.challenge, startingBalance)",
    "computePracticeChallengeStatus({ session, orders",
    "persistPracticeChallengeResultIfNeeded",
    "PRACTICE_CHALLENGE_ORDER_LIMIT = 250",
    "listChallengeOrdersForSession",
    "assertPracticeChallengeAllowsNewOrder",
    "practiceDay: latestRevealedCandle.closeTime.slice(0, 10)",
    "challengeResult: finalChallengeStatus",
    "challengeStatus: finalChallengeStatus"
  ],
  "Repository normalizes challenge setup, blocks unsafe new simulated orders, returns status, and preserves completed results."
);

assertIncludesAll(
  challenge,
  [
    "practice_challenge_max_open_trades",
    "practice_challenge_max_trades",
    "practice_challenge_max_daily_trades",
    "This simulated order would exceed the practice challenge open-trade limit.",
    "This simulated order would exceed the practice challenge session trade limit."
  ],
  "Server-side challenge rules block max-open and max-trade breaches before simulated order creation."
);

assertIncludesAll(
  practiceClient,
  [
    "Practice challenge",
    "challengeEnabled",
    "challengeStartingBalance",
    "challengeProfitTargetPercent: \"10\"",
    "challengeMaxDailyLossPercent: \"5\"",
    "challengeMaxTotalDrawdownPercent: \"10\"",
    "challengeMaxOpenTrades: \"3\"",
    "challengeMaxTradesPerSession: \"20\"",
    "Simulated challenge:"
  ],
  "/app/practice supports optional simulated challenge setup and overview status."
);

assertIncludesAll(
  terminalClient,
  [
    "const challengeStatus = detail?.challengeStatus",
    "challengeStatus.challengeName",
    "challengeStatus.status === \"passed\" ? \"green\"",
    "Daily loss",
    "Drawdown",
    "Open",
    "Trades",
    "challengeStatus.breachMessages",
    "Simulated challenge rules use practice orders only."
  ],
  "Terminal shows compact practice challenge status, limits, progress, and breaches."
);

assertIncludesAll(
  replayClient,
  [
    "detail.completedReview.challengeStatus",
    "Simulated challenge ·",
    "detail.completedReview.challengeStatus.currentEquity",
    "detail.completedReview.challengeStatus.breachCodes.length"
  ],
  "Completed session review includes final simulated challenge status."
);

assertIncludesAll(
  `${journalLedger}\n${journalUi}`,
  [
    "latestChallengeResult",
    "mapPracticeChallengeResult",
    "Latest simulated challenge",
    "performance.practice.latestChallengeResult.status",
    "Practice/backtesting"
  ],
  "Journal Practice/backtesting section surfaces a safe latest challenge summary."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "practice_bookmarks",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for protected practice paths."
);

assert(
  !stage18fModules.includes("getForexDemoOrderPlacementAdapter") &&
    !stage18fModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !stage18fModules.includes("getExchangeOrderAdapter") &&
    !stage18fModules.includes("private Binance") &&
    !stage18fModules.includes("private Bybit") &&
    !stage18fModules.includes("MetaAPI access token") &&
    !stage18fModules.includes("metaApiToken") &&
    !stage18fModules.includes("brokerPassword") &&
    !stage18fModules.includes("accountId") &&
    !stage18fModules.includes("vaultRef") &&
    !stage18fModules.includes("rawProviderPayload"),
  "Stage 18F modules do not add forbidden execution/provider/private exchange/MetaAPI credential code."
);

assert(
  !stage18fNewSurfaces.includes("screenshot") &&
    !stage18fNewSurfaces.includes("pdf") &&
    !stage18fNewSurfaces.includes("upload") &&
    !stage18fNewSurfaces.includes("paid storage") &&
    !stage18fNewSurfaces.includes("WhatsApp") &&
    !stage18fNewSurfaces.includes("SMS"),
  "Stage 18F does not add screenshots, PDFs, uploads, paid storage, or messaging integrations."
);

console.log("Stage 18F practice challenge QA passed.");
