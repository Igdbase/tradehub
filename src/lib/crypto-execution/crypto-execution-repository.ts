import { mapSubscriptionRecord } from "@/lib/billing/billing-mappers";
import {
  loadStudentAutoCopyPreferences,
  summarizeAutoCopyPreferencePosture,
  validateAutoCopyPreferencesPayload
} from "@/lib/crypto-execution/auto-copy-preferences";
import {
  buildBroadLiveAutoCopyReadinessOverview,
  buildStudentBroadLiveAutoCopyStatus
} from "@/lib/crypto-execution/broad-live-autocopy-readiness";
import {
  loadExchangeCredential,
  revokeExchangeCredential,
  storeExchangeCredential
} from "@/lib/crypto-execution/credential-vault";
import { loadLiveProductionExecutionPreview } from "@/lib/crypto-execution/crypto-live-production";
import { loadLiveSandboxExecutionPreview } from "@/lib/crypto-execution/crypto-live-sandbox";
import { loadTradeCopierSubscriptionPreview } from "@/lib/student-copier/student-copier-billing";
import { loadForexDemoExecutionPreview } from "@/lib/crypto-execution/forex-demo-execution";
import { loadForexLiveCanaryExecutionPreview } from "@/lib/crypto-execution/forex-live-canary-execution";
import { loadForexPaperExecutionPreview } from "@/lib/crypto-execution/forex-paper-execution";
import {
  emptyForexConnectionReadinessPreview,
  loadForexConnectionReadinessPreview
} from "@/lib/crypto-execution/forex-connection-repository";
import {
  emptyForexProvisioningPreview,
  loadForexProvisioningPreview
} from "@/lib/crypto-execution/forex-provisioning-repository";
import {
  loadAdminAccountLinkedLedgerDiagnostics,
  loadWorkspaceAccountLinkedPerformanceSummary
} from "@/lib/journal/account-linked-performance-ledger";
import { getExchangePermissionAdapter } from "@/lib/crypto-execution/exchanges";
import {
  mapExchangeConnectionRecord,
  mapPlatformExecutionControlRecord,
  mapStudentExecutionPreferencesRecord,
  mapWorkspaceExecutionControlRecord,
  recordFromSnapshot,
  toExchangeConnectionSummary
} from "@/lib/crypto-execution/crypto-execution-mappers";
import {
  buildExecutionIntentId,
  buildOrderAttemptIdempotencyKey,
  resolveCryptoExecutionReadiness,
  validateExchangeConnectionId,
  validateExchangeConnectionPayload,
  validateStudentExecutionPreferencesPayload
} from "@/lib/crypto-execution/crypto-execution-validation";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import {
  mapStudentProfile,
  mapWorkspaceForStudent,
  recordFromSnapshot as studentRecordFromSnapshot
} from "@/lib/student-app/student-app-mappers";
import {
  mapDashboardSummaryRecord,
  mapWorkspaceForDashboard,
  recordFromSnapshot as workspaceRecordFromSnapshot
} from "@/lib/workspace/dashboard-mappers";
import { isSupportedCryptoSpotSymbol } from "@/lib/workspace/signal-symbols";
import type {
  AdminCryptoExecutionOverviewResponse,
  CryptoExecutionAuditEventSummary,
  CryptoExecutionIntentSummary,
  CryptoOrderAttemptSummary,
  CryptoPaperExecutionPreview,
  CryptoPaperRoutingOverview,
  ForexConnectionReadinessPreview,
  ForexDemoExecutionPreview,
  ForexLiveCanaryExecutionPreview,
  ForexProvisioningPreview,
  ForexPaperExecutionPreview,
  CryptoExecutionReadiness,
  CryptoExchangeEnvironment,
  CryptoExchangeId,
  CryptoAutoCopySubscriptionPreview,
  ExecutionAuditAction,
  ExecutionAuditEventRecord,
  ExecutionIntentStatus,
  ExchangeConnectionStatus,
  ExchangeConnectionSummary,
  ExecutionReadinessState,
  OrderAttemptStatus,
  PlatformExecutionControlRecord,
  RiskDecisionStatus,
  CryptoRiskCheckKey,
  CryptoRiskDecisionSummary,
  LiveProductionConsentRecord,
  StudentCryptoExecutionOverviewResponse,
  StudentExecutionPreferencesRecord,
  CrossAssetAutoCopyPreferencesRecord,
  WorkspaceCryptoExecutionOverviewResponse,
  WorkspaceExecutionControlRecord
} from "@/types/crypto-execution";
import type { StudentEntitlementSummary } from "@/types/entitlements";
import type { StudentSubscription } from "@/types/payments";
import type { StudentAppProfile } from "@/types/student-app";
import type { Workspace } from "@/types/workspace";
import type { WorkspaceDashboardSummary } from "@/types/workspace-dashboard";

const STUDENT_CONNECTION_LIMIT = 10;
const PAPER_ROUTING_OVERVIEW_LIMIT = 50;
const PAPER_EXECUTION_VISIBLE_LIMIT = 4;
const PAPER_EXECUTION_READ_LIMIT = PAPER_EXECUTION_VISIBLE_LIMIT + 1;
const WORKSPACE_EXECUTION_STUDENT_SAMPLE_LIMIT = 50;

type StudentExecutionBase = {
  workspace: Workspace;
  student: StudentAppProfile;
  subscription: StudentSubscription | null;
  entitlements: StudentEntitlementSummary;
  preferences: StudentExecutionPreferencesRecord;
  autoCopyPreferences: {
    crypto: CrossAssetAutoCopyPreferencesRecord;
    forex: CrossAssetAutoCopyPreferencesRecord;
  };
  cryptoAutoCopy: CryptoAutoCopySubscriptionPreview;
  connections: ExchangeConnectionSummary[];
  workspaceControl: WorkspaceExecutionControlRecord;
  platformControl: PlatformExecutionControlRecord;
  readiness: CryptoExecutionReadiness;
  warnings: string[];
};

function createSourceMeta(warnings: string[] = []) {
  return {
    source: "firestore" as const,
    sourceLabel: "Firestore live",
    sourceMessage: "Crypto execution data was loaded through server-side Firebase Admin SDK routes.",
    warnings
  };
}

function zeroConnectionCounts(): Record<ExchangeConnectionStatus, number> {
  return {
    not_connected: 0,
    pending_verification: 0,
    verified: 0,
    rejected: 0,
    disabled: 0,
    error: 0
  };
}

function zeroReadinessCounts(): Record<ExecutionReadinessState, number> {
  return {
    blocked_by_entitlement: 0,
    needs_crypto_autocopy_payment: 0,
    alerts_only: 0,
    needs_personal_account_confirmation: 0,
    needs_connection: 0,
    needs_permission_verification: 0,
    paused_by_student: 0,
    paused_by_workspace: 0,
    paused_by_platform: 0,
    paper_ready: 0,
    live_ready: 0
  };
}

function emptyPaperRoutingOverview(updatedAt = new Date().toISOString()): CryptoPaperRoutingOverview {
  return {
    recentIntentCount: 0,
    readyForPaperCount: 0,
    riskBlockedCount: 0,
    boundedRoutingWarningCount: 0,
    updatedAt
  };
}

function emptyPaperExecutionPreview(): CryptoPaperExecutionPreview {
  return {
    visibleLimit: PAPER_EXECUTION_VISIBLE_LIMIT,
    intents: [],
    orderAttempts: [],
    riskDecisions: [],
    auditEvents: [],
    bounded: {
      intents: false,
      orderAttempts: false,
      riskDecisions: false,
      auditEvents: false
    },
    warnings: []
  };
}

function emptyForexPaperExecutionPreview(updatedAt = new Date().toISOString()): ForexPaperExecutionPreview {
  return {
    visibleLimit: PAPER_EXECUTION_VISIBLE_LIMIT,
    routing: {
      recentIntentCount: 0,
      readyForPaperCount: 0,
      completedPaperCount: 0,
      confirmationRequiredCount: 0,
      riskBlockedCount: 0,
      boundedRoutingWarningCount: 0,
      updatedAt
    },
    intents: [],
    attempts: [],
    riskDecisions: [],
    confirmations: [],
    auditEvents: [],
    bounded: {
      intents: false,
      attempts: false,
      riskDecisions: false,
      confirmations: false,
      auditEvents: false
    },
    warnings: ["Select a workspace to load forex paper simulation records."]
  };
}

function emptyForexConnectionPreview(updatedAt = new Date().toISOString()): ForexConnectionReadinessPreview {
  return emptyForexConnectionReadinessPreview(updatedAt);
}

function emptyForexProvisioningExecutionPreview(updatedAt = new Date().toISOString()): ForexProvisioningPreview {
  return emptyForexProvisioningPreview(updatedAt);
}

function emptyForexDemoExecutionPreview(updatedAt = new Date().toISOString()): ForexDemoExecutionPreview {
  return {
    visibleLimit: PAPER_EXECUTION_VISIBLE_LIMIT,
    routing: {
      recentIntentCount: 0,
      readyForDemoCount: 0,
      submittedDemoCount: 0,
      filledDemoCount: 0,
      confirmationRequiredCount: 0,
      blockedCount: 0,
      boundedRoutingWarningCount: 0,
      updatedAt
    },
    env: {
      demoEnabled: false,
      demoOrderCallsEnabled: false,
      demoDryRun: true,
      maxNotionalUsd: 5
    },
    intents: [],
    attempts: [],
    reconciliations: [],
    gateDecisions: [],
    auditEvents: [],
    bounded: {
      intents: false,
      attempts: false,
      reconciliations: false,
      gateDecisions: false,
      auditEvents: false
    },
    warnings: ["Select a workspace to load forex demo execution records."]
  };
}

function emptyForexLiveCanaryExecutionPreview(updatedAt = new Date().toISOString()): ForexLiveCanaryExecutionPreview {
  return {
    visibleLimit: PAPER_EXECUTION_VISIBLE_LIMIT,
    routing: {
      recentIntentCount: 0,
      readyCount: 0,
      dryRunCount: 0,
      submittedCount: 0,
      filledCount: 0,
      blockedCount: 0,
      boundedRoutingWarningCount: 0,
      updatedAt
    },
    env: {
      liveCanaryEnabled: false,
      liveOrderCallsEnabled: false,
      liveDryRun: true,
      maxNotionalUsd: 5,
      maxDailyNotionalUsd: 5,
      maxVolume: 0.01
    },
    intents: [],
    attempts: [],
    gateDecisions: [],
    auditEvents: [],
    bounded: {
      intents: false,
      attempts: false,
      gateDecisions: false,
      auditEvents: false
    },
    warnings: ["Select a workspace to load tiny live Forex canary records."]
  };
}

function safeRecordString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function safeRecordBoolean(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "boolean" ? value : false;
}

function sanitizeWorkspaceId(value: unknown) {
  return safeRecordString({ value }, "value").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function latestIso(values: string[]) {
  return values
    .filter((value) => value && Number.isFinite(Date.parse(value)))
    .sort((left, right) => right.localeCompare(left))[0];
}

function sortByRecent<T>(records: T[], getDate: (record: T) => string) {
  return [...records].sort((left, right) => getDate(right).localeCompare(getDate(left)));
}

function normalizeIntentStatus(value: unknown): ExecutionIntentStatus {
  switch (value) {
    case "risk_blocked":
    case "ready_for_paper":
    case "queued_paper":
    case "completed_paper":
    case "cancelled":
    case "expired":
      return value;
    default:
      return "created";
  }
}

function normalizeOrderAttemptStatus(value: unknown): OrderAttemptStatus {
  switch (value) {
    case "queued":
    case "sent":
    case "acknowledged":
    case "partially_filled":
    case "filled":
    case "failed":
    case "timed_out":
    case "cancelled":
    case "reconciled":
      return value;
    default:
      return "not_started";
  }
}

function normalizeRiskDecisionStatus(value: unknown): RiskDecisionStatus {
  switch (value) {
    case "allowed":
    case "blocked":
    case "requires_review":
      return value;
    default:
      return "requires_review";
  }
}

function normalizeAuditAction(value: unknown): ExecutionAuditAction {
  const allowed: ExecutionAuditAction[] = [
    "routing.started",
    "routing.completed",
    "routing.bounded",
    "connection.verification_attempted",
    "connection.created",
    "connection.verified",
    "connection.rejected",
    "connection.refresh_attempted",
    "connection.refresh_failed",
    "connection.disabled",
    "preference.updated",
    "preference.paused",
    "preference.resumed",
    "intent.created",
    "intent.blocked",
    "risk.allowed",
    "risk.blocked",
    "order.planned",
    "order.skipped",
    "order.queued",
    "order.sent",
    "order.failed",
    "order.retried",
    "order.reconciled",
    "kill_switch.enabled",
    "kill_switch.disabled"
  ];

  return allowed.includes(value as ExecutionAuditAction)
    ? value as ExecutionAuditAction
    : "routing.completed";
}

function normalizeAuditTargetType(value: unknown): ExecutionAuditEventRecord["targetType"] {
  switch (value) {
    case "signal":
    case "connection":
    case "preference":
    case "intent":
    case "risk_decision":
    case "order_attempt":
    case "workspace_control":
    case "platform_control":
      return value;
    default:
      return "intent";
  }
}

function mapIntentSummary(record: Record<string, unknown>): CryptoExecutionIntentSummary {
  const createdAt = safeRecordString(record, "createdAt") || new Date().toISOString();

  return {
    intentId: safeRecordString(record, "intentId"),
    signalId: safeRecordString(record, "signalId"),
    studentId: safeRecordString(record, "studentId"),
    connectionId: safeRecordString(record, "connectionId"),
    exchange: record.exchange === "bybit" ? "bybit" : "binance",
    symbol: safeRecordString(record, "symbol"),
    side: record.side === "sell" ? "sell" : "buy",
    orderType: record.orderType === "market" ? "market" : "limit",
    status: normalizeIntentStatus(record.status),
    paperTradingOnly: record.paperTradingOnly !== false,
    riskDecisionId: safeRecordString(record, "riskDecisionId") || undefined,
    createdAt,
    updatedAt: safeRecordString(record, "updatedAt") || createdAt,
    expiresAt: safeRecordString(record, "expiresAt") || undefined
  };
}

function mapOrderAttemptSummary(record: Record<string, unknown>): CryptoOrderAttemptSummary {
  const updatedAt = safeRecordString(record, "updatedAt") || new Date().toISOString();

  return {
    orderAttemptId: safeRecordString(record, "orderAttemptId"),
    intentId: safeRecordString(record, "intentId"),
    signalId: safeRecordString(record, "signalId"),
    studentId: safeRecordString(record, "studentId"),
    connectionId: safeRecordString(record, "connectionId"),
    exchange: record.exchange === "bybit" ? "bybit" : "binance",
    executionMode: record.executionMode === "live" ? "live" : "paper",
    symbol: safeRecordString(record, "symbol"),
    side: record.side === "sell" ? "sell" : "buy",
    orderType: record.orderType === "market" ? "market" : "limit",
    status: normalizeOrderAttemptStatus(record.status),
    sanitizedFailureCode: safeRecordString(record, "sanitizedFailureCode") || undefined,
    sanitizedFailureReason: safeRecordString(record, "sanitizedFailureReason") || undefined,
    requestedAt: safeRecordString(record, "requestedAt") || undefined,
    completedAt: safeRecordString(record, "completedAt") || undefined,
    updatedAt
  };
}

function mapRiskDecisionSummary(record: Record<string, unknown>): CryptoRiskDecisionSummary {
  const rawChecks = Array.isArray(record.checks) ? record.checks : [];
  const failedCheckKeys = rawChecks
    .filter((check): check is Record<string, unknown> => typeof check === "object" && check !== null)
    .filter((check) => check.status !== "allowed")
    .map((check) => safeRecordString(check, "key"))
    .filter((key): key is CryptoRiskCheckKey => Boolean(key));

  return {
    decisionId: safeRecordString(record, "decisionId"),
    intentId: safeRecordString(record, "intentId"),
    signalId: safeRecordString(record, "signalId"),
    studentId: safeRecordString(record, "studentId"),
    connectionId: safeRecordString(record, "connectionId"),
    status: normalizeRiskDecisionStatus(record.status),
    blockedReason: safeRecordString(record, "blockedReason") || undefined,
    checkCount: rawChecks.length,
    failedCheckKeys,
    decidedAt: safeRecordString(record, "decidedAt") || new Date().toISOString()
  };
}

function mapAuditEventSummary(record: Record<string, unknown>): CryptoExecutionAuditEventSummary {
  return {
    eventId: safeRecordString(record, "eventId"),
    action: normalizeAuditAction(record.action),
    actorType: record.actorType === "student" ||
      record.actorType === "influencer" ||
      record.actorType === "super_admin"
      ? record.actorType
      : "system",
    studentId: safeRecordString(record, "studentId") || undefined,
    targetType: normalizeAuditTargetType(record.targetType),
    targetId: safeRecordString(record, "targetId"),
    safeMessage: safeRecordString(record, "safeMessage") || "Execution event recorded.",
    severity: record.severity === "critical" || record.severity === "warning" ? record.severity : "info",
    createdAt: safeRecordString(record, "createdAt") || new Date().toISOString()
  };
}

async function loadPaperExecutionPreview({
  workspaceId,
  studentId
}: {
  workspaceId: string;
  studentId?: string;
}): Promise<CryptoPaperExecutionPreview> {
  const { db } = getFirebaseAdminClients();
  const intentQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/execution_intents`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/execution_intents`);
  const attemptQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/order_attempts`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/order_attempts`);
  const riskQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/risk_decisions`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/risk_decisions`);
  const auditQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/execution_audit_events`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/execution_audit_events`);
  const [intentSnapshot, attemptSnapshot, riskSnapshot, auditSnapshot] = await Promise.all([
    intentQuery.orderBy("updatedAt", "desc").limit(PAPER_EXECUTION_READ_LIMIT).get(),
    attemptQuery.orderBy("updatedAt", "desc").limit(PAPER_EXECUTION_READ_LIMIT).get(),
    riskQuery.orderBy("decidedAt", "desc").limit(PAPER_EXECUTION_READ_LIMIT).get(),
    auditQuery.orderBy("createdAt", "desc").limit(PAPER_EXECUTION_READ_LIMIT).get()
  ]);
  const rawIntents = sortByRecent(
    intentSnapshot.docs.map((doc) => mapIntentSummary(recordFromSnapshot(doc, "intentId"))),
    (record) => record.updatedAt
  );
  const rawOrderAttempts = sortByRecent(
    attemptSnapshot.docs.map((doc) => mapOrderAttemptSummary(recordFromSnapshot(doc, "orderAttemptId"))),
    (record) => record.updatedAt
  );
  const intents = rawIntents.filter((record) => isSupportedCryptoSpotSymbol(record.symbol));
  const orderAttempts = rawOrderAttempts.filter((record) => isSupportedCryptoSpotSymbol(record.symbol));
  const riskDecisions = sortByRecent(
    riskSnapshot.docs.map((doc) => mapRiskDecisionSummary(recordFromSnapshot(doc, "decisionId"))),
    (record) => record.decidedAt
  );
  const auditEvents = sortByRecent(
    auditSnapshot.docs.map((doc) => mapAuditEventSummary(recordFromSnapshot(doc, "eventId"))),
    (record) => record.createdAt
  );

  return {
    visibleLimit: PAPER_EXECUTION_VISIBLE_LIMIT,
    intents: intents.slice(0, PAPER_EXECUTION_VISIBLE_LIMIT),
    orderAttempts: orderAttempts.slice(0, PAPER_EXECUTION_VISIBLE_LIMIT),
    riskDecisions: riskDecisions.slice(0, PAPER_EXECUTION_VISIBLE_LIMIT),
    auditEvents: auditEvents.slice(0, PAPER_EXECUTION_VISIBLE_LIMIT),
    bounded: {
      intents: intentSnapshot.docs.length > PAPER_EXECUTION_VISIBLE_LIMIT,
      orderAttempts: attemptSnapshot.docs.length > PAPER_EXECUTION_VISIBLE_LIMIT,
      riskDecisions: riskSnapshot.docs.length > PAPER_EXECUTION_VISIBLE_LIMIT,
      auditEvents: auditSnapshot.docs.length > PAPER_EXECUTION_VISIBLE_LIMIT
    },
    warnings: [
      ...(intentSnapshot.docs.length > PAPER_EXECUTION_VISIBLE_LIMIT
        ? ["Paper intent preview is bounded to the four most recent loaded records."]
        : []),
      ...(attemptSnapshot.docs.length > PAPER_EXECUTION_VISIBLE_LIMIT
        ? ["Paper order attempt preview is bounded to the four most recent loaded records."]
        : []),
      ...(riskSnapshot.docs.length > PAPER_EXECUTION_VISIBLE_LIMIT
        ? ["Risk decision preview is bounded to the four most recent loaded records."]
        : []),
      ...(auditSnapshot.docs.length > PAPER_EXECUTION_VISIBLE_LIMIT
        ? ["Execution audit preview is bounded to the four most recent loaded records."]
        : []),
      ...(rawIntents.length !== intents.length || rawOrderAttempts.length !== orderAttempts.length
        ? ["One or more invalid-market crypto execution rows were hidden from this preview and should be repaired through a support-safe audit path."]
        : [])
    ]
  };
}

async function summarizePaperRoutingForStudent(
  workspaceId: string,
  studentId: string
): Promise<CryptoPaperRoutingOverview> {
  const { db } = getFirebaseAdminClients();
  const [intentSnapshot, decisionSnapshot] = await Promise.all([
    db
      .collection(`workspaces/${workspaceId}/execution_intents`)
      .where("studentId", "==", studentId)
      .limit(PAPER_ROUTING_OVERVIEW_LIMIT)
      .get(),
    db
      .collection(`workspaces/${workspaceId}/risk_decisions`)
      .where("studentId", "==", studentId)
      .limit(PAPER_ROUTING_OVERVIEW_LIMIT)
      .get()
  ]);
  const intentRecords = intentSnapshot.docs.map((doc) => doc.data());
  const decisionRecords = decisionSnapshot.docs.map((doc) => doc.data());
  const updatedAt = latestIso([
    ...intentRecords.map((record) => safeRecordString(record, "updatedAt")),
    ...decisionRecords.map((record) => safeRecordString(record, "decidedAt"))
  ]) ?? new Date().toISOString();

  return {
    recentIntentCount: intentRecords.length,
    readyForPaperCount: intentRecords.filter((record) => record.status === "ready_for_paper").length,
    riskBlockedCount: decisionRecords.filter((record) => record.status === "blocked").length,
    boundedRoutingWarningCount: 0,
    lastRoutedAt: latestIso(intentRecords.map((record) => safeRecordString(record, "updatedAt"))),
    updatedAt
  };
}

async function summarizePaperRoutingForWorkspace(
  workspaceId: string
): Promise<CryptoPaperRoutingOverview> {
  const { db } = getFirebaseAdminClients();
  const [intentSnapshot, decisionSnapshot, boundedAuditSnapshot] = await Promise.all([
    db.collection(`workspaces/${workspaceId}/execution_intents`).limit(PAPER_ROUTING_OVERVIEW_LIMIT).get(),
    db.collection(`workspaces/${workspaceId}/risk_decisions`).limit(PAPER_ROUTING_OVERVIEW_LIMIT).get(),
    db
      .collection(`workspaces/${workspaceId}/execution_audit_events`)
      .where("action", "==", "routing.bounded")
      .limit(PAPER_ROUTING_OVERVIEW_LIMIT)
      .get()
  ]);
  const intentRecords = intentSnapshot.docs.map((doc) => doc.data());
  const decisionRecords = decisionSnapshot.docs.map((doc) => doc.data());
  const updatedAt = latestIso([
    ...intentRecords.map((record) => safeRecordString(record, "updatedAt")),
    ...decisionRecords.map((record) => safeRecordString(record, "decidedAt")),
    ...boundedAuditSnapshot.docs.map((doc) => safeRecordString(doc.data(), "createdAt"))
  ]) ?? new Date().toISOString();

  return {
    recentIntentCount: intentRecords.length,
    readyForPaperCount: intentRecords.filter((record) => record.status === "ready_for_paper").length,
    riskBlockedCount: decisionRecords.filter((record) => record.status === "blocked").length,
    boundedRoutingWarningCount: boundedAuditSnapshot.docs.length,
    lastRoutedAt: latestIso(intentRecords.map((record) => safeRecordString(record, "updatedAt"))),
    updatedAt
  };
}

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

function safeConnectionId(exchange: CryptoExchangeId, keyFingerprint: string) {
  return `${exchange}_${keyFingerprint}`.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 80);
}

function assertEligibleForConnection(base: StudentExecutionBase) {
  const autoCopyEntitlement = base.entitlements.features.autoCopy;

  if (autoCopyEntitlement.access !== "allowed") {
    throw new AdminApiError(403, "auto_copy_not_entitled", autoCopyEntitlement.reason);
  }

  if (base.entitlements.riskPosture !== "personal_account") {
    throw new AdminApiError(
      403,
      "personal_account_required",
      "Only personal exchange accounts can connect crypto Auto-Copy credentials."
    );
  }

  if (!base.cryptoAutoCopy.billing.entitled) {
    throw new AdminApiError(
      403,
      "crypto_autocopy_subscription_required",
      base.cryptoAutoCopy.billing.reason
    );
  }

  if (base.platformControl.killSwitchEnabled) {
    throw new AdminApiError(
      423,
      "platform_execution_paused",
      base.platformControl.killSwitchReason || "Platform crypto Auto-Copy setup is paused."
    );
  }

  if (base.workspaceControl.killSwitchEnabled) {
    throw new AdminApiError(
      423,
      "workspace_execution_paused",
      base.workspaceControl.killSwitchReason || "Workspace crypto Auto-Copy setup is paused."
    );
  }
}

async function appendExecutionAuditEvent({
  workspaceId,
  studentId,
  actorId,
  action,
  targetType,
  targetId,
  safeMessage,
  after,
  severity = "info"
}: {
  workspaceId: string;
  studentId: string;
  actorId: string;
  action: ExecutionAuditAction;
  targetType: "connection" | "preference";
  targetId: string;
  safeMessage: string;
  after?: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
}) {
  const { db } = getFirebaseAdminClients();
  const eventRef = db.collection(`workspaces/${workspaceId}/execution_audit_events`).doc();

  await eventRef.set(stripUndefined({
    eventId: eventRef.id,
    action,
    actorType: "student",
    actorId,
    workspaceId,
    studentId,
    targetType,
    targetId,
    safeMessage,
    severity,
    after,
    createdAt: new Date().toISOString()
  }));
}

function mapLiveProductionConsentRecord(
  record: Record<string, unknown> | null,
  workspaceId: string,
  studentId: string
): LiveProductionConsentRecord {
  const status =
    record?.productionStatus === "accepted" ||
    record?.productionStatus === "paused" ||
    record?.productionStatus === "revoked"
      ? record.productionStatus
      : "not_started";

  return {
    workspaceId,
    studentId,
    status,
    consentVersion: safeRecordString(record ?? {}, "productionConsentVersion") || "stage15j-production-live-v1",
    riskDisclosureVersion: safeRecordString(record ?? {}, "productionRiskDisclosureVersion") || "stage15j-live-risk-v1",
    acceptedAt: safeRecordString(record ?? {}, "productionAcceptedAt") || undefined,
    revokedAt: safeRecordString(record ?? {}, "productionRevokedAt") || undefined,
    pausedAt: safeRecordString(record ?? {}, "productionPausedAt") || undefined,
    source: record?.source === "student_app" || record?.source === "admin_seed" || record?.source === "fixture"
      ? record.source
      : "fixture",
    personalExchangeConfirmed: safeRecordBoolean(record, "personalExchangeConfirmed"),
    notFundedOrPropFirmConfirmed: safeRecordBoolean(record, "notFundedOrPropFirmConfirmed"),
    withdrawalsDisabledConfirmed: safeRecordBoolean(record, "withdrawalsDisabledConfirmed"),
    liveLossRiskConfirmed: safeRecordBoolean(record, "productionLiveLossRiskConfirmed") || safeRecordBoolean(record, "liveLossRiskConfirmed"),
    tradeHubNoCustodyConfirmed: safeRecordBoolean(record, "tradeHubNoCustodyConfirmed"),
    updatedAt: safeRecordString(record ?? {}, "updatedAt") || new Date().toISOString()
  };
}

async function loadStudentLiveProductionConsent(
  workspaceId: string,
  studentId: string
): Promise<LiveProductionConsentRecord> {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc(`workspaces/${workspaceId}/students/${studentId}/live_consents/current`).get();

  return mapLiveProductionConsentRecord(
    snapshot.exists ? recordFromSnapshot(snapshot, "consentId") : null,
    workspaceId,
    studentId
  );
}

async function appendLiveProductionConsentAuditEvent({
  workspaceId,
  studentId,
  actorId,
  action,
  safeMessage,
  after,
  severity = "info"
}: {
  workspaceId: string;
  studentId: string;
  actorId: string;
  action: string;
  safeMessage: string;
  after?: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
}) {
  const { db } = getFirebaseAdminClients();
  const eventRef = db.collection(`workspaces/${workspaceId}/live_execution_audit_events`).doc();

  await eventRef.set(stripUndefined({
    eventId: eventRef.id,
    action,
    actorType: "student",
    actorId,
    workspaceId,
    studentId,
    targetType: "live_consent",
    targetId: "current",
    safeMessage,
    severity,
    after,
    createdAt: new Date().toISOString()
  }));
}

async function getPlatformExecutionControl() {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc("platform_execution_controls/current").get();

  return mapPlatformExecutionControlRecord(
    snapshot.exists ? recordFromSnapshot(snapshot, "controlId") : null
  );
}

async function getWorkspaceExecutionControl(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc(`workspaces/${workspaceId}/execution_controls/current`).get();

  return mapWorkspaceExecutionControlRecord(
    snapshot.exists ? recordFromSnapshot(snapshot, "controlId") : null,
    workspaceId
  );
}

async function listStudentExchangeConnections(workspaceId: string, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students/${studentId}/exchange_connections`)
    .limit(STUDENT_CONNECTION_LIMIT)
    .get();

  return snapshot.docs
    .map((doc) =>
      mapExchangeConnectionRecord(recordFromSnapshot(doc, "connectionId"), {
        workspaceId,
        studentId,
        connectionId: doc.id
      })
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(toExchangeConnectionSummary);
}

async function getWorkspaceStudentExecutionSample({
  workspace,
  workspaceControl,
  platformControl
}: {
  workspace: Workspace;
  workspaceControl: WorkspaceExecutionControlRecord;
  platformControl: PlatformExecutionControlRecord;
}) {
  const { db } = getFirebaseAdminClients();
  const studentSnapshot = await db
    .collection(`workspaces/${workspace.workspaceId}/students`)
    .limit(WORKSPACE_EXECUTION_STUDENT_SAMPLE_LIMIT)
    .get();
  const connectionCounts = zeroConnectionCounts();
  const readinessCounts = zeroReadinessCounts();
  const autoCopyPosture = await summarizeAutoCopyPreferencePosture(workspace.workspaceId);
  let sampledConnectionCount = 0;
  let recentFailureCount = 0;

  await Promise.all(studentSnapshot.docs.map(async (studentDoc) => {
    const studentId = studentDoc.id;
    const rawStudentRecord = studentRecordFromSnapshot(studentDoc, "studentId");
    const [subscriptionSnapshot, preferencesSnapshot, connectionSnapshot] = await Promise.all([
      db.doc(`workspaces/${workspace.workspaceId}/students/${studentId}/subscriptions/current`).get(),
      db.doc(`workspaces/${workspace.workspaceId}/students/${studentId}/execution_preferences/current`).get(),
      db
        .collection(`workspaces/${workspace.workspaceId}/students/${studentId}/exchange_connections`)
        .limit(STUDENT_CONNECTION_LIMIT)
        .get()
    ]);
    const subscription = mapSubscriptionRecord(
      subscriptionSnapshot.exists
        ? studentRecordFromSnapshot(subscriptionSnapshot, "subscriptionId")
        : null,
      workspace.workspaceId,
      studentId
    );
    const entitlements = resolveStudentEntitlements({
      workspace,
      studentRecord: rawStudentRecord,
      subscription
    });
    const preferences = mapStudentExecutionPreferencesRecord(
      preferencesSnapshot.exists ? recordFromSnapshot(preferencesSnapshot, "preferenceId") : null,
      workspace.workspaceId,
      studentId
    );
    const connections = connectionSnapshot.docs
      .map((doc) =>
        mapExchangeConnectionRecord(recordFromSnapshot(doc, "connectionId"), {
          workspaceId: workspace.workspaceId,
          studentId,
          connectionId: doc.id
        })
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(toExchangeConnectionSummary);
    const readiness = resolveCryptoExecutionReadiness({
      entitlements,
      preferences,
      connections,
      workspaceControl,
      platformControl
    });

    readinessCounts[readiness.state] += 1;
    sampledConnectionCount += connections.length;

    for (const connection of connections) {
      connectionCounts[connection.status] += 1;

      if (connection.status === "error" || connection.status === "rejected") {
        recentFailureCount += 1;
      }
    }
  }));

  return {
    connectionCounts,
    readinessCounts,
    recentFailureCount,
    sampledConnectionCount,
    autoCopyPosture,
    sampledStudentCount: studentSnapshot.docs.length,
    bounded: studentSnapshot.docs.length === WORKSPACE_EXECUTION_STUDENT_SAMPLE_LIMIT
  };
}

async function getStudentExecutionBase(actor: VerifiedStudent): Promise<StudentExecutionBase> {
  const { db } = getFirebaseAdminClients();
  const [
    workspaceSnapshot,
    studentSnapshot,
    subscriptionSnapshot,
    preferencesSnapshot,
    workspaceControl,
    platformControl
  ] = await Promise.all([
    db.doc(`workspaces/${actor.workspaceId}`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/subscriptions/current`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/execution_preferences/current`).get(),
    getWorkspaceExecutionControl(actor.workspaceId),
    getPlatformExecutionControl()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This student workspace is not prepared yet.");
  }

  if (!studentSnapshot.exists) {
    throw new AdminApiError(
      403,
      "student_record_required",
      "This student account is signed in but has not been provisioned inside this workspace yet."
    );
  }

  const workspace = mapWorkspaceForStudent(
    studentRecordFromSnapshot(workspaceSnapshot, "workspaceId"),
    actor.workspaceId
  );
  const rawStudentRecord = studentRecordFromSnapshot(studentSnapshot, "studentId");
  const subscription = mapSubscriptionRecord(
    subscriptionSnapshot.exists
      ? studentRecordFromSnapshot(subscriptionSnapshot, "subscriptionId")
      : null,
    actor.workspaceId,
    actor.studentId
  );
  const entitlements = resolveStudentEntitlements({
    workspace,
    studentRecord: rawStudentRecord,
    subscription,
    claimedTierId: actor.tierId
  });
  const student = mapStudentProfile(rawStudentRecord, actor.workspaceId, actor.studentId, entitlements);
  const preferences = mapStudentExecutionPreferencesRecord(
    preferencesSnapshot.exists ? recordFromSnapshot(preferencesSnapshot, "preferenceId") : null,
    actor.workspaceId,
    actor.studentId
  );
  const [connections, cryptoAutoCopyPreferences, forexAutoCopyPreferences, cryptoAutoCopy] = await Promise.all([
    listStudentExchangeConnections(actor.workspaceId, actor.studentId),
    loadStudentAutoCopyPreferences({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      market: "crypto"
    }),
    loadStudentAutoCopyPreferences({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      market: "forex"
    }),
    loadTradeCopierSubscriptionPreview({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId
    })
  ]);
  const readiness = resolveCryptoExecutionReadiness({
    entitlements,
    cryptoAutoCopy,
    preferences,
    connections,
    workspaceControl,
    platformControl
  });
  const warnings: string[] = [];

  if (!preferencesSnapshot.exists) {
    warnings.push(
      "Crypto execution preferences are missing, so TradeHub returned conservative paper-only defaults."
    );
  }

  if (connections.length === 0) {
    warnings.push("No Binance or Bybit connection metadata exists for this student yet.");
  }

  return {
    workspace,
    student,
    subscription,
    entitlements,
    preferences,
    autoCopyPreferences: {
      crypto: cryptoAutoCopyPreferences,
      forex: forexAutoCopyPreferences
    },
    cryptoAutoCopy,
    connections,
    workspaceControl,
    platformControl,
    readiness,
    warnings
  };
}

export async function getStudentExecutionReadiness(actor: VerifiedStudent) {
  const base = await getStudentExecutionBase(actor);

  return base.readiness;
}

export async function getStudentCryptoExecutionOverview(
  actor: VerifiedStudent
): Promise<StudentCryptoExecutionOverviewResponse> {
  const base = await getStudentExecutionBase(actor);
  const autoCopyEntitlement = base.entitlements.features.autoCopy;
  const [paperRouting, paperExecution, forexPaper, forexDemo, forexLiveCanary, forexConnections, forexProvisioning, liveSandbox, liveProductionConsent, liveProduction] = await Promise.all([
    summarizePaperRoutingForStudent(actor.workspaceId, actor.studentId),
    loadPaperExecutionPreview({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId
    }),
    loadForexPaperExecutionPreview({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId
    }),
    loadForexDemoExecutionPreview(actor.workspaceId, actor.studentId),
    loadForexLiveCanaryExecutionPreview(actor.workspaceId, actor.studentId),
    loadForexConnectionReadinessPreview({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId
    }),
    loadForexProvisioningPreview({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId
    }),
    loadLiveSandboxExecutionPreview(actor.workspaceId, actor.studentId),
    loadStudentLiveProductionConsent(actor.workspaceId, actor.studentId),
    loadLiveProductionExecutionPreview(actor.workspaceId, actor.studentId)
  ]);
  const broadLiveStatus = buildStudentBroadLiveAutoCopyStatus({
    readiness: base.readiness,
    autoCopyPreferences: base.autoCopyPreferences,
    liveProductionConsent,
    liveProduction,
    forexLiveCanary,
    platformControl: base.platformControl,
    workspaceControl: base.workspaceControl
  });

  return {
    ...createSourceMeta(base.warnings),
    ok: true,
    student: {
      studentId: base.student.studentId,
      workspaceId: base.workspace.workspaceId,
      tierId: base.student.tierId,
      tierLabel: base.student.tierLabel,
      riskPosture: base.student.riskPosture,
      autoCopyAccess: autoCopyEntitlement.access,
      autoCopyAccessReason: autoCopyEntitlement.reason
    },
    readiness: base.readiness,
    preferences: base.preferences,
    autoCopyPreferences: base.autoCopyPreferences,
    cryptoAutoCopy: base.cryptoAutoCopy,
    connections: base.connections,
    workspaceControl: base.workspaceControl,
    platformControl: base.platformControl,
    paperRouting,
    paperExecution,
    forexPaper,
    forexDemo,
    forexLiveCanary,
    forexConnections,
    forexProvisioning,
    liveSandbox,
    liveProductionConsent,
    liveProduction,
    broadLiveStatus
  };
}

export async function updateStudentAutoCopyPreferences(
  actor: VerifiedStudent,
  payload: unknown
): Promise<StudentCryptoExecutionOverviewResponse> {
  const base = await getStudentExecutionBase(actor);
  const market = typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    (payload as Record<string, unknown>).market === "forex"
    ? "forex"
    : "crypto";
  const current = market === "forex"
    ? base.autoCopyPreferences.forex
    : base.autoCopyPreferences.crypto;
  const preferences = validateAutoCopyPreferencesPayload(payload, current);
  const { db } = getFirebaseAdminClients();

  if (base.entitlements.features.autoCopy.access !== "allowed") {
    throw new AdminApiError(403, "auto_copy_not_entitled", base.entitlements.features.autoCopy.reason);
  }

  if (!base.cryptoAutoCopy.billing.entitled) {
    throw new AdminApiError(
      403,
      "trade_copier_subscription_required",
      base.cryptoAutoCopy.billing.reason
    );
  }

  await db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/auto_copy_preferences/${market}`)
    .set(stripUndefined({
      ...preferences,
      updatedBy: actor.uid
    }), { merge: true });

  await appendExecutionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: preferences.studentPaused ? "preference.paused" : "preference.updated",
    targetType: "preference",
    targetId: `auto_copy_${market}`,
    safeMessage: market === "forex"
      ? "Student updated forex paper Auto-Copy preferences. Forex remains paper-only with no broker execution."
      : "Student updated shared crypto Auto-Copy preferences.",
    after: {
      market,
      executionMode: preferences.executionMode,
      consentStatus: preferences.consentStatus,
      sizingMode: preferences.sizingMode,
      staleSignalPolicy: preferences.staleSignalPolicy,
      staleSignalMaxAgeSeconds: preferences.staleSignalMaxAgeSeconds,
      studentPaused: preferences.studentPaused,
      forexFoundationOnly: preferences.forexFoundationOnly
    }
  });

  return getStudentCryptoExecutionOverview(actor);
}

function requireProductionConfirmation(payload: unknown, key: string, label: string) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Accept the production live beta confirmations before continuing.");
  }

  if ((payload as Record<string, unknown>)[key] !== true) {
    throw new AdminApiError(400, "production_consent_confirmation_required", label);
  }
}

export async function updateStudentLiveProductionConsent(
  actor: VerifiedStudent,
  action: "accept" | "pause" | "resume" | "revoke",
  payload: unknown = {}
): Promise<StudentCryptoExecutionOverviewResponse> {
  const base = await getStudentExecutionBase(actor);
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const consentRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/live_consents/current`);
  const currentSnapshot = await consentRef.get();
  const currentConsent = mapLiveProductionConsentRecord(
    currentSnapshot.exists ? recordFromSnapshot(currentSnapshot, "consentId") : null,
    actor.workspaceId,
    actor.studentId
  );
  const writeBase = {
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    source: "student_app",
    updatedAt: now,
    updatedBy: actor.uid
  };
  let safeMessage = "Production live beta consent updated.";
  let severity: "info" | "warning" = "info";
  let nextStatus: LiveProductionConsentRecord["status"] = currentConsent.status;
  let write: Record<string, unknown>;

  if (action === "accept") {
    if (base.entitlements.features.autoCopy.access !== "allowed") {
      throw new AdminApiError(403, "auto_copy_required", base.entitlements.features.autoCopy.reason);
    }

    if (base.entitlements.riskPosture !== "personal_account") {
      throw new AdminApiError(
        403,
        "personal_account_required",
        "Production live beta consent is only available for personal exchange accounts."
      );
    }

    if (!base.cryptoAutoCopy.billing.entitled) {
      throw new AdminApiError(
        403,
        "crypto_autocopy_subscription_required",
        base.cryptoAutoCopy.billing.reason
      );
    }

    requireProductionConfirmation(
      payload,
      "personalExchangeConfirmed",
      "Confirm this is your personal Binance/Bybit account."
    );
    requireProductionConfirmation(
      payload,
      "notFundedOrPropFirmConfirmed",
      "Confirm this is not funded-account or prop-firm capital."
    );
    requireProductionConfirmation(
      payload,
      "withdrawalsDisabledConfirmed",
      "Confirm your exchange API key has withdrawals disabled."
    );
    requireProductionConfirmation(
      payload,
      "productionLiveLossRiskConfirmed",
      "Confirm you understand live orders can lose money."
    );
    requireProductionConfirmation(
      payload,
      "tradeHubNoCustodyConfirmed",
      "Confirm TradeHub does not custody your exchange funds."
    );

    nextStatus = "accepted";
    safeMessage = "Student accepted production live beta consent. Production order gates remain fail-closed until all platform, workspace, vault, dry-run, allowlist, and Super Admin controls pass.";
    write = {
      ...writeBase,
      productionStatus: "accepted",
      productionConsentVersion: "stage15j-production-live-v1",
      productionRiskDisclosureVersion: "stage15j-live-risk-v1",
      productionAcceptedAt: now,
      personalExchangeConfirmed: true,
      notFundedOrPropFirmConfirmed: true,
      withdrawalsDisabledConfirmed: true,
      productionLiveLossRiskConfirmed: true,
      liveLossRiskConfirmed: true,
      tradeHubNoCustodyConfirmed: true
    };
  } else if (action === "pause") {
    nextStatus = "paused";
    safeMessage = "Student paused production live beta routing.";
    severity = "warning";
    write = {
      ...writeBase,
      productionStatus: "paused",
      productionPausedAt: now
    };
  } else if (action === "resume") {
    if (
      currentConsent.status !== "paused" ||
      !currentConsent.personalExchangeConfirmed ||
      !currentConsent.notFundedOrPropFirmConfirmed ||
      !currentConsent.withdrawalsDisabledConfirmed ||
      !currentConsent.liveLossRiskConfirmed ||
      !currentConsent.tradeHubNoCustodyConfirmed
    ) {
      throw new AdminApiError(
        409,
        "production_consent_reaccept_required",
        "Accept production live beta terms before resuming this consent."
      );
    }

    nextStatus = "accepted";
    safeMessage = "Student resumed production live beta consent. Production order gates remain fail-closed unless every server-side control passes.";
    write = {
      ...writeBase,
      productionStatus: "accepted",
      productionResumedAt: now
    };
  } else {
    nextStatus = "revoked";
    safeMessage = "Student revoked production live beta consent; future production routing is blocked until terms are re-accepted.";
    severity = "warning";
    write = {
      ...writeBase,
      productionStatus: "revoked",
      productionRevokedAt: now
    };
  }

  await consentRef.set(stripUndefined(write), { merge: true });
  await appendLiveProductionConsentAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: `live_production.consent.${action}`,
    safeMessage,
    after: {
      productionStatus: nextStatus,
      consentVersion: action === "accept" ? "stage15j-production-live-v1" : currentConsent.consentVersion
    },
    severity
  });

  return getStudentCryptoExecutionOverview(actor);
}

async function writeConnectionMetadata({
  workspaceId,
  studentId,
  connectionId,
  exchange,
  environment,
  status,
  credentialStorageState,
  permissionVerification,
  withdrawalPermission,
  keyFingerprint,
  supportSafeMessage,
  credentialRefPath,
  credentialMetadataId,
  disabledReason
}: {
  workspaceId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  environment: CryptoExchangeEnvironment;
  status: ExchangeConnectionStatus;
  credentialStorageState: ExchangeConnectionSummary["credentialStorageState"];
  permissionVerification: ExchangeConnectionSummary["permissionVerification"];
  withdrawalPermission: ExchangeConnectionSummary["withdrawalPermission"];
  keyFingerprint?: string;
  supportSafeMessage: string;
  credentialRefPath?: string;
  credentialMetadataId?: string;
  disabledReason?: string;
}) {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();

  await db.doc(`workspaces/${workspaceId}/students/${studentId}/exchange_connections/${connectionId}`).set(
    stripUndefined({
      connectionId,
      workspaceId,
      studentId,
      exchange,
      environment,
      market: "crypto",
      accountKind: "personal_exchange",
      status,
      connectionLabel: exchange === "binance" ? "Binance personal account" : "Bybit personal account",
      credentialMetadataId,
      credentialRefPath,
      credentialStorageState,
      permissionVerification,
      withdrawalPermission,
      keyFingerprint,
      lastVerifiedAt: permissionVerification === "passed" ? now : undefined,
      lastHealthCheckAt: now,
      disabledReason,
      supportSafeMessage,
      createdAt: now,
      updatedAt: now
    }),
    { merge: true }
  );
}

export async function createStudentCryptoExecutionConnection(
  actor: VerifiedStudent,
  payload: unknown
): Promise<StudentCryptoExecutionOverviewResponse> {
  const input = validateExchangeConnectionPayload(payload);
  const base = await getStudentExecutionBase(actor);
  assertEligibleForConnection(base);

  if (
    input.environment === "production" &&
    (base.platformControl.sandboxOnly || base.workspaceControl.sandboxOnly)
  ) {
    throw new AdminApiError(
      403,
      "production_exchange_keys_disabled",
      "Production exchange keys are disabled until TradeHub live execution beta is enabled."
    );
  }

  const adapter = getExchangePermissionAdapter(input.exchange);
  const permission = await adapter({
    apiKey: input.apiKey,
    apiSecret: input.apiSecret,
    environment: input.environment
  });
  const connectionId = safeConnectionId(
    input.exchange,
    permission.keyFingerprint ?? `${Date.now()}`
  );

  await appendExecutionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: "connection.verification_attempted",
    targetType: "connection",
    targetId: connectionId,
    safeMessage: `${input.exchange} permission verification was attempted.`,
    after: {
      exchange: input.exchange,
      environment: input.environment
    }
  });

  if (!permission.ok) {
    await writeConnectionMetadata({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId,
      exchange: input.exchange,
      environment: input.environment,
      status: permission.withdrawalPermission === "detected_enabled" ? "rejected" : "error",
      credentialStorageState: "not_collected",
      permissionVerification: "failed",
      withdrawalPermission: permission.withdrawalPermission,
      keyFingerprint: permission.keyFingerprint,
      supportSafeMessage: permission.safeMessage,
      disabledReason: permission.sanitizedFailureCode
    });
    await appendExecutionAuditEvent({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      actorId: actor.uid,
      action: "connection.rejected",
      targetType: "connection",
      targetId: connectionId,
      safeMessage: permission.safeMessage,
      after: {
        exchange: input.exchange,
        status: "rejected",
        sanitizedFailureCode: permission.sanitizedFailureCode
      },
      severity: "warning"
    });

    throw new AdminApiError(
      400,
      permission.sanitizedFailureCode ?? "exchange_permission_failed",
      permission.safeMessage
    );
  }

  let storedCredential;

  try {
    storedCredential = await storeExchangeCredential({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId,
      exchange: input.exchange,
      environment: input.environment,
      apiKey: input.apiKey,
      apiSecret: input.apiSecret
    });
  } catch (error) {
    const message = error instanceof AdminApiError
      ? error.message
      : "Crypto credential storage is unavailable.";

    await writeConnectionMetadata({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId,
      exchange: input.exchange,
      environment: input.environment,
      status: "error",
      credentialStorageState: "pending_encrypted_storage",
      permissionVerification: "passed",
      withdrawalPermission: "confirmed_disabled",
      keyFingerprint: permission.keyFingerprint,
      supportSafeMessage: message,
      disabledReason: "credential_storage_unavailable"
    });
    await appendExecutionAuditEvent({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      actorId: actor.uid,
      action: "connection.rejected",
      targetType: "connection",
      targetId: connectionId,
      safeMessage: message,
      after: {
        exchange: input.exchange,
        status: "error",
        credentialStorageState: "pending_encrypted_storage"
      },
      severity: "critical"
    });

    throw error;
  }

  await writeConnectionMetadata({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId,
    exchange: input.exchange,
    environment: input.environment,
    status: "verified",
    credentialStorageState: storedCredential.storageState,
    permissionVerification: "passed",
    withdrawalPermission: "confirmed_disabled",
    keyFingerprint: permission.keyFingerprint,
    credentialMetadataId: storedCredential.credentialMetadataId,
    credentialRefPath: storedCredential.credentialRefPath,
    supportSafeMessage: permission.safeMessage
  });
  await appendExecutionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: "connection.verified",
    targetType: "connection",
    targetId: connectionId,
    safeMessage: permission.safeMessage,
    after: {
      exchange: input.exchange,
      environment: input.environment,
      status: "verified",
      withdrawalPermission: "confirmed_disabled"
    }
  });

  const preferences = validateStudentExecutionPreferencesPayload(
    {
      optInState: base.preferences.optInState === "not_started"
        ? "opted_in_paper"
        : base.preferences.optInState,
      riskDisclosureAcceptedAt: new Date().toISOString()
    },
    base.preferences
  );
  const { db } = getFirebaseAdminClients();

  await db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/execution_preferences/current`).set(
    stripUndefined({
      ...preferences,
      riskDisclosureAcceptedAt: preferences.riskDisclosureAcceptedAt ?? new Date().toISOString(),
      updatedBy: actor.uid
    }),
    { merge: true }
  );

  return getStudentCryptoExecutionOverview(actor);
}

export async function updateStudentCryptoExecutionPreferences(
  actor: VerifiedStudent,
  payload: unknown
): Promise<StudentCryptoExecutionOverviewResponse> {
  const base = await getStudentExecutionBase(actor);
  assertEligibleForConnection(base);

  const preferences = validateStudentExecutionPreferencesPayload(payload, base.preferences);
  const { db } = getFirebaseAdminClients();

  await db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/execution_preferences/current`).set(
    stripUndefined({
      ...preferences,
      updatedBy: actor.uid
    }),
    { merge: true }
  );

  await appendExecutionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: preferences.studentPaused
      ? "preference.paused"
      : base.preferences.studentPaused
        ? "preference.resumed"
        : "preference.updated",
    targetType: "preference",
    targetId: "current",
    safeMessage: preferences.studentPaused
      ? "Student paused crypto Auto-Copy readiness."
      : "Student updated crypto Auto-Copy paper-mode preferences.",
    after: {
      optInState: preferences.optInState,
      paperTradingOnly: preferences.paperTradingOnly,
      studentPaused: preferences.studentPaused,
      maxRiskPercentPerTrade: preferences.maxRiskPercentPerTrade,
      maxDailyLossPercent: preferences.maxDailyLossPercent,
      maxOpenTrades: preferences.maxOpenTrades,
      allowedSymbols: preferences.allowedSymbols
    }
  });

  return getStudentCryptoExecutionOverview(actor);
}

async function getStudentConnectionRecord(actor: VerifiedStudent, connectionId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/exchange_connections/${connectionId}`)
    .get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "connection_not_found", "That exchange connection was not found.");
  }

  return mapExchangeConnectionRecord(recordFromSnapshot(snapshot, "connectionId"), {
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId
  });
}

export async function refreshStudentCryptoExecutionConnection(
  actor: VerifiedStudent,
  connectionIdValue: unknown
): Promise<StudentCryptoExecutionOverviewResponse> {
  const connectionId = validateExchangeConnectionId(connectionIdValue);
  const base = await getStudentExecutionBase(actor);
  assertEligibleForConnection(base);
  const connection = await getStudentConnectionRecord(actor, connectionId);

  await appendExecutionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: "connection.refresh_attempted",
    targetType: "connection",
    targetId: connectionId,
    safeMessage: `${connection.exchange} permission refresh was attempted.`,
    after: {
      exchange: connection.exchange,
      environment: connection.environment
    }
  });

  const credential = await loadExchangeCredential({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId
  });
  const adapter = getExchangePermissionAdapter(connection.exchange);
  const permission = await adapter({
    apiKey: credential.apiKey,
    apiSecret: credential.apiSecret,
    environment: connection.environment
  });

  if (!permission.ok) {
    await writeConnectionMetadata({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId,
      exchange: connection.exchange,
      environment: connection.environment,
      status: permission.withdrawalPermission === "detected_enabled" ? "rejected" : "error",
      credentialStorageState: connection.credentialStorageState,
      permissionVerification: "failed",
      withdrawalPermission: permission.withdrawalPermission,
      keyFingerprint: connection.keyFingerprint,
      credentialMetadataId: connection.credentialMetadataId,
      credentialRefPath: connection.credentialRefPath,
      supportSafeMessage: permission.safeMessage,
      disabledReason: permission.sanitizedFailureCode
    });
    await appendExecutionAuditEvent({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      actorId: actor.uid,
      action: "connection.refresh_failed",
      targetType: "connection",
      targetId: connectionId,
      safeMessage: permission.safeMessage,
      after: {
        exchange: connection.exchange,
        status: "error",
        sanitizedFailureCode: permission.sanitizedFailureCode
      },
      severity: "warning"
    });

    throw new AdminApiError(
      400,
      permission.sanitizedFailureCode ?? "exchange_permission_failed",
      permission.safeMessage
    );
  }

  await writeConnectionMetadata({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId,
    exchange: connection.exchange,
    environment: connection.environment,
    status: "verified",
    credentialStorageState: connection.credentialStorageState,
    permissionVerification: "passed",
    withdrawalPermission: "confirmed_disabled",
    keyFingerprint: connection.keyFingerprint ?? permission.keyFingerprint,
    credentialMetadataId: connection.credentialMetadataId,
    credentialRefPath: connection.credentialRefPath,
    supportSafeMessage: permission.safeMessage
  });

  return getStudentCryptoExecutionOverview(actor);
}

export async function disableStudentCryptoExecutionConnection(
  actor: VerifiedStudent,
  connectionIdValue: unknown
): Promise<StudentCryptoExecutionOverviewResponse> {
  const connectionId = validateExchangeConnectionId(connectionIdValue);
  const base = await getStudentExecutionBase(actor);
  assertEligibleForConnection(base);
  const connection = await getStudentConnectionRecord(actor, connectionId);
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();

  await revokeExchangeCredential({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId
  });
  await db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/exchange_connections/${connectionId}`).set(
    stripUndefined({
      status: "disabled",
      credentialStorageState: "revoked",
      disabledAt: now,
      disabledReason: "student_disabled",
      supportSafeMessage: "The student disabled this exchange connection.",
      updatedAt: now
    }),
    { merge: true }
  );
  await appendExecutionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: "connection.disabled",
    targetType: "connection",
    targetId: connectionId,
    safeMessage: "Student disabled an exchange connection.",
    after: {
      exchange: connection.exchange,
      status: "disabled"
    }
  });

  return getStudentCryptoExecutionOverview(actor);
}

async function summarizeWorkspaceExecution({
  workspace,
  summary,
  workspaceControl,
  platformControl
}: {
  workspace: Workspace;
  summary: WorkspaceDashboardSummary;
  workspaceControl: WorkspaceExecutionControlRecord;
  platformControl: PlatformExecutionControlRecord;
}) {
  const [paperRouting, paperExecution, forexPaper, forexDemo, forexLiveCanary, forexConnections, forexProvisioning, accountLinkedPerformance, accountLinkedDiagnostics, liveSandbox, liveProduction, sample] = await Promise.all([
    summarizePaperRoutingForWorkspace(workspace.workspaceId),
    loadPaperExecutionPreview({ workspaceId: workspace.workspaceId }),
    loadForexPaperExecutionPreview({ workspaceId: workspace.workspaceId }),
    loadForexDemoExecutionPreview(workspace.workspaceId),
    loadForexLiveCanaryExecutionPreview(workspace.workspaceId),
    loadForexConnectionReadinessPreview({ workspaceId: workspace.workspaceId }),
    loadForexProvisioningPreview({ workspaceId: workspace.workspaceId }),
    loadWorkspaceAccountLinkedPerformanceSummary(workspace.workspaceId),
    loadAdminAccountLinkedLedgerDiagnostics(workspace.workspaceId),
    loadLiveSandboxExecutionPreview(workspace.workspaceId),
    loadLiveProductionExecutionPreview(workspace.workspaceId),
    getWorkspaceStudentExecutionSample({
      workspace,
      workspaceControl,
      platformControl
    })
  ]);
  const recentPaperFailureCount =
    paperExecution.orderAttempts.filter((attempt) => attempt.status === "failed").length +
    paperExecution.riskDecisions.filter((decision) => decision.status === "blocked").length;
  const recentFailureCount = sample.recentFailureCount + recentPaperFailureCount;
  const broadLiveReadiness = buildBroadLiveAutoCopyReadinessOverview({
    scope: "workspace",
    workspaceId: workspace.workspaceId,
    platformControl,
    workspaceControl,
    liveProduction,
    forexLiveCanary,
    readinessCounts: sample.readinessCounts,
    sampledStudentCount: sample.sampledStudentCount,
    recentFailureCount
  });

  return {
    connectionCounts: sample.connectionCounts,
    readinessCounts: sample.readinessCounts,
    recentFailureCount,
    sampledConnectionCount: sample.sampledConnectionCount,
    autoCopyPosture: sample.autoCopyPosture,
    paperRouting,
    paperExecution,
    forexPaper,
    forexDemo,
    forexLiveCanary,
    forexConnections,
    forexProvisioning,
    accountLinkedPerformance,
    accountLinkedDiagnostics,
    liveSandbox,
    liveProduction,
    broadLiveReadiness,
    updatedAt: latestIso([
      summary.updatedAt,
      paperRouting.updatedAt,
      ...paperExecution.intents.map((intent) => intent.updatedAt),
      ...paperExecution.orderAttempts.map((attempt) => attempt.updatedAt),
      ...paperExecution.riskDecisions.map((decision) => decision.decidedAt),
      forexPaper.routing.updatedAt,
      ...forexPaper.intents.map((intent) => intent.updatedAt),
      ...forexPaper.attempts.map((attempt) => attempt.updatedAt),
      ...forexPaper.riskDecisions.map((decision) => decision.decidedAt),
      forexDemo.routing.updatedAt,
      ...forexDemo.intents.map((intent) => intent.updatedAt),
      ...forexDemo.attempts.map((attempt) => attempt.updatedAt),
      ...forexDemo.gateDecisions.map((decision) => decision.decidedAt),
      ...forexDemo.reconciliations.map((record) => record.updatedAt),
      forexLiveCanary.routing.updatedAt,
      ...forexLiveCanary.intents.map((intent) => intent.updatedAt),
      ...forexLiveCanary.attempts.map((attempt) => attempt.updatedAt),
      ...forexLiveCanary.gateDecisions.map((decision) => decision.decidedAt),
      forexConnections.updatedAt,
      forexProvisioning.updatedAt,
      accountLinkedPerformance.updatedAt,
      accountLinkedDiagnostics.updatedAt,
      ...liveSandbox.intents.map((intent) => intent.updatedAt),
      ...liveSandbox.orderAttempts.map((attempt) => attempt.updatedAt),
      ...liveSandbox.reconciliations.map((record) => record.updatedAt),
      ...liveProduction.intents.map((intent) => intent.updatedAt),
      ...liveProduction.orderAttempts.map((attempt) => attempt.updatedAt),
      ...liveProduction.reconciliations.map((record) => record.updatedAt),
      broadLiveReadiness.updatedAt
    ]) ?? summary.updatedAt,
    bounded: sample.bounded,
    sampledStudentCount: sample.sampledStudentCount
  };
}

export async function getWorkspaceCryptoExecutionOverview(
  actor: VerifiedInfluencer
): Promise<WorkspaceCryptoExecutionOverviewResponse> {
  const { db } = getFirebaseAdminClients();
  const [workspaceSnapshot, summarySnapshot, workspaceControl, platformControl] = await Promise.all([
    db.doc(`workspaces/${actor.workspaceId}`).get(),
    db.doc(`workspaces/${actor.workspaceId}/dashboard/current`).get(),
    getWorkspaceExecutionControl(actor.workspaceId),
    getPlatformExecutionControl()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This workspace was not found.");
  }

  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, actor.workspaceId);
  const summary = mapDashboardSummaryRecord(
    summarySnapshot.exists ? workspaceRecordFromSnapshot(summarySnapshot, "summaryId") : null,
    actor.workspaceId
  );
  const workspaceExecution = await summarizeWorkspaceExecution({
    workspace,
    summary,
    workspaceControl,
    platformControl
  });
  const warnings = [
    `Crypto execution dashboards use bounded workspace sampling of up to ${WORKSPACE_EXECUTION_STUDENT_SAMPLE_LIMIT} students and do not expose protected secrets.`
  ];

  if (!summarySnapshot.exists) {
    warnings.push(
      `workspaces/${workspace.workspaceId}/dashboard/current is missing; execution counts were derived from bounded execution reads.`
    );
  }

  if (workspaceExecution.bounded) {
    warnings.push(
      `Workspace student execution sampling reached ${WORKSPACE_EXECUTION_STUDENT_SAMPLE_LIMIT} students; counts are a bounded operational sample.`
    );
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId: workspace.workspaceId,
    workspaceControl,
    summary: {
      connectionCounts: workspaceExecution.connectionCounts,
      readinessCounts: workspaceExecution.readinessCounts,
      recentFailureCount: workspaceExecution.recentFailureCount,
      sampledConnectionCount: workspaceExecution.sampledConnectionCount,
      autoCopyPosture: workspaceExecution.autoCopyPosture,
      paperRouting: workspaceExecution.paperRouting,
      paperExecution: workspaceExecution.paperExecution,
      forexPaper: workspaceExecution.forexPaper,
      forexDemo: workspaceExecution.forexDemo,
      forexLiveCanary: workspaceExecution.forexLiveCanary,
      forexConnections: workspaceExecution.forexConnections,
      forexProvisioning: workspaceExecution.forexProvisioning,
      accountLinkedPerformance: workspaceExecution.accountLinkedPerformance,
      accountLinkedDiagnostics: workspaceExecution.accountLinkedDiagnostics,
      liveSandbox: workspaceExecution.liveSandbox,
      liveProduction: workspaceExecution.liveProduction,
      broadLiveReadiness: workspaceExecution.broadLiveReadiness,
      updatedAt: workspaceExecution.updatedAt
    }
  };
}

export async function getAdminWorkspaceCryptoExecutionOverview(
  actor: VerifiedSuperAdmin,
  workspaceIdValue: unknown
): Promise<WorkspaceCryptoExecutionOverviewResponse> {
  const hasVerifiedActor = Boolean(actor.uid);
  const workspaceId = sanitizeWorkspaceId(workspaceIdValue);

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before loading crypto execution details.");
  }

  const { db } = getFirebaseAdminClients();
  const [workspaceSnapshot, summarySnapshot, workspaceControl, platformControl] = await Promise.all([
    db.doc(`workspaces/${workspaceId}`).get(),
    db.doc(`workspaces/${workspaceId}/dashboard/current`).get(),
    getWorkspaceExecutionControl(workspaceId),
    getPlatformExecutionControl()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This workspace was not found.");
  }

  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, workspaceId);
  const summary = mapDashboardSummaryRecord(
    summarySnapshot.exists ? workspaceRecordFromSnapshot(summarySnapshot, "summaryId") : null,
    workspaceId
  );
  const workspaceExecution = await summarizeWorkspaceExecution({
    workspace,
    summary,
    workspaceControl,
    platformControl
  });
  const warnings = [
    hasVerifiedActor
      ? `Super Admin workspace crypto overview is scoped to ${workspace.workspaceId} and bounded to ${WORKSPACE_EXECUTION_STUDENT_SAMPLE_LIMIT} sampled students.`
      : "Super Admin workspace crypto overview requires a verified actor."
  ];

  if (!summarySnapshot.exists) {
    warnings.push(
      `workspaces/${workspace.workspaceId}/dashboard/current is missing; execution counts were derived from bounded execution reads.`
    );
  }

  if (workspaceExecution.bounded) {
    warnings.push(
      `Workspace student execution sampling reached ${WORKSPACE_EXECUTION_STUDENT_SAMPLE_LIMIT} students; counts are a bounded operational sample.`
    );
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId: workspace.workspaceId,
    workspaceControl,
    summary: {
      connectionCounts: workspaceExecution.connectionCounts,
      readinessCounts: workspaceExecution.readinessCounts,
      recentFailureCount: workspaceExecution.recentFailureCount,
      sampledConnectionCount: workspaceExecution.sampledConnectionCount,
      autoCopyPosture: workspaceExecution.autoCopyPosture,
      paperRouting: workspaceExecution.paperRouting,
      paperExecution: workspaceExecution.paperExecution,
      forexPaper: workspaceExecution.forexPaper,
      forexDemo: workspaceExecution.forexDemo,
      forexLiveCanary: workspaceExecution.forexLiveCanary,
      forexConnections: workspaceExecution.forexConnections,
      forexProvisioning: workspaceExecution.forexProvisioning,
      accountLinkedPerformance: workspaceExecution.accountLinkedPerformance,
      accountLinkedDiagnostics: workspaceExecution.accountLinkedDiagnostics,
      liveSandbox: workspaceExecution.liveSandbox,
      liveProduction: workspaceExecution.liveProduction,
      broadLiveReadiness: workspaceExecution.broadLiveReadiness,
      updatedAt: workspaceExecution.updatedAt
    }
  };
}

export async function getAdminCryptoExecutionOverview(
  actor: VerifiedSuperAdmin
): Promise<AdminCryptoExecutionOverviewResponse> {
  const hasVerifiedActor = Boolean(actor.uid);
  const { db } = getFirebaseAdminClients();
  const [platformControlSnapshot, platformSummarySnapshot] = await Promise.all([
    db.doc("platform_execution_controls/current").get(),
    db.doc("platform_summaries/current").get()
  ]);
  const platformControl = mapPlatformExecutionControlRecord(
    platformControlSnapshot.exists
      ? recordFromSnapshot(platformControlSnapshot, "controlId")
      : null
  );
  const platformSummaryRecord = platformSummarySnapshot.exists
    ? recordFromSnapshot(platformSummarySnapshot, "summaryId")
    : null;
  const summaryUpdatedAt =
    typeof platformSummaryRecord?.updatedAt === "string"
      ? platformSummaryRecord.updatedAt
      : new Date().toISOString();
  const warnings = [
    hasVerifiedActor
      ? "Super Admin platform crypto overview is zero-safe until a workspace is selected; it does not scan workspace execution collections."
      : "Super Admin platform crypto overview requires a verified actor and does not scan workspace execution collections."
  ];

  if (!platformSummarySnapshot.exists) {
    warnings.push("platform_summaries/current is missing; zero-safe crypto execution counts were returned.");
  }
  const accountLinkedDiagnostics = await loadAdminAccountLinkedLedgerDiagnostics();
  const forexLiveCanaryPreview = emptyForexLiveCanaryExecutionPreview(summaryUpdatedAt);
  const liveProductionPreview = {
    visibleLimit: 4,
    env: {
      productionBetaEnabled: false,
      productionOrdersEnabled: false,
      productionDryRun: true,
      productionCanaryEnabled: false,
      legacyLiveFlagIneffective: true,
      productionVaultReady: false
    },
    preflightReady: false,
    preflightChecks: [
      {
        key: "workspace_required",
        label: "Workspace preview",
        status: "unknown" as const,
        safeMessage: "Select a workspace to evaluate production readiness without scanning all workspaces."
      }
    ],
    balancePrecheck: {
      status: "unavailable" as const,
      safeMessage: "Select a workspace and canary candidate before balance precheck status is available."
    },
    intents: [],
    orderAttempts: [],
    reconciliations: [],
    auditEvents: [],
    bounded: {
      intents: false,
      orderAttempts: false,
      reconciliations: false,
      auditEvents: false
    },
    warnings: ["Select a workspace to load production live beta records. Platform overview does not scan workspace execution collections."]
  };
  const broadLiveReadiness = buildBroadLiveAutoCopyReadinessOverview({
    scope: "platform",
    platformControl,
    liveProduction: liveProductionPreview,
    forexLiveCanary: forexLiveCanaryPreview,
    recentFailureCount: 0
  });

  return {
    ...createSourceMeta(warnings),
    ok: true,
    platformControl,
    summary: {
      workspaceKillSwitchCount: 0,
      riskyWorkspaceCount: 0,
      recentFailureCount: 0,
      paperRouting: emptyPaperRoutingOverview(summaryUpdatedAt),
      paperExecution: emptyPaperExecutionPreview(),
      forexPaper: emptyForexPaperExecutionPreview(summaryUpdatedAt),
      forexDemo: emptyForexDemoExecutionPreview(summaryUpdatedAt),
      forexLiveCanary: forexLiveCanaryPreview,
      forexConnections: emptyForexConnectionPreview(summaryUpdatedAt),
      forexProvisioning: emptyForexProvisioningExecutionPreview(summaryUpdatedAt),
      accountLinkedDiagnostics,
      liveSandbox: {
        visibleLimit: 4,
        intents: [],
        orderAttempts: [],
        reconciliations: [],
        auditEvents: [],
        bounded: {
          intents: false,
          orderAttempts: false,
          reconciliations: false,
          auditEvents: false
        },
        warnings: ["Select a workspace to load live sandbox execution records."]
      },
      liveProduction: liveProductionPreview,
      broadLiveReadiness,
      sampledWorkspaceCount: 0,
      updatedAt: summaryUpdatedAt
    }
  };
}

export {
  buildExecutionIntentId,
  buildOrderAttemptIdempotencyKey
};
