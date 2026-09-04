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

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert(startIndex >= 0, `Found source slice start marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(endIndex >= 0, `Found source slice end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const firestoreRules = read("firestore.rules");

const manualTypes = read("src/types/manual-journal.ts");
const manualValidation = read("src/lib/journal/manual-trade-validation.ts");
const manualRepository = read("src/lib/journal/manual-trades-repository.ts");
const manualListRoute = read("src/app/api/student/journal/manual-trades/route.ts");
const manualTradeRoute = read("src/app/api/student/journal/manual-trades/[tradeId]/route.ts");
const reviewRoute = read("src/app/api/student/journal/manual-trades/[tradeId]/review/route.ts");
const analyticsRoute = read("src/app/api/student/journal/manual-trades/analytics/route.ts");
const exportRoute = read("src/app/api/student/journal/manual-trades/export/route.ts");
const importRoute = read("src/app/api/student/journal/manual-trades/import/route.ts");
const journalPage = read("src/app/(student)/app/journal/page.tsx");
const reviewPage = read("src/app/(student)/app/journal/trades/[tradeId]/page.tsx");
const journalClient = read("src/components/student-app/student-journal-client.tsx");
const reviewClient = read("src/components/student-app/student-manual-trade-review-client.tsx");
const stage21aQa = read("scripts/qa-stage21a-manual-journal-crud.mjs");
const stage21bQa = read("scripts/qa-stage21b-manual-trade-review-chart.mjs");
const stage21cQa = read("scripts/qa-stage21c-manual-journal-analytics-final.mjs");

const allManualSource = [
  manualTypes,
  manualValidation,
  manualRepository,
  manualListRoute,
  manualTradeRoute,
  reviewRoute,
  analyticsRoute,
  exportRoute,
  importRoute,
  journalPage,
  reviewPage,
  journalClient,
  reviewClient
].join("\n");

const protectedRoutes = [
  manualListRoute,
  manualTradeRoute,
  reviewRoute,
  analyticsRoute,
  exportRoute,
  importRoute
].join("\n");

const safeExportRow = sliceBetween(
  manualRepository,
  "function safeManualTradeExportRow",
  "function tradesToCsv"
);
const tradesCsvSlice = sliceBetween(manualRepository, "function tradesToCsv", "function analyticsToCsv");
const exportSlice = sliceBetween(
  manualRepository,
  "export async function getStudentManualJournalExport",
  "export async function getStudentManualTradeReview"
);
const importSlice = sliceBetween(
  manualRepository,
  "export async function importStudentManualTradesFromCsv",
  "export async function updateStudentManualTrade"
);
const analyticsSlice = sliceBetween(
  manualRepository,
  "export async function getStudentManualJournalAnalytics",
  "export async function getStudentManualJournalExport"
);

assert(
  packageJson.scripts?.["stage21d:qa"] === "node scripts/qa-stage21d-manual-journal-final-acceptance.mjs",
  "package.json exposes npm run stage21d:qa."
);

assertExistsAll(
  [
    "src/app/api/student/journal/manual-trades/route.ts",
    "src/app/api/student/journal/manual-trades/[tradeId]/route.ts",
    "src/app/api/student/journal/manual-trades/[tradeId]/review/route.ts",
    "src/app/api/student/journal/manual-trades/analytics/route.ts",
    "src/app/api/student/journal/manual-trades/export/route.ts",
    "src/app/api/student/journal/manual-trades/import/route.ts",
    "src/app/(student)/app/journal/page.tsx",
    "src/app/(student)/app/journal/trades/[tradeId]/page.tsx"
  ],
  "Manual journal API routes and student pages exist."
);

assertIncludesAll(
  protectedRoutes,
  [
    "requireStudent(request)",
    "listStudentManualTrades",
    "createStudentManualTrade",
    "updateStudentManualTrade",
    "archiveStudentManualTrade",
    "getStudentManualTradeReview",
    "getStudentManualJournalAnalytics",
    "getStudentManualJournalExport",
    "importStudentManualTradesFromCsv"
  ],
  "Manual journal CRUD, review, analytics, export, and import routes stay signed-in-student protected."
);

assertIncludesAll(
  manualRepository,
  [
    "import \"server-only\"",
    "manualTradeCollection(actor)",
    ".doc(actor.workspaceId)",
    ".doc(actor.studentId)",
    ".collection(COLLECTION_ID)",
    "trade.workspaceId === actor.workspaceId && trade.studentId === actor.studentId",
    "deriveManualTradeFields",
    "deriveOutcome"
  ],
  "Manual repository remains server-only, actor-scoped, and source-of-truth for derived manual trade fields."
);

assert(
  !manualRepository.includes("payload.workspaceId") &&
    !manualRepository.includes("payload.studentId") &&
    !manualRepository.includes("lookup.get(\"workspaceId\")") &&
    !manualRepository.includes("lookup.get(\"studentId\")"),
  "Manual repository does not trust browser-supplied workspaceId or studentId."
);

assertIncludesAll(
  analyticsSlice + manualRepository,
  [
    "getStudentManualJournalAnalytics",
    "listStudentManualTradesForRollups(actor)",
    "buildManualJournalAnalytics(trades)",
    "closedManualTrades",
    "profitFactor",
    "expectancy",
    "calendar",
    "breakdowns"
  ],
  "Manual analytics are server-computed from signed-in student manual trades only."
);

assertIncludesAll(
  safeExportRow,
  [
    "tradeId",
    "market",
    "symbol",
    "side",
    "status",
    "outcome",
    "entryPrice",
    "exitPrice",
    "quantity",
    "stopLoss",
    "takeProfit",
    "fees",
    "grossPnl",
    "netPnl",
    "riskAmount",
    "rMultiple",
    "strategyName",
    "tags",
    "emotion",
    "mistakeCategory",
    "setupQuality",
    "notes",
    "lessonLearned"
  ],
  "Manual exports use an explicit allowlisted trade field shape."
);

assertExcludesAll(
  safeExportRow + tradesCsvSlice,
  [
    "workspaceId",
    "studentId",
    "providerPayload",
    "rawProviderPayload",
    "vaultRef",
    "brokerPassword",
    "MetaAPI",
    "Binance",
    "Bybit",
    "Paystack",
    "Solana",
    "webhook",
    "hiddenCandle",
    "candle"
  ],
  "Manual CSV/export row source excludes workspace/student ids, provider/payment internals, secrets, AutoCopy internals, and hidden practice candle fields."
);

assertIncludesAll(
  exportSlice,
  [
    "tradesToCsv(trades)",
    "analyticsToCsv(analytics)",
    "trades.filter((trade) => !trade.archivedAt).map(safeManualTradeExportRow)",
    "safeMessage",
    "application/json"
  ],
  "Manual export supports trades CSV, analytics CSV, and safe JSON backup using allowlisted fields."
);

assertIncludesAll(
  exportRoute,
  [
    "Content-Type",
    "Content-Disposition",
    "Cache-Control",
    "no-store"
  ],
  "Manual export route returns download headers with no-store cache posture."
);

assertIncludesAll(
  importSlice,
  [
    "IMPORT_LIMIT",
    "csvText.length > 80_000",
    "requiredHeaders",
    "validateManualTradeInput(rowToManualTradeInput(headers, row))",
    "manual_${crypto.randomUUID()",
    "batch.set(manualTradeCollection(actor).doc(tradeId)",
    "Manual trade import was bounded",
    "saved only under your signed-in student journal"
  ],
  "Manual import is bounded, validates/sanitizes rows server-side, and writes only under the signed-in student."
);

assertExcludesAll(
  importSlice,
  [
    "lookup.get(\"workspaceId\")",
    "lookup.get(\"studentId\")",
    "payload.workspaceId",
    "payload.studentId"
  ],
  "Manual import ignores workspace/student columns instead of trusting client identity fields."
);

assertIncludesAll(
  journalClient,
  [
    "Private manual trade journal",
    "data-manual-journal-crud",
    "data-manual-journal-analytics",
    "data-manual-journal-import-export",
    "Manual trades",
    "Copied signal activity",
    "Practice/backtesting",
    "/app/journal/trades/${encodeURIComponent(trade.tradeId)}",
    "getStudentBearerToken",
    "Export ${exportTypeLabel(type)}"
  ],
  "/app/journal keeps manual trading, AutoCopy ledger, and practice/backtesting separate while linking to review."
);

assertIncludesAll(
  reviewRoute + reviewClient + manualRepository,
  [
    "fetchHistoricalCandlesWithCache",
    "historicalDataLimits",
    "approved practice historical data providers only",
    "emptyReviewChartState",
    "Manual review chart failed closed without exposing provider payloads",
    "Archived manual trades are read-only",
    "readOnly",
    "disabled={response.review.readOnly}",
    "No review candles available",
    "createPriceLine",
    "Entry",
    "Exit",
    "SL",
    "TP"
  ],
  "Manual trade review chart uses approved practice historical data through server APIs, fails closed, renders levels, and keeps archived trades read-only."
);

assert(
  !reviewClient.includes("api.binance.com") &&
    !reviewClient.includes("api.bybit") &&
    !reviewClient.includes("MetaAPI") &&
    !reviewClient.includes("fetchHistoricalCandlesWithCache"),
  "Browser manual review client does not call provider/private exchange/history adapters directly."
);

assertIncludesAll(
  firestoreRules,
  [
    "manual_journal_trades",
    "allow read, write: if false",
    "account_linked_trade_ledger",
    "journal_performance_summaries"
  ],
  "Firestore rules retain deny-by-default posture for manual journal and related protected journal paths."
);

assertIncludesAll(
  stage21aQa + stage21bQa + stage21cQa,
  [
    "Stage 21A manual journal CRUD QA passed",
    "Stage 21B manual trade review chart QA passed",
    "Stage 21C manual journal analytics/final polish QA passed"
  ],
  "Prior Stage 21 QA scripts remain present for CRUD, review chart, analytics, import, and export."
);

assertIncludesAll(
  plan,
  [
    "Stage 21D - Manual Journal MVP Final Acceptance Freeze",
    "TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF",
    "Manual Journal MVP is source-QA frozen"
  ],
  "plan.md records Stage 21D final freeze and handoff reference."
);

assertIncludesAll(
  manualBacklog,
  [
    "Manual Journal MVP status: source-QA frozen at Stage 21D",
    "### Manual Journal Must Test Before Demo",
    "### Manual Journal Nice To Test",
    "### Manual Journal Later Regression",
    "Inspect exports for no workspaceId/studentId/secrets/provider/AutoCopy internals"
  ],
  "manual-test-backlog.md reorganizes Manual Journal browser QA into demo, nice-to-test, and later regression groups."
);

assertIncludesAll(
  promptSummary,
  [
    "Stage 21D - Manual Journal MVP Final Acceptance Freeze",
    "TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF",
    "Manual Journal MVP is source-QA frozen",
    "TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF",
    "TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF",
    "TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF"
  ],
  "prompt summary sets current stop to Stage 21D and preserves frozen foundation references."
);

assertExcludesAll(
  allManualSource,
  [
    "openai",
    "AI analysis",
    "ai grading",
    "uploadBytes",
    "screenshot",
    "generatePdf",
    "sendEmail",
    "sendSms",
    "WhatsApp",
    "push notification",
    "createOrder",
    "placeOrder",
    "withdraw",
    "MetaAPI token",
    "brokerPassword",
    "vaultRef",
    "rawProviderPayload",
    "webhook payload"
  ],
  "Stage 21D manual journal surface does not add forbidden AI, uploads, messaging, provider, payment, secret, or execution behavior."
);

console.log("Stage 21D manual journal MVP final acceptance QA passed.");
