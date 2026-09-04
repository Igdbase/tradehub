import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import ts from "typescript";

const root = process.cwd();
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || "trade-hub-4d8df";
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||= projectId;
process.env.GCLOUD_PROJECT ||= projectId;
process.env.JOURNAL_CRYPTO_SYNC_ENABLED = "true";
process.env.JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER = "true";
process.env.CRYPTO_CREDENTIAL_STORAGE_MODE ||= "local_encrypted";
process.env.CRYPTO_CREDENTIAL_LOCAL_ENCRYPTION_KEY ||= "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
process.env.JOURNAL_CRYPTO_CREDENTIAL_MUTATION_HMAC_KEY ||= "stage29g-local-emulator-mutation-hmac-key-0001";

const app = getApps()[0] ?? initializeApp({ projectId });
const db = getFirestore(app);
const auth = getAuth(app);

class AdminApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};

async function assertRejects(fn, codePattern, message) {
  try {
    await fn();
  } catch (error) {
    assert(error instanceof Error && codePattern.test(error.code ?? error.message), message);
    return;
  }
  throw new Error(message);
}

const moduleCache = new Map();
function loadTsModule(relativePath) {
  if (moduleCache.has(relativePath)) return moduleCache.get(relativePath);
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText;
  const exports = {};
  const module = { exports };
  const localRequire = (specifier) => {
    if (specifier === "server-only") return {};
    if (specifier === "node:crypto") return crypto;
    if (specifier === "crypto") return crypto;
    if (specifier === "@/lib/firebase/admin-errors") {
      return { AdminApiError, AdminConfigurationError: AdminApiError };
    }
    if (specifier === "@/lib/firebase/admin") {
      return {
        getFirebaseAdminClients: () => ({ app, auth, db }),
        isFirebaseAdminConfigured: () => true
      };
    }
    if (specifier === "@/lib/admin/admin-mappers") {
      return {
        createSourceMeta: (source, warnings = []) => ({
          source,
          sourceLabel: source === "firestore" ? "Firestore live" : "Mock fallback",
          sourceMessage: "Stage 29G repository QA.",
          warnings
        })
      };
    }
    if (specifier === "@/lib/crypto-execution/credential-vault") {
      return {
        storeJournalCryptoCredential: async () => { throw new Error("default vault must be injected in repository QA"); },
        loadJournalCryptoCredential: async () => { throw new Error("default vault must be injected in repository QA"); },
        revokeJournalCryptoCredential: async () => { throw new Error("default vault must be injected in repository QA"); },
        discardJournalCryptoCredentialVersion: async () => undefined,
        retireJournalCryptoCredentialVersion: async () => undefined
      };
    }
    if (specifier === "@google-cloud/secret-manager") {
      return {
        SecretManagerServiceClient: class {
          async createSecret() {}
          async addSecretVersion() { return [{ name: "projects/local/secrets/local/versions/1" }]; }
          async accessSecretVersion() { throw new Error("Secret Manager is not used by local emulator vault tests"); }
          async destroySecretVersion() {}
          async disableSecretVersion() {}
          async deleteSecret() {}
        }
      };
    }
    if (specifier === "@/lib/journal/provider-execution-identity") {
      return loadTsModule("src/lib/journal/provider-execution-identity.ts");
    }
    if (specifier === "@/lib/journal/crypto-journal-provider-adapters") {
      return loadTsModule("src/lib/journal/crypto-journal-provider-adapters.ts");
    }
    if (specifier === "@/lib/journal/crypto-journal-sync-planner") {
      return loadTsModule("src/lib/journal/crypto-journal-sync-planner.ts");
    }
    throw new Error(`Unexpected require in Stage 29G repository QA: ${specifier}`);
  };
  const runner = new Function(
    "require",
    "exports",
    "module",
    "console",
    "Buffer",
    "Date",
    "URL",
    "URLSearchParams",
    "setTimeout",
    "clearTimeout",
    "process",
    "fetch",
    `${compiled}\n//# sourceURL=${relativePath}`
  );
  runner(
    localRequire,
    exports,
    module,
    console,
    Buffer,
    Date,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    process,
    async () => ({ status: 500, headers: new Map(), text: async () => "{}" })
  );
  moduleCache.set(relativePath, module.exports);
  return module.exports;
}

const repository = loadTsModule("src/lib/journal/crypto-journal-sync-repository.ts");
const adapter = loadTsModule("src/lib/journal/crypto-journal-provider-adapters.ts");
const actualVault = loadTsModule("src/lib/crypto-execution/credential-vault.ts");
const { createProviderOrderExecutionIdentity } = loadTsModule("src/lib/journal/provider-execution-identity.ts");

const workspaceId = "stage29g_repo_ws";
let studentCounter = 0;

function actorFor(testName) {
  studentCounter += 1;
  return {
    workspaceId,
    studentId: `stage29g_${testName}_${studentCounter}`,
    uid: `uid_stage29g_${testName}_${studentCounter}`,
    email: `${testName}.${studentCounter}@example.test`
  };
}

function studentBase(actor) {
  return `workspaces/${actor.workspaceId}/students/${actor.studentId}`;
}

function credentialPath(actorLike, connectionId) {
  return `journal_crypto_keys/${actorLike.workspaceId}/students/${actorLike.studentId}/connections/${connectionId}`;
}

function expectedConnectionId(actor, exchange, label) {
  return `journal_crypto_${crypto.createHash("sha256")
    .update([actor.workspaceId, actor.studentId, exchange, label].join("|"))
    .digest("hex")
    .slice(0, 28)}`;
}

async function assertEmulatorAvailable() {
  try {
    await db.collection("stage29g_repository_ping").doc("health").set({ ok: true });
  } catch (error) {
    throw new Error(`Firestore emulator is required for Stage 29G repository QA at ${emulatorHost}. Start emulators before running stage29g:qa. ${error instanceof Error ? error.message : ""}`);
  }
}

async function deleteCollectionShallow(collectionPath) {
  const snapshot = await db.collection(collectionPath).limit(500).get();
  if (snapshot.empty) return;
  for (const chunk of chunks(snapshot.docs, 450)) {
    const batch = db.batch();
    for (const doc of chunk) batch.delete(doc.ref);
    await batch.commit();
  }
}

async function clearActor(actor) {
  const credentialVersions = await db.collectionGroup("versions")
    .where("studentId", "==", actor.studentId)
    .limit(500)
    .get();
  for (const chunk of chunks(credentialVersions.docs, 450)) {
    const batch = db.batch();
    for (const doc of chunk) batch.delete(doc.ref);
    await batch.commit();
  }
  const generations = await db.collection(`${studentBase(actor)}/journal_crypto_import_generations`).limit(100).get();
  for (const generation of generations.docs) {
    await deleteCollectionShallow(`${generation.ref.path}/entries`);
    await generation.ref.delete();
  }
  for (const collection of [
    `${studentBase(actor)}/journal_crypto_connections`,
    `${studentBase(actor)}/account_linked_trade_ledger`,
    `${studentBase(actor)}/journal_crypto_sync_runs`,
    `${studentBase(actor)}/journal_crypto_cleanup_records`,
    `${studentBase(actor)}/journal_crypto_credential_cleanup_tasks`,
    `journal_crypto_keys/${actor.workspaceId}/students/${actor.studentId}/connections`
  ]) {
    await deleteCollectionShallow(collection);
  }
}

async function connectionDocByRef(actor, connectionRef) {
  const snapshot = await db.collection(`${studentBase(actor)}/journal_crypto_connections`)
    .where("connectionRef", "==", connectionRef)
    .limit(1)
    .get();
  const doc = snapshot.docs[0];
  if (!doc) throw new Error(`Missing connection ${connectionRef}`);
  return doc;
}

async function connectionData(actor, connectionRef) {
  const doc = await connectionDocByRef(actor, connectionRef);
  return { id: doc.id, ref: doc.ref, data: doc.data() };
}

async function credentialMetadata(actor, connectionRef) {
  const connection = await connectionData(actor, connectionRef);
  const snapshot = await db.doc(credentialPath(actor, connection.id)).get();
  return { connectionId: connection.id, data: snapshot.data() ?? {} };
}

async function expireCooldown(actor, connectionRef) {
  const connection = await connectionData(actor, connectionRef);
  await connection.ref.set({
    lastAttemptAt: "2026-01-01T00:00:00.000Z",
    syncLockOwner: null,
    syncLockUntil: null
  }, { merge: true });
}

async function visibleRows(actor, connectionRef) {
  const connection = await connectionData(actor, connectionRef);
  const generation = typeof connection.data.currentImportGeneration === "string"
    ? connection.data.currentImportGeneration
    : "";
  if (!generation) return [];
  const snapshot = await db.collection(`${studentBase(actor)}/journal_crypto_import_generations/${generation}/entries`).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }))
    .sort((left, right) => String(left.data.symbol).localeCompare(String(right.data.symbol)));
}

function makeFakeVault(options = {}) {
  const vaultInstanceId = crypto.randomBytes(6).toString("hex");
  const activeVersions = new Map();
  const versionPayloads = new Map();
  const cleanup = [];
  const retired = [];
  const discarded = [];
  const revoked = [];
  const loads = [];
  const stores = [];
  let storeCounter = 0;
  const keyFor = ({ workspaceId: ws, studentId, connectionId }) => `${ws}/${studentId}/${connectionId}`;

  return {
    cleanup,
    retired,
    discarded,
    revoked,
    loads,
    stores,
    store: async (input) => {
      const key = keyFor(input);
      storeCounter += 1;
      const version = `fake_secret_version_${crypto.createHash("sha256")
        .update(`${vaultInstanceId}:${key}:${input.apiKey}:${input.apiSecret}:${storeCounter}`)
        .digest("hex")
        .slice(0, 16)}`;
      versionPayloads.set(version, {
        apiKey: input.apiKey,
        apiSecret: input.apiSecret,
        exchange: input.exchange,
        purpose: "journal_crypto_history",
        status: "active"
      });
      stores.push({ ...input, version });
      activeVersions.set(key, version);
      await db.doc(credentialPath(input, input.connectionId)).set({
        workspaceId: input.workspaceId,
        studentId: input.studentId,
        connectionId: input.connectionId,
        exchange: input.exchange,
        purpose: "journal_crypto_history",
        storageMode: "fake_vault",
        storageState: "encrypted_reference_ready",
        secretManagerSecretVersionName: version,
        credentialVersionMarker: version,
        rotatedAt: new Date().toISOString(),
        revokedAt: null
      }, { merge: true });
      if (options.afterStore) await options.afterStore(input, version);
      const shouldFailAfterWrite = options.failStoreAfterWrite === true ||
        (typeof options.failStoreAfterWrite === "function" && options.failStoreAfterWrite(input, version));
      if (shouldFailAfterWrite) {
        throw new AdminApiError(503, "fake_vault_store_failed_after_write", "Injected fake vault storage failure.");
      }
      return {
        credentialMetadataId: input.connectionId,
        credentialRefPath: credentialPath(input, input.connectionId),
        storageState: "encrypted_reference_ready",
        credentialVersionMarker: version
      };
    },
    load: async (input) => {
      loads.push(input);
      const key = keyFor(input);
      const metadata = (await db.doc(credentialPath(input, input.connectionId)).get()).data() ?? {};
      const version = metadata.secretManagerSecretVersionName ?? activeVersions.get(key);
      if (input.credentialVersionMarker && version !== input.credentialVersionMarker) {
        throw new AdminApiError(409, "fake_vault_version_mismatch", "Fake vault refused to load a credential version outside the captured sync marker.");
      }
      const payload = versionPayloads.get(version);
      if (!payload || payload.status === "discarded" || metadata.storageState === "revoked") {
        throw new AdminApiError(404, "fake_vault_missing", "Fake vault credential is missing.");
      }
      if (payload.status === "disabled") {
        throw new AdminApiError(403, "fake_vault_version_disabled", "Fake vault credential version is retired.");
      }
      return {
        apiKey: payload.apiKey,
        apiSecret: payload.apiSecret,
        exchange: payload.exchange,
        purpose: "journal_crypto_history",
        credentialVersionMarker: version
      };
    },
    revoke: async (input) => {
      revoked.push(keyFor(input));
      activeVersions.delete(keyFor(input));
      await db.doc(credentialPath(input, input.connectionId)).set({
        storageState: "revoked",
        revokedAt: new Date().toISOString()
      }, { merge: true });
    },
    discardVersion: async ({ secretManagerSecretVersionName }) => {
      if (options.failDiscardVersion) {
        throw new AdminApiError(503, "fake_vault_discard_failed", "Injected fake vault discard failure.");
      }
      cleanup.push(secretManagerSecretVersionName);
      discarded.push(secretManagerSecretVersionName);
      const payload = versionPayloads.get(secretManagerSecretVersionName);
      if (payload) payload.status = "discarded";
    },
    retireVersion: async ({ secretManagerSecretVersionName }) => {
      if (options.failRetireVersion) {
        throw new AdminApiError(503, "fake_vault_retire_failed", "Injected fake vault retirement failure.");
      }
      retired.push(secretManagerSecretVersionName);
      const payload = versionPayloads.get(secretManagerSecretVersionName);
      if (payload) payload.status = "disabled";
    }
  };
}

function binancePermissionResponse() {
  return {
    enableReading: true,
    enableSpotAndMarginTrading: false,
    enableWithdrawals: false,
    enableInternalTransfer: false,
    permitsUniversalTransfer: false,
    enableFutures: false,
    enableMargin: false,
    enableVanillaOptions: false,
    enableFixApiTrade: false,
    enablePortfolioMarginTrading: false
  };
}

function fill({
  id,
  orderId,
  symbol = "BTCUSDT",
  side = "buy",
  price = "100",
  qty = "1",
  fee = "0.01",
  feeAsset = "USDT",
  time = Date.now() - 1_000
}) {
  return {
    id,
    orderId,
    price,
    qty,
    commission: fee,
    commissionAsset: feeAsset,
    time,
    isBuyer: side === "buy"
  };
}

function makeBinanceTransport({ rowsBySymbol = {}, onMyTrades } = {}) {
  const requests = [];
  const transport = async (request) => {
    const url = new URL(request.url);
    requests.push(url);
    if (url.pathname === "/sapi/v1/account/apiRestrictions") {
      return { status: 200, body: binancePermissionResponse() };
    }
    if (url.pathname === "/api/v3/myTrades") {
      if (onMyTrades) await onMyTrades(request, requests);
      adapter.journalCryptoAdapterTestHooks.assertBinanceMyTradesRequestShape(request.url);
      const symbol = url.searchParams.get("symbol") ?? "BTCUSDT";
      const start = Number(url.searchParams.get("startTime"));
      const end = Number(url.searchParams.get("endTime"));
      const rows = typeof rowsBySymbol[symbol] === "function"
        ? rowsBySymbol[symbol](request, requests)
        : rowsBySymbol[symbol] ?? [];
      return {
        status: 200,
        body: rows.filter((row) => row.time >= start && row.time <= end)
      };
    }
    return { status: 404, body: {} };
  };
  transport.requests = requests;
  return transport;
}

function connectionPayload({ label = "Stage 29G QA", symbols = ["BTCUSDT"], apiKey = "journal-key-a", apiSecret = "journal-secret-a" } = {}) {
  return {
    exchange: "binance",
    accountLabel: label,
    selectedSymbols: symbols,
    apiKey,
    apiSecret
  };
}

async function connect(actor, payload, vault, transport = makeBinanceTransport()) {
  const overview = await repository.createStudentJournalCryptoConnection(actor, payload, {
    transport,
    vault
  });
  const connection = overview.connections.find((item) => item.accountLabel === payload.accountLabel);
  assert(connection, "Actual repository connect returns a safe connection summary.");
  return connection.connectionRef;
}

async function sync(actor, connectionRef, vault, transport, commitWrites) {
  return repository.syncStudentJournalCryptoConnection(actor, connectionRef, {
    transport,
    vault,
    ...(commitWrites ? { commitWrites } : {})
  });
}

async function disconnect(actor, connectionRef, vault) {
  return repository.disconnectStudentJournalCryptoConnection(actor, connectionRef, { vault });
}

function actualVaultDependencies(overrides = {}) {
  return {
    store: actualVault.storeJournalCryptoCredential,
    load: actualVault.loadJournalCryptoCredential,
    revoke: actualVault.revokeJournalCryptoCredential,
    discardVersion: actualVault.discardJournalCryptoCredentialVersion,
    retireVersion: actualVault.retireJournalCryptoCredentialVersion,
    ...overrides
  };
}

async function withRealLocalJournalVault(fn) {
  const previousFake = process.env.JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER;
  const previousMode = process.env.CRYPTO_CREDENTIAL_STORAGE_MODE;
  process.env.JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER = "false";
  process.env.CRYPTO_CREDENTIAL_STORAGE_MODE = "local_encrypted";
  try {
    return await fn();
  } finally {
    process.env.JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER = previousFake;
    process.env.CRYPTO_CREDENTIAL_STORAGE_MODE = previousMode;
  }
}

async function realCommitWrites(writes) {
  for (const chunk of chunks(writes, 450)) {
    const batch = db.batch();
    for (const write of chunk) {
      const ref = db.doc(write.path);
      if (write.delete) batch.delete(ref);
      else if (write.data) batch.set(ref, write.data, { merge: true });
    }
    await batch.commit();
  }
}

function chunks(values, size) {
  const output = [];
  for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size));
  return output;
}

async function waitFor(predicate, message) {
  const started = Date.now();
  while (Date.now() - started < 5_000) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(message);
}

async function writeCredentialCleanupTask(actor, id, data) {
  await db.doc(`${studentBase(actor)}/journal_crypto_credential_cleanup_tasks/${id}`).set({
    cleanupAction: data.cleanupAction ?? "retire_previous_version",
    connectionId: data.connectionId,
    connectionRef: data.connectionRef,
    targetCredentialVersionMarker: data.targetCredentialVersionMarker,
    activeCredentialVersionMarker: data.activeCredentialVersionMarker ?? null,
    status: data.status ?? "retry_scheduled",
    attemptCount: data.attemptCount ?? 0,
    nextAttemptAt: data.nextAttemptAt ?? "2026-01-01T00:00:00.000Z",
    createdAt: data.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: data.updatedAt ?? "2026-01-01T00:00:00.000Z",
    safeMessage: "Repository QA cleanup task."
  }, { merge: false });
}

async function testConcurrentFirstTimeCreateSerializesSameLogicalConnection() {
  const actor = actorFor("first_create_same");
  let releaseStore;
  let storeReleased = false;
  const storeGate = new Promise((resolve) => { releaseStore = resolve; });
  const releaseStoreOnce = () => {
    if (storeReleased) return;
    storeReleased = true;
    releaseStore();
  };
  const vault = makeFakeVault({
    afterStore: async () => storeGate
  });
  await clearActor(actor);
  const payload = connectionPayload({
    label: "First Create Same",
    apiKey: "journal-key-first",
    apiSecret: "journal-secret-first"
  });
  const firstCreate = repository.createStudentJournalCryptoConnection(actor, payload, {
    transport: makeBinanceTransport(),
    vault
  });
  try {
    const connectionId = expectedConnectionId(actor, "binance", payload.accountLabel);
    const connectionDoc = db.doc(`${studentBase(actor)}/journal_crypto_connections/${connectionId}`);
    await waitFor(async () => {
      const connection = (await connectionDoc.get()).data() ?? {};
      return connection.status === "verifying" && Boolean(connection.credentialReplacementLockOwner);
    }, "first-time create did not atomically create a verifying placeholder");
    await assertRejects(
      () => repository.createStudentJournalCryptoConnection(actor, payload, {
        transport: makeBinanceTransport(),
        vault
      }),
      /journal_crypto_config_update_in_progress/,
      "Actual repository rejects a competing first-time create for the same logical Journal Crypto connection."
    );
    assert(vault.stores.length === 1, "Actual repository prevents the losing first-time create from storing another credential version.");
    releaseStoreOnce();
    const overview = await firstCreate;
    const connection = overview.connections.find((item) => item.accountLabel === payload.accountLabel);
    const metadata = await db.doc(credentialPath(actor, connectionId)).get();
    const marker = metadata.data()?.secretManagerSecretVersionName;
    assert(
      connection?.status === "ready" &&
        connection.connectionRef &&
        marker &&
        vault.stores[0].version === marker &&
        vault.discarded.length === 0 &&
        vault.revoked.length === 0,
      "Actual repository activates exactly one first-time connection and the loser cannot revoke, discard, or overwrite the winner."
    );
  } finally {
    releaseStoreOnce();
    await firstCreate.catch(() => undefined);
    await clearActor(actor);
  }
}

async function testFirstTimeMarkerDriftFailsClosedAndDiscardsOnlyCreatedVersion() {
  const actor = actorFor("first_create_marker_drift");
  const vault = makeFakeVault();
  await clearActor(actor);
  const payload = connectionPayload({
    label: "Marker Drift",
    apiKey: "journal-key-drift",
    apiSecret: "journal-secret-drift"
  });
  const connectionId = expectedConnectionId(actor, "binance", payload.accountLabel);
  const driftVault = makeFakeVault({
    afterStore: async (input, version) => {
      await db.doc(credentialPath(input, input.connectionId)).set({
        secretManagerSecretVersionName: `drifted_${version}`,
        credentialVersionMarker: `drifted_${version}`
      }, { merge: true });
    }
  });
  await assertRejects(
    () => repository.createStudentJournalCryptoConnection(actor, payload, {
      transport: makeBinanceTransport(),
      vault: driftVault
    }),
    /journal_crypto_credential_marker_mismatch/,
    "Actual repository fails closed when vault write and final activation observe different first-time credential markers."
  );
  assert(
    driftVault.discarded.length === 1 &&
      driftVault.discarded[0] === driftVault.stores[0].version,
    "Actual repository cleanup targets only the credential marker created by the failed first-time request."
  );
  const winnerRef = await connect(actor, payload, vault);
  const winner = await credentialMetadata(actor, winnerRef);
  const winnerMarker = winner.data.credentialVersionMarker ?? winner.data.secretManagerSecretVersionName;
  assert(vault.stores.length === 1, "Actual repository recovery stores exactly one new credential version after the failed first-time request.");
  assert(Boolean(winnerMarker), "Actual repository recovery leaves an active credential marker in metadata.");
  assert(
    !driftVault.discarded.includes(winnerMarker),
    "Actual repository allows safe recovery after an abandoned first-time failure without damaging the later successful credential."
  );
  await clearActor(actor);
}

async function testConcurrentFirstTimeCreatesRespectConnectionLimit() {
  const actor = actorFor("first_create_limit");
  const vault = makeFakeVault();
  await clearActor(actor);
  const payloads = Array.from({ length: 10 }, (_, index) => connectionPayload({
    label: `Limit ${index}`,
    apiKey: `journal-key-limit-${index}`,
    apiSecret: `journal-secret-limit-${index}`
  }));
  const results = await Promise.allSettled(payloads.map((payload) =>
    repository.createStudentJournalCryptoConnection(actor, payload, {
      transport: makeBinanceTransport(),
      vault
    })
  ));
  const connectionSnapshot = await db.collection(`${studentBase(actor)}/journal_crypto_connections`).get();
  const activeConnections = connectionSnapshot.docs.filter((doc) => doc.data().status === "ready");
  assert(
    activeConnections.length <= 8 &&
      results.filter((result) => result.status === "fulfilled").length <= 8 &&
      results.some((result) => result.status === "rejected" && /journal_crypto_connection_limit_reached/.test(result.reason?.code ?? result.reason?.message ?? "")),
    "Actual repository preserves the Journal Crypto connection limit under concurrent first-time creates."
  );
  await clearActor(actor);
}

async function testExpiredFirstCreatePlaceholderRecoversSafely() {
  const actor = actorFor("first_create_recover");
  const vault = makeFakeVault();
  await clearActor(actor);
  const payload = connectionPayload({
    label: "Recover Placeholder",
    apiKey: "journal-key-recover",
    apiSecret: "journal-secret-recover"
  });
  const connectionId = expectedConnectionId(actor, "binance", payload.accountLabel);
  await db.doc(`${studentBase(actor)}/journal_crypto_connections/${connectionId}`).set({
    connectionRef: `journal_conn_${crypto.createHash("sha256").update(connectionId).digest("hex").slice(0, 12)}`,
    exchange: "binance",
    accountLabel: payload.accountLabel,
    selectedSymbols: payload.selectedSymbols,
    status: "verifying",
    credentialReplacementLockOwner: "abandoned_owner",
    credentialReplacementLockUntil: "2026-01-01T00:00:00.000Z",
    safeMessage: "Abandoned first-time placeholder.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  const connectionRef = await connect(actor, payload, vault);
  const connection = await connectionData(actor, connectionRef);
  assert(
    connection.data.status === "ready" &&
      connection.data.credentialReplacementLockOwner === null &&
      connection.data.pendingCredentialVersionMarker === null,
    "Actual repository recovers an expired abandoned first-create placeholder through a new owned configuration lock."
  );
  await clearActor(actor);
}

async function testActiveSyncReplacementRace() {
  const actor = actorFor("race");
  const vault = makeFakeVault();
  await clearActor(actor);
  const gate = {};
  let gateReleased = false;
  gate.promise = new Promise((resolve) => {
    gate.resolve = () => {
      if (gateReleased) return;
      gateReleased = true;
      resolve();
    };
  });
  const connectionRef = await connect(actor, connectionPayload({ label: "Race", apiKey: "journal-key-a" }), vault);
  const delayedTransport = makeBinanceTransport({ onMyTrades: async () => gate.promise });
  const syncPromise = sync(actor, connectionRef, vault, delayedTransport);
  try {
    await waitFor(async () => {
      const connection = await connectionData(actor, connectionRef);
      return Boolean(connection.data.syncLockOwner && connection.data.syncLockUntil);
    }, "sync lock was not acquired");
    const before = await connectionData(actor, connectionRef);
    await assertRejects(
      () => repository.createStudentJournalCryptoConnection(actor, connectionPayload({ label: "Race", apiKey: "journal-key-b" }), {
        transport: makeBinanceTransport(),
        vault
      }),
      /journal_crypto_sync_in_progress/,
      "Actual repository rejects credential replacement while a valid sync lease exists."
    );
    gate.resolve();
    await syncPromise;
    const after = await connectionData(actor, connectionRef);
    assert(
      after.data.credentialFingerprint === before.data.credentialFingerprint &&
        after.data.credentialVersionMarker === before.data.credentialVersionMarker,
      "Actual repository keeps old credential fingerprint/version when replacement races an active sync."
    );
  } finally {
    gate.resolve();
    await syncPromise.catch(() => undefined);
    await clearActor(actor);
  }
}

async function testSameKeySecretRotationRejectedDuringSync() {
  const actor = actorFor("same_secret_sync_first");
  const vault = makeFakeVault();
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Same Key Sync First",
    apiKey: "journal-key-same",
    apiSecret: "journal-secret-a"
  }), vault);
  const gate = {};
  let gateReleased = false;
  gate.promise = new Promise((resolve) => {
    gate.resolve = () => {
      if (gateReleased) return;
      gateReleased = true;
      resolve();
    };
  });
  const syncPromise = sync(actor, connectionRef, vault, makeBinanceTransport({ onMyTrades: async () => gate.promise }));
  try {
    await waitFor(async () => {
      const connection = await connectionData(actor, connectionRef);
      return Boolean(connection.data.syncLockOwner && connection.data.syncCredentialVersionMarker);
    }, "sync lock was not acquired for same-key rotation race");
    await assertRejects(
      () => repository.createStudentJournalCryptoConnection(actor, connectionPayload({
        label: "Same Key Sync First",
        apiKey: "journal-key-same",
        apiSecret: "journal-secret-rotated"
      }), {
        transport: makeBinanceTransport(),
        vault
      }),
      /journal_crypto_sync_in_progress/,
      "Actual repository rejects same API-key secret rotation while a valid sync lease exists."
    );
    gate.resolve();
    await syncPromise;
  } finally {
    gate.resolve();
    await syncPromise.catch(() => undefined);
    await clearActor(actor);
  }
}

async function testReplacementFirstBlocksSyncBeforePendingSecretLoad() {
  const actor = actorFor("replacement_first");
  let releaseStore;
  let storeReleased = false;
  const storeGate = new Promise((resolve) => { releaseStore = resolve; });
  const releaseStoreOnce = () => {
    if (storeReleased) return;
    storeReleased = true;
    releaseStore();
  };
  const vault = makeFakeVault({
    afterStore: async (input) => {
      if (input.apiSecret === "journal-secret-rotated") await storeGate;
    }
  });
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Replacement First",
    apiKey: "journal-key-same",
    apiSecret: "journal-secret-a"
  }), vault);
  await sync(actor, connectionRef, vault, makeBinanceTransport({
    rowsBySymbol: {
      BTCUSDT: [fill({ id: 1, orderId: 11, symbol: "BTCUSDT", time: Date.now() - 120_000 })]
    }
  }));
  await expireCooldown(actor, connectionRef);
  const replacementPromise = repository.createStudentJournalCryptoConnection(actor, connectionPayload({
    label: "Replacement First",
    apiKey: "journal-key-same",
    apiSecret: "journal-secret-rotated"
  }), {
    transport: makeBinanceTransport(),
    vault
  });
  try {
    await waitFor(async () => {
      const connection = await connectionData(actor, connectionRef);
      const credential = await credentialMetadata(actor, connectionRef);
      return Boolean(connection.data.credentialReplacementLockOwner &&
        credential.data.secretManagerSecretVersionName &&
        credential.data.secretManagerSecretVersionName !== connection.data.credentialVersionMarker);
    }, "replacement did not pause after storing pending secret with config lock");
    await assertRejects(
      () => sync(actor, connectionRef, vault, makeBinanceTransport()),
      /journal_crypto_config_update_in_progress/,
      "Actual repository rejects sync start while credential replacement owns a valid configuration lock."
    );
    assert(vault.loads.length === 1, "Actual repository does not load pending replacement secret material while the captured connection metadata still references the previous version.");
    releaseStoreOnce();
    await replacementPromise;
    const after = await connectionData(actor, connectionRef);
    const credential = await credentialMetadata(actor, connectionRef);
    assert(
      after.data.credentialVersionMarker === credential.data.secretManagerSecretVersionName,
      "Actual repository activates connection metadata only after the replacement credential version is ready."
    );
  } finally {
    releaseStoreOnce();
    await replacementPromise.catch(() => undefined);
    await clearActor(actor);
  }
}

async function testRealLocalVaultPinnedVersionEnforcement() {
  await withRealLocalJournalVault(async () => {
    const actor = actorFor("real_vault_pin");
    const loadInputs = [];
    await clearActor(actor);
    const vault = actualVaultDependencies({
      load: async (input) => {
        loadInputs.push(input);
        return actualVault.loadJournalCryptoCredential(input);
      }
    });
    const connectionRef = await connect(actor, connectionPayload({
      label: "Real Vault Pin",
      apiKey: "journal-key-real",
      apiSecret: "journal-secret-real-a"
    }), vault, makeBinanceTransport());
    const credential = await credentialMetadata(actor, connectionRef);
    const marker = credential.data.credentialVersionMarker;
    await sync(actor, connectionRef, vault, makeBinanceTransport());
    assert(
      loadInputs.some((input) => input.credentialVersionMarker === marker),
      "Actual repository asks the real local vault to load exactly the credential version captured when the sync lease was acquired."
    );
    await assertRejects(
      () => actualVault.loadJournalCryptoCredential({
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        connectionId: credential.connectionId,
        credentialVersionMarker: "local_journal_crypto_stale_marker"
      }),
      /credential_version_mismatch|credential_version_not_found/,
      "Real local Journal vault rejects stale or mismatched credential version markers."
    );
    await actualVault.storeJournalCryptoCredential({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId: credential.connectionId,
      exchange: "binance",
      apiKey: "journal-key-real",
      apiSecret: "journal-secret-real-pending"
    });
    await assertRejects(
      () => actualVault.loadJournalCryptoCredential({
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        connectionId: credential.connectionId,
        credentialVersionMarker: marker
      }),
      /credential_version_mismatch/,
      "Real local Journal vault refuses an old-marker sync after replacement writes a pending version, even if a config lock later expires."
    );
    await clearActor(actor);
  });
}

async function testRealLocalVaultRejectedVersionStates() {
  await withRealLocalJournalVault(async () => {
    const actor = actorFor("real_vault_states");
    await clearActor(actor);
    const base = {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      exchange: "binance",
      apiKey: "journal-key-real",
      apiSecret: "journal-secret-real"
    };

    const retired = await actualVault.storeJournalCryptoCredential({
      ...base,
      connectionId: "real_vault_retired"
    });
    await actualVault.retireJournalCryptoCredentialVersion({
      secretManagerSecretVersionName: retired.credentialVersionMarker
    });
    await assertRejects(
      () => actualVault.loadJournalCryptoCredential({
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        connectionId: "real_vault_retired",
        credentialVersionMarker: retired.credentialVersionMarker
      }),
      /credential_version_unavailable/,
      "Real local Journal vault rejects retired credential versions before provider requests."
    );

    const discarded = await actualVault.storeJournalCryptoCredential({
      ...base,
      connectionId: "real_vault_discarded",
      apiSecret: "journal-secret-discarded"
    });
    await actualVault.discardJournalCryptoCredentialVersion({
      secretManagerSecretVersionName: discarded.credentialVersionMarker
    });
    await assertRejects(
      () => actualVault.loadJournalCryptoCredential({
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        connectionId: "real_vault_discarded",
        credentialVersionMarker: discarded.credentialVersionMarker
      }),
      /credential_version_unavailable/,
      "Real local Journal vault rejects discarded credential versions before provider requests."
    );

    const revoked = await actualVault.storeJournalCryptoCredential({
      ...base,
      connectionId: "real_vault_revoked",
      apiSecret: "journal-secret-revoked"
    });
    await actualVault.revokeJournalCryptoCredential({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId: "real_vault_revoked"
    });
    await assertRejects(
      () => actualVault.loadJournalCryptoCredential({
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        connectionId: "real_vault_revoked",
        credentialVersionMarker: revoked.credentialVersionMarker
      }),
      /credential_not_found|credential_revoked/,
      "Real local Journal vault rejects revoked credential versions before provider requests."
    );
    await clearActor(actor);
  });
}

async function testConcurrentSameKeySecretReplacements() {
  const actor = actorFor("concurrent_secret_replace");
  let releaseStore;
  let storeReleased = false;
  const storeGate = new Promise((resolve) => { releaseStore = resolve; });
  const releaseStoreOnce = () => {
    if (storeReleased) return;
    storeReleased = true;
    releaseStore();
  };
  const vault = makeFakeVault({
    afterStore: async (input) => {
      if (input.apiSecret === "journal-secret-rotated-a") await storeGate;
    }
  });
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Concurrent Secret Replace",
    apiKey: "journal-key-same",
    apiSecret: "journal-secret-a"
  }), vault);
  const firstReplacement = repository.createStudentJournalCryptoConnection(actor, connectionPayload({
    label: "Concurrent Secret Replace",
    apiKey: "journal-key-same",
    apiSecret: "journal-secret-rotated-a"
  }), {
    transport: makeBinanceTransport(),
    vault
  });
  try {
    await waitFor(async () => {
      const connection = await connectionData(actor, connectionRef);
      return Boolean(connection.data.credentialReplacementLockOwner);
    }, "first same-key replacement did not acquire config lock");
    await assertRejects(
      () => repository.createStudentJournalCryptoConnection(actor, connectionPayload({
        label: "Concurrent Secret Replace",
        apiKey: "journal-key-same",
        apiSecret: "journal-secret-rotated-b"
      }), {
        transport: makeBinanceTransport(),
        vault
      }),
      /journal_crypto_config_update_in_progress/,
      "Actual repository prevents two concurrent same-key secret replacements from both proceeding."
    );
    releaseStoreOnce();
    await firstReplacement;
  } finally {
    releaseStoreOnce();
    await firstReplacement.catch(() => undefined);
    await clearActor(actor);
  }
}

async function testSuccessfulReplacementRetiresPreviousVersion() {
  const actor = actorFor("retire_previous");
  const vault = makeFakeVault();
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Retire Previous",
    apiKey: "journal-key-same",
    apiSecret: "journal-secret-a"
  }), vault);
  const before = await credentialMetadata(actor, connectionRef);
  await repository.createStudentJournalCryptoConnection(actor, connectionPayload({
    label: "Retire Previous",
    apiKey: "journal-key-same",
    apiSecret: "journal-secret-rotated"
  }), {
    transport: makeBinanceTransport(),
    vault
  });
  const after = await credentialMetadata(actor, connectionRef);
  assert(
    before.data.secretManagerSecretVersionName !== after.data.secretManagerSecretVersionName &&
      vault.retired.includes(before.data.secretManagerSecretVersionName) &&
      !vault.discarded.includes(before.data.secretManagerSecretVersionName),
    "Actual repository activates a successful replacement and retires the previous credential version only afterward."
  );
  await clearActor(actor);
}

async function testFailedReplacementDiscardsAttemptOnly() {
  const actor = actorFor("failed_replace");
  const vault = makeFakeVault();
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Failed Replace",
    apiKey: "journal-key-same",
    apiSecret: "journal-secret-a"
  }), vault);
  const beforeCredential = await credentialMetadata(actor, connectionRef);
  const beforeConnection = await connectionData(actor, connectionRef);
  const failingVault = makeFakeVault({
    failStoreAfterWrite: (input) => input.apiSecret === "journal-secret-rotated"
  });
  await failingVault.store({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId: beforeCredential.connectionId,
    exchange: "binance",
    apiKey: "journal-key-same",
    apiSecret: "journal-secret-a"
  });
  await db.doc(credentialPath(actor, beforeCredential.connectionId)).set(beforeCredential.data, { merge: true });
  await assertRejects(
    () => repository.createStudentJournalCryptoConnection(actor, connectionPayload({
      label: "Failed Replace",
      apiKey: "journal-key-same",
      apiSecret: "journal-secret-rotated"
    }), {
      transport: makeBinanceTransport(),
      vault: failingVault
    }),
    /fake_vault_store_failed_after_write/,
    "Actual repository surfaces failed credential replacement without pretending the connection is ready."
  );
  const afterCredential = await credentialMetadata(actor, connectionRef);
  const afterConnection = await connectionData(actor, connectionRef);
  assert(
    afterCredential.data.secretManagerSecretVersionName === beforeCredential.data.secretManagerSecretVersionName &&
      afterConnection.data.credentialVersionMarker === beforeConnection.data.credentialVersionMarker &&
      failingVault.discarded.length === 1 &&
      !failingVault.discarded.includes(beforeCredential.data.secretManagerSecretVersionName),
    "Actual repository discards only the failed replacement version and retains the previous working credential version."
  );
  await clearActor(actor);
}

async function testFailedReplacementDiscardFailureCreatesTargetedCleanupTask() {
  const actor = actorFor("failed_replace_discard_task");
  const vault = makeFakeVault();
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Failed Replace Discard Task",
    apiKey: "journal-key-same",
    apiSecret: "journal-secret-a"
  }), vault);
  const beforeCredential = await credentialMetadata(actor, connectionRef);
  const failingVault = makeFakeVault({
    failStoreAfterWrite: (input) => input.apiSecret === "journal-secret-rotated",
    failDiscardVersion: true
  });
  await failingVault.store({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId: beforeCredential.connectionId,
    exchange: "binance",
    apiKey: "journal-key-same",
    apiSecret: "journal-secret-a"
  });
  await db.doc(credentialPath(actor, beforeCredential.connectionId)).set(beforeCredential.data, { merge: true });
  await assertRejects(
    () => repository.createStudentJournalCryptoConnection(actor, connectionPayload({
      label: "Failed Replace Discard Task",
      apiKey: "journal-key-same",
      apiSecret: "journal-secret-rotated"
    }), {
      transport: makeBinanceTransport(),
      vault: failingVault
    }),
    /fake_vault_store_failed_after_write/,
    "Actual repository surfaces failed replacement when failed-version discard also fails."
  );
  const tasks = await db.collection(`${studentBase(actor)}/journal_crypto_credential_cleanup_tasks`).get();
  const task = tasks.docs[0]?.data() ?? {};
  const attemptedVersion = failingVault.stores.find((store) => store.apiSecret === "journal-secret-rotated")?.version;
  assert(
    tasks.size === 1 &&
      task.cleanupAction === "discard_failed_replacement" &&
      task.connectionId === beforeCredential.connectionId &&
      task.targetCredentialVersionMarker === attemptedVersion &&
      task.activeCredentialVersionMarker === beforeCredential.data.secretManagerSecretVersionName,
    "Actual repository creates one targeted discard_failed_replacement cleanup task for the unactivated failed credential version."
  );
  await repository.getStudentJournalCryptoSyncOverview(actor, { vault: makeFakeVault({ failDiscardVersion: true }) });
  await tasks.docs[0].ref.set({ nextAttemptAt: "2026-01-01T00:00:00.000Z" }, { merge: true });
  await repository.getStudentJournalCryptoSyncOverview(actor, { vault: makeFakeVault({ failDiscardVersion: true }) });
  const failedTasks = await db.collection(`${studentBase(actor)}/journal_crypto_credential_cleanup_tasks`).get();
  assert(
    failedTasks.size === 1 &&
      failedTasks.docs[0].data().cleanupAction === "discard_failed_replacement" &&
      failedTasks.docs[0].data().attemptCount === 2,
    "Actual failed replacement cleanup retry dedupes repeated discard failures by connection, target, and action."
  );
  await failedTasks.docs[0].ref.set({ nextAttemptAt: "2026-01-01T00:00:00.000Z" }, { merge: true });
  const succeedingVault = makeFakeVault();
  await repository.getStudentJournalCryptoSyncOverview(actor, { vault: succeedingVault });
  const resolved = (await failedTasks.docs[0].ref.get()).data();
  assert(
    resolved.status === "resolved" &&
      succeedingVault.discarded.includes(attemptedVersion) &&
      !succeedingVault.retired.includes(attemptedVersion) &&
      !succeedingVault.discarded.includes(beforeCredential.data.secretManagerSecretVersionName),
    "Actual cleanup retry discards a failed replacement version with discardVersion only and leaves the active credential untouched."
  );
  await clearActor(actor);
}

async function testKeyedMutationNoOpAndChangedSecretReplacement() {
  await withRealLocalJournalVault(async () => {
    const actor = actorFor("keyed_noop");
    let storeCount = 0;
    await clearActor(actor);
    const vault = actualVaultDependencies({
      store: async (input) => {
        storeCount += 1;
        return actualVault.storeJournalCryptoCredential(input);
      }
    });
    const payload = connectionPayload({
      label: "Keyed Noop",
      apiKey: "journal-key-noop",
      apiSecret: "journal-secret-noop"
    });
    const connectionRef = await connect(actor, payload, vault, makeBinanceTransport());
    const before = await connectionData(actor, connectionRef);
    const beforeCredential = await credentialMetadata(actor, connectionRef);
    await repository.createStudentJournalCryptoConnection(actor, payload, {
      transport: makeBinanceTransport(),
      vault
    });
    const afterNoop = await connectionData(actor, connectionRef);
    assert(
      storeCount === 1 &&
        afterNoop.data.credentialMutationIdentifier === before.data.credentialMutationIdentifier &&
        afterNoop.data.credentialVersionMarker === before.data.credentialVersionMarker,
      "Actual repository treats exact same credentials as a no-op through a server-keyed mutation identifier without creating another credential version."
    );
    await repository.createStudentJournalCryptoConnection(actor, {
      ...payload,
      apiSecret: "journal-secret-noop-rotated"
    }, {
      transport: makeBinanceTransport(),
      vault
    });
    const afterRotated = await connectionData(actor, connectionRef);
    const afterCredential = await credentialMetadata(actor, connectionRef);
    assert(
      storeCount === 2 &&
        afterRotated.data.credentialMutationIdentifier !== before.data.credentialMutationIdentifier &&
        afterCredential.data.credentialVersionMarker !== beforeCredential.data.credentialVersionMarker,
      "Actual repository treats a changed API secret as a credential replacement even when the API key is unchanged."
    );
    const unkeyedSecretHash = crypto.createHash("sha256")
      .update(["binance", payload.apiKey, payload.apiSecret].join("|"))
      .digest("hex")
      .slice(0, 40);
    const connectionJson = JSON.stringify((await connectionData(actor, connectionRef)).data);
    const credentialJson = JSON.stringify((await credentialMetadata(actor, connectionRef)).data);
    assert(
      !connectionJson.includes(payload.apiSecret) &&
        !connectionJson.includes(unkeyedSecretHash) &&
        !credentialJson.includes(payload.apiSecret) &&
        !credentialJson.includes(unkeyedSecretHash),
      "Actual repository and local vault metadata do not store raw secrets or deterministic unkeyed secret hashes outside encrypted vault payloads."
    );
    await clearActor(actor);
  });
}

async function testRetirementFailureCreatesRetryableCleanupTask() {
  const actor = actorFor("cleanup_retry");
  const failingVault = makeFakeVault({ failRetireVersion: true });
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Cleanup Retry",
    apiKey: "journal-key-cleanup",
    apiSecret: "journal-secret-a"
  }), failingVault);
  const before = await credentialMetadata(actor, connectionRef);
  await repository.createStudentJournalCryptoConnection(actor, connectionPayload({
    label: "Cleanup Retry",
    apiKey: "journal-key-cleanup",
    apiSecret: "journal-secret-rotated"
  }), {
    transport: makeBinanceTransport(),
    vault: failingVault
  });
  const after = await connectionData(actor, connectionRef);
  const tasksAfterReplacement = await db.collection(`${studentBase(actor)}/journal_crypto_credential_cleanup_tasks`).get();
  const task = tasksAfterReplacement.docs[0].data();
  assert(
    tasksAfterReplacement.size === 1 &&
      after.data.credentialVersionMarker !== before.data.secretManagerSecretVersionName &&
      task.cleanupAction === "retire_previous_version" &&
      task.targetCredentialVersionMarker === before.data.secretManagerSecretVersionName,
    "Actual repository keeps the new connection active and creates exactly one targeted retire_previous_version cleanup task when previous-version retirement fails."
  );
  await repository.getStudentJournalCryptoSyncOverview(actor, { vault: failingVault });
  const failedOnce = await tasksAfterReplacement.docs[0].ref.get();
  await failedOnce.ref.set({ nextAttemptAt: "2026-01-01T00:00:00.000Z" }, { merge: true });
  await repository.getStudentJournalCryptoSyncOverview(actor, { vault: failingVault });
  const failedTwiceTasks = await db.collection(`${studentBase(actor)}/journal_crypto_credential_cleanup_tasks`).get();
  const failedTwice = failedTwiceTasks.docs[0].data();
  assert(
    failedTwiceTasks.size === 1 &&
      failedTwice.attemptCount === 2 &&
      !failingVault.retired.includes(after.data.credentialVersionMarker),
    "Actual cleanup retry remains bounded, dedupes repeated failures, and never targets the active credential version."
  );
  await failedTwiceTasks.docs[0].ref.set({ nextAttemptAt: "2026-01-01T00:00:00.000Z" }, { merge: true });
  const succeedingVault = makeFakeVault();
  await repository.getStudentJournalCryptoSyncOverview(actor, { vault: succeedingVault });
  const resolved = (await failedTwiceTasks.docs[0].ref.get()).data();
  assert(
    resolved.status === "resolved" &&
      succeedingVault.retired.includes(before.data.secretManagerSecretVersionName) &&
      !succeedingVault.discarded.includes(before.data.secretManagerSecretVersionName) &&
      !succeedingVault.retired.includes(after.data.credentialVersionMarker),
    "Actual cleanup retry later retires only the old credential version with retireVersion and resolves the existing cleanup task."
  );
  await clearActor(actor);
}

async function testCredentialCleanupDueQueryOrderingAndStarvation() {
  const actor = actorFor("cleanup_due_query");
  const vault = makeFakeVault();
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Cleanup Due Query",
    apiKey: "journal-key-cleanup-due",
    apiSecret: "journal-secret-a"
  }), vault);
  const connection = await connectionData(actor, connectionRef);
  const activeMarker = connection.data.credentialVersionMarker;
  const callOrder = [];
  const orderedVault = makeFakeVault();
  orderedVault.retireVersion = async ({ secretManagerSecretVersionName }) => {
    callOrder.push(secretManagerSecretVersionName);
    vault.retired.push(secretManagerSecretVersionName);
  };
  for (let index = 0; index < 5; index += 1) {
    await writeCredentialCleanupTask(actor, `future_${index}`, {
      connectionId: connection.id,
      connectionRef,
      targetCredentialVersionMarker: `future_version_${index}`,
      activeCredentialVersionMarker: activeMarker,
      nextAttemptAt: "2099-01-01T00:00:00.000Z",
      createdAt: `2026-01-01T00:00:0${index}.000Z`
    });
  }
  for (const [id, status] of [["resolved_task", "resolved"], ["blocked_task", "blocked"], ["final_task", "final_failed"]]) {
    await writeCredentialCleanupTask(actor, id, {
      connectionId: connection.id,
      connectionRef,
      targetCredentialVersionMarker: `${id}_version`,
      activeCredentialVersionMarker: activeMarker,
      status,
      nextAttemptAt: "2026-01-01T00:00:00.000Z"
    });
  }
  for (let index = 1; index <= 7; index += 1) {
    await writeCredentialCleanupTask(actor, `due_${index}`, {
      connectionId: connection.id,
      connectionRef,
      targetCredentialVersionMarker: `due_${index}_version`,
      activeCredentialVersionMarker: activeMarker,
      nextAttemptAt: `2026-01-01T00:00:0${index}.000Z`,
      createdAt: `2026-01-01T00:00:0${index}.000Z`
    });
  }
  await repository.getStudentJournalCryptoSyncOverview(actor, { vault: orderedVault });
  const future = await db.collection(`${studentBase(actor)}/journal_crypto_credential_cleanup_tasks`)
    .where("status", "==", "retry_scheduled")
    .get();
  const resolved = await db.collection(`${studentBase(actor)}/journal_crypto_credential_cleanup_tasks`)
    .where("status", "==", "resolved")
    .get();
  assert(
    callOrder.join(",") === "due_1_version,due_2_version,due_3_version,due_4_version,due_5_version" &&
      future.docs.filter((doc) => String(doc.id).startsWith("future_")).length === 5 &&
      future.docs.some((doc) => doc.id === "due_6") &&
      future.docs.some((doc) => doc.id === "due_7") &&
      resolved.docs.some((doc) => doc.id === "due_1") &&
      resolved.docs.some((doc) => doc.id === "due_5"),
    "Actual cleanup worker queries only due retryable tasks, avoids future/resolved/blocked/final-failed starvation, processes due work oldest-first, and respects the bounded batch limit."
  );
  await clearActor(actor);
}

async function testCredentialCleanupChangedActiveMarkerBlocksBeforeVaultCall() {
  const actor = actorFor("cleanup_changed_active");
  const vault = makeFakeVault();
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Cleanup Changed Active",
    apiKey: "journal-key-cleanup-changed",
    apiSecret: "journal-secret-a"
  }), vault);
  const connection = await connectionData(actor, connectionRef);
  await writeCredentialCleanupTask(actor, "changed_active", {
    connectionId: connection.id,
    connectionRef,
    targetCredentialVersionMarker: "old_version_when_task_created",
    activeCredentialVersionMarker: "active_marker_when_task_created",
    cleanupAction: "discard_failed_replacement",
    nextAttemptAt: "2026-01-01T00:00:00.000Z"
  });
  await repository.getStudentJournalCryptoSyncOverview(actor, { vault });
  const task = (await db.doc(`${studentBase(actor)}/journal_crypto_credential_cleanup_tasks/changed_active`).get()).data();
  assert(
    task.status === "blocked" &&
      task.safeFailureCategory === "cleanup_connection_changed" &&
      vault.discarded.length === 0 &&
      vault.retired.length === 0,
    "Actual cleanup processing rechecks the active credential marker before the vault call and blocks changed connections safely."
  );
  await clearActor(actor);
}

async function testProductionOverviewProcessesCredentialCleanupWithoutExposingIt() {
  const actor = actorFor("cleanup_overview");
  const failingVault = makeFakeVault({ failRetireVersion: true });
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Cleanup Overview",
    apiKey: "journal-key-cleanup-overview",
    apiSecret: "journal-secret-a"
  }), failingVault);
  const before = await credentialMetadata(actor, connectionRef);
  await repository.createStudentJournalCryptoConnection(actor, connectionPayload({
    label: "Cleanup Overview",
    apiKey: "journal-key-cleanup-overview",
    apiSecret: "journal-secret-b"
  }), {
    transport: makeBinanceTransport(),
    vault: failingVault
  });
  const taskSnapshot = await db.collection(`${studentBase(actor)}/journal_crypto_credential_cleanup_tasks`).get();
  assert(taskSnapshot.size === 1, "Actual repository creates one server-only cleanup task before production overview processing.");
  await taskSnapshot.docs[0].ref.set({ nextAttemptAt: "2026-01-01T00:00:00.000Z" }, { merge: true });
  const succeedingVault = makeFakeVault();
  const overview = await repository.getStudentJournalCryptoSyncOverview(actor, { vault: succeedingVault });
  const taskAfterOverview = (await taskSnapshot.docs[0].ref.get()).data();
  const overviewJson = JSON.stringify(overview);
  assert(
    taskAfterOverview.status === "resolved" &&
      succeedingVault.retired.includes(before.data.secretManagerSecretVersionName) &&
      !overviewJson.includes("targetCredentialVersionMarker") &&
      !overviewJson.includes(before.data.secretManagerSecretVersionName) &&
      !overviewJson.includes("cleanupLockOwner"),
    "Actual production overview path processes a due credential cleanup batch without exposing cleanup internals to the browser DTO."
  );
  await clearActor(actor);
}

async function testConcurrentCleanupWorkersClaimOneRetirement() {
  const actor = actorFor("cleanup_claim");
  const failingVault = makeFakeVault({ failRetireVersion: true });
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Cleanup Claim",
    apiKey: "journal-key-cleanup-claim",
    apiSecret: "journal-secret-a"
  }), failingVault);
  const before = await credentialMetadata(actor, connectionRef);
  await repository.createStudentJournalCryptoConnection(actor, connectionPayload({
    label: "Cleanup Claim",
    apiKey: "journal-key-cleanup-claim",
    apiSecret: "journal-secret-b"
  }), {
    transport: makeBinanceTransport(),
    vault: failingVault
  });
  const taskSnapshot = await db.collection(`${studentBase(actor)}/journal_crypto_credential_cleanup_tasks`).get();
  await taskSnapshot.docs[0].ref.set({ nextAttemptAt: "2026-01-01T00:00:00.000Z" }, { merge: true });
  let retireAttempts = 0;
  let releaseRetire;
  let released = false;
  const retireGate = new Promise((resolve) => { releaseRetire = resolve; });
  const releaseOnce = () => {
    if (released) return;
    released = true;
    releaseRetire();
  };
  const delayedVault = makeFakeVault();
  delayedVault.retireVersion = async ({ secretManagerSecretVersionName }) => {
    retireAttempts += 1;
    await retireGate;
    await makeFakeVault().retireVersion({ secretManagerSecretVersionName });
  };
  const first = repository.getStudentJournalCryptoSyncOverview(actor, { vault: delayedVault });
  try {
    await waitFor(async () => {
      const task = (await taskSnapshot.docs[0].ref.get()).data() ?? {};
      return task.status === "processing" && Boolean(task.cleanupLockOwner);
    }, "cleanup worker did not claim the task with a lease");
    const second = repository.getStudentJournalCryptoSyncOverview(actor, { vault: delayedVault });
    releaseOnce();
    await Promise.all([first, second]);
    const task = (await taskSnapshot.docs[0].ref.get()).data();
    assert(
      retireAttempts === 1 &&
        task.status === "resolved" &&
        task.cleanupLockOwner === null &&
        task.cleanupLockUntil === null,
      "Actual cleanup workers use an owner-token lease so concurrent production invocations retire a task once."
    );
  } finally {
    releaseOnce();
    await first.catch(() => undefined);
    await clearActor(actor);
  }
  assert(before.data.secretManagerSecretVersionName, "Actual cleanup claim regression used a concrete old credential marker.");
}

async function testCleanupNeverRetiresActiveCredentialAndFinalFailureIsBounded() {
  const actor = actorFor("cleanup_active_final");
  const vault = makeFakeVault();
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({
    label: "Cleanup Active",
    apiKey: "journal-key-cleanup-active",
    apiSecret: "journal-secret-a"
  }), vault);
  const connection = await connectionData(actor, connectionRef);
  const activeMarker = connection.data.credentialVersionMarker;
  const taskRef = db.doc(`${studentBase(actor)}/journal_crypto_credential_cleanup_tasks/active_target`);
  await taskRef.set({
    cleanupAction: "retire_previous_version",
    connectionId: connection.id,
    connectionRef,
    targetCredentialVersionMarker: activeMarker,
    activeCredentialVersionMarker: activeMarker,
    status: "retry_scheduled",
    attemptCount: 0,
    nextAttemptAt: "2026-01-01T00:00:00.000Z",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  await repository.getStudentJournalCryptoSyncOverview(actor, { vault });
  const blocked = (await taskRef.get()).data();
  assert(
    blocked.status === "blocked" &&
      blocked.safeFailureCategory === "cleanup_target_is_active" &&
      !vault.retired.includes(activeMarker),
    "Actual cleanup processing blocks an active credential target and never retires it."
  );

  await taskRef.set({
    cleanupAction: "retire_previous_version",
    connectionId: connection.id,
    connectionRef,
    targetCredentialVersionMarker: "old_version_for_final_failure",
    activeCredentialVersionMarker: activeMarker,
    status: "retry_scheduled",
    attemptCount: 2,
    nextAttemptAt: "2026-01-01T00:00:00.000Z",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, { merge: false });
  await repository.getStudentJournalCryptoSyncOverview(actor, { vault: makeFakeVault({ failRetireVersion: true }) });
  const finalFailed = (await taskRef.get()).data();
  assert(
    finalFailed.status === "final_failed" &&
      finalFailed.attemptCount === 3 &&
      finalFailed.nextAttemptAt === null,
    "Actual cleanup retry stops at a bounded final-failed support state instead of retrying indefinitely."
  );
  await clearActor(actor);
}

async function testCredentialReplacementAndSymbolReset() {
  const actor = actorFor("replace");
  const vault = makeFakeVault();
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({ label: "Replace", symbols: ["BTCUSDT"], apiKey: "journal-key-a" }), vault);
  await sync(actor, connectionRef, vault, makeBinanceTransport({
    rowsBySymbol: {
      BTCUSDT: [fill({ id: 1, orderId: 11, symbol: "BTCUSDT", time: Date.now() - 60_000 })]
    }
  }));
  const activeBefore = await connectionData(actor, connectionRef);
  assert(activeBefore.data.currentImportGeneration, "Actual repository creates an active generation after first sync.");
  await repository.createStudentJournalCryptoConnection(actor, connectionPayload({ label: "Replace", symbols: ["BTCUSDT"], apiKey: "journal-key-b" }), {
    transport: makeBinanceTransport(),
    vault
  });
  const replaced = await connectionData(actor, connectionRef);
  const retired = await db.doc(`${studentBase(actor)}/journal_crypto_import_generations/${activeBefore.data.currentImportGeneration}`).get();
  assert(
    !replaced.data.currentImportGeneration &&
      !replaced.data.pendingImportGeneration &&
      Object.keys(replaced.data.syncWatermarks ?? {}).length === 0 &&
      retired.data()?.status === "retired",
    "Actual repository replacement retires active/pending generations and resets crawl/watermarks before new credentials become ready."
  );
  await repository.createStudentJournalCryptoConnection(actor, connectionPayload({ label: "Replace", symbols: ["ETHUSDT"], apiKey: "journal-key-b" }), {
    transport: makeBinanceTransport(),
    vault
  });
  const symbolChanged = await connectionData(actor, connectionRef);
  assert(
    selected(symbolChanged.data).join(",") === "ETHUSDT" &&
      !symbolChanged.data.currentImportGeneration &&
      Object.keys(symbolChanged.data.syncWatermarks ?? {}).length === 0,
    "Actual repository treats selected-symbol changes as sync configuration changes and clears old active history pointers."
  );
  await clearActor(actor);
}

function selected(data) {
  return Array.isArray(data.selectedSymbols) ? data.selectedSymbols.map(String).sort() : [];
}

async function testFailedStagingAndPointerVisibility() {
  const actor = actorFor("staging");
  const vault = makeFakeVault();
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({ label: "Staging", symbols: ["BTCUSDT"] }), vault);
  await sync(actor, connectionRef, vault, makeBinanceTransport({
    rowsBySymbol: {
      BTCUSDT: [fill({ id: 1, orderId: 11, symbol: "BTCUSDT", time: Date.now() - 120_000 })]
    }
  }));
  await expireCooldown(actor, connectionRef);
  const beforeRows = await visibleRows(actor, connectionRef);
  await (await connectionData(actor, connectionRef)).ref.set({
    syncWatermarks: { BTCUSDT: Date.now() - 20_000 }
  }, { merge: true });
  let visibleDuringStaging = [];
  const commitWrites = async (writes) => {
    await realCommitWrites(writes.slice(0, 1));
    visibleDuringStaging = await visibleRows(actor, connectionRef);
    throw new Error("injected_staging_chunk_failure");
  };
  await assertRejects(
    () => sync(actor, connectionRef, vault, makeBinanceTransport({
      rowsBySymbol: {
        BTCUSDT: [fill({ id: 2, orderId: 12, symbol: "BTCUSDT", side: "sell", price: "110", time: Date.now() - 1_000 })]
      }
    }), commitWrites),
    /injected_staging_chunk_failure|journal_crypto/,
    "Actual repository surfaces a failed staging chunk without activating the pending generation."
  );
  const afterRows = await visibleRows(actor, connectionRef);
  assert(
    beforeRows.length === 1 &&
      visibleDuringStaging.length === 1 &&
      afterRows.length === 1 &&
      afterRows[0].id === beforeRows[0].id,
    "Actual repository keeps readers on the active generation during staging and after a failed chunk."
  );
  const generations = await db.collection(`${studentBase(actor)}/journal_crypto_import_generations`).get();
  assert(
    generations.docs.some((doc) => doc.data().status === "abandoned"),
    "Actual repository marks failed staging generations abandoned after cleanup."
  );
  await clearActor(actor);
}

async function testDisconnectDuringSync() {
  const actor = actorFor("disconnect");
  const vault = makeFakeVault();
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({ label: "Disconnect", symbols: ["BTCUSDT"] }), vault);
  await sync(actor, connectionRef, vault, makeBinanceTransport({
    rowsBySymbol: {
      BTCUSDT: [fill({ id: 1, orderId: 11, symbol: "BTCUSDT", time: Date.now() - 120_000 })]
    }
  }));
  await expireCooldown(actor, connectionRef);
  const gate = {};
  gate.promise = new Promise((resolve) => { gate.resolve = resolve; });
  const delayedTransport = makeBinanceTransport({
    rowsBySymbol: {
      BTCUSDT: [fill({ id: 2, orderId: 12, symbol: "BTCUSDT", side: "sell", price: "110", time: Date.now() - 1_000 })]
    },
    onMyTrades: async () => gate.promise
  });
  const syncPromise = sync(actor, connectionRef, vault, delayedTransport);
  await waitFor(async () => {
    const connection = await connectionData(actor, connectionRef);
    return connection.data.status === "syncing";
  }, "sync did not enter syncing state before disconnect");
  const before = await visibleRows(actor, connectionRef);
  await disconnect(actor, connectionRef, vault);
  gate.resolve();
  await assertRejects(() => syncPromise, /journal_crypto_sync_disabled|journal_crypto_credential_revoked/, "Actual repository prevents an in-flight sync from committing after disconnect.");
  const after = await visibleRows(actor, connectionRef);
  const connection = await connectionData(actor, connectionRef);
  assert(
    connection.data.status === "disconnected" || connection.data.syncDisabled === true,
    "Actual repository leaves the connection disconnected after a race with sync."
  );
  assert(before.map((row) => row.id).join(",") === after.map((row) => row.id).join(","), "Actual repository preserves the last complete generation when disconnect races a sync.");
  await clearActor(actor);
}

async function testConcurrentConnections() {
  const actor = actorFor("concurrent");
  const vault = makeFakeVault();
  await clearActor(actor);
  const first = await connect(actor, connectionPayload({ label: "Concurrent A", symbols: ["BTCUSDT"], apiKey: "journal-key-a" }), vault);
  const second = await connect(actor, connectionPayload({ label: "Concurrent B", symbols: ["ETHUSDT"], apiKey: "journal-key-b" }), vault);
  await Promise.all([
    sync(actor, first, vault, makeBinanceTransport({ rowsBySymbol: { BTCUSDT: [fill({ id: 1, orderId: 11, symbol: "BTCUSDT" })] } })),
    sync(actor, second, vault, makeBinanceTransport({ rowsBySymbol: { ETHUSDT: [fill({ id: 2, orderId: 21, symbol: "ETHUSDT" })] } }))
  ]);
  assert(
    (await visibleRows(actor, first)).every((row) => row.data.symbol === "BTCUSDT") &&
      (await visibleRows(actor, second)).every((row) => row.data.symbol === "ETHUSDT"),
    "Actual repository allows two concurrent connections to sync independently without cross-connection generation cleanup."
  );
  await clearActor(actor);
}

async function testRepeatedEightSymbolCrawl() {
  const actor = actorFor("crawl");
  const vault = makeFakeVault();
  await clearActor(actor);
  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LINKUSDT"];
  const connectionRef = await connect(actor, connectionPayload({ label: "Eight Symbols", symbols }), vault);
  let runs = 0;
  let connection;
  do {
    runs += 1;
    await expireCooldown(actor, connectionRef);
    await sync(actor, connectionRef, vault, makeBinanceTransport());
    connection = await connectionData(actor, connectionRef);
    assert(
      connection.data.snapshotComplete === true ||
        (connection.data.crawlProgress?.boundaryUntil && connection.data.crawlProgress?.complete === false),
      `Actual repository run ${runs} persists a frozen crawl boundary while incomplete.`
    );
  } while (connection.data.snapshotComplete !== true && runs < 8);

  assert(connection.data.snapshotComplete === true, "Actual repository completes repeated bounded crawling across all eight selected symbols.");
  assert(
    Object.keys(connection.data.syncWatermarks ?? {}).sort().join(",") === symbols.sort().join(","),
    "Actual repository promotes per-symbol completed watermarks only after every selected symbol reaches the frozen boundary."
  );
  await clearActor(actor);
}

async function testBuyThenSellExecutionOnlyIncremental() {
  const actor = actorFor("lifecycle");
  const vault = makeFakeVault();
  await clearActor(actor);
  const connectionRef = await connect(actor, connectionPayload({ label: "Lifecycle", symbols: ["BTCUSDT"] }), vault);
  await sync(actor, connectionRef, vault, makeBinanceTransport({
    rowsBySymbol: {
      BTCUSDT: [fill({ id: 1, orderId: 11, symbol: "BTCUSDT", side: "buy", time: Date.now() - 120_000 })]
    }
  }));
  await expireCooldown(actor, connectionRef);
  await (await connectionData(actor, connectionRef)).ref.set({
    syncWatermarks: { BTCUSDT: Date.now() - 20_000 }
  }, { merge: true });
  await sync(actor, connectionRef, vault, makeBinanceTransport({
    rowsBySymbol: {
      BTCUSDT: [fill({ id: 2, orderId: 12, symbol: "BTCUSDT", side: "sell", price: "110", time: Date.now() - 1_000 })]
    }
  }));
  const rows = await visibleRows(actor, connectionRef);
  const openCount = rows.filter((row) => row.data.journalLifecycle === "open" || row.data.journalLifecycle === "partial").length;
  assert(
    rows.some((row) => row.data.side === "buy" && row.data.journalLifecycle === "open") &&
      rows.some((row) => row.data.side === "sell" && row.data.journalLifecycle === "execution_only") &&
      openCount === 1,
    "Actual repository preserves a buy in sync one and an unmatched sell in sync two without losing either execution or labeling the sell as another open trade."
  );
  await clearActor(actor);
}

async function testCopiedDedupeWithActualGeneration() {
  const actor = actorFor("dedupe");
  const vault = makeFakeVault();
  await clearActor(actor);
  const copiedIdentity = createProviderOrderExecutionIdentity({
    provider: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    providerOrderId: "11"
  });
  await db.collection(`${studentBase(actor)}/account_linked_trade_ledger`).doc("copied_buy").set({
    providerExecutionIdentity: copiedIdentity,
    tradeOrigin: "copied",
    providerConfirmed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const connectionRef = await connect(actor, connectionPayload({ label: "Dedupe", symbols: ["BTCUSDT"] }), vault);
  await sync(actor, connectionRef, vault, makeBinanceTransport({
    rowsBySymbol: {
      BTCUSDT: [
        fill({ id: 1, orderId: 11, symbol: "BTCUSDT", side: "buy", time: Date.now() - 120_000 }),
        fill({ id: 2, orderId: 12, symbol: "BTCUSDT", side: "sell", price: "110", time: Date.now() - 1_000 })
      ]
    }
  }));
  const rows = await visibleRows(actor, connectionRef);
  assert(
    rows.length === 1 &&
      rows[0].data.side === "sell" &&
      rows[0].data.journalLifecycle === "execution_only",
    "Actual repository dedupes a copied provider execution at execution-leg level while retaining the unmatched provider-manual sell."
  );
  await clearActor(actor);
}

await assertEmulatorAvailable();

for (const test of [
  testConcurrentFirstTimeCreateSerializesSameLogicalConnection,
  testFirstTimeMarkerDriftFailsClosedAndDiscardsOnlyCreatedVersion,
  testConcurrentFirstTimeCreatesRespectConnectionLimit,
  testExpiredFirstCreatePlaceholderRecoversSafely,
  testActiveSyncReplacementRace,
  testSameKeySecretRotationRejectedDuringSync,
  testReplacementFirstBlocksSyncBeforePendingSecretLoad,
  testRealLocalVaultPinnedVersionEnforcement,
  testRealLocalVaultRejectedVersionStates,
  testConcurrentSameKeySecretReplacements,
  testSuccessfulReplacementRetiresPreviousVersion,
  testFailedReplacementDiscardsAttemptOnly,
  testFailedReplacementDiscardFailureCreatesTargetedCleanupTask,
  testKeyedMutationNoOpAndChangedSecretReplacement,
  testRetirementFailureCreatesRetryableCleanupTask,
  testCredentialCleanupDueQueryOrderingAndStarvation,
  testProductionOverviewProcessesCredentialCleanupWithoutExposingIt,
  testConcurrentCleanupWorkersClaimOneRetirement,
  testCleanupNeverRetiresActiveCredentialAndFinalFailureIsBounded,
  testCredentialCleanupChangedActiveMarkerBlocksBeforeVaultCall,
  testCredentialReplacementAndSymbolReset,
  testFailedStagingAndPointerVisibility,
  testDisconnectDuringSync,
  testConcurrentConnections,
  testRepeatedEightSymbolCrawl,
  testBuyThenSellExecutionOnlyIncremental,
  testCopiedDedupeWithActualGeneration
]) {
  await test();
}

console.log("Stage 29G repository emulator QA passed through actual exported repository functions.");
