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
const types = read("src/types/crypto-execution.ts");
const ledgerRepo = read("src/lib/journal/account-linked-performance-ledger.ts");
const studentRepo = read("src/lib/student-app/student-app-repository.ts");
const studentTypes = read("src/types/student-app.ts");
const studentUi = read("src/components/student-app/student-journal-client.tsx");
const workspaceUi = read("src/components/workspace/crypto-execution-ops-section.tsx");
const adminUi = read("src/components/admin/crypto-execution-ops-panel.tsx");
const cryptoRepo = read("src/lib/crypto-execution/crypto-execution-repository.ts");
const rules = read("firestore.rules");
const envExample = read(".env.example");
const forexLive = read("src/lib/crypto-execution/forex-live-canary-execution.ts");
const cryptoProduction = read("src/lib/crypto-execution/crypto-live-production.ts");
const globalsCss = read("src/app/globals.css");
const statChipUi = read("src/components/ui/stat-chip.tsx");
const badgeUi = read("src/components/ui/badge.tsx");

assert(
  packageJson.scripts?.["stage15y:qa"] === "node scripts/qa-stage15y-account-linked-journal-ledger.mjs",
  "package.json exposes npm run stage15y:qa."
);

assertIncludesAll(
  types,
  [
    "AccountLinkedTradeLedgerRecord",
    "AccountLinkedLedgerSource",
    "manual_journal",
    "crypto_autocopy",
    "forex_autocopy",
    "practice_backtest",
    "StudentAccountLinkedPerformancePreview",
    "WorkspaceAccountLinkedPerformanceSummary",
    "AdminAccountLinkedLedgerDiagnostics",
    "safeBrokerOrExchangeLabel",
    "maskedConnectionRef",
    "visibility"
  ],
  "Account-linked ledger model and preview types exist with supported sources and safe display fields."
);

assertIncludesAll(
  ledgerRepo,
  [
    "import \"server-only\"",
    "mapCryptoPaperAttemptToLedgerEntry",
    "mapCryptoTestnetAttemptToLedgerEntry",
    "mapCryptoProductionAttemptToLedgerEntry",
    "mapForexPaperAttemptToLedgerEntry",
    "mapForexDemoAttemptToLedgerEntry",
    "mapForexLiveCanaryAttemptToLedgerEntry",
    "mapManualJournalSummaryToLedgerEntry",
    "writeAccountLinkedLedgerEntry",
    "writeJournalPerformanceSummary",
    "writeJournalActivityLink",
    "account_linked_trade_ledger",
    "journal_performance_summaries",
    "journal_activity_links",
    "maskedRef"
  ],
  "Server-only ledger module maps crypto/forex/manual records and writes protected support-safe ledger entries."
);
assert(
  !ledgerRepo.includes("apiSecret") &&
    !ledgerRepo.includes("brokerPassword") &&
    !ledgerRepo.includes("metaApiToken") &&
    !ledgerRepo.includes("metaApiAccountId") &&
    !ledgerRepo.includes("credentialRefPath") &&
    !ledgerRepo.includes("secretManagerSecretName") &&
    !ledgerRepo.includes("providerPayload") &&
    !ledgerRepo.includes("exchangeOrderId"),
  "Ledger mapper does not copy raw API keys, broker passwords, MetaAPI tokens/account IDs, vault refs, provider payloads, or full external order IDs."
);

assertIncludesAll(
  studentTypes,
  [
    "StudentAccountLinkedPerformancePreview",
    "accountLinkedPerformance"
  ],
  "Student journal response includes account-linked performance preview."
);
assertIncludesAll(
  studentRepo,
  [
    "loadStudentAccountLinkedPerformancePreview",
    "accountLinkedPerformance",
    "workspaces/${actor.workspaceId}/students/${actor.studentId}/journal_summary/current"
  ],
  "Student journal API loads only the signed-in student's summary and support-safe account-linked preview."
);
assertIncludesAll(
  studentUi,
  [
    "Your manual trading",
    "Copied signal activity",
    "Practice/backtesting",
    "Practice/backtesting performance will appear here.",
    "Linked account readiness",
    "Recent AutoCopy ledger",
    "Masked refs"
  ],
  "Student journal UI separates manual trading, copied signal activity, and practice/backtesting with linked readiness."
);

const browserSources = `${studentUi}\n${workspaceUi}\n${adminUi}`;
assert(
  !browserSources.includes("apiSecret") &&
    !browserSources.includes("brokerPassword") &&
    !browserSources.includes("metaApiToken") &&
    !browserSources.includes("metaApiAccountId") &&
    !browserSources.includes("credentialRefPath") &&
    !browserSources.includes("secretManagerSecretName") &&
    !browserSources.includes("rawProviderPayload") &&
    !browserSources.includes("exchangeOrderId"),
  "Browser surfaces do not display raw credentials, vault refs, raw provider payloads, or full external order IDs."
);

assertIncludesAll(
  cryptoRepo,
  [
    "loadWorkspaceAccountLinkedPerformanceSummary",
    "loadAdminAccountLinkedLedgerDiagnostics",
    "accountLinkedPerformance",
    "accountLinkedDiagnostics"
  ],
  "Workspace and Super Admin execution overviews include bounded ledger summaries and support-safe diagnostics."
);
assertIncludesAll(
  workspaceUi,
  [
    "Bounded AutoCopy performance summary",
    "Aggregate copied-signal outcomes",
    "Private trade notes and raw account records are not exposed",
    "Active journals",
    "AutoCopy students",
    "Failed copied attempts"
  ],
  "Workspace UI shows aggregate bounded account-linked performance only."
);
assertIncludesAll(
  adminUi,
  [
    "Account-linked ledger diagnostics",
    "Support-safe journal and AutoCopy ledger",
    "No secrets, raw provider payloads, vault refs, or full external IDs are returned",
    "Recent entries",
    "Crypto linked",
    "Forex linked"
  ],
  "Super Admin UI shows support-safe ledger diagnostics."
);

assertIncludesAll(
  rules,
  [
    "account_linked_trade_ledger",
    "journal_performance_summaries",
    "journal_activity_links",
    "allow read, write: if false;"
  ],
  "Firestore rules deny direct browser access to account-linked ledger and journal linkage paths."
);

assertIncludesAll(
  envExample,
  [
    "FOREX_LIVE_CANARY_ENABLED=false",
    "FOREX_LIVE_ORDER_CALLS_ENABLED=false",
    "FOREX_LIVE_DRY_RUN=true",
    "CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED=",
    "CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED=",
    "CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=true",
    "CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED=false"
  ],
  "Live Forex and broad production Crypto env defaults remain disabled and dry-run."
);
assertIncludesAll(
  `${forexLive}\n${cryptoProduction}`,
  [
    "FOREX_LIVE_ORDER_CALLS_ENABLED",
    "FOREX_LIVE_DRY_RUN",
    "CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED",
    "CRYPTO_EXECUTION_PRODUCTION_DRY_RUN",
    "dry-run recorded"
  ],
  "Live Forex and broad production Crypto order paths remain fail-closed by code gates."
);

assertIncludesAll(
  `${globalsCss}\n${statChipUi}\n${badgeUi}`,
  [
    ".break-safe",
    "overflow-wrap: normal;",
    "word-break: normal;",
    ".break-token",
    "overflow-wrap: anywhere;",
    "break-safe text-[10px]",
    "break-safe inline-flex"
  ],
  "Shared TradeHub label wrapping keeps normal text readable and reserves hard breaking for token-like values."
);
assert(
  !globalsCss.includes(".break-safe {\n    overflow-wrap: anywhere;"),
  "Shared break-safe utility does not force labels to split at arbitrary characters."
);
assert(
  !globalsCss.includes(".break-safe {\n    overflow-wrap: break-word;"),
  "Shared break-safe utility does not force labels into letter-by-letter columns."
);

console.log("Stage 15Y account-linked journal/performance ledger QA passed.");
