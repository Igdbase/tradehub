import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};
const includesAll = (source, values, message) => {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
};
const excludesAll = (source, values, message) => {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
};

class AdminApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function loadAdapterHooks() {
  const source = read("src/lib/journal/crypto-journal-provider-adapters.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require: (specifier) => {
      if (specifier === "node:crypto") return crypto;
      if (specifier === "@/lib/firebase/admin-errors") return { AdminApiError };
      if (specifier === "@/lib/journal/provider-execution-identity") {
        return loadProviderIdentity();
      }
      if (specifier === "server-only") return {};
      throw new Error(`Unexpected require in adapter QA: ${specifier}`);
    },
    console,
    Buffer,
    Date,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    fetch: async () => ({ status: 500, headers: new Map(), text: async () => "{}" })
  };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context, { filename: "crypto-journal-provider-adapters.ts" });
  return context.module.exports.journalCryptoAdapterTestHooks;
}

function loadProviderIdentity() {
  const source = read("src/lib/journal/provider-execution-identity.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require: (specifier) => {
      if (specifier === "node:crypto") return crypto;
      if (specifier === "server-only") return {};
      throw new Error(`Unexpected require in identity QA: ${specifier}`);
    }
  };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context, { filename: "provider-execution-identity.ts" });
  return context.module.exports;
}

function loadSyncPlanner() {
  const source = read("src/lib/journal/crypto-journal-sync-planner.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require: (specifier) => {
      throw new Error(`Unexpected require in planner QA: ${specifier}`);
    }
  };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context, { filename: "crypto-journal-sync-planner.ts" });
  return context.module.exports;
}

async function assertRejects(fn, codePattern, message) {
  try {
    await fn();
  } catch (error) {
    assert(error instanceof Error && codePattern.test(error.code ?? error.message), message);
    return;
  }
  throw new Error(message);
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/journal-workspace.ts");
const connectedRepository = read("src/lib/journal/connected-journal-repository.ts");
const syncRepository = read("src/lib/journal/crypto-journal-sync-repository.ts");
const syncPlanner = read("src/lib/journal/crypto-journal-sync-planner.ts");
const adapters = read("src/lib/journal/crypto-journal-provider-adapters.ts");
const providerIdentity = read("src/lib/journal/provider-execution-identity.ts");
const accountLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const browserLedgerMapper = accountLedger.slice(
  accountLedger.indexOf("function mapLedgerRecord"),
  accountLedger.indexOf("function baseMappedLedgerEntry")
);
const liveProduction = read("src/lib/crypto-execution/crypto-live-production.ts");
const vault = read("src/lib/crypto-execution/credential-vault.ts");
const journalVault = vault.slice(
  vault.indexOf("export async function storeJournalCryptoCredential"),
  vault.indexOf("export async function storeForexMetaApiToken")
);
const client = read("src/components/student-app/student-journal-client.tsx");
const routes = [
  "src/app/api/student/journal/crypto-sync/route.ts",
  "src/app/api/student/journal/crypto-sync/[connectionId]/sync/route.ts",
  "src/app/api/student/journal/crypto-sync/[connectionId]/disconnect/route.ts"
].map(read).join("\n");
const rules = read("firestore.rules");
const indexes = read("firestore.indexes.json");
const browser = read("tests/browser/student-e2e.spec.mjs");
const browserHelpers = read("tests/browser/helpers/student-flows.mjs");
const repositoryEmulatorQa = read("scripts/qa-stage29g-repository-emulator.mjs");
const envExample = read(".env.example");
const docs = [
  "plan.md",
  "manual-test-backlog.md",
  "manual-demo-qa.md",
  "complaint-resolution-roadmap.md",
  "prompt/promptsumary.md",
  "docs/handoffs/tradehub-handoff-2026-08-30.md"
].map(read).join("\n");

assert(packageJson.scripts?.["stage29g:qa"] === "node scripts/qa-stage29g-crypto-journal-sync.mjs", "package.json exposes npm run stage29g:qa.");
assert(packageJson.scripts?.["stage29g:repository:qa"] === "node scripts/qa-stage29g-repository-emulator.mjs", "package.json exposes npm run stage29g:repository:qa.");
includesAll(types, ["JournalCryptoExchange", '"binance" | "bybit"', "JournalCryptoConnectionStatus", "JournalCryptoConnectionSummary", "cryptoConnections", "journalSyncConfigured: boolean"], "Journal DTOs include dedicated crypto Journal Sync connection summaries.");
includesAll(types, ['"execution_only"'], "Journal DTOs include execution-only history for unmatched provider executions without counting them as open positions.");
includesAll(envExample, ["JOURNAL_CRYPTO_SYNC_ENABLED=false", "JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER=false", "JOURNAL_CRYPTO_SYNC_MAX_SYMBOLS=8", "JOURNAL_CRYPTO_CREDENTIAL_MUTATION_HMAC_KEY="], "Journal Sync env gates and keyed mutation posture are documented disabled by default.");

includesAll(routes, ["requireStudent(request)", "createStudentJournalCryptoConnection", "syncStudentJournalCryptoConnection", "disconnectStudentJournalCryptoConnection"], "Journal Sync APIs are protected student routes for overview/connect/sync/disconnect.");
includesAll(syncRepository, ["journal_crypto_connections", "journal_crypto_sync_runs", "account_linked_trade_ledger", "storeJournalCryptoCredential", "loadJournalCryptoCredential", "revokeJournalCryptoCredential", "verifyJournalCryptoReadOnlyPermission", "fetchJournalCryptoHistory", "syncDisabled: true"], "Student-scoped Journal Sync repository uses dedicated connection/run collections, separate vault helpers, permission verification, bounded import, and disable-first disconnect.");
includesAll(syncRepository, ["resolveConnectionDoc", ".where(\"connectionRef\", \"==\", cleaned)", ".limit(1)", "CONNECTION_LIMIT", "SYNC_LOCK_MS", "SYNC_MAX_PROVIDER_WORK_MS", "SYNC_COOLDOWN_MS", "CONFIG_LOCK_MS", "syncLockUntil", "credentialReplacementLockOwner", "credentialReplacementLockUntil", "syncCredentialFingerprint", "syncCredentialVersionMarker", "credentialVersionMarker", "pendingCredentialVersionMarker", "pendingCredentialOwner", "credentialMutationHmacKey", "createHmac(\"sha256\"", "credentialMutationIdentifier", "submittedCredentialMutationIdentifier", "credentialWriteRequired", "selectedSymbolsChanged", "selectedSymbolsKey", "lockIsValid(previous.syncLockUntil", "lockIsValid(record.credentialReplacementLockUntil", "credentialVersionMarker: lockedCredentialVersionMarker", "connectionState.credentialFingerprint", "connectionState.credentialVersionMarker", "journal_crypto_connection_changed", "providerExecutionIdentity", "dedupeSkippedCount", "journalConnectionRef", "planJournalCryptoLedgerSnapshot", "commitBoundedWrites", "journal_crypto_import_generations", "shouldStageGeneration", "retainedWrites", "snapshotMode", "currentImportGeneration: shouldStageGeneration", "pendingImportGeneration", "crawlProgress", "cleanupAbandonedJournalCryptoGenerations", ".where(\"connectionRef\", \"==\", connectionRef)", "ABANDONED_GENERATION_MIN_AGE_MS", "generationLockOwner !== lockOwner", "assertSyncWorkWithinLease", "connectionState.syncLockOwner !== lockOwner", "connectionState.syncDisabled === true", "clearSyncLockIfOwned", "credentialAccountFingerprint", "credentialChanged", "currentImportGeneration: null", "pendingImportGeneration: null", "syncWatermarks: {}", "status: \"retired\"", "retireUnreferencedJournalCryptoImportGeneration", "status: \"superseded\"", "syncLockOwner: null", "syncLockUntil: null", "processStudentJournalCryptoCredentialCleanupTasks", "journal_crypto_credential_cleanup_tasks", "JournalCryptoCredentialCleanupAction", "discard_failed_replacement", "retire_previous_version", "cleanupAction", "connectionId", "targetCredentialVersionMarker", "activeCredentialVersionMarker", ".where(\"status\", \"==\", \"retry_scheduled\")", ".where(\"nextAttemptAt\", \"<=\", new Date(now).toISOString())", ".orderBy(\"nextAttemptAt\", \"asc\")", "CREDENTIAL_CLEANUP_LOCK_MS", "cleanupLockOwner", "cleanupLockUntil", "status: \"processing\"", "cleanup_target_is_active", "resolvedDependencies.vault.discardVersion", "resolvedDependencies.vault.retireVersion"], "Sync repository uses bounded/direct connection lookup, connection limits, owned single-flight locks, first-time placeholder/config locks, keyed credential mutation identifiers, credential version pinning, selected-symbol resets, generation retirement, action-specific due-only leased cleanup tasks, connection-scoped lease-aware staging/cleanup, resumable crawl progress, bounded sync work, and copied-execution dedupe.");
excludesAll(syncRepository, ["function credentialMutationFingerprint"], "Sync repository does not keep the old direct unkeyed credential mutation hash helper.");
excludesAll(syncRepository, ["collection(`${studentPath(actor)}/journal_crypto_connections`).get()", "exchange_connections", "forex_provisioning", "createStudentCryptoExecutionConnection", "loadExchangeCredential"], "Journal Sync repository avoids unbounded connection scans and Copier/execution/Fx provisioning coupling.");
includesAll(syncPlanner, ["JournalCryptoSnapshotMode", "complete_replacement", "incremental_delta", "retainedActiveRows", "activateGeneration", "executionLegs", "writeImports: []", "deleteIds: []", "chunkJournalCryptoFirestoreWrites", "Math.min(Math.floor(chunkSize), 450)", "providerExecutionIdentities", "row.journalConnectionRef === connectionRef", "sameConnectionProviderIdentities", "sameConnectionImportKeys", "journalLifecycle: leg.side === \"sell\" ? \"execution_only\" : \"open\""], "Snapshot planner distinguishes complete replacement from incremental deltas, prevents incomplete reconciliations, dedupes at execution-leg level including same-connection staged rows, preserves execution-only unmatched sells, and chunks Firestore writes below 500.");
includesAll(connectedRepository, ["listStudentJournalCryptoConnectionSummaries", "cryptoConnections", "journalSyncConfigured = activeJournalConnections.length > 0", "journal_crypto_import_generations", "activeGenerationSnapshots", "activeGenerationValues", "source === \"connected_provider\"", "tradeOrigin === \"provider_manual\"", "A provider-filled entry confirms an execution, not the position's closure.", "trade.status === \"open\" || trade.status === \"partial\"", "execution_only"], "My Trades readiness is derived from dedicated Journal Sync metadata, reads active generation entries before applying browser-visible limits, and excludes execution-only records from open position counts.");
excludesAll(connectedRepository, ["exchange_connections", "forex_provisioning"], "Connected Journal readiness stays independent from Copier setup records.");

includesAll(vault, ["journalCryptoCredentialRefPathFor", "journal_crypto_keys", "storeJournalCryptoCredential", "loadJournalCryptoCredential", "revokeJournalCryptoCredential", "discardJournalCryptoCredentialVersion", "retireJournalCryptoCredentialVersion", "disableSecretVersion", "secretManagerSecretVersionName", "credentialVersionMarker", "assertRequestedJournalCredentialVersion", "localJournalCryptoVersionMarker", "collectionGroup(\"versions\")", "purpose: \"journal_crypto_history\"", "deleteSecret({ name: record.secretManagerSecretName })", "await credentialRef.delete()"], "Credential vault has a separate Journal Crypto namespace, exact credential version marker enforcement, local encrypted version docs, active Secret Manager version pinning, rollback cleanup, previous-version retirement, and real credential cleanup for disconnect.");
excludesAll(journalVault, ["versions/latest"], "Journal Crypto credential load path never accesses Secret Manager latest.");
excludesAll(vault.slice(vault.indexOf("journalCryptoCredentialRefPathFor")), ["broker_keys/${workspaceId}/students/${studentId}/connections"], "Journal Crypto credentials are not stored under execution broker-key paths.");
includesAll(syncRepository, ["try {", "resolvedDependencies.vault.store", "resolvedDependencies.vault.retireVersion", "previous_version_retirement_failed", "\"retire_previous_version\"", "recordJournalCryptoCredentialCleanupRequired", "processStudentJournalCryptoCredentialCleanupTasks", "resolvedDependencies.vault.discardVersion", "previousCredential", "replacement_version_cleanup_failed", "\"discard_failed_replacement\"", "resolvedDependencies.vault.revoke({", "throw error;"], "Connection creation preserves previous credentials, retires previous versions after activation, creates action-specific retryable cleanup tasks, and revokes or marks generic cleanup for failed replacements when no safe target exists.");
includesAll(syncRepository, ["process.env.NODE_ENV === \"production\"", "JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER", "journal_crypto_fake_provider_blocked"], "Fake provider transport hard-fails in production.");
includesAll(indexes, ["journal_crypto_credential_cleanup_tasks", "\"status\"", "\"nextAttemptAt\""], "Firestore indexes include due-time ordering for bounded credential cleanup retries.");

includesAll(providerIdentity, ["createProviderExecutionIdentity", "createProviderOrderExecutionIdentity", "provider_exec_", "provider_order_exec_", "createHash(\"sha256\")"], "A shared server-only provider execution identity helper exists.");
excludesAll(providerIdentity, ["maskedConnectionRef", "studentId", "workspaceId", "connectionRef"], "Shared provider execution identity does not combine masked/internal identities with raw provider execution refs.");
includesAll(accountLedger, ["providerExecutionIdentity:", "mapCryptoProductionAttemptToLedgerEntry", "tradeOrigin: \"copied\"", "providerConfirmed", "journalLifecycle"], "Actual Copier ledger mapper preserves copied-source lifecycle metadata for matching provider executions.");
excludesAll(browserLedgerMapper, ["providerExecutionIdentity:", "journalExecutionFingerprint:", "journalConnectionRef:"], "Student-facing ledger summaries do not expose server-only provider execution identities or Journal Sync internals.");
includesAll(liveProduction, ["createProviderOrderExecutionIdentity", "writeAccountLinkedLedgerEntry", "mapCryptoProductionAttemptToLedgerEntry", "filled_live", "partially_filled_live"], "Production Copier write path writes provider execution identities into the account-linked ledger for dedupe.");
excludesAll(liveProduction, ["providerExecutionIdentity: record.providerExecutionIdentity"], "Super Admin production preview does not expose server-only provider execution identities.");

includesAll(adapters, ["const BINANCE_HOST = \"https://api.binance.com\"", "const BYBIT_HOST = \"https://api.bybit.com\"", "JOURNAL_CRYPTO_ALLOWED_HOSTS", "JOURNAL_CRYPTO_MAX_SYMBOLS", "JOURNAL_CRYPTO_MAX_HISTORY_DAYS", "JOURNAL_CRYPTO_MAX_PAGES", "JOURNAL_CRYPTO_MAX_RECORDS", "JOURNAL_CRYPTO_MAX_BYBIT_WINDOWS", "MAX_RESPONSE_BYTES", "MAX_DECIMAL_CHARS", "Retry-After", "validateJournalCryptoSymbols"], "Provider adapter uses fixed hosts and explicit symbol/history/page/window/record/byte/decimal/retry bounds.");
includesAll(adapters, ["/sapi/v1/account/apiRestrictions", "/api/v3/myTrades", "/v5/user/query-api", "/v5/execution/list", "X-BAPI-TIMESTAMP", "X-BAPI-RECV-WINDOW", "X-BAPI-SIGN", "retCode", "readOnly", "enableReading", "enableWithdrawals", "enableSpotAndMarginTrading", "enableFixApiTrade", "enablePortfolioMarginTrading"], "Provider adapter implements Binance and Bybit read-only checks with correct V5 GET auth, retCode handling, and complete mutation-permission rejection.");
excludesAll(adapters, ["/api/v3/order?", "/api/v3/order/", "/v5/order/create", "/v5/order/cancel", "/v5/position/", "/sapi/v1/capital/withdraw"], "Provider adapter does not implement mutation endpoints.");
includesAll(adapters, ["type Decimal = bigint", "missing_fee", "unsupported_fee_currency", "unknown_starting_inventory", "incomplete_history", "truncated_history", "malformed_history", "authoritative_basis_unproven", "taintSymbol", "performanceEligible: !outputTaint && lifecycle === \"closed\"", "connectionIdentity", "providerExecutionIdentity", "providerExecutionIdentities", "executionLegs", "providerOrderId", "providerExecutionId", "assertBinanceMyTradesRequestShape", "JOURNAL_CRYPTO_MAX_PROVIDER_REQUESTS", "JournalCryptoCrawlProgress", "crawlProgress", "resumedSymbolIndex", "nextSymbolIndex", "boundaryUntil", "completedWatermarks", "selectedSymbols.every((symbol) => Number(completedWatermarks[symbol]) >= until)", "watermarks: snapshotComplete ? completedWatermarks : {}"], "Provider imports use decimal arithmetic, connection-scoped idempotency, a global provider request budget, frozen crawl boundary, per-symbol completed watermarks, resumable crawl progress, shared provider execution identity sets, documented Binance request shapes, execution-leg metadata, and conservative fee/basis tainting.");
excludesAll(adapters, ["record.execFee ?? \"0\"", "record.commission ?? \"0\"", "journalLifecycle: \"closed\", providerStatus: \"filled\"", "realizedPnl: 0"], "Adapter does not classify FILLED as CLOSED or fabricate zero fees/P&L for ambiguous history.");
excludesAll(adapters, ["fromId,"], "Binance history retrieval does not combine fromId with time windows.");

const hooks = loadAdapterHooks();
const identityHooks = loadProviderIdentity();
const plannerHooks = loadSyncPlanner();
const sharedBinanceIdentity = identityHooks.createProviderOrderExecutionIdentity({
  provider: "binance",
  symbol: "BTCUSDT",
  side: "buy",
  providerOrderId: "101"
});
assert(
  sharedBinanceIdentity === identityHooks.createProviderOrderExecutionIdentity({
    provider: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    providerOrderId: "101"
  }),
  "Executable QA proves Copier and Journal Sync can derive the same Binance identity from stable raw provider values."
);
assert(
  sharedBinanceIdentity === identityHooks.createProviderOrderExecutionIdentity({
    provider: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    providerOrderId: "101",
    clientOrderId: "internal-client-order-not-visible-in-history"
  }),
  "Executable QA proves shared provider identity ignores internal client ids when a stable raw provider order id is available."
);
assert(
  sharedBinanceIdentity !== identityHooks.createProviderOrderExecutionIdentity({
    provider: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    providerOrderId: "102"
  }),
  "Executable QA proves different Binance provider orders do not collide."
);
const sharedBybitIdentity = identityHooks.createProviderOrderExecutionIdentity({
  provider: "bybit",
  symbol: "ETHUSDT",
  side: "sell",
  providerOrderId: "bybit_order_1"
});
assert(
  sharedBybitIdentity === identityHooks.createProviderOrderExecutionIdentity({
    provider: "bybit",
    symbol: "ETHUSDT",
    side: "sell",
    providerOrderId: "bybit_order_1"
  }) &&
    sharedBybitIdentity !== identityHooks.createProviderOrderExecutionIdentity({
      provider: "bybit",
      symbol: "ETHUSDT",
      side: "sell",
      providerOrderId: "bybit_order_2"
    }),
  "Executable QA proves Bybit provider execution identities match across paths and remain collision-resistant for different orders."
);
const plannerRecord = (importKey, providerExecutionIdentity) => ({
  importKey,
  executionFingerprint: `fingerprint_${importKey}`,
  providerExecutionIdentity,
  exchange: "binance",
  symbol: "BTCUSDT",
  market: "crypto",
  side: "buy",
  providerStatus: "filled",
  journalLifecycle: "open",
  openedAt: "2026-09-03T00:00:00.000Z",
  entryPrice: 100,
  quantity: 1,
  performanceEligible: false,
  ineligibilityReason: "open_position",
  source: "connected_provider",
  tradeOrigin: "provider_manual",
  safeBrokerOrExchangeLabel: "QA"
});
const completePlan = plannerHooks.planJournalCryptoLedgerSnapshot({
  snapshotComplete: true,
  snapshotMode: "complete_replacement",
  imported: [
    { ...plannerRecord("journal_new_copied_duplicate", "journal_roundtrip_composite"), providerExecutionIdentities: ["journal_roundtrip_composite", sharedBinanceIdentity] },
    plannerRecord("journal_new_unique", "provider_order_exec_unique")
  ],
  existingRows: [
    { id: "crypto_production_attempt_1", providerExecutionIdentity: sharedBinanceIdentity, journalConnectionRef: "" },
    { id: "journal_old_same_connection", providerExecutionIdentity: "provider_order_exec_old", journalConnectionRef: "journal_conn_active", importGeneration: "old_generation" },
    { id: "journal_old_same_connection_duplicate", providerExecutionIdentity: sharedBinanceIdentity, journalConnectionRef: "journal_conn_active", importGeneration: "old_generation" }
  ],
  connectionRef: "journal_conn_active",
  activeImportGeneration: ""
});
assert(
  completePlan.writeImports.length === 1 &&
    completePlan.writeImports[0].importKey === "journal_new_unique" &&
    completePlan.dedupeSkippedCount === 1,
  "Executable QA proves a matching Copier ledger row prevents the Journal Sync duplicate from being written."
);
assert(
  completePlan.deleteIds.length === 0 &&
    completePlan.activateGeneration === true,
  "Executable QA proves complete snapshots stage a new generation and avoid direct active-ledger deletes before pointer activation."
);
const partialPlan = plannerHooks.planJournalCryptoLedgerSnapshot({
  snapshotComplete: false,
  snapshotMode: "complete_replacement",
  imported: [plannerRecord("journal_partial_unique", "provider_order_exec_partial")],
  existingRows: [
    { id: "journal_previous_complete", providerExecutionIdentity: "provider_order_exec_previous", journalConnectionRef: "journal_conn_active", importGeneration: "old_generation" }
  ],
  connectionRef: "journal_conn_active",
  activeImportGeneration: "old_generation"
});
assert(
  partialPlan.writeImports.length === 0 && partialPlan.deleteIds.length === 0,
  "Executable QA proves incomplete, truncated, skipped, malformed, or rate-limited snapshots cannot reconcile-delete or replace the last complete snapshot."
);
const emptyIncrementalPlan = plannerHooks.planJournalCryptoLedgerSnapshot({
  snapshotComplete: true,
  snapshotMode: "incremental_delta",
  imported: [],
  existingRows: [
    { id: "journal_active_open_buy", providerExecutionIdentity: sharedBinanceIdentity, journalConnectionRef: "journal_conn_active", importGeneration: "active_generation", data: { symbol: "BTCUSDT" } }
  ],
  connectionRef: "journal_conn_active",
  activeImportGeneration: "active_generation"
});
assert(
  emptyIncrementalPlan.writeImports.length === 0 &&
    emptyIncrementalPlan.retainedActiveRows.length === 1 &&
    emptyIncrementalPlan.activateGeneration === false &&
    emptyIncrementalPlan.deleteIds.length === 0,
  "Executable QA proves an empty successful incremental sync retains the current active generation instead of replacing history."
);
const incrementalPlan = plannerHooks.planJournalCryptoLedgerSnapshot({
  snapshotComplete: true,
  snapshotMode: "incremental_delta",
  imported: [plannerRecord("journal_new_incremental_sell", "provider_order_exec_incremental_sell")],
  existingRows: [
    { id: "journal_active_open_buy", providerExecutionIdentity: sharedBinanceIdentity, journalConnectionRef: "journal_conn_active", importGeneration: "active_generation", data: { symbol: "BTCUSDT" } }
  ],
  connectionRef: "journal_conn_active",
  activeImportGeneration: "active_generation"
});
assert(
  incrementalPlan.writeImports.length === 1 &&
    incrementalPlan.retainedActiveRows.length === 1 &&
    incrementalPlan.activateGeneration === true,
  "Executable QA proves incremental deltas stage old active rows plus new records before flipping the generation pointer."
);
const executionLegPlan = plannerHooks.planJournalCryptoLedgerSnapshot({
  snapshotComplete: true,
  snapshotMode: "incremental_delta",
  imported: [{
    ...plannerRecord("journal_roundtrip_with_copied_buy", "roundtrip_identity"),
    providerExecutionIdentities: ["roundtrip_identity", sharedBinanceIdentity, "provider_order_exec_manual_sell"],
    executionLegs: [
      { providerExecutionIdentity: sharedBinanceIdentity, side: "buy", executedAt: "2026-09-03T00:00:00.000Z", price: 100, quantity: 1 },
      { providerExecutionIdentity: "provider_order_exec_manual_sell", side: "sell", executedAt: "2026-09-03T01:00:00.000Z", price: 110, quantity: 1 }
    ]
  }],
  existingRows: [
    { id: "crypto_copied_buy", providerExecutionIdentity: sharedBinanceIdentity, journalConnectionRef: "" }
  ],
  connectionRef: "journal_conn_active",
  activeImportGeneration: "active_generation"
});
assert(
  executionLegPlan.writeImports.length === 1 &&
    executionLegPlan.writeImports[0].providerExecutionIdentity === "provider_order_exec_manual_sell" &&
    executionLegPlan.writeImports[0].side === "sell" &&
    executionLegPlan.writeImports[0].journalLifecycle === "execution_only",
  "Executable QA proves dedupe happens at execution/order-leg level so a copied buy does not discard or mislabel an unmatched provider-manual sell."
);
const writeChunks = plannerHooks.chunkJournalCryptoFirestoreWrites(Array.from({ length: 901 }, (_, index) => ({ index })));
assert(
  writeChunks.length === 3 && writeChunks.every((chunk) => chunk.length <= 450),
  "Executable QA proves Firestore snapshot commits are chunked below the 500-write batch limit."
);
const stagedPartialPlan = plannerHooks.planJournalCryptoLedgerSnapshot({
  snapshotComplete: true,
  snapshotMode: "incremental_delta",
  imported: [plannerRecord("journal_partial_stage_new", "provider_order_exec_stage_new")],
  existingRows: [
    { id: "journal_active_open_buy", providerExecutionIdentity: sharedBinanceIdentity, journalConnectionRef: "journal_conn_active", importGeneration: "active_generation", data: { symbol: "BTCUSDT" } }
  ],
  connectionRef: "journal_conn_active",
  activeImportGeneration: "active_generation"
});
const stagedRetryPlan = plannerHooks.planJournalCryptoLedgerSnapshot({
  snapshotComplete: true,
  snapshotMode: "incremental_delta",
  imported: [plannerRecord("journal_partial_stage_new", "provider_order_exec_stage_new")],
  existingRows: [
    { id: "journal_active_open_buy", providerExecutionIdentity: sharedBinanceIdentity, journalConnectionRef: "journal_conn_active", importGeneration: "active_generation", data: { symbol: "BTCUSDT" } },
    { id: "journal_partial_stage_new", providerExecutionIdentity: "provider_order_exec_stage_new", journalConnectionRef: "journal_conn_active", importGeneration: "pending_generation", data: { symbol: "ETHUSDT" } }
  ],
  connectionRef: "journal_conn_active",
  activeImportGeneration: "active_generation"
});
assert(
  stagedPartialPlan.retainedActiveRows.length === 1 &&
    stagedPartialPlan.writeImports.length === 1 &&
    stagedRetryPlan.writeImports.length === 0,
  "Executable QA proves partial staging can retain active rows, append new rows, and retry without duplicating same-connection staged executions."
);
const generationStore = new Map();
const activePointer = { generation: "active_generation" };
generationStore.set("active_generation", [{ id: "journal_active_open_buy", symbol: "BTCUSDT" }]);
generationStore.set("pending_generation", [...generationStore.get(activePointer.generation), { id: "journal_partial_stage_new", symbol: "ETHUSDT" }]);
const visibleDuringStaging = generationStore.get(activePointer.generation).map((row) => row.symbol);
activePointer.generation = "pending_generation";
const visibleAfterActivation = generationStore.get(activePointer.generation).map((row) => row.symbol).sort();
assert(
  visibleDuringStaging.join(",") === "BTCUSDT" &&
    visibleAfterActivation.join(",") === "BTCUSDT,ETHUSDT",
  "Executable QA proves readers keep the old active pointer during staging and observe the staged generation only after one pointer activation."
);
const twoConnectionGenerations = [
  { id: "generation_a", connectionRef: "journal_conn_a", syncLockOwner: "owner_a", syncLockUntil: Date.now() + 60_000, stagedAt: Date.now() - 3_600_000 },
  { id: "generation_b", connectionRef: "journal_conn_b", syncLockOwner: "owner_b", syncLockUntil: Date.now() + 60_000, stagedAt: Date.now() - 3_600_000 },
  { id: "generation_a_old", connectionRef: "journal_conn_a", syncLockOwner: "", syncLockUntil: 0, stagedAt: Date.now() - 3_600_000 },
  { id: "generation_a_new", connectionRef: "journal_conn_a", syncLockOwner: "", syncLockUntil: 0, stagedAt: Date.now() - 1_000 }
];
const cleanableForA = twoConnectionGenerations
  .filter((generation) => generation.connectionRef === "journal_conn_a")
  .filter((generation) => generation.syncLockUntil < Date.now() || generation.syncLockOwner === "current_cleanup_owner")
  .filter((generation) => Date.now() - generation.stagedAt >= 15 * 60_000)
  .map((generation) => generation.id);
assert(
  cleanableForA.length === 1 && cleanableForA[0] === "generation_a_old",
  "Executable QA proves abandoned-generation cleanup is connection-scoped, lease-aware, and age-bounded."
);
const buyThenSellFirst = plannerHooks.planJournalCryptoLedgerSnapshot({
  snapshotComplete: true,
  snapshotMode: "complete_replacement",
  imported: [plannerRecord("journal_sync_one_buy", "provider_order_exec_buy_1")],
  existingRows: [],
  connectionRef: "journal_conn_incremental",
  activeImportGeneration: ""
});
const buyThenSellSecond = plannerHooks.planJournalCryptoLedgerSnapshot({
  snapshotComplete: true,
  snapshotMode: "incremental_delta",
  imported: [{ ...plannerRecord("journal_sync_two_sell", "provider_order_exec_sell_1"), side: "sell", ineligibilityReason: "unknown_starting_inventory" }],
  existingRows: buyThenSellFirst.writeImports.map((record) => ({
    id: record.importKey,
    providerExecutionIdentity: record.providerExecutionIdentity,
    providerExecutionIdentities: record.providerExecutionIdentities,
    journalConnectionRef: "journal_conn_incremental",
    importGeneration: "active_generation",
    data: record
  })),
  connectionRef: "journal_conn_incremental",
  activeImportGeneration: "active_generation"
});
assert(
  buyThenSellSecond.retainedActiveRows.length === 1 &&
    buyThenSellSecond.writeImports.length === 1 &&
    buyThenSellSecond.writeImports[0].side === "sell" &&
    buyThenSellSecond.writeImports[0].journalLifecycle === "execution_only",
  "Executable QA proves a buy in sync one and a sell in sync two preserve both execution records without loss, duplication, or a false second open position."
);
const bybitSigned = hooks.bybitSignedGet({
  apiKey: "journal-key",
  apiSecret: "journal-secret",
  params: { symbol: "BTCUSDT", category: "spot" }
});
assert(
  bybitSigned.headers["X-BAPI-API-KEY"] === "journal-key" &&
    bybitSigned.headers["X-BAPI-TIMESTAMP"] &&
    bybitSigned.headers["X-BAPI-RECV-WINDOW"] === "5000" &&
    bybitSigned.headers["X-BAPI-SIGN"] &&
    bybitSigned.query === "category=spot&symbol=BTCUSDT",
  "Executable QA proves Bybit V5 GET auth contains timestamp, key, receive window, sorted query and signature."
);
await hooks.verifyJournalCryptoReadOnlyPermission({
  credential: { exchange: "bybit", apiKey: "journal-sync-mock-key", apiSecret: "journal-sync-mock-secret" },
  transport: hooks.createDeterministicJournalCryptoFakeTransport()
});
await assertRejects(
  () => hooks.verifyJournalCryptoReadOnlyPermission({
    credential: { exchange: "bybit", apiKey: "journal-sync-writer-key", apiSecret: "journal-sync-mock-secret" },
    transport: hooks.createDeterministicJournalCryptoFakeTransport()
  }),
  /permission_rejected/,
  "Executable QA rejects Bybit readOnly 0/write-capable keys while allowing legitimate read-only permission arrays."
);
await assertRejects(
  () => hooks.verifyJournalCryptoReadOnlyPermission({
    credential: { exchange: "bybit", apiKey: "journal-sync-bad-key", apiSecret: "journal-sync-mock-secret" },
    transport: hooks.createDeterministicJournalCryptoFakeTransport()
  }),
  /permission_rejected/,
  "Executable QA rejects nonzero Bybit retCode responses."
);
await hooks.verifyJournalCryptoReadOnlyPermission({
  credential: { exchange: "binance", apiKey: "journal-sync-mock-key", apiSecret: "journal-sync-mock-secret" },
  transport: hooks.createDeterministicJournalCryptoFakeTransport()
});
for (const flag of ["enableFixApiTrade", "enablePortfolioMarginTrading", "enableSpotAndMarginTrading"]) {
  await assertRejects(
    () => hooks.verifyJournalCryptoReadOnlyPermission({
      credential: { exchange: "binance", apiKey: "reader", apiSecret: "secret" },
      transport: async (request) => request.url.includes("/sapi/v1/account/apiRestrictions")
        ? { status: 200, body: { enableReading: true, enableSpotAndMarginTrading: false, enableWithdrawals: false, enableInternalTransfer: false, permitsUniversalTransfer: false, enableFutures: false, enableMargin: false, enableVanillaOptions: false, enableFixApiTrade: false, enablePortfolioMarginTrading: false, [flag]: true } }
        : { status: 200, body: [] }
    }),
    /permission_rejected/,
    `Executable QA rejects Binance mutation-capable permission ${flag}.`
  );
}
await assertRejects(
  () => hooks.verifyJournalCryptoReadOnlyPermission({
    credential: { exchange: "binance", apiKey: "reader", apiSecret: "secret" },
    transport: async () => ({ status: 200, body: { enableReading: true } })
  }),
  /permission_rejected/,
  "Executable QA fails closed on malformed or ambiguous Binance permission responses."
);

const goodBinanceUrl = "https://api.binance.com/api/v3/myTrades?symbol=BTCUSDT&startTime=1000&endTime=2000&limit=100&recvWindow=5000&timestamp=3000&signature=abc";
hooks.assertBinanceMyTradesRequestShape(goodBinanceUrl);
await assertRejects(
  () => {
    hooks.assertBinanceMyTradesRequestShape(`${goodBinanceUrl}&fromId=1`);
    return Promise.resolve();
  },
  /binance_request_invalid/,
  "Executable QA rejects unsupported Binance fromId plus time-window request shape."
);
await assertRejects(
  () => {
    hooks.assertBinanceMyTradesRequestShape("https://api.binance.com/api/v3/myTrades?symbol=BTCUSDT&startTime=1000&endTime=86402001&limit=100&recvWindow=5000&timestamp=3000&signature=abc");
    return Promise.resolve();
  },
  /binance_request_invalid/,
  "Executable QA rejects Binance history windows larger than 24 hours."
);

let binanceHistoryRequests = 0;
const binanceHistoryUrls = [];
const manyBinanceRows = Array.from({ length: 100 }, (_, index) => ({
  id: index + 1,
  orderId: index + 1000,
  price: "10",
  qty: "1",
  commission: "0.01",
  commissionAsset: "USDT",
  time: Date.now() - 10_000 + index,
  isBuyer: true
}));
await hooks.fetchJournalCryptoHistory({
  credential: { exchange: "binance", apiKey: "reader", apiSecret: "secret" },
  symbols: ["BTCUSDT"],
  accountLabel: "QA",
  connectionIdentity: "qa_conn_binance_pages",
  transport: async (request) => {
    if (request.url.includes("/api/v3/myTrades")) {
      binanceHistoryRequests += 1;
      binanceHistoryUrls.push(request.url);
      return { status: 200, body: binanceHistoryRequests < 3 ? manyBinanceRows : [] };
    }
    return { status: 200, body: { enableReading: true, enableSpotAndMarginTrading: false, enableWithdrawals: false, enableInternalTransfer: false, permitsUniversalTransfer: false, enableFutures: false, enableMargin: false, enableVanillaOptions: false, enableFixApiTrade: false, enablePortfolioMarginTrading: false } };
  }
});
assert(binanceHistoryRequests > 1 && binanceHistoryRequests <= 180, "Executable QA proves Binance history scans deterministic bounded 24-hour windows instead of reading one page.");
assert(binanceHistoryUrls.every((url) => !url.includes("fromId") && (() => {
  const parsed = new URL(url);
  const start = Number(parsed.searchParams.get("startTime"));
  const end = Number(parsed.searchParams.get("endTime"));
  return Number.isFinite(start) && Number.isFinite(end) && end - start + 1 <= 86_400_000;
})()), "Executable QA proves Binance requests use documented 24-hour-or-smaller time windows and never combine fromId.");
const nearNowWatermarks = Object.fromEntries(["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"].map((symbol) => [symbol, Date.now() - 1_000]));
const partialCrawl = await hooks.fetchJournalCryptoHistory({
  credential: { exchange: "binance", apiKey: "reader", apiSecret: "secret" },
  symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"],
  accountLabel: "QA",
  connectionIdentity: "qa_conn_binance_resumable",
  watermarks: nearNowWatermarks,
  maxProviderRequests: 2,
  transport: async (request) => request.url.includes("/api/v3/myTrades")
    ? { status: 200, body: [] }
    : { status: 200, body: { enableReading: true, enableSpotAndMarginTrading: false, enableWithdrawals: false, enableInternalTransfer: false, permitsUniversalTransfer: false, enableFutures: false, enableMargin: false, enableVanillaOptions: false, enableFixApiTrade: false, enablePortfolioMarginTrading: false } }
});
assert(
  partialCrawl.snapshotComplete === false &&
    partialCrawl.crawlProgress?.complete === false &&
    partialCrawl.crawlProgress.nextSymbolIndex >= 1 &&
    partialCrawl.crawlProgress.boundaryUntil &&
    Object.keys(partialCrawl.crawlProgress.completedWatermarks ?? {}).length > 0 &&
    Object.keys(partialCrawl.watermarks).length === 0,
  "Executable QA proves bounded Binance crawling stores frozen-boundary resumable progress separately from promoted watermarks when the global request budget is exhausted."
);
const resumedCrawl = await hooks.fetchJournalCryptoHistory({
  credential: { exchange: "binance", apiKey: "reader", apiSecret: "secret" },
  symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"],
  accountLabel: "QA",
  connectionIdentity: "qa_conn_binance_resumable",
  watermarks: nearNowWatermarks,
  crawlProgress: partialCrawl.crawlProgress,
  maxProviderRequests: 20,
  transport: async (request) => request.url.includes("/api/v3/myTrades")
    ? { status: 200, body: [] }
    : { status: 200, body: { enableReading: true, enableSpotAndMarginTrading: false, enableWithdrawals: false, enableInternalTransfer: false, permitsUniversalTransfer: false, enableFutures: false, enableMargin: false, enableVanillaOptions: false, enableFixApiTrade: false, enablePortfolioMarginTrading: false } }
});
assert(
  resumedCrawl.snapshotComplete === true &&
    resumedCrawl.crawlProgress?.complete === true &&
    Object.keys(resumedCrawl.watermarks).length === 4,
  "Executable QA proves a later Binance crawl can resume from safe progress, complete the frozen boundary, and promote per-symbol watermarks without exposing partial generations."
);

let bybitHistoryRequests = 0;
const bybitHistory = await hooks.fetchJournalCryptoHistory({
  credential: { exchange: "bybit", apiKey: "journal-sync-mock-key", apiSecret: "journal-sync-mock-secret" },
  symbols: ["DOGEUSDT"],
  accountLabel: "QA",
  connectionIdentity: "qa_conn_bybit_windows",
  transport: hooks.createDeterministicJournalCryptoFakeTransport()
});
assert(bybitHistory.imported.some((record) => record.symbol === "DOGEUSDT") && bybitHistory.imported.every((record) => !record.performanceEligible), "Executable QA proves Bybit pagination runs through cursor pages and unsupported fee cases remain performance-ineligible.");
await hooks.fetchJournalCryptoHistory({
  credential: { exchange: "bybit", apiKey: "journal-sync-mock-key", apiSecret: "journal-sync-mock-secret" },
  symbols: ["BTCUSDT"],
  accountLabel: "QA",
  connectionIdentity: "qa_conn_bybit_count",
  watermarks: { BTCUSDT: Date.now() - 15 * 86_400_000 },
  transport: async (request) => {
    if (request.url.includes("/v5/execution/list")) bybitHistoryRequests += 1;
    return hooks.createDeterministicJournalCryptoFakeTransport()(request);
  }
});
assert(bybitHistoryRequests > 1, "Executable QA proves Bybit iterates bounded seven-day windows even when later windows are empty.");

const fill = (symbol, side, price, qty, fee, feeAsset, time, ref) => ({
  exchange: "binance",
  symbol,
  side,
  price: hooks.fixed(price),
  qty: hooks.fixed(qty),
  fee: fee === null ? null : hooks.fixed(fee),
  feeAsset,
  time,
  rawRef: ref,
  executionFingerprint: `fp_${ref}`,
  providerOrderId: `order_${ref}`,
  providerExecutionId: `exec_${ref}`,
  providerExecutionIdentity: `provider_exec_${ref}`
});
const normalized = hooks.normalizeSpotRoundTrips([
  fill("LINKUSDT", "buy", "24", "20", "0.20", "USDT", 1, "buy-good"),
  fill("LINKUSDT", "sell", "26", "20", "0.20", "USDT", 2, "sell-good"),
  fill("BTCUSDT", "buy", "60000", "0.1", null, "USDT", 3, "buy-missing-fee"),
  fill("BTCUSDT", "sell", "61000", "0.1", "0.1", "USDT", 4, "sell-missing-fee"),
  fill("ETHUSDT", "sell", "3000", "1", "1", "USDT", 5, "unmatched-sell"),
  fill("DOGEUSDT", "buy", "0.1", "1000", "10", "DOGE", 6, "buy-base-fee"),
  fill("DOGEUSDT", "sell", "0.12", "1000", "1", "BNB", 7, "sell-third-fee")
], "QA", "qa_conn_lifecycle");
assert(normalized.some((record) => record.symbol === "LINKUSDT" && record.journalLifecycle === "closed" && !record.performanceEligible && record.realizedPnl === undefined && record.ineligibilityReason === "authoritative_basis_unproven"), "Executable QA proves fill-derived spot round trips stay performance-ineligible without a proven starting-basis/closure checkpoint.");
assert(normalized.some((record) => record.symbol === "BTCUSDT" && !record.performanceEligible && record.ineligibilityReason === "missing_fee"), "Executable QA proves missing fees are unknown, not zero.");
assert(normalized.some((record) => record.symbol === "ETHUSDT" && !record.performanceEligible && record.ineligibilityReason === "unknown_starting_inventory"), "Executable QA proves unknown starting inventory cannot fabricate performance.");
assert(normalized.some((record) => record.symbol === "ETHUSDT" && record.side === "sell" && record.journalLifecycle === "execution_only"), "Executable QA proves unmatched provider sells are execution-only records, not additional open trades.");
assert(normalized.some((record) => record.symbol === "DOGEUSDT" && !record.performanceEligible && record.ineligibilityReason === "unsupported_fee_currency"), "Executable QA proves unsupported fee currency taints the affected symbol.");
assert(normalized.some((record) => record.symbol === "DOGEUSDT" && record.quantity === 990), "Executable QA proves base-asset buy fees reduce received quantity instead of being treated as quote fees.");
const normalizedOtherConnection = hooks.normalizeSpotRoundTrips([
  fill("LINKUSDT", "buy", "24", "20", "0.20", "USDT", 1, "buy-good"),
  fill("LINKUSDT", "sell", "26", "20", "0.20", "USDT", 2, "sell-good")
], "QA", "qa_conn_lifecycle_other");
assert(
  normalized.find((record) => record.symbol === "LINKUSDT")?.importKey !== normalizedOtherConnection[0]?.importKey,
  "Executable QA proves every idempotency key is scoped by opaque Journal connection identity without exposing it in plaintext."
);

includesAll(client, ["journal-crypto-sync-panel", "Read-only crypto history", "Copier setup and practice results stay separate", "/api/student/journal/crypto-sync", "Connect read-only", "Sync now", "Disconnect", "journal-sync-readiness-state"], "Accepted Journal UI is extended with a compact safe Journal Sync status/setup panel.");
excludesAll(client, ["/api/student/journal/manual-trades", "Manual CRUD", "Add manual trade", "AI Insight"], "Stage 29G keeps manual CRUD and AI Insight out of /app/journal.");

includesAll(rules, ["journal_crypto_keys/{workspaceId}/students/{studentId}/connections/{connectionId}", "journal_crypto_keys/{workspaceId}/students/{studentId}/connections/{connectionId}/versions/{versionId}", "journal_crypto_connections/{documentId}", "journal_crypto_sync_runs/{documentId}", "journal_crypto_import_records/{documentId}", "journal_crypto_import_generations/{generationId}", "match /entries/{entryId}", "journal_crypto_credential_cleanup_tasks/{documentId}", "allow read, write: if false"], "Firestore rules deny direct browser access to Journal Sync credential/version/cleanup/connection/run/import generation paths.");

includesAll(`${browser}\n${browserHelpers}`, ["Crypto Journal Sync is independent and displays provider-confirmed history safely", "clearCryptoJournalSyncFixtures", "Connect read-only", "Sync now", "Disconnect", "journalSyncConfigured: true", "providerStatus: \"filled\"", "status: \"open\"", "closedTrades: 0", "netPnl: 0", "clearConnectedJournalFixtures"], "Browser coverage uses real UI/API connect, sync, second sync, reload, disconnect, conservative imported-fill eligibility, and cleanup for dedicated Journal Sync state.");
excludesAll(browser, ["installCryptoJournalSyncFixtures"], "Browser test no longer inserts completed Journal Sync connection/history rows directly.");
includesAll(`${browser}\n${browserHelpers}`, ["/api/student/journal/manual-trades", "apiSecret|apiKey|providerPayload|vaultRef|workspaceId|studentId|sourceRecordId"], "Browser coverage guards against manual-trade calls and browser-visible secret/internal fields.");

includesAll(repositoryEmulatorQa, [
  "assertEmulatorAvailable",
  "loadTsModule(\"src/lib/journal/crypto-journal-sync-repository.ts\")",
  "createStudentJournalCryptoConnection(actor",
  "syncStudentJournalCryptoConnection(actor",
  "disconnectStudentJournalCryptoConnection(actor",
  "makeFakeVault",
  "testConcurrentFirstTimeCreateSerializesSameLogicalConnection",
  "testFirstTimeMarkerDriftFailsClosedAndDiscardsOnlyCreatedVersion",
  "testConcurrentFirstTimeCreatesRespectConnectionLimit",
  "testExpiredFirstCreatePlaceholderRecoversSafely",
  "testActiveSyncReplacementRace",
  "testSameKeySecretRotationRejectedDuringSync",
  "testReplacementFirstBlocksSyncBeforePendingSecretLoad",
  "testRealLocalVaultPinnedVersionEnforcement",
  "testRealLocalVaultRejectedVersionStates",
  "testConcurrentSameKeySecretReplacements",
  "testSuccessfulReplacementRetiresPreviousVersion",
  "testFailedReplacementDiscardsAttemptOnly",
  "testFailedReplacementDiscardFailureCreatesTargetedCleanupTask",
  "testKeyedMutationNoOpAndChangedSecretReplacement",
  "testRetirementFailureCreatesRetryableCleanupTask",
  "testCredentialCleanupDueQueryOrderingAndStarvation",
  "testProductionOverviewProcessesCredentialCleanupWithoutExposingIt",
  "testConcurrentCleanupWorkersClaimOneRetirement",
  "testCleanupNeverRetiresActiveCredentialAndFinalFailureIsBounded",
  "testCredentialCleanupChangedActiveMarkerBlocksBeforeVaultCall",
  "testCredentialReplacementAndSymbolReset",
  "testFailedStagingAndPointerVisibility",
  "testDisconnectDuringSync",
  "testConcurrentConnections",
  "testRepeatedEightSymbolCrawl",
  "testBuyThenSellExecutionOnlyIncremental",
  "testCopiedDedupeWithActualGeneration",
  "Firestore emulator is required",
  "atomically create a verifying placeholder",
  "competing first-time create",
  "prevents the losing first-time create from storing another credential version",
  "activates exactly one first-time connection",
  "fails closed when vault write and final activation observe different first-time credential markers",
  "preserves the Journal Crypto connection limit under concurrent first-time creates",
  "recovers an expired abandoned first-create placeholder",
  "rejects credential replacement while a valid sync lease exists",
  "rejects same API-key secret rotation while a valid sync lease exists",
  "rejects sync start while credential replacement owns a valid configuration lock",
  "does not load pending replacement secret material",
  "load exactly the credential version captured when the sync lease was acquired",
  "rejects stale or mismatched credential version markers",
  "refuses an old-marker sync after replacement writes a pending version",
  "rejects retired credential versions",
  "rejects discarded credential versions",
  "rejects revoked credential versions",
  "prevents two concurrent same-key secret replacements from both proceeding",
  "retires the previous credential version only afterward",
  "discards only the failed replacement version",
  "targeted discard_failed_replacement cleanup task",
  "discards a failed replacement version with discardVersion only",
  "same credentials as a no-op through a server-keyed mutation identifier",
  "changed API secret as a credential replacement",
  "do not store raw secrets or deterministic unkeyed secret hashes",
  "creates exactly one targeted retire_previous_version cleanup task",
  "production overview path processes a due credential cleanup batch",
  "queries only due retryable tasks",
  "processes due work oldest-first",
  "bounded batch limit",
  "owner-token lease so concurrent production invocations retire a task once",
  "rechecks the active credential marker before the vault call",
  "blocks an active credential target and never retires it",
  "bounded final-failed support state",
  "dedupes repeated failures",
  "later retires only the old credential version",
  "replacement retires active/pending generations",
  "selected-symbol changes as sync configuration changes",
  "completed watermarks only after every selected symbol reaches the frozen boundary",
  "without losing either execution or labeling the sell as another open trade"
], "Stage 29G QA requires Firestore-backed exported repository lifecycle tests for active-sync replacement races, credential/symbol replacement, chunk failure, pointer visibility, simultaneous connections, disconnect, repeated crawling, copied dedupe, and execution-only sells.");

includesAll(docs, [
  "Stage 29G",
  "Crypto Journal Sync",
  "TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF",
  "Journal-only crypto connection",
  "Binance",
  "Bybit",
  "read-only",
  "<=24-hour",
  "without combining `fromId`",
  "enableFixApiTrade",
  "enablePortfolioMarginTrading",
  "performance-ineligible",
  "starting-basis/closure checkpoint",
  "base-asset fees reduce received quantity",
  "per-connection snapshot reconciliation",
  "provider execution identities",
  "global provider request budget",
  "watermarks",
  "Firestore write chunks below 500",
  "Complete replacement snapshots and incremental delta syncs",
  "Empty successful incremental syncs retain existing history",
  "generation-specific import entries",
  "active generation pointer",
  "readers query the active generation",
  "pointer flips only after every staging chunk succeeds",
  "abandoned staging generation cleanup is connection-scoped, lease-aware, and age-bounded",
  "crawl progress",
  "frozen crawl boundary",
  "per-symbol completed watermarks",
  "credential replacement resets or retires active and pending imported history",
  "incomplete snapshots are marked partial",
  "copied buy plus provider-manual sell",
  "execution-only",
  "sync work timeout shorter than the lease",
  "Secret Manager version pinning",
  "exact credential version marker",
  "server-keyed credential mutation identifier",
  "retryable cleanup task",
  "preserves the previous working credential",
  "fake provider transport hard-fails in production",
  "Stage 29H remains unstarted"
], "Stage 29G docs record the new handoff, documented Binance request shape, permission boundaries, conservative performance basis, dedupe/reconciliation, production fake-provider block, and unstarted Stage 29H.");
excludesAll(docs, ["Stage 29G owner accepted", "Stage 29H started"], "Docs do not overclaim owner acceptance or begin Stage 29H.");

const repositoryQaResult = spawnSync(process.execPath, ["scripts/qa-stage29g-repository-emulator.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});
assert(repositoryQaResult.status === 0, "Stage 29G repository emulator QA passed as part of npm run stage29g:qa.");

console.log("Stage 29G Crypto Journal Sync QA passed.");
