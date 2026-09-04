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
const manualValidation = read("src/lib/journal/manual-trade-validation.ts");
const manualRepository = read("src/lib/journal/manual-trades-repository.ts");
const manualListRoute = read("src/app/api/student/journal/manual-trades/route.ts");
const manualTradeRoute = read("src/app/api/student/journal/manual-trades/[tradeId]/route.ts");
const journalClient = read("src/components/student-app/student-journal-client.tsx");
const stage15yQa = read("scripts/qa-stage15y-account-linked-journal-ledger.mjs");

const manualSourceSurface = [
  manualTypes,
  manualValidation,
  manualRepository,
  manualListRoute,
  manualTradeRoute,
  journalClient
].join("\n");

assert(
  packageJson.scripts?.["stage21a:qa"] === "node scripts/qa-stage21a-manual-journal-crud.mjs",
  "package.json exposes npm run stage21a:qa."
);

assertExistsAll(
  [
    "src/types/manual-journal.ts",
    "src/lib/journal/manual-trade-validation.ts",
    "src/lib/journal/manual-trades-repository.ts",
    "src/app/api/student/journal/manual-trades/route.ts",
    "src/app/api/student/journal/manual-trades/[tradeId]/route.ts",
    "src/components/student-app/student-journal-client.tsx"
  ],
  "Stage 21A manual journal CRUD source files exist."
);

assertIncludesAll(
  manualTypes,
  [
    "ManualTradeMarket",
    "\"crypto\"",
    "\"forex\"",
    "\"cfd\"",
    "\"stock\"",
    "\"futures\"",
    "\"other\"",
    "ManualTradeSide",
    "\"buy_long\"",
    "\"sell_short\"",
    "ManualTradeStatus",
    "\"planned\"",
    "\"open\"",
    "\"closed\"",
    "\"cancelled\"",
    "grossPnl",
    "netPnl",
    "riskAmount",
    "rMultiple",
    "ManualJournalTradeListResponse",
    "ManualJournalTradeMutationResponse"
  ],
  "Manual journal types cover requested fields, statuses, and derived values."
);

assertIncludesAll(
  manualValidation,
  [
    "validateManualTradeInput",
    "parseManualTradeFilters",
    "sanitizeSymbol",
    "replace(/<[^>]*>/g",
    "MAX_TAGS",
    "Closed trades require entry price, exit price, and quantity",
    "Open and closed trades require entry price and quantity",
    "manual_trade_invalid_date",
    "manual_trade_number_too_large"
  ],
  "Manual trade validation is bounded, sanitized, and server-side."
);

assertIncludesAll(
  manualRepository,
  [
    "getFirebaseAdminClients",
    "VerifiedStudent",
    ".collection(\"workspaces\")",
    ".doc(actor.workspaceId)",
    ".collection(\"students\")",
    ".doc(actor.studentId)",
    ".collection(COLLECTION_ID)",
    "manual_journal_trades",
    "deriveManualTradeFields",
    "grossPnl",
    "netPnl",
    "riskAmount",
    "rMultiple",
    "deriveOutcome",
    "createStudentManualTrade",
    "updateStudentManualTrade",
    "archiveStudentManualTrade"
  ],
  "Manual trade repository uses Admin SDK actor-scoped storage and server-derived calculations."
);

assert(
  !manualRepository.includes("payload.workspaceId") && !manualRepository.includes("payload.studentId"),
  "Manual trade repository does not trust browser-supplied workspaceId or studentId."
);

assertIncludesAll(
  manualListRoute + manualTradeRoute,
  [
    "requireStudent(request)",
    "listStudentManualTrades",
    "createStudentManualTrade",
    "updateStudentManualTrade",
    "archiveStudentManualTrade"
  ],
  "Manual trade APIs are protected student routes for list/create/update/archive."
);

assertIncludesAll(
  journalClient,
  [
    "data-manual-journal-crud",
    "Private manual trade journal",
    "/api/student/journal/manual-trades",
    "Create trade",
    "Save changes",
    "Confirm archive",
    "Manual trades",
    "Manual trade CRUD is private-first",
    "separate from AutoCopy",
    "practice/backtesting"
  ],
  "/app/journal exposes private manual trade CRUD while preserving existing journal separation copy."
);

assertIncludesAll(
  journalClient,
  [
    "manualTradeFilters",
    "status: \"all\"",
    "outcome: \"all\"",
    "strategy",
    "tag",
    "Search"
  ],
  "/app/journal supports manual trade search and filters."
);

assertIncludesAll(
  firestoreRules,
  [
    "manual_journal_trades",
    "allow read, write: if false"
  ],
  "Firestore rules deny direct browser access to manual journal trades."
);

assertExcludesAll(
  manualSourceSurface,
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
    "generatePdf"
  ],
  "Stage 21A manual journal source does not add provider calls, secrets, payments, uploads, or messaging."
);

assert(
  stage15yQa.includes("Your manual trading") && journalClient.includes("Copied signal activity"),
  "Existing AutoCopy ledger and account-linked journal summary surfaces remain present."
);

assertIncludesAll(
  plan,
  [
    "Stage 21A - Manual Trading Journal CRUD Foundation",
    "TH-2026-08-21-STAGE21A-MANUAL-JOURNAL-CRUD-HANDOFF"
  ],
  "plan.md records Stage 21A and handoff reference."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 21A",
    "Student creates a manual closed trade",
    "Workspace cannot see raw trade rows or private notes"
  ],
  "manual-test-backlog.md records deferred Stage 21A manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "Stage 21A",
    "Manual Trading Journal CRUD Foundation",
    "TH-2026-08-21-STAGE21A-MANUAL-JOURNAL-CRUD-HANDOFF"
  ],
  "prompt/promptsumary.md records the Stage 21A stop point."
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

console.log("Stage 21A manual journal CRUD QA passed.");
