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
const manualValidation = read("src/lib/journal/manual-trade-validation.ts");
const analyticsRoute = read("src/app/api/student/journal/manual-trades/analytics/route.ts");
const exportRoute = read("src/app/api/student/journal/manual-trades/export/route.ts");
const importRoute = read("src/app/api/student/journal/manual-trades/import/route.ts");
const journalClient = read("src/components/student-app/student-journal-client.tsx");

const sourceSurface = [
  manualTypes,
  manualRepository,
  manualValidation,
  analyticsRoute,
  exportRoute,
  importRoute,
  journalClient
].join("\n");

assert(
  packageJson.scripts?.["stage21c:qa"] === "node scripts/qa-stage21c-manual-journal-analytics-final.mjs",
  "package.json exposes npm run stage21c:qa."
);

assertExistsAll(
  [
    "src/app/api/student/journal/manual-trades/analytics/route.ts",
    "src/app/api/student/journal/manual-trades/export/route.ts",
    "src/app/api/student/journal/manual-trades/import/route.ts",
    "scripts/qa-stage21c-manual-journal-analytics-final.mjs"
  ],
  "Stage 21C analytics, export, import routes and QA script exist."
);

assertIncludesAll(
  manualTypes,
  [
    "ManualJournalAnalyticsResponse",
    "ManualJournalAnalyticsSummary",
    "ManualJournalBreakdownRow",
    "ManualJournalCalendarDay",
    "ManualJournalImportResponse",
    "symbol",
    "strategy",
    "tags",
    "emotion",
    "mistake",
    "setupQuality"
  ],
  "Manual journal types include analytics, breakdown, calendar, and import response models."
);

assertIncludesAll(
  manualRepository,
  [
    "import \"server-only\"",
    "ANALYTICS_FETCH_LIMIT",
    "IMPORT_LIMIT",
    "getStudentManualJournalAnalytics",
    "listStudentManualTradesForRollups(actor)",
    "manualTradeCollection(actor)",
    "closedManualTrades",
    "computeWinRate",
    "computeAverageR",
    "profitFactor",
    "expectancy",
    "calendar",
    "breakdowns",
    "getStudentManualJournalExport",
    "safeManualTradeExportRow",
    "tradesToCsv",
    "analyticsToCsv",
    "importStudentManualTradesFromCsv",
    "validateManualTradeInput",
    "batch.set(manualTradeCollection(actor).doc(tradeId)",
    "Imported manual trades were validated server-side"
  ],
  "Manual repository computes student-owned analytics and bounded import/export server-side."
);

assertIncludesAll(
  manualRepository,
  [
    "trades.filter((trade) => !trade.archivedAt).map(safeManualTradeExportRow)",
    "workspace/student identifiers"
  ],
  "Manual CSV/JSON exports use an allowlisted safe trade shape without workspace/student identifiers."
);

assert(
  !manualRepository.includes("payload.workspaceId") &&
    !manualRepository.includes("payload.studentId") &&
    !manualRepository.includes("lookup.get(\"workspaceId\")") &&
    !manualRepository.includes("lookup.get(\"studentId\")"),
  "Manual import/export repository does not trust browser-supplied workspaceId or studentId."
);

assertIncludesAll(
  analyticsRoute + exportRoute + importRoute,
  [
    "requireStudent(request)",
    "getStudentManualJournalAnalytics",
    "getStudentManualJournalExport",
    "importStudentManualTradesFromCsv",
    "Cache-Control",
    "no-store",
    "csvText"
  ],
  "Manual analytics/import/export APIs are signed-in-student protected and browser-cache safe for downloads."
);

assertIncludesAll(
  journalClient,
  [
    "data-manual-journal-analytics",
    "data-manual-journal-import-export",
    "/api/student/journal/manual-trades/analytics",
    "/api/student/journal/manual-trades/export?type=",
    "/api/student/journal/manual-trades/import",
    "getStudentBearerToken",
    "exportTypeLabel(type)",
    "\"trades\", \"analytics\", \"backup\"",
    "Paste manual trade CSV",
    "Daily P&L calendar",
    "Server-computed from your private manual trades only",
    "Manual trades",
    "Copied signal activity",
    "Practice/backtesting"
  ],
  "/app/journal renders private manual analytics, import/export controls, and existing separated sections."
);

assertIncludesAll(
  firestoreRules,
  [
    "manual_journal_trades",
    "allow read, write: if false"
  ],
  "Firestore rules continue to deny direct browser access to manual journal trades."
);

assertExcludesAll(
  sourceSurface,
  [
    "MetaAPI",
    "metaapi",
    "Binance",
    "Bybit",
    "Paystack",
    "Solana",
    "brokerPassword",
    "vaultRef",
    "rawProviderPayload",
    "providerPayload",
    "webhook",
    "sendSms",
    "WhatsApp",
    "uploadBytes",
    "generatePdf",
    "openai",
    "ai grading",
    "AutoCopy execution"
  ],
  "Stage 21C source does not add provider calls, secrets, uploads, messaging, PDFs, AI analysis, or AutoCopy execution coupling."
);

assertIncludesAll(
  plan,
  [
    "Stage 21C - Manual Journal Analytics, Calendar, Import/Export, And Final Polish",
    "TH-2026-08-21-STAGE21C-MANUAL-JOURNAL-ANALYTICS-FINAL-HANDOFF"
  ],
  "plan.md records Stage 21C and handoff reference."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 21C",
    "Confirm analytics update",
    "Export CSV and inspect safe fields",
    "Import valid manual trade CSV"
  ],
  "manual-test-backlog.md records deferred Stage 21C manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "Stage 21C",
    "TH-2026-08-21-STAGE21C-MANUAL-JOURNAL-ANALYTICS-FINAL-HANDOFF",
    "manual journal analytics"
  ],
  "prompt/promptsumary.md records Stage 21C handoff."
);

console.log("Stage 21C manual journal analytics/final polish QA passed.");
