import type { DocumentData, Query } from "firebase-admin/firestore";
import { createSourceMeta } from "@/lib/course-hub/course-source";
import { listStudentCourses } from "@/lib/course-hub/course-repository";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import { mapSubscriptionRecord } from "@/lib/billing/billing-mappers";
import { loadStudentAccountLinkedPerformancePreview } from "@/lib/journal/account-linked-performance-ledger";
import {
  mapAppSummary,
  mapJournalSummary,
  mapSignalCard,
  mapStudentProfile,
  mapWorkspaceForStudent,
  recordFromSnapshot
} from "@/lib/student-app/student-app-mappers";
import type {
  StudentAppOverviewResponse,
  StudentAppProfile,
  StudentCopierResponse,
  StudentJournalSummaryResponse,
  StudentSignalsResponse
} from "@/types/student-app";
import type { Workspace } from "@/types/workspace";
import type { StudentSubscription } from "@/types/payments";

type StudentBase = {
  workspace: Workspace;
  student: StudentAppProfile;
  subscription: StudentSubscription | null;
  warnings: string[];
};

function pageInfo(limit: number, loadedCount: number, nextCursor: string | null) {
  return {
    limit,
    nextCursor,
    hasMore: Boolean(nextCursor),
    totalLoaded: loadedCount
  };
}

function normalizeLimit(value: string | null, fallback = 10) {
  const parsed = Number(value ?? "");

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 25);
}

function isFirestoreMissingIndexError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  const code = "code" in error ? error.code : null;

  return code === 9 || message.toLowerCase().includes("requires an index");
}

async function getStudentBase(actor: VerifiedStudent): Promise<StudentBase> {
  const { db } = getFirebaseAdminClients();
  const [workspaceSnapshot, studentSnapshot, subscriptionSnapshot] = await Promise.all([
    db.doc(`workspaces/${actor.workspaceId}`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/subscriptions/current`).get()
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
    recordFromSnapshot(workspaceSnapshot, "workspaceId"),
    actor.workspaceId
  );
  const studentRecord = recordFromSnapshot(studentSnapshot, "studentId");
  const subscription = mapSubscriptionRecord(
    subscriptionSnapshot.exists ? recordFromSnapshot(subscriptionSnapshot, "subscriptionId") : null,
    actor.workspaceId,
    actor.studentId
  );
  const entitlements = resolveStudentEntitlements({
    workspace,
    studentRecord,
    subscription,
    claimedTierId: actor.tierId
  });

  return {
    workspace,
    student: mapStudentProfile(studentRecord, actor.workspaceId, actor.studentId, entitlements),
    subscription,
    warnings: []
  };
}

async function getLatestPublishedSignals(actor: VerifiedStudent, limit = 5) {
  const { db } = getFirebaseAdminClients();
  const warnings: string[] = [];
  const query: Query<DocumentData> = db
    .collection(`workspaces/${actor.workspaceId}/signals`)
    .where("status", "==", "published")
    .orderBy("updatedAt", "desc");

  try {
    const snapshot = await query.limit(limit).get();
    return {
      signals: snapshot.docs.map((doc) =>
        mapSignalCard(recordFromSnapshot(doc, "signalId"), actor.workspaceId)
      ),
      warnings,
      nextCursor:
        snapshot.docs.length === limit
          ? mapSignalCard(
              recordFromSnapshot(snapshot.docs[snapshot.docs.length - 1], "signalId"),
              actor.workspaceId
            ).updatedAt
          : null
    };
  } catch (error) {
    if (!isFirestoreMissingIndexError(error)) {
      throw error;
    }

    warnings.push(
      "Signal sorting is using a temporary Firestore fallback until the status+updatedAt index is created."
    );
    const fallbackSnapshot = await db
      .collection(`workspaces/${actor.workspaceId}/signals`)
      .where("status", "==", "published")
      .limit(limit)
      .get();
    const signals = fallbackSnapshot.docs
      .map((doc) => mapSignalCard(recordFromSnapshot(doc, "signalId"), actor.workspaceId))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return {
      signals,
      warnings,
      nextCursor: null
    };
  }
}

export async function getStudentOverview(actor: VerifiedStudent): Promise<StudentAppOverviewResponse> {
  const base = await getStudentBase(actor);
  const { db } = getFirebaseAdminClients();
  const [summarySnapshot, journalSnapshot, courseResponse, signalResponse] = await Promise.all([
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/app_summary/current`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/journal_summary/current`).get(),
    listStudentCourses(actor, { limit: 5 }),
    getLatestPublishedSignals(actor, 1)
  ]);
  const warnings = [...base.warnings, ...courseResponse.warnings, ...signalResponse.warnings];

  if (!summarySnapshot.exists) {
    warnings.push(
      "Student app summary is missing, so home totals are zero-safe instead of scanning activity."
    );
  }

  if (!journalSnapshot.exists) {
    warnings.push("Journal summary is missing, so home and journal stats stay zero-safe.");
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspace: base.workspace,
    student: base.student,
    summary: mapAppSummary(
      summarySnapshot.exists ? recordFromSnapshot(summarySnapshot, "summaryId") : null,
      base.student
    ),
    courses: courseResponse.courses,
    latestSignal: base.student.signalAccess ? signalResponse.signals[0] ?? null : null,
    journal: mapJournalSummary(
      journalSnapshot.exists ? recordFromSnapshot(journalSnapshot, "summaryId") : null,
      base.student
    )
  };
}

export async function listStudentSignals(
  actor: VerifiedStudent,
  request: Request
): Promise<StudentSignalsResponse> {
  const base = await getStudentBase(actor);
  const params = new URL(request.url).searchParams;
  const limit = normalizeLimit(params.get("limit"), 10);
  const response = await getLatestPublishedSignals(actor, limit);

  return {
    ...createSourceMeta(response.warnings),
    ok: true,
    student: {
      studentId: base.student.studentId,
      tierId: base.student.tierId,
      tierLabel: base.student.tierLabel,
      riskPosture: base.student.riskPosture,
      signalAccessState: base.student.signalAccessState,
      signalAccessReason: base.student.signalAccessReason,
      autoCopyAccessState: base.student.autoCopyAccessState,
      autoCopyAccessReason: base.student.autoCopyAccessReason,
      signalAccess: base.student.signalAccess,
      autoCopyEligible: base.student.autoCopyEligible,
      accountMode: base.student.accountMode
    },
    signals: base.student.signalAccess ? response.signals : [],
    mode: base.student.accountMode,
    autoCopyEligible: base.student.autoCopyEligible,
    pageInfo: pageInfo(
      limit,
      base.student.signalAccess ? response.signals.length : 0,
      base.student.signalAccess ? response.nextCursor : null
    )
  };
}

export async function getStudentCopier(actor: VerifiedStudent): Promise<StudentCopierResponse> {
  const base = await getStudentBase(actor);
  const autoCopyState = base.student.autoCopyAccessState;

  return {
    ...createSourceMeta(),
    ok: true,
    workspace: {
      workspaceId: base.workspace.workspaceId,
      name: base.workspace.name,
      handle: base.workspace.handle
    },
    student: base.student,
    mode: base.student.accountMode,
    status: base.student.copierStatus,
    safetyNotes: autoCopyState === "allowed"
      ? [
          "Auto-Copy is modeled for eligible personal accounts only.",
          "No broker or exchange credentials are collected in this stage.",
          "Execution plumbing is deferred; this surface is status and safety only."
        ]
      : autoCopyState === "alerts_only"
        ? [
            "This account stays on Signal Alerts only because funded-account students are not routed into automatic execution.",
            "TradeHub keeps copier posture policy-safe even when signals remain available.",
            "Execution plumbing is still deferred; this surface remains status and safety only."
          ]
      : [
          base.student.autoCopyAccessReason,
          "TradeHub does not bypass account rules or promise trading outcomes.",
          "Upgrade, renewal, or workspace packaging changes may be required before this feature becomes available."
        ]
  };
}

export async function getStudentJournalSummary(
  actor: VerifiedStudent
): Promise<StudentJournalSummaryResponse> {
  const base = await getStudentBase(actor);
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/journal_summary/current`)
    .get();
  const warnings: string[] = [];

  if (!snapshot.exists) {
    warnings.push("Journal summary is missing, so this route returns zero-safe summary values.");
  }

  const journal = mapJournalSummary(snapshot.exists ? recordFromSnapshot(snapshot, "summaryId") : null, base.student);

  return {
    ...createSourceMeta(warnings),
    ok: true,
    student: {
      studentId: base.student.studentId,
      displayName: base.student.displayName,
      journalPrivate: base.student.journalPrivate,
      journalAccessState: base.student.journalAccessState,
      journalAccessReason: base.student.journalAccessReason,
      tierLabel: base.student.tierLabel
    },
    journal,
    accountLinkedPerformance: await loadStudentAccountLinkedPerformancePreview({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      journal
    })
  };
}
