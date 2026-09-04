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
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const overviewClient = read("src/components/student-app/student-practice-client.tsx");
const journalLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const journalUi = read("src/components/student-app/student-journal-client.tsx");
const cryptoTypes = read("src/types/crypto-execution.ts");
const finishRoute = read("src/app/api/student/practice/sessions/[sessionId]/finish/route.ts");
const reflectionRoute = read("src/app/api/student/practice/sessions/[sessionId]/reflection/route.ts");
const rules = read("firestore.rules");

const practiceModules = [
  practiceTypes,
  practiceRepo,
  replayClient,
  overviewClient,
  journalLedger,
  journalUi,
  finishRoute,
  reflectionRoute
].join("\n");

assert(
  packageJson.scripts?.["stage17g:qa"] === "node scripts/qa-stage17g-completed-practice-session-review.mjs",
  "package.json exposes npm run stage17g:qa."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeSessionReflection",
    "PracticeCompletedSessionReview",
    "whatWentWell",
    "whatWentWrong",
    "improveNextTime",
    "confidenceScore",
    "PracticeSessionFinishMutationResponse",
    "PracticeSessionReflectionMutationResponse",
    "completedSessionReviews",
    "completedReview?: PracticeCompletedSessionReview",
    "reflection?: PracticeSessionReflection"
  ],
  "Practice types include completed-session review and bounded reflection surfaces."
);

assertIncludesAll(
  practiceRepo,
  [
    "finishStudentPracticeSession",
    "updateStudentPracticeSessionReflection",
    "buildCompletedSessionReview",
    "normalizeReflectionPayload",
    "normalizeReflectionText",
    "practice_session_finish_open_orders",
    "practice_reflection_session_not_completed",
    "session.status === \"completed\" || session.status === \"abandoned\"",
    "Completed or abandoned practice sessions cannot be advanced.",
    "assertPracticeSessionMutable(session)",
    "requestedIndex",
    "currentCandleIndex",
    "orders.filter((order) => order.status === \"open\" || order.status === \"pending\" || order.status === \"draft\")",
    "candlesResult.candles.slice(0, session.currentCandleIndex + 1)"
  ],
  "Repository implements finish/reflection, locks completed sessions, rejects unresolved orders, and preserves reveal-bounded evaluation."
);

assertIncludesAll(
  finishRoute,
  ["requireStudent", "finishStudentPracticeSession", "export async function POST", "apiJson", "apiError"],
  "Finish route requires signed-in student ownership boundary."
);

assertIncludesAll(
  reflectionRoute,
  ["requireStudent", "updateStudentPracticeSessionReflection", "export async function PATCH", "request.json", "apiJson", "apiError"],
  "Reflection route requires signed-in student ownership boundary."
);

assertIncludesAll(
  replayClient,
  [
    "Finish session",
    "Completed session review",
    "Session reflection",
    "whatWentWell",
    "whatWentWrong",
    "improveNextTime",
    "confidenceScore",
    "isSessionCompleted",
    "isSessionLocked",
    "unresolvedOrders",
    "Candle reveal is locked",
    "Completed sessions are review-only",
    "No playbook",
    "Manual close",
    "Close partial",
    "Cancel pending",
    "Save SL/TP",
    "No closed trades yet",
    "No playbook has closed trades in this replay yet."
  ],
  "Replay UX exposes completion/review/reflection states and moves primary order actions higher."
);

assertIncludesAll(
  overviewClient,
  [
    "completedSessionReviews",
    "Review: final",
    "Reflection:",
    "Reflection pending",
    "confidence"
  ],
  "Practice overview session cards show completed review and reflection summaries."
);

assertIncludesAll(
  `${journalLedger}\n${journalUi}\n${cryptoTypes}`,
  [
    "latestCompletedReflection",
    "practice_sessions",
    "completedAt",
    "Latest completed-session reflection",
    "Practice/backtesting",
    "PracticeSessionReflection"
  ],
  "Journal shows latest completed-session reflection under Practice/backtesting."
);

assertIncludesAll(
  rules,
  [
    "historical_candle_cache",
    "practice_sessions",
    "practice_orders",
    "playbooks",
    "allow read, write: if false;"
  ],
  "Firestore browser rules still deny direct practice cache/session/order/playbook writes."
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
  "Stage 17G practice review modules do not import or call AutoCopy/live execution adapters."
);

assert(
  !practiceModules.includes("apiSecret") &&
    !practiceModules.includes("brokerPassword") &&
    !practiceModules.includes("metaApiToken") &&
    !practiceModules.includes("credentialRefPath") &&
    !practiceModules.includes("rawProviderPayload") &&
    !practiceModules.includes("vaultRef") &&
    !practiceModules.includes("accountId"),
  "Stage 17G practice review modules do not expose secrets, account IDs, vault refs, or raw provider payloads."
);

console.log("Stage 17G completed practice session review QA passed.");
