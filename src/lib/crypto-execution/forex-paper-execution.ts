import "server-only";

import type { Firestore, WriteBatch } from "firebase-admin/firestore";
import { mapSubscriptionRecord, recordFromSnapshot as billingRecordFromSnapshot } from "@/lib/billing/billing-mappers";
import {
  defaultCrossAssetAutoCopyPreferences,
  evaluateStaleSignalPolicy,
  mapCrossAssetAutoCopyPreferencesRecord
} from "@/lib/crypto-execution/auto-copy-preferences";
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
import {
  normalizeSignalPairForMarket
} from "@/lib/workspace/signal-symbols";
import type {
  CrossAssetAutoCopyConfirmationRecord,
  CrossAssetAutoCopyPreferencesRecord,
  CrossAssetStaleSignalDecisionRecord,
  ExecutionRiskCheck,
  ForexConfirmationSummary,
  ForexExecutionAuditEventRecord,
  ForexExecutionAuditEventSummary,
  ForexPaperAttemptRecord,
  ForexPaperAttemptSummary,
  ForexPaperExecutionIntentRecord,
  ForexPaperExecutionPreview,
  ForexPaperIntentStatus,
  ForexPaperIntentSummary,
  ForexPaperRoutingOverview,
  ForexPaperRoutingSummary,
  ForexPaperWorkerRunResponse,
  ForexRiskDecisionRecord,
  ForexRiskDecisionSummary,
  RiskDecisionStatus
} from "@/types/crypto-execution";
import type { StudentEntitlementSummary } from "@/types/entitlements";
import type { WorkspaceSignalRecord } from "@/types/workspace-dashboard";

export const FOREX_PAPER_CANDIDATE_LIMIT = 25;
const FOREX_PAPER_WORKER_DEFAULT_LIMIT = 5;
const FOREX_PAPER_WORKER_MAX_LIMIT = 10;
const FOREX_PAPER_VISIBLE_LIMIT = 4;
const FOREX_PAPER_READ_LIMIT = FOREX_PAPER_VISIBLE_LIMIT + 1;
const FOREX_PAPER_OVERVIEW_LIMIT = 50;

type ForexRiskEvaluationResult = {
  status: RiskDecisionStatus;
  checks: ExecutionRiskCheck[];
  blockedReason?: string;
  pair: string;
  simulatedNotional: number;
  riskEstimateLabel: string;
  confirmationReason?: "execution_mode" | "stale_signal";
  staleDecision: CrossAssetStaleSignalDecisionRecord;
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
    sourceMessage: "Forex paper execution data was loaded through server-side Firebase Admin SDK routes.",
    warnings
  };
}

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeWorkspaceId(value: unknown) {
  return safeString(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function normalizeForexPair(value: string) {
  return normalizeSignalPairForMarket(value, "forex") ?? "";
}

function firstNumericLevel(value: string) {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function directionalLevelsAreValid({
  side,
  entry,
  takeProfit,
  stopLoss
}: {
  side: WorkspaceSignalRecord["direction"];
  entry: number | null;
  takeProfit: number | null;
  stopLoss: number | null;
}) {
  if (!entry || !takeProfit || !stopLoss) {
    return false;
  }

  return side === "buy"
    ? takeProfit > entry && stopLoss < entry
    : takeProfit < entry && stopLoss > entry;
}

function buildCheck(
  key: ExecutionRiskCheck["key"],
  status: RiskDecisionStatus,
  message: string
): ExecutionRiskCheck {
  return { key, status, message };
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

function normalizeForexIntentStatus(value: unknown): ForexPaperIntentStatus {
  switch (value) {
    case "ready_for_forex_paper":
    case "completed_forex_paper":
    case "blocked_forex_paper":
    case "confirmation_required":
    case "stale_expired":
    case "failed_forex_paper":
      return value;
    default:
      return "blocked_forex_paper";
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

function evaluateForexPaperRiskCandidate({
  signal,
  studentId,
  entitlements,
  preferences,
  now = new Date()
}: {
  signal: WorkspaceSignalRecord;
  studentId: string;
  entitlements: StudentEntitlementSummary;
  preferences?: CrossAssetAutoCopyPreferencesRecord;
  now?: Date;
}): ForexRiskEvaluationResult {
  const checks: ExecutionRiskCheck[] = [];
  const pair = normalizeForexPair(signal.pair);
  const entry = firstNumericLevel(signal.entry);
  const takeProfit = firstNumericLevel(signal.takeProfit);
  const stopLoss = firstNumericLevel(signal.stopLoss);
  const autoCopyEntitlement = entitlements.features.autoCopy;
  const autoCopyPreferences = preferences ?? defaultCrossAssetAutoCopyPreferences({
    workspaceId: signal.workspaceId,
    studentId,
    market: "forex"
  });
  const staleDecision = evaluateStaleSignalPolicy({
    signal,
    preferences: autoCopyPreferences,
    now
  });
  const simulatedNotional = autoCopyPreferences.sizingMode === "fixed_notional"
    ? Math.max(1, Math.min(autoCopyPreferences.maxFixedNotional, 10_000))
    : Math.max(1, Math.round(autoCopyPreferences.maxRiskPercentPerTrade * 100));
  const riskEstimateLabel = autoCopyPreferences.sizingMode === "fixed_notional"
    ? `Simulated fixed notional ${simulatedNotional}`
    : `Paper estimate from ${autoCopyPreferences.maxRiskPercentPerTrade}% risk`;

  checks.push(buildCheck(
    "signal_status",
    signal.status === "published" ? "allowed" : "blocked",
    signal.status === "published"
      ? "Signal is published."
      : "Only published forex signals can create paper execution records."
  ));
  checks.push(buildCheck(
    "signal_market",
    signal.market === "forex" ? "allowed" : "blocked",
    signal.market === "forex"
      ? "Signal market is forex."
      : "Crypto signals do not create forex paper execution records."
  ));
  checks.push(buildCheck(
    "signal_levels",
    entry && takeProfit && stopLoss ? "allowed" : "blocked",
    entry && takeProfit && stopLoss
      ? "Entry, take-profit, and stop-loss levels are present."
      : "Entry, take-profit, and stop-loss levels are required before forex paper routing."
  ));
  checks.push(buildCheck(
    "signal_directional_levels",
    directionalLevelsAreValid({ side: signal.direction, entry, takeProfit, stopLoss }) ? "allowed" : "blocked",
    directionalLevelsAreValid({ side: signal.direction, entry, takeProfit, stopLoss })
      ? "Signal levels match the trade direction."
      : signal.direction === "buy"
        ? "Buy signals require take-profit above entry and stop-loss below entry."
        : "Sell signals require take-profit below entry and stop-loss above entry."
  ));
  checks.push(buildCheck(
    "signal_symbol",
    pair ? "allowed" : "blocked",
    pair
      ? `Signal pair normalized to supported forex pair ${pair}.`
      : "forex_pair_invalid_for_market"
  ));
  checks.push(buildCheck(
    "entitlement_auto_copy",
    autoCopyEntitlement.access === "allowed" ? "allowed" : "blocked",
    autoCopyEntitlement.access === "allowed"
      ? "Stage 16 Auto-Copy entitlement allows this student."
      : autoCopyEntitlement.reason
  ));
  checks.push(buildCheck(
    "risk_posture",
    entitlements.riskPosture === "personal_account" ? "allowed" : "blocked",
    entitlements.riskPosture === "personal_account"
      ? "Student risk posture is personal account."
      : "Funded-account, prop-firm, or unknown risk posture stays Signal Alerts only."
  ));
  checks.push(buildCheck(
    "execution_mode",
    autoCopyPreferences.executionMode === "full_auto"
      ? "allowed"
      : autoCopyPreferences.executionMode === "confirm_before_execute"
        ? "requires_review"
        : "blocked",
    autoCopyPreferences.executionMode === "full_auto"
      ? "Student selected full-auto forex paper simulation."
      : autoCopyPreferences.executionMode === "confirm_before_execute"
        ? "Student requires confirmation before forex paper simulation."
        : "Student selected Signal Alerts only for forex."
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
      : "Student forex pause is off."
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
    autoCopyPreferences.allowedPairs.length === 0 || autoCopyPreferences.allowedPairs.includes(pair)
      ? "allowed"
      : "blocked",
    autoCopyPreferences.allowedPairs.length === 0 || autoCopyPreferences.allowedPairs.includes(pair)
      ? "Student forex pair allowlist permits this signal."
      : "Student forex pair allowlist does not include this pair."
  ));
  checks.push(buildCheck(
    "max_risk_per_trade",
    autoCopyPreferences.maxRiskPercentPerTrade > 0 && autoCopyPreferences.maxRiskPercentPerTrade <= 10
      ? "allowed"
      : "blocked",
    "Forex paper risk per trade is bounded by the student's shared preference."
  ));
  checks.push(buildCheck(
    "max_daily_loss",
    autoCopyPreferences.maxDailyLoss > 0 ? "allowed" : "blocked",
    autoCopyPreferences.maxDailyLoss > 0
      ? "Forex paper daily loss limit is configured."
      : "Forex paper daily loss limit is required."
  ));
  checks.push(buildCheck(
    "max_open_trades",
    autoCopyPreferences.maxOpenTrades > 0 && autoCopyPreferences.maxOpenTrades <= 25
      ? "allowed"
      : "blocked",
    "Forex paper max open trades is bounded by the student's shared preference."
  ));

  const failed = checks.filter((check) => check.status === "blocked");
  const requiresReview = checks.filter((check) => check.status === "requires_review");

  if (failed.length > 0) {
    return {
      status: "blocked",
      checks,
      blockedReason: failed[0]?.message ?? "Forex paper routing was blocked.",
      pair,
      simulatedNotional,
      riskEstimateLabel,
      staleDecision
    };
  }

  if (requiresReview.length > 0) {
    return {
      status: "requires_review",
      checks,
      blockedReason: requiresReview[0]?.message,
      pair,
      simulatedNotional,
      riskEstimateLabel,
      confirmationReason: staleDecision.outcome === "require_confirmation" ? "stale_signal" : "execution_mode",
      staleDecision
    };
  }

  return {
    status: "allowed",
    checks,
    pair,
    simulatedNotional,
    riskEstimateLabel,
    staleDecision
  };
}

function buildForexIntentId({
  workspaceId,
  signalId,
  studentId,
  pair,
  executionMode
}: {
  workspaceId: string;
  signalId: string;
  studentId: string;
  pair: string;
  executionMode: string;
}) {
  return deterministicId(["forex_paper", workspaceId, signalId, studentId, pair, executionMode], 140);
}

function buildForexIntentRecord({
  signal,
  studentId,
  intentId,
  riskDecisionId,
  entitlements,
  preferences,
  evaluation,
  now
}: {
  signal: WorkspaceSignalRecord;
  studentId: string;
  intentId: string;
  riskDecisionId: string;
  entitlements: StudentEntitlementSummary;
  preferences: CrossAssetAutoCopyPreferencesRecord;
  evaluation: ForexRiskEvaluationResult;
  now: string;
}): ForexPaperExecutionIntentRecord {
  return stripUndefined({
    intentId,
    workspaceId: signal.workspaceId,
    signalId: signal.signalId,
    studentId,
    market: "forex",
    pair: evaluation.pair,
    side: signal.direction,
    orderType: "paper_limit",
    status: "ready_for_forex_paper",
    executionMode: preferences.executionMode,
    sizingMode: preferences.sizingMode,
    simulatedNotional: evaluation.simulatedNotional,
    riskEstimateLabel: evaluation.riskEstimateLabel,
    idempotencyKey: `forex-paper-intent:${signal.workspaceId}:${signal.signalId}:${studentId}:${evaluation.pair}:${preferences.executionMode}`.toLowerCase(),
    sourceSignalVersion: signal.updatedAt,
    riskDecisionId,
    paperOnly: true,
    entitlementSnapshot: {
      tierId: entitlements.tierId,
      tierLabel: entitlements.tierLabel,
      subscriptionStatus: entitlements.subscriptionStatus,
      riskPosture: entitlements.riskPosture,
      autoCopyAccess: entitlements.features.autoCopy.access
    },
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.parse(now) + 1000 * 60 * 60 * 24 * 7).toISOString()
  }) satisfies ForexPaperExecutionIntentRecord;
}

function buildForexRiskDecisionRecord({
  signal,
  studentId,
  intentId,
  evaluation,
  now
}: {
  signal: WorkspaceSignalRecord;
  studentId: string;
  intentId: string;
  evaluation: ForexRiskEvaluationResult;
  now: string;
}): ForexRiskDecisionRecord {
  return stripUndefined({
    decisionId: deterministicId(["forex_risk", intentId], 140),
    workspaceId: signal.workspaceId,
    intentId,
    signalId: signal.signalId,
    studentId,
    pair: evaluation.pair,
    status: evaluation.status,
    checks: evaluation.checks,
    blockedReason: evaluation.blockedReason,
    decidedAt: now,
    decidedBy: "forex-paper-risk-engine:v1"
  }) satisfies ForexRiskDecisionRecord;
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
    confirmationId: deterministicId(["forex_confirm", signal.workspaceId, signal.signalId, studentId, reason], 140),
    workspaceId: signal.workspaceId,
    studentId,
    signalId: signal.signalId,
    market: "forex",
    status: "waiting_for_student_confirmation",
    symbolOrPair: pair,
    reason,
    safeMessage: reason === "stale_signal"
      ? "Forex signal is stale for this student and requires confirmation before paper simulation."
      : "Student requires confirmation before forex paper simulation.",
    expiresAt: new Date(Date.parse(now) + 1000 * 60 * 15).toISOString(),
    createdAt: now,
    updatedAt: now
  }) satisfies CrossAssetAutoCopyConfirmationRecord;
}

function queueForexAuditEvent(
  db: Firestore,
  batch: WriteBatch,
  input: Omit<ForexExecutionAuditEventRecord, "eventId" | "createdAt"> & { createdAt?: string }
) {
  const eventRef = db.collection(`workspaces/${input.workspaceId}/forex_execution_audit_events`).doc();
  batch.set(eventRef, stripUndefined({
    eventId: eventRef.id,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...input
  }));
}

export async function routePublishedForexSignalForPaperExecution({
  actor,
  signal,
  trigger
}: {
  actor: VerifiedInfluencer;
  signal: WorkspaceSignalRecord;
  trigger: "created_published" | "patched_published";
}): Promise<ForexPaperRoutingSummary> {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const warnings: string[] = [];
  let allowedCount = 0;
  let alertsOnlyCount = 0;
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
      candidateLimit: FOREX_PAPER_CANDIDATE_LIMIT,
      candidateCount: 0,
      allowedCount,
      alertsOnlyCount,
      blockedCount,
      confirmationRequiredCount,
      staleExpiredCount,
      intentCount,
      bounded: false,
      warnings: ["Forex paper routing only runs for newly published in-app forex signals."],
      completedAt: now
    };
  }

  const [workspaceSnapshot, studentSnapshot] = await Promise.all([
    db.doc(`workspaces/${actor.workspaceId}`).get(),
    db.collection(`workspaces/${actor.workspaceId}/students`).limit(FOREX_PAPER_CANDIDATE_LIMIT).get()
  ]);

  if (!workspaceSnapshot.exists) {
    warnings.push("Workspace shell is missing, so forex paper routing could not evaluate students.");
    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      trigger,
      routed: false,
      candidateLimit: FOREX_PAPER_CANDIDATE_LIMIT,
      candidateCount: 0,
      allowedCount,
      alertsOnlyCount,
      blockedCount,
      confirmationRequiredCount,
      staleExpiredCount,
      intentCount,
      bounded: false,
      warnings,
      completedAt: now
    };
  }

  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, actor.workspaceId);
  const studentRecords = studentSnapshot.docs.map((doc) => workspaceRecordFromSnapshot(doc, "studentId"));
  const bounded = studentSnapshot.docs.length === FOREX_PAPER_CANDIDATE_LIMIT;
  const batch = db.batch();

  queueForexAuditEvent(db, batch, {
    action: "forex_paper.routing.started",
    actorType: "influencer",
    actorId: actor.uid,
    workspaceId: actor.workspaceId,
    targetType: "signal",
    targetId: signal.signalId,
    safeMessage: "Forex paper routing started for a newly published signal.",
    severity: "info",
    after: {
      signalId: signal.signalId,
      trigger,
      candidateLimit: FOREX_PAPER_CANDIDATE_LIMIT
    },
    createdAt: now
  });

  if (bounded) {
    warnings.push("Forex paper routing reached the bounded candidate window. Add queueing before routing large workspaces.");
    queueForexAuditEvent(db, batch, {
      action: "forex_paper.routing.bounded",
      actorType: "influencer",
      actorId: actor.uid,
      workspaceId: actor.workspaceId,
      targetType: "signal",
      targetId: signal.signalId,
      safeMessage: "Forex paper routing reached the bounded candidate window.",
      severity: "warning",
      after: { candidateLimit: FOREX_PAPER_CANDIDATE_LIMIT },
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
  const autoCopyPreferenceSnapshots = studentRecords.length > 0
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
    const entitlements = resolveStudentEntitlements({
      workspace,
      studentRecord,
      subscription
    });
    const preferences = mapCrossAssetAutoCopyPreferencesRecord({
      record: autoCopyPreferenceSnapshots[index]?.exists
        ? workspaceRecordFromSnapshot(autoCopyPreferenceSnapshots[index], "preferenceId")
        : null,
      workspaceId: actor.workspaceId,
      studentId,
      market: "forex"
    });
    const evaluation = evaluateForexPaperRiskCandidate({
      signal,
      studentId,
      entitlements,
      preferences
    });
    const intentId = buildForexIntentId({
      workspaceId: actor.workspaceId,
      signalId: signal.signalId,
      studentId,
      pair: evaluation.pair || "unknown_pair",
      executionMode: preferences.executionMode
    });
    const riskDecision = buildForexRiskDecisionRecord({
      signal,
      studentId,
      intentId,
      evaluation,
      now
    });

    batch.set(
      db.doc(`workspaces/${actor.workspaceId}/forex_risk_decisions/${riskDecision.decisionId}`),
      riskDecision,
      { merge: true }
    );

    if (evaluation.staleDecision.outcome !== "route_normally") {
      batch.set(
        db.doc(`workspaces/${actor.workspaceId}/stale_signal_decisions/${evaluation.staleDecision.decisionId}`),
        stripUndefined(evaluation.staleDecision),
        { merge: true }
      );
    }

    if (evaluation.status === "allowed") {
      const intent = buildForexIntentRecord({
        signal,
        studentId,
        intentId,
        riskDecisionId: riskDecision.decisionId,
        entitlements,
        preferences,
        evaluation,
        now
      });

      batch.set(
        db.doc(`workspaces/${actor.workspaceId}/forex_paper_intents/${intentId}`),
        intent,
        { merge: true }
      );
      queueForexAuditEvent(db, batch, {
        action: "forex_paper.intent.created",
        actorType: "influencer",
        actorId: actor.uid,
        workspaceId: actor.workspaceId,
        studentId,
        targetType: "intent",
        targetId: intentId,
        safeMessage: "Forex paper execution intent was created. No broker or MetaAPI execution was called.",
        severity: "info",
        after: {
          signalId: signal.signalId,
          status: "ready_for_forex_paper",
          market: "forex",
          pair: intent.pair,
          paperOnly: true
        },
        createdAt: now
      });
      allowedCount += 1;
      intentCount += 1;
    } else if (evaluation.status === "requires_review") {
      const confirmation = buildConfirmationRecord({
        signal,
        studentId,
        pair: evaluation.pair || signal.pair,
        reason: evaluation.confirmationReason ?? "execution_mode",
        now
      });
      batch.set(
        db.doc(`workspaces/${actor.workspaceId}/auto_copy_confirmations/${confirmation.confirmationId}`),
        confirmation,
        { merge: true }
      );
      confirmationRequiredCount += 1;
      queueForexAuditEvent(db, batch, {
        action: "forex_paper.confirmation_required",
        actorType: "influencer",
        actorId: actor.uid,
        workspaceId: actor.workspaceId,
        studentId,
        targetType: "confirmation",
        targetId: confirmation.confirmationId,
        safeMessage: confirmation.safeMessage,
        severity: "warning",
        after: {
          signalId: signal.signalId,
          reason: confirmation.reason
        },
        createdAt: now
      });
    } else {
      if (preferences.executionMode === "alerts_only") {
        alertsOnlyCount += 1;
      } else {
        blockedCount += 1;
      }

      if (evaluation.staleDecision.outcome === "expire_skip") {
        staleExpiredCount += 1;
      }

      queueForexAuditEvent(db, batch, {
        action: "forex_paper.risk_blocked",
        actorType: "influencer",
        actorId: actor.uid,
        workspaceId: actor.workspaceId,
        studentId,
        targetType: "risk_decision",
        targetId: riskDecision.decisionId,
        safeMessage: evaluation.blockedReason ?? "Forex paper routing was blocked.",
        severity: "warning",
        after: {
          signalId: signal.signalId,
          status: evaluation.staleDecision.outcome === "expire_skip" ? "stale_expired" : "blocked"
        },
        createdAt: now
      });
    }
  }

  queueForexAuditEvent(db, batch, {
    action: "forex_paper.routing.completed",
    actorType: "influencer",
    actorId: actor.uid,
    workspaceId: actor.workspaceId,
    targetType: "signal",
    targetId: signal.signalId,
    safeMessage: "Forex paper routing completed for a newly published signal.",
    severity: "info",
    after: {
      signalId: signal.signalId,
      allowedCount,
      alertsOnlyCount,
      blockedCount,
      confirmationRequiredCount,
      staleExpiredCount,
      intentCount,
      bounded
    },
    createdAt: now
  });

  await batch.commit();

  return {
    workspaceId: signal.workspaceId,
    signalId: signal.signalId,
    trigger,
    routed: true,
    candidateLimit: FOREX_PAPER_CANDIDATE_LIMIT,
    candidateCount: studentRecords.length,
    allowedCount,
    alertsOnlyCount,
    blockedCount,
    confirmationRequiredCount,
    staleExpiredCount,
    intentCount,
    bounded,
    warnings,
    completedAt: now
  };
}

function mapForexIntentSummary(record: Record<string, unknown>): ForexPaperIntentSummary {
  return {
    intentId: safeString(record.intentId),
    signalId: safeString(record.signalId),
    studentId: safeString(record.studentId),
    pair: safeString(record.pair),
    side: record.side === "sell" ? "sell" : "buy",
    status: normalizeForexIntentStatus(record.status),
    executionMode: record.executionMode === "confirm_before_execute" || record.executionMode === "alerts_only"
      ? record.executionMode
      : "full_auto",
    sizingMode: record.sizingMode === "risk_percent" ? "risk_percent" : "fixed_notional",
    simulatedNotional: safeNumber(record.simulatedNotional),
    riskDecisionId: safeString(record.riskDecisionId) || undefined,
    createdAt: safeString(record.createdAt) || new Date().toISOString(),
    updatedAt: safeString(record.updatedAt) || new Date().toISOString()
  };
}

function mapForexAttemptSummary(record: Record<string, unknown>): ForexPaperAttemptSummary {
  return {
    attemptId: safeString(record.attemptId),
    intentId: safeString(record.intentId),
    signalId: safeString(record.signalId),
    studentId: safeString(record.studentId),
    pair: safeString(record.pair),
    side: record.side === "sell" ? "sell" : "buy",
    status: record.status === "failed" || record.status === "skipped" ? record.status : "simulated",
    simulatedNotional: safeNumber(record.simulatedNotional),
    safeMessage: safeString(record.safeMessage) || "Forex paper simulation recorded.",
    sanitizedFailureCode: safeString(record.sanitizedFailureCode) || undefined,
    sanitizedFailureReason: safeString(record.sanitizedFailureReason) || undefined,
    simulatedAt: safeString(record.simulatedAt) || undefined,
    updatedAt: safeString(record.updatedAt) || new Date().toISOString()
  };
}

function mapForexRiskDecisionSummary(record: Record<string, unknown>): ForexRiskDecisionSummary {
  const checks = Array.isArray(record.checks) ? record.checks as ExecutionRiskCheck[] : [];

  return {
    decisionId: safeString(record.decisionId),
    intentId: safeString(record.intentId),
    signalId: safeString(record.signalId),
    studentId: safeString(record.studentId),
    pair: safeString(record.pair),
    status: normalizeRiskDecisionStatus(record.status),
    blockedReason: safeString(record.blockedReason) || undefined,
    checkCount: checks.length,
    failedCheckKeys: checks
      .filter((check) => check.status !== "allowed")
      .map((check) => check.key),
    decidedAt: safeString(record.decidedAt) || new Date().toISOString()
  };
}

function mapForexConfirmationSummary(record: Record<string, unknown>): ForexConfirmationSummary {
  return {
    confirmationId: safeString(record.confirmationId),
    signalId: safeString(record.signalId),
    studentId: safeString(record.studentId),
    status:
      record.status === "confirmation_expired" ||
      record.status === "student_confirmed" ||
      record.status === "student_skipped"
        ? record.status
        : "waiting_for_student_confirmation",
    symbolOrPair: safeString(record.symbolOrPair),
    reason: record.reason === "stale_signal" ? "stale_signal" : "execution_mode",
    expiresAt: safeString(record.expiresAt) || new Date().toISOString(),
    safeMessage: safeString(record.safeMessage) || "Forex confirmation record is pending.",
    updatedAt: safeString(record.updatedAt) || new Date().toISOString()
  };
}

function mapForexAuditSummary(record: Record<string, unknown>): ForexExecutionAuditEventSummary {
  return {
    eventId: safeString(record.eventId),
    action: safeString(record.action) || "forex_paper.audit",
    actorType:
      record.actorType === "student" || record.actorType === "super_admin" || record.actorType === "system"
        ? record.actorType
        : "influencer",
    studentId: safeString(record.studentId) || undefined,
    targetType:
      record.targetType === "paper_attempt" ||
      record.targetType === "risk_decision" ||
      record.targetType === "confirmation" ||
      record.targetType === "intent"
        ? record.targetType
        : "signal",
    targetId: safeString(record.targetId),
    safeMessage: safeString(record.safeMessage) || "Forex paper audit event recorded.",
    severity: record.severity === "critical" || record.severity === "warning" ? record.severity : "info",
    createdAt: safeString(record.createdAt) || new Date().toISOString()
  };
}

async function summarizeForexPaperRouting(workspaceId: string, studentId?: string): Promise<ForexPaperRoutingOverview> {
  const { db } = getFirebaseAdminClients();
  const intentQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_paper_intents`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_paper_intents`);
  const decisionQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_risk_decisions`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_risk_decisions`);
  const confirmationQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/auto_copy_confirmations`).where("market", "==", "forex").where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/auto_copy_confirmations`).where("market", "==", "forex");
  const [intentSnapshot, decisionSnapshot, confirmationSnapshot, boundedAuditSnapshot] = await Promise.all([
    intentQuery.limit(FOREX_PAPER_OVERVIEW_LIMIT).get(),
    decisionQuery.limit(FOREX_PAPER_OVERVIEW_LIMIT).get(),
    confirmationQuery.limit(FOREX_PAPER_OVERVIEW_LIMIT).get(),
    db
      .collection(`workspaces/${workspaceId}/forex_execution_audit_events`)
      .where("action", "==", "forex_paper.routing.bounded")
      .limit(FOREX_PAPER_OVERVIEW_LIMIT)
      .get()
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
    readyForPaperCount: intentRecords.filter((record) => record.status === "ready_for_forex_paper").length,
    completedPaperCount: intentRecords.filter((record) => record.status === "completed_forex_paper").length,
    confirmationRequiredCount: confirmationRecords.filter((record) => record.status === "waiting_for_student_confirmation").length,
    riskBlockedCount: decisionRecords.filter((record) => record.status === "blocked").length,
    boundedRoutingWarningCount: boundedAuditSnapshot.docs.length,
    lastRoutedAt: latestIso(intentRecords.map((record) => safeString(record.updatedAt))),
    updatedAt
  };
}

export async function loadForexPaperExecutionPreview({
  workspaceId,
  studentId
}: {
  workspaceId: string;
  studentId?: string;
}): Promise<ForexPaperExecutionPreview> {
  const { db } = getFirebaseAdminClients();
  const intentQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_paper_intents`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_paper_intents`);
  const attemptQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_paper_attempts`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_paper_attempts`);
  const riskQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_risk_decisions`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_risk_decisions`);
  const confirmationQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/auto_copy_confirmations`).where("market", "==", "forex").where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/auto_copy_confirmations`).where("market", "==", "forex");
  const auditQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/forex_execution_audit_events`).where("studentId", "==", studentId)
    : db.collection(`workspaces/${workspaceId}/forex_execution_audit_events`);
  const [routing, intentSnapshot, attemptSnapshot, riskSnapshot, confirmationSnapshot, auditSnapshot] = await Promise.all([
    summarizeForexPaperRouting(workspaceId, studentId),
    intentQuery.orderBy("updatedAt", "desc").limit(FOREX_PAPER_READ_LIMIT).get(),
    attemptQuery.orderBy("updatedAt", "desc").limit(FOREX_PAPER_READ_LIMIT).get(),
    riskQuery.orderBy("decidedAt", "desc").limit(FOREX_PAPER_READ_LIMIT).get(),
    confirmationQuery.orderBy("updatedAt", "desc").limit(FOREX_PAPER_READ_LIMIT).get(),
    auditQuery.orderBy("createdAt", "desc").limit(FOREX_PAPER_READ_LIMIT).get()
  ]);

  return {
    visibleLimit: FOREX_PAPER_VISIBLE_LIMIT,
    routing,
    intents: sortByRecent(
      intentSnapshot.docs.map((doc) => mapForexIntentSummary({ intentId: doc.id, ...doc.data() })),
      (record) => record.updatedAt
    ).slice(0, FOREX_PAPER_VISIBLE_LIMIT),
    attempts: sortByRecent(
      attemptSnapshot.docs.map((doc) => mapForexAttemptSummary({ attemptId: doc.id, ...doc.data() })),
      (record) => record.updatedAt
    ).slice(0, FOREX_PAPER_VISIBLE_LIMIT),
    riskDecisions: sortByRecent(
      riskSnapshot.docs.map((doc) => mapForexRiskDecisionSummary({ decisionId: doc.id, ...doc.data() })),
      (record) => record.decidedAt
    ).slice(0, FOREX_PAPER_VISIBLE_LIMIT),
    confirmations: sortByRecent(
      confirmationSnapshot.docs.map((doc) => mapForexConfirmationSummary({ confirmationId: doc.id, ...doc.data() })),
      (record) => record.updatedAt
    ).slice(0, FOREX_PAPER_VISIBLE_LIMIT),
    auditEvents: sortByRecent(
      auditSnapshot.docs.map((doc) => mapForexAuditSummary({ eventId: doc.id, ...doc.data() })),
      (record) => record.createdAt
    ).slice(0, FOREX_PAPER_VISIBLE_LIMIT),
    bounded: {
      intents: intentSnapshot.docs.length > FOREX_PAPER_VISIBLE_LIMIT,
      attempts: attemptSnapshot.docs.length > FOREX_PAPER_VISIBLE_LIMIT,
      riskDecisions: riskSnapshot.docs.length > FOREX_PAPER_VISIBLE_LIMIT,
      confirmations: confirmationSnapshot.docs.length > FOREX_PAPER_VISIBLE_LIMIT,
      auditEvents: auditSnapshot.docs.length > FOREX_PAPER_VISIBLE_LIMIT
    },
    warnings: [
      "Forex Auto-Copy is paper simulation only. No MetaAPI, broker, demo, or live forex order is called in this stage.",
      ...(intentSnapshot.docs.length > FOREX_PAPER_VISIBLE_LIMIT
        ? ["Forex paper intent preview is bounded to the four most recent loaded records."]
        : []),
      ...(attemptSnapshot.docs.length > FOREX_PAPER_VISIBLE_LIMIT
        ? ["Forex paper attempt preview is bounded to the four most recent loaded records."]
        : []),
      ...(confirmationSnapshot.docs.length > FOREX_PAPER_VISIBLE_LIMIT
        ? ["Forex confirmation preview is bounded to the four most recent loaded records."]
        : [])
    ]
  };
}

function buildForexAttemptRecord(intent: ForexPaperExecutionIntentRecord, now: string): ForexPaperAttemptRecord {
  const attemptId = deterministicId(["forex_attempt", intent.intentId], 140);

  return stripUndefined({
    attemptId,
    workspaceId: intent.workspaceId,
    intentId: intent.intentId,
    signalId: intent.signalId,
    studentId: intent.studentId,
    market: "forex",
    pair: intent.pair,
    side: intent.side,
    status: "simulated",
    simulatedNotional: intent.simulatedNotional,
    riskEstimateLabel: intent.riskEstimateLabel,
    idempotencyKey: `forex-paper-attempt:${intent.workspaceId}:${intent.intentId}`.toLowerCase(),
    safeMessage: "Forex paper simulation completed. No MetaAPI or broker call was made.",
    simulatedAt: now,
    updatedAt: now
  }) satisfies ForexPaperAttemptRecord;
}

export async function runForexPaperExecutionWorker(
  actor: VerifiedSuperAdmin,
  payload: unknown
): Promise<ForexPaperWorkerRunResponse> {
  if (!actor.uid) {
    throw new AdminApiError(403, "super_admin_required", "This endpoint requires Super Admin access.");
  }

  const workspaceId = sanitizeWorkspaceId(
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).workspaceId
      : undefined
  );
  const requestedLimit = safeNumber(
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).limit
      : undefined,
    FOREX_PAPER_WORKER_DEFAULT_LIMIT
  );
  const limit = Math.min(Math.max(Math.floor(requestedLimit), 1), FOREX_PAPER_WORKER_MAX_LIMIT);

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before running the forex paper worker.");
  }

  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const warnings: string[] = [
    "Forex worker is paper-only. It does not import MetaAPI, broker adapters, or exchange order placement."
  ];
  const intentSnapshot = await db
    .collection(`workspaces/${workspaceId}/forex_paper_intents`)
    .where("status", "==", "ready_for_forex_paper")
    .orderBy("updatedAt", "asc")
    .limit(limit + 1)
    .get();
  const candidateDocs = intentSnapshot.docs.slice(0, limit);
  const bounded = intentSnapshot.docs.length > limit;
  let processedCount = 0;
  let completedPaperCount = 0;
  let skippedCount = 0;
  const failedCount = 0;

  for (const doc of candidateDocs) {
    const intent = doc.data() as ForexPaperExecutionIntentRecord;
    const batch = db.batch();
    const attemptId = deterministicId(["forex_attempt", intent.intentId], 140);
    const attemptRef = db.doc(`workspaces/${workspaceId}/forex_paper_attempts/${attemptId}`);
    const existingAttempt = await attemptRef.get();

    processedCount += 1;

    if (intent.market !== "forex" || intent.paperOnly !== true || intent.status !== "ready_for_forex_paper") {
      skippedCount += 1;
      batch.set(doc.ref, {
        status: "failed_forex_paper",
        updatedAt: now
      }, { merge: true });
      queueForexAuditEvent(db, batch, {
        action: "forex_paper.worker.skipped",
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        targetType: "intent",
        targetId: intent.intentId,
        safeMessage: "Forex paper worker skipped a malformed or non-paper intent.",
        severity: "warning",
        createdAt: now
      });
      await batch.commit();
      continue;
    }

    if (existingAttempt.exists && existingAttempt.data()?.status === "simulated") {
      skippedCount += 1;
      batch.set(doc.ref, {
        status: "completed_forex_paper",
        updatedAt: now
      }, { merge: true });
      queueForexAuditEvent(db, batch, {
        action: "forex_paper.worker.idempotent_skip",
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        targetType: "paper_attempt",
        targetId: attemptId,
        safeMessage: "Forex paper worker found an existing simulated attempt and did not duplicate it.",
        severity: "info",
        createdAt: now
      });
      await batch.commit();
      continue;
    }

    const attempt = buildForexAttemptRecord(intent, now);
    batch.set(attemptRef, attempt, { merge: true });
    batch.set(doc.ref, {
      status: "completed_forex_paper",
      updatedAt: now
    }, { merge: true });
    queueForexAuditEvent(db, batch, {
      action: "forex_paper.worker.completed",
      actorType: "super_admin",
      actorId: actor.uid,
      workspaceId,
      studentId: intent.studentId,
      targetType: "paper_attempt",
      targetId: attemptId,
      safeMessage: "Forex paper worker recorded a simulated paper attempt. No broker execution was called.",
      severity: "info",
      after: {
        intentId: intent.intentId,
        pair: intent.pair,
        status: "completed_forex_paper"
      },
      createdAt: now
    });
    await batch.commit();
    completedPaperCount += 1;
  }

  if (bounded) {
    warnings.push(`Forex paper worker reached the bounded limit of ${limit} records.`);
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId,
    candidateLimit: limit,
    candidateCount: candidateDocs.length,
    processedCount,
    completedPaperCount,
    skippedCount,
    failedCount,
    bounded,
    warnings,
    updatedAt: now
  };
}
