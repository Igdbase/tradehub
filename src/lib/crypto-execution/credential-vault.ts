import "server-only";

import crypto from "crypto";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type {
  CredentialStorageState,
  CryptoExchangeEnvironment,
  CryptoExchangeId,
  ForexConnectionEnvironment,
  ForexConnectionProvider
} from "@/types/crypto-execution";

const ALGORITHM = "aes-256-gcm";
const CLOUD_SECRET_MANAGER_MODE = "cloud_secret_manager";
const LOCAL_ENCRYPTED_MODE = "local_encrypted";

export type StoreCredentialInput = {
  workspaceId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  environment: CryptoExchangeEnvironment;
  apiKey: string;
  apiSecret: string;
};

export type StoreJournalCryptoCredentialInput = {
  workspaceId: string;
  studentId: string;
  connectionId: string;
  exchange: "binance" | "bybit";
  apiKey: string;
  apiSecret: string;
};

export type StoredCredentialMetadata = {
  credentialMetadataId: string;
  credentialRefPath: string;
  storageState: CredentialStorageState;
  credentialVersionMarker?: string;
};

type StoredSecretPayload = {
  apiKey: string;
  apiSecret: string;
  exchange: CryptoExchangeId;
  environment: CryptoExchangeEnvironment;
};

type StoredJournalCryptoSecretPayload = {
  apiKey: string;
  apiSecret: string;
  exchange: "binance" | "bybit";
  purpose: "journal_crypto_history";
  credentialVersionMarker?: string;
};

type StoredForexTokenPayload = {
  provider: ForexConnectionProvider;
  environment: ForexConnectionEnvironment;
  metaApiToken: string;
  metaApiAccountId: string;
};

function storageMode() {
  return process.env.CRYPTO_CREDENTIAL_STORAGE_MODE?.trim() ?? "";
}

function secretManagerProjectId() {
  return (
    process.env.CRYPTO_CREDENTIAL_SECRET_MANAGER_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    ""
  );
}

function secretManagerPrefix() {
  return (process.env.CRYPTO_CREDENTIAL_SECRET_MANAGER_PREFIX?.trim() || "tradehub-crypto")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .slice(0, 40);
}

export function getCredentialStorageReadiness() {
  const mode = storageMode();
  const projectId = secretManagerProjectId();
  const productionVaultReady =
    process.env.CRYPTO_CREDENTIAL_PRODUCTION_VAULT_READY === "true" &&
    mode === CLOUD_SECRET_MANAGER_MODE &&
    Boolean(projectId);

  return {
    mode,
    localEncrypted: mode === LOCAL_ENCRYPTED_MODE,
    productionVaultReady,
    safeMessage: productionVaultReady
      ? "Production credential vault is configured for Google Cloud Secret Manager by explicit server configuration."
      : "Production credential vault is unavailable. Configure Google Cloud Secret Manager storage before production live execution."
  };
}

function getLocalEncryptionKey() {
  const raw = process.env.CRYPTO_CREDENTIAL_LOCAL_ENCRYPTION_KEY?.trim();

  if (!raw) {
    throw new AdminApiError(
      503,
      "crypto_credential_storage_unavailable",
      "Crypto credential storage is not configured. Add KMS-backed storage before accepting real exchange keys."
    );
  }

  const decoded = /^[a-f0-9]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");

  if (decoded.length !== 32) {
    throw new AdminApiError(
      503,
      "crypto_credential_key_invalid",
      "Crypto credential storage is configured with an invalid local encryption key."
    );
  }

  return decoded;
}

function assertStorageAvailable() {
  if (storageMode() !== LOCAL_ENCRYPTED_MODE) {
    throw new AdminApiError(
      503,
      "crypto_credential_storage_unavailable",
      "Crypto credential storage is fail-closed until encrypted storage is configured."
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new AdminApiError(
      503,
      "crypto_credential_storage_unavailable",
      "Local encrypted credential storage is disabled in production. Configure KMS-backed storage before accepting real exchange keys."
    );
  }
}

function assertCloudSecretManagerAvailable() {
  const mode = storageMode();
  const projectId = secretManagerProjectId();

  if (
    mode !== CLOUD_SECRET_MANAGER_MODE ||
    process.env.CRYPTO_CREDENTIAL_PRODUCTION_VAULT_READY !== "true" ||
    !projectId
  ) {
    throw new AdminApiError(
      503,
      "crypto_production_vault_unavailable",
      "Production credential vault is fail-closed until Google Cloud Secret Manager is configured and marked ready."
    );
  }

  return projectId;
}

function credentialRefPathFor(workspaceId: string, studentId: string, connectionId: string) {
  return `broker_keys/${workspaceId}/students/${studentId}/connections/${connectionId}`;
}

function forexCredentialRefPathFor(workspaceId: string, studentId: string, connectionId: string) {
  return `broker_keys/${workspaceId}/students/${studentId}/forex_connections/${connectionId}`;
}

function journalCryptoCredentialRefPathFor(workspaceId: string, studentId: string, connectionId: string) {
  return `journal_crypto_keys/${workspaceId}/students/${studentId}/connections/${connectionId}`;
}

function localJournalCryptoVersionMarker(workspaceId: string, studentId: string, connectionId: string) {
  return `local_journal_crypto_${crypto
    .createHash("sha256")
    .update([
      workspaceId,
      studentId,
      connectionId,
      Date.now().toString(),
      crypto.randomBytes(16).toString("hex")
    ].join("|"))
    .digest("hex")
    .slice(0, 40)}`;
}

function mockJournalCryptoVersionMarker(workspaceId: string, studentId: string, connectionId: string) {
  return `mock_journal_crypto_${crypto
    .createHash("sha256")
    .update([
      workspaceId,
      studentId,
      connectionId,
      Date.now().toString(),
      crypto.randomBytes(8).toString("hex")
    ].join("|"))
    .digest("hex")
    .slice(0, 32)}`;
}

function assertRequestedJournalCredentialVersion(
  requestedMarker: unknown,
  activeMarker: unknown,
  storageState: unknown
) {
  const requested = typeof requestedMarker === "string" ? requestedMarker.trim() : "";
  const active = typeof activeMarker === "string" ? activeMarker.trim() : "";

  if (!requested || !active || requested !== active) {
    throw new AdminApiError(
      409,
      "journal_crypto_credential_version_mismatch",
      "Journal Sync credential changed before provider history could be requested."
    );
  }

  if (
    storageState === "pending" ||
    storageState === "retired" ||
    storageState === "discarded" ||
    storageState === "revoked"
  ) {
    throw new AdminApiError(
      403,
      "journal_crypto_credential_version_unavailable",
      "Journal Sync credential version is not available."
    );
  }

  return requested;
}

function secretIdFor(workspaceId: string, studentId: string, connectionId: string) {
  return [
    secretManagerPrefix(),
    workspaceId,
    studentId,
    connectionId
  ].join("-")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 255);
}

function secretNameFor(projectId: string, workspaceId: string, studentId: string, connectionId: string) {
  return `projects/${projectId}/secrets/${secretIdFor(workspaceId, studentId, connectionId)}`;
}

function journalCryptoMockModeEnabled() {
  return process.env.JOURNAL_CRYPTO_SYNC_FAKE_PROVIDER === "true" && process.env.NODE_ENV !== "production";
}

async function ensureSecret(client: SecretManagerServiceClient, projectId: string, secretId: string) {
  const parent = `projects/${projectId}`;

  try {
    await client.createSecret({
      parent,
      secretId,
      secret: {
        replication: {
          automatic: {}
        }
      }
    });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? Number((error as { code?: unknown }).code)
      : null;

    if (code !== 6) {
      throw error;
    }
  }
}

async function disableFailedSecretVersion(client: SecretManagerServiceClient, versionName: string) {
  if (!versionName) return;
  try {
    await client.destroySecretVersion({ name: versionName });
  } catch {
    try {
      await client.disableSecretVersion({ name: versionName });
    } catch {
      // The caller records a support-safe cleanup marker when credential replacement cannot be finalized.
    }
  }
}

function encryptJsonPayload(payload: Record<string, unknown>) {
  const key = getLocalEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: ALGORITHM,
    iv: iv.toString("base64"),
    ciphertext: encrypted.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

function encryptPayload(payload: StoredSecretPayload) {
  return encryptJsonPayload(payload);
}

function decryptPayload(record: Record<string, unknown>): StoredSecretPayload {
  const key = getLocalEncryptionKey();
  const iv = typeof record.iv === "string" ? Buffer.from(record.iv, "base64") : null;
  const ciphertext = typeof record.ciphertext === "string"
    ? Buffer.from(record.ciphertext, "base64")
    : null;
  const authTag = typeof record.authTag === "string" ? Buffer.from(record.authTag, "base64") : null;

  if (!iv || !ciphertext || !authTag || record.algorithm !== ALGORITHM) {
    throw new AdminApiError(
      500,
      "crypto_credential_record_invalid",
      "Stored crypto credential metadata is incomplete."
    );
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]).toString("utf8");
  const payload = JSON.parse(decrypted) as unknown;

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("apiKey" in payload) ||
    !("apiSecret" in payload) ||
    typeof payload.apiKey !== "string" ||
    typeof payload.apiSecret !== "string"
  ) {
    throw new AdminApiError(
      500,
      "crypto_credential_record_invalid",
      "Stored crypto credential payload is invalid."
    );
  }

  return payload as StoredSecretPayload;
}

function decryptJournalCryptoPayload(record: Record<string, unknown>): StoredJournalCryptoSecretPayload {
  const key = getLocalEncryptionKey();
  const iv = typeof record.iv === "string" ? Buffer.from(record.iv, "base64") : null;
  const ciphertext = typeof record.ciphertext === "string"
    ? Buffer.from(record.ciphertext, "base64")
    : null;
  const authTag = typeof record.authTag === "string" ? Buffer.from(record.authTag, "base64") : null;

  if (!iv || !ciphertext || !authTag || record.algorithm !== ALGORITHM) {
    throw new AdminApiError(
      500,
      "journal_crypto_credential_record_invalid",
      "Stored Journal Sync credential metadata is incomplete."
    );
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]).toString("utf8");
  const payload = JSON.parse(decrypted) as unknown;

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("apiKey" in payload) ||
    !("apiSecret" in payload) ||
    !("exchange" in payload) ||
    typeof payload.apiKey !== "string" ||
    typeof payload.apiSecret !== "string" ||
    (payload.exchange !== "binance" && payload.exchange !== "bybit")
  ) {
    throw new AdminApiError(
      500,
      "journal_crypto_credential_record_invalid",
      "Stored Journal Sync credential payload is invalid."
    );
  }

  return payload as StoredJournalCryptoSecretPayload;
}

function decryptForexPayload(record: Record<string, unknown>): StoredForexTokenPayload {
  const key = getLocalEncryptionKey();
  const iv = typeof record.iv === "string" ? Buffer.from(record.iv, "base64") : null;
  const ciphertext = typeof record.ciphertext === "string"
    ? Buffer.from(record.ciphertext, "base64")
    : null;
  const authTag = typeof record.authTag === "string" ? Buffer.from(record.authTag, "base64") : null;

  if (!iv || !ciphertext || !authTag || record.algorithm !== ALGORITHM) {
    throw new AdminApiError(
      500,
      "forex_token_record_invalid",
      "Stored forex token metadata is incomplete."
    );
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]).toString("utf8");
  const payload = JSON.parse(decrypted) as unknown;

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("metaApiToken" in payload) ||
    !("metaApiAccountId" in payload) ||
    typeof payload.metaApiToken !== "string" ||
    typeof payload.metaApiAccountId !== "string"
  ) {
    throw new AdminApiError(
      500,
      "forex_token_record_invalid",
      "Stored forex token payload is invalid."
    );
  }

  return payload as StoredForexTokenPayload;
}

function forexMockModeEnabled() {
  return process.env.FOREX_EXECUTION_MOCK_METAAPI === "true" && process.env.NODE_ENV !== "production";
}

export async function storeExchangeCredential({
  workspaceId,
  studentId,
  connectionId,
  exchange,
  environment,
  apiKey,
  apiSecret
}: StoreCredentialInput): Promise<StoredCredentialMetadata> {
  if (environment === "production") {
    const projectId = assertCloudSecretManagerAvailable();
    const { db } = getFirebaseAdminClients();
    const client = new SecretManagerServiceClient();
    const credentialRefPath = credentialRefPathFor(workspaceId, studentId, connectionId);
    const secretId = secretIdFor(workspaceId, studentId, connectionId);
    const secretName = secretNameFor(projectId, workspaceId, studentId, connectionId);
    const now = new Date().toISOString();

    try {
      await ensureSecret(client, projectId, secretId);
      await client.addSecretVersion({
        parent: secretName,
        payload: {
          data: Buffer.from(JSON.stringify({ apiKey, apiSecret, exchange, environment }), "utf8")
        }
      });
    } catch {
      throw new AdminApiError(
        503,
        "crypto_production_vault_write_failed",
        "TradeHub could not store the production exchange credential in the configured vault."
      );
    }

    await db.doc(credentialRefPath).set({
      workspaceId,
      studentId,
      connectionId,
      exchange,
      environment,
      storageMode: CLOUD_SECRET_MANAGER_MODE,
      secretManagerProjectId: projectId,
      secretManagerSecretName: secretName,
      storageState: "encrypted_reference_ready",
      createdAt: now,
      rotatedAt: now,
      revokedAt: null
    }, { merge: true });

    return {
      credentialMetadataId: connectionId,
      credentialRefPath,
      storageState: "encrypted_reference_ready"
    };
  }

  assertStorageAvailable();

  const { db } = getFirebaseAdminClients();
  const credentialRefPath = credentialRefPathFor(workspaceId, studentId, connectionId);
  const encrypted = encryptPayload({ apiKey, apiSecret, exchange, environment });
  const now = new Date().toISOString();

  await db.doc(credentialRefPath).set({
    ...encrypted,
    workspaceId,
    studentId,
    connectionId,
    exchange,
    environment,
    storageMode: LOCAL_ENCRYPTED_MODE,
    createdAt: now,
    rotatedAt: now
  });

  return {
    credentialMetadataId: connectionId,
    credentialRefPath,
    storageState: "encrypted_reference_ready"
  };
}

export async function loadExchangeCredential({
  workspaceId,
  studentId,
  connectionId
}: {
  workspaceId: string;
  studentId: string;
  connectionId: string;
}) {
  const { db } = getFirebaseAdminClients();
  const credentialRefPath = credentialRefPathFor(workspaceId, studentId, connectionId);
  const snapshot = await db.doc(credentialRefPath).get();

  if (!snapshot.exists) {
    throw new AdminApiError(
      404,
      "crypto_credential_not_found",
      "This exchange connection does not have stored credential material."
    );
  }

  const record = snapshot.data() ?? {};

  if (record.revokedAt || record.storageState === "revoked") {
    throw new AdminApiError(
      403,
      "crypto_credential_revoked",
      "This exchange credential has been revoked."
    );
  }

  if (record.environment === "production" || record.storageMode === CLOUD_SECRET_MANAGER_MODE) {
    assertCloudSecretManagerAvailable();

    if (record.storageMode !== CLOUD_SECRET_MANAGER_MODE || typeof record.secretManagerSecretName !== "string") {
      throw new AdminApiError(
        503,
        "crypto_production_vault_reference_invalid",
        "Production credential vault metadata is incomplete."
      );
    }

    const client = new SecretManagerServiceClient();

    try {
      const [version] = await client.accessSecretVersion({
        name: `${record.secretManagerSecretName}/versions/latest`
      });
      const raw = version.payload?.data?.toString();
      const payload = raw ? JSON.parse(raw) as unknown : null;

      if (
        typeof payload !== "object" ||
        payload === null ||
        !("apiKey" in payload) ||
        !("apiSecret" in payload) ||
        typeof payload.apiKey !== "string" ||
        typeof payload.apiSecret !== "string"
      ) {
        throw new Error("invalid production credential payload");
      }

      return payload as StoredSecretPayload;
    } catch {
      throw new AdminApiError(
        503,
        "crypto_production_vault_load_failed",
        "TradeHub could not load the production exchange credential from the configured vault."
      );
    }
  }

  assertStorageAvailable();
  return decryptPayload(record);
}

export async function revokeExchangeCredential({
  workspaceId,
  studentId,
  connectionId
}: {
  workspaceId: string;
  studentId: string;
  connectionId: string;
}) {
  const { db } = getFirebaseAdminClients();
  const credentialRefPath = credentialRefPathFor(workspaceId, studentId, connectionId);

  await db.doc(credentialRefPath).set(
    {
      revokedAt: new Date().toISOString(),
      storageState: "revoked"
    },
    { merge: true }
  );
}

export async function storeJournalCryptoCredential({
  workspaceId,
  studentId,
  connectionId,
  exchange,
  apiKey,
  apiSecret
}: StoreJournalCryptoCredentialInput): Promise<StoredCredentialMetadata> {
  const { db } = getFirebaseAdminClients();
  const credentialRefPath = journalCryptoCredentialRefPathFor(workspaceId, studentId, connectionId);
  const now = new Date().toISOString();

  if (journalCryptoMockModeEnabled()) {
    const credentialVersionMarker = mockJournalCryptoVersionMarker(workspaceId, studentId, connectionId);
    await db.doc(credentialRefPath).set({
      workspaceId,
      studentId,
      connectionId,
      exchange,
      purpose: "journal_crypto_history",
      storageMode: "mock_metadata_only",
      storageState: "metadata_only",
      credentialVersionMarker,
      createdAt: now,
      rotatedAt: now,
      revokedAt: null
    }, { merge: true });

    return {
      credentialMetadataId: connectionId,
      credentialRefPath,
      storageState: "metadata_only",
      credentialVersionMarker
    };
  }

  if (process.env.NODE_ENV === "production") {
    const projectId = assertCloudSecretManagerAvailable();
    const client = new SecretManagerServiceClient();
    const secretId = secretIdFor(workspaceId, studentId, `journal-crypto-${connectionId}`);
    const secretName = secretNameFor(projectId, workspaceId, studentId, `journal-crypto-${connectionId}`);

    let secretManagerSecretVersionName = "";
    try {
      await ensureSecret(client, projectId, secretId);
      const [version] = await client.addSecretVersion({
        parent: secretName,
        payload: {
          data: Buffer.from(JSON.stringify({
            apiKey,
            apiSecret,
            exchange,
            purpose: "journal_crypto_history"
          }), "utf8")
        }
      });
      secretManagerSecretVersionName = version.name ?? "";
    } catch {
      throw new AdminApiError(
        503,
        "journal_crypto_production_vault_write_failed",
        "TradeHub could not store the Journal Sync credential in the configured production vault."
      );
    }

    try {
      await db.doc(credentialRefPath).set({
        workspaceId,
        studentId,
        connectionId,
        exchange,
        purpose: "journal_crypto_history",
        storageMode: CLOUD_SECRET_MANAGER_MODE,
        secretManagerProjectId: projectId,
        secretManagerSecretName: secretName,
        secretManagerSecretVersionName,
        storageState: "encrypted_reference_ready",
        createdAt: now,
        rotatedAt: now,
        revokedAt: null
      }, { merge: true });
    } catch (error) {
      await disableFailedSecretVersion(client, secretManagerSecretVersionName);
      throw error;
    }

    return {
      credentialMetadataId: connectionId,
      credentialRefPath,
      storageState: "encrypted_reference_ready",
      credentialVersionMarker: secretManagerSecretVersionName
    };
  }

  assertStorageAvailable();

  const credentialVersionMarker = localJournalCryptoVersionMarker(workspaceId, studentId, connectionId);
  await db.doc(`${credentialRefPath}/versions/${credentialVersionMarker}`).set({
    ...encryptJsonPayload({
      apiKey,
      apiSecret,
      exchange,
      purpose: "journal_crypto_history"
    }),
    workspaceId,
    studentId,
    connectionId,
    exchange,
    purpose: "journal_crypto_history",
    storageMode: LOCAL_ENCRYPTED_MODE,
    storageState: "encrypted_reference_ready",
    credentialVersionMarker,
    createdAt: now,
    rotatedAt: now,
    revokedAt: null
  });
  await db.doc(credentialRefPath).set({
    workspaceId,
    studentId,
    connectionId,
    exchange,
    purpose: "journal_crypto_history",
    storageMode: LOCAL_ENCRYPTED_MODE,
    storageState: "encrypted_reference_ready",
    credentialVersionMarker,
    createdAt: now,
    rotatedAt: now,
    revokedAt: null
  }, { merge: true });

  return {
    credentialMetadataId: connectionId,
    credentialRefPath,
    storageState: "encrypted_reference_ready",
    credentialVersionMarker
  };
}

export async function loadJournalCryptoCredential({
  workspaceId,
  studentId,
  connectionId,
  credentialVersionMarker
}: {
  workspaceId: string;
  studentId: string;
  connectionId: string;
  credentialVersionMarker?: string;
}): Promise<StoredJournalCryptoSecretPayload> {
  const { db } = getFirebaseAdminClients();
  const credentialRefPath = journalCryptoCredentialRefPathFor(workspaceId, studentId, connectionId);
  const snapshot = await db.doc(credentialRefPath).get();

  if (!snapshot.exists) {
    throw new AdminApiError(
      404,
      "journal_crypto_credential_not_found",
      "This Journal Sync connection does not have stored credential material."
    );
  }

  const record = snapshot.data() ?? {};
  if (record.revokedAt || record.storageState === "revoked") {
    throw new AdminApiError(
      403,
      "journal_crypto_credential_revoked",
      "This Journal Sync credential has been revoked."
    );
  }

  if (record.storageMode === "mock_metadata_only") {
    if (!journalCryptoMockModeEnabled()) {
      throw new AdminApiError(503, "journal_crypto_mock_disabled", "Mock Journal Sync credentials are disabled.");
    }
    const requestedMarker = assertRequestedJournalCredentialVersion(
      credentialVersionMarker,
      record.credentialVersionMarker,
      record.storageState
    );
    return {
      apiKey: "journal-sync-mock-key",
      apiSecret: "journal-sync-mock-secret",
      exchange: record.exchange === "bybit" ? "bybit" : "binance",
      purpose: "journal_crypto_history",
      credentialVersionMarker: requestedMarker
    };
  }

  if (record.storageMode === CLOUD_SECRET_MANAGER_MODE) {
    assertCloudSecretManagerAvailable();

    if (typeof record.secretManagerSecretName !== "string" ||
      typeof record.secretManagerSecretVersionName !== "string") {
      throw new AdminApiError(
        503,
        "journal_crypto_production_vault_reference_invalid",
        "Production Journal Sync credential vault metadata is incomplete."
      );
    }

    const client = new SecretManagerServiceClient();

    try {
      const versionName = assertRequestedJournalCredentialVersion(
        credentialVersionMarker,
        record.secretManagerSecretVersionName,
        record.storageState
      );
      const [version] = await client.accessSecretVersion({ name: versionName });
      const raw = version.payload?.data?.toString();
      const payload = raw ? JSON.parse(raw) as unknown : null;

      if (
        typeof payload !== "object" ||
        payload === null ||
        !("apiKey" in payload) ||
        !("apiSecret" in payload) ||
        typeof payload.apiKey !== "string" ||
        typeof payload.apiSecret !== "string"
      ) {
        throw new Error("invalid Journal Sync credential payload");
      }

      return {
        ...(payload as StoredJournalCryptoSecretPayload),
        credentialVersionMarker: versionName
      };
    } catch {
      throw new AdminApiError(
        503,
        "journal_crypto_production_vault_load_failed",
        "TradeHub could not load the Journal Sync credential from the configured vault."
      );
    }
  }

  assertStorageAvailable();
  const requestedMarker = assertRequestedJournalCredentialVersion(
    credentialVersionMarker,
    record.credentialVersionMarker,
    record.storageState
  );
  const versionSnapshot = await db.doc(`${credentialRefPath}/versions/${requestedMarker}`).get();
  if (!versionSnapshot.exists) {
    throw new AdminApiError(
      404,
      "journal_crypto_credential_version_not_found",
      "This Journal Sync credential version is unavailable."
    );
  }
  const versionRecord = versionSnapshot.data() ?? {};
  assertRequestedJournalCredentialVersion(
    requestedMarker,
    versionRecord.credentialVersionMarker,
    versionRecord.storageState
  );
  return {
    ...decryptJournalCryptoPayload(versionRecord),
    credentialVersionMarker: requestedMarker
  };
}

export async function discardJournalCryptoCredentialVersion({
  secretManagerSecretVersionName
}: {
  secretManagerSecretVersionName: string;
}) {
  if (!secretManagerSecretVersionName.includes("/versions/")) {
    const { db } = getFirebaseAdminClients();
    const snapshot = await db.collectionGroup("versions")
      .where("credentialVersionMarker", "==", secretManagerSecretVersionName)
      .limit(5)
      .get();
    const now = new Date().toISOString();
    for (const doc of snapshot.docs) {
      await doc.ref.set({
        storageState: "discarded",
        discardedAt: now,
        updatedAt: now
      }, { merge: true });
    }
    return;
  }
  assertCloudSecretManagerAvailable();
  const client = new SecretManagerServiceClient();
  await disableFailedSecretVersion(client, secretManagerSecretVersionName);
}

export async function retireJournalCryptoCredentialVersion({
  secretManagerSecretVersionName
}: {
  secretManagerSecretVersionName: string;
}) {
  if (!secretManagerSecretVersionName.includes("/versions/")) {
    const { db } = getFirebaseAdminClients();
    const snapshot = await db.collectionGroup("versions")
      .where("credentialVersionMarker", "==", secretManagerSecretVersionName)
      .limit(5)
      .get();
    const now = new Date().toISOString();
    for (const doc of snapshot.docs) {
      await doc.ref.set({
        storageState: "retired",
        retiredAt: now,
        updatedAt: now
      }, { merge: true });
    }
    return;
  }
  assertCloudSecretManagerAvailable();
  const client = new SecretManagerServiceClient();
  await client.disableSecretVersion({ name: secretManagerSecretVersionName });
}

export async function revokeJournalCryptoCredential({
  workspaceId,
  studentId,
  connectionId
}: {
  workspaceId: string;
  studentId: string;
  connectionId: string;
}) {
  const { db } = getFirebaseAdminClients();
  const credentialRefPath = journalCryptoCredentialRefPathFor(workspaceId, studentId, connectionId);
  const credentialRef = db.doc(credentialRefPath);
  const snapshot = await credentialRef.get();
  const record = snapshot.data() ?? {};

  if (record.storageMode === CLOUD_SECRET_MANAGER_MODE) {
    assertCloudSecretManagerAvailable();
    if (typeof record.secretManagerSecretName !== "string" || !record.secretManagerSecretName) {
      throw new AdminApiError(
        503,
        "journal_crypto_production_vault_reference_invalid",
        "Production Journal Sync credential vault metadata is incomplete."
      );
    }
    const client = new SecretManagerServiceClient();
    try {
      await client.deleteSecret({ name: record.secretManagerSecretName });
    } catch {
      throw new AdminApiError(
        503,
        "journal_crypto_production_vault_delete_failed",
        "TradeHub could not delete the Journal Sync credential from the configured vault."
      );
    }
  }

  const localVersions = await db.collection(`${credentialRefPath}/versions`).limit(50).get();
  for (const doc of localVersions.docs) {
    await doc.ref.set({
      storageState: "revoked",
      revokedAt: new Date().toISOString()
    }, { merge: true });
  }
  await credentialRef.delete();
}

export async function storeForexMetaApiToken({
  workspaceId,
  studentId,
  connectionId,
  provider,
  environment,
  metaApiToken,
  metaApiAccountId
}: {
  workspaceId: string;
  studentId: string;
  connectionId: string;
  provider: ForexConnectionProvider;
  environment: ForexConnectionEnvironment;
  metaApiToken: string;
  metaApiAccountId: string;
}): Promise<StoredCredentialMetadata> {
  const { db } = getFirebaseAdminClients();
  const credentialRefPath = forexCredentialRefPathFor(workspaceId, studentId, connectionId);
  const now = new Date().toISOString();

  if (forexMockModeEnabled()) {
    await db.doc(credentialRefPath).set({
      workspaceId,
      studentId,
      connectionId,
      provider,
      environment,
      storageMode: "mock_metadata_only",
      storageState: "metadata_only",
      createdAt: now,
      rotatedAt: now,
      revokedAt: null
    }, { merge: true });

    return {
      credentialMetadataId: connectionId,
      credentialRefPath,
      storageState: "metadata_only"
    };
  }

  if (environment === "production") {
    const projectId = assertCloudSecretManagerAvailable();
    const client = new SecretManagerServiceClient();
    const secretId = secretIdFor(workspaceId, studentId, `forex-${connectionId}`);
    const secretName = secretNameFor(projectId, workspaceId, studentId, `forex-${connectionId}`);

    try {
      await ensureSecret(client, projectId, secretId);
      await client.addSecretVersion({
        parent: secretName,
        payload: {
          data: Buffer.from(JSON.stringify({
            provider,
            environment,
            metaApiToken,
            metaApiAccountId
          }), "utf8")
        }
      });
    } catch {
      throw new AdminApiError(
        503,
        "forex_production_vault_write_failed",
        "TradeHub could not store the MetaAPI token in the configured production vault."
      );
    }

    await db.doc(credentialRefPath).set({
      workspaceId,
      studentId,
      connectionId,
      provider,
      environment,
      storageMode: CLOUD_SECRET_MANAGER_MODE,
      secretManagerProjectId: projectId,
      secretManagerSecretName: secretName,
      storageState: "encrypted_reference_ready",
      createdAt: now,
      rotatedAt: now,
      revokedAt: null
    }, { merge: true });

    return {
      credentialMetadataId: connectionId,
      credentialRefPath,
      storageState: "encrypted_reference_ready"
    };
  }

  assertStorageAvailable();

  await db.doc(credentialRefPath).set({
    ...encryptJsonPayload({
      provider,
      environment,
      metaApiToken,
      metaApiAccountId
    }),
    workspaceId,
    studentId,
    connectionId,
    provider,
    environment,
    storageMode: LOCAL_ENCRYPTED_MODE,
    storageState: "encrypted_reference_ready",
    createdAt: now,
    rotatedAt: now
  });

  return {
    credentialMetadataId: connectionId,
    credentialRefPath,
    storageState: "encrypted_reference_ready"
  };
}

export async function loadForexMetaApiToken({
  workspaceId,
  studentId,
  connectionId
}: {
  workspaceId: string;
  studentId: string;
  connectionId: string;
}): Promise<StoredForexTokenPayload> {
  const { db } = getFirebaseAdminClients();
  const credentialRefPath = forexCredentialRefPathFor(workspaceId, studentId, connectionId);
  const snapshot = await db.doc(credentialRefPath).get();

  if (!snapshot.exists) {
    throw new AdminApiError(
      404,
      "forex_token_not_found",
      "This forex connection does not have stored token material."
    );
  }

  const record = snapshot.data() ?? {};

  if (record.revokedAt || record.storageState === "revoked") {
    throw new AdminApiError(
      403,
      "forex_token_revoked",
      "This forex connection token has been revoked."
    );
  }

  if (record.storageMode === "mock_metadata_only") {
    throw new AdminApiError(
      503,
      "forex_mock_token_unavailable",
      "Mock forex metadata does not contain a loadable MetaAPI token."
    );
  }

  if (record.environment === "production" || record.storageMode === CLOUD_SECRET_MANAGER_MODE) {
    assertCloudSecretManagerAvailable();

    if (record.storageMode !== CLOUD_SECRET_MANAGER_MODE || typeof record.secretManagerSecretName !== "string") {
      throw new AdminApiError(
        503,
        "forex_production_vault_reference_invalid",
        "Production MetaAPI token vault metadata is incomplete."
      );
    }

    const client = new SecretManagerServiceClient();

    try {
      const [version] = await client.accessSecretVersion({
        name: `${record.secretManagerSecretName}/versions/latest`
      });
      const raw = version.payload?.data?.toString();
      const payload = raw ? JSON.parse(raw) as unknown : null;

      if (
        typeof payload !== "object" ||
        payload === null ||
        !("metaApiToken" in payload) ||
        !("metaApiAccountId" in payload) ||
        typeof payload.metaApiToken !== "string" ||
        typeof payload.metaApiAccountId !== "string"
      ) {
        throw new Error("invalid forex token payload");
      }

      return payload as StoredForexTokenPayload;
    } catch {
      throw new AdminApiError(
        503,
        "forex_production_vault_load_failed",
        "TradeHub could not load the MetaAPI token from the configured vault."
      );
    }
  }

  assertStorageAvailable();
  return decryptForexPayload(record);
}

export async function revokeForexMetaApiToken({
  workspaceId,
  studentId,
  connectionId
}: {
  workspaceId: string;
  studentId: string;
  connectionId: string;
}) {
  const { db } = getFirebaseAdminClients();
  const credentialRefPath = forexCredentialRefPathFor(workspaceId, studentId, connectionId);

  await db.doc(credentialRefPath).set(
    {
      revokedAt: new Date().toISOString(),
      storageState: "revoked"
    },
    { merge: true }
  );
}
