import "server-only";

import { createHash, createHmac } from "node:crypto";
import { createSourceMeta } from "@/lib/admin/admin-mappers";
import {
  discardJournalCryptoCredentialVersion,
  loadJournalCryptoCredential,
  retireJournalCryptoCredentialVersion,
  revokeJournalCryptoCredential,
  storeJournalCryptoCredential
} from "@/lib/crypto-execution/credential-vault";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import {
  createDeterministicJournalCryptoFakeTransport,
  fetchJournalCryptoHistory,
  JOURNAL_CRYPTO_MAX_RECORDS,
  validateJournalCryptoSymbols,
  verifyJournalCryptoReadOnlyPermission,
  type JournalCryptoCrawlProgress,
  type JournalCryptoProviderTransport,
  type NormalizedCryptoHistoryRecord
} from "@/lib/journal/crypto-journal-provider-adapters";
import {
  chunkJournalCryptoFirestoreWrites,
  planJournalCryptoLedgerSnapshot,
  type JournalCryptoExistingLedgerRow,
  type JournalCryptoSnapshotMode
} from "@/lib/journal/crypto-journal-sync-planner";
import type {
  JournalCryptoConnectionSummary,
  JournalCryptoExchange,
  JournalCryptoSyncFailureCategory
} from "@/types/journal-workspace";

const CONNECTION_LIMIT = 8;
const ACCOUNT_LABEL_MAX = 48;
const SYNC_LOCK_MS = 300_000;
const SYNC_MAX_PROVIDER_WORK_MS = 240_000;
const SYNC_COOLDOWN_MS = 5_000;
const CONFIG_LOCK_MS = 300_000;
const FIRESTORE_WRITE_CHUNK_LIMIT = 450;
const ABANDONED_GENERATION_MIN_AGE_MS = 15 * 60_000;
const ABANDONED_GENERATION_CLEANUP_LIMIT = 5;
const CREDENTIAL_CLEANUP_TASK_LIMIT = 5;
const CREDENTIAL_CLEANUP_LOCK_MS = 120_000;

type JournalCryptoCredentialCleanupAction = "discard_failed_replacement" | "retire_previous_version";

type JournalCryptoCredentialIdentityInput = {
  workspaceId: string;
  studentId: string;
  connectionId: string;
  credentialVersionMarker?: string;
};

type JournalCryptoCredentialPayload = {
  apiKey: string;
  apiSecret: string;
  exchange: "binance" | "bybit";
  purpose?: "journal_crypto_history";
  credentialVersionMarker?: string;
};

type JournalCryptoCredentialVaultDependencies = {
  store: typeof storeJournalCryptoCredential;
  load: (input: JournalCryptoCredentialIdentityInput) => Promise<JournalCryptoCredentialPayload>;
  revoke: typeof revokeJournalCryptoCredential;
  discardVersion: typeof discardJournalCryptoCredentialVersion;
  retireVersion: typeof retireJournalCryptoCredentialVersion;
};

type JournalCryptoRepositoryDependencies = {
  transport?: JournalCryptoProviderTransport;
  vault?: Partial<JournalCryptoCredentialVaultDependencies>;
  commitWrites?: typeof commitBoundedWrites;
};

function nowIso() {
  return new Date().toISOString();
}

function safeString(value: unknown, maxLength = 80) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function safeExchange(value: unknown): JournalCryptoExchange {
  if (value === "binance" || value === "bybit") return value;
  throw new AdminApiError(400, "journal_crypto_exchange_invalid", "Choose Binance or Bybit for Journal Sync.");
}

function safeConnectionRef(value: string) {
  return `journal_conn_${createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

function credentialAccountFingerprint(exchange: JournalCryptoExchange, apiKey: string) {
  return `journal_credential_${createHash("sha256")
    .update([exchange, apiKey].join("|"))
    .digest("hex")
    .slice(0, 32)}`;
}

function credentialMutationHmacKey() {
  const key = process.env.JOURNAL_CRYPTO_CREDENTIAL_MUTATION_HMAC_KEY?.trim() ||
    (process.env.NODE_ENV === "production"
      ? ""
      : process.env.CRYPTO_CREDENTIAL_LOCAL_ENCRYPTION_KEY?.trim() ||
        (process.env.JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER === "true"
          ? "tradehub-local-journal-crypto-mutation-key-for-emulator-only"
          : ""));
  if (!key || key.length < 32) {
    throw new AdminApiError(
      503,
      "journal_crypto_credential_mutation_key_unavailable",
      "Journal Sync credential comparison is unavailable."
    );
  }
  return key;
}

function credentialMutationIdentifier(exchange: JournalCryptoExchange, apiKey: string, apiSecret: string) {
  return `journal_credential_mutation_${createHmac("sha256", credentialMutationHmacKey())
    .update([exchange, apiKey, apiSecret].join("|"))
    .digest("hex")
    .slice(0, 40)}`;
}

function selectedSymbolsKey(symbols: string[]) {
  return [...symbols].map((symbol) => safeString(symbol, 16).toUpperCase()).filter(Boolean).sort().join("|");
}

function lockIsValid(value: unknown, now = Date.now()) {
  const parsed = Date.parse(typeof value === "string" ? value : "");
  return Number.isFinite(parsed) && parsed > now;
}

function defaultVaultDependencies(): JournalCryptoCredentialVaultDependencies {
  return {
    store: storeJournalCryptoCredential,
    load: loadJournalCryptoCredential,
    revoke: revokeJournalCryptoCredential,
    discardVersion: discardJournalCryptoCredentialVersion,
    retireVersion: retireJournalCryptoCredentialVersion
  };
}

function resolveRepositoryDependencies(
  dependencies?: JournalCryptoProviderTransport | JournalCryptoRepositoryDependencies
) {
  const provided = typeof dependencies === "function" ? { transport: dependencies } : dependencies ?? {};
  const defaults = defaultVaultDependencies();
  return {
    transport: defaultSyncTransport(provided.transport),
    vault: {
      ...defaults,
      ...(provided.vault ?? {})
    },
    commitWrites: provided.commitWrites ?? commitBoundedWrites
  };
}

function importGenerationFor(connectionId: string) {
  return `journal_import_${createHash("sha256").update(`${connectionId}:${Date.now()}`).digest("hex").slice(0, 16)}`;
}

function connectionIdFor(actor: VerifiedStudent, exchange: JournalCryptoExchange, label: string) {
  return `journal_crypto_${createHash("sha256")
    .update([actor.workspaceId, actor.studentId, exchange, label].join("|"))
    .digest("hex")
    .slice(0, 28)}`;
}

function assertSyncEnabled() {
  if (process.env.JOURNAL_CRYPTO_SYNC_ENABLED !== "true" &&
    process.env.JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER !== "true") {
    throw new AdminApiError(
      503,
      "journal_crypto_sync_disabled",
      "Journal Sync is not enabled for external provider checks yet."
    );
  }
}

function defaultSyncTransport(transport?: JournalCryptoProviderTransport) {
  if (process.env.NODE_ENV === "production" && process.env.JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER === "true") {
    throw new AdminApiError(
      503,
      "journal_crypto_fake_provider_blocked",
      "Journal Sync fake provider is unavailable in production."
    );
  }
  return transport ?? (process.env.JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER === "true"
    ? createDeterministicJournalCryptoFakeTransport()
    : undefined);
}

function studentPath(actor: VerifiedStudent) {
  return `workspaces/${actor.workspaceId}/students/${actor.studentId}`;
}

function journalCryptoCredentialRefPath(actor: VerifiedStudent, connectionId: string) {
  return `journal_crypto_keys/${actor.workspaceId}/students/${actor.studentId}/connections/${connectionId}`;
}

function journalCryptoGenerationPath(actor: VerifiedStudent, importGeneration: string) {
  return `${studentPath(actor)}/journal_crypto_import_generations/${importGeneration}`;
}

function journalCryptoGenerationEntriesPath(actor: VerifiedStudent, importGeneration: string) {
  return `${journalCryptoGenerationPath(actor, importGeneration)}/entries`;
}

function sanitizeCrawlProgress(value: unknown): JournalCryptoCrawlProgress | null {
  const record = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const exchange = record.exchange === "bybit" ? "bybit" : record.exchange === "binance" ? "binance" : null;
  const boundaryUntil = typeof record.boundaryUntil === "number" && Number.isFinite(record.boundaryUntil)
    ? Math.max(0, Math.floor(record.boundaryUntil))
    : Date.now();
  const completedWatermarks = typeof record.completedWatermarks === "object" && record.completedWatermarks !== null
    ? Object.fromEntries(Object.entries(record.completedWatermarks as Record<string, unknown>)
        .map(([symbol, value]) => [safeString(symbol, 16).toUpperCase(), Number(value)] as const)
        .filter(([symbol, value]) => Boolean(symbol) && Number.isFinite(value) && value > 0)
        .slice(0, CONNECTION_LIMIT))
    : {};
  const nextSymbolIndex = typeof record.nextSymbolIndex === "number" && Number.isFinite(record.nextSymbolIndex)
    ? Math.max(0, Math.min(Math.floor(record.nextSymbolIndex), CONNECTION_LIMIT - 1))
    : 0;
  const completedSymbolCount = typeof record.completedSymbolCount === "number" && Number.isFinite(record.completedSymbolCount)
    ? Math.max(0, Math.min(Math.floor(record.completedSymbolCount), CONNECTION_LIMIT))
    : 0;
  const totalSymbolCount = typeof record.totalSymbolCount === "number" && Number.isFinite(record.totalSymbolCount)
    ? Math.max(0, Math.min(Math.floor(record.totalSymbolCount), CONNECTION_LIMIT))
    : 0;
  if (!exchange) return null;
  return {
    exchange,
    boundaryUntil,
    completedWatermarks,
    nextSymbolIndex,
    completedSymbolCount,
    totalSymbolCount,
    complete: record.complete === true,
    updatedAt: typeof record.updatedAt === "string" ? safeString(record.updatedAt, 40) : nowIso()
  };
}

function assertSyncWorkWithinLease(startedAtMs: number) {
  if (Date.now() - startedAtMs > SYNC_MAX_PROVIDER_WORK_MS) {
    throw new AdminApiError(
      503,
      "journal_crypto_sync_work_timeout",
      "Journal Sync reached its bounded processing window. Run sync again to continue safely."
    );
  }
}

async function recordJournalCryptoCredentialCleanupRequired(
  actor: VerifiedStudent,
  connectionId: string,
  reason: string,
  cleanupAction?: JournalCryptoCredentialCleanupAction,
  targetCredentialVersionMarker = "",
  activeCredentialVersionMarker = ""
) {
  const { db } = getFirebaseAdminClients();
  if (targetCredentialVersionMarker && cleanupAction) {
    const cleanupId = `journal_cleanup_${createHash("sha256")
      .update(`${connectionId}:${cleanupAction}:${targetCredentialVersionMarker}`)
      .digest("hex")
      .slice(0, 32)}`;
    const taskRef = db.doc(`${studentPath(actor)}/journal_crypto_credential_cleanup_tasks/${cleanupId}`);
    const timestamp = nowIso();
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(taskRef);
      const existing = snapshot.data() ?? {};
      transaction.set(taskRef, {
        cleanupAction,
        connectionId,
        connectionRef: safeConnectionRef(connectionId),
        targetCredentialVersionMarker,
        activeCredentialVersionMarker: safeString(activeCredentialVersionMarker, 240) || null,
        status: existing.status === "resolved" ? "resolved" : "retry_scheduled",
        reason: safeString(reason, 80) || "credential_cleanup_failed",
        safeFailureCategory: safeString(reason, 80) || "credential_cleanup_failed",
        attemptCount: typeof existing.attemptCount === "number" ? Math.max(0, Math.floor(existing.attemptCount)) : 0,
        nextAttemptAt: existing.status === "resolved" ? null : timestamp,
        safeMessage: "Journal Sync credential cleanup is queued for support-safe retry.",
        createdAt: typeof existing.createdAt === "string" ? existing.createdAt : timestamp,
        updatedAt: timestamp
      }, { merge: true });
    });
    return;
  }
  const cleanupId = `journal_cleanup_${createHash("sha256").update(`${connectionId}:${Date.now()}`).digest("hex").slice(0, 16)}`;
  await db.doc(`${studentPath(actor)}/journal_crypto_cleanup_records/${cleanupId}`).set({
    connectionRef: safeConnectionRef(connectionId),
    status: "cleanup_required",
    reason: safeString(reason, 80) || "credential_cleanup_failed",
    safeMessage: "Journal Sync credential cleanup needs support review.",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }, { merge: true });
}

function safeCredentialCleanupAction(value: unknown): JournalCryptoCredentialCleanupAction | null {
  if (value === "discard_failed_replacement" || value === "retire_previous_version") return value;
  return null;
}

export async function processStudentJournalCryptoCredentialCleanupTasks(
  actor: VerifiedStudent,
  dependencies?: JournalCryptoProviderTransport | JournalCryptoRepositoryDependencies
) {
  const resolvedDependencies = resolveRepositoryDependencies(dependencies);
  const { db } = getFirebaseAdminClients();
  const now = Date.now();
  const workerOwner = `cleanup_${now}_${createHash("sha256")
    .update([actor.workspaceId, actor.studentId, String(now), Math.random().toString(36)].join("|"))
    .digest("hex")
    .slice(0, 12)}`;
  const snapshot = await db.collection(`${studentPath(actor)}/journal_crypto_credential_cleanup_tasks`)
    .where("status", "==", "retry_scheduled")
    .where("nextAttemptAt", "<=", new Date(now).toISOString())
    .orderBy("nextAttemptAt", "asc")
    .limit(CREDENTIAL_CLEANUP_TASK_LIMIT)
    .get();
  let resolvedCount = 0;
  let failedCount = 0;

  for (const taskDoc of snapshot.docs) {
    const claimed = await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(taskDoc.ref);
      const task = fresh.data() ?? {};
      const status = safeString(task.status, 40);
      if (status !== "retry_scheduled") return null;
      const nextAttemptAt = Date.parse(typeof task.nextAttemptAt === "string" ? task.nextAttemptAt : "");
      if (Number.isFinite(nextAttemptAt) && nextAttemptAt > Date.now()) return null;
      if (lockIsValid(task.cleanupLockUntil) && task.cleanupLockOwner !== workerOwner) return null;
      transaction.set(taskDoc.ref, {
        status: "processing",
        cleanupLockOwner: workerOwner,
        cleanupLockUntil: new Date(Date.now() + CREDENTIAL_CLEANUP_LOCK_MS).toISOString(),
        updatedAt: nowIso()
      }, { merge: true });
      return task;
    });
    if (!claimed) continue;

    const task = claimed;
    const cleanupAction = safeCredentialCleanupAction(task.cleanupAction);
    const targetCredentialVersionMarker = safeString(task.targetCredentialVersionMarker, 240);
    const expectedConnectionId = safeString(task.connectionId, 96);
    const connectionRef = safeString(task.connectionRef, 40);
    const connectionDoc = connectionRef ? await resolveConnectionDoc(actor, connectionRef) : null;
    const activeMarker = safeString(connectionDoc?.data()?.credentialVersionMarker, 240);
    const expectedActiveMarker = safeString(task.activeCredentialVersionMarker, 240);
    if (!cleanupAction ||
      !targetCredentialVersionMarker ||
      !connectionDoc ||
      (expectedConnectionId && connectionDoc.id !== expectedConnectionId) ||
      targetCredentialVersionMarker === activeMarker ||
      (expectedActiveMarker && expectedActiveMarker !== activeMarker)) {
      await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(taskDoc.ref);
        const freshTask = fresh.data() ?? {};
        if (freshTask.cleanupLockOwner !== workerOwner) return;
        transaction.set(taskDoc.ref, {
          status: "blocked",
          cleanupLockOwner: null,
          cleanupLockUntil: null,
          safeFailureCategory: targetCredentialVersionMarker === activeMarker
            ? "cleanup_target_is_active"
            : expectedActiveMarker && expectedActiveMarker !== activeMarker
              ? "cleanup_connection_changed"
              : expectedConnectionId && connectionDoc && connectionDoc.id !== expectedConnectionId
                ? "cleanup_connection_mismatch"
                : !cleanupAction
                  ? "cleanup_action_invalid"
              : "cleanup_target_invalid",
          nextAttemptAt: null,
          safeMessage: "Journal Sync credential cleanup was blocked safely.",
          updatedAt: nowIso()
        }, { merge: true });
      });
      failedCount += 1;
      continue;
    }

    try {
      const preVaultCheck = await db.runTransaction(async (transaction) => {
        const freshTaskSnapshot = await transaction.get(taskDoc.ref);
        const freshTask = freshTaskSnapshot.data() ?? {};
        const freshConnectionSnapshot = await transaction.get(connectionDoc.ref);
        const freshConnection = freshConnectionSnapshot.data() ?? {};
        const freshAction = safeCredentialCleanupAction(freshTask.cleanupAction);
        const freshTarget = safeString(freshTask.targetCredentialVersionMarker, 240);
        const freshConnectionId = safeString(freshTask.connectionId, 96);
        const freshExpectedActive = safeString(freshTask.activeCredentialVersionMarker, 240);
        const freshActiveMarker = safeString(freshConnection.credentialVersionMarker, 240);
        if (freshTask.cleanupLockOwner !== workerOwner ||
          !lockIsValid(freshTask.cleanupLockUntil) ||
          freshAction !== cleanupAction ||
          freshTarget !== targetCredentialVersionMarker ||
          (freshConnectionId && freshConnectionId !== connectionDoc.id) ||
          freshTarget === freshActiveMarker ||
          (freshExpectedActive && freshExpectedActive !== freshActiveMarker)) {
          transaction.set(taskDoc.ref, {
            status: "blocked",
            cleanupLockOwner: null,
            cleanupLockUntil: null,
            safeFailureCategory: freshTarget === freshActiveMarker
              ? "cleanup_target_is_active"
              : freshExpectedActive && freshExpectedActive !== freshActiveMarker
                ? "cleanup_connection_changed"
                : "cleanup_target_invalid",
            nextAttemptAt: null,
            safeMessage: "Journal Sync credential cleanup was blocked safely.",
            updatedAt: nowIso()
          }, { merge: true });
          return false;
        }
        return true;
      });
      if (!preVaultCheck) {
        failedCount += 1;
        continue;
      }
      if (cleanupAction === "discard_failed_replacement") {
        await resolvedDependencies.vault.discardVersion({
          secretManagerSecretVersionName: targetCredentialVersionMarker
        });
      } else {
        await resolvedDependencies.vault.retireVersion({
          secretManagerSecretVersionName: targetCredentialVersionMarker
        });
      }
      await db.runTransaction(async (transaction) => {
        const freshTaskSnapshot = await transaction.get(taskDoc.ref);
        const freshTask = freshTaskSnapshot.data() ?? {};
        const freshConnection = connectionDoc ? await transaction.get(connectionDoc.ref) : null;
        const freshActiveMarker = safeString(freshConnection?.data()?.credentialVersionMarker, 240);
        const freshAction = safeCredentialCleanupAction(freshTask.cleanupAction);
        const freshTarget = safeString(freshTask.targetCredentialVersionMarker, 240);
        if (freshTask.cleanupLockOwner !== workerOwner ||
          freshAction !== cleanupAction ||
          freshTarget !== targetCredentialVersionMarker) return;
        if (!targetCredentialVersionMarker || targetCredentialVersionMarker === freshActiveMarker) {
          transaction.set(taskDoc.ref, {
            status: "blocked",
            cleanupLockOwner: null,
            cleanupLockUntil: null,
            safeFailureCategory: "cleanup_target_is_active",
            nextAttemptAt: null,
            safeMessage: "Journal Sync credential cleanup was blocked safely.",
            updatedAt: nowIso()
          }, { merge: true });
          return;
        }
        transaction.set(taskDoc.ref, {
          status: "resolved",
          resolvedAt: nowIso(),
          cleanupLockOwner: null,
          cleanupLockUntil: null,
          nextAttemptAt: null,
          safeFailureCategory: "none",
          safeMessage: "Journal Sync credential cleanup completed.",
          updatedAt: nowIso()
        }, { merge: true });
      });
      resolvedCount += 1;
    } catch {
      const attemptCount = Math.max(0, Math.floor(typeof task.attemptCount === "number" ? task.attemptCount : 0)) + 1;
      const final = attemptCount >= 3;
      await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(taskDoc.ref);
        const freshTask = fresh.data() ?? {};
        if (freshTask.cleanupLockOwner !== workerOwner) return;
        transaction.set(taskDoc.ref, {
          status: final ? "final_failed" : "retry_scheduled",
          cleanupLockOwner: null,
          cleanupLockUntil: null,
          attemptCount,
          nextAttemptAt: final ? null : new Date(Date.now() + Math.min(60_000 * attemptCount, 300_000)).toISOString(),
          safeFailureCategory: cleanupAction === "discard_failed_replacement"
            ? "vault_discard_failed"
            : "vault_retirement_failed",
          safeMessage: final
            ? "Journal Sync credential cleanup needs manual support review."
            : "Journal Sync credential cleanup will retry.",
          updatedAt: nowIso()
        }, { merge: true });
      });
      failedCount += 1;
    }
  }

  return {
    ok: true as const,
    resolvedCount,
    failedCount,
    safeMessage: "Journal Sync credential cleanup retry processed safely."
  };
}

async function readJournalCryptoCredentialVersionMarker({
  actor,
  connectionId,
  fallback
}: {
  actor: VerifiedStudent;
  connectionId: string;
  fallback: string;
}) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc(journalCryptoCredentialRefPath(actor, connectionId)).get();
  const record = snapshot.data() ?? {};
  return safeString(record.credentialVersionMarker, 240) ||
    safeString(record.secretManagerSecretVersionName, 240) ||
    safeString(record.rotatedAt, 80) ||
    safeString(record.updatedAt, 80) ||
    fallback;
}

async function clearConfigLockIfOwned(actor: VerifiedStudent, connectionId: string, lockOwner: string) {
  if (!lockOwner) return;
  const { db } = getFirebaseAdminClients();
  const ref = db.doc(`${studentPath(actor)}/journal_crypto_connections/${connectionId}`);
  await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ref);
    const record = fresh.data() ?? {};
    if (record.credentialReplacementLockOwner !== lockOwner) return;
    transaction.set(ref, {
      credentialReplacementLockOwner: null,
      credentialReplacementLockUntil: null,
      updatedAt: nowIso()
    }, { merge: true });
  });
}

function mapConnection(id: string, record: Record<string, unknown>): JournalCryptoConnectionSummary {
  const importedCount = typeof record.importedCount === "number" && Number.isFinite(record.importedCount)
    ? record.importedCount
    : 0;
  const skippedCount = typeof record.skippedCount === "number" && Number.isFinite(record.skippedCount)
    ? record.skippedCount
    : 0;
  const failureCategory = safeString(record.failureCategory, 48) as JournalCryptoSyncFailureCategory || "none";

  return {
    connectionRef: safeString(record.connectionRef, 40) || safeConnectionRef(id),
    exchange: record.exchange === "bybit" ? "bybit" : "binance",
    accountLabel: safeString(record.accountLabel, ACCOUNT_LABEL_MAX) || "Read-only crypto history",
    status: record.status === "ready" || record.status === "syncing" || record.status === "partial" ||
      record.status === "failed" || record.status === "disconnected"
      ? record.status
      : "verifying",
    selectedSymbols: Array.isArray(record.selectedSymbols)
      ? record.selectedSymbols.map((symbol) => safeString(symbol, 16).toUpperCase()).filter(Boolean).slice(0, 8)
      : [],
    permissionState: record.permissionState === "passed" || record.permissionState === "failed"
      ? record.permissionState
      : "not_checked",
    syncDisabled: record.syncDisabled === true,
    lastAttemptAt: typeof record.lastAttemptAt === "string" ? record.lastAttemptAt : undefined,
    lastSuccessAt: typeof record.lastSuccessAt === "string" ? record.lastSuccessAt : undefined,
    importedCount,
    skippedCount,
    truncated: record.truncated === true,
    failureCategory: failureCategory || "none",
    safeMessage: safeString(record.safeMessage, 180) || "Journal Sync is waiting for a read-only connection."
  };
}

async function resolveConnectionDoc(actor: VerifiedStudent, connectionRefOrId: string) {
  const { db } = getFirebaseAdminClients();
  const cleaned = safeString(connectionRefOrId, 96);
  const basePath = `${studentPath(actor)}/journal_crypto_connections`;
  if (/^journal_crypto_[a-f0-9]{28}$/.test(cleaned)) {
    const direct = await db.doc(`${basePath}/${cleaned}`).get();
    if (direct.exists) return direct;
  }
  if (!/^journal_conn_[a-f0-9]{12}$/.test(cleaned)) return null;
  const snapshot = await db.collection(basePath)
    .where("connectionRef", "==", cleaned)
    .limit(1)
    .get();
  return snapshot.docs[0] ?? null;
}

export async function listStudentJournalCryptoConnectionSummaries(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.collection(`${studentPath(actor)}/journal_crypto_connections`)
    .orderBy("updatedAt", "desc")
    .limit(CONNECTION_LIMIT)
    .get();

  return snapshot.docs.map((doc) => mapConnection(doc.id, doc.data()));
}

export async function listStudentJournalCryptoConnectionImportPointers(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.collection(`${studentPath(actor)}/journal_crypto_connections`)
    .orderBy("updatedAt", "desc")
    .limit(CONNECTION_LIMIT)
    .get();

  return new Map(snapshot.docs.map((doc) => {
    const record = doc.data();
    return [
      safeString(record.connectionRef, 40) || safeConnectionRef(doc.id),
      safeString(record.currentImportGeneration, 80)
    ] as const;
  }));
}

export async function getStudentJournalCryptoSyncOverview(
  actor: VerifiedStudent,
  dependencies?: JournalCryptoProviderTransport | JournalCryptoRepositoryDependencies
) {
  await processStudentJournalCryptoCredentialCleanupTasks(actor, dependencies).catch(() => undefined);
  const connections = await listStudentJournalCryptoConnectionSummaries(actor);
  return {
    ...createSourceMeta("firestore", []),
    ok: true as const,
    generatedAt: nowIso(),
    enabled: process.env.JOURNAL_CRYPTO_SYNC_ENABLED === "true" ||
      process.env.JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER === "true",
    connections,
    supportedExchanges: ["binance", "bybit"] as const,
    supportedSymbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LINKUSDT"],
    safeMessage: connections.length === 0
      ? "Connect a read-only crypto history key when Journal Sync is enabled."
      : "Journal Sync stores normalized confirmed history only."
  };
}

function writeLedgerRecord(record: NormalizedCryptoHistoryRecord, connectionRef: string, importGeneration: string) {
  return {
    journalExecutionFingerprint: record.executionFingerprint,
    providerExecutionIdentity: record.providerExecutionIdentity,
    providerExecutionIdentities: Array.isArray(record.providerExecutionIdentities)
      ? record.providerExecutionIdentities.map((entry) => safeString(entry, 80)).filter(Boolean).slice(0, 8)
      : [safeString(record.providerExecutionIdentity, 80)].filter(Boolean),
    journalConnectionRef: connectionRef,
    importGeneration,
    source: record.source,
    tradeOrigin: record.tradeOrigin,
    assetClass: "crypto",
    symbol: record.symbol,
    side: record.side,
    status: record.providerStatus,
    providerStatus: record.providerStatus,
    journalLifecycle: record.journalLifecycle,
    executionMode: "provider_history",
    environment: "production",
    providerConfirmed: true,
    confirmationState: "provider_confirmed",
    providerClosureConfirmed: record.journalLifecycle === "closed" && record.performanceEligible,
    safeBrokerOrExchangeLabel: record.safeBrokerOrExchangeLabel,
    openedAt: record.openedAt,
    closedAt: record.closedAt ?? null,
    entryPrice: record.entryPrice,
    exitPrice: record.exitPrice ?? null,
    quantity: record.quantity,
    fees: record.fees ?? null,
    realizedPnl: record.performanceEligible ? record.realizedPnl ?? null : null,
    rMultiple: null,
    performanceEligible: record.performanceEligible,
    ineligibilityReason: record.ineligibilityReason ?? null,
    updatedAt: nowIso(),
    createdAt: nowIso()
  };
}

async function commitBoundedWrites(writes: Array<{ path: string; data?: Record<string, unknown>; delete?: boolean }>) {
  const { db } = getFirebaseAdminClients();
  for (const chunk of chunkJournalCryptoFirestoreWrites(writes, FIRESTORE_WRITE_CHUNK_LIMIT)) {
    const batch = db.batch();
    for (const write of chunk) {
      const ref = db.doc(write.path);
      if (write.delete) {
        batch.delete(ref);
      } else if (write.data) {
        batch.set(ref, write.data, { merge: true });
      }
    }
    await batch.commit();
  }
}

async function loadGenerationRows(actor: VerifiedStudent, importGeneration: string) {
  if (!importGeneration) return [];
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.collection(journalCryptoGenerationEntriesPath(actor, importGeneration))
    .orderBy("updatedAt", "desc")
    .limit(JOURNAL_CRYPTO_MAX_RECORDS)
    .get();

  return snapshot.docs.map((entryDoc) => {
    const data = entryDoc.data();
    return {
      id: entryDoc.id,
      providerExecutionIdentity: safeString(data.providerExecutionIdentity, 80),
      providerExecutionIdentities: Array.isArray(data.providerExecutionIdentities)
        ? data.providerExecutionIdentities.map((entry) => safeString(entry, 80)).filter(Boolean).slice(0, 8)
        : [],
      journalConnectionRef: safeString(data.journalConnectionRef, 80),
      importGeneration: safeString(data.importGeneration, 80),
      data
    } satisfies JournalCryptoExistingLedgerRow;
  });
}

async function cleanupJournalCryptoImportGeneration(
  actor: VerifiedStudent,
  importGeneration: string,
  {
    activeGeneration = "",
    connectionRef = "",
    lockOwner = "",
    minAgeMs = ABANDONED_GENERATION_MIN_AGE_MS,
    status = "abandoned"
  }: {
    activeGeneration?: string;
    connectionRef?: string;
    lockOwner?: string;
    minAgeMs?: number;
    status?: "abandoned" | "superseded";
  } = {}
) {
  if (!importGeneration) return;
  const { db } = getFirebaseAdminClients();
  if (importGeneration === activeGeneration) return;
  const generationRef = db.doc(journalCryptoGenerationPath(actor, importGeneration));
  const generationSnapshot = await generationRef.get();
  const generation = generationSnapshot.data() ?? {};
  const generationConnectionRef = safeString(generation.connectionRef, 80);
  if (connectionRef && generationConnectionRef && generationConnectionRef !== connectionRef) return;
  const lockUntil = Date.parse(typeof generation.syncLockUntil === "string" ? generation.syncLockUntil : "");
  const generationLockOwner = safeString(generation.syncLockOwner, 120);
  if (Number.isFinite(lockUntil) && lockUntil > Date.now() && generationLockOwner !== lockOwner) return;
  const stagedAt = Date.parse(typeof generation.stagedAt === "string"
    ? generation.stagedAt
    : typeof generation.createdAt === "string"
      ? generation.createdAt
      : "");
  if (minAgeMs > 0 && Number.isFinite(stagedAt) && Date.now() - stagedAt < minAgeMs) return;
  const entries = await db.collection(journalCryptoGenerationEntriesPath(actor, importGeneration))
    .limit(JOURNAL_CRYPTO_MAX_RECORDS + 50)
    .get();
  await commitBoundedWrites(entries.docs.map((entryDoc) => ({
    path: entryDoc.ref.path,
    delete: true
  })));
  await generationRef.set({
    connectionRef: generationConnectionRef || connectionRef || null,
    status,
    safeMessage: "Journal Sync staging generation was cleaned safely.",
    updatedAt: nowIso()
  }, { merge: true });
}

async function retireUnreferencedJournalCryptoImportGeneration({
  actor,
  connectionId,
  importGeneration,
  connectionRef,
  status
}: {
  actor: VerifiedStudent;
  connectionId: string;
  importGeneration: string;
  connectionRef: string;
  status: "retired" | "superseded";
}) {
  if (!importGeneration) return;
  const { db } = getFirebaseAdminClients();
  const connectionDoc = db.doc(`${studentPath(actor)}/journal_crypto_connections/${connectionId}`);
  const generationDoc = db.doc(journalCryptoGenerationPath(actor, importGeneration));
  await db.runTransaction(async (transaction) => {
    const connectionSnapshot = await transaction.get(connectionDoc);
    const connection = connectionSnapshot.data() ?? {};
    if (safeString(connection.currentImportGeneration, 80) === importGeneration ||
      safeString(connection.pendingImportGeneration, 80) === importGeneration) {
      throw new AdminApiError(
        409,
        "journal_crypto_generation_still_referenced",
        "Journal Sync generation is still referenced and cannot be retired."
      );
    }
    transaction.set(generationDoc, {
      connectionRef,
      status,
      syncLockOwner: null,
      syncLockUntil: null,
      retiredAt: nowIso(),
      updatedAt: nowIso(),
      safeMessage: "Journal Sync generation was retired after pointer verification."
    }, { merge: true });
  });
}

async function cleanupAbandonedJournalCryptoGenerations({
  actor,
  activeGeneration,
  connectionRef,
  lockOwner,
  pendingGeneration
}: {
  actor: VerifiedStudent;
  activeGeneration: string;
  connectionRef: string;
  lockOwner: string;
  pendingGeneration: string;
}) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.collection(`${studentPath(actor)}/journal_crypto_import_generations`)
    .where("status", "==", "staging")
    .where("connectionRef", "==", connectionRef)
    .limit(ABANDONED_GENERATION_CLEANUP_LIMIT)
    .get();
  for (const generationDoc of snapshot.docs) {
    if (generationDoc.id !== activeGeneration && generationDoc.id !== pendingGeneration) {
      await cleanupJournalCryptoImportGeneration(actor, generationDoc.id, {
        activeGeneration,
        connectionRef,
        lockOwner
      });
    }
  }
}

async function clearSyncLockIfOwned({
  actor,
  connectionId,
  lockOwner,
  status,
  failureCategory,
  safeMessage
}: {
  actor: VerifiedStudent;
  connectionId: string;
  lockOwner: string;
  status: "ready" | "partial" | "failed";
  failureCategory: JournalCryptoSyncFailureCategory;
  safeMessage: string;
}) {
  const { db } = getFirebaseAdminClients();
  const ref = db.doc(`${studentPath(actor)}/journal_crypto_connections/${connectionId}`);
  await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ref);
    const record = fresh.data() ?? {};
    if (record.syncLockOwner !== lockOwner) return;
    transaction.set(ref, {
      status,
      failureCategory,
      safeMessage,
      syncLockOwner: null,
      syncLockUntil: null,
      syncCredentialFingerprint: null,
      syncCredentialVersionMarker: null,
      updatedAt: nowIso()
    }, { merge: true });
  });
}

export async function createStudentJournalCryptoConnection(
  actor: VerifiedStudent,
  payload: unknown,
  dependencies?: JournalCryptoProviderTransport | JournalCryptoRepositoryDependencies
) {
  assertSyncEnabled();
  const record = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
  const exchange = safeExchange(record.exchange);
  const selectedSymbols = validateJournalCryptoSymbols(record.selectedSymbols);
  const accountLabel = safeString(record.accountLabel, ACCOUNT_LABEL_MAX) ||
    `${exchange === "binance" ? "Binance" : "Bybit"} read-only history`;
  const apiKey = typeof record.apiKey === "string" ? record.apiKey.trim() : "";
  const apiSecret = typeof record.apiSecret === "string" ? record.apiSecret.trim() : "";

  if (apiKey.length < 8 || apiKey.length > 256 || apiSecret.length < 8 || apiSecret.length > 512) {
    throw new AdminApiError(400, "journal_crypto_credentials_invalid", "Enter a valid read-only API key and secret.");
  }

  const resolvedDependencies = resolveRepositoryDependencies(dependencies);
  const providerTransport = resolvedDependencies.transport;
  const { db } = getFirebaseAdminClients();
  const connectionId = connectionIdFor(actor, exchange, accountLabel);
  const connectionRef = safeConnectionRef(connectionId);
  const credentialRef = db.doc(journalCryptoCredentialRefPath(actor, connectionId));
  const previousCredentialSnapshot = await credentialRef.get();
  const previousCredential = previousCredentialSnapshot.exists ? previousCredentialSnapshot.data() : null;
  const credentialFingerprint = credentialAccountFingerprint(exchange, apiKey);
  const submittedCredentialMutationIdentifier = credentialMutationIdentifier(exchange, apiKey, apiSecret);
  const connectionDoc = db.doc(`${studentPath(actor)}/journal_crypto_connections/${connectionId}`);
  const configLockOwner = `config_${Date.now()}_${createHash("sha256").update(connectionId).digest("hex").slice(0, 8)}`;
  let configLockAcquired = false;
  let credentialWriteRequired = true;
  let previousVersionToRetire = "";
  let activatedCredentialVersion = "";
  let credentialStorageState = "encrypted_reference_ready";

  await db.runTransaction(async (transaction) => {
    const existingConnection = await transaction.get(connectionDoc);
    if (!existingConnection.exists) {
      const currentConnections = await transaction.get(db.collection(`${studentPath(actor)}/journal_crypto_connections`)
        .limit(CONNECTION_LIMIT));
      if (currentConnections.size >= CONNECTION_LIMIT) {
        throw new AdminApiError(409, "journal_crypto_connection_limit_reached", "Journal Sync has reached the safe connection limit.");
      }
      const now = Date.now();
      configLockAcquired = true;
      credentialWriteRequired = true;
      transaction.set(connectionDoc, {
        connectionRef,
        exchange,
        accountLabel,
        selectedSymbols,
        status: "verifying",
        permissionState: "not_checked",
        syncDisabled: false,
        credentialStorageState: "pending_verification",
        credentialFingerprint: null,
        credentialMutationIdentifier: null,
        credentialVersionMarker: null,
        pendingCredentialVersionMarker: null,
        pendingCredentialOwner: configLockOwner,
        failureCategory: "none",
        importedCount: 0,
        skippedCount: 0,
        truncated: false,
        requestCount: 0,
        snapshotComplete: false,
        credentialReplacementLockOwner: configLockOwner,
        credentialReplacementLockUntil: new Date(now + CONFIG_LOCK_MS).toISOString(),
        safeMessage: "Journal Sync configuration is being verified.",
        createdAt: nowIso(),
        updatedAt: nowIso()
      }, { merge: false });
      return;
    }
    const previous = existingConnection.data() ?? {};
    const previousFingerprint = safeString(previous.credentialFingerprint, 80);
    const previousMutationIdentifier = safeString(previous.credentialMutationIdentifier, 96);
    const previousSymbols = Array.isArray(previous.selectedSymbols)
      ? previous.selectedSymbols.map((symbol) => safeString(symbol, 16).toUpperCase()).filter(Boolean)
      : [];
    const credentialChanged = previousFingerprint !== credentialFingerprint ||
      !previousMutationIdentifier ||
      previousMutationIdentifier !== submittedCredentialMutationIdentifier;
    const selectedSymbolsChanged = selectedSymbolsKey(previousSymbols) !== selectedSymbolsKey(selectedSymbols);
    credentialWriteRequired = credentialChanged;
    if (!credentialChanged && !selectedSymbolsChanged) return;
    const now = Date.now();
    if (lockIsValid(previous.syncLockUntil, now)) {
      throw new AdminApiError(
        409,
        "journal_crypto_sync_in_progress",
        "Journal Sync is running. Try credential or symbol changes again after the current sync finishes."
      );
    }
    if (lockIsValid(previous.credentialReplacementLockUntil, now)) {
      throw new AdminApiError(
        409,
        "journal_crypto_config_update_in_progress",
        "Journal Sync configuration is already being updated."
      );
    }
    configLockAcquired = true;
    transaction.set(connectionDoc, {
      status: "verifying",
      credentialReplacementLockOwner: configLockOwner,
      credentialReplacementLockUntil: new Date(now + CONFIG_LOCK_MS).toISOString(),
      pendingCredentialVersionMarker: null,
      pendingCredentialOwner: configLockOwner,
      safeMessage: "Journal Sync configuration is being verified.",
      updatedAt: nowIso()
    }, { merge: true });
  });

  const timestamp = nowIso();
  let credentialVersionMarker = "";

  try {
    await verifyJournalCryptoReadOnlyPermission({
      credential: { apiKey, apiSecret, exchange },
      transport: providerTransport
    });

    if (credentialWriteRequired) {
      const credential = await resolvedDependencies.vault.store({
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        connectionId,
        exchange,
        apiKey,
        apiSecret
      });
      credentialStorageState = credential.storageState;
      credentialVersionMarker = safeString((credential as { credentialVersionMarker?: unknown }).credentialVersionMarker, 240) ||
        await readJournalCryptoCredentialVersionMarker({
          actor,
          connectionId,
          fallback: `${credential.storageState}:${credentialFingerprint}:${timestamp}`
        });
      await db.runTransaction(async (transaction) => {
        const connectionSnapshot = await transaction.get(connectionDoc);
        const connection = connectionSnapshot.data() ?? {};
        const credentialSnapshot = await transaction.get(credentialRef);
        const storedCredential = credentialSnapshot.data() ?? {};
        const storedMarker = safeString(storedCredential.credentialVersionMarker, 240) ||
          safeString(storedCredential.secretManagerSecretVersionName, 240);
        if (connection.credentialReplacementLockOwner !== configLockOwner) {
          throw new AdminApiError(
            409,
            "journal_crypto_config_update_in_progress",
            "Journal Sync configuration ownership changed before the credential could be staged."
          );
        }
        if (storedMarker !== credentialVersionMarker) {
          throw new AdminApiError(
            409,
            "journal_crypto_credential_marker_mismatch",
            "Journal Sync credential storage changed before the update could finish."
          );
        }
        transaction.set(connectionDoc, {
          pendingCredentialVersionMarker: credentialVersionMarker,
          pendingCredentialOwner: configLockOwner,
          updatedAt: nowIso()
        }, { merge: true });
      });
    } else {
      const existingConnectionSnapshot = await connectionDoc.get();
      const existingConnection = existingConnectionSnapshot.data() ?? {};
      credentialStorageState = safeString(existingConnection.credentialStorageState, 80) || credentialStorageState;
      credentialVersionMarker = safeString(existingConnection.credentialVersionMarker, 240) ||
        await readJournalCryptoCredentialVersionMarker({
          actor,
          connectionId,
          fallback: `unchanged:${credentialFingerprint}`
        });
    }

    await db.runTransaction(async (transaction) => {
      const existingConnection = await transaction.get(connectionDoc);
      const previous = existingConnection.data() ?? {};
      const previousFingerprint = safeString(previous.credentialFingerprint, 80);
      const previousMutationIdentifier = safeString(previous.credentialMutationIdentifier, 96);
      const previousSymbols = Array.isArray(previous.selectedSymbols)
        ? previous.selectedSymbols.map((symbol) => safeString(symbol, 16).toUpperCase()).filter(Boolean)
        : [];
      const credentialChanged = existingConnection.exists && (
        previousFingerprint !== credentialFingerprint ||
        !previousMutationIdentifier ||
        previousMutationIdentifier !== submittedCredentialMutationIdentifier
      );
      const selectedSymbolsChanged = existingConnection.exists &&
        selectedSymbolsKey(previousSymbols) !== selectedSymbolsKey(selectedSymbols);
      if (configLockAcquired && previous.credentialReplacementLockOwner !== configLockOwner) {
        throw new AdminApiError(
          409,
          "journal_crypto_config_update_in_progress",
          "Journal Sync configuration ownership changed before the update could finish."
        );
      }
      if (lockIsValid(previous.syncLockUntil)) {
        throw new AdminApiError(
          409,
          "journal_crypto_sync_in_progress",
          "Journal Sync started before the configuration update could finish."
        );
      }
      if (configLockAcquired) {
        if (previous.status !== "verifying" || previous.syncDisabled === true || previous.status === "disconnected") {
          throw new AdminApiError(
            409,
            "journal_crypto_connection_state_changed",
            "Journal Sync connection changed before the configuration update could finish."
          );
        }
        if (credentialWriteRequired && (
          safeString(previous.pendingCredentialVersionMarker, 240) !== credentialVersionMarker ||
          previous.pendingCredentialOwner !== configLockOwner
        )) {
          throw new AdminApiError(
            409,
            "journal_crypto_credential_marker_mismatch",
            "Journal Sync credential storage changed before the update could finish."
          );
        }
      }
      if (credentialWriteRequired) {
        const credentialSnapshot = await transaction.get(credentialRef);
        const storedCredential = credentialSnapshot.data() ?? {};
        const storedMarker = safeString(storedCredential.credentialVersionMarker, 240) ||
          safeString(storedCredential.secretManagerSecretVersionName, 240);
        if (storedMarker !== credentialVersionMarker) {
          throw new AdminApiError(
            409,
            "journal_crypto_credential_marker_mismatch",
            "Journal Sync credential storage changed before the update could finish."
          );
        }
      }
      const shouldResetHistory = credentialChanged || selectedSymbolsChanged || !existingConnection.exists;
      previousVersionToRetire = credentialChanged && credentialWriteRequired
        ? safeString(previous.credentialVersionMarker, 240) ||
          safeString(previousCredential?.secretManagerSecretVersionName, 240)
        : "";
      activatedCredentialVersion = credentialVersionMarker;
      const retiredGenerations = shouldResetHistory
        ? [...new Set([
            safeString(previous.currentImportGeneration, 80),
            safeString(previous.pendingImportGeneration, 80)
          ].filter(Boolean))]
        : [];
      transaction.set(connectionDoc, {
        connectionRef,
        exchange,
        accountLabel,
        selectedSymbols,
        status: "ready",
        permissionState: "passed",
        syncDisabled: false,
        credentialStorageState,
        credentialFingerprint,
        credentialMutationIdentifier: submittedCredentialMutationIdentifier,
        credentialMutationFingerprint: null,
        credentialVersionMarker,
        ...(shouldResetHistory ? {
          currentImportGeneration: null,
          pendingImportGeneration: null,
          crawlProgress: null,
          syncWatermarks: {},
          importedCount: 0,
          skippedCount: 0,
          truncated: false,
          requestCount: 0,
          snapshotComplete: false
        } : {}),
        failureCategory: "none",
        credentialReplacementLockOwner: null,
        credentialReplacementLockUntil: null,
        pendingCredentialVersionMarker: null,
        pendingCredentialOwner: null,
        safeMessage: credentialChanged
          ? "Read-only Journal Sync connection is ready. Previous imported history was retired for the replacement credential."
          : selectedSymbolsChanged
            ? "Read-only Journal Sync connection is ready. Previous imported history was retired for the symbol selection change."
          : "Read-only Journal Sync connection is ready.",
        createdAt: previous.createdAt ?? timestamp,
        updatedAt: timestamp
      }, { merge: true });
      for (const generation of retiredGenerations) {
        transaction.set(db.doc(journalCryptoGenerationPath(actor, generation)), {
          connectionRef,
          status: "retired",
          syncLockOwner: null,
          syncLockUntil: null,
          retiredAt: timestamp,
          updatedAt: timestamp,
          safeMessage: credentialChanged
            ? "Journal Sync generation was retired because the read-only credential changed."
            : "Journal Sync generation was retired because the selected symbols changed."
        }, { merge: true });
      }
    });

    if (previousVersionToRetire && activatedCredentialVersion && previousVersionToRetire !== activatedCredentialVersion) {
      await resolvedDependencies.vault.retireVersion({ secretManagerSecretVersionName: previousVersionToRetire })
        .catch(() => recordJournalCryptoCredentialCleanupRequired(
          actor,
          connectionId,
          "previous_version_retirement_failed",
          "retire_previous_version",
          previousVersionToRetire,
          activatedCredentialVersion
        ));
    }
  } catch (error) {
    if (credentialWriteRequired && previousCredential) {
      const replacementCredentialSnapshot = await credentialRef.get();
      const replacementCredential = replacementCredentialSnapshot.exists ? replacementCredentialSnapshot.data() : null;
      const replacementVersion = safeString(replacementCredential?.secretManagerSecretVersionName, 240) ||
        activatedCredentialVersion ||
        credentialVersionMarker;
      const previousVersion = safeString(previousCredential.secretManagerSecretVersionName, 240) ||
        safeString(previousCredential.rotatedAt, 80) ||
        safeString(previousCredential.updatedAt, 80);
      if (replacementVersion && replacementVersion !== previousVersion) {
        await resolvedDependencies.vault.discardVersion({ secretManagerSecretVersionName: replacementVersion })
          .catch(() => recordJournalCryptoCredentialCleanupRequired(
            actor,
            connectionId,
            "replacement_version_cleanup_failed",
            "discard_failed_replacement",
            replacementVersion,
            previousVersion
          ));
      }
      const ownerSnapshot = await connectionDoc.get();
      if (ownerSnapshot.data()?.credentialReplacementLockOwner === configLockOwner) {
        await credentialRef.set(previousCredential);
      }
    } else if (credentialWriteRequired) {
      if (credentialVersionMarker) {
        await resolvedDependencies.vault.discardVersion({ secretManagerSecretVersionName: credentialVersionMarker })
          .catch(() => recordJournalCryptoCredentialCleanupRequired(
            actor,
            connectionId,
            "metadata_write_failed",
            "discard_failed_replacement",
            credentialVersionMarker
          ));
      } else {
        try {
          await resolvedDependencies.vault.revoke({
            workspaceId: actor.workspaceId,
            studentId: actor.studentId,
            connectionId
          });
        } catch {
          await recordJournalCryptoCredentialCleanupRequired(actor, connectionId, "metadata_write_failed");
        }
      }
    }
    await clearConfigLockIfOwned(actor, connectionId, configLockOwner).catch(() => undefined);
    throw error;
  }

  return getStudentJournalCryptoSyncOverview(actor, resolvedDependencies);
}

export async function syncStudentJournalCryptoConnection(
  actor: VerifiedStudent,
  connectionRefOrId: string,
  dependencies?: JournalCryptoProviderTransport | JournalCryptoRepositoryDependencies
) {
  assertSyncEnabled();
  const resolvedDependencies = resolveRepositoryDependencies(dependencies);
  const { db } = getFirebaseAdminClients();
  const doc = await resolveConnectionDoc(actor, connectionRefOrId);

  if (!doc) {
    throw new AdminApiError(404, "journal_crypto_connection_not_found", "Journal Sync connection was not found.");
  }

  const current = doc.data() ?? {};
  if (current.syncDisabled === true || current.status === "disconnected") {
    throw new AdminApiError(409, "journal_crypto_sync_disabled", "This Journal Sync connection is disconnected.");
  }

  const timestamp = nowIso();
  const lockOwner = `sync_${Date.now()}_${createHash("sha256").update(doc.id).digest("hex").slice(0, 8)}`;
  let lockedConnection: Record<string, unknown> = current;
  let lockedCredentialFingerprint = "";
  let lockedCredentialVersionMarker = "";
  await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(doc.ref);
    const record = fresh.data() ?? {};
    const lockUntil = Date.parse(typeof record.syncLockUntil === "string" ? record.syncLockUntil : "");
    const lastAttempt = Date.parse(typeof record.lastAttemptAt === "string" ? record.lastAttemptAt : "");
    const now = Date.now();
    if (record.syncDisabled === true || record.status === "disconnected") {
      throw new AdminApiError(409, "journal_crypto_sync_disabled", "This Journal Sync connection is disconnected.");
    }
    if (Number.isFinite(lockUntil) && lockUntil > now) {
      throw new AdminApiError(409, "journal_crypto_sync_in_progress", "Journal Sync is already running for this connection.");
    }
    if (lockIsValid(record.credentialReplacementLockUntil, now)) {
      throw new AdminApiError(
        409,
        "journal_crypto_config_update_in_progress",
        "Journal Sync configuration is being updated."
      );
    }
    if (Number.isFinite(lastAttempt) && now - lastAttempt < SYNC_COOLDOWN_MS) {
      throw new AdminApiError(429, "journal_crypto_sync_cooldown", "Journal Sync was just requested. Try again in a moment.");
    }
    lockedCredentialFingerprint = safeString(record.credentialFingerprint, 80);
    lockedCredentialVersionMarker = safeString(record.credentialVersionMarker, 240);
    lockedConnection = record;
    transaction.set(doc.ref, {
      status: "syncing",
      syncLockOwner: lockOwner,
      syncLockUntil: new Date(now + SYNC_LOCK_MS).toISOString(),
      syncCredentialFingerprint: lockedCredentialFingerprint,
      syncCredentialVersionMarker: lockedCredentialVersionMarker,
      lastAttemptAt: timestamp,
      updatedAt: timestamp
    }, { merge: true });
  });

  let stagedImportGeneration = "";

  try {
    const providerWorkStartedAt = Date.now();
    const credential = await resolvedDependencies.vault.load({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId: doc.id,
      credentialVersionMarker: lockedCredentialVersionMarker
    });
    const providerTransport = resolvedDependencies.transport;
    await verifyJournalCryptoReadOnlyPermission({
      credential,
      transport: providerTransport
    });
    assertSyncWorkWithinLease(providerWorkStartedAt);
    const result = await fetchJournalCryptoHistory({
      credential,
      symbols: Array.isArray(lockedConnection.selectedSymbols) ? lockedConnection.selectedSymbols.map(String) : [],
      accountLabel: safeString(lockedConnection.accountLabel, ACCOUNT_LABEL_MAX) || "Read-only crypto history",
      connectionIdentity: doc.id,
      watermarks: typeof lockedConnection.syncWatermarks === "object" && lockedConnection.syncWatermarks !== null
        ? lockedConnection.syncWatermarks as Record<string, number | string>
        : {},
      crawlProgress: sanitizeCrawlProgress(lockedConnection.crawlProgress),
      transport: providerTransport
    });
    assertSyncWorkWithinLease(providerWorkStartedAt);
    const connectionRef = safeConnectionRef(doc.id);
    const activeImportGeneration = safeString(lockedConnection.currentImportGeneration, 80);
    const pendingImportGeneration = safeString(lockedConnection.pendingImportGeneration, 80);
    const snapshotMode: JournalCryptoSnapshotMode = activeImportGeneration ? "incremental_delta" : "complete_replacement";
    const importGeneration = pendingImportGeneration || importGenerationFor(doc.id);
    await cleanupAbandonedJournalCryptoGenerations({
      actor,
      activeGeneration: activeImportGeneration,
      connectionRef,
      lockOwner,
      pendingGeneration: pendingImportGeneration
    });
    const activeGenerationRows = activeImportGeneration
      ? await loadGenerationRows(actor, activeImportGeneration)
      : [];
    const pendingGenerationRows = pendingImportGeneration
      ? await loadGenerationRows(actor, pendingImportGeneration)
      : [];
    const existingRows: JournalCryptoExistingLedgerRow[] = [...activeGenerationRows, ...pendingGenerationRows];
    for (const normalized of result.imported) {
      const identities = Array.from(new Set([
        normalized.providerExecutionIdentity,
        ...(Array.isArray(normalized.providerExecutionIdentities) ? normalized.providerExecutionIdentities : [])
      ].map((entry) => safeString(entry, 80)).filter(Boolean))).slice(0, 8);
      for (const identity of identities) {
        const duplicateSnapshot = await db.collection(`${studentPath(actor)}/account_linked_trade_ledger`)
          .where("providerExecutionIdentity", "==", identity)
          .limit(5)
          .get();
        for (const candidate of duplicateSnapshot.docs) {
          if (!existingRows.some((row) => row.id === candidate.id)) {
            const candidateData = candidate.data();
            existingRows.push({
              id: candidate.id,
              providerExecutionIdentity: safeString(candidateData.providerExecutionIdentity, 80),
              providerExecutionIdentities: Array.isArray(candidateData.providerExecutionIdentities)
                ? candidateData.providerExecutionIdentities.map((entry) => safeString(entry, 80)).filter(Boolean).slice(0, 8)
                : [],
              journalConnectionRef: safeString(candidateData.journalConnectionRef, 80),
              importGeneration: safeString(candidateData.importGeneration, 80)
            });
          }
        }
      }
    }
    const snapshotPlan = planJournalCryptoLedgerSnapshot({
      snapshotComplete: result.snapshotComplete || Boolean(result.imported.length) || Boolean(pendingImportGeneration),
      snapshotMode,
      imported: result.imported,
      existingRows,
      connectionRef,
      activeImportGeneration
    });
    const importedCount = snapshotPlan.writeImports.length;
    const dedupeSkippedCount = snapshotPlan.dedupeSkippedCount;
    const shouldStagePartialGeneration = !result.snapshotComplete &&
      (snapshotPlan.writeImports.length > 0 || snapshotPlan.retainedActiveRows.length > 0 || pendingGenerationRows.length > 0);
    const shouldStageGeneration = result.snapshotComplete && (snapshotPlan.activateGeneration || Boolean(pendingImportGeneration));
    const shouldWriteGeneration = shouldStageGeneration || shouldStagePartialGeneration;
    stagedImportGeneration = shouldWriteGeneration ? importGeneration : "";
    const retainedWrites = shouldWriteGeneration
      ? snapshotPlan.retainedActiveRows.map((row) => ({
          path: `${journalCryptoGenerationEntriesPath(actor, importGeneration)}/${row.id}`,
          data: {
            ...(row.data ?? {}),
            importGeneration,
            updatedAt: nowIso()
          }
        }))
      : [];
    const stagingWrites = shouldWriteGeneration
      ? snapshotPlan.writeImports.map((normalized) => ({
          path: `${journalCryptoGenerationEntriesPath(actor, importGeneration)}/${normalized.importKey}`,
          data: writeLedgerRecord(normalized, connectionRef, importGeneration)
        }))
      : [];
    if (shouldWriteGeneration) {
      await db.doc(journalCryptoGenerationPath(actor, importGeneration)).set({
        connectionRef,
        status: "staging",
        snapshotMode,
        importedCount,
        retainedCount: retainedWrites.length,
        syncLockOwner: lockOwner,
        syncLockUntil: new Date(Date.now() + SYNC_LOCK_MS).toISOString(),
        crawlProgress: result.crawlProgress ?? null,
        stagedAt: nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        safeMessage: "Journal Sync generation is staged until every bounded chunk succeeds."
      }, { merge: true });
    }
    if (retainedWrites.length > 0 || stagingWrites.length > 0) {
      await resolvedDependencies.commitWrites([...retainedWrites, ...stagingWrites]);
      assertSyncWorkWithinLease(providerWorkStartedAt);
    }
    const runRef = db.doc(`${studentPath(actor)}/journal_crypto_sync_runs/${doc.id}_${Date.now()}`);
    await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(doc.ref);
      const connectionState = fresh.data() ?? {};
      if (connectionState.syncLockOwner !== lockOwner) {
        throw new AdminApiError(409, "journal_crypto_sync_in_progress", "Journal Sync ownership changed before import could commit.");
      }
      if (safeString(connectionState.credentialFingerprint, 80) !== lockedCredentialFingerprint ||
        safeString(connectionState.credentialVersionMarker, 240) !== lockedCredentialVersionMarker) {
        throw new AdminApiError(
          409,
          "journal_crypto_connection_changed",
          "Journal Sync connection changed before import could commit."
        );
      }
      if (connectionState.syncDisabled === true || connectionState.status === "disconnected") {
        throw new AdminApiError(409, "journal_crypto_sync_disabled", "This Journal Sync connection is disconnected.");
      }
      if (shouldStageGeneration) {
        transaction.set(db.doc(journalCryptoGenerationPath(actor, importGeneration)), {
          connectionRef,
          status: "active",
          activatedAt: nowIso(),
          syncLockOwner: null,
          syncLockUntil: null,
          crawlProgress: null,
          updatedAt: nowIso(),
          safeMessage: "Journal Sync generation is active."
        }, { merge: true });
      }
      if (shouldStageGeneration && activeImportGeneration && activeImportGeneration !== importGeneration) {
        transaction.set(db.doc(journalCryptoGenerationPath(actor, activeImportGeneration)), {
          connectionRef,
          status: "superseded",
          syncLockOwner: null,
          syncLockUntil: null,
          supersededBy: importGeneration,
          retiredAt: nowIso(),
          updatedAt: nowIso(),
          safeMessage: "Journal Sync generation was superseded after pointer activation."
        }, { merge: true });
      }
      transaction.set(runRef, {
        connectionRef,
        exchange: lockedConnection.exchange === "bybit" ? "bybit" : "binance",
        status: result.snapshotComplete ? "completed" : "partial",
        importedCount,
        retainedCount: snapshotPlan.retainedActiveRows.length,
        skippedCount: result.skippedCount + dedupeSkippedCount,
        truncated: result.truncated,
        requestCount: result.requestCount,
        snapshotComplete: result.snapshotComplete,
        snapshotMode,
        importGeneration: shouldWriteGeneration ? importGeneration : connectionState.currentImportGeneration ?? null,
        pendingImportGeneration: result.snapshotComplete ? null : shouldWriteGeneration ? importGeneration : connectionState.pendingImportGeneration ?? null,
        crawlProgress: result.snapshotComplete ? null : result.crawlProgress ?? connectionState.crawlProgress ?? null,
        failureCategory: result.failureCategory,
        safeMessage: result.safeMessage,
        createdAt: timestamp,
        updatedAt: nowIso()
      });
      transaction.set(doc.ref, {
        status: result.snapshotComplete ? "ready" : "partial",
        lastSuccessAt: result.snapshotComplete ? nowIso() : connectionState.lastSuccessAt ?? null,
        importedCount,
        skippedCount: result.skippedCount + dedupeSkippedCount,
        truncated: result.truncated,
        requestCount: result.requestCount,
        snapshotComplete: result.snapshotComplete,
        currentImportGeneration: shouldStageGeneration ? importGeneration : connectionState.currentImportGeneration ?? null,
        pendingImportGeneration: result.snapshotComplete ? null : shouldWriteGeneration ? importGeneration : connectionState.pendingImportGeneration ?? null,
        crawlProgress: result.snapshotComplete ? null : result.crawlProgress ?? connectionState.crawlProgress ?? null,
        syncWatermarks: result.snapshotComplete ? {
          ...(typeof connectionState.syncWatermarks === "object" && connectionState.syncWatermarks !== null ? connectionState.syncWatermarks : {}),
          ...result.watermarks
        } : connectionState.syncWatermarks ?? {},
        failureCategory: result.failureCategory,
        safeMessage: result.safeMessage,
        syncLockOwner: null,
        syncLockUntil: null,
        syncCredentialFingerprint: null,
        syncCredentialVersionMarker: null,
        updatedAt: nowIso()
      }, { merge: true });
    });
    stagedImportGeneration = "";
    if (shouldStageGeneration && activeImportGeneration && activeImportGeneration !== importGeneration) {
      await retireUnreferencedJournalCryptoImportGeneration({
        actor,
        connectionId: doc.id,
        importGeneration: activeImportGeneration,
        connectionRef,
        status: "superseded"
      }).catch(() => undefined);
    }
  } catch (error) {
    if (stagedImportGeneration && stagedImportGeneration !== safeString(lockedConnection.pendingImportGeneration, 80)) {
      await cleanupJournalCryptoImportGeneration(actor, stagedImportGeneration, {
        connectionRef: safeConnectionRef(doc.id),
        lockOwner,
        minAgeMs: 0,
        status: "abandoned"
      }).catch(() => undefined);
    }
    await clearSyncLockIfOwned({
      actor,
      connectionId: doc.id,
      lockOwner,
      status: "failed",
      failureCategory: error instanceof AdminApiError && error.code.includes("rate_limited")
        ? "rate_limited"
        : "unknown",
      safeMessage: "Journal Sync failed safely. No provider details were exposed."
    });
    throw error;
  }

  return getStudentJournalCryptoSyncOverview(actor, resolvedDependencies);
}

export async function disconnectStudentJournalCryptoConnection(
  actor: VerifiedStudent,
  connectionRefOrId: string,
  dependencies?: JournalCryptoProviderTransport | JournalCryptoRepositoryDependencies
) {
  const resolvedDependencies = resolveRepositoryDependencies(dependencies);
  const doc = await resolveConnectionDoc(actor, connectionRefOrId);

  if (!doc) {
    throw new AdminApiError(404, "journal_crypto_connection_not_found", "Journal Sync connection was not found.");
  }

  await doc.ref.set({
    syncDisabled: true,
    status: "disconnected",
    safeMessage: "Journal Sync is disconnected.",
    updatedAt: nowIso()
  }, { merge: true });

  try {
    await resolvedDependencies.vault.revoke({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId: doc.id
    });
  } catch {
    await recordJournalCryptoCredentialCleanupRequired(actor, doc.id, "disconnect_cleanup_failed");
    await doc.ref.set({
      status: "failed",
      failureCategory: "vault_unavailable",
      safeMessage: "Journal Sync is disabled, but credential cleanup needs support review.",
      updatedAt: nowIso()
    }, { merge: true });
    throw new AdminApiError(
      503,
      "journal_crypto_disconnect_partial",
      "Journal Sync was disabled, but cleanup needs support review."
    );
  }

  return getStudentJournalCryptoSyncOverview(actor, resolvedDependencies);
}
