import { AdminApiError } from "@/lib/firebase/admin-errors";
import type {
  CryptoExchangeEnvironment,
  CryptoExchangeId,
  CryptoExecutionReadiness,
  CryptoAutoCopySubscriptionPreview,
  ExchangeConnectionSummary,
  PlatformExecutionControlRecord,
  StudentExecutionPreferencesRecord,
  WorkspaceExecutionControlRecord
} from "@/types/crypto-execution";
import type { StudentEntitlementSummary } from "@/types/entitlements";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeSymbol(value: unknown) {
  return asString(value).toUpperCase().replace(/[^A-Z0-9/_:-]/g, "").slice(0, 24);
}

function sanitizeConnectionId(value: unknown) {
  return asString(value).toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 80);
}

function clampPercent(value: unknown, fallback: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function normalizeIdPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function validateStudentExecutionPreferencesPayload(
  payload: unknown,
  current: StudentExecutionPreferencesRecord
): StudentExecutionPreferencesRecord {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send valid execution preference data.");
  }

  const allowedSymbols = Array.isArray(payload.allowedSymbols)
    ? payload.allowedSymbols.map(sanitizeSymbol).filter(Boolean).slice(0, 50)
    : typeof payload.allowedSymbols === "string"
      ? payload.allowedSymbols.split(",").map(sanitizeSymbol).filter(Boolean).slice(0, 50)
      : current.allowedSymbols;
  const maxOpenTrades = Number(payload.maxOpenTrades);
  const optInState =
    payload.optInState === "opted_in_paper" ||
    payload.optInState === "paused" ||
    payload.optInState === "disabled"
      ? payload.optInState
      : current.optInState;
  const studentPaused =
    typeof payload.studentPaused === "boolean"
      ? payload.studentPaused
      : optInState === "paused"
        ? true
        : current.studentPaused;

  return {
    ...current,
    optInState,
    paperTradingOnly: true,
    studentPaused,
    studentPausedAt: studentPaused ? new Date().toISOString() : undefined,
    maxRiskPercentPerTrade: clampPercent(
      payload.maxRiskPercentPerTrade,
      current.maxRiskPercentPerTrade,
      10
    ),
    maxDailyLossPercent: clampPercent(payload.maxDailyLossPercent, current.maxDailyLossPercent, 50),
    maxOpenTrades: Math.min(Math.max(Number.isInteger(maxOpenTrades) ? maxOpenTrades : current.maxOpenTrades, 1), 25),
    allowedSymbols,
    riskDisclosureAcceptedAt:
      typeof payload.riskDisclosureAcceptedAt === "string" && Number.isFinite(Date.parse(payload.riskDisclosureAcceptedAt))
        ? payload.riskDisclosureAcceptedAt
        : current.riskDisclosureAcceptedAt,
    propFirmDisclosureAcceptedAt:
      typeof payload.propFirmDisclosureAcceptedAt === "string" && Number.isFinite(Date.parse(payload.propFirmDisclosureAcceptedAt))
        ? payload.propFirmDisclosureAcceptedAt
        : current.propFirmDisclosureAcceptedAt,
    updatedAt: new Date().toISOString()
  };
}

export function validateExchangeConnectionPayload(payload: unknown): {
  exchange: CryptoExchangeId;
  environment: CryptoExchangeEnvironment;
  apiKey: string;
  apiSecret: string;
  riskAcknowledged: boolean;
  personalAccountAcknowledged: boolean;
} {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send valid exchange connection data.");
  }

  const exchange = payload.exchange === "bybit" ? "bybit" : payload.exchange === "binance" ? "binance" : null;
  const environment =
    payload.environment === "sandbox" || payload.environment === "production"
      ? payload.environment
      : null;
  const apiKey = asString(payload.apiKey).slice(0, 256);
  const apiSecret = asString(payload.apiSecret).slice(0, 512);
  const fields: Record<string, string> = {};

  if (!exchange) {
    fields.exchange = "Choose Binance or Bybit.";
  }

  if (!environment) {
    fields.environment = "Choose sandbox/testnet or production.";
  }

  if (apiKey.length < 8) {
    fields.apiKey = "Enter the exchange API key.";
  }

  if (apiSecret.length < 8) {
    fields.apiSecret = "Enter the exchange API secret.";
  }

  if (payload.riskAcknowledged !== true) {
    fields.riskAcknowledged = "Accept the crypto Auto-Copy risk acknowledgement.";
  }

  if (payload.personalAccountAcknowledged !== true) {
    fields.personalAccountAcknowledged = "Confirm this is your personal exchange account.";
  }

  if (Object.keys(fields).length > 0) {
    throw new AdminApiError(400, "validation_error", "Fix the highlighted exchange connection fields.", fields);
  }

  return {
    exchange: exchange ?? "binance",
    environment: environment ?? "sandbox",
    apiKey,
    apiSecret,
    riskAcknowledged: true,
    personalAccountAcknowledged: true
  };
}

export function validateExchangeConnectionId(value: unknown) {
  const connectionId = sanitizeConnectionId(value);

  if (!connectionId) {
    throw new AdminApiError(400, "invalid_connection_id", "Choose a valid exchange connection.");
  }

  return connectionId;
}

export function buildExecutionIntentId({
  workspaceId,
  signalId,
  studentId,
  connectionId
}: {
  workspaceId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
}) {
  return [
    "intent",
    normalizeIdPart(workspaceId),
    normalizeIdPart(signalId),
    normalizeIdPart(studentId),
    normalizeIdPart(connectionId)
  ].join("_");
}

export function buildOrderAttemptIdempotencyKey({
  workspaceId,
  signalId,
  studentId,
  connectionId,
  intentId
}: {
  workspaceId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  intentId: string;
}) {
  return [
    "crypto-order",
    normalizeIdPart(workspaceId),
    normalizeIdPart(signalId),
    normalizeIdPart(studentId),
    normalizeIdPart(connectionId),
    normalizeIdPart(intentId)
  ].join(":");
}

export function resolveCryptoExecutionReadiness({
  entitlements,
  cryptoAutoCopy,
  preferences,
  connections,
  workspaceControl,
  platformControl
}: {
  entitlements: StudentEntitlementSummary;
  cryptoAutoCopy?: CryptoAutoCopySubscriptionPreview;
  preferences: StudentExecutionPreferencesRecord;
  connections: ExchangeConnectionSummary[];
  workspaceControl: WorkspaceExecutionControlRecord;
  platformControl: PlatformExecutionControlRecord;
}): CryptoExecutionReadiness {
  const autoCopyEntitlement = entitlements.features.autoCopy;

  if (autoCopyEntitlement.access === "alerts_only" || entitlements.riskPosture === "funded_account") {
    return {
      state: "alerts_only",
      executable: false,
      paperTradingOnly: true,
      reasons: [
        "This student remains on Signal Alerts only because funded-account students are not routed into automatic execution."
      ]
    };
  }

  if (autoCopyEntitlement.access !== "allowed") {
    return {
      state: "blocked_by_entitlement",
      executable: false,
      paperTradingOnly: true,
      reasons: [autoCopyEntitlement.reason]
    };
  }

  if (cryptoAutoCopy && !cryptoAutoCopy.billing.entitled) {
    return {
      state: "needs_crypto_autocopy_payment",
      executable: false,
      paperTradingOnly: true,
      reasons: [cryptoAutoCopy.billing.reason]
    };
  }

  if (entitlements.riskPosture !== "personal_account") {
    return {
      state: "needs_personal_account_confirmation",
      executable: false,
      paperTradingOnly: true,
      reasons: ["Personal crypto exchange account ownership must be confirmed before Auto-Copy can run."]
    };
  }

  if (platformControl.killSwitchEnabled) {
    return {
      state: "paused_by_platform",
      executable: false,
      paperTradingOnly: true,
      reasons: [platformControl.killSwitchReason || "Platform Auto-Copy execution is paused."]
    };
  }

  if (workspaceControl.killSwitchEnabled) {
    return {
      state: "paused_by_workspace",
      executable: false,
      paperTradingOnly: true,
      reasons: [workspaceControl.killSwitchReason || "Workspace Auto-Copy execution is paused."]
    };
  }

  if (preferences.studentPaused || preferences.optInState === "paused") {
    return {
      state: "paused_by_student",
      executable: false,
      paperTradingOnly: true,
      reasons: ["The student has paused crypto Auto-Copy."]
    };
  }

  const verifiedConnection = connections.find((connection) => connection.status === "verified");

  if (!verifiedConnection) {
    return {
      state: "needs_connection",
      executable: false,
      paperTradingOnly: true,
      reasons: ["No verified Binance or Bybit connection metadata exists yet."]
    };
  }

  if (
    verifiedConnection.permissionVerification !== "passed" ||
    verifiedConnection.withdrawalPermission !== "confirmed_disabled"
  ) {
    return {
      state: "needs_permission_verification",
      executable: false,
      paperTradingOnly: true,
      reasons: ["Exchange permission verification must pass with withdrawals confirmed disabled."]
    };
  }

  if (platformControl.sandboxOnly || workspaceControl.sandboxOnly) {
    const sandboxReasons = [
      platformControl.sandboxOnly
        ? "Platform crypto Auto-Copy is still sandbox-only."
        : null,
      workspaceControl.sandboxOnly
        ? "Workspace crypto Auto-Copy is still sandbox-only."
        : null
    ].filter((reason): reason is string => Boolean(reason));

    return {
      state: "paper_ready",
      executable: true,
      paperTradingOnly: true,
      reasons: [
        ...sandboxReasons,
        "Live execution cannot be marked ready until sandbox-only controls are disabled."
      ]
    };
  }

  if (preferences.optInState === "live_enabled" && !preferences.paperTradingOnly) {
    return {
      state: "live_ready",
      executable: true,
      paperTradingOnly: false,
      reasons: ["Crypto Auto-Copy is modeled as ready for live execution, but no worker exists in Stage 15A."]
    };
  }

  return {
    state: "paper_ready",
    executable: true,
    paperTradingOnly: true,
    reasons: ["Crypto Auto-Copy is ready for paper-mode routing only. Live execution is deferred."]
  };
}
