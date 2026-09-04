import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import type {
  CryptoExchangeEnvironment,
  CryptoExchangeId,
  ExchangeConnectionRecord,
  ExchangeConnectionStatus,
  ExchangeConnectionSummary,
  PermissionVerificationStatus,
  PlatformExecutionControlRecord,
  StudentExecutionOptInState,
  StudentExecutionPreferencesRecord,
  WorkspaceExecutionControlRecord,
  WithdrawalPermissionState
} from "@/types/crypto-execution";

export function recordFromSnapshot(snapshot: DocumentSnapshot<DocumentData>, idField = "id") {
  const data = snapshot.data() ?? {};

  return {
    ...data,
    [idField]: data[idField] ?? snapshot.id
  };
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
        .map((entry) => entry.trim().toUpperCase())
        .slice(0, 50)
    : [];
}

export function normalizeIsoDate(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date ? date.toISOString() : fallback;
  }

  return fallback;
}

function normalizeExchange(value: unknown): CryptoExchangeId {
  return value === "bybit" ? "bybit" : "binance";
}

function normalizeEnvironment(value: unknown): CryptoExchangeEnvironment {
  return value === "production" ? "production" : "sandbox";
}

function normalizeConnectionStatus(value: unknown): ExchangeConnectionStatus {
  switch (value) {
    case "pending_verification":
    case "verified":
    case "rejected":
    case "disabled":
    case "error":
      return value;
    default:
      return "not_connected";
  }
}

function normalizeCredentialStorageState(value: unknown): ExchangeConnectionRecord["credentialStorageState"] {
  switch (value) {
    case "metadata_only":
    case "pending_encrypted_storage":
    case "encrypted_reference_ready":
    case "rotation_required":
    case "revoked":
      return value;
    default:
      return "not_collected";
  }
}

function normalizePermissionStatus(value: unknown): PermissionVerificationStatus {
  switch (value) {
    case "passed":
    case "failed":
    case "stale":
      return value;
    default:
      return "not_checked";
  }
}

function normalizeWithdrawalState(value: unknown): WithdrawalPermissionState {
  switch (value) {
    case "confirmed_disabled":
    case "detected_enabled":
      return value;
    default:
      return "unknown";
  }
}

function normalizeOptInState(value: unknown): StudentExecutionOptInState {
  switch (value) {
    case "opted_in_paper":
    case "live_requested":
    case "live_enabled":
    case "paused":
    case "disabled":
      return value;
    default:
      return "not_started";
  }
}

export function createDefaultStudentExecutionPreferences(
  workspaceId: string,
  studentId: string
): StudentExecutionPreferencesRecord {
  return {
    workspaceId,
    studentId,
    optInState: "not_started",
    paperTradingOnly: true,
    studentPaused: false,
    maxRiskPercentPerTrade: 1,
    maxDailyLossPercent: 3,
    maxOpenTrades: 3,
    allowedSymbols: [],
    updatedAt: new Date().toISOString()
  };
}

export function mapStudentExecutionPreferencesRecord(
  record: Record<string, unknown> | null,
  workspaceId: string,
  studentId: string
): StudentExecutionPreferencesRecord {
  const fallback = createDefaultStudentExecutionPreferences(workspaceId, studentId);

  if (!record) {
    return fallback;
  }

  return {
    workspaceId: asString(record.workspaceId, workspaceId),
    studentId: asString(record.studentId, studentId),
    optInState: normalizeOptInState(record.optInState),
    paperTradingOnly: asBoolean(record.paperTradingOnly, true),
    studentPaused: asBoolean(record.studentPaused),
    studentPausedAt: record.studentPausedAt ? normalizeIsoDate(record.studentPausedAt) : undefined,
    maxRiskPercentPerTrade: asNumber(
      record.maxRiskPercentPerTrade,
      fallback.maxRiskPercentPerTrade
    ),
    maxDailyLossPercent: asNumber(record.maxDailyLossPercent, fallback.maxDailyLossPercent),
    maxOpenTrades: asNumber(record.maxOpenTrades, fallback.maxOpenTrades),
    allowedSymbols: asStringArray(record.allowedSymbols),
    riskDisclosureAcceptedAt: record.riskDisclosureAcceptedAt
      ? normalizeIsoDate(record.riskDisclosureAcceptedAt)
      : undefined,
    propFirmDisclosureAcceptedAt: record.propFirmDisclosureAcceptedAt
      ? normalizeIsoDate(record.propFirmDisclosureAcceptedAt)
      : undefined,
    updatedAt: normalizeIsoDate(record.updatedAt),
    updatedBy: asString(record.updatedBy) || undefined
  };
}

export function mapExchangeConnectionRecord(
  record: Record<string, unknown>,
  ids: {
    workspaceId: string;
    studentId: string;
    connectionId: string;
  }
): ExchangeConnectionRecord {
  const status = normalizeConnectionStatus(record.status);
  const exchange = normalizeExchange(record.exchange);
  const storageState = normalizeCredentialStorageState(
    record.credentialStorageState ?? record.storageState
  );
  const permissionVerification = normalizePermissionStatus(record.permissionVerification);
  const withdrawalPermission = normalizeWithdrawalState(record.withdrawalPermission);
  const createdAt = normalizeIsoDate(record.createdAt);

  return {
    connectionId: ids.connectionId,
    workspaceId: asString(record.workspaceId, ids.workspaceId),
    studentId: asString(record.studentId, ids.studentId),
    exchange,
    environment: normalizeEnvironment(record.environment),
    market: "crypto",
    accountKind: "personal_exchange",
    status,
    connectionLabel: asString(
      record.connectionLabel,
      exchange === "binance" ? "Binance personal account" : "Bybit personal account"
    ),
    credentialMetadataId: asString(record.credentialMetadataId) || undefined,
    credentialRefPath: asString(record.credentialRefPath) || undefined,
    credentialStorageState: storageState,
    permissionVerification,
    withdrawalPermission,
    keyFingerprint: asString(record.keyFingerprint) || undefined,
    lastVerifiedAt: record.lastVerifiedAt ? normalizeIsoDate(record.lastVerifiedAt) : undefined,
    lastHealthCheckAt: record.lastHealthCheckAt
      ? normalizeIsoDate(record.lastHealthCheckAt)
      : undefined,
    disabledAt: record.disabledAt ? normalizeIsoDate(record.disabledAt) : undefined,
    disabledReason: asString(record.disabledReason) || undefined,
    supportSafeMessage: asString(
      record.supportSafeMessage,
      status === "verified"
        ? "Connection metadata is present. Permission checks still run server-side before execution."
        : "No verified crypto exchange connection is ready for execution yet."
    ),
    createdAt,
    updatedAt: normalizeIsoDate(record.updatedAt, createdAt)
  };
}

export function toExchangeConnectionSummary(
  connection: ExchangeConnectionRecord
): ExchangeConnectionSummary {
  const safeConnection = { ...connection };

  delete safeConnection.credentialRefPath;

  return safeConnection;
}

export function createDefaultWorkspaceExecutionControl(
  workspaceId: string
): WorkspaceExecutionControlRecord {
  return {
    workspaceId,
    killSwitchEnabled: false,
    sandboxOnly: true,
    updatedAt: new Date().toISOString()
  };
}

export function mapWorkspaceExecutionControlRecord(
  record: Record<string, unknown> | null,
  workspaceId: string
): WorkspaceExecutionControlRecord {
  if (!record) {
    return createDefaultWorkspaceExecutionControl(workspaceId);
  }

  return {
    workspaceId: asString(record.workspaceId, workspaceId),
    killSwitchEnabled: asBoolean(record.killSwitchEnabled),
    killSwitchReason: asString(record.killSwitchReason) || undefined,
    pausedBy: asString(record.pausedBy) || undefined,
    pausedAt: record.pausedAt ? normalizeIsoDate(record.pausedAt) : undefined,
    resumedAt: record.resumedAt ? normalizeIsoDate(record.resumedAt) : undefined,
    sandboxOnly: asBoolean(record.sandboxOnly, true),
    updatedAt: normalizeIsoDate(record.updatedAt)
  };
}

export function createDefaultPlatformExecutionControl(): PlatformExecutionControlRecord {
  return {
    killSwitchEnabled: false,
    sandboxOnly: true,
    updatedAt: new Date().toISOString()
  };
}

export function mapPlatformExecutionControlRecord(
  record: Record<string, unknown> | null
): PlatformExecutionControlRecord {
  if (!record) {
    return createDefaultPlatformExecutionControl();
  }

  return {
    killSwitchEnabled: asBoolean(record.killSwitchEnabled),
    killSwitchReason: asString(record.killSwitchReason) || undefined,
    pausedBy: asString(record.pausedBy) || undefined,
    pausedAt: record.pausedAt ? normalizeIsoDate(record.pausedAt) : undefined,
    resumedAt: record.resumedAt ? normalizeIsoDate(record.resumedAt) : undefined,
    sandboxOnly: asBoolean(record.sandboxOnly, true),
    updatedAt: normalizeIsoDate(record.updatedAt)
  };
}
