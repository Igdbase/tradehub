import "server-only";

import type { Firestore, WriteBatch } from "firebase-admin/firestore";
import { mapSubscriptionRecord, recordFromSnapshot as billingRecordFromSnapshot } from "@/lib/billing/billing-mappers";
import {
  defaultCrossAssetAutoCopyPreferences,
  evaluateStaleSignalPolicy,
  mapCrossAssetAutoCopyPreferencesRecord
} from "@/lib/crypto-execution/auto-copy-preferences";
import { loadForexMetaApiToken } from "@/lib/crypto-execution/credential-vault";
import { getForexDemoOrderPlacementAdapter } from "@/lib/crypto-execution/forex";
import {
  getForexAutoCopyBillingState,
  loadStudentForexProvisioningForExecution
} from "@/lib/crypto-execution/forex-provisioning-repository";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { isPublishedRoutableTradeHubSignalForMarket } from "@/lib/signals/tradehub-signal-source-guards";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import {
  mapWorkspaceForDashboard,
  recordFromSnapshot as workspaceRecordFromSnapshot
} from "@/lib/workspace/dashboard-mappers";
import { normalizeSignalPairForForexDemoProof } from "@/lib/workspace/signal-symbols";
import type {
  CrossAssetAutoCopyConfirmationRecord,
  CrossAssetAutoCopyPreferencesRecord,
  CryptoLiveSandboxReconciliationStatus,
  ExecutionRiskCheck,
  ForexBrokerConnectionRecord,
  ForexConnectionStatus,
  ForexDemoAuditEventRecord,
  ForexDemoAuditEventSummary,
  ForexDemoCancelResponse,
  ForexDemoExecutionControlRecord,
  ForexDemoExecutionIntentRecord,
  ForexDemoExecutionQueueRecord,
  ForexDemoExecutionPreview,
  ForexDemoGateDecisionRecord,
  ForexDemoGateDecisionSummary,
  ForexDemoIntentStatus,
  ForexDemoIntentSummary,
  ForexDemoOrderAttemptRecord,
  ForexDemoOrderAttemptSummary,
  ForexDemoReconciliationRecord,
  ForexDemoReconciliationRunResponse,
  ForexDemoReconciliationSummary,
  ForexDemoRoutingOverview,
  ForexDemoRoutingSummary,
  ForexDemoWorkerRunResponse,
  ForexProvisionedAccountRecord,
  RiskDecisionStatus
} from "@/types/crypto-execution";
import type { StudentEntitlementSummary } from "@/types/entitlements";
import type { WorkspaceSignalRecord } from "@/types/workspace-dashboard";

export const FOREX_DEMO_CANDIDATE_LIMIT = 25;
const FOREX_DEMO_VISIBLE_LIMIT = 4;
const FOREX_DEMO_READ_LIMIT = FOREX_DEMO_VISIBLE_LIMIT + 1;
const FOREX_DEMO_OVERVIEW_LIMIT = 50;
const FOREX_DEMO_WORKER_DEFAULT_LIMIT = 1;
const FOREX_DEMO_WORKER_MAX_LIMIT = 1;

type ForexDemoGateEvaluation = {
  status: RiskDecisionStatus;
  checks: ExecutionRiskCheck[];
  blockedReason?: string;
  pair: string;
  volume: number;
  simulatedNotional: number;
  connection?: ForexBrokerConnectionRecord;
  provisioning?: ForexProvisionedAccountRecord;
  confirmationReason?: "execution_mode" | "stale_signal";
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
    sourceMessage: "Forex demo execution data was loaded through server-side Firebase Admin SDK routes.",
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

function normalizeForexPair(value: string) {
  return normalizeSignalPairForForexDemoProof(value) ?? "";
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

function sortByRecent<T>(records: T[], getDate: (record: T) => string) {
  return [...records].sort((left, right) => getDate(right).localeCompare(getDate(left)));
}

function buildCheck(key: ExecutionRiskCheck["key"], status: RiskDecisionStatus, message: string): ExecutionRiskCheck {
  return { key, status, message };
}

function forexDemoEnv() {
  return {
    demoEnabled: process.env.FOREX_EXECUTION_DEMO_ENABLED === "true",
    demoOrderCallsEnabled: process.env.FOREX_EXECUTION_DEMO_ORDER_CALLS_ENABLED === "true",
    demoDryRun: process.env.FOREX_EXECUTION_DEMO_DRY_RUN !== "false",
    maxNotionalUsd: Math.max(1, Math.min(safeNumber(process.env.FOREX_EXECUTION_DEMO_MAX_NOTIONAL_USD, 5), 50))
  };
}

function defaultControl(scope: "platform" | "workspace", workspaceId?: string): ForexDemoExecutionControlRecord {
  const env = forexDemoEnv();

  return {
    scope,
    workspaceId,
    demoEnabled: false,
    demoOrderCallsEnabled: false,
    dryRun: true,
    killSwitchEnabled: false,
    allowedPairs: [],
    maxNotionalUsd: env.maxNotionalUsd,
    maxOpenOrdersPerStudent: 1,
    updatedAt: new Date().toISOString()
  };
}

function mapControl(
  record: Record<string, unknown> | null,
  scope: "platform" | "workspace",
  workspaceId?: string
): ForexDemoExecutionControlRecord {
  const fallback = defaultControl(scope, workspaceId);
  const allowedPairs = Array.isArray(record?.allowedPairs)
    ? record.allowedPairs
        .map((entry) => normalizeForexPair(safeString(entry)))
        .filter(Boolean)
    : [];

  return {
    ...fallback,
    demoEnabled: typeof record?.demoEnabled === "boolean" ? record.demoEnabled : fallback.demoEnabled,
    demoOrderCallsEnabled: typeof record?.demoOrderCallsEnabled === "boolean"
      ? record.demoOrderCallsEnabled
      : fallback.demoOrderCallsEnabled,
    dryRun: typeof record?.dryRun === "boolean" ? record.dryRun : fallback.dryRun,
    killSwitchEnabled: typeof record?.killSwitchEnabled === "boolean" ? record.killSwitchEnabled : fallback.killSwitchEnabled,
    killSwitchReason: safeString(record?.killSwitchReason) || undefined,
    allowedPairs: [...new Set(allowedPairs)].slice(0, 50),
    maxNotionalUsd: Math.max(1, Math.min(safeNumber(record?.maxNotionalUsd, fallback.maxNotionalUsd), 50)),
    maxOpenOrdersPerStudent: Math.max(1, Math.min(Math.floor(safeNumber(record?.maxOpenOrdersPerStudent, 1)), 5)),
    updatedAt: safeString(record?.updatedAt) || fallback.updatedAt,
    updatedBy: safeString(record?.updatedBy) || undefined
  };
}

async function loadForexDemoControls(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const [platformSnapshot, workspaceSnapshot] = await Promise.all([
    db.doc("platform_forex_demo_controls/current").get(),
    db.doc(`workspaces/${workspaceId}/forex_demo_controls/current`).get()
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
    environment: record.environment === "demo" || record.environment === "production" ? record.environment : "unknown",
    status,
    readinessStatus:
      record.readinessStatus === "paper_only_ready" ||
      record.readinessStatus === "metadata_ready" ||
      record.readinessStatus === "token_storage_blocked" ||
      record.readinessStatus === "verification_failed" ||
      record.readinessStatus === "disabled"
        ? record.readinessStatus
        : "not_connected",
    connectionLabel: safeString(record.connectionLabel) || "MetaAPI demo connection",
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
    supportSafeMessage: safeString(record.supportSafeMessage) || "MetaAPI connection metadata is available for paper-only forex surfaces.",
    createdAt: safeString(record.createdAt) || new Date().toISOString(),
    updatedAt: safeString(record.updatedAt) || new Date().toISOString()
  };
}

function isVerifiedExecutableDemoConnection(connection?: ForexBrokerConnectionRecord) {
  return connection?.environment === "demo" &&
    connection.status === "verified" &&
    connection.readinessStatus === "paper_only_ready" &&
    connection.tokenVaultStatus === "encrypted_reference_ready";
}

async function loadVerifiedDemoConnection(workspaceId: string, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students/${studentId}/forex_connections`)
    .where("provider", "==", "metaapi")
    .limit(10)
    .get();
  const connections = snapshot.docs
    .map((doc) => mapForexConnection({ connectionId: doc.id, ...doc.data() }, { workspaceId, studentId, connectionId: doc.id }))
    .filter(isVerifiedExecutableDemoConnection)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return connections[0];
}

async function loadVerifiedDemoConnectionById(workspaceId: string, studentId: string, connectionIdValue: unknown) {
  const connectionId = safeString(connectionIdValue).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 90);

  if (!connectionId || connectionId !== safeString(connectionIdValue)) {
    return null;
  }

  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .doc(`workspaces/${workspaceId}/students/${studentId}/forex_connections/${connectionId}`)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const connection = mapForexConnection({ connectionId: snapshot.id, ...snapshot.data() }, {
    workspaceId,
    studentId,
    connectionId: snapshot.id
  });

  return isVerifiedExecutableDemoConnection(connection) ? connection : null;
}

async function loadForexDemoWorkerPrerequisites(workspaceId: string, intent: ForexDemoExecutionIntentRecord) {
  const [billing, provisioning, connection] = await Promise.all([
    getForexAutoCopyBillingState(workspaceId, intent.studentId),
    loadStudentForexProvisioningForExecution(workspaceId, intent.studentId),
    loadVerifiedDemoConnectionById(workspaceId, intent.studentId, intent.connectionId)
  ]);

  if (!billing.entitled) {
    return {
      ok: false as const,
      blockedReason: "forex_autocopy_not_purchased",
      safeMessage: billing.reason
    };
  }

  if (!provisioning) {
    return {
      ok: false as const,
      blockedReason: "forex_provisioning_required",
      safeMessage: "Active paid Forex AutoCopy demo provisioning is required before demo execution proof can run."
    };
  }

  if (!connection) {
    return {
      ok: false as const,
      blockedReason: "forex_demo_connection_required",
      safeMessage: "A verified demo MetaAPI connection with encrypted token storage is required before demo execution proof can run."
    };
  }

  return {
    ok: true as const,
    provisioning,
    connection
  };
}

function queueAuditEvent(
  db: Firestore,
  batch: WriteBatch,
  input: Omit<ForexDemoAuditEventRecord, "eventId" | "createdAt"> & { createdAt?: string }
) {
  const eventRef = db.collection(`workspaces/${input.workspaceId}/forex_demo_audit_events`).doc();
  batch.set(eventRef, stripUndefined({
    eventId: eventRef.id,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...input
  }));
}

function evaluateCandidate({
  signal,
  studentId,
  entitlements,
  preferences,
  connection,
  provisioning,
  platformControl,
  workspaceControl
}: {
  signal: WorkspaceSignalRecord;
  studentId: string;
  entitlements: StudentEntitlementSummary;
  preferences?: CrossAssetAutoCopyPreferencesRecord;
  connection?: ForexBrokerConnectionRecord;
  provisioning?: ForexProvisionedAccountRecord | null;
  platformControl: ForexDemoExecutionControlRecord;
  workspaceControl: ForexDemoExecutionControlRecord;
}): ForexDemoGateEvaluation {
  const env = forexDemoEnv();
  const checks: ExecutionRiskCheck[] = [];
  const pair = normalizeForexPair(signal.pair);
  const autoCopyPreferences = preferences ?? defaultCrossAssetAutoCopyPreferences({
    workspaceId: signal.workspaceId,
    studentId,
    market: "forex"
  });
  const staleDecision = evaluateStaleSignalPolicy({
    signal,
    preferences: autoCopyPreferences
  });
  const simulatedNotional = Math.max(
    1,
    Math.min(autoCopyPreferences.maxFixedNotional || 5, env.maxNotionalUsd, platformControl.maxNotionalUsd, workspaceControl.maxNotionalUsd)
  );
  const volume = Math.max(0.01, Math.min(0.01, simulatedNotional / 100_000));
  const pairAllowed =
    (workspaceControl.allowedPairs.length === 0 || workspaceControl.allowedPairs.includes(pair)) &&
    (platformControl.allowedPairs.length === 0 || platformControl.allowedPairs.includes(pair)) &&
    (autoCopyPreferences.allowedPairs.length === 0 || autoCopyPreferences.allowedPairs.includes(pair));

  checks.push(buildCheck(
    "signal_status",
    signal.status === "published" ? "allowed" : "blocked",
    signal.status === "published" ? "Signal is published." : "Only published forex signals can create demo execution records."
  ));
  checks.push(buildCheck(
    "signal_market",
    signal.market === "forex" ? "allowed" : "blocked",
    signal.market === "forex" ? "Signal market is forex." : "Only forex signals can create forex demo execution records."
  ));
  checks.push(buildCheck(
    "signal_symbol",
    pair ? "allowed" : "blocked",
    pair ? `Signal pair normalized to supported forex pair ${pair}.` : "forex_pair_invalid_for_market"
  ));
  checks.push(buildCheck(
    "signal_directional_levels",
    directionalLevelsAreValid(signal) ? "allowed" : "blocked",
    directionalLevelsAreValid(signal)
      ? "Signal levels match the trade direction."
      : signal.direction === "buy"
        ? "Buy signals require take-profit above entry and stop-loss below entry."
        : "Sell signals require take-profit below entry and stop-loss above entry."
  ));
  checks.push(buildCheck(
    "entitlement_auto_copy",
    entitlements.features.autoCopy.access === "allowed" ? "allowed" : "blocked",
    entitlements.features.autoCopy.access === "allowed"
      ? "Stage 16 Auto-Copy entitlement allows this student."
      : entitlements.features.autoCopy.reason
  ));
  checks.push(buildCheck(
    "risk_posture",
    entitlements.riskPosture === "personal_account" ? "allowed" : "blocked",
    entitlements.riskPosture === "personal_account"
      ? "Student risk posture is personal account."
      : "Funded-account, prop-firm, or unknown risk posture stays Signal Alerts only."
  ));
  checks.push(buildCheck(
    "platform_kill_switch",
    !platformControl.killSwitchEnabled ? "allowed" : "blocked",
    platformControl.killSwitchEnabled ? "Platform forex demo kill switch is active." : "Platform forex demo kill switch is off."
  ));
  checks.push(buildCheck(
    "workspace_kill_switch",
    !workspaceControl.killSwitchEnabled ? "allowed" : "blocked",
    workspaceControl.killSwitchEnabled ? "Workspace forex demo kill switch is active." : "Workspace forex demo kill switch is off."
  ));
  checks.push(buildCheck(
    "execution_mode",
    autoCopyPreferences.executionMode === "full_auto"
      ? "allowed"
      : autoCopyPreferences.executionMode === "confirm_before_execute"
        ? "requires_review"
        : "blocked",
    autoCopyPreferences.executionMode === "full_auto"
      ? "Student selected full-auto forex demo proof."
      : autoCopyPreferences.executionMode === "confirm_before_execute"
        ? "Student requires confirmation before forex demo proof."
        : "Student selected Signal Alerts only for forex."
  ));
  checks.push(buildCheck(
    "student_opt_in",
    autoCopyPreferences.consentStatus === "accepted" ? "allowed" : "blocked",
    autoCopyPreferences.consentStatus === "accepted"
      ? "Student accepted Forex Auto-Copy consent."
      : "Student must accept Forex Auto-Copy consent before demo execution proof can be queued."
  ));
  checks.push(buildCheck(
    "student_pause",
    autoCopyPreferences.studentPaused ||
      autoCopyPreferences.killSwitchEnabled ||
      autoCopyPreferences.consentStatus === "paused" ||
      autoCopyPreferences.consentStatus === "revoked"
      ? "blocked"
      : "allowed",
    autoCopyPreferences.studentPaused ||
      autoCopyPreferences.killSwitchEnabled ||
      autoCopyPreferences.consentStatus === "paused" ||
      autoCopyPreferences.consentStatus === "revoked"
      ? "Student paused, revoked, or disabled forex Auto-Copy."
      : "Student forex Auto-Copy pause is off."
  ));
  checks.push(buildCheck(
    "stale_signal",
    staleDecision.outcome === "route_normally"
      ? "allowed"
      : staleDecision.outcome === "require_confirmation"
        ? "requires_review"
        : "blocked",
    staleDecision.safeMessage
  ));
  checks.push(buildCheck(
    "symbol_allowlist",
    pairAllowed ? "allowed" : "blocked",
    pairAllowed ? "Forex pair allowlists permit this demo proof." : "Forex pair is not allowlisted for demo proof."
  ));
  checks.push(buildCheck(
    "exchange_connection",
    connection ? "allowed" : "blocked",
    connection
      ? "Verified demo MetaAPI connection with loadable token metadata exists."
      : "A verified demo MetaAPI connection with encrypted token storage is required."
  ));
  checks.push(buildCheck(
    "forex_provisioning",
    provisioning ? "allowed" : "blocked",
    provisioning
      ? "Paid Forex AutoCopy provisioning dry-run is complete for this student."
      : "Paid Forex AutoCopy provisioning is required before demo execution proof can run."
  ));
  checks.push(buildCheck(
    "permission_verification",
    connection?.tokenVaultStatus === "metadata_only" ? "blocked" : "allowed",
    connection?.tokenVaultStatus === "metadata_only"
      ? "Mock MetaAPI connection metadata is not executable."
      : "Mock metadata-only forex connections are not executable."
  ));
  checks.push(buildCheck(
    "max_risk_per_trade",
    simulatedNotional <= env.maxNotionalUsd &&
      simulatedNotional <= platformControl.maxNotionalUsd &&
      simulatedNotional <= workspaceControl.maxNotionalUsd
      ? "allowed"
      : "blocked",
    "Forex demo notional is clamped by env, platform, workspace, and student caps."
  ));

  if (!env.demoEnabled || !platformControl.demoEnabled || !workspaceControl.demoEnabled) {
    checks.push(buildCheck(
      "sandbox_only",
      "blocked",
      "Forex demo execution is disabled until env, platform, and workspace demo controls are enabled."
    ));
  }

  const failed = checks.filter((check) => check.status === "blocked");
  const requiresReview = checks.filter((check) => check.status === "requires_review");

  if (failed.length > 0) {
    return {
      status: "blocked",
      checks,
      blockedReason: failed[0]?.message ?? "Forex demo routing was blocked.",
      pair,
      volume,
      simulatedNotional,
      connection,
      provisioning: provisioning ?? undefined
    };
  }

  if (requiresReview.length > 0) {
    return {
      status: "requires_review",
      checks,
      blockedReason: requiresReview[0]?.message,
      pair,
      volume,
      simulatedNotional,
      connection,
      provisioning: provisioning ?? undefined,
      confirmationReason: staleDecision.outcome === "require_confirmation" ? "stale_signal" : "execution_mode"
    };
  }

  return {
    status: "allowed",
    checks,
    pair,
    volume,
    simulatedNotional,
    connection,
    provisioning: provisioning ?? undefined
  };
}

function buildIntentId(input: { workspaceId: string; signalId: string; studentId: string; connectionId: string; pair: string }) {
  return deterministicId(["forex_demo", input.workspaceId, input.signalId, input.studentId, input.connectionId, input.pair], 150);
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
  evaluation: ForexDemoGateEvaluation;
  now: string;
}): ForexDemoGateDecisionRecord {
  return stripUndefined({
    decisionId: deterministicId(["forex_demo_gate", intentId], 150),
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
    decidedBy: "forex-demo-gate:v1"
  }) satisfies ForexDemoGateDecisionRecord;
}

function buildConfirmationRecord({
  signal,
  studentId,
  pair,
  reason,
  now
}: {
  signal: WorkspaceSignalRecord;
  studentId: string;
  pair: string;
  reason: "execution_mode" | "stale_signal";
  now: string;
}): CrossAssetAutoCopyConfirmationRecord {
  return stripUndefined({
    confirmationId: deterministicId(["forex_demo_confirm", signal.workspaceId, signal.signalId, studentId, reason], 140),
    workspaceId: signal.workspaceId,
    studentId,
    signalId: signal.signalId,
    market: "forex",
    status: "waiting_for_student_confirmation",
    symbolOrPair: pair,
    reason,
    safeMessage: reason === "stale_signal"
      ? "Forex signal is stale and requires student confirmation before demo execution proof."
      : "Student requires confirmation before forex demo execution proof.",
    expiresAt: new Date(Date.parse(now) + 1000 * 60 * 15).toISOString(),
    createdAt: now,
    updatedAt: now
  }) satisfies CrossAssetAutoCopyConfirmationRecord;
}

function buildIntentRecord({
  signal,
  studentId,
  intentId,
  decisionId,
  entitlements,
  evaluation,
  platformControl,
  workspaceControl,
  now
}: {
  signal: WorkspaceSignalRecord;
  studentId: string;
  intentId: string;
  decisionId: string;
  entitlements: StudentEntitlementSummary;
  evaluation: ForexDemoGateEvaluation;
  platformControl: ForexDemoExecutionControlRecord;
  workspaceControl: ForexDemoExecutionControlRecord;
  now: string;
}): ForexDemoExecutionIntentRecord {
  const env = forexDemoEnv();
  const connection = evaluation.connection;

  if (!connection) {
    throw new AdminApiError(500, "forex_demo_connection_missing", "Forex demo intent requires a verified demo connection.");
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
    environment: "demo",
    executionMode: "forex_demo",
    market: "forex",
    pair: evaluation.pair,
    side: signal.direction,
    orderType: "market",
    status: "ready_for_forex_demo",
    volume: evaluation.volume,
    entryPrice: entryPrice ?? undefined,
    stopLoss: stopLoss ?? undefined,
    takeProfit: takeProfit ?? undefined,
    simulatedNotional: evaluation.simulatedNotional,
    idempotencyKey: `forex-demo-intent:${signal.workspaceId}:${signal.signalId}:${studentId}:${connection.connectionId}:${evaluation.pair}`.toLowerCase(),
    sourceSignalVersion: signal.updatedAt,
    gateDecisionId: decisionId,
    providerClientOrderId: deterministicId(["thfd", signal.workspaceId, signal.signalId, studentId, connection.connectionId], 32),
    demoOnly: true,
    dryRun: env.demoDryRun || !env.demoOrderCallsEnabled || !platformControl.demoOrderCallsEnabled || !workspaceControl.demoOrderCallsEnabled,
    entitlementSnapshot: {
      tierId: entitlements.tierId,
      tierLabel: entitlements.tierLabel,
      subscriptionStatus: entitlements.subscriptionStatus,
      riskPosture: entitlements.riskPosture,
      autoCopyAccess: entitlements.features.autoCopy.access
    },
    gateSnapshot: {
      platformDemoEnabled: platformControl.demoEnabled,
      workspaceDemoEnabled: workspaceControl.demoEnabled,
      demoOrderCallsEnabled: env.demoOrderCallsEnabled && platformControl.demoOrderCallsEnabled && workspaceControl.demoOrderCallsEnabled,
      dryRun: env.demoDryRun || platformControl.dryRun || workspaceControl.dryRun,
      pairAllowlisted: true,
      demoConnectionVerified: true,
      mockConnectionBlocked: false
    },
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.parse(now) + 1000 * 60 * 60 * 24).toISOString()
  }) satisfies ForexDemoExecutionIntentRecord;
}

function buildQueueRecord(intent: ForexDemoExecutionIntentRecord, now: string): ForexDemoExecutionQueueRecord {
  return stripUndefined({
    queueId: deterministicId(["forex_demo_queue", intent.intentId], 150),
    workspaceId: intent.workspaceId,
    signalId: intent.signalId,
    intentId: intent.intentId,
    studentId: intent.studentId,
    connectionId: intent.connectionId,
    provider: intent.provider,
    environment: "demo",
    executionMode: "forex_demo",
    market: "forex",
    pair: intent.pair,
    side: intent.side,
    status: "queued",
    trigger: "post_signal_publish",
    idempotencyKey: intent.idempotencyKey,
    demoOnly: true,
    dryRun: intent.dryRun,
    createdAt: now,
    updatedAt: now
  }) satisfies ForexDemoExecutionQueueRecord;
}

export async function routePublishedForexSignalForDemoExecution({
  actor,
  signal,
  trigger
}: {
  actor: VerifiedInfluencer;
  signal: WorkspaceSignalRecord;
  trigger: "created_published" | "patched_published";
}): Promise<ForexDemoRoutingSummary> {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const env = forexDemoEnv();
  const warnings: string[] = [];
  let readyCount = 0;
  let blockedCount = 0;
  let confirmationRequiredCount = 0;
  let staleExpiredCount = 0;
  let intentCount = 0;

  if (!isPublishedRoutableTradeHubSignalForMarket(signal, "forex")) {
    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      trigger,
      routed: false,
      candidateLimit: FOREX_DEMO_CANDIDATE_LIMIT,
      candidateCount: 0,
      readyCount,
      blockedCount,
      confirmationRequiredCount,
      staleExpiredCount,
      intentCount,
      dryRunOnly: true,
      bounded: false,
      warnings: ["Forex demo routing only runs for newly published in-app forex signals."],
      completedAt: now
    };
  }

  const [workspaceSnapshot, studentSnapshot, controls] = await Promise.all([
    db.doc(`workspaces/${actor.workspaceId}`).get(),
    db.collection(`workspaces/${actor.workspaceId}/students`).limit(FOREX_DEMO_CANDIDATE_LIMIT).get(),
    loadForexDemoControls(actor.workspaceId)
  ]);

  if (!workspaceSnapshot.exists) {
    warnings.push("Workspace shell is missing, so forex demo routing could not evaluate students.");
    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      trigger,
      routed: false,
      candidateLimit: FOREX_DEMO_CANDIDATE_LIMIT,
      candidateCount: 0,
      readyCount,
      blockedCount,
      confirmationRequiredCount,
      staleExpiredCount,
      intentCount,
      dryRunOnly: true,
      bounded: false,
      warnings,
      completedAt: now
    };
  }

  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, actor.workspaceId);
  const studentRecords = studentSnapshot.docs.map((doc) => workspaceRecordFromSnapshot(doc, "studentId"));
  const bounded = studentSnapshot.docs.length === FOREX_DEMO_CANDIDATE_LIMIT;
  const batch = db.batch();

  queueAuditEvent(db, batch, {
    action: "forex_demo.routing.started",
    actorType: "influencer",
    actorId: actor.uid,
    workspaceId: actor.workspaceId,
    targetType: "signal",
    targetId: signal.signalId,
    safeMessage: "Forex demo routing started for a newly published signal.",
    severity: "info",
    after: { signalId: signal.signalId, trigger, candidateLimit: FOREX_DEMO_CANDIDATE_LIMIT },
    createdAt: now
  });

  if (bounded) {
    warnings.push("Forex demo routing reached the bounded candidate window.");
    queueAuditEvent(db, batch, {
      action: "forex_demo.routing.bounded",
      actorType: "influencer",
      actorId: actor.uid,
      workspaceId: actor.workspaceId,
      targetType: "signal",
      targetId: signal.signalId,
      safeMessage: "Forex demo routing reached the bounded candidate window.",
      severity: "warning",
      after: { candidateLimit: FOREX_DEMO_CANDIDATE_LIMIT },
      createdAt: now
    });
  }

  const subscriptionSnapshots = studentRecords.length > 0
    ? await db.getAll(
        ...studentRecords.map((record) =>
          db.doc(`workspaces/${actor.workspaceId}/students/${record.studentId}/subscriptions/current`)
        )
      )
    : [];
  const preferenceSnapshots = studentRecords.length > 0
    ? await db.getAll(
        ...studentRecords.map((record) =>
          db.doc(`workspaces/${actor.workspaceId}/students/${record.studentId}/auto_copy_preferences/forex`)
        )
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
    const entitlements = resolveStudentEntitlements({ workspace, studentRecord, subscription });
    const preferences = mapCrossAssetAutoCopyPreferencesRecord({
      record: preferenceSnapshots[index]?.exists
        ? workspaceRecordFromSnapshot(preferenceSnapshots[index], "preferenceId")
        : null,
      workspaceId: actor.workspaceId,
      studentId,
      market: "forex"
    });
    const [connection, provisioning] = await Promise.all([
      loadVerifiedDemoConnection(actor.workspaceId, studentId),
      loadStudentForexProvisioningForExecution(actor.workspaceId, studentId)
    ]);
    const pair = normalizeForexPair(signal.pair) || "unknown_pair";
    const intentId = buildIntentId({
      workspaceId: actor.workspaceId,
      signalId: signal.signalId,
      studentId,
      connectionId: connection?.connectionId ?? "no_demo_connection",
      pair
    });
    const evaluation = evaluateCandidate({
      signal,
      studentId,
      entitlements,
      preferences,
      connection,
      provisioning,
      platformControl: controls.platformControl,
      workspaceControl: controls.workspaceControl
    });
    const decision = buildGateDecisionRecord({ signal, studentId, intentId, evaluation, now });

    batch.set(db.doc(`workspaces/${actor.workspaceId}/forex_demo_gate_decisions/${decision.decisionId}`), decision, { merge: true });

    if (evaluation.status === "allowed") {
      const intent = buildIntentRecord({
        signal,
        studentId,
        intentId,
        decisionId: decision.decisionId,
        entitlements,
        evaluation,
        platformControl: controls.platformControl,
        workspaceControl: controls.workspaceControl,
        now
      });
      const queueRecord = buildQueueRecord(intent, now);

      batch.set(db.doc(`workspaces/${actor.workspaceId}/forex_demo_intents/${intent.intentId}`), intent, { merge: true });
      batch.set(db.doc(`workspaces/${actor.workspaceId}/forex_demo_execution_queue/${queueRecord.queueId}`), queueRecord, { merge: true });
      queueAuditEvent(db, batch, {
        action: "forex_demo.intent.created",
        actorType: "influencer",
        actorId: actor.uid,
        workspaceId: actor.workspaceId,
        studentId,
        targetType: "intent",
        targetId: intent.intentId,
        safeMessage: "Forex demo execution intent was created. Broker calls remain disabled unless explicit demo gates are open.",
        severity: "info",
        after: { signalId: signal.signalId, status: intent.status, pair: intent.pair, dryRun: intent.dryRun },
        createdAt: now
      });
      queueAuditEvent(db, batch, {
        action: "forex_demo.execution_queue.queued",
        actorType: "system",
        actorId: "forex-demo-router",
        workspaceId: actor.workspaceId,
        studentId,
        targetType: "execution_queue",
        targetId: queueRecord.queueId,
        safeMessage: "Forex demo execution was queued for server-side processing after signal publish.",
        severity: "info",
        after: {
          signalId: signal.signalId,
          intentId: intent.intentId,
          pair: intent.pair,
          dryRun: intent.dryRun,
          trigger: queueRecord.trigger
        },
        createdAt: now
      });
      readyCount += 1;
      intentCount += 1;
    } else if (evaluation.status === "requires_review") {
      const confirmation = buildConfirmationRecord({
        signal,
        studentId,
        pair: evaluation.pair || signal.pair,
        reason: evaluation.confirmationReason ?? "execution_mode",
        now
      });
      batch.set(db.doc(`workspaces/${actor.workspaceId}/auto_copy_confirmations/${confirmation.confirmationId}`), confirmation, { merge: true });
      confirmationRequiredCount += 1;
    } else {
      blockedCount += 1;
      if (evaluation.checks.some((check) => check.key === "stale_signal" && check.status === "blocked")) {
        staleExpiredCount += 1;
      }
      queueAuditEvent(db, batch, {
        action: "forex_demo.gate_blocked",
        actorType: "influencer",
        actorId: actor.uid,
        workspaceId: actor.workspaceId,
        studentId,
        targetType: "gate_decision",
        targetId: decision.decisionId,
        safeMessage: evaluation.blockedReason ?? "Forex demo routing was blocked.",
        severity: "warning",
        after: { signalId: signal.signalId },
        createdAt: now
      });
    }
  }

  queueAuditEvent(db, batch, {
    action: "forex_demo.routing.completed",
    actorType: "influencer",
    actorId: actor.uid,
    workspaceId: actor.workspaceId,
    targetType: "signal",
    targetId: signal.signalId,
    safeMessage: "Forex demo routing completed for a newly published signal.",
    severity: "info",
    after: { signalId: signal.signalId, readyCount, blockedCount, confirmationRequiredCount, intentCount, dryRunOnly: env.demoDryRun },
    createdAt: now
  });

  await batch.commit();

  return {
    workspaceId: signal.workspaceId,
    signalId: signal.signalId,
    trigger,
    routed: true,
    candidateLimit: FOREX_DEMO_CANDIDATE_LIMIT,
    candidateCount: studentRecords.length,
    readyCount,
    blockedCount,
    confirmationRequiredCount,
    staleExpiredCount,
    intentCount,
    dryRunOnly: env.demoDryRun,
    bounded,
    warnings,
    completedAt: now
  };
}

function normalizeStatus(value: unknown): ForexDemoIntentStatus {
  switch (value) {
    case "ready_for_forex_demo":
    case "submitted_forex_demo":
    case "filled_forex_demo":
    case "partially_filled_forex_demo":
    case "failed_forex_demo":
    case "cancel_requested_forex_demo":
    case "cancelled_forex_demo":
    case "reconcile_required_forex_demo":
    case "skipped_forex_demo":
      return value;
    default:
      return "failed_forex_demo";
  }
}

function mapIntentSummary(record: Record<string, unknown>): ForexDemoIntentSummary {
  return {
    intentId: safeString(record.intentId),
    signalId: safeString(record.signalId),
    studentId: safeString(record.studentId),
    connectionId: safeString(record.connectionId),
    provider: "metaapi",
    environment: "demo",
    pair: safeString(record.pair),
    side: record.side === "sell" ? "sell" : "buy",
    orderType: "market",
    status: normalizeStatus(record.status),
    volume: safeNumber(record.volume),
    simulatedNotional: safeNumber(record.simulatedNotional),
    dryRun: record.dryRun !== false,
    createdAt: safeString(record.createdAt) || new Date().toISOString(),
    updatedAt: safeString(record.updatedAt) || new Date().toISOString()
  };
}

function mapAttemptSummary(record: Record<string, unknown>): ForexDemoOrderAttemptSummary {
  return {
    attemptId: safeString(record.attemptId),
    intentId: safeString(record.intentId),
    signalId: safeString(record.signalId),
    studentId: safeString(record.studentId),
    provider: "metaapi",
    environment: "demo",
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

function mapReconciliationSummary(record: Record<string, unknown>): ForexDemoReconciliationSummary {
  const status: CryptoLiveSandboxReconciliationStatus =
    record.status === "reconciled" ||
    record.status === "requires_review" ||
    record.status === "failed" ||
    record.status === "pending"
      ? record.status
      : "requires_review";

  return {
    reconciliationId: safeString(record.reconciliationId),
    intentId: safeString(record.intentId),
    attemptId: safeString(record.attemptId),
    provider: "metaapi",
    environment: "demo",
    status,
    normalizedOrderStatus: normalizeStatus(record.normalizedOrderStatus),
    safeMessage: safeString(record.safeMessage) || "Forex demo reconciliation record is support-safe.",
    sanitizedFailureCode: safeString(record.sanitizedFailureCode) || undefined,
    checkedAt: safeString(record.checkedAt) || new Date().toISOString(),
    updatedAt: safeString(record.updatedAt) || new Date().toISOString()
  };
}

function mapGateDecisionSummary(record: Record<string, unknown>): ForexDemoGateDecisionSummary {
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

function mapAuditSummary(record: Record<string, unknown>): ForexDemoAuditEventSummary {
  return {
    eventId: safeString(record.eventId),
    action: safeString(record.action) || "forex_demo.audit",
    actorType:
      record.actorType === "student" || record.actorType === "super_admin" || record.actorType === "system"
        ? record.actorType
        : "influencer",
    studentId: safeString(record.studentId) || undefined,
    targetType:
      record.targetType === "intent" ||
      record.targetType === "execution_queue" ||
      record.targetType === "gate_decision" ||
      record.targetType === "demo_attempt" ||
      record.targetType === "reconciliation" ||
      record.targetType === "confirmation" ||
      record.targetType === "control"
        ? record.targetType
        : "signal",
    targetId: safeString(record.targetId),
    safeMessage: safeString(record.safeMessage) || "Forex demo audit event recorded.",
    severity: record.severity === "critical" || record.severity === "warning" ? record.severity : "info",
    createdAt: safeString(record.createdAt) || new Date().toISOString()
  };
}

async function summarizeRouting(workspaceId: string, studentId?: string): Promise<ForexDemoRoutingOverview> {
  const { db } = getFirebaseAdminClients();
  const intentQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_demo_intents`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_demo_intents`);
  const decisionQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_demo_gate_decisions`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_demo_gate_decisions`);
  const confirmationQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/auto_copy_confirmations`).where("market", "==", "forex").where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/auto_copy_confirmations`).where("market", "==", "forex");
  const [intentSnapshot, decisionSnapshot, confirmationSnapshot, boundedAuditSnapshot] = await Promise.all([
    intentQuery.limit(FOREX_DEMO_OVERVIEW_LIMIT).get(),
    decisionQuery.limit(FOREX_DEMO_OVERVIEW_LIMIT).get(),
    confirmationQuery.limit(FOREX_DEMO_OVERVIEW_LIMIT).get(),
    db.collection(`workspaces/${workspaceId}/forex_demo_audit_events`).where("action", "==", "forex_demo.routing.bounded").limit(FOREX_DEMO_OVERVIEW_LIMIT).get()
  ]);
  const intentRecords = intentSnapshot.docs.map((doc) => doc.data());
  const decisionRecords = decisionSnapshot.docs.map((doc) => doc.data());
  const confirmationRecords = confirmationSnapshot.docs.map((doc) => doc.data());
  const updatedAt = latestIso([
    ...intentRecords.map((record) => safeString(record.updatedAt)),
    ...decisionRecords.map((record) => safeString(record.decidedAt)),
    ...confirmationRecords.map((record) => safeString(record.updatedAt))
  ]) ?? new Date().toISOString();

  return {
    recentIntentCount: intentRecords.length,
    readyForDemoCount: intentRecords.filter((record) => record.status === "ready_for_forex_demo").length,
    submittedDemoCount: intentRecords.filter((record) => record.status === "submitted_forex_demo").length,
    filledDemoCount: intentRecords.filter((record) => record.status === "filled_forex_demo").length,
    confirmationRequiredCount: confirmationRecords.filter((record) => record.status === "waiting_for_student_confirmation").length,
    blockedCount: decisionRecords.filter((record) => record.status === "blocked").length,
    boundedRoutingWarningCount: boundedAuditSnapshot.docs.length,
    lastRoutedAt: latestIso(intentRecords.map((record) => safeString(record.updatedAt))),
    updatedAt
  };
}

export async function loadForexDemoExecutionPreview(workspaceId: string, studentId?: string): Promise<ForexDemoExecutionPreview> {
  const { db } = getFirebaseAdminClients();
  const [controls, routing] = await Promise.all([
    loadForexDemoControls(workspaceId),
    summarizeRouting(workspaceId, studentId)
  ]);
  const intentQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_demo_intents`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_demo_intents`);
  const attemptQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_demo_order_attempts`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_demo_order_attempts`);
  const reconciliationQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_demo_reconciliation_records`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_demo_reconciliation_records`);
  const decisionQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_demo_gate_decisions`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_demo_gate_decisions`);
  const auditQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_demo_audit_events`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_demo_audit_events`);
  const [intentSnapshot, attemptSnapshot, reconciliationSnapshot, decisionSnapshot, auditSnapshot] = await Promise.all([
    intentQuery.orderBy("updatedAt", "desc").limit(FOREX_DEMO_READ_LIMIT).get(),
    attemptQuery.orderBy("updatedAt", "desc").limit(FOREX_DEMO_READ_LIMIT).get(),
    reconciliationQuery.orderBy("updatedAt", "desc").limit(FOREX_DEMO_READ_LIMIT).get(),
    decisionQuery.orderBy("decidedAt", "desc").limit(FOREX_DEMO_READ_LIMIT).get(),
    auditQuery.orderBy("createdAt", "desc").limit(FOREX_DEMO_READ_LIMIT).get()
  ]);
  const env = forexDemoEnv();

  return {
    visibleLimit: FOREX_DEMO_VISIBLE_LIMIT,
    routing,
    env,
    platformControl: controls.platformControl,
    workspaceControl: controls.workspaceControl,
    intents: sortByRecent(intentSnapshot.docs.map((doc) => mapIntentSummary({ intentId: doc.id, ...doc.data() })), (record) => record.updatedAt).slice(0, FOREX_DEMO_VISIBLE_LIMIT),
    attempts: sortByRecent(attemptSnapshot.docs.map((doc) => mapAttemptSummary({ attemptId: doc.id, ...doc.data() })), (record) => record.updatedAt).slice(0, FOREX_DEMO_VISIBLE_LIMIT),
    reconciliations: sortByRecent(reconciliationSnapshot.docs.map((doc) => mapReconciliationSummary({ reconciliationId: doc.id, ...doc.data() })), (record) => record.updatedAt).slice(0, FOREX_DEMO_VISIBLE_LIMIT),
    gateDecisions: sortByRecent(decisionSnapshot.docs.map((doc) => mapGateDecisionSummary({ decisionId: doc.id, ...doc.data() })), (record) => record.decidedAt).slice(0, FOREX_DEMO_VISIBLE_LIMIT),
    auditEvents: sortByRecent(auditSnapshot.docs.map((doc) => mapAuditSummary({ eventId: doc.id, ...doc.data() })), (record) => record.createdAt).slice(0, FOREX_DEMO_VISIBLE_LIMIT),
    bounded: {
      intents: intentSnapshot.docs.length > FOREX_DEMO_VISIBLE_LIMIT,
      attempts: attemptSnapshot.docs.length > FOREX_DEMO_VISIBLE_LIMIT,
      reconciliations: reconciliationSnapshot.docs.length > FOREX_DEMO_VISIBLE_LIMIT,
      gateDecisions: decisionSnapshot.docs.length > FOREX_DEMO_VISIBLE_LIMIT,
      auditEvents: auditSnapshot.docs.length > FOREX_DEMO_VISIBLE_LIMIT
    },
    warnings: [
      "Forex demo execution is MetaAPI demo-only and remains server-gated. Production/live broker execution is not enabled.",
      ...(env.demoDryRun ? ["Forex demo dry-run is on; no MetaAPI trade call will be made."] : []),
      ...(!env.demoOrderCallsEnabled ? ["MetaAPI demo order calls are disabled by server environment."] : [])
    ]
  };
}

function buildAttempt(intent: ForexDemoExecutionIntentRecord, now: string, status: ForexDemoIntentStatus, message?: string): ForexDemoOrderAttemptRecord {
  return stripUndefined({
    attemptId: deterministicId(["forex_demo_attempt", intent.intentId], 150),
    workspaceId: intent.workspaceId,
    intentId: intent.intentId,
    signalId: intent.signalId,
    studentId: intent.studentId,
    connectionId: intent.connectionId,
    provider: "metaapi",
    environment: "demo",
    executionMode: "forex_demo",
    pair: intent.pair,
    side: intent.side,
    orderType: "market",
    status,
    volume: intent.volume,
    entryPrice: intent.entryPrice,
    stopLoss: intent.stopLoss,
    takeProfit: intent.takeProfit,
    requestedNotionalUsd: intent.simulatedNotional,
    idempotencyKey: `forex-demo-attempt:${intent.workspaceId}:${intent.intentId}`.toLowerCase(),
    providerClientOrderId: intent.providerClientOrderId,
    providerOrderRef: intent.dryRun ? `dry-${intent.providerClientOrderId.slice(-8)}` : undefined,
    dryRun: intent.dryRun,
    sanitizedFailureReason: message,
    submittedAt: now,
    updatedAt: now
  }) satisfies ForexDemoOrderAttemptRecord;
}

export async function runForexDemoExecutionWorker(actor: VerifiedSuperAdmin, payload: unknown): Promise<ForexDemoWorkerRunResponse> {
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
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before running the forex demo worker.");
  }

  if (confirmation !== "RUN_FOREX_DEMO") {
    throw new AdminApiError(400, "forex_demo_confirmation_required", "Type RUN_FOREX_DEMO before running the forex demo worker.");
  }

  const env = forexDemoEnv();
  const controls = await loadForexDemoControls(workspaceId);
  const now = new Date().toISOString();
  const warnings: string[] = [];
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/forex_demo_intents`)
    .where("status", "==", "ready_for_forex_demo")
    .orderBy("updatedAt", "asc")
    .limit(FOREX_DEMO_WORKER_DEFAULT_LIMIT + 1)
    .get();
  const candidateDocs = snapshot.docs.slice(0, FOREX_DEMO_WORKER_DEFAULT_LIMIT);
  const bounded = snapshot.docs.length > FOREX_DEMO_WORKER_DEFAULT_LIMIT;
  let processedCount = 0;
  let dryRunCount = 0;
  let submittedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  if (!env.demoEnabled || !controls.platformControl.demoEnabled || !controls.workspaceControl.demoEnabled) {
    warnings.push("Forex demo worker is blocked because env, platform, or workspace demo controls are disabled.");
    return {
      ...createSourceMeta(warnings),
      ok: true,
      workspaceId,
      demoOrdersEnabled: false,
      demoDryRun: true,
      candidateLimit: FOREX_DEMO_WORKER_DEFAULT_LIMIT,
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
    const intent = doc.data() as ForexDemoExecutionIntentRecord;
    const attemptId = deterministicId(["forex_demo_attempt", intent.intentId], 150);
    const attemptRef = db.doc(`workspaces/${workspaceId}/forex_demo_order_attempts/${attemptId}`);
    const existingAttempt = await attemptRef.get();
    const batch = db.batch();

    processedCount += 1;

    if (
      intent.executionMode !== "forex_demo" ||
      intent.environment !== "demo" ||
      intent.demoOnly !== true ||
      intent.status !== "ready_for_forex_demo"
    ) {
      skippedCount += 1;
      batch.set(doc.ref, { status: "skipped_forex_demo", updatedAt: now }, { merge: true });
      queueAuditEvent(db, batch, {
        action: "forex_demo.worker.skipped",
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        targetType: "intent",
        targetId: intent.intentId,
        safeMessage: "Forex demo worker skipped a malformed or non-demo intent.",
        severity: "warning",
        createdAt: now
      });
      await batch.commit();
      continue;
    }

    if (existingAttempt.exists) {
      skippedCount += 1;
      queueAuditEvent(db, batch, {
        action: "forex_demo.worker.idempotent_skip",
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        targetType: "demo_attempt",
        targetId: attemptId,
        safeMessage: "Forex demo worker found an existing attempt and did not duplicate it.",
        severity: "info",
        createdAt: now
      });
      await batch.commit();
      continue;
    }

    const orderCallsEnabled = env.demoOrderCallsEnabled &&
      controls.platformControl.demoOrderCallsEnabled &&
      controls.workspaceControl.demoOrderCallsEnabled &&
      !env.demoDryRun &&
      !controls.platformControl.dryRun &&
      !controls.workspaceControl.dryRun;
    const prerequisites = await loadForexDemoWorkerPrerequisites(workspaceId, intent);

    if (!prerequisites.ok) {
      const attempt = buildAttempt(intent, now, "failed_forex_demo", prerequisites.safeMessage);
      batch.set(attemptRef, attempt, { merge: true });
      batch.set(doc.ref, { status: "failed_forex_demo", updatedAt: now }, { merge: true });
      queueAuditEvent(db, batch, {
        action: "forex_demo.worker.failed",
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        targetType: "demo_attempt",
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

    if (!orderCallsEnabled) {
      const attempt = buildAttempt(intent, now, "submitted_forex_demo", "Forex demo dry-run recorded; no MetaAPI broker call was made.");
      batch.set(attemptRef, attempt, { merge: true });
      batch.set(doc.ref, { status: "submitted_forex_demo", updatedAt: now }, { merge: true });
      queueAuditEvent(db, batch, {
        action: "forex_demo.worker.dry_run",
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        targetType: "demo_attempt",
        targetId: attemptId,
        safeMessage: "Forex demo worker recorded a dry-run attempt. MetaAPI order calls remain disabled.",
        severity: "info",
        after: { pair: intent.pair, dryRun: true },
        createdAt: now
      });
      await batch.commit();
      dryRunCount += 1;
      continue;
    }

    try {
      const token = await loadForexMetaApiToken({
        workspaceId,
        studentId: intent.studentId,
        connectionId: intent.connectionId
      });
      if (token.environment !== "demo") {
        throw new AdminApiError(403, "forex_demo_token_environment_invalid", "Forex demo worker only accepts demo MetaAPI tokens.");
      }

      const adapter = getForexDemoOrderPlacementAdapter(intent.provider);
      const result = await adapter.submitOrder({
        provider: "metaapi",
        environment: "demo",
        metaApiToken: token.metaApiToken,
        metaApiAccountId: token.metaApiAccountId,
        symbol: intent.pair,
        side: intent.side,
        volume: intent.volume,
        stopLoss: intent.stopLoss,
        takeProfit: intent.takeProfit,
        clientOrderId: intent.providerClientOrderId
      });
      const status: ForexDemoIntentStatus =
        result.ok && result.status === "filled"
          ? "filled_forex_demo"
          : result.ok && result.status === "partially_filled"
            ? "partially_filled_forex_demo"
            : result.ok
              ? "submitted_forex_demo"
              : "failed_forex_demo";
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
        completedAt: status === "filled_forex_demo" ? now : undefined
      } satisfies ForexDemoOrderAttemptRecord;

      batch.set(attemptRef, stripUndefined(attempt), { merge: true });
      batch.set(doc.ref, { status, updatedAt: now }, { merge: true });
      queueAuditEvent(db, batch, {
        action: result.ok ? "forex_demo.worker.submitted" : "forex_demo.worker.failed",
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        targetType: "demo_attempt",
        targetId: attemptId,
        safeMessage: result.safeMessage,
        severity: result.ok ? "info" : "warning",
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
        : "Forex demo worker failed safely before MetaAPI order submission.";
      batch.set(attemptRef, buildAttempt(intent, now, "failed_forex_demo", safeMessage), { merge: true });
      batch.set(doc.ref, { status: "failed_forex_demo", updatedAt: now }, { merge: true });
      queueAuditEvent(db, batch, {
        action: "forex_demo.worker.failed",
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        targetType: "demo_attempt",
        targetId: attemptId,
        safeMessage,
        severity: "warning",
        createdAt: now
      });
      await batch.commit();
      failedCount += 1;
    }
  }

  if (bounded) {
    warnings.push(`Forex demo worker reached the bounded limit of ${FOREX_DEMO_WORKER_DEFAULT_LIMIT} record.`);
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId,
    demoOrdersEnabled: env.demoOrderCallsEnabled,
    demoDryRun: env.demoDryRun,
    candidateLimit: FOREX_DEMO_WORKER_MAX_LIMIT,
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

export async function runForexDemoReconciliation(actor: VerifiedSuperAdmin, payload: unknown): Promise<ForexDemoReconciliationRunResponse> {
  const workspaceId = sanitizeWorkspaceId(
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).workspaceId
      : undefined
  );

  if (!actor.uid) {
    throw new AdminApiError(403, "super_admin_required", "This endpoint requires Super Admin access.");
  }

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before reconciling forex demo attempts.");
  }

  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/forex_demo_order_attempts`)
    .where("status", "in", ["submitted_forex_demo", "reconcile_required_forex_demo"])
    .orderBy("updatedAt", "asc")
    .limit(FOREX_DEMO_WORKER_DEFAULT_LIMIT + 1)
    .get();
  const candidateDocs = snapshot.docs.slice(0, FOREX_DEMO_WORKER_DEFAULT_LIMIT);
  let reconciledCount = 0;
  let requiresReviewCount = 0;
  const failedCount = 0;

  for (const doc of candidateDocs) {
    const attempt = doc.data() as ForexDemoOrderAttemptRecord;
    const status: ForexDemoIntentStatus = attempt.dryRun ? "filled_forex_demo" : "reconcile_required_forex_demo";
    const reconciliation: ForexDemoReconciliationRecord = stripUndefined({
      reconciliationId: deterministicId(["forex_demo_reconcile", attempt.attemptId], 150),
      workspaceId,
      intentId: attempt.intentId,
      attemptId: attempt.attemptId,
      provider: "metaapi",
      environment: "demo",
      status: attempt.dryRun ? "reconciled" : "requires_review",
      normalizedOrderStatus: status,
      safeMessage: attempt.dryRun
        ? "Forex demo dry-run attempt reconciled without a MetaAPI broker call."
        : "Forex demo provider status lookup is bounded and requires operator review.",
      sanitizedFailureCode: attempt.dryRun ? undefined : "metaapi_demo_status_lookup_deferred",
      checkedAt: now,
      updatedAt: now
    });
    const batch = db.batch();

    batch.set(db.doc(`workspaces/${workspaceId}/forex_demo_reconciliation_records/${reconciliation.reconciliationId}`), reconciliation, { merge: true });
    batch.set(doc.ref, { status, completedAt: status === "filled_forex_demo" ? now : undefined, updatedAt: now }, { merge: true });
    batch.set(db.doc(`workspaces/${workspaceId}/forex_demo_intents/${attempt.intentId}`), { status, updatedAt: now }, { merge: true });
    queueAuditEvent(db, batch, {
      action: "forex_demo.reconcile.checked",
      actorType: "super_admin",
      actorId: actor.uid,
      workspaceId,
      studentId: attempt.studentId,
      targetType: "reconciliation",
      targetId: reconciliation.reconciliationId,
      safeMessage: reconciliation.safeMessage,
      severity: attempt.dryRun ? "info" : "warning",
      createdAt: now
    });
    await batch.commit();

    if (attempt.dryRun) {
      reconciledCount += 1;
    } else {
      requiresReviewCount += 1;
    }
  }

  return {
    ...createSourceMeta([]),
    ok: true,
    workspaceId,
    candidateLimit: FOREX_DEMO_WORKER_DEFAULT_LIMIT,
    candidateCount: candidateDocs.length,
    reconciledCount,
    requiresReviewCount,
    failedCount,
    bounded: snapshot.docs.length > FOREX_DEMO_WORKER_DEFAULT_LIMIT,
    warnings: snapshot.docs.length > FOREX_DEMO_WORKER_DEFAULT_LIMIT ? ["Forex demo reconciliation reached the bounded limit."] : [],
    updatedAt: now
  };
}

export async function cancelForexDemoOrder(actor: VerifiedSuperAdmin, attemptIdValue: unknown, payload: unknown): Promise<ForexDemoCancelResponse> {
  const workspaceId = sanitizeWorkspaceId(
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).workspaceId
      : undefined
  );
  const confirmation = typeof payload === "object" && payload !== null && !Array.isArray(payload)
    ? safeString((payload as Record<string, unknown>).confirmation)
    : "";
  const attemptId = safeString(attemptIdValue).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 150);

  if (!actor.uid) {
    throw new AdminApiError(403, "super_admin_required", "This endpoint requires Super Admin access.");
  }

  if (!workspaceId || !attemptId) {
    throw new AdminApiError(400, "forex_demo_cancel_target_required", "Choose a workspace and forex demo attempt before cancellation.");
  }

  if (confirmation !== "CANCEL_FOREX_DEMO") {
    throw new AdminApiError(400, "forex_demo_cancel_confirmation_required", "Type CANCEL_FOREX_DEMO before cancelling a forex demo order.");
  }

  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const attemptRef = db.doc(`workspaces/${workspaceId}/forex_demo_order_attempts/${attemptId}`);
  const snapshot = await attemptRef.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "forex_demo_attempt_not_found", "That forex demo attempt was not found.");
  }

  const attempt = snapshot.data() as ForexDemoOrderAttemptRecord;
  const status: ForexDemoIntentStatus = "cancelled_forex_demo";
  const batch = db.batch();

  batch.set(attemptRef, { status, updatedAt: now }, { merge: true });
  batch.set(db.doc(`workspaces/${workspaceId}/forex_demo_intents/${attempt.intentId}`), { status, updatedAt: now }, { merge: true });
  queueAuditEvent(db, batch, {
    action: "forex_demo.cancelled",
    actorType: "super_admin",
    actorId: actor.uid,
    workspaceId,
    studentId: attempt.studentId,
    targetType: "demo_attempt",
    targetId: attemptId,
    safeMessage: "Forex demo attempt was cancelled by Super Admin. This path is demo-only.",
    severity: "warning",
    createdAt: now
  });
  await batch.commit();

  return {
    ...createSourceMeta([]),
    ok: true,
    workspaceId,
    attemptId,
    status,
    safeMessage: "Forex demo attempt cancelled.",
    updatedAt: now
  };
}
