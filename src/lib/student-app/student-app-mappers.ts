import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import {
  getFeatureEntitlement,
  getStudentCopierMode
} from "@/lib/entitlements/student-entitlements";
import type { StudentEntitlementSummary } from "@/types/entitlements";
import { mapWorkspaceRecord } from "@/lib/workspace/onboarding-mappers";
import type {
  StudentAppProfile,
  StudentAppSummary,
  StudentCopierMode,
  StudentCopierStatus,
  StudentJournalSummary,
  StudentSignalCard
} from "@/types/student-app";
import type { Workspace } from "@/types/workspace";

export function recordFromSnapshot(snapshot: DocumentSnapshot<DocumentData>, idField = "id") {
  const data = snapshot.data() ?? {};

  return {
    ...data,
    [idField]: data[idField] ?? snapshot.id
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeIsoDate(value: unknown, fallback = new Date().toISOString()) {
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

function normalizeCopierStatus(
  record: Record<string, unknown>,
  entitlements: StudentEntitlementSummary
): StudentCopierStatus {
  const autoCopyEntitlement = getFeatureEntitlement(entitlements, "autoCopy");
  const status = asString(record.copierStatus);

  if (autoCopyEntitlement.access !== "allowed") {
    return "not_eligible";
  }

  if (status === "active" || status === "paused") {
    return status;
  }

  return asBoolean(record.copierActive) ? "active" : "not_connected";
}

export function mapStudentProfile(
  record: Record<string, unknown>,
  workspaceId: string,
  studentId: string,
  entitlements: StudentEntitlementSummary
): StudentAppProfile {
  const courseEntitlement = getFeatureEntitlement(entitlements, "course");
  const signalEntitlement = getFeatureEntitlement(entitlements, "signalAlerts");
  const autoCopyEntitlement = getFeatureEntitlement(entitlements, "autoCopy");
  const journalEntitlement = getFeatureEntitlement(entitlements, "journal");
  const mode = getStudentCopierMode(entitlements);
  const tierId = entitlements.tierId || asString(record.tierId, asString(record.subscriptionTierId, "all"));
  const subscriptionStatus = entitlements.subscriptionStatus;

  return {
    studentId,
    workspaceId,
    displayName: asString(record.displayName, asString(record.name, "Student")),
    email: asString(record.email) || undefined,
    tierId,
    tierLabel: entitlements.tierLabel || asString(
      record.tierLabel,
      asString(record.subscriptionTierName, tierId === "all" ? "All access" : tierId)
    ),
    subscriptionStatus,
    joinedAt: record.joinedAt ? normalizeIsoDate(record.joinedAt) : undefined,
    lastSeenAt:
      record.lastSeenAt || record.lastActiveAt
        ? normalizeIsoDate(record.lastSeenAt ?? record.lastActiveAt)
        : undefined,
    courseProgressPercent: asNumber(
      record.courseProgressPercent,
      asNumber(record.courseCompletionPercent)
    ),
    riskPosture: entitlements.riskPosture,
    entitlements,
    courseAccessState: courseEntitlement.access,
    courseAccessReason: courseEntitlement.reason,
    signalAccess: signalEntitlement.access === "allowed",
    signalAccessState: signalEntitlement.access,
    signalAccessReason: signalEntitlement.reason,
    autoCopyEligible: autoCopyEntitlement.access === "allowed",
    autoCopyAccessState: autoCopyEntitlement.access,
    autoCopyAccessReason: autoCopyEntitlement.reason,
    accountMode: mode,
    copierStatus: normalizeCopierStatus(record, entitlements),
    journalPrivate: isRecord(record.journalPrivacy)
      ? asBoolean(record.journalPrivacy.globalPrivate, true)
      : asBoolean(record.journalPrivate, true),
    journalAccessState: journalEntitlement.access,
    journalAccessReason: journalEntitlement.reason,
    paymentRail: asString(record.paymentRail, "unknown") as StudentAppProfile["paymentRail"]
  };
}

export function mapWorkspaceForStudent(record: Record<string, unknown>, workspaceId: string): Workspace {
  return mapWorkspaceRecord(record, workspaceId);
}

export function createEmptyAppSummary(student: StudentAppProfile): StudentAppSummary {
  const courseAccessible = student.entitlements.features.course.access === "allowed";
  const signalAccessible = student.entitlements.features.signalAlerts.access === "allowed";

  return {
    workspaceId: student.workspaceId,
    studentId: student.studentId,
    tierId: student.tierId,
    tierLabel: student.tierLabel,
    courseProgressPercent: courseAccessible ? student.courseProgressPercent : 0,
    completedCourseCount: 0,
    liveSignalsCount: signalAccessible ? 0 : 0,
    journalPnl30dNgn: 0,
    journalWinRate30d: 0,
    copierMode: student.accountMode,
    copierStatus: student.copierStatus,
    updatedAt: new Date().toISOString()
  };
}

export function mapAppSummary(
  record: Record<string, unknown> | null,
  student: StudentAppProfile
): StudentAppSummary {
  const courseAccessible = student.entitlements.features.course.access === "allowed";
  const signalAccessible = student.entitlements.features.signalAlerts.access === "allowed";

  if (!record) {
    return createEmptyAppSummary(student);
  }

  return {
    workspaceId: asString(record.workspaceId, student.workspaceId),
    studentId: asString(record.studentId, student.studentId),
    tierId: asString(record.tierId, student.tierId),
    tierLabel: asString(record.tierLabel, student.tierLabel),
    courseProgressPercent: courseAccessible
      ? asNumber(record.courseProgressPercent, student.courseProgressPercent)
      : 0,
    completedCourseCount: courseAccessible ? asNumber(record.completedCourseCount) : 0,
    liveSignalsCount: signalAccessible ? asNumber(record.liveSignalsCount) : 0,
    latestSignalAt: record.latestSignalAt ? normalizeIsoDate(record.latestSignalAt) : undefined,
    journalPnl30dNgn:
      student.journalAccessState === "allowed" ? asNumber(record.journalPnl30dNgn) : 0,
    journalWinRate30d:
      student.journalAccessState === "allowed" ? asNumber(record.journalWinRate30d) : 0,
    copierMode: asString(record.copierMode, student.accountMode) as StudentCopierMode,
    copierStatus: asString(record.copierStatus, student.copierStatus) as StudentCopierStatus,
    updatedAt: normalizeIsoDate(record.updatedAt)
  };
}

export function createEmptyJournalSummary(student: StudentAppProfile): StudentJournalSummary {
  return {
    workspaceId: student.workspaceId,
    studentId: student.studentId,
    totalTrades30d: 0,
    winRate30d: 0,
    averageRiskReward30d: 0,
    pnl30dNgn: 0,
    privacyState: student.journalPrivate ? "private" : "workspace_visible",
    summaryState: "zero_safe",
    updatedAt: new Date().toISOString()
  };
}

export function mapJournalSummary(
  record: Record<string, unknown> | null,
  student: StudentAppProfile
): StudentJournalSummary {
  if (student.journalAccessState !== "allowed") {
    return createEmptyJournalSummary(student);
  }

  if (!record) {
    return createEmptyJournalSummary(student);
  }

  const bestPair = asString(record.bestPair) || undefined;
  const mostActivePair = asString(record.mostActivePair, asString(record.bestPair)) || undefined;

  return {
    workspaceId: asString(record.workspaceId, student.workspaceId),
    studentId: asString(record.studentId, student.studentId),
    totalTrades30d: asNumber(record.totalTrades30d),
    winRate30d: asNumber(record.winRate30d),
    averageRiskReward30d: asNumber(record.averageRiskReward30d),
    pnl30dNgn: asNumber(record.pnl30dNgn),
    bestPair,
    mostActivePair,
    privacyState: student.journalPrivate ? "private" : "workspace_visible",
    summaryState: "live",
    updatedAt: normalizeIsoDate(record.updatedAt)
  };
}

export function mapSignalCard(record: Record<string, unknown>, workspaceId: string): StudentSignalCard {
  return {
    signalId: asString(record.signalId),
    workspaceId: asString(record.workspaceId, workspaceId),
    status: asString(record.status, "published") as StudentSignalCard["status"],
    market: asString(record.market, "forex") as StudentSignalCard["market"],
    pair: asString(record.pair),
    direction: asString(record.direction, asString(record.action, "buy")) as StudentSignalCard["direction"],
    entry: asString(record.entry),
    takeProfit: asString(record.takeProfit),
    stopLoss: asString(record.stopLoss),
    riskLabel: asString(record.riskLabel, "medium") as StudentSignalCard["riskLabel"],
    notes: asString(record.notes) || undefined,
    deliveryMode: asString(record.deliveryMode, "alerts_only") as StudentSignalCard["deliveryMode"],
    publishedAt: record.publishedAt ? normalizeIsoDate(record.publishedAt) : undefined,
    updatedAt: normalizeIsoDate(record.updatedAt, normalizeIsoDate(record.createdAt))
  };
}
