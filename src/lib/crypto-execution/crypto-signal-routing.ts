import "server-only";

import type { Firestore, WriteBatch } from "firebase-admin/firestore";
import { mapSubscriptionRecord, recordFromSnapshot as billingRecordFromSnapshot } from "@/lib/billing/billing-mappers";
import {
  evaluateStaleSignalPolicy,
  mapCrossAssetAutoCopyPreferencesRecord
} from "@/lib/crypto-execution/auto-copy-preferences";
import { isTradeCopierBillingActive } from "@/lib/student-copier/student-copier-billing";
import {
  evaluateCryptoSignalRiskCandidate,
  normalizeCryptoSignalSymbol,
  type CryptoRiskCandidate
} from "@/lib/crypto-execution/crypto-risk-engine";
import {
  mapExchangeConnectionRecord,
  mapPlatformExecutionControlRecord,
  mapStudentExecutionPreferencesRecord,
  mapWorkspaceExecutionControlRecord,
  recordFromSnapshot as cryptoRecordFromSnapshot,
  toExchangeConnectionSummary
} from "@/lib/crypto-execution/crypto-execution-mappers";
import {
  buildExecutionIntentId,
  resolveCryptoExecutionReadiness
} from "@/lib/crypto-execution/crypto-execution-validation";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { isPublishedRoutableTradeHubSignalForMarket } from "@/lib/signals/tradehub-signal-source-guards";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import {
  mapWorkspaceForDashboard,
  recordFromSnapshot as workspaceRecordFromSnapshot
} from "@/lib/workspace/dashboard-mappers";
import type {
  CryptoSignalRoutingSummary,
  CryptoSignalRoutingTrigger,
  CrossAssetAutoCopyConfirmationRecord,
  CrossAssetStaleSignalDecisionRecord,
  ExecutionAuditAction,
  ExecutionRiskDecisionRecord,
  SignalExecutionIntentRecord
} from "@/types/crypto-execution";
import type { WorkspaceSignalRecord } from "@/types/workspace-dashboard";

export const CRYPTO_ROUTING_CANDIDATE_LIMIT = 25;
const STUDENT_CONNECTION_LIMIT = 10;

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

function routingAuditEvent({
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
  actor: VerifiedInfluencer;
  workspaceId: string;
  studentId?: string;
  targetType: "signal" | "intent" | "risk_decision";
  targetId: string;
  safeMessage: string;
  after?: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
}) {
  return stripUndefined({
    action,
    actorType: "influencer" as const,
    actorId: actor.uid,
    workspaceId,
    studentId,
    targetType,
    targetId,
    safeMessage,
    severity,
    after,
    createdAt: new Date().toISOString()
  });
}

function queueAuditEvent(
  db: Firestore,
  batch: WriteBatch,
  input: Parameters<typeof routingAuditEvent>[0]
) {
  const eventRef = db.collection(`workspaces/${input.workspaceId}/execution_audit_events`).doc();
  batch.set(eventRef, {
    eventId: eventRef.id,
    ...routingAuditEvent(input)
  });
}

async function getPlatformExecutionControl() {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc("platform_execution_controls/current").get();

  return mapPlatformExecutionControlRecord(
    snapshot.exists ? cryptoRecordFromSnapshot(snapshot, "controlId") : null
  );
}

async function getWorkspaceExecutionControl(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc(`workspaces/${workspaceId}/execution_controls/current`).get();

  return mapWorkspaceExecutionControlRecord(
    snapshot.exists ? cryptoRecordFromSnapshot(snapshot, "controlId") : null,
    workspaceId
  );
}

function buildIntentIdempotencyKey({
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
    "crypto-paper-intent",
    workspaceId,
    signalId,
    studentId,
    connectionId,
    intentId
  ]
    .join(":")
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, "_")
    .slice(0, 220);
}

function buildRiskDecisionRecord({
  workspaceId,
  signalId,
  studentId,
  connectionId,
  intentId,
  status,
  checks,
  blockedReason,
  now
}: Omit<ExecutionRiskDecisionRecord, "decisionId" | "decidedAt" | "decidedBy"> & {
  now: string;
}) {
  const decisionId = `risk_${intentId}`.slice(0, 120);

  return stripUndefined({
    decisionId,
    workspaceId,
    intentId,
    signalId,
    studentId,
    connectionId,
    status,
    checks,
    blockedReason,
    decidedAt: now,
    decidedBy: "crypto-risk-engine:v1"
  }) satisfies ExecutionRiskDecisionRecord;
}

function buildPaperIntentRecord({
  signal,
  studentId,
  connectionId,
  exchange,
  intentId,
  riskDecisionId,
  entitlements,
  symbol,
  now
}: {
  signal: WorkspaceSignalRecord;
  studentId: string;
  connectionId: string;
  exchange: SignalExecutionIntentRecord["exchange"];
  intentId: string;
  riskDecisionId: string;
  entitlements: CryptoRiskCandidate["entitlements"];
  symbol: string;
  now: string;
}) {
  const expiresAt = new Date(Date.parse(now) + 1000 * 60 * 60 * 24 * 7).toISOString();

  return stripUndefined({
    intentId,
    workspaceId: signal.workspaceId,
    signalId: signal.signalId,
    studentId,
    connectionId,
    exchange,
    market: "crypto",
    symbol,
    side: signal.direction,
    orderType: "limit",
    status: "ready_for_paper",
    idempotencyKey: buildIntentIdempotencyKey({
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      studentId,
      connectionId,
      intentId
    }),
    sourceSignalVersion: signal.updatedAt,
    riskDecisionId,
    paperTradingOnly: true,
    entitlementSnapshot: {
      tierId: entitlements.tierId,
      tierLabel: entitlements.tierLabel,
      subscriptionStatus: entitlements.subscriptionStatus,
      riskPosture: entitlements.riskPosture,
      autoCopyAccess: entitlements.features.autoCopy.access
    },
    createdAt: now,
    updatedAt: now,
    expiresAt
  }) satisfies SignalExecutionIntentRecord;
}

function buildConfirmationRecord({
  signal,
  studentId,
  reason,
  now
}: {
  signal: WorkspaceSignalRecord;
  studentId: string;
  reason: "execution_mode" | "stale_signal";
  now: string;
}): CrossAssetAutoCopyConfirmationRecord {
  const confirmationId = [
    "confirm",
    signal.workspaceId,
    signal.signalId,
    studentId,
    reason
  ].join("_").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 140);

  return stripUndefined({
    confirmationId,
    workspaceId: signal.workspaceId,
    studentId,
    signalId: signal.signalId,
    market: "crypto",
    status: "waiting_for_student_confirmation",
    symbolOrPair: normalizeCryptoSignalSymbol(signal.pair),
    reason,
    safeMessage: reason === "stale_signal"
      ? "Signal is stale for this student and requires confirmation before execution."
      : "Student requires confirmation before execution.",
    createdAt: now,
    expiresAt: new Date(Date.parse(now) + 1000 * 60 * 15).toISOString(),
    updatedAt: now
  }) satisfies CrossAssetAutoCopyConfirmationRecord;
}

function buildStaleDecisionRecord(
  decision: CrossAssetStaleSignalDecisionRecord
): CrossAssetStaleSignalDecisionRecord {
  return stripUndefined(decision);
}

export async function routePublishedCryptoSignalForPaperExecution({
  actor,
  signal,
  trigger
}: {
  actor: VerifiedInfluencer;
  signal: WorkspaceSignalRecord;
  trigger: CryptoSignalRoutingTrigger;
}): Promise<CryptoSignalRoutingSummary> {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const warnings: string[] = [];
  let allowedCount = 0;
  let blockedCount = 0;
  let requiresReviewCount = 0;
  let intentCount = 0;

  if (!isPublishedRoutableTradeHubSignalForMarket(signal, "crypto")) {
    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      trigger,
      routed: false,
      candidateLimit: CRYPTO_ROUTING_CANDIDATE_LIMIT,
      candidateCount: 0,
      allowedCount,
      blockedCount,
      requiresReviewCount,
      intentCount,
      bounded: false,
      warnings: ["Crypto paper routing only runs for newly published in-app crypto signals."],
      completedAt: now
    };
  }

  const [
    workspaceSnapshot,
    workspaceControl,
    platformControl,
    studentSnapshot
  ] = await Promise.all([
    db.doc(`workspaces/${actor.workspaceId}`).get(),
    getWorkspaceExecutionControl(actor.workspaceId),
    getPlatformExecutionControl(),
    db.collection(`workspaces/${actor.workspaceId}/students`).limit(CRYPTO_ROUTING_CANDIDATE_LIMIT).get()
  ]);

  if (!workspaceSnapshot.exists) {
    warnings.push("Workspace shell is missing, so crypto paper routing could not evaluate students.");

    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      trigger,
      routed: false,
      candidateLimit: CRYPTO_ROUTING_CANDIDATE_LIMIT,
      candidateCount: 0,
      allowedCount,
      blockedCount,
      requiresReviewCount,
      intentCount,
      bounded: false,
      warnings,
      completedAt: now
    };
  }

  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, actor.workspaceId);
  const studentRecords = studentSnapshot.docs.map((doc) => workspaceRecordFromSnapshot(doc, "studentId"));
  const bounded = studentSnapshot.docs.length === CRYPTO_ROUTING_CANDIDATE_LIMIT;
  const batch = db.batch();

  queueAuditEvent(db, batch, {
    action: "routing.started",
    actor,
    workspaceId: actor.workspaceId,
    targetType: "signal",
    targetId: signal.signalId,
    safeMessage: "Crypto paper routing started for a newly published signal.",
    after: {
      signalId: signal.signalId,
      trigger,
      candidateLimit: CRYPTO_ROUTING_CANDIDATE_LIMIT
    }
  });

  if (bounded) {
    warnings.push(
      "Crypto paper routing reached the bounded candidate window. Add Cloud Tasks before routing large workspaces."
    );
    queueAuditEvent(db, batch, {
      action: "routing.bounded",
      actor,
      workspaceId: actor.workspaceId,
      targetType: "signal",
      targetId: signal.signalId,
      safeMessage: "Crypto paper routing reached the bounded candidate window.",
      after: {
        candidateLimit: CRYPTO_ROUTING_CANDIDATE_LIMIT
      },
      severity: "warning"
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
          db.doc(`workspaces/${actor.workspaceId}/students/${record.studentId}/execution_preferences/current`)
        )
      )
    : [];
  const autoCopyPreferenceSnapshots = studentRecords.length > 0
    ? await db.getAll(
        ...studentRecords.map((record) =>
          db.doc(`workspaces/${actor.workspaceId}/students/${record.studentId}/auto_copy_preferences/crypto`)
        )
      )
    : [];
  const cryptoAutoCopyBillingStates = await Promise.all(
    studentRecords.map((record) =>
      isTradeCopierBillingActive(actor.workspaceId, String(record.studentId ?? ""))
    )
  );
  const connectionSnapshots = await Promise.all(
    studentRecords.map((record) =>
      db
        .collection(`workspaces/${actor.workspaceId}/students/${record.studentId}/exchange_connections`)
        .limit(STUDENT_CONNECTION_LIMIT)
        .get()
    )
  );

  for (const [index, studentRecord] of studentRecords.entries()) {
    const studentId = String(studentRecord.studentId ?? "");
    const subscription = mapSubscriptionRecord(
      subscriptionSnapshots[index]?.exists
        ? billingRecordFromSnapshot(subscriptionSnapshots[index], "subscriptionId")
        : null,
      actor.workspaceId,
      studentId
    );
    const entitlements = resolveStudentEntitlements({
      workspace,
      studentRecord,
      subscription
    });
    const preferences = mapStudentExecutionPreferencesRecord(
      preferenceSnapshots[index]?.exists
        ? cryptoRecordFromSnapshot(preferenceSnapshots[index], "preferenceId")
        : null,
      actor.workspaceId,
      studentId
    );
    const autoCopyPreferences = mapCrossAssetAutoCopyPreferencesRecord({
      record: autoCopyPreferenceSnapshots[index]?.exists
        ? cryptoRecordFromSnapshot(autoCopyPreferenceSnapshots[index], "preferenceId")
        : null,
      workspaceId: actor.workspaceId,
      studentId,
      market: "crypto"
    });
    const connections = connectionSnapshots[index].docs
      .map((doc) =>
        mapExchangeConnectionRecord(cryptoRecordFromSnapshot(doc, "connectionId"), {
          workspaceId: actor.workspaceId,
          studentId,
          connectionId: doc.id
        })
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(toExchangeConnectionSummary);
    const readiness = resolveCryptoExecutionReadiness({
      entitlements,
      cryptoAutoCopy: {
        billing: {
          status: cryptoAutoCopyBillingStates[index].status,
          entitled: cryptoAutoCopyBillingStates[index].active,
          reason: cryptoAutoCopyBillingStates[index].reason
        },
        paymentIntents: [],
        bounded: { paymentIntents: false },
        warnings: [],
        updatedAt: new Date().toISOString()
      },
      preferences,
      connections,
      workspaceControl,
      platformControl
    });
    const evaluation = evaluateCryptoSignalRiskCandidate({
      signal,
      candidate: {
        studentId,
        entitlements,
        cryptoAutoCopyBilling: {
          active: cryptoAutoCopyBillingStates[index].active,
          reason: cryptoAutoCopyBillingStates[index].reason
        },
        preferences,
        autoCopyPreferences,
        connections,
        readiness,
        workspaceControl,
        platformControl
      }
    });
    const connectionId = evaluation.connection?.connectionId ?? "none";
    const intentId = buildExecutionIntentId({
      workspaceId: actor.workspaceId,
      signalId: signal.signalId,
      studentId,
      connectionId
    });
    const riskDecision = buildRiskDecisionRecord({
      workspaceId: actor.workspaceId,
      signalId: signal.signalId,
      studentId,
      connectionId,
      intentId,
      status: evaluation.status,
      checks: evaluation.checks,
      blockedReason: evaluation.blockedReason,
      now
    });

    batch.set(
      db.doc(`workspaces/${actor.workspaceId}/risk_decisions/${riskDecision.decisionId}`),
      riskDecision,
      { merge: true }
    );

    if (evaluation.status === "allowed" && evaluation.connection) {
      const intent = buildPaperIntentRecord({
        signal,
        studentId,
        connectionId: evaluation.connection.connectionId,
        exchange: evaluation.connection.exchange,
        intentId,
        riskDecisionId: riskDecision.decisionId,
        entitlements,
        symbol: normalizeCryptoSignalSymbol(signal.pair),
        now
      });

      batch.set(
        db.doc(`workspaces/${actor.workspaceId}/execution_intents/${intentId}`),
        intent,
        { merge: true }
      );
      queueAuditEvent(db, batch, {
        action: "intent.created",
        actor,
        workspaceId: actor.workspaceId,
        studentId,
        targetType: "intent",
        targetId: intentId,
        safeMessage: "Crypto paper execution intent was created for a published signal.",
        after: {
          signalId: signal.signalId,
          status: "ready_for_paper",
          market: "crypto",
          symbol: intent.symbol,
          paperTradingOnly: true
        }
      });
      allowedCount += 1;
      intentCount += 1;
    } else if (evaluation.status === "requires_review") {
      const staleDecision = evaluateStaleSignalPolicy({
        signal,
        preferences: autoCopyPreferences
      });
      const requiresStaleConfirmation = staleDecision.outcome === "require_confirmation";
      const requiresModeConfirmation = autoCopyPreferences.executionMode === "confirm_before_execute";

      if (staleDecision.outcome !== "route_normally") {
        batch.set(
          db.doc(`workspaces/${actor.workspaceId}/stale_signal_decisions/${staleDecision.decisionId}`),
          buildStaleDecisionRecord(staleDecision),
          { merge: true }
        );
      }

      if (requiresStaleConfirmation || requiresModeConfirmation) {
        const confirmation = buildConfirmationRecord({
          signal,
          studentId,
          reason: requiresStaleConfirmation ? "stale_signal" : "execution_mode",
          now
        });
        batch.set(
          db.doc(`workspaces/${actor.workspaceId}/auto_copy_confirmations/${confirmation.confirmationId}`),
          confirmation,
          { merge: true }
        );
      }

      requiresReviewCount += 1;
    } else {
      blockedCount += 1;
      queueAuditEvent(db, batch, {
        action: "risk.blocked",
        actor,
        workspaceId: actor.workspaceId,
        studentId,
        targetType: "risk_decision",
        targetId: riskDecision.decisionId,
        safeMessage: evaluation.blockedReason ?? "Crypto paper routing was blocked by risk policy.",
        after: {
          signalId: signal.signalId,
          status: "blocked"
        },
        severity: "warning"
      });
    }
  }

  queueAuditEvent(db, batch, {
    action: "routing.completed",
    actor,
    workspaceId: actor.workspaceId,
    targetType: "signal",
    targetId: signal.signalId,
    safeMessage: "Crypto paper routing completed for a newly published signal.",
    after: {
      signalId: signal.signalId,
      allowedCount,
      blockedCount,
      requiresReviewCount,
      intentCount,
      bounded
    }
  });

  await batch.commit();

  return {
    workspaceId: signal.workspaceId,
    signalId: signal.signalId,
    trigger,
    routed: true,
    candidateLimit: CRYPTO_ROUTING_CANDIDATE_LIMIT,
    candidateCount: studentRecords.length,
    allowedCount,
    blockedCount,
    requiresReviewCount,
    intentCount,
    bounded,
    warnings,
    completedAt: now
  };
}
