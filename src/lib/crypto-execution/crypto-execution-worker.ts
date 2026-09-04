import "server-only";

import {
  mapExchangeConnectionRecord,
  mapPlatformExecutionControlRecord,
  mapWorkspaceExecutionControlRecord,
  recordFromSnapshot
} from "@/lib/crypto-execution/crypto-execution-mappers";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import type {
  CryptoExecutionMode,
  CryptoExecutionWorkerRunResponse,
  CryptoOrderAttemptRecord,
  ExecutionAuditAction,
  OrderAttemptStatus,
  SignalExecutionIntentRecord
} from "@/types/crypto-execution";

const WORKER_CANDIDATE_LIMIT = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLimit(value: unknown) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return WORKER_CANDIDATE_LIMIT;
  }

  return Math.min(parsed, WORKER_CANDIDATE_LIMIT);
}

function sanitizeWorkspaceId(value: unknown) {
  return asString(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
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

function createSourceMeta(warnings: string[] = []) {
  return {
    source: "firestore" as const,
    sourceLabel: "Firestore live",
    sourceMessage: "Crypto execution worker data was handled through server-side Firebase Admin SDK routes.",
    warnings
  };
}

function liveExecutionEnabled() {
  return process.env.CRYPTO_EXECUTION_LIVE_ENABLED === "true";
}

function normalizeIntent(record: Record<string, unknown>): SignalExecutionIntentRecord {
  return {
    intentId: asString(record.intentId),
    workspaceId: asString(record.workspaceId),
    signalId: asString(record.signalId),
    studentId: asString(record.studentId),
    connectionId: asString(record.connectionId),
    exchange: record.exchange === "bybit" ? "bybit" : "binance",
    market: "crypto",
    symbol: asString(record.symbol),
    side: record.side === "sell" ? "sell" : "buy",
    orderType: record.orderType === "market" ? "market" : "limit",
    quantity: asString(record.quantity) || undefined,
    quoteOrderQty: asString(record.quoteOrderQty) || undefined,
    limitPrice: asString(record.limitPrice) || undefined,
    status: record.status === "ready_for_paper" ? "ready_for_paper" : "created",
    idempotencyKey: asString(record.idempotencyKey),
    sourceSignalVersion: asString(record.sourceSignalVersion) || undefined,
    riskDecisionId: asString(record.riskDecisionId) || undefined,
    paperTradingOnly: record.paperTradingOnly !== false,
    entitlementSnapshot: isRecord(record.entitlementSnapshot)
      ? record.entitlementSnapshot as SignalExecutionIntentRecord["entitlementSnapshot"]
      : {
          tierId: "unknown",
          tierLabel: "Unknown tier",
          subscriptionStatus: "unknown",
          riskPosture: "unknown",
          autoCopyAccess: "feature_not_enabled"
        },
    createdAt: asString(record.createdAt) || new Date().toISOString(),
    updatedAt: asString(record.updatedAt) || new Date().toISOString(),
    expiresAt: asString(record.expiresAt) || undefined
  };
}

function buildClientOrderId(intent: SignalExecutionIntentRecord) {
  return `th_${intent.intentId}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 36);
}

function buildOrderAttemptId(intent: SignalExecutionIntentRecord) {
  return `attempt_${intent.intentId}_1`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 120);
}

async function getPlatformExecutionControl() {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc("platform_execution_controls/current").get();

  return mapPlatformExecutionControlRecord(snapshot.exists ? recordFromSnapshot(snapshot, "controlId") : null);
}

async function getWorkspaceExecutionControl(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc(`workspaces/${workspaceId}/execution_controls/current`).get();

  return mapWorkspaceExecutionControlRecord(
    snapshot.exists ? recordFromSnapshot(snapshot, "controlId") : null,
    workspaceId
  );
}

async function appendWorkerAuditEvent({
  action,
  actor,
  workspaceId,
  studentId,
  targetType,
  targetId,
  safeMessage,
  after,
  severity = "info"
}: {
  action: ExecutionAuditAction;
  actor: VerifiedSuperAdmin;
  workspaceId: string;
  studentId?: string;
  targetType: "intent" | "order_attempt";
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
    actorType: "super_admin",
    actorId: actor.uid,
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

async function writeOrderAttempt({
  intent,
  executionMode,
  status,
  sanitizedFailureCode,
  sanitizedFailureReason,
  exchangeOrderId,
  exchangeClientOrderId,
  completedAt
}: {
  intent: SignalExecutionIntentRecord;
  executionMode: CryptoExecutionMode;
  status: OrderAttemptStatus;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  exchangeOrderId?: string;
  exchangeClientOrderId?: string;
  completedAt?: string;
}) {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const attempt: CryptoOrderAttemptRecord = stripUndefined({
    orderAttemptId: buildOrderAttemptId(intent),
    workspaceId: intent.workspaceId,
    intentId: intent.intentId,
    signalId: intent.signalId,
    studentId: intent.studentId,
    connectionId: intent.connectionId,
    exchange: intent.exchange,
    executionMode,
    symbol: intent.symbol,
    side: intent.side,
    orderType: intent.orderType,
    status,
    idempotencyKey: `${intent.idempotencyKey}:attempt:1`,
    attemptNumber: 1,
    requestedQuantity: intent.quantity,
    requestedQuoteOrderQty: intent.quoteOrderQty,
    requestedPrice: intent.limitPrice,
    exchangeOrderId,
    exchangeClientOrderId,
    sanitizedFailureCode,
    sanitizedFailureReason,
    requestedAt: now,
    acknowledgedAt: status === "acknowledged" || status === "filled" ? now : undefined,
    completedAt,
    updatedAt: now
  });

  await db.doc(`workspaces/${intent.workspaceId}/order_attempts/${attempt.orderAttemptId}`).set(
    attempt,
    { merge: true }
  );

  return attempt;
}

async function failIntentAttempt({
  actor,
  intent,
  code,
  message
}: {
  actor: VerifiedSuperAdmin;
  intent: SignalExecutionIntentRecord;
  code: string;
  message: string;
}) {
  const { db } = getFirebaseAdminClients();
  const attempt = await writeOrderAttempt({
    intent,
    executionMode: "paper",
    status: "failed",
    sanitizedFailureCode: code,
    sanitizedFailureReason: message
  });

  await db.doc(`workspaces/${intent.workspaceId}/execution_intents/${intent.intentId}`).set(
    {
      status: "risk_blocked",
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
  await appendWorkerAuditEvent({
    action: "order.failed",
    actor,
    workspaceId: intent.workspaceId,
    studentId: intent.studentId,
    targetType: "order_attempt",
    targetId: attempt.orderAttemptId,
    safeMessage: message,
    after: {
      intentId: intent.intentId,
      status: "failed",
      sanitizedFailureCode: code
    },
    severity: "warning"
  });
}

async function skipIntentWithAudit({
  actor,
  intent,
  message,
  code
}: {
  actor: VerifiedSuperAdmin;
  intent: SignalExecutionIntentRecord;
  message: string;
  code: string;
}) {
  await appendWorkerAuditEvent({
    action: "order.skipped",
    actor,
    workspaceId: intent.workspaceId,
    studentId: intent.studentId,
    targetType: "intent",
    targetId: intent.intentId,
    safeMessage: message,
    after: {
      intentId: intent.intentId,
      status: intent.status,
      paperTradingOnly: intent.paperTradingOnly,
      sanitizedFailureCode: code
    },
    severity: "warning"
  });
}

export async function runCryptoExecutionWorker(
  actor: VerifiedSuperAdmin,
  payload: unknown
): Promise<CryptoExecutionWorkerRunResponse> {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid crypto execution worker payload.");
  }

  const workspaceId = sanitizeWorkspaceId(payload.workspaceId);

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before running the crypto execution worker.");
  }

  const limit = normalizeLimit(payload.limit);
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const liveEnabled = liveExecutionEnabled();
  const warnings: string[] = [];
  let processedCount = 0;
  let completedPaperCount = 0;
  const liveAttemptCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const [workspaceControl, platformControl, intentSnapshot] = await Promise.all([
    getWorkspaceExecutionControl(workspaceId),
    getPlatformExecutionControl(),
    db
      .collection(`workspaces/${workspaceId}/execution_intents`)
      .where("status", "==", "ready_for_paper")
      .limit(limit)
      .get()
  ]);

  if (platformControl.killSwitchEnabled || workspaceControl.killSwitchEnabled) {
    warnings.push("Crypto execution worker did not process intents because a kill switch is enabled.");

    return {
      ...createSourceMeta(warnings),
      ok: true,
      workspaceId,
      liveExecutionEnabled: liveEnabled,
      candidateLimit: limit,
      candidateCount: intentSnapshot.docs.length,
      processedCount,
      completedPaperCount,
      liveAttemptCount,
      skippedCount: intentSnapshot.docs.length,
      failedCount,
      bounded: intentSnapshot.docs.length === limit,
      warnings,
      updatedAt: now
    };
  }

  const bounded = intentSnapshot.docs.length === limit;

  if (bounded) {
    warnings.push("Crypto execution worker reached its bounded intent window. Run again to process the next page.");
  }

  for (const intentDoc of intentSnapshot.docs) {
    const intent = normalizeIntent(recordFromSnapshot(intentDoc, "intentId"));
    const attemptId = buildOrderAttemptId(intent);
    const attemptSnapshot = await db.doc(`workspaces/${workspaceId}/order_attempts/${attemptId}`).get();

    if (attemptSnapshot.exists) {
      skippedCount += 1;
      continue;
    }

    if (intent.expiresAt && Date.parse(intent.expiresAt) <= Date.now()) {
      await db.doc(`workspaces/${workspaceId}/execution_intents/${intent.intentId}`).set(
        {
          status: "expired",
          updatedAt: now
        },
        { merge: true }
      );
      skippedCount += 1;
      continue;
    }

    const connectionSnapshot = await db
      .doc(`workspaces/${workspaceId}/students/${intent.studentId}/exchange_connections/${intent.connectionId}`)
      .get();
    const connection = connectionSnapshot.exists
      ? mapExchangeConnectionRecord(recordFromSnapshot(connectionSnapshot, "connectionId"), {
          workspaceId,
          studentId: intent.studentId,
          connectionId: intent.connectionId
        })
      : null;

    if (
      !connection ||
      connection.status !== "verified" ||
      connection.permissionVerification !== "passed" ||
      connection.withdrawalPermission !== "confirmed_disabled"
    ) {
      await failIntentAttempt({
        actor,
        intent,
        code: "connection_not_executable",
        message: "Exchange connection is no longer verified for execution."
      });
      failedCount += 1;
      continue;
    }

    if (!intent.paperTradingOnly || intent.status !== "ready_for_paper") {
      await skipIntentWithAudit({
        actor,
        intent,
        code: "paper_worker_rejected_non_paper_intent",
        message: "Paper worker skipped an intent that was not explicitly paper-only and ready for paper."
      });
      skippedCount += 1;
      continue;
    }

    const attempt = await writeOrderAttempt({
      intent,
      executionMode: "paper",
      status: "filled",
      exchangeClientOrderId: buildClientOrderId(intent),
      completedAt: now
    });

    await db.doc(`workspaces/${workspaceId}/execution_intents/${intent.intentId}`).set(
      {
        status: "completed_paper",
        updatedAt: now
      },
      { merge: true }
    );
    await appendWorkerAuditEvent({
      action: "order.planned",
      actor,
      workspaceId,
      studentId: intent.studentId,
      targetType: "order_attempt",
      targetId: attempt.orderAttemptId,
      safeMessage: "Paper execution attempt completed without contacting an exchange.",
      after: {
        intentId: intent.intentId,
        executionMode: "paper",
        status: "filled",
        symbol: intent.symbol
      }
    });
    processedCount += 1;
    completedPaperCount += 1;
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId,
    liveExecutionEnabled: liveEnabled,
    candidateLimit: limit,
    candidateCount: intentSnapshot.docs.length,
    processedCount,
    completedPaperCount,
    liveAttemptCount,
    skippedCount,
    failedCount,
    bounded,
    warnings,
    updatedAt: new Date().toISOString()
  };
}
