import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function assertExistsAll(paths, message) {
  const missing = paths.filter((entry) => !exists(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertIncludesAll(source, expected, message) {
  const missing = expected.filter((entry) => !source.includes(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertExcludesAll(source, forbidden, message) {
  const hits = forbidden.filter((entry) => source.includes(entry));
  assert(hits.length === 0, `${message}${hits.length ? ` Hits: ${hits.join(", ")}` : ""}`);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const firestoreRules = read("firestore.rules");

const manualTypes = read("src/types/manual-journal.ts");
const manualRepository = read("src/lib/journal/manual-trades-repository.ts");
const reviewRoute = read("src/app/api/student/journal/manual-trades/[tradeId]/review/route.ts");
const reviewPage = read("src/app/(student)/app/journal/trades/[tradeId]/page.tsx");
const reviewClient = read("src/components/student-app/student-manual-trade-review-client.tsx");
const journalClient = read("src/components/student-app/student-journal-client.tsx");
const stage21aQa = read("scripts/qa-stage21a-manual-journal-crud.mjs");

const reviewSurface = [
  manualTypes,
  manualRepository,
  reviewRoute,
  reviewPage,
  reviewClient,
  journalClient
].join("\n");

assert(
  packageJson.scripts?.["stage21b:qa"] === "node scripts/qa-stage21b-manual-trade-review-chart.mjs",
  "package.json exposes npm run stage21b:qa."
);

assertExistsAll(
  [
    "src/app/api/student/journal/manual-trades/[tradeId]/review/route.ts",
    "src/app/(student)/app/journal/trades/[tradeId]/page.tsx",
    "src/components/student-app/student-manual-trade-review-client.tsx",
    "scripts/qa-stage21b-manual-trade-review-chart.mjs"
  ],
  "Stage 21B manual trade review route, page, client, and QA files exist."
);

assertIncludesAll(
  manualTypes,
  [
    "ManualTradeReviewChartState",
    "ManualJournalTradeReviewResponse",
    "NormalizedCandle",
    "available: boolean",
    "safeMessage",
    "readOnly",
    "canEditReviewFields"
  ],
  "Manual journal types include safe review response and chart state."
);

assertIncludesAll(
  manualRepository,
  [
    "getStudentManualTradeReview",
    "getStudentManualTrade",
    "manualTradeCollection(actor)",
    "fetchHistoricalCandlesWithCache",
    "historicalDataLimits",
    "buildManualTradeReviewChart",
    "emptyReviewChartState",
    "Manual review chart failed closed without exposing provider payloads",
    "Archived manual trades are read-only"
  ],
  "Repository builds student-owned review responses and fail-closed chart data from approved practice history."
);

assert(
  !manualRepository.includes("payload.workspaceId") && !manualRepository.includes("payload.studentId"),
  "Review repository path does not trust browser-supplied workspaceId or studentId."
);

assertIncludesAll(
  reviewRoute,
  [
    "requireStudent(request)",
    "getStudentManualTradeReview",
    "context.params.tradeId"
  ],
  "Manual trade review API is protected by signed-in student auth."
);

assertIncludesAll(
  reviewPage + reviewClient,
  [
    "/app/journal/trades",
    "StudentManualTradeReviewClient",
    "ManualTradeReviewChart",
    "createChart",
    "CandlestickSeries",
    "createPriceLine",
    "Entry",
    "Exit",
    "SL",
    "TP",
    "No review candles available",
    "Open trade has no exit yet",
    "Archived read-only",
    "Save review fields",
    "/api/student/journal/manual-trades/"
  ],
  "Manual trade review page renders chart, entry/exit/SL/TP levels, empty states, and review editing shortcuts."
);

assertIncludesAll(
  journalClient,
  [
    "Review",
    "/app/journal/trades/${encodeURIComponent(trade.tradeId)}",
    "Manual trades",
    "Copied signal activity",
    "Practice/backtesting"
  ],
  "/app/journal links manual trades to review while keeping existing journal sections."
);

assertIncludesAll(
  firestoreRules,
  [
    "manual_journal_trades",
    "allow read, write: if false"
  ],
  "Firestore rules still deny direct browser access to manual journal trades."
);

assertExcludesAll(
  reviewSurface,
  [
    "FOREX_METAAPI_UTILITY_TOKEN",
    "MetaAPI token",
    "brokerPassword",
    "vaultRef",
    "rawProviderPayload",
    "providerPayload",
    "webhook",
    "Paystack",
    "Solana",
    "sendSms",
    "WhatsApp",
    "uploadBytes",
    "generatePdf",
    "AutoCopy execution"
  ],
  "Stage 21B review source does not add secrets, payment/provider internals, uploads, messaging, PDFs, or AutoCopy execution coupling."
);

assert(
  reviewSurface.includes("fetchHistoricalCandlesWithCache") &&
    reviewSurface.includes("approved practice historical data providers only") &&
    !reviewClient.includes("api.binance.com") &&
    !reviewClient.includes("MetaAPI"),
  "Browser review chart uses server-returned approved practice candles and does not call external providers directly."
);

assert(
  stage21aQa.includes("manual_journal_trades") && stage21aQa.includes("Manual trade APIs are protected student routes"),
  "Stage 21A manual CRUD acceptance remains present."
);

assertIncludesAll(
  plan,
  [
    "Stage 21B - Manual Trade Review Chart",
    "TH-2026-08-21-STAGE21B-MANUAL-TRADE-REVIEW-CHART-HANDOFF"
  ],
  "plan.md records Stage 21B and handoff reference."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 21B",
    "Click Review from `/app/journal`",
    "Confirm entry/exit/SL/TP markers render when values exist"
  ],
  "manual-test-backlog.md records deferred Stage 21B manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "Stage 21B",
    "Manual Trade Review Chart",
    "TH-2026-08-21-STAGE21B-MANUAL-TRADE-REVIEW-CHART-HANDOFF"
  ],
  "prompt/promptsumary.md records the Stage 21B stop point."
);

assertIncludesAll(
  promptSummary,
  [
    "Practice/backtesting MVP is frozen at Stage 18X",
    "Course/lesson MVP is frozen at Stage 19I",
    "Ops/CRM/payments/support MVP is frozen at Stage 20D"
  ],
  "Prompt summary preserves frozen Stage 18X, 19I, and 20D foundations."
);

console.log("Stage 21B manual trade review chart QA passed.");
