import "server-only";

import { AdminApiError } from "@/lib/firebase/admin-errors";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import {
  normalizeSignalPairForForexDemoProof,
  normalizeSignalPairForMarket
} from "@/lib/workspace/signal-symbols";
import type {
  AutoCopyMarket,
  AutoCopyRoutingPostureSummary,
  CrossAssetAutoCopyExecutionMode,
  CrossAssetAutoCopyPreferencesRecord,
  CrossAssetStaleSignalDecisionRecord,
  CrossAssetStaleSignalOutcome,
  CrossAssetStaleSignalPolicy
} from "@/types/crypto-execution";
import type { WorkspaceSignalRecord } from "@/types/workspace-dashboard";

const DEFAULT_STALE_SIGNAL_MAX_AGE_SECONDS = 180;
const MIN_STALE_SIGNAL_MAX_AGE_SECONDS = 15;
const MAX_STALE_SIGNAL_MAX_AGE_SECONDS = 3600;
const AUTO_COPY_PREFERENCE_SAMPLE_LIMIT = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: unknown, fallback: number, min: number, max: number) {
  return Math.min(Math.max(asNumber(value, fallback), min), max);
}

function sanitizeMarket(value: unknown, fallback: AutoCopyMarket): AutoCopyMarket {
  return value === "forex" ? "forex" : value === "crypto" ? "crypto" : fallback;
}

function sanitizeExecutionMode(value: unknown, fallback: CrossAssetAutoCopyExecutionMode): CrossAssetAutoCopyExecutionMode {
  return value === "confirm_before_execute" || value === "alerts_only" || value === "full_auto"
    ? value
    : fallback;
}

function sanitizeStalePolicy(value: unknown, fallback: CrossAssetStaleSignalPolicy): CrossAssetStaleSignalPolicy {
  return value === "allow_until_manual_cancel" || value === "confirm_if_stale" || value === "expire_after_seconds"
    ? value
    : fallback;
}

function sanitizeSizingMode(value: unknown, fallback: CrossAssetAutoCopyPreferencesRecord["sizingMode"]) {
  return value === "risk_percent" || value === "fixed_notional" ? value : fallback;
}

function sanitizeList(value: unknown, market: AutoCopyMarket) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = raw
    .map((entry) => asString(entry).toUpperCase().replace(/[^A-Z0-9/_:-]/g, ""))
    .map((entry) => market === "crypto"
      ? normalizeSignalPairForMarket(entry, "crypto") ?? ""
      : normalizeSignalPairForForexDemoProof(entry) ?? "")
    .filter(Boolean);

  return [...new Set(normalized)].slice(0, 50);
}

export function defaultCrossAssetAutoCopyPreferences({
  workspaceId,
  studentId,
  market
}: {
  workspaceId: string;
  studentId: string;
  market: AutoCopyMarket;
}): CrossAssetAutoCopyPreferencesRecord {
  const now = new Date().toISOString();

  return {
    workspaceId,
    studentId,
    market,
    executionMode: market === "forex" ? "confirm_before_execute" : "full_auto",
    consentStatus: "missing",
    sizingMode: market === "forex" ? "risk_percent" : "fixed_notional",
    staleSignalPolicy: "confirm_if_stale",
    staleSignalMaxAgeSeconds: DEFAULT_STALE_SIGNAL_MAX_AGE_SECONDS,
    maxRiskPercentPerTrade: 1,
    maxFixedNotional: market === "forex" ? 100 : 5,
    maxDailyLoss: market === "forex" ? 3 : 25,
    maxOpenTrades: 3,
    allowedSymbols: [],
    allowedPairs: [],
    studentPaused: false,
    killSwitchEnabled: false,
    idempotencyKeyPrefix: `auto-copy:${workspaceId}:${studentId}:${market}`,
    executionFairnessDisclosureVersion: "auto-copy-fairness-v1",
    suitabilityAcknowledgmentVersion: "auto-copy-suitability-v1",
    forexFoundationOnly: market === "forex",
    updatedAt: now
  };
}

export function mapCrossAssetAutoCopyPreferencesRecord({
  record,
  workspaceId,
  studentId,
  market
}: {
  record: Record<string, unknown> | null;
  workspaceId: string;
  studentId: string;
  market: AutoCopyMarket;
}): CrossAssetAutoCopyPreferencesRecord {
  const fallback = defaultCrossAssetAutoCopyPreferences({ workspaceId, studentId, market });

  if (!record) {
    return fallback;
  }

  const normalizedMarket = sanitizeMarket(record.market, market);
  const symbolsOrPairs = sanitizeList(
    normalizedMarket === "crypto" ? record.allowedSymbols : record.allowedPairs,
    normalizedMarket
  );

  return {
    ...fallback,
    workspaceId,
    studentId,
    market: normalizedMarket,
    executionMode: sanitizeExecutionMode(record.executionMode, fallback.executionMode),
    consentStatus:
      record.consentStatus === "accepted" || record.consentStatus === "paused" || record.consentStatus === "revoked"
        ? record.consentStatus
        : "missing",
    sizingMode: sanitizeSizingMode(record.sizingMode, fallback.sizingMode),
    staleSignalPolicy: sanitizeStalePolicy(record.staleSignalPolicy, fallback.staleSignalPolicy),
    staleSignalMaxAgeSeconds: clamp(
      record.staleSignalMaxAgeSeconds,
      fallback.staleSignalMaxAgeSeconds,
      MIN_STALE_SIGNAL_MAX_AGE_SECONDS,
      MAX_STALE_SIGNAL_MAX_AGE_SECONDS
    ),
    maxRiskPercentPerTrade: clamp(record.maxRiskPercentPerTrade, fallback.maxRiskPercentPerTrade, 0.1, 10),
    maxFixedNotional: clamp(record.maxFixedNotional, fallback.maxFixedNotional, 0, 10_000),
    maxDailyLoss: clamp(record.maxDailyLoss, fallback.maxDailyLoss, 0, 50_000),
    maxOpenTrades: Math.round(clamp(record.maxOpenTrades, fallback.maxOpenTrades, 1, 25)),
    allowedSymbols: normalizedMarket === "crypto" ? symbolsOrPairs : [],
    allowedPairs: normalizedMarket === "forex" ? symbolsOrPairs : [],
    studentPaused: asBoolean(record.studentPaused),
    killSwitchEnabled: asBoolean(record.killSwitchEnabled),
    killSwitchReason: asString(record.killSwitchReason) || undefined,
    idempotencyKeyPrefix: asString(record.idempotencyKeyPrefix) || fallback.idempotencyKeyPrefix,
    executionFairnessDisclosureVersion: asString(record.executionFairnessDisclosureVersion) || fallback.executionFairnessDisclosureVersion,
    executionFairnessDisclosureAcceptedAt: asString(record.executionFairnessDisclosureAcceptedAt) || undefined,
    suitabilityAcknowledgmentVersion: asString(record.suitabilityAcknowledgmentVersion) || fallback.suitabilityAcknowledgmentVersion,
    suitabilityAcknowledgedAt: asString(record.suitabilityAcknowledgedAt) || undefined,
    forexFoundationOnly: normalizedMarket === "forex" || asBoolean(record.forexFoundationOnly),
    updatedAt: asString(record.updatedAt) || fallback.updatedAt,
    updatedBy: asString(record.updatedBy) || undefined
  };
}

export async function loadStudentAutoCopyPreferences({
  workspaceId,
  studentId,
  market
}: {
  workspaceId: string;
  studentId: string;
  market: AutoCopyMarket;
}) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .doc(`workspaces/${workspaceId}/students/${studentId}/auto_copy_preferences/${market}`)
    .get();

  return mapCrossAssetAutoCopyPreferencesRecord({
    record: snapshot.exists ? snapshot.data() ?? null : null,
    workspaceId,
    studentId,
    market
  });
}

export function validateAutoCopyPreferencesPayload(
  payload: unknown,
  current: CrossAssetAutoCopyPreferencesRecord
): CrossAssetAutoCopyPreferencesRecord {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send valid Auto-Copy preference data.");
  }

  const market = sanitizeMarket(payload.market, current.market);
  const executionMode = sanitizeExecutionMode(payload.executionMode, current.executionMode);
  const fairnessAccepted = payload.executionFairnessDisclosureAccepted === true ||
    Boolean(current.executionFairnessDisclosureAcceptedAt);
  const suitabilityAccepted = payload.suitabilityAcknowledged === true ||
    Boolean(current.suitabilityAcknowledgedAt);
  const requestedConsentStatus =
    payload.consentStatus === "accepted" || payload.consentStatus === "paused" || payload.consentStatus === "revoked" || payload.consentStatus === "missing"
      ? payload.consentStatus
      : current.consentStatus;
  const consentStatus = requestedConsentStatus === "accepted" && fairnessAccepted && suitabilityAccepted
    ? "accepted"
    : requestedConsentStatus === "accepted"
      ? "missing"
      : requestedConsentStatus;
  const allowed = sanitizeList(
    market === "crypto" ? payload.allowedSymbols ?? payload.allowedPairs : payload.allowedPairs ?? payload.allowedSymbols,
    market
  );

  return {
    ...current,
    market,
    executionMode,
    consentStatus,
    sizingMode: sanitizeSizingMode(payload.sizingMode, current.sizingMode),
    staleSignalPolicy: sanitizeStalePolicy(payload.staleSignalPolicy, current.staleSignalPolicy),
    staleSignalMaxAgeSeconds: clamp(
      payload.staleSignalMaxAgeSeconds,
      current.staleSignalMaxAgeSeconds,
      MIN_STALE_SIGNAL_MAX_AGE_SECONDS,
      MAX_STALE_SIGNAL_MAX_AGE_SECONDS
    ),
    maxRiskPercentPerTrade: clamp(payload.maxRiskPercentPerTrade, current.maxRiskPercentPerTrade, 0.1, 10),
    maxFixedNotional: clamp(payload.maxFixedNotional, current.maxFixedNotional, 0, 10_000),
    maxDailyLoss: clamp(payload.maxDailyLoss, current.maxDailyLoss, 0, 50_000),
    maxOpenTrades: Math.round(clamp(payload.maxOpenTrades, current.maxOpenTrades, 1, 25)),
    allowedSymbols: market === "crypto" ? allowed : [],
    allowedPairs: market === "forex" ? allowed : [],
    studentPaused: asBoolean(payload.studentPaused, current.studentPaused),
    killSwitchEnabled: current.killSwitchEnabled,
    executionFairnessDisclosureAcceptedAt:
      payload.executionFairnessDisclosureAccepted === true
        ? new Date().toISOString()
        : current.executionFairnessDisclosureAcceptedAt,
    suitabilityAcknowledgedAt:
      payload.suitabilityAcknowledged === true
        ? new Date().toISOString()
        : current.suitabilityAcknowledgedAt,
    forexFoundationOnly: market === "forex",
    updatedAt: new Date().toISOString()
  };
}

export function signalAgeSeconds(signal: WorkspaceSignalRecord, now = new Date()) {
  const publishedAt = Date.parse(signal.publishedAt ?? signal.updatedAt ?? signal.createdAt);
  return Number.isFinite(publishedAt)
    ? Math.max(0, Math.floor((now.getTime() - publishedAt) / 1000))
    : Number.POSITIVE_INFINITY;
}

export function evaluateStaleSignalPolicy({
  signal,
  preferences,
  now = new Date()
}: {
  signal: WorkspaceSignalRecord;
  preferences: CrossAssetAutoCopyPreferencesRecord;
  now?: Date;
}): CrossAssetStaleSignalDecisionRecord {
  const ageSeconds = signalAgeSeconds(signal, now);
  let outcome: CrossAssetStaleSignalOutcome = "route_normally";
  let safeMessage = "Signal is inside the student's stale-signal window.";

  if (ageSeconds > preferences.staleSignalMaxAgeSeconds) {
    if (preferences.staleSignalPolicy === "expire_after_seconds") {
      outcome = "expire_skip";
      safeMessage = "Signal is older than the student's stale-signal window and was skipped.";
    } else if (preferences.staleSignalPolicy === "confirm_if_stale") {
      outcome = "require_confirmation";
      safeMessage = "Signal is stale for this student and requires confirmation before execution.";
    } else {
      safeMessage = "Signal is stale, but the student's policy allows it until manual cancellation.";
    }
  }

  return {
    decisionId: [
      "stale",
      signal.workspaceId,
      signal.signalId,
      preferences.studentId,
      preferences.market
    ].join("_").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 140),
    workspaceId: signal.workspaceId,
    studentId: preferences.studentId,
    signalId: signal.signalId,
    market: preferences.market,
    policy: preferences.staleSignalPolicy,
    signalAgeSeconds: Number.isFinite(ageSeconds) ? ageSeconds : 999999,
    maxAgeSeconds: preferences.staleSignalMaxAgeSeconds,
    outcome,
    safeMessage,
    decidedAt: now.toISOString()
  };
}

export async function summarizeAutoCopyPreferencePosture(workspaceId: string): Promise<AutoCopyRoutingPostureSummary> {
  const { db } = getFirebaseAdminClients();
  const studentSnapshot = await db.collection(`workspaces/${workspaceId}/students`).limit(AUTO_COPY_PREFERENCE_SAMPLE_LIMIT).get();
  let fullAutoCount = 0;
  let confirmationRequiredCount = 0;
  let alertsOnlyCount = 0;
  let blockedCount = 0;
  let staleBlockedCount = 0;
  let staleConfirmationCount = 0;
  let forexFoundationOnlyCount = 0;

  await Promise.all(studentSnapshot.docs.map(async (studentDoc) => {
    const [cryptoPreferences, forexPreferences] = await Promise.all([
      loadStudentAutoCopyPreferences({ workspaceId, studentId: studentDoc.id, market: "crypto" }),
      loadStudentAutoCopyPreferences({ workspaceId, studentId: studentDoc.id, market: "forex" })
    ]);

    for (const preferences of [cryptoPreferences, forexPreferences]) {
      if (preferences.forexFoundationOnly) {
        forexFoundationOnlyCount += 1;
      }

      if (preferences.killSwitchEnabled || preferences.studentPaused || preferences.consentStatus === "revoked") {
        blockedCount += 1;
      } else if (preferences.executionMode === "full_auto") {
        fullAutoCount += 1;
      } else if (preferences.executionMode === "confirm_before_execute") {
        confirmationRequiredCount += 1;
      } else {
        alertsOnlyCount += 1;
      }

      if (preferences.staleSignalPolicy === "expire_after_seconds") {
        staleBlockedCount += 1;
      }

      if (preferences.staleSignalPolicy === "confirm_if_stale") {
        staleConfirmationCount += 1;
      }
    }
  }));

  return {
    sampledStudentCount: studentSnapshot.docs.length,
    fullAutoCount,
    confirmationRequiredCount,
    alertsOnlyCount,
    blockedCount,
    staleBlockedCount,
    staleConfirmationCount,
    forexFoundationOnlyCount,
    bounded: studentSnapshot.docs.length === AUTO_COPY_PREFERENCE_SAMPLE_LIMIT,
    updatedAt: new Date().toISOString()
  };
}
