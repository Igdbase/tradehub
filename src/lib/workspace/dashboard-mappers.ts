import { createHash } from "node:crypto";
import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import { getFeatureEntitlement, resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import type { StudentSubscription } from "@/types/payments";
import {
  createDefaultOnboardingProgress,
  mapOnboardingProgressRecord,
  mapWorkspaceRecord
} from "@/lib/workspace/onboarding-mappers";
import type {
  WorkspaceCourseListItem,
  WorkspaceDashboardSummary,
  WorkspaceSignalRecord,
  WorkspaceStudentBillingOpsStatus,
  WorkspaceStudentLifecycleStatus,
  WorkspaceStudentRecord
} from "@/types/workspace-dashboard";
import type { OnboardingProgressDocument } from "@/types/onboarding";
import type { Workspace } from "@/types/workspace";
import { deriveWorkspacePackageStatus } from "@/lib/workspace/workspace-package-licence";
import { deriveWorkspaceBrandingReadiness } from "@/lib/workspace/workspace-branding-readiness";
import { deriveWorkspaceEnterpriseDeploymentReadiness } from "@/lib/workspace/workspace-enterprise-readiness";

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
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeSignalSource(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "legacy_in_app";
  }

  if (value === "in_app") {
    return "in_app";
  }

  if (
    value === "telegram_channel" ||
    value === "webhook_source" ||
    value === "master_trader_feed" ||
    value === "external_preview"
  ) {
    return value;
  }

  return "unknown";
}

function normalizeSignalStatus(value: unknown) {
  return value === "draft" || value === "published" || value === "cancelled"
    ? value
    : "unknown";
}

function normalizeSignalLifecycle(value: unknown) {
  return value === "closed" ? "closed" : value === "open" ? "open" : undefined;
}

function mapExternalSignalProof(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    value.sourceType !== "telegram_channel" ||
    value.proofStatus !== "moderated_published"
  ) {
    return undefined;
  }

  const sourceLabel = asString(value.sourceLabel).replace(/[<>]/g, "").trim().slice(0, 80);
  const sourceSafeRef = asString(value.sourceSafeRef).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  const candidateSafeRef = asString(value.candidateSafeRef).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  const bridgeAttestationRef = asString(value.bridgeAttestationRef).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  const moderationVersion = asString(value.moderationVersion).replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 48);
  const approvedAt = normalizeIsoDate(value.approvedAt, "");
  const publishedAt = normalizeIsoDate(value.publishedAt, "");

  if (!sourceLabel || !sourceSafeRef || !candidateSafeRef || !moderationVersion || !approvedAt || !publishedAt) {
    return undefined;
  }

  return {
    sourceType: "telegram_channel" as const,
    proofStatus: "moderated_published" as const,
    sourceLabel,
    sourceSafeRef,
    candidateSafeRef,
    bridgeAttestationRef: bridgeAttestationRef || undefined,
    moderationVersion,
    approvedAt,
    publishedAt
  };
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

function recordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function createSourceMeta(warnings: string[] = []) {
  return {
    source: "firestore" as const,
    sourceLabel: "Firestore live",
    sourceMessage: "This workspace data was loaded through server-side Firebase Admin SDK routes.",
    warnings
  };
}

export function createEmptyDashboardSummary(
  workspaceId: string,
  onboarding?: OnboardingProgressDocument | null
): WorkspaceDashboardSummary {
  const now = new Date().toISOString();
  const packageStatus = deriveWorkspacePackageStatus({
    workspace: {
      workspaceId,
      name: "Workspace",
      vettingStatus: "approved",
      createdAt: now,
      updatedAt: now
    },
    activeStudentCount: 0
  });
  const brandingReadiness = deriveWorkspaceBrandingReadiness({
    workspace: {
      name: "Workspace",
      branding: undefined,
      updatedAt: now
    },
    packageStatus
  });
  const enterpriseReadiness = deriveWorkspaceEnterpriseDeploymentReadiness({
    workspace: {
      workspaceId,
      updatedAt: now
    },
    packageStatus
  });

  return {
    workspaceId,
    activeStudentsCount: 0,
    trialStudentsCount: 0,
    pastDueStudentsCount: 0,
    monthlyRevenueNgn: 0,
    lifetimeRevenueNgn: 0,
    paystackVolumeNgn: 0,
    solanaVolumeUsd: 0,
    pendingSignalsCount: 0,
    publishedSignalsCount: 0,
    courseCount: 0,
    publishedCourseCount: 0,
    draftCourseCount: 0,
    averageCourseCompletionPercent: 0,
    onboardingReviewSubmittedAt: onboarding?.reviewSubmittedAt,
    ownerApprovalStatus: onboarding?.reviewSubmittedAt ? "pending_review" : "changes_requested",
    packageStatus,
    brandingReadiness,
    enterpriseReadiness,
    updatedAt: now
  };
}

export function mapDashboardSummaryRecord(
  record: Record<string, unknown> | null,
  workspaceId: string,
  onboarding?: OnboardingProgressDocument | null
): WorkspaceDashboardSummary {
  if (!record) {
    return createEmptyDashboardSummary(workspaceId, onboarding);
  }

  const activeStudentsCount = asNumber(record.activeStudentsCount);

  const updatedAt = normalizeIsoDate(record.updatedAt);
  const packageStatus = deriveWorkspacePackageStatus({
    workspace: {
      workspaceId,
      name: "Workspace",
      vettingStatus: "approved",
      createdAt: updatedAt,
      updatedAt
    },
    activeStudentCount: activeStudentsCount
  });
  const brandingReadiness = deriveWorkspaceBrandingReadiness({
    workspace: {
      name: "Workspace",
      branding: undefined,
      updatedAt
    },
    packageStatus
  });
  const enterpriseReadiness = deriveWorkspaceEnterpriseDeploymentReadiness({
    workspace: {
      workspaceId,
      updatedAt
    },
    packageStatus
  });

  return {
    workspaceId: asString(record.workspaceId, workspaceId),
    activeStudentsCount,
    trialStudentsCount: asNumber(record.trialStudentsCount),
    pastDueStudentsCount: asNumber(record.pastDueStudentsCount),
    monthlyRevenueNgn: asNumber(record.monthlyRevenueNgn),
    lifetimeRevenueNgn: asNumber(record.lifetimeRevenueNgn),
    paystackVolumeNgn: asNumber(record.paystackVolumeNgn),
    solanaVolumeUsd: asNumber(record.solanaVolumeUsd),
    pendingSignalsCount: asNumber(record.pendingSignalsCount),
    publishedSignalsCount: asNumber(record.publishedSignalsCount),
    lastSignalAt: record.lastSignalAt ? normalizeIsoDate(record.lastSignalAt) : undefined,
    courseCount: asNumber(record.courseCount),
    publishedCourseCount: asNumber(record.publishedCourseCount),
    draftCourseCount: asNumber(record.draftCourseCount),
    averageCourseCompletionPercent: asNumber(record.averageCourseCompletionPercent),
    onboardingReviewSubmittedAt: record.onboardingReviewSubmittedAt
      ? normalizeIsoDate(record.onboardingReviewSubmittedAt)
      : onboarding?.reviewSubmittedAt,
    ownerApprovalStatus: asString(
      record.ownerApprovalStatus,
      onboarding?.reviewSubmittedAt ? "pending_review" : "changes_requested"
    ) as WorkspaceDashboardSummary["ownerApprovalStatus"],
    packageStatus,
    brandingReadiness,
    enterpriseReadiness,
    updatedAt
  };
}

export function mapWorkspaceForDashboard(
  workspaceSnapshot: DocumentSnapshot<DocumentData>,
  workspaceId: string
): Workspace {
  return mapWorkspaceRecord(recordFromSnapshot(workspaceSnapshot, "workspaceId"), workspaceId);
}

export function mapOnboardingForDashboard(
  progressSnapshot: DocumentSnapshot<DocumentData>,
  workspaceId: string
) {
  if (!progressSnapshot.exists) {
    return createDefaultOnboardingProgress(workspaceId);
  }

  return mapOnboardingProgressRecord(recordFromSnapshot(progressSnapshot, "progressId"), workspaceId);
}

function normalizeWorkspaceStudentStatus(status: string): WorkspaceStudentRecord["status"] {
  switch (status) {
    case "trial":
      return "trial";
    case "past_due":
      return "past_due";
    case "cancelled":
    case "expired":
      return "cancelled";
    case "paused":
    case "inactive":
    case "unknown":
      return "paused";
    case "non_renewing":
    case "active":
    default:
      return "active";
  }
}

const lifecycleStatuses: WorkspaceStudentLifecycleStatus[] = [
  "active",
  "pending_onboarding",
  "payment_access_issue",
  "paused",
  "inactive",
  "needs_support"
];

function normalizeWorkspaceStudentLifecycleStatus(value: unknown) {
  return typeof value === "string" && lifecycleStatuses.includes(value as WorkspaceStudentLifecycleStatus)
    ? value as WorkspaceStudentLifecycleStatus
    : undefined;
}

function resolveWorkspaceStudentLifecycleStatus({
  record,
  status,
  paymentRail,
  supportFollowUpNeeded
}: {
  record: Record<string, unknown>;
  status: WorkspaceStudentRecord["status"];
  paymentRail: WorkspaceStudentRecord["paymentRail"];
  supportFollowUpNeeded: boolean;
}): WorkspaceStudentLifecycleStatus {
  if (supportFollowUpNeeded) {
    return "needs_support";
  }

  const explicitStatus = normalizeWorkspaceStudentLifecycleStatus(record.lifecycleStatus ?? record.operationalStatus);

  if (explicitStatus) {
    return explicitStatus;
  }

  if (status === "past_due" || status === "cancelled" || paymentRail === "unknown" || paymentRail === "manual") {
    return "payment_access_issue";
  }

  if (status === "paused") {
    return "paused";
  }

  if (status === "trial") {
    return "pending_onboarding";
  }

  if (status === "active") {
    return "active";
  }

  return "inactive";
}

const billingOpsStatuses: WorkspaceStudentBillingOpsStatus[] = [
  "unpaid_pending_payment",
  "active_subscription",
  "expired_cancelled_subscription",
  "verification_pending",
  "payment_mismatch_needs_admin_review",
  "payment_issue_resolved"
];

function normalizeBillingOpsStatus(value: unknown) {
  return typeof value === "string" && billingOpsStatuses.includes(value as WorkspaceStudentBillingOpsStatus)
    ? value as WorkspaceStudentBillingOpsStatus
    : undefined;
}

function resolveBillingOpsStatus({
  record,
  subscription,
  status,
  paymentRail
}: {
  record: Record<string, unknown>;
  subscription: StudentSubscription | null;
  status: WorkspaceStudentRecord["status"];
  paymentRail: WorkspaceStudentRecord["paymentRail"];
}): WorkspaceStudentBillingOpsStatus {
  const explicit = normalizeBillingOpsStatus(record.billingOpsStatus ?? record.paymentOpsStatus);

  if (explicit) {
    return explicit;
  }

  if (asBoolean(record.paymentMismatchNeedsReview) || asBoolean(record.billingAdminReviewPending)) {
    return "payment_mismatch_needs_admin_review";
  }

  const latestPaymentStatus = asString(record.latestPaymentStatus);

  if (latestPaymentStatus === "pending" || latestPaymentStatus === "checkout_opened" || asBoolean(record.paymentVerificationPending)) {
    return "verification_pending";
  }

  if (subscription?.status === "active" || subscription?.status === "trialing" || subscription?.status === "non_renewing") {
    return "active_subscription";
  }

  if (status === "past_due" || status === "cancelled" || subscription?.status === "expired" || subscription?.status === "cancelled") {
    return "expired_cancelled_subscription";
  }

  if (paymentRail === "unknown" || paymentRail === "manual" || !subscription) {
    return "unpaid_pending_payment";
  }

  return "payment_issue_resolved";
}

function billingOpsCopy(status: WorkspaceStudentBillingOpsStatus) {
  switch (status) {
    case "active_subscription":
      return {
        label: "Access active",
        detail: "Current subscription is active or in a supported non-renewing/trial state.",
        adminReviewPending: false
      };
    case "expired_cancelled_subscription":
      return {
        label: "Expired or cancelled",
        detail: "Subscription is no longer active. Student may need payment support before access changes.",
        adminReviewPending: true
      };
    case "verification_pending":
      return {
        label: "Verification pending",
        detail: "Checkout or verification is pending. Workspace cannot grant access from this view.",
        adminReviewPending: true
      };
    case "payment_mismatch_needs_admin_review":
      return {
        label: "Admin review pending",
        detail: "Payment/access mismatch needs Super Admin reconciliation before any access decision.",
        adminReviewPending: true
      };
    case "payment_issue_resolved":
      return {
        label: "Payment issue resolved",
        detail: "Latest workspace ops state marks the payment issue resolved.",
        adminReviewPending: false
      };
    case "unpaid_pending_payment":
    default:
      return {
        label: "Student needs payment support",
        detail: "No verified active subscription rail is available in the current workspace summary.",
        adminReviewPending: true
      };
  }
}

function practiceStudentRef(studentId: string) {
  const digest = createHash("sha256").update(studentId).digest("hex").slice(0, 8);

  return `student_${digest}`;
}

export function mapStudentRecord(
  record: Record<string, unknown>,
  workspace: Workspace,
  subscription: StudentSubscription | null
): WorkspaceStudentRecord {
  const entitlements = resolveStudentEntitlements({
    workspace,
    studentRecord: record,
    subscription
  });
  const courseEntitlement = getFeatureEntitlement(entitlements, "course");
  const signalEntitlement = getFeatureEntitlement(entitlements, "signalAlerts");
  const autoCopyEntitlement = getFeatureEntitlement(entitlements, "autoCopy");
  const journalEntitlement = getFeatureEntitlement(entitlements, "journal");
  const status = normalizeWorkspaceStudentStatus(entitlements.subscriptionStatus);
  const paymentRail = (subscription?.rail ?? asString(record.paymentRail, "unknown")) as WorkspaceStudentRecord["paymentRail"];
  const supportFollowUpNeeded = asBoolean(record.supportFollowUpNeeded);
  const billingOpsStatus = resolveBillingOpsStatus({
    record,
    subscription,
    status,
    paymentRail
  });
  const billingCopy = billingOpsCopy(billingOpsStatus);

  return {
    studentId: asString(record.studentId),
    practiceStudentRef: practiceStudentRef(asString(record.studentId)),
    workspaceId: asString(record.workspaceId, workspace.workspaceId),
    displayName: asString(record.displayName, "Unnamed student"),
    email: asString(record.email) || undefined,
    tierId: entitlements.tierId,
    tierLabel: entitlements.tierLabel,
    status,
    paymentRail,
    billingOpsStatus,
    billingOpsLabel: billingCopy.label,
    billingOpsDetail: billingCopy.detail,
    billingAdminReviewPending: billingCopy.adminReviewPending,
    lifecycleStatus: resolveWorkspaceStudentLifecycleStatus({
      record,
      status,
      paymentRail,
      supportFollowUpNeeded
    }),
    supportFollowUpNeeded,
    supportNoteSummary: asString(record.supportNoteSummary) || undefined,
    supportUpdatedAt: record.supportUpdatedAt ? normalizeIsoDate(record.supportUpdatedAt) : undefined,
    supportUpdatedByRef: asString(record.supportUpdatedByRef) || undefined,
    joinedAt: normalizeIsoDate(record.joinedAt),
    lastSeenAt: record.lastSeenAt || record.lastActiveAt
      ? normalizeIsoDate(record.lastSeenAt ?? record.lastActiveAt)
      : undefined,
    courseCompletionPercent: asNumber(record.courseCompletionPercent, asNumber(record.courseProgressPercent)),
    courseAccessState: courseEntitlement.access,
    courseAccessReason: courseEntitlement.reason,
    signalAccess: signalEntitlement.access === "allowed",
    signalAccessState: signalEntitlement.access,
    signalAccessReason: signalEntitlement.reason,
    autoCopyEligible: autoCopyEntitlement.access === "allowed",
    autoCopyAccessState: autoCopyEntitlement.access,
    autoCopyAccessReason: autoCopyEntitlement.reason,
    journalAccessState: journalEntitlement.access,
    journalAccessReason: journalEntitlement.reason,
    riskPosture: entitlements.riskPosture
  };
}

export function mapCourseRecord(record: Record<string, unknown>, workspaceId: string): WorkspaceCourseListItem {
  const sections = recordArray(record.sections);
  const lessons = sections.flatMap((section) => recordArray(section.lessons));
  const resourceCounts = lessons.map((lesson) => recordArray(lesson.attachments).length);
  const totalResourceCount = resourceCounts.reduce((total, count) => total + count, 0);
  const now = new Date().toISOString();

  return {
    courseId: asString(record.courseId),
    workspaceId: asString(record.workspaceId, workspaceId),
    title: asString(record.title, "Untitled course"),
    description: asString(record.description),
    accessTier: asString(record.accessTier, "all"),
    published: asBoolean(record.published),
    sectionCount: sections.length,
    lessonCount: lessons.length,
    resourceSummary: {
      lessonsWithResourcesCount: resourceCounts.filter((count) => count > 0).length,
      totalResourceCount
    },
    createdAt: normalizeIsoDate(record.createdAt, now),
    updatedAt: normalizeIsoDate(record.updatedAt, normalizeIsoDate(record.createdAt, now))
  };
}

export function mapSignalRecord(record: Record<string, unknown>, workspaceId: string): WorkspaceSignalRecord {
  const createdAt = normalizeIsoDate(record.createdAt);

  return {
    signalId: asString(record.signalId),
    workspaceId: asString(record.workspaceId, workspaceId),
    source: normalizeSignalSource(record.source),
    status: normalizeSignalStatus(record.status),
    lifecycle: normalizeSignalLifecycle(record.lifecycle),
    market: asString(record.market, "forex") as WorkspaceSignalRecord["market"],
    pair: asString(record.pair),
    direction: asString(record.direction, asString(record.action, "buy")) as WorkspaceSignalRecord["direction"],
    entry: asString(record.entry),
    takeProfit: asString(record.takeProfit),
    stopLoss: asString(record.stopLoss),
    riskLabel: asString(record.riskLabel, "medium") as WorkspaceSignalRecord["riskLabel"],
    notes: asString(record.notes) || undefined,
    deliveryMode: asString(record.deliveryMode, "alerts_only") as WorkspaceSignalRecord["deliveryMode"],
    externalSignalProof: mapExternalSignalProof(record.externalSignalProof),
    createdAt,
    updatedAt: normalizeIsoDate(record.updatedAt, createdAt),
    publishedAt: record.publishedAt ? normalizeIsoDate(record.publishedAt) : undefined
  };
}
