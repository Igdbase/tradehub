import "server-only";

import type { Firestore, WriteBatch } from "firebase-admin/firestore";
import { mapSubscriptionRecord, recordFromSnapshot as billingRecordFromSnapshot } from "@/lib/billing/billing-mappers";
import {
  defaultCrossAssetAutoCopyPreferences,
  evaluateStaleSignalPolicy,
  mapCrossAssetAutoCopyPreferencesRecord
} from "@/lib/crypto-execution/auto-copy-preferences";
import { loadForexMetaApiToken } from "@/lib/crypto-execution/credential-vault";
import { getForexLiveCanaryOrderPlacementAdapter } from "@/lib/crypto-execution/forex";
import { getForexAutoCopyBillingState } from "@/lib/crypto-execution/forex-provisioning-repository";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import {
  mapWorkspaceForDashboard,
  recordFromSnapshot as workspaceRecordFromSnapshot
} from "@/lib/workspace/dashboard-mappers";
import { normalizeSignalPairForMarket } from "@/lib/workspace/signal-symbols";
import type {
  CrossAssetAutoCopyPreferencesRecord,
  ExecutionRiskCheck,
  ForexBrokerConnectionRecord,
  ForexConnectionStatus,
  ForexLiveCanaryAccountAllowlistEntry,
  ForexLiveCanaryAuditEventRecord,
  ForexLiveCanaryAuditEventSummary,
  ForexLiveCanaryControlRecord,
  ForexLiveCanaryExecutionPreview,
  ForexLiveCanaryGateDecisionRecord,
  ForexLiveCanaryGateDecisionSummary,
  ForexLiveCanaryIntentRecord,
  ForexLiveCanaryIntentStatus,
  ForexLiveCanaryIntentSummary,
  ForexLiveCanaryOrderAttemptRecord,
  ForexLiveCanaryOrderAttemptSummary,
  ForexLiveCanaryRoutingOverview,
  ForexLiveCanaryRoutingSummary,
  ForexLiveCanaryWorkerRunResponse,
  RiskDecisionStatus
} from "@/types/crypto-execution";
import type { StudentEntitlementSummary } from "@/types/entitlements";
import type { WorkspaceSignalRecord } from "@/types/workspace-dashboard";

export const FOREX_LIVE_CANARY_CANDIDATE_LIMIT = 10;
const FOREX_LIVE_CANARY_VISIBLE_LIMIT = 4;
const FOREX_LIVE_CANARY_READ_LIMIT = FOREX_LIVE_CANARY_VISIBLE_LIMIT + 1;
const FOREX_LIVE_CANARY_OVERVIEW_LIMIT = 25;
const FOREX_LIVE_CANARY_WORKER_LIMIT = 1;

type ForexLiveCanaryGateEvaluation = {
  status: RiskDecisionStatus;
  checks: ExecutionRiskCheck[];
  blockedReason?: string;
  pair: string;
  volume: number;
  requestedNotionalUsd: number;
  dailyNotionalUsd: number;
  connection?: ForexBrokerConnectionRecord;
};

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry)) as T;
  }

  if (typeof value === "object" && value !== null) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        cleaned[key] = stripUndefined(entry);
      }
    }

    return cleaned as T;
  }

  return value;
}

function createSourceMeta(warnings: string[] = []) {
  return {
    source: "firestore" as const,
    sourceLabel: "Firestore live",
    sourceMessage: "Tiny live Forex canary data was loaded through server-side Firebase Admin SDK routes.",
    warnings
  };
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeWorkspaceId(value: unknown) {
  return safeString(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function normalizeForexLivePair(value: string) {
  return normalizeSignalPairForMarket(value, "forex") ?? "";
}

function firstNumericLevel(value: string) {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  const parsed = match ? Number(match[0]) : null;

  return parsed && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function directionalLevelsAreValid(signal: WorkspaceSignalRecord) {
  const entry = firstNumericLevel(signal.entry);
  const takeProfit = firstNumericLevel(signal.takeProfit);
  const stopLoss = firstNumericLevel(signal.stopLoss);

  if (!entry || !takeProfit || !stopLoss) {
    return false;
  }

  return signal.direction === "buy"
    ? takeProfit > entry && stopLoss < entry
    : takeProfit < entry && stopLoss > entry;
}

function deterministicId(parts: string[], maxLength = 150) {
  return parts
    .join("_")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, maxLength);
}

function latestIso(values: string[]) {
  return values
    .filter((value) => value && Number.isFinite(Date.parse(value)))
    .sort((left, right) => right.localeCompare(left))[0];
}

function buildCheck(key: ExecutionRiskCheck["key"], status: RiskDecisionStatus, message: string): ExecutionRiskCheck {
  return { key, status, message };
}

function forexLiveCanaryEnv() {
  return {
    liveCanarySetupEnabled: process.env.FOREX_LIVE_CANARY_SETUP_ENABLED === "true",
    liveCanaryEnabled: process.env.FOREX_LIVE_CANARY_ENABLED === "true",
    liveOrderCallsEnabled: process.env.FOREX_LIVE_ORDER_CALLS_ENABLED === "true",
    liveDryRun: process.env.FOREX_LIVE_DRY_RUN !== "false",
    maxNotionalUsd: Math.max(1, Math.min(safeNumber(process.env.FOREX_LIVE_MAX_NOTIONAL_USD, 5), 5)),
    maxDailyNotionalUsd: Math.max(1, Math.min(safeNumber(process.env.FOREX_LIVE_MAX_DAILY_NOTIONAL_USD, 5), 25)),
    maxVolume: Math.max(0.001, Math.min(safeNumber(process.env.FOREX_LIVE_MAX_VOLUME, 0.01), 0.01))
  };
}

function sanitizeList(value: unknown, mode: "id" | "pair") {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = raw
    .map((entry) => safeString(entry).replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 120))
    .map((entry) => mode === "pair" ? normalizeForexLivePair(entry) : entry)
    .filter(Boolean);

  return [...new Set(normalized)].slice(0, 50);
}

function sanitizeAccountAllowlist(value: unknown): ForexLiveCanaryAccountAllowlistEntry[] {
  const raw = Array.isArray(value) ? value : [];
  const entries = raw
    .map((entry) => {
      if (typeof entry === "string") {
        return {
          accountFingerprint: entry.replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 120),
          noWithdrawalCapabilityConfirmed: false
        };
      }

      if (typeof entry === "object" && entry !== null) {
        const record = entry as Record<string, unknown>;

        return {
          accountFingerprint: safeString(record.accountFingerprint ?? record.providerAccountFingerprint)
            .replace(/[^a-zA-Z0-9._:-]/g, "")
            .slice(0, 120),
          noWithdrawalCapabilityConfirmed: record.noWithdrawalCapabilityConfirmed === true
        };
      }

      return null;
    })
    .filter((entry): entry is ForexLiveCanaryAccountAllowlistEntry => Boolean(entry?.accountFingerprint));

  return entries.slice(0, 50);
}

function defaultControl(scope: "platform" | "workspace", workspaceId?: string): ForexLiveCanaryControlRecord {
  const env = forexLiveCanaryEnv();

  return {
    scope,
    workspaceId,
    productionConnectionSetupEnabled: false,
    canaryEnabled: false,
    orderCallsEnabled: false,
    dryRun: true,
    killSwitchEnabled: false,
    allowedWorkspaceIds: [],
    allowedStudentIds: [],
    allowedPairs: [],
    accountAllowlist: [],
    maxNotionalUsd: env.maxNotionalUsd,
    maxDailyNotionalUsd: env.maxDailyNotionalUsd,
    maxVolume: env.maxVolume,
    maxOpenOrdersPerStudent: 1,
    updatedAt: new Date().toISOString()
  };
}

function mapControl(
  record: Record<string, unknown> | null,
  scope: "platform" | "workspace",
  workspaceId?: string
): ForexLiveCanaryControlRecord {
  const fallback = defaultControl(scope, workspaceId);

  return {
    ...fallback,
    productionConnectionSetupEnabled: typeof record?.productionConnectionSetupEnabled === "boolean" ? record.productionConnectionSetupEnabled : fallback.productionConnectionSetupEnabled,
    canaryEnabled: typeof record?.canaryEnabled === "boolean" ? record.canaryEnabled : fallback.canaryEnabled,
    orderCallsEnabled: typeof record?.orderCallsEnabled === "boolean" ? record.orderCallsEnabled : fallback.orderCallsEnabled,
    dryRun: typeof record?.dryRun === "boolean" ? record.dryRun : fallback.dryRun,
    killSwitchEnabled: typeof record?.killSwitchEnabled === "boolean" ? record.killSwitchEnabled : fallback.killSwitchEnabled,
    killSwitchReason: safeString(record?.killSwitchReason) || undefined,
    allowedWorkspaceIds: sanitizeList(record?.allowedWorkspaceIds, "id"),
    allowedStudentIds: sanitizeList(record?.allowedStudentIds, "id"),
    allowedPairs: sanitizeList(record?.allowedPairs, "pair"),
    accountAllowlist: sanitizeAccountAllowlist(record?.accountAllowlist),
    maxNotionalUsd: Math.max(1, Math.min(safeNumber(record?.maxNotionalUsd, fallback.maxNotionalUsd), fallback.maxNotionalUsd)),
    maxDailyNotionalUsd: Math.max(1, Math.min(safeNumber(record?.maxDailyNotionalUsd, fallback.maxDailyNotionalUsd), fallback.maxDailyNotionalUsd)),
    maxVolume: Math.max(0.001, Math.min(safeNumber(record?.maxVolume, fallback.maxVolume), fallback.maxVolume)),
    maxOpenOrdersPerStudent: 1,
    updatedAt: safeString(record?.updatedAt) || fallback.updatedAt,
    updatedBy: safeString(record?.updatedBy) || undefined
  };
}

async function loadForexLiveCanaryControls(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const [platformSnapshot, workspaceSnapshot] = await Promise.all([
    db.doc("platform_forex_live_canary_controls/current").get(),
    db.doc(`workspaces/${workspaceId}/forex_live_canary_controls/current`).get()
  ]);

  return {
    platformControl: mapControl(
      platformSnapshot.exists ? { controlId: platformSnapshot.id, ...platformSnapshot.data() } : null,
      "platform"
    ),
    workspaceControl: mapControl(
      workspaceSnapshot.exists ? { controlId: workspaceSnapshot.id, ...workspaceSnapshot.data() } : null,
      "workspace",
      workspaceId
    )
  };
}

export async function loadForexLiveCanarySetupGate(workspaceId: string) {
  const env = forexLiveCanaryEnv();
  const controls = await loadForexLiveCanaryControls(workspaceId);
  const setupEnabled =
    env.liveCanarySetupEnabled &&
    env.liveCanaryEnabled &&
    controls.platformControl.productionConnectionSetupEnabled &&
    controls.workspaceControl.productionConnectionSetupEnabled &&
    !controls.platformControl.killSwitchEnabled &&
    !controls.workspaceControl.killSwitchEnabled;

  let reason = "Production MetaAPI setup for tiny live Forex canary is explicitly enabled.";

  if (!env.liveCanarySetupEnabled) {
    reason = "Production MetaAPI setup is disabled by server environment.";
  } else if (!env.liveCanaryEnabled) {
    reason = "Tiny live Forex canary is disabled by server environment.";
  } else if (!controls.platformControl.productionConnectionSetupEnabled) {
    reason = "Platform control has not enabled production MetaAPI setup.";
  } else if (!controls.workspaceControl.productionConnectionSetupEnabled) {
    reason = "Workspace control has not enabled production MetaAPI setup.";
  } else if (controls.platformControl.killSwitchEnabled) {
    reason = controls.platformControl.killSwitchReason || "Platform tiny live Forex canary setup is paused.";
  } else if (controls.workspaceControl.killSwitchEnabled) {
    reason = controls.workspaceControl.killSwitchReason || "Workspace tiny live Forex canary setup is paused.";
  }

  return {
    setupEnabled,
    reason
  };
}

function mapForexConnection(record: Record<string, unknown>, ids: { workspaceId: string; studentId: string; connectionId: string }): ForexBrokerConnectionRecord {
  const status: ForexConnectionStatus =
    record.status === "verified" ||
    record.status === "pending" ||
    record.status === "rejected" ||
    record.status === "disabled" ||
    record.status === "error"
      ? record.status
      : "pending";

  return {
    connectionId: ids.connectionId,
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    studentId: safeString(record.studentId) || ids.studentId,
    provider: "metaapi",
    environment: record.environment === "production" ? "production" : record.environment === "demo" ? "demo" : "unknown",
    status,
    readinessStatus:
      record.readinessStatus === "paper_only_ready" ||
      record.readinessStatus === "metadata_ready" ||
      record.readinessStatus === "token_storage_blocked" ||
      record.readinessStatus === "verification_failed" ||
      record.readinessStatus === "disabled"
        ? record.readinessStatus
        : "not_connected",
    connectionLabel: safeString(record.connectionLabel) || "MetaAPI broker connection",
    providerAccountFingerprint: safeString(record.providerAccountFingerprint) || undefined,
    brokerName: safeString(record.brokerName) || undefined,
    platform: record.platform === "mt4" || record.platform === "mt5" ? record.platform : "unknown",
    serverName: safeString(record.serverName) || undefined,
    baseCurrency: safeString(record.baseCurrency) || undefined,
    providerState: safeString(record.providerState) || undefined,
    providerConnectionStatus: safeString(record.providerConnectionStatus) || undefined,
    tokenVaultStatus:
      record.tokenVaultStatus === "encrypted_reference_ready" ||
      record.tokenVaultStatus === "metadata_only" ||
      record.tokenVaultStatus === "pending_encrypted_storage" ||
      record.tokenVaultStatus === "rotation_required" ||
      record.tokenVaultStatus === "revoked"
        ? record.tokenVaultStatus
        : "not_collected",
    tokenLastStoredAt: safeString(record.tokenLastStoredAt) || undefined,
    lastCheckedAt: safeString(record.lastCheckedAt) || undefined,
    disabledAt: safeString(record.disabledAt) || undefined,
    disabledReason: safeString(record.disabledReason) || undefined,
    noTradeExecution: true,
    supportSafeMessage: safeString(record.supportSafeMessage) || "Forex connection metadata is support-safe.",
    createdAt: safeString(record.createdAt) || new Date().toISOString(),
    updatedAt: safeString(record.updatedAt) || new Date().toISOString()
  };
}

function isVerifiedExecutableLiveConnection(connection?: ForexBrokerConnectionRecord | null) {
  return connection?.provider === "metaapi" &&
    connection.environment === "production" &&
    connection.status === "verified" &&
    connection.readinessStatus === "paper_only_ready" &&
    connection.tokenVaultStatus === "encrypted_reference_ready";
}

async function loadVerifiedLiveConnection(workspaceId: string, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students/${studentId}/forex_connections`)
    .where("provider", "==", "metaapi")
    .where("environment", "==", "production")
    .where("status", "==", "verified")
    .limit(5)
    .get();
  const connections = snapshot.docs
    .map((doc) => mapForexConnection({ connectionId: doc.id, ...doc.data() }, { workspaceId, studentId, connectionId: doc.id }))
    .filter(isVerifiedExecutableLiveConnection);

  return connections[0] ?? null;
}

async function loadVerifiedLiveConnectionById(workspaceId: string, studentId: string, connectionId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc(`workspaces/${workspaceId}/students/${studentId}/forex_connections/${connectionId}`).get();

  if (!snapshot.exists) {
    return null;
  }

  const connection = mapForexConnection({ connectionId: snapshot.id, ...snapshot.data() }, { workspaceId, studentId, connectionId: snapshot.id });

  return isVerifiedExecutableLiveConnection(connection) ? connection : null;
}

function findAccountApproval(control: ForexLiveCanaryControlRecord, accountFingerprint?: string) {
  if (!accountFingerprint) {
    return undefined;
  }

  return control.accountAllowlist.find((entry) => entry.accountFingerprint === accountFingerprint);
}

function accountAllowedByBothControls(
  platformControl: ForexLiveCanaryControlRecord,
  workspaceControl: ForexLiveCanaryControlRecord,
  accountFingerprint?: string
) {
  const platformApproval = findAccountApproval(platformControl, accountFingerprint);
  const workspaceApproval = findAccountApproval(workspaceControl, accountFingerprint);

  return Boolean(
    platformApproval?.noWithdrawalCapabilityConfirmed &&
      workspaceApproval?.noWithdrawalCapabilityConfirmed
  );
}

async function openOrderCount(workspaceId: string, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/forex_live_canary_order_attempts`)
    .where("studentId", "==", studentId)
    .limit(10)
    .get();

  return snapshot.docs
    .map((doc) => doc.data())
    .filter((record) =>
      record.status === "submitted_live_forex_canary" ||
      record.status === "partially_filled_live_forex_canary"
    ).length;
}

async function todayNotionalUsd(workspaceId: string, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const today = new Date().toISOString().slice(0, 10);
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/forex_live_canary_order_attempts`)
    .where("studentId", "==", studentId)
    .limit(25)
    .get();

  return snapshot.docs
    .map((doc) => doc.data())
    .filter((record) => safeString(record.submittedAt).startsWith(today))
    .reduce((sum, record) => sum + safeNumber(record.requestedNotionalUsd), 0);
}

function queueAuditEvent(
  db: Firestore,
  batch: WriteBatch,
  input: Omit<ForexLiveCanaryAuditEventRecord, "eventId" | "createdAt"> & { createdAt?: string }
) {
  const eventRef = db.collection(`workspaces/${input.workspaceId}/forex_live_canary_audit_events`).doc();
  batch.set(eventRef, stripUndefined({
    eventId: eventRef.id,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...input
  }));
}

function buildIntentId(input: { workspaceId: string; signalId: string; studentId: string; connectionId: string; pair: string }) {
  return deterministicId(["forex_live_canary", input.workspaceId, input.signalId, input.studentId, input.connectionId, input.pair], 150);
}

function buildGateDecisionRecord({
  signal,
  studentId,
  intentId,
  evaluation,
  now
}: {
  signal: WorkspaceSignalRecord;
  studentId: string;
  intentId: string;
  evaluation: ForexLiveCanaryGateEvaluation;
  now: string;
}): ForexLiveCanaryGateDecisionRecord {
  return stripUndefined({
    decisionId: deterministicId(["forex_live_canary_gate", intentId], 150),
    workspaceId: signal.workspaceId,
    intentId,
    signalId: signal.signalId,
    studentId,
    connectionId: evaluation.connection?.connectionId,
    pair: evaluation.pair || signal.pair,
    status: evaluation.status,
    checks: evaluation.checks,
    blockedReason: evaluation.blockedReason,
    decidedAt: now,
    decidedBy: "forex-live-canary-gate:v1"
  }) satisfies ForexLiveCanaryGateDecisionRecord;
}

function buildIntentRecord({
  signal,
  studentId,
  intentId,
  decisionId,
  evaluation,
  platformControl,
  workspaceControl,
  now
}: {
  signal: WorkspaceSignalRecord;
  studentId: string;
  intentId: string;
  decisionId: string;
  evaluation: ForexLiveCanaryGateEvaluation;
  platformControl: ForexLiveCanaryControlRecord;
  workspaceControl: ForexLiveCanaryControlRecord;
  now: string;
}): ForexLiveCanaryIntentRecord {
  const env = forexLiveCanaryEnv();
  const connection = evaluation.connection;

  if (!connection) {
    throw new AdminApiError(500, "forex_live_canary_connection_missing", "Forex live canary intent requires a verified production connection.");
  }

  const entryPrice = firstNumericLevel(signal.entry);
  const stopLoss = firstNumericLevel(signal.stopLoss);
  const takeProfit = firstNumericLevel(signal.takeProfit);

  return stripUndefined({
    intentId,
    workspaceId: signal.workspaceId,
    signalId: signal.signalId,
    studentId,
    connectionId: connection.connectionId,
    provider: "metaapi",
    environment: "production",
    executionMode: "forex_live_canary",
    market: "forex",
    pair: evaluation.pair,
    side: signal.direction,
    orderType: "market",
    status: evaluation.status === "allowed" ? "ready_live_forex_canary" : "blocked_live_forex_canary",
    volume: evaluation.volume,
    entryPrice: entryPrice ?? undefined,
    stopLoss: stopLoss ?? undefined,
    takeProfit: takeProfit ?? undefined,
    requestedNotionalUsd: evaluation.requestedNotionalUsd,
    dailyNotionalUsd: evaluation.dailyNotionalUsd,
    idempotencyKey: `forex-live-canary:${signal.workspaceId}:${signal.signalId}:${studentId}:${connection.connectionId}:${evaluation.pair}`.toLowerCase(),
    sourceSignalVersion: signal.updatedAt,
    gateDecisionId: decisionId,
    providerClientOrderId: deterministicId(["thflc", signal.workspaceId, signal.signalId, studentId, connection.connectionId], 24),
    liveCanary: true,
    dryRun: env.liveDryRun || !env.liveOrderCallsEnabled || !platformControl.orderCallsEnabled || !workspaceControl.orderCallsEnabled,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.parse(now) + 1000 * 60 * 60 * 6).toISOString()
  }) satisfies ForexLiveCanaryIntentRecord;
}

async function evaluateCandidate({
  signal,
  studentId,
  entitlements,
  preferences,
  connection,
  platformControl,
  workspaceControl
}: {
  signal: WorkspaceSignalRecord;
  studentId: string;
  entitlements: StudentEntitlementSummary;
  preferences?: CrossAssetAutoCopyPreferencesRecord;
  connection?: ForexBrokerConnectionRecord | null;
  platformControl: ForexLiveCanaryControlRecord;
  workspaceControl: ForexLiveCanaryControlRecord;
}): Promise<ForexLiveCanaryGateEvaluation> {
  const env = forexLiveCanaryEnv();
  const checks: ExecutionRiskCheck[] = [];
  const pair = normalizeForexLivePair(signal.pair);
  const autoCopyPreferences = preferences ?? defaultCrossAssetAutoCopyPreferences({
    workspaceId: signal.workspaceId,
    studentId,
    market: "forex"
  });
  const staleDecision = evaluateStaleSignalPolicy({ signal, preferences: autoCopyPreferences });
  const existingOpenOrders = await openOrderCount(signal.workspaceId, studentId);
  const usedToday = await todayNotionalUsd(signal.workspaceId, studentId);
  const requestedNotionalUsd = Math.max(
    1,
    Math.min(autoCopyPreferences.maxFixedNotional || 5, env.maxNotionalUsd, platformControl.maxNotionalUsd, workspaceControl.maxNotionalUsd)
  );
  const volume = Math.max(0.001, Math.min(env.maxVolume, platformControl.maxVolume, workspaceControl.maxVolume, requestedNotionalUsd / 100_000));
  const accountFingerprint = connection?.providerAccountFingerprint;
  const accountAllowed = accountAllowedByBothControls(platformControl, workspaceControl, accountFingerprint);
  const pairAllowed =
    pair &&
    platformControl.allowedPairs.includes(pair) &&
    workspaceControl.allowedPairs.includes(pair) &&
    (autoCopyPreferences.allowedPairs.length === 0 || autoCopyPreferences.allowedPairs.includes(pair));
  const workspaceAllowed = platformControl.allowedWorkspaceIds.includes(signal.workspaceId);
  const studentAllowed =
    platformControl.allowedStudentIds.includes(studentId) &&
    workspaceControl.allowedStudentIds.includes(studentId);

  checks.push(buildCheck("signal_status", signal.status === "published" ? "allowed" : "blocked", signal.status === "published" ? "Signal is published." : "Only published forex signals can create live canary records."));
  checks.push(buildCheck("signal_market", signal.market === "forex" ? "allowed" : "blocked", signal.market === "forex" ? "Signal market is forex." : "Only forex signals can create live canary records."));
  checks.push(buildCheck("signal_symbol", pair ? "allowed" : "blocked", pair ? `Signal pair normalized to live forex pair ${pair}.` : "forex_pair_invalid_for_live_canary"));
  checks.push(buildCheck("signal_directional_levels", directionalLevelsAreValid(signal) ? "allowed" : "blocked", "Live canary requires entry, stop-loss, and take-profit to match direction before quote validation."));
  checks.push(buildCheck("entitlement_auto_copy", entitlements.features.autoCopy.access === "allowed" ? "allowed" : "blocked", entitlements.features.autoCopy.access === "allowed" ? "Stage 16 Auto-Copy entitlement allows this student." : entitlements.features.autoCopy.reason));
  checks.push(buildCheck("risk_posture", entitlements.riskPosture === "personal_account" ? "allowed" : "blocked", entitlements.riskPosture === "personal_account" ? "Student risk posture is personal account." : "Live canary rejects funded, prop-firm, or unknown risk posture."));
  checks.push(buildCheck("execution_mode", autoCopyPreferences.executionMode === "full_auto" ? "allowed" : "blocked", autoCopyPreferences.executionMode === "full_auto" ? "Student selected full-auto forex Auto-Copy." : "Live canary requires full-auto mode."));
  checks.push(buildCheck("student_opt_in", autoCopyPreferences.consentStatus === "accepted" ? "allowed" : "blocked", autoCopyPreferences.consentStatus === "accepted" ? "Student accepted Forex Auto-Copy consent." : "Live canary requires accepted Forex Auto-Copy consent."));
  checks.push(buildCheck("student_pause", autoCopyPreferences.studentPaused || autoCopyPreferences.killSwitchEnabled || autoCopyPreferences.consentStatus === "paused" || autoCopyPreferences.consentStatus === "revoked" ? "blocked" : "allowed", "Student pause, revoke, or student kill switch must be off."));
  checks.push(buildCheck("stale_signal", staleDecision.outcome === "route_normally" ? "allowed" : "blocked", staleDecision.safeMessage));
  checks.push(buildCheck("sandbox_only", env.liveCanaryEnabled && platformControl.canaryEnabled && workspaceControl.canaryEnabled ? "allowed" : "blocked", "Live Forex canary requires explicit env, platform, and workspace canary controls."));
  checks.push(buildCheck("platform_kill_switch", !platformControl.killSwitchEnabled ? "allowed" : "blocked", platformControl.killSwitchEnabled ? "Platform live Forex canary kill switch is active." : "Platform live Forex canary kill switch is off."));
  checks.push(buildCheck("workspace_kill_switch", !workspaceControl.killSwitchEnabled ? "allowed" : "blocked", workspaceControl.killSwitchEnabled ? "Workspace live Forex canary kill switch is active." : "Workspace live Forex canary kill switch is off."));
  checks.push(buildCheck("symbol_allowlist", pairAllowed ? "allowed" : "blocked", pairAllowed ? "Platform, workspace, and student symbol allowlists permit this canary." : "Live Forex canary pair is not allowlisted."));
  checks.push(buildCheck("student_allowlist", studentAllowed ? "allowed" : "blocked", studentAllowed ? "Student is explicitly allowlisted for tiny live Forex canary." : "Student is not allowlisted for live Forex canary."));
  checks.push(buildCheck("workspace_allowlist", workspaceAllowed ? "allowed" : "blocked", workspaceAllowed ? "Workspace is explicitly allowlisted for tiny live Forex canary." : "Workspace is not allowlisted for live Forex canary."));
  checks.push(buildCheck("exchange_connection", isVerifiedExecutableLiveConnection(connection) ? "allowed" : "blocked", isVerifiedExecutableLiveConnection(connection) ? "Verified production MetaAPI connection with encrypted token metadata exists." : "Verified production MetaAPI connection is required; demo connections are rejected."));
  checks.push(buildCheck("withdrawal_permission", accountAllowed ? "allowed" : "blocked", accountAllowed ? "Account allowlist confirms no withdrawal/custody capability for this canary." : "withdrawal_capability_unavailable_unverified"));
  checks.push(buildCheck("max_open_trades", existingOpenOrders < 1 ? "allowed" : "blocked", "Tiny live Forex canary allows max 1 open order per student."));
  checks.push(buildCheck("max_risk_per_trade", requestedNotionalUsd <= env.maxNotionalUsd && volume <= env.maxVolume ? "allowed" : "blocked", "Tiny live Forex canary notional and volume are clamped by env/platform/workspace caps."));
  checks.push(buildCheck("max_daily_loss", usedToday + requestedNotionalUsd <= env.maxDailyNotionalUsd && usedToday + requestedNotionalUsd <= platformControl.maxDailyNotionalUsd && usedToday + requestedNotionalUsd <= workspaceControl.maxDailyNotionalUsd ? "allowed" : "blocked", "Tiny live Forex canary daily notional cap must remain below env/platform/workspace caps."));

  const failed = checks.filter((check) => check.status === "blocked");

  return {
    status: failed.length > 0 ? "blocked" : "allowed",
    checks,
    blockedReason: failed[0]?.message,
    pair,
    volume,
    requestedNotionalUsd,
    dailyNotionalUsd: usedToday + requestedNotionalUsd,
    connection: connection ?? undefined
  };
}

export async function routePublishedForexSignalForLiveCanaryExecution({
  actor,
  signal,
  trigger
}: {
  actor: VerifiedInfluencer;
  signal: WorkspaceSignalRecord;
  trigger: "created_published" | "patched_published";
}): Promise<ForexLiveCanaryRoutingSummary> {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const env = forexLiveCanaryEnv();
  const warnings: string[] = [];
  let readyCount = 0;
  let blockedCount = 0;
  let intentCount = 0;

  if (signal.status !== "published" || signal.market !== "forex") {
    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      trigger,
      routed: false,
      candidateLimit: FOREX_LIVE_CANARY_CANDIDATE_LIMIT,
      candidateCount: 0,
      readyCount,
      blockedCount,
      intentCount,
      dryRunOnly: true,
      bounded: false,
      warnings: ["Forex live canary routing only runs for newly published forex signals."],
      completedAt: now
    };
  }

  const [workspaceSnapshot, studentSnapshot, controls] = await Promise.all([
    db.doc(`workspaces/${actor.workspaceId}`).get(),
    db.collection(`workspaces/${actor.workspaceId}/students`).limit(FOREX_LIVE_CANARY_CANDIDATE_LIMIT).get(),
    loadForexLiveCanaryControls(actor.workspaceId)
  ]);

  if (!workspaceSnapshot.exists) {
    warnings.push("Workspace shell is missing, so live Forex canary routing could not evaluate students.");

    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      trigger,
      routed: false,
      candidateLimit: FOREX_LIVE_CANARY_CANDIDATE_LIMIT,
      candidateCount: 0,
      readyCount,
      blockedCount,
      intentCount,
      dryRunOnly: true,
      bounded: false,
      warnings,
      completedAt: now
    };
  }

  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, actor.workspaceId);
  const studentRecords = studentSnapshot.docs.map((doc) => workspaceRecordFromSnapshot(doc, "studentId"));
  const bounded = studentSnapshot.docs.length === FOREX_LIVE_CANARY_CANDIDATE_LIMIT;
  const batch = db.batch();

  queueAuditEvent(db, batch, {
    action: "forex_live_canary.routing.started",
    actorType: "influencer",
    actorId: actor.uid,
    workspaceId: actor.workspaceId,
    targetType: "signal",
    targetId: signal.signalId,
    safeMessage: "Tiny live Forex canary routing started for a newly published signal. No broker order is placed by publish routing.",
    severity: "info",
    after: { signalId: signal.signalId, trigger, candidateLimit: FOREX_LIVE_CANARY_CANDIDATE_LIMIT },
    createdAt: now
  });

  const subscriptionSnapshots = studentRecords.length > 0
    ? await db.getAll(
        ...studentRecords.map((record) => db.doc(`workspaces/${actor.workspaceId}/students/${record.studentId}/subscriptions/current`))
      )
    : [];
  const preferenceSnapshots = studentRecords.length > 0
    ? await db.getAll(
        ...studentRecords.map((record) => db.doc(`workspaces/${actor.workspaceId}/students/${record.studentId}/auto_copy_preferences/forex`))
      )
    : [];

  for (const [index, studentRecord] of studentRecords.entries()) {
    const studentId = String(studentRecord.studentId ?? "");
    const subscription = mapSubscriptionRecord(
      subscriptionSnapshots[index]?.exists
        ? billingRecordFromSnapshot(subscriptionSnapshots[index], "subscriptionId")
        : null,
      actor.workspaceId,
      studentId
    );
    const billing = await getForexAutoCopyBillingState(actor.workspaceId, studentId);
    const entitlements = resolveStudentEntitlements({ workspace, studentRecord, subscription });
    const preferences = mapCrossAssetAutoCopyPreferencesRecord({
      record: preferenceSnapshots[index]?.exists
        ? workspaceRecordFromSnapshot(preferenceSnapshots[index], "preferenceId")
        : null,
      workspaceId: actor.workspaceId,
      studentId,
      market: "forex"
    });
    const connection = await loadVerifiedLiveConnection(actor.workspaceId, studentId);
    const pair = normalizeForexLivePair(signal.pair) || "unknown_pair";
    const intentId = buildIntentId({
      workspaceId: actor.workspaceId,
      signalId: signal.signalId,
      studentId,
      connectionId: connection?.connectionId ?? "no_live_connection",
      pair
    });
    const evaluation = await evaluateCandidate({
      signal,
      studentId,
      entitlements,
      preferences,
      connection,
      platformControl: controls.platformControl,
      workspaceControl: controls.workspaceControl
    });

    if (!billing.entitled) {
      evaluation.status = "blocked";
      evaluation.blockedReason = billing.reason;
      evaluation.checks.push(buildCheck("entitlement_auto_copy", "blocked", "paid_forex_autocopy_required"));
    }

    const decision = buildGateDecisionRecord({ signal, studentId, intentId, evaluation, now });
    batch.set(db.doc(`workspaces/${actor.workspaceId}/forex_live_canary_gate_decisions/${decision.decisionId}`), decision, { merge: true });

    if (evaluation.connection) {
      const intent = buildIntentRecord({
        signal,
        studentId,
        intentId,
        decisionId: decision.decisionId,
        evaluation,
        platformControl: controls.platformControl,
        workspaceControl: controls.workspaceControl,
        now
      });
      batch.set(db.doc(`workspaces/${actor.workspaceId}/forex_live_canary_intents/${intent.intentId}`), intent, { merge: true });
      intentCount += 1;
      if (intent.status === "ready_live_forex_canary") {
        readyCount += 1;
      } else {
        blockedCount += 1;
      }
    } else {
      blockedCount += 1;
    }
  }

  queueAuditEvent(db, batch, {
    action: "forex_live_canary.routing.completed",
    actorType: "influencer",
    actorId: actor.uid,
    workspaceId: actor.workspaceId,
    targetType: "signal",
    targetId: signal.signalId,
    safeMessage: "Tiny live Forex canary routing completed with server-side gate records only.",
    severity: "info",
    after: { signalId: signal.signalId, readyCount, blockedCount, intentCount, dryRunOnly: env.liveDryRun },
    createdAt: now
  });

  await batch.commit();

  return {
    workspaceId: signal.workspaceId,
    signalId: signal.signalId,
    trigger,
    routed: true,
    candidateLimit: FOREX_LIVE_CANARY_CANDIDATE_LIMIT,
    candidateCount: studentRecords.length,
    readyCount,
    blockedCount,
    intentCount,
    dryRunOnly: env.liveDryRun,
    bounded,
    warnings,
    completedAt: now
  };
}

function normalizeStatus(value: unknown): ForexLiveCanaryIntentStatus {
  switch (value) {
    case "blocked_live_forex_canary":
    case "ready_live_forex_canary":
    case "dry_run_live_forex_canary":
    case "submitted_live_forex_canary":
    case "filled_live_forex_canary":
    case "partially_filled_live_forex_canary":
    case "failed_live_forex_canary":
    case "skipped_live_forex_canary":
      return value;
    default:
      return "failed_live_forex_canary";
  }
}

function mapIntentSummary(record: Record<string, unknown>): ForexLiveCanaryIntentSummary {
  return {
    intentId: safeString(record.intentId),
    signalId: safeString(record.signalId),
    studentId: safeString(record.studentId),
    connectionId: safeString(record.connectionId),
    provider: "metaapi",
    environment: "production",
    pair: safeString(record.pair),
    side: record.side === "sell" ? "sell" : "buy",
    orderType: "market",
    status: normalizeStatus(record.status),
    volume: safeNumber(record.volume),
    requestedNotionalUsd: safeNumber(record.requestedNotionalUsd),
    dryRun: record.dryRun !== false,
    createdAt: safeString(record.createdAt) || new Date().toISOString(),
    updatedAt: safeString(record.updatedAt) || new Date().toISOString()
  };
}

function mapAttemptSummary(record: Record<string, unknown>): ForexLiveCanaryOrderAttemptSummary {
  return {
    attemptId: safeString(record.attemptId),
    intentId: safeString(record.intentId),
    signalId: safeString(record.signalId),
    studentId: safeString(record.studentId),
    provider: "metaapi",
    environment: "production",
    pair: safeString(record.pair),
    side: record.side === "sell" ? "sell" : "buy",
    orderType: "market",
    status: normalizeStatus(record.status),
    volume: safeNumber(record.volume),
    requestedNotionalUsd: safeNumber(record.requestedNotionalUsd),
    providerOrderRef: safeString(record.providerOrderRef) || undefined,
    providerHttpStatus: safeNumber(record.providerHttpStatus) || undefined,
    canonicalSymbol: safeString(record.canonicalSymbol) || undefined,
    providerSymbol: safeString(record.providerSymbol) || undefined,
    dryRun: record.dryRun !== false,
    sanitizedFailureCode: safeString(record.sanitizedFailureCode) || undefined,
    sanitizedFailureReason: safeString(record.sanitizedFailureReason) || undefined,
    sanitizedProviderErrorCode: safeString(record.sanitizedProviderErrorCode) || undefined,
    sanitizedProviderErrorMessage: safeString(record.sanitizedProviderErrorMessage) || undefined,
    submittedAt: safeString(record.submittedAt) || undefined,
    completedAt: safeString(record.completedAt) || undefined,
    updatedAt: safeString(record.updatedAt) || new Date().toISOString()
  };
}

function mapGateDecisionSummary(record: Record<string, unknown>): ForexLiveCanaryGateDecisionSummary {
  const checks = Array.isArray(record.checks) ? record.checks as ExecutionRiskCheck[] : [];
  const status: RiskDecisionStatus =
    record.status === "allowed" || record.status === "blocked" || record.status === "requires_review"
      ? record.status
      : "requires_review";

  return {
    decisionId: safeString(record.decisionId),
    intentId: safeString(record.intentId),
    signalId: safeString(record.signalId),
    studentId: safeString(record.studentId),
    connectionId: safeString(record.connectionId) || undefined,
    pair: safeString(record.pair),
    status,
    blockedReason: safeString(record.blockedReason) || undefined,
    checkCount: checks.length,
    failedCheckKeys: checks.filter((check) => check.status !== "allowed").map((check) => check.key),
    decidedAt: safeString(record.decidedAt) || new Date().toISOString()
  };
}

function mapAuditSummary(record: Record<string, unknown>): ForexLiveCanaryAuditEventSummary {
  return {
    eventId: safeString(record.eventId),
    action: safeString(record.action) || "forex_live_canary.audit",
    actorType:
      record.actorType === "student" || record.actorType === "super_admin" || record.actorType === "system"
        ? record.actorType
        : "influencer",
    studentId: safeString(record.studentId) || undefined,
    targetType:
      record.targetType === "intent" ||
      record.targetType === "gate_decision" ||
      record.targetType === "live_canary_attempt" ||
      record.targetType === "control"
        ? record.targetType
        : "signal",
    targetId: safeString(record.targetId),
    safeMessage: safeString(record.safeMessage) || "Tiny live Forex canary audit event recorded.",
    severity: record.severity === "critical" || record.severity === "warning" ? record.severity : "info",
    createdAt: safeString(record.createdAt) || new Date().toISOString()
  };
}

async function summarizeRouting(workspaceId: string, studentId?: string): Promise<ForexLiveCanaryRoutingOverview> {
  const { db } = getFirebaseAdminClients();
  const intentQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_live_canary_intents`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_live_canary_intents`);
  const decisionQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_live_canary_gate_decisions`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_live_canary_gate_decisions`);
  const [intentSnapshot, decisionSnapshot, boundedAuditSnapshot] = await Promise.all([
    intentQuery.limit(FOREX_LIVE_CANARY_OVERVIEW_LIMIT).get(),
    decisionQuery.limit(FOREX_LIVE_CANARY_OVERVIEW_LIMIT).get(),
    db.collection(`workspaces/${workspaceId}/forex_live_canary_audit_events`).where("action", "==", "forex_live_canary.routing.bounded").limit(FOREX_LIVE_CANARY_OVERVIEW_LIMIT).get()
  ]);
  const intentRecords = intentSnapshot.docs.map((doc) => doc.data());
  const decisionRecords = decisionSnapshot.docs.map((doc) => doc.data());
  const updatedAt = latestIso([
    ...intentRecords.map((record) => safeString(record.updatedAt)),
    ...decisionRecords.map((record) => safeString(record.decidedAt))
  ]) ?? new Date().toISOString();

  return {
    recentIntentCount: intentRecords.length,
    readyCount: intentRecords.filter((record) => record.status === "ready_live_forex_canary").length,
    dryRunCount: intentRecords.filter((record) => record.status === "dry_run_live_forex_canary").length,
    submittedCount: intentRecords.filter((record) => record.status === "submitted_live_forex_canary").length,
    filledCount: intentRecords.filter((record) => record.status === "filled_live_forex_canary").length,
    blockedCount: decisionRecords.filter((record) => record.status === "blocked").length,
    boundedRoutingWarningCount: boundedAuditSnapshot.docs.length,
    lastRoutedAt: latestIso(intentRecords.map((record) => safeString(record.updatedAt))),
    updatedAt
  };
}

export async function loadForexLiveCanaryExecutionPreview(workspaceId: string, studentId?: string): Promise<ForexLiveCanaryExecutionPreview> {
  const { db } = getFirebaseAdminClients();
  const env = forexLiveCanaryEnv();
  const intentQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_live_canary_intents`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_live_canary_intents`);
  const attemptQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_live_canary_order_attempts`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_live_canary_order_attempts`);
  const decisionQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_live_canary_gate_decisions`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_live_canary_gate_decisions`);
  const auditQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_live_canary_audit_events`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_live_canary_audit_events`);
  const [routing, controls, intentSnapshot, attemptSnapshot, decisionSnapshot, auditSnapshot] = await Promise.all([
    summarizeRouting(workspaceId, studentId),
    loadForexLiveCanaryControls(workspaceId),
    intentQuery.orderBy("updatedAt", "desc").limit(FOREX_LIVE_CANARY_READ_LIMIT).get(),
    attemptQuery.orderBy("updatedAt", "desc").limit(FOREX_LIVE_CANARY_READ_LIMIT).get(),
    decisionQuery.orderBy("decidedAt", "desc").limit(FOREX_LIVE_CANARY_READ_LIMIT).get(),
    auditQuery.orderBy("createdAt", "desc").limit(FOREX_LIVE_CANARY_READ_LIMIT).get()
  ]);

  return {
    visibleLimit: FOREX_LIVE_CANARY_VISIBLE_LIMIT,
    routing,
    env,
    platformControl: controls.platformControl,
    workspaceControl: controls.workspaceControl,
    intents: intentSnapshot.docs.slice(0, FOREX_LIVE_CANARY_VISIBLE_LIMIT).map((doc) => mapIntentSummary(doc.data())),
    attempts: attemptSnapshot.docs.slice(0, FOREX_LIVE_CANARY_VISIBLE_LIMIT).map((doc) => mapAttemptSummary(doc.data())),
    gateDecisions: decisionSnapshot.docs.slice(0, FOREX_LIVE_CANARY_VISIBLE_LIMIT).map((doc) => mapGateDecisionSummary(doc.data())),
    auditEvents: auditSnapshot.docs.slice(0, FOREX_LIVE_CANARY_VISIBLE_LIMIT).map((doc) => mapAuditSummary(doc.data())),
    bounded: {
      intents: intentSnapshot.docs.length > FOREX_LIVE_CANARY_VISIBLE_LIMIT,
      attempts: attemptSnapshot.docs.length > FOREX_LIVE_CANARY_VISIBLE_LIMIT,
      gateDecisions: decisionSnapshot.docs.length > FOREX_LIVE_CANARY_VISIBLE_LIMIT,
      auditEvents: auditSnapshot.docs.length > FOREX_LIVE_CANARY_VISIBLE_LIMIT
    },
    warnings: env.liveCanaryEnabled
      ? ["Tiny live Forex canary preview is support-safe and hides provider secrets, account IDs, vault refs, and raw payloads."]
      : ["Tiny live Forex canary is disabled by default. Real money risk remains blocked until explicit env and controls are enabled."]
  };
}

async function loadForexLiveCanaryWorkerPrerequisites(workspaceId: string, intent: ForexLiveCanaryIntentRecord) {
  const { db } = getFirebaseAdminClients();
  const env = forexLiveCanaryEnv();
  const [billing, connection, controls, preferencesSnapshot] = await Promise.all([
    getForexAutoCopyBillingState(workspaceId, intent.studentId),
    loadVerifiedLiveConnectionById(workspaceId, intent.studentId, intent.connectionId),
    loadForexLiveCanaryControls(workspaceId),
    db.doc(`workspaces/${workspaceId}/students/${intent.studentId}/auto_copy_preferences/forex`).get()
  ]);
  const preferences = mapCrossAssetAutoCopyPreferencesRecord({
    record: preferencesSnapshot.exists ? workspaceRecordFromSnapshot(preferencesSnapshot, "preferenceId") : null,
    workspaceId,
    studentId: intent.studentId,
    market: "forex"
  });

  if (!billing.entitled) {
    return { ok: false as const, blockedReason: "forex_autocopy_not_purchased", safeMessage: billing.reason };
  }

  if (!env.liveCanaryEnabled || !controls.platformControl.canaryEnabled || !controls.workspaceControl.canaryEnabled) {
    return {
      ok: false as const,
      blockedReason: "forex_live_canary_disabled",
      safeMessage: "Tiny live Forex canary controls must still be enabled before worker execution."
    };
  }

  if (controls.platformControl.killSwitchEnabled || controls.workspaceControl.killSwitchEnabled) {
    return {
      ok: false as const,
      blockedReason: "forex_live_canary_kill_switch",
      safeMessage: "Tiny live Forex canary kill switch is active."
    };
  }

  if (preferences.executionMode !== "full_auto") {
    return {
      ok: false as const,
      blockedReason: "forex_live_canary_full_auto_required",
      safeMessage: "Tiny live Forex canary requires current full-auto Forex Auto-Copy mode."
    };
  }

  if (preferences.consentStatus !== "accepted") {
    return {
      ok: false as const,
      blockedReason: "forex_live_canary_consent_required",
      safeMessage: "Tiny live Forex canary requires current accepted Forex Auto-Copy consent."
    };
  }

  if (
    preferences.studentPaused ||
    preferences.killSwitchEnabled
  ) {
    return {
      ok: false as const,
      blockedReason: "forex_live_canary_student_paused",
      safeMessage: "Tiny live Forex canary is blocked because the student paused, revoked, or disabled Forex Auto-Copy."
    };
  }

  if (!connection) {
    return {
      ok: false as const,
      blockedReason: "forex_live_connection_required",
      safeMessage: "A verified production MetaAPI connection with encrypted token storage is required; demo connections are rejected."
    };
  }

  if (!accountAllowedByBothControls(controls.platformControl, controls.workspaceControl, connection.providerAccountFingerprint)) {
    return {
      ok: false as const,
      blockedReason: "withdrawal_capability_unavailable_unverified",
      safeMessage: "Live Forex canary account is not approved with safe no-withdrawal/no-custody confirmation."
    };
  }

  if (!controls.platformControl.allowedWorkspaceIds.includes(workspaceId)) {
    return {
      ok: false as const,
      blockedReason: "forex_live_canary_workspace_not_allowlisted",
      safeMessage: "Workspace is not currently allowlisted for tiny live Forex canary."
    };
  }

  if (
    !controls.platformControl.allowedStudentIds.includes(intent.studentId) ||
    !controls.workspaceControl.allowedStudentIds.includes(intent.studentId)
  ) {
    return {
      ok: false as const,
      blockedReason: "forex_live_canary_student_not_allowlisted",
      safeMessage: "Student is not currently allowlisted for tiny live Forex canary."
    };
  }

  if (
    !controls.platformControl.allowedPairs.includes(intent.pair) ||
    !controls.workspaceControl.allowedPairs.includes(intent.pair) ||
    (preferences.allowedPairs.length > 0 && !preferences.allowedPairs.includes(intent.pair))
  ) {
    return {
      ok: false as const,
      blockedReason: "forex_live_canary_symbol_not_allowlisted",
      safeMessage: "Forex pair is not currently allowlisted for tiny live Forex canary."
    };
  }

  if (await openOrderCount(workspaceId, intent.studentId) >= 1) {
    return {
      ok: false as const,
      blockedReason: "forex_live_canary_open_order_cap",
      safeMessage: "Tiny live Forex canary allows max 1 open order per student."
    };
  }

  const usedToday = await todayNotionalUsd(workspaceId, intent.studentId);
  if (
    usedToday + intent.requestedNotionalUsd > env.maxDailyNotionalUsd ||
    usedToday + intent.requestedNotionalUsd > controls.platformControl.maxDailyNotionalUsd ||
    usedToday + intent.requestedNotionalUsd > controls.workspaceControl.maxDailyNotionalUsd
  ) {
    return {
      ok: false as const,
      blockedReason: "forex_live_canary_daily_cap",
      safeMessage: "Tiny live Forex canary daily notional cap would be exceeded."
    };
  }

  return { ok: true as const, connection, controls };
}

function buildAttempt(intent: ForexLiveCanaryIntentRecord, now: string, status: ForexLiveCanaryIntentStatus, message?: string): ForexLiveCanaryOrderAttemptRecord {
  return stripUndefined({
    attemptId: deterministicId(["forex_live_canary_attempt", intent.intentId], 150),
    workspaceId: intent.workspaceId,
    intentId: intent.intentId,
    signalId: intent.signalId,
    studentId: intent.studentId,
    connectionId: intent.connectionId,
    provider: "metaapi",
    environment: "production",
    executionMode: "forex_live_canary",
    pair: intent.pair,
    side: intent.side,
    orderType: "market",
    status,
    volume: intent.volume,
    entryPrice: intent.entryPrice,
    stopLoss: intent.stopLoss,
    takeProfit: intent.takeProfit,
    requestedNotionalUsd: intent.requestedNotionalUsd,
    idempotencyKey: `forex-live-canary-attempt:${intent.workspaceId}:${intent.intentId}`.toLowerCase(),
    providerClientOrderId: intent.providerClientOrderId,
    providerOrderRef: intent.dryRun ? `dry-${intent.providerClientOrderId.slice(-8)}` : undefined,
    dryRun: intent.dryRun,
    sanitizedFailureReason: message,
    submittedAt: now,
    updatedAt: now
  }) satisfies ForexLiveCanaryOrderAttemptRecord;
}

export async function runForexLiveCanaryWorker(actor: VerifiedSuperAdmin, payload: unknown): Promise<ForexLiveCanaryWorkerRunResponse> {
  if (!actor.uid) {
    throw new AdminApiError(403, "super_admin_required", "This endpoint requires Super Admin access.");
  }

  const workspaceId = sanitizeWorkspaceId(
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).workspaceId
      : undefined
  );
  const confirmation = typeof payload === "object" && payload !== null && !Array.isArray(payload)
    ? safeString((payload as Record<string, unknown>).confirmation)
    : "";

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before running the tiny live Forex canary worker.");
  }

  if (confirmation !== "RUN_FOREX_LIVE_CANARY") {
    throw new AdminApiError(400, "forex_live_canary_confirmation_required", "Type RUN_FOREX_LIVE_CANARY before running the tiny live Forex canary worker.");
  }

  const env = forexLiveCanaryEnv();
  const now = new Date().toISOString();
  const warnings: string[] = [];
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/forex_live_canary_intents`)
    .where("status", "==", "ready_live_forex_canary")
    .orderBy("updatedAt", "asc")
    .limit(FOREX_LIVE_CANARY_WORKER_LIMIT + 1)
    .get();
  const candidateDocs = snapshot.docs.slice(0, FOREX_LIVE_CANARY_WORKER_LIMIT);
  const bounded = snapshot.docs.length > FOREX_LIVE_CANARY_WORKER_LIMIT;
  let processedCount = 0;
  let dryRunCount = 0;
  let submittedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  if (!env.liveCanaryEnabled) {
    warnings.push("Tiny live Forex canary worker is disabled by FOREX_LIVE_CANARY_ENABLED.");

    return {
      ...createSourceMeta(warnings),
      ok: true,
      workspaceId,
      liveOrdersEnabled: false,
      liveDryRun: true,
      candidateLimit: 1,
      candidateCount: 0,
      processedCount,
      dryRunCount,
      submittedCount,
      skippedCount,
      failedCount,
      bounded: false,
      warnings,
      updatedAt: now
    };
  }

  for (const doc of candidateDocs) {
    const intent = doc.data() as ForexLiveCanaryIntentRecord;
    const attemptId = deterministicId(["forex_live_canary_attempt", intent.intentId], 150);
    const attemptRef = db.doc(`workspaces/${workspaceId}/forex_live_canary_order_attempts/${attemptId}`);
    const existingAttempt = await attemptRef.get();
    const batch = db.batch();

    processedCount += 1;

    if (
      intent.executionMode !== "forex_live_canary" ||
      intent.environment !== "production" ||
      intent.liveCanary !== true ||
      intent.status !== "ready_live_forex_canary"
    ) {
      skippedCount += 1;
      batch.set(doc.ref, { status: "skipped_live_forex_canary", updatedAt: now }, { merge: true });
      await batch.commit();
      continue;
    }

    if (existingAttempt.exists) {
      skippedCount += 1;
      await batch.commit();
      continue;
    }

    const prerequisites = await loadForexLiveCanaryWorkerPrerequisites(workspaceId, intent);

    if (!prerequisites.ok) {
      batch.set(attemptRef, buildAttempt(intent, now, "failed_live_forex_canary", prerequisites.safeMessage), { merge: true });
      batch.set(doc.ref, { status: "failed_live_forex_canary", updatedAt: now }, { merge: true });
      queueAuditEvent(db, batch, {
        action: "forex_live_canary.worker.failed",
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        targetType: "live_canary_attempt",
        targetId: attemptId,
        safeMessage: prerequisites.safeMessage,
        severity: "warning",
        after: { blockedReason: prerequisites.blockedReason },
        createdAt: now
      });
      await batch.commit();
      failedCount += 1;
      continue;
    }

    const orderCallsEnabled = env.liveOrderCallsEnabled &&
      prerequisites.controls.platformControl.orderCallsEnabled &&
      prerequisites.controls.workspaceControl.orderCallsEnabled &&
      !env.liveDryRun &&
      !prerequisites.controls.platformControl.dryRun &&
      !prerequisites.controls.workspaceControl.dryRun;

    if (!orderCallsEnabled) {
      batch.set(attemptRef, buildAttempt(intent, now, "dry_run_live_forex_canary", "Tiny live Forex canary dry-run recorded; no MetaAPI broker call was made."), { merge: true });
      batch.set(doc.ref, { status: "dry_run_live_forex_canary", updatedAt: now }, { merge: true });
      queueAuditEvent(db, batch, {
        action: "forex_live_canary.worker.dry_run",
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        targetType: "live_canary_attempt",
        targetId: attemptId,
        safeMessage: "Tiny live Forex canary worker recorded a dry-run attempt. MetaAPI live order calls remain disabled.",
        severity: "info",
        after: { pair: intent.pair, dryRun: true },
        createdAt: now
      });
      await batch.commit();
      dryRunCount += 1;
      continue;
    }

    try {
      const token = await loadForexMetaApiToken({ workspaceId, studentId: intent.studentId, connectionId: intent.connectionId });

      if (token.environment !== "production") {
        throw new AdminApiError(403, "forex_live_canary_token_environment_invalid", "Tiny live Forex canary only accepts production MetaAPI tokens.");
      }

      const adapter = getForexLiveCanaryOrderPlacementAdapter(intent.provider);
      const result = await adapter.submitOrder({
        provider: "metaapi",
        environment: "production",
        liveCanary: true,
        metaApiToken: token.metaApiToken,
        metaApiAccountId: token.metaApiAccountId,
        symbol: intent.pair,
        side: intent.side,
        volume: intent.volume,
        stopLoss: intent.stopLoss,
        takeProfit: intent.takeProfit,
        clientOrderId: intent.providerClientOrderId
      });
      const status: ForexLiveCanaryIntentStatus =
        result.ok && result.status === "filled"
          ? "filled_live_forex_canary"
          : result.ok && result.status === "partially_filled"
            ? "partially_filled_live_forex_canary"
            : result.ok
              ? "submitted_live_forex_canary"
              : "failed_live_forex_canary";
      const attempt = {
        ...buildAttempt(intent, now, status, result.sanitizedFailureReason),
        providerOrderId: result.providerOrderId,
        providerOrderRef: result.providerOrderRef,
        providerHttpStatus: result.providerHttpStatus,
        canonicalSymbol: result.canonicalSymbol,
        providerSymbol: result.providerSymbol,
        sanitizedFailureCode: result.sanitizedFailureCode,
        sanitizedFailureReason: result.sanitizedFailureReason,
        sanitizedProviderErrorCode: result.sanitizedProviderErrorCode,
        sanitizedProviderErrorMessage: result.sanitizedProviderErrorMessage,
        acknowledgedAt: result.ok ? now : undefined,
        completedAt: status === "filled_live_forex_canary" ? now : undefined
      } satisfies ForexLiveCanaryOrderAttemptRecord;

      batch.set(attemptRef, stripUndefined(attempt), { merge: true });
      batch.set(doc.ref, { status, updatedAt: now }, { merge: true });
      queueAuditEvent(db, batch, {
        action: result.ok ? "forex_live_canary.worker.submitted" : "forex_live_canary.worker.failed",
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        targetType: "live_canary_attempt",
        targetId: attemptId,
        safeMessage: result.safeMessage,
        severity: result.ok ? "critical" : "warning",
        after: { pair: intent.pair, status, providerOrderRef: result.providerOrderRef },
        createdAt: now
      });
      await batch.commit();
      if (result.ok) {
        submittedCount += 1;
      } else {
        failedCount += 1;
      }
    } catch (error) {
      const safeMessage = error instanceof AdminApiError
        ? error.message
        : "Tiny live Forex canary worker failed safely before MetaAPI order submission.";
      batch.set(attemptRef, buildAttempt(intent, now, "failed_live_forex_canary", safeMessage), { merge: true });
      batch.set(doc.ref, { status: "failed_live_forex_canary", updatedAt: now }, { merge: true });
      await batch.commit();
      failedCount += 1;
    }
  }

  if (bounded) {
    warnings.push("Tiny live Forex canary worker reached the bounded limit of 1 record.");
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId,
    liveOrdersEnabled: env.liveOrderCallsEnabled,
    liveDryRun: env.liveDryRun,
    candidateLimit: 1,
    candidateCount: candidateDocs.length,
    processedCount,
    dryRunCount,
    submittedCount,
    skippedCount,
    failedCount,
    bounded,
    warnings,
    updatedAt: now
  };
}
