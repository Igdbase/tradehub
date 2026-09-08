import { createHash } from "node:crypto";
import type { DocumentData, Query } from "firebase-admin/firestore";
import { routePublishedCryptoSignalForLiveProductionExecution } from "@/lib/crypto-execution/crypto-live-production";
import { routePublishedCryptoSignalForLiveSandboxExecution } from "@/lib/crypto-execution/crypto-live-sandbox";
import { routePublishedCryptoSignalForPaperExecution } from "@/lib/crypto-execution/crypto-signal-routing";
import { routePublishedForexSignalForDemoExecution } from "@/lib/crypto-execution/forex-demo-execution";
import { routePublishedForexSignalForLiveCanaryExecution } from "@/lib/crypto-execution/forex-live-canary-execution";
import { routePublishedForexSignalForPaperExecution } from "@/lib/crypto-execution/forex-paper-execution";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import {
  buildAuditEvent
} from "@/lib/workspace/onboarding-mappers";
import {
  mapPaymentIntent,
  mapSubscriptionRecord,
  recordFromSnapshot as billingRecordFromSnapshot
} from "@/lib/billing/billing-mappers";
import {
  createEmptyDashboardSummary,
  createSourceMeta,
  mapCourseRecord,
  mapDashboardSummaryRecord,
  mapOnboardingForDashboard,
  mapSignalRecord,
  mapStudentRecord,
  mapWorkspaceForDashboard,
  recordFromSnapshot
} from "@/lib/workspace/dashboard-mappers";
import { deriveWorkspacePackageStatus } from "@/lib/workspace/workspace-package-licence";
import { deriveWorkspaceBrandingReadiness } from "@/lib/workspace/workspace-branding-readiness";
import { deriveWorkspaceEnterpriseDeploymentReadiness } from "@/lib/workspace/workspace-enterprise-readiness";
import {
  parseCourseFilters,
  parseSignalFilters,
  parseStudentFilters,
  validateSignalDraftPayload,
  validateSignalPatchPayload,
  validateStudentSupportPatchPayload,
  type WorkspaceListFilters,
  type WorkspaceSignalFilters,
  type WorkspaceStudentFilters
} from "@/lib/workspace/dashboard-validation";
import type {
  PaymentIntent,
  StudentSubscription
} from "@/types/payments";
import type { Workspace } from "@/types/workspace";
import type {
  WorkspaceCoursesResponse,
  WorkspaceDashboardResponse,
  WorkspaceDashboardSummary,
  WorkspaceSignalMutationResponse,
  WorkspaceSignalRecord,
  WorkspaceSignalStatus,
  WorkspaceSignalsResponse,
  WorkspaceStudentRecord,
  WorkspaceStudentSupportMutationResponse,
  WorkspaceStudentsResponse
} from "@/types/workspace-dashboard";

const DASHBOARD_DERIVATION_LIMIT = 200;

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

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function applySearch<T>(
  items: T[],
  q: string | undefined,
  matcher: (item: T, q: string) => boolean
) {
  if (!q) {
    return items;
  }

  const normalized = q.toLowerCase();
  return items.filter((item) => matcher(item, normalized));
}

function pageInfo(limit: number, loadedCount: number, nextCursor: string | null) {
  return {
    limit,
    nextCursor,
    hasMore: Boolean(nextCursor),
    totalLoaded: loadedCount
  };
}

function supportActorRef(actor: VerifiedInfluencer) {
  const digest = createHash("sha256").update(actor.uid).digest("hex").slice(0, 8);

  return `workspace_user_${digest}`;
}

function addLimitedSearchWarning(warnings: string[], q?: string) {
  if (q) {
    warnings.push(
      "Search is applied to the loaded page only. Indexed workspace search can be added later without scanning entire collections."
    );
  }
}

function rankStudentStatus(status: string) {
  if (status === "active") {
    return 5;
  }

  if (status === "trial") {
    return 4;
  }

  if (status === "past_due") {
    return 3;
  }

  if (status === "paused") {
    return 2;
  }

  if (status === "cancelled") {
    return 1;
  }

  return 0;
}

function rankStudentPaymentRail(paymentRail: string) {
  if (paymentRail === "paystack") {
    return 5;
  }

  if (paymentRail === "solana") {
    return 4;
  }

  if (paymentRail === "manual") {
    return 2;
  }

  return 0;
}

function pickPreferredStudentRecord<T extends {
  email?: string;
  joinedAt?: string;
  status?: string;
  courseCompletionPercent?: number;
  paymentRail?: string;
  lastSeenAt?: string;
}>(
  current: T,
  candidate: T
) {
  const currentStatusRank = rankStudentStatus(current.status ?? "");
  const candidateStatusRank = rankStudentStatus(candidate.status ?? "");

  if (candidateStatusRank > currentStatusRank) {
    return candidate;
  }

  if (candidateStatusRank < currentStatusRank) {
    return current;
  }

  const currentRailRank = rankStudentPaymentRail(current.paymentRail ?? "");
  const candidateRailRank = rankStudentPaymentRail(candidate.paymentRail ?? "");

  if (candidateRailRank > currentRailRank) {
    return candidate;
  }

  if (candidateRailRank < currentRailRank) {
    return current;
  }

  const currentProgress = current.courseCompletionPercent ?? 0;
  const candidateProgress = candidate.courseCompletionPercent ?? 0;

  if (candidateProgress > currentProgress) {
    return candidate;
  }

  if (candidateProgress < currentProgress) {
    return current;
  }

  const currentSeen = current.lastSeenAt ?? current.joinedAt ?? "";
  const candidateSeen = candidate.lastSeenAt ?? candidate.joinedAt ?? "";

  if (candidateSeen > currentSeen) {
    return candidate;
  }

  if (candidateSeen < currentSeen) {
    return current;
  }

  return (candidate.courseCompletionPercent ?? 0) >= (current.courseCompletionPercent ?? 0)
    ? candidate
    : current;
}

function dedupeWorkspaceStudents<T extends {
  studentId: string;
  email?: string;
  joinedAt?: string;
  status?: string;
  courseCompletionPercent?: number;
  paymentRail?: string;
  lastSeenAt?: string;
}>(students: T[]) {
  const byKey = new Map<string, T>();

  for (const student of students) {
    const key = student.email?.trim().toLowerCase() || student.studentId;
    const current = byKey.get(key);

    if (!current) {
      byKey.set(key, student);
      continue;
    }

    byKey.set(key, pickPreferredStudentRecord(current, student));
  }

  return Array.from(byKey.values());
}

async function hydrateStudentCourseCompletion(
  actor: VerifiedInfluencer,
  records: Record<string, unknown>[]
) {
  const { db } = getFirebaseAdminClients();

  if (records.length === 0) {
    return records;
  }

  const summaryRefs = records.map((record) =>
    db.doc(`workspaces/${actor.workspaceId}/students/${record.studentId}/app_summary/current`)
  );
  const summarySnapshots = await db.getAll(...summaryRefs);

  return Promise.all(
    records.map(async (record, index) => {
      const parentProgress = asNumber(record.courseCompletionPercent, asNumber(record.courseProgressPercent, -1));
      const summaryRecord = summarySnapshots[index].exists
        ? recordFromSnapshot(summarySnapshots[index], "summaryId")
        : null;
      const summaryProgress =
        summaryRecord === null
          ? -1
          : asNumber(summaryRecord.courseProgressPercent, asNumber(summaryRecord.courseCompletionPercent, -1));

      if (summaryProgress >= 0) {
        return {
          ...record,
          courseCompletionPercent: summaryProgress,
          courseProgressPercent: summaryProgress
        };
      }

      if (parentProgress > 0) {
        return record;
      }

      const courseProgressSnapshot = await db
        .collection(`workspaces/${actor.workspaceId}/students/${record.studentId}/course_progress`)
        .get();

      if (courseProgressSnapshot.empty) {
        return record;
      }

      const progressRecords = courseProgressSnapshot.docs.map((entry) =>
        recordFromSnapshot(entry, "courseId")
      );
      const derivedProgress = Math.round(
        progressRecords.reduce((total, entry) => total + asNumber(entry.overallPercent), 0) / progressRecords.length
      );

      return {
        ...record,
        courseCompletionPercent: derivedProgress,
        courseProgressPercent: derivedProgress
      };
    })
  );
}

function verifiedAtOrCreatedAt(intent: PaymentIntent) {
  return intent.verifiedAt ?? intent.createdAt;
}

function isInCurrentMonth(isoDate: string, now: Date) {
  const value = Date.parse(isoDate);

  if (!Number.isFinite(value)) {
    return false;
  }

  const date = new Date(value);

  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
}

function isActiveForRevenue(subscription: StudentSubscription | null, student: WorkspaceStudentRecord) {
  const status = subscription?.status ?? student.status;

  return status === "active" || status === "trialing" || status === "non_renewing";
}

function workspaceOwnerStatus(workspace: Workspace, onboarding: NonNullable<WorkspaceDashboardResponse["onboarding"]>) {
  if (workspace.vettingStatus === "approved") {
    return "approved" as const;
  }

  if (workspace.vettingStatus === "rejected" || workspace.vettingStatus === "suspended") {
    return "changes_requested" as const;
  }

  return onboarding.reviewSubmittedAt ? "pending_review" as const : "changes_requested" as const;
}

async function listVerifiedWorkspacePaymentsForDashboard(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/payment_intents`)
    .where("status", "==", "verified")
    .limit(DASHBOARD_DERIVATION_LIMIT)
    .get();

  return snapshot.docs
    .map((doc) => mapPaymentIntent(billingRecordFromSnapshot(doc, "paymentIntentId")))
    .filter((intent) => intent.status === "verified")
    .sort((left, right) => verifiedAtOrCreatedAt(right).localeCompare(verifiedAtOrCreatedAt(left)));
}

async function listStudentsForDashboardSummary(actor: VerifiedInfluencer, workspace: Workspace) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${actor.workspaceId}/students`)
    .orderBy("joinedAt", "desc")
    .limit(DASHBOARD_DERIVATION_LIMIT)
    .get();
  const rawRecords = snapshot.docs.map((doc) => recordFromSnapshot(doc, "studentId"));
  const hydratedRecords = await hydrateStudentCourseCompletion(actor, rawRecords);
  const subscriptionRefs = hydratedRecords.map((record) =>
    db.doc(`workspaces/${actor.workspaceId}/students/${record.studentId}/subscriptions/current`)
  );
  const subscriptionSnapshots = subscriptionRefs.length > 0 ? await db.getAll(...subscriptionRefs) : [];

  return {
    capped: snapshot.docs.length === DASHBOARD_DERIVATION_LIMIT,
    entries: hydratedRecords.map((record, index) => {
      const subscription = mapSubscriptionRecord(
        subscriptionSnapshots[index]?.exists
          ? billingRecordFromSnapshot(subscriptionSnapshots[index], "subscriptionId")
          : null,
        actor.workspaceId,
        String(record.studentId ?? "")
      );

      return {
        subscription,
        student: mapStudentRecord(record, workspace, subscription)
      };
    })
  };
}

async function deriveWorkspaceDashboardSummary({
  actor,
  workspace,
  onboarding
}: {
  actor: VerifiedInfluencer;
  workspace: Workspace;
  onboarding: NonNullable<WorkspaceDashboardResponse["onboarding"]>;
}): Promise<{ summary: WorkspaceDashboardSummary; warnings: string[] }> {
  const { db } = getFirebaseAdminClients();
  const [
    studentResult,
    verifiedPayments,
    courseSnapshot,
    signalSnapshot
  ] = await Promise.all([
    listStudentsForDashboardSummary(actor, workspace),
    listVerifiedWorkspacePaymentsForDashboard(actor.workspaceId),
    db.collection(`workspaces/${actor.workspaceId}/courses`).limit(DASHBOARD_DERIVATION_LIMIT).get(),
    db.collection(`workspaces/${actor.workspaceId}/signals`).limit(DASHBOARD_DERIVATION_LIMIT).get()
  ]);
  const students = dedupeWorkspaceStudents(studentResult.entries.map((entry) => entry.student));
  const now = new Date();
  const monthlyRevenueNgn = verifiedPayments.reduce(
    (total, intent) => total + (isInCurrentMonth(verifiedAtOrCreatedAt(intent), now) ? intent.amountNgn : 0),
    0
  );
  const lifetimeRevenueNgn = verifiedPayments.reduce((total, intent) => total + intent.amountNgn, 0);
  const courseRecords = courseSnapshot.docs.map((doc) =>
    mapCourseRecord(recordFromSnapshot(doc, "courseId"), actor.workspaceId)
  );
  const signalRecords = signalSnapshot.docs.map((doc) =>
    mapSignalRecord(recordFromSnapshot(doc, "signalId"), actor.workspaceId)
  );
  const publishedSignals = signalRecords.filter((signal) => signal.status === "published");
  const latestSignal = publishedSignals
    .map((signal) => signal.publishedAt ?? signal.updatedAt)
    .sort((left, right) => right.localeCompare(left))[0];
  const activeStudents = studentResult.entries.filter(({ subscription, student }) =>
    isActiveForRevenue(subscription, student)
  );
  const activeStudentCount = activeStudents.filter(({ student }) => student.status === "active").length;
  const packageStatus = deriveWorkspacePackageStatus({
    workspace,
    activeStudentCount
  });
  const brandingReadiness = deriveWorkspaceBrandingReadiness({
    workspace,
    packageStatus
  });
  const enterpriseReadiness = deriveWorkspaceEnterpriseDeploymentReadiness({
    workspace,
    packageStatus
  });
  const averageCourseCompletionPercent =
    students.length === 0
      ? 0
      : Math.round(
          students.reduce((total, student) => total + student.courseCompletionPercent, 0) / students.length
        );
  const warnings = [
    "Dashboard totals are derived from bounded workspace records so influencer revenue ignores pending, expired, failed, or abandoned payment intents."
  ];

  if (studentResult.capped || verifiedPayments.length === DASHBOARD_DERIVATION_LIMIT) {
    warnings.push(
      "Dashboard totals use the latest bounded workspace window. Add persisted analytics when this workspace grows beyond the MVP window."
    );
  }

  if (courseSnapshot.docs.length === DASHBOARD_DERIVATION_LIMIT || signalSnapshot.docs.length === DASHBOARD_DERIVATION_LIMIT) {
    warnings.push(
      "Course or signal totals reached the bounded dashboard window. Persisted analytics should take over before launch scale."
    );
  }

  if (packageStatus.overLimit) {
    warnings.push(
      "Workspace active student count is over the current package seat cap. Contact TradeHub support before adding more active students."
    );
  }

  return {
    warnings,
    summary: {
      workspaceId: actor.workspaceId,
      activeStudentsCount: activeStudentCount,
      trialStudentsCount: students.filter((student) => student.status === "trial").length,
      pastDueStudentsCount: students.filter((student) => student.status === "past_due").length,
      monthlyRevenueNgn,
      lifetimeRevenueNgn,
      paystackVolumeNgn: verifiedPayments
        .filter((intent) => intent.rail === "paystack")
        .reduce((total, intent) => total + intent.amountNgn, 0),
      solanaVolumeUsd: verifiedPayments
        .filter((intent) => intent.rail === "solana")
        .reduce((total, intent) => total + intent.amountUsdc, 0),
      pendingSignalsCount: signalRecords.filter((signal) => signal.status === "draft").length,
      publishedSignalsCount: publishedSignals.length,
      lastSignalAt: latestSignal,
      courseCount: courseRecords.length,
      publishedCourseCount: courseRecords.filter((course) => course.published).length,
      draftCourseCount: courseRecords.filter((course) => !course.published).length,
      averageCourseCompletionPercent,
      onboardingReviewSubmittedAt: onboarding.reviewSubmittedAt,
      ownerApprovalStatus: workspaceOwnerStatus(workspace, onboarding),
      packageStatus,
      brandingReadiness,
      enterpriseReadiness,
      updatedAt: new Date().toISOString()
    }
  };
}

export function parseWorkspaceStudentRequest(request: Request): WorkspaceStudentFilters {
  return parseStudentFilters(new URL(request.url).searchParams);
}

export function parseWorkspaceCourseRequest(request: Request): WorkspaceListFilters {
  return parseCourseFilters(new URL(request.url).searchParams);
}

export function parseWorkspaceSignalRequest(request: Request): WorkspaceSignalFilters {
  return parseSignalFilters(new URL(request.url).searchParams);
}

export async function getWorkspaceDashboard(
  actor: VerifiedInfluencer
): Promise<WorkspaceDashboardResponse> {
  const { db } = getFirebaseAdminClients();
  const workspaceId = actor.workspaceId;
  const workspaceRef = db.doc(`workspaces/${workspaceId}`);
  const onboardingRef = db.doc(`workspaces/${workspaceId}/onboarding/current`);
  const summaryRef = db.doc(`workspaces/${workspaceId}/dashboard/current`);
  const [workspaceSnapshot, onboardingSnapshot, summarySnapshot] = await Promise.all([
    workspaceRef.get(),
    onboardingRef.get(),
    summaryRef.get()
  ]);

  if (!workspaceSnapshot.exists) {
    return {
      ...createSourceMeta(["The workspace claim is valid, but the owner has not prepared the workspace shell yet."]),
      ok: true,
      workspacePrepared: false,
      workspace: null,
      onboarding: null,
      summary: createEmptyDashboardSummary(workspaceId)
    };
  }

  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, workspaceId);
  const onboarding = mapOnboardingForDashboard(onboardingSnapshot, workspaceId);
  const warnings: string[] = [];

  if (!summarySnapshot.exists) {
    warnings.push(
      "workspaces/{workspaceId}/dashboard/current is missing, so this response derives bounded live workspace totals instead."
    );
  }

  let summary = mapDashboardSummaryRecord(
    summarySnapshot.exists ? recordFromSnapshot(summarySnapshot, "summaryId") : null,
    workspaceId,
    onboarding
  );

  try {
    const derived = await deriveWorkspaceDashboardSummary({
      actor,
      workspace,
      onboarding
    });

    summary = derived.summary;
    warnings.push(...derived.warnings);
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `TradeHub could not derive live dashboard totals, so the persisted dashboard summary is being used. ${error.message}`
        : "TradeHub could not derive live dashboard totals, so the persisted dashboard summary is being used."
    );
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspacePrepared: true,
    workspace,
    onboarding,
    summary
  };
}

export async function listWorkspaceStudents(
  actor: VerifiedInfluencer,
  filters: WorkspaceStudentFilters
): Promise<WorkspaceStudentsResponse> {
  const { db } = getFirebaseAdminClients();
  const workspaceRef = db.doc(`workspaces/${actor.workspaceId}`);
  let query: Query<DocumentData> = db.collection(`workspaces/${actor.workspaceId}/students`);

  if (filters.status !== "all") {
    query = query.where("status", "==", filters.status);
  }

  query = query.orderBy("joinedAt", "desc");

  if (filters.cursor) {
    query = query.startAfter(filters.cursor);
  }

  const [workspaceSnapshot, snapshot] = await Promise.all([
    workspaceRef.get(),
    query.limit(filters.limit).get()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This workspace was not found.");
  }

  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, actor.workspaceId);
  const rawLoaded = snapshot.docs.map((doc) => recordFromSnapshot(doc, "studentId"));
  const hydratedRecords = await hydrateStudentCourseCompletion(actor, rawLoaded);
  const subscriptionRefs = hydratedRecords.map((record) =>
    db.doc(`workspaces/${actor.workspaceId}/students/${record.studentId}/subscriptions/current`)
  );
  const subscriptionSnapshots =
    subscriptionRefs.length > 0 ? await db.getAll(...subscriptionRefs) : [];
  const loaded = hydratedRecords.map((record, index) =>
    mapStudentRecord(
      record,
      workspace,
      mapSubscriptionRecord(
        subscriptionSnapshots[index]?.exists
          ? billingRecordFromSnapshot(subscriptionSnapshots[index], "subscriptionId")
          : null,
        actor.workspaceId,
        String(record.studentId ?? "")
      )
    )
  );
  const warnings: string[] = [];
  const dedupedLoaded = dedupeWorkspaceStudents(loaded);

  if (dedupedLoaded.length !== loaded.length) {
    warnings.push(
      "Duplicate student records with the same email were collapsed in this workspace view so progress stays trustworthy."
    );
  }

  addLimitedSearchWarning(warnings, filters.q);
  const students = applySearch(
    dedupedLoaded,
    filters.q,
    (student, q) =>
      `${student.displayName} ${student.email ?? ""} ${student.tierLabel} ${student.practiceStudentRef} ${student.lifecycleStatus} ${student.paymentRail}`.toLowerCase().includes(q)
  );
  const nextCursor =
    snapshot.docs.length === filters.limit ? dedupedLoaded[dedupedLoaded.length - 1]?.joinedAt ?? null : null;

  return {
    ...createSourceMeta(warnings),
    ok: true,
    students,
    pageInfo: pageInfo(filters.limit, students.length, nextCursor)
  };
}

export async function updateWorkspaceStudentSupportState(
  actor: VerifiedInfluencer,
  studentId: string,
  payload: unknown
): Promise<WorkspaceStudentSupportMutationResponse> {
  const values = validateStudentSupportPatchPayload(payload);
  const { db } = getFirebaseAdminClients();
  const workspaceRef = db.doc(`workspaces/${actor.workspaceId}`);
  const studentRef = db.doc(`workspaces/${actor.workspaceId}/students/${studentId}`);
  const [workspaceSnapshot, studentSnapshot] = await Promise.all([
    workspaceRef.get(),
    studentRef.get()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This workspace was not found.");
  }

  if (!studentSnapshot.exists) {
    throw new AdminApiError(404, "student_not_found", "That student was not found in this workspace.");
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    supportUpdatedAt: now,
    supportUpdatedByRef: supportActorRef(actor),
    updatedAt: now
  };

  if (values.action === "mark_support_follow_up") {
    updates.supportFollowUpNeeded = true;
  }

  if (values.action === "clear_support_follow_up") {
    updates.supportFollowUpNeeded = false;
  }

  if (values.action === "save_support_note" || values.action === "mark_support_follow_up") {
    if (values.supportNoteSummary !== undefined) {
      updates.supportNoteSummary = values.supportNoteSummary;
    }
  }

  if (values.action === "update_operational_status" && values.lifecycleStatus) {
    updates.lifecycleStatus = values.lifecycleStatus;
    updates.operationalStatus = values.lifecycleStatus;
    updates.supportFollowUpNeeded = values.lifecycleStatus === "needs_support";
  }

  const auditEvent = buildAuditEvent({
    actor,
    action: `workspace.student_crm.${values.action}`,
    targetType: "workspace",
    targetId: studentId,
    before: {
      supportFollowUpNeeded: studentSnapshot.get("supportFollowUpNeeded") === true,
      lifecycleStatus: studentSnapshot.get("lifecycleStatus") ?? studentSnapshot.get("operationalStatus") ?? null
    },
    after: {
      supportFollowUpNeeded: updates.supportFollowUpNeeded,
      lifecycleStatus: updates.lifecycleStatus,
      supportNoteSummaryUpdated: values.supportNoteSummary !== undefined
    },
    now
  });
  const batch = db.batch();

  batch.set(studentRef, stripUndefined(updates), { merge: true });
  batch.set(db.doc(`audit_log/${auditEvent.eventId}`), stripUndefined(auditEvent));
  await batch.commit();

  const [updatedStudentSnapshot, subscriptionSnapshot] = await Promise.all([
    studentRef.get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${studentId}/subscriptions/current`).get()
  ]);
  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, actor.workspaceId);
  const studentRecord = recordFromSnapshot(updatedStudentSnapshot, "studentId");
  const hydrated = await hydrateStudentCourseCompletion(actor, [studentRecord]);
  const subscription = mapSubscriptionRecord(
    subscriptionSnapshot.exists
      ? billingRecordFromSnapshot(subscriptionSnapshot, "subscriptionId")
      : null,
    actor.workspaceId,
    studentId
  );

  return {
    ...createSourceMeta([
      "Student support updates are workspace-scoped Admin SDK writes. Notes are internal summaries and are not returned through student APIs."
    ]),
    ok: true,
    student: mapStudentRecord(hydrated[0] ?? studentRecord, workspace, subscription)
  };
}

export async function listWorkspaceCourses(
  actor: VerifiedInfluencer,
  filters: WorkspaceListFilters
): Promise<WorkspaceCoursesResponse> {
  const { db } = getFirebaseAdminClients();
  let query: Query<DocumentData> = db
    .collection(`workspaces/${actor.workspaceId}/courses`)
    .orderBy("updatedAt", "desc");

  if (filters.cursor) {
    query = query.startAfter(filters.cursor);
  }

  const snapshot = await query.limit(filters.limit).get();
  const loaded = snapshot.docs.map((doc) =>
    mapCourseRecord(recordFromSnapshot(doc, "courseId"), actor.workspaceId)
  );
  const warnings: string[] = [];
  addLimitedSearchWarning(warnings, filters.q);
  const courses = applySearch(
    loaded,
    filters.q,
    (course, q) => `${course.title} ${course.description}`.toLowerCase().includes(q)
  );
  const nextCursor =
    snapshot.docs.length === filters.limit
      ? mapCourseRecord(recordFromSnapshot(snapshot.docs[snapshot.docs.length - 1], "courseId"), actor.workspaceId).updatedAt
      : null;

  return {
    ...createSourceMeta(warnings),
    ok: true,
    courses,
    pageInfo: pageInfo(filters.limit, courses.length, nextCursor)
  };
}

export async function listWorkspaceSignals(
  actor: VerifiedInfluencer,
  filters: WorkspaceSignalFilters
): Promise<WorkspaceSignalsResponse> {
  const { db } = getFirebaseAdminClients();
  let query: Query<DocumentData> = db.collection(`workspaces/${actor.workspaceId}/signals`);

  if (filters.status !== "all") {
    query = query.where("status", "==", filters.status);
  }

  query = query.orderBy("updatedAt", "desc");

  if (filters.cursor) {
    query = query.startAfter(filters.cursor);
  }

  const snapshot = await query.limit(filters.limit).get();
  const loaded = snapshot.docs.map((doc) =>
    mapSignalRecord(recordFromSnapshot(doc, "signalId"), actor.workspaceId)
  );
  const warnings: string[] = [];
  addLimitedSearchWarning(warnings, filters.q);
  const signals = applySearch(
    loaded,
    filters.q,
    (signal, q) => `${signal.pair} ${signal.market} ${signal.notes ?? ""}`.toLowerCase().includes(q)
  );
  const nextCursor =
    snapshot.docs.length === filters.limit
      ? mapSignalRecord(recordFromSnapshot(snapshot.docs[snapshot.docs.length - 1], "signalId"), actor.workspaceId).updatedAt
      : null;

  return {
    ...createSourceMeta(warnings),
    ok: true,
    signals,
    pageInfo: pageInfo(filters.limit, signals.length, nextCursor)
  };
}

export async function createWorkspaceSignal(
  actor: VerifiedInfluencer,
  payload: unknown
): Promise<WorkspaceSignalMutationResponse> {
  const values = validateSignalDraftPayload(payload);
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const signalId = `sig_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const signal: WorkspaceSignalRecord = stripUndefined({
    signalId,
    workspaceId: actor.workspaceId,
    source: "in_app",
    status: values.publish ? "published" as const : "draft" as const,
    market: values.market,
    pair: values.pair,
    direction: values.direction,
    entry: values.entry,
    takeProfit: values.takeProfit,
    stopLoss: values.stopLoss,
    riskLabel: values.riskLabel,
    notes: values.notes,
    deliveryMode: values.deliveryMode,
    createdAt: now,
    updatedAt: now,
    publishedAt: values.publish ? now : undefined
  });
  const auditEvent = buildAuditEvent({
    actor,
    action: values.publish ? "workspace.signal.create_published" : "workspace.signal.create_draft",
    targetType: "workspace",
    targetId: actor.workspaceId,
    after: { signalId, status: signal.status, pair: signal.pair },
    now
  });
  const batch = db.batch();

  batch.set(db.doc(`workspaces/${actor.workspaceId}/signals/${signalId}`), signal);
  batch.set(db.doc(`audit_log/${auditEvent.eventId}`), stripUndefined(auditEvent));
  await batch.commit();

  const cryptoRoutingSummary =
    signal.status === "published" && signal.market === "crypto"
      ? await routePublishedCryptoSignalForPaperExecution({
          actor,
          signal,
          trigger: "created_published"
        })
      : undefined;
  const forexPaperRoutingSummary =
    signal.status === "published" && signal.market === "forex"
      ? await routePublishedForexSignalForPaperExecution({
          actor,
          signal,
          trigger: "created_published"
        })
      : undefined;
  const forexDemoRoutingSummary =
    signal.status === "published" && signal.market === "forex"
      ? await routePublishedForexSignalForDemoExecution({
          actor,
          signal,
          trigger: "created_published"
        })
      : undefined;
  const forexLiveCanaryRoutingSummary =
    signal.status === "published" && signal.market === "forex"
      ? await routePublishedForexSignalForLiveCanaryExecution({
          actor,
          signal,
          trigger: "created_published"
        })
      : undefined;
  const liveSandboxRoutingSummary =
    signal.status === "published" && signal.market === "crypto"
      ? await routePublishedCryptoSignalForLiveSandboxExecution({
          actor,
          signal
        })
      : undefined;
  const liveProductionRoutingSummary =
    signal.status === "published" && signal.market === "crypto"
      ? await routePublishedCryptoSignalForLiveProductionExecution({
          actor,
          signal
        })
      : undefined;
  const warnings = [
    ...(cryptoRoutingSummary?.warnings ?? []),
    ...(forexPaperRoutingSummary?.warnings ?? []),
    ...(forexDemoRoutingSummary?.warnings ?? []),
    ...(forexLiveCanaryRoutingSummary?.warnings ?? []),
    ...(liveSandboxRoutingSummary?.warnings ?? []),
    ...(liveProductionRoutingSummary?.warnings ?? [])
  ];

  return {
    ...createSourceMeta(warnings),
    ok: true,
    signal,
    auditEvent,
    cryptoRoutingSummary,
    forexPaperRoutingSummary,
    forexDemoRoutingSummary,
    forexLiveCanaryRoutingSummary,
    liveSandboxRoutingSummary,
    liveProductionRoutingSummary
  };
}

export async function patchWorkspaceSignal({
  actor,
  signalId,
  payload
}: {
  actor: VerifiedInfluencer;
  signalId: string;
  payload: unknown;
}): Promise<WorkspaceSignalMutationResponse> {
  const { db } = getFirebaseAdminClients();
  const signalRef = db.doc(`workspaces/${actor.workspaceId}/signals/${signalId}`);
  const snapshot = await signalRef.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "signal_not_found", "That signal was not found.");
  }

  const current = mapSignalRecord(recordFromSnapshot(snapshot, "signalId"), actor.workspaceId);
  const values = validateSignalPatchPayload(payload, current);
  const now = new Date().toISOString();
  const nextStatus: WorkspaceSignalStatus =
    values.action === "publish"
      ? "published"
      : values.action === "cancel"
        ? "cancelled"
        : "draft";
  const signal: WorkspaceSignalRecord = stripUndefined({
    ...current,
    market: values.market ?? current.market,
    pair: values.pair ?? current.pair,
    direction: values.direction ?? current.direction,
    entry: values.entry ?? current.entry,
    takeProfit: values.takeProfit ?? current.takeProfit,
    stopLoss: values.stopLoss ?? current.stopLoss,
    riskLabel: values.riskLabel ?? current.riskLabel,
    notes: values.notes ?? current.notes,
    deliveryMode: values.deliveryMode ?? current.deliveryMode,
    status: nextStatus,
    updatedAt: now,
    publishedAt: values.action === "publish" ? current.publishedAt ?? now : current.publishedAt
  });
  const auditEvent = buildAuditEvent({
    actor,
    action: `workspace.signal.${values.action}`,
    targetType: "workspace",
    targetId: actor.workspaceId,
    before: { signalId: current.signalId, status: current.status },
    after: { signalId: signal.signalId, status: signal.status },
    now
  });
  const batch = db.batch();

  batch.set(signalRef, signal, { merge: true });
  batch.set(db.doc(`audit_log/${auditEvent.eventId}`), stripUndefined(auditEvent));
  await batch.commit();

  const cryptoRoutingSummary =
    current.status !== "published" && signal.status === "published" && signal.market === "crypto"
      ? await routePublishedCryptoSignalForPaperExecution({
          actor,
          signal,
          trigger: "patched_published"
        })
      : undefined;
  const forexPaperRoutingSummary =
    current.status !== "published" && signal.status === "published" && signal.market === "forex"
      ? await routePublishedForexSignalForPaperExecution({
          actor,
          signal,
          trigger: "patched_published"
        })
      : undefined;
  const forexDemoRoutingSummary =
    current.status !== "published" && signal.status === "published" && signal.market === "forex"
      ? await routePublishedForexSignalForDemoExecution({
          actor,
          signal,
          trigger: "patched_published"
        })
      : undefined;
  const forexLiveCanaryRoutingSummary =
    current.status !== "published" && signal.status === "published" && signal.market === "forex"
      ? await routePublishedForexSignalForLiveCanaryExecution({
          actor,
          signal,
          trigger: "patched_published"
        })
      : undefined;
  const liveSandboxRoutingSummary =
    current.status !== "published" && signal.status === "published" && signal.market === "crypto"
      ? await routePublishedCryptoSignalForLiveSandboxExecution({
          actor,
          signal
        })
      : undefined;
  const liveProductionRoutingSummary =
    current.status !== "published" && signal.status === "published" && signal.market === "crypto"
      ? await routePublishedCryptoSignalForLiveProductionExecution({
          actor,
          signal
        })
      : undefined;
  const warnings = [
    ...(cryptoRoutingSummary?.warnings ?? []),
    ...(forexPaperRoutingSummary?.warnings ?? []),
    ...(forexDemoRoutingSummary?.warnings ?? []),
    ...(forexLiveCanaryRoutingSummary?.warnings ?? []),
    ...(liveSandboxRoutingSummary?.warnings ?? []),
    ...(liveProductionRoutingSummary?.warnings ?? [])
  ];

  return {
    ...createSourceMeta(warnings),
    ok: true,
    signal,
    auditEvent,
    cryptoRoutingSummary,
    forexPaperRoutingSummary,
    forexDemoRoutingSummary,
    forexLiveCanaryRoutingSummary,
    liveSandboxRoutingSummary,
    liveProductionRoutingSummary
  };
}
