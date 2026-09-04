import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import { mapApplicationRecord } from "@/lib/admin/admin-mappers";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import {
  buildAuditEvent,
  completeOnboardingStep,
  createDefaultOnboardingProgress,
  createWorkspaceShellFromApplication,
  mapCourseDraftRecord,
  mapOnboardingProgressRecord,
  mapWorkspaceRecord
} from "@/lib/workspace/onboarding-mappers";
import {
  validateAdminWorkspaceCreatePayload,
  validateAdminWorkspacePatchPayload,
  validateBrandingStepPayload,
  validateCodeOfConductPayload,
  validateFirstCourseDraftPayload,
  validateKnownOnboardingStep,
  validatePaystackStepPayload,
  validatePricingStepPayload,
  validateReviewStepPayload,
  validateSolanaWalletStepPayload,
  validateTelegramStepPayload
} from "@/lib/workspace/onboarding-validation";
import type {
  AdminWorkspaceCreateResponse,
  AdminWorkspacePatchResponse,
  FirstCourseDraftPayload,
  OnboardingProgressDocument,
  WorkspaceCourseDraftResponse,
  WorkspaceOnboardingLoadResponse,
  WorkspaceOnboardingSaveResponse,
  WorkspaceOnboardingStepKey
} from "@/types/onboarding";
import type { Workspace, WorkspaceRailConfig } from "@/types/workspace";
import type { WorkspaceApplication } from "@/types/admin";

const COURSE_DRAFT_ID = "draft_first_course";

function recordFromSnapshot(snapshot: DocumentSnapshot<DocumentData>, idField = "id") {
  const data = snapshot.data() ?? {};

  return {
    ...data,
    [idField]: data[idField] ?? snapshot.id
  };
}

function sourceMeta(warnings: string[] = []) {
  return {
    source: "firestore" as const,
    sourceLabel: "Firestore live",
    sourceMessage: "This onboarding data was loaded through server-side Firebase Admin SDK routes.",
    warnings
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

function updateRail(
  rails: WorkspaceRailConfig[],
  rail: WorkspaceRailConfig["rail"],
  patch: Partial<WorkspaceRailConfig>
) {
  const current =
    rails.find((entry) => entry.rail === rail) ??
    ({
      rail,
      status: "disabled",
      label: rail === "paystack" ? "Paystack local checkout" : "Optional Solana Pay / USDC",
      settlementNote: ""
    } satisfies WorkspaceRailConfig);
  const next = {
    ...current,
    ...patch,
    rail
  };
  const others = rails.filter((entry) => entry.rail !== rail);

  return rail === "paystack" ? [next, ...others] : [...others, next].sort((a) => (a.rail === "paystack" ? -1 : 1));
}

function ensureWorkspaceOwner(workspace: Workspace, actor: VerifiedInfluencer, now: string): Workspace {
  return {
    ...workspace,
    ownerId: workspace.ownerId === "pending_auth_claim" ? actor.uid : workspace.ownerId,
    ownerEmail: workspace.ownerEmail ?? actor.email,
    updatedAt: now
  };
}

function applyStepPatch({
  workspace,
  progress,
  step,
  payload,
  actor,
  now
}: {
  workspace: Workspace;
  progress: OnboardingProgressDocument;
  step: WorkspaceOnboardingStepKey;
  payload: unknown;
  actor: VerifiedInfluencer;
  now: string;
}) {
  let updatedWorkspace = ensureWorkspaceOwner(workspace, actor, now);
  let updatedProgress = progress;
  let auditAction = `workspace.onboarding.${step}`;

  if (step === "branding") {
    const values = validateBrandingStepPayload(payload);
    updatedWorkspace = {
      ...updatedWorkspace,
      name: values.name,
      handle: values.handle,
      ownerDisplayName: values.ownerDisplayName,
      summary: values.summary,
      marketFocus: values.marketFocus,
      branding: {
        ...updatedWorkspace.branding,
        logoMark: values.logoMark,
        primaryColor: updatedWorkspace.branding.primaryColor || "locked_tradehub_surface",
        accentColor: values.accentColor,
        heroLabel: values.heroLabel
      }
    };
  }

  if (step === "code_of_conduct") {
    validateCodeOfConductPayload(payload);
    updatedWorkspace = {
      ...updatedWorkspace,
      codeOfConductAcceptedAt: now,
      riskDisclosureVersion: "influencer-code-v1.0"
    };
    auditAction = "workspace.code_of_conduct.accept";
  }

  if (step === "telegram_bot") {
    const values = validateTelegramStepPayload(payload);
    updatedWorkspace = {
      ...updatedWorkspace,
      branding: {
        ...updatedWorkspace.branding,
        telegramBotHandle: values.telegramBotHandle
      }
    };
    auditAction = "workspace.telegram.handle_saved";
  }

  if (step === "pricing") {
    const values = validatePricingStepPayload(payload);
    updatedWorkspace = {
      ...updatedWorkspace,
      tiers: values.tiers,
      settings: {
        singleTier: values.singleTier,
        freeTrialDays: values.freeTrialDays,
        noCardRequired: values.noCardRequired,
        refundPolicy: values.refundPolicy
      }
    };
  }

  if (step === "paystack") {
    const values = validatePaystackStepPayload(payload);
    updatedWorkspace = {
      ...updatedWorkspace,
      paystackSubaccountCode: values.paystackSubaccountCode,
      paystackSplitCode: values.paystackSplitCode,
      rails: updateRail(updatedWorkspace.rails, "paystack", {
        status: values.paystackSetupStatus,
        label: "Paystack local checkout",
        settlementNote: values.settlementNote
      })
    };
    auditAction = "workspace.paystack.readiness_saved";
  }

  if (step === "solana_wallet") {
    const values = validateSolanaWalletStepPayload(payload);
    updatedWorkspace = {
      ...updatedWorkspace,
      solanaPayEnabled: false,
      solanaPayoutWallet: values.solanaPayoutWallet,
      solanaPartnerPlacementEnabled: values.solanaPartnerPlacementEnabled,
      rails: updateRail(updatedWorkspace.rails, "solana", {
        status: values.solanaPayInterest ? "pending_verification" : "disabled",
        label: "Optional Solana Pay / USDC",
        settlementNote: values.solanaPayInterest
          ? "Public payout wallet collected for owner verification before checkout is enabled."
          : "Solana checkout is disabled unless the workspace requests it later."
      })
    };
    auditAction = "workspace.solana.public_wallet_saved";
  }

  if (step === "review") {
    validateReviewStepPayload(payload, progress.completedSteps);
    auditAction = "workspace.onboarding.ready_for_review";
  }

  updatedProgress = completeOnboardingStep(progress, step, now);

  if (step === "review") {
    updatedProgress = {
      ...updatedProgress,
      reviewSubmittedAt: now
    };
  }

  return {
    updatedWorkspace,
    updatedProgress,
    auditAction
  };
}

export async function getWorkspaceOnboarding(workspaceId: string): Promise<WorkspaceOnboardingLoadResponse> {
  const { db } = getFirebaseAdminClients();
  const workspaceRef = db.doc(`workspaces/${workspaceId}`);
  const progressRef = db.doc(`workspaces/${workspaceId}/onboarding/current`);
  const courseRef = db.doc(`workspaces/${workspaceId}/courses/${COURSE_DRAFT_ID}`);
  const [workspaceSnapshot, progressSnapshot, courseSnapshot] = await Promise.all([
    workspaceRef.get(),
    progressRef.get(),
    courseRef.get()
  ]);

  if (!workspaceSnapshot.exists) {
    return {
      ...sourceMeta(["The workspace claim is valid, but the owner has not prepared this workspace shell yet."]),
      ok: true,
      workspacePrepared: false,
      message: "Workspace shell is not prepared yet.",
      workspace: null,
      progress: null,
      courseDraft: null
    };
  }

  const workspace = mapWorkspaceRecord(recordFromSnapshot(workspaceSnapshot, "workspaceId"), workspaceId);
  const progress = mapOnboardingProgressRecord(
    progressSnapshot.exists ? recordFromSnapshot(progressSnapshot, "progressId") : null,
    workspaceId
  );
  const courseDraft = mapCourseDraftRecord(
    courseSnapshot.exists ? recordFromSnapshot(courseSnapshot, "courseId") : null,
    COURSE_DRAFT_ID
  );

  return {
    ...sourceMeta(progressSnapshot.exists ? [] : ["Onboarding progress was missing, so the default step state is shown. Save a step to persist it."]),
    ok: true,
    workspacePrepared: true,
    message: "Workspace onboarding loaded.",
    workspace,
    progress,
    courseDraft
  };
}

export async function saveWorkspaceOnboardingStep({
  actor,
  step: rawStep,
  payload
}: {
  actor: VerifiedInfluencer;
  step: unknown;
  payload: unknown;
}): Promise<WorkspaceOnboardingSaveResponse> {
  const step = validateKnownOnboardingStep(rawStep);
  const { db } = getFirebaseAdminClients();
  const workspaceId = actor.workspaceId;
  const now = new Date().toISOString();
  const workspaceRef = db.doc(`workspaces/${workspaceId}`);
  const progressRef = db.doc(`workspaces/${workspaceId}/onboarding/current`);
  const [workspaceSnapshot, progressSnapshot] = await Promise.all([
    workspaceRef.get(),
    progressRef.get()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_prepared", "The owner has not prepared this workspace shell yet.");
  }

  const workspace = mapWorkspaceRecord(recordFromSnapshot(workspaceSnapshot, "workspaceId"), workspaceId);
  const progress = mapOnboardingProgressRecord(
    progressSnapshot.exists ? recordFromSnapshot(progressSnapshot, "progressId") : null,
    workspaceId
  );
  const { updatedWorkspace, updatedProgress, auditAction } = applyStepPatch({
    workspace,
    progress,
    step,
    payload,
    actor,
    now
  });
  const auditEvent = buildAuditEvent({
    actor,
    action: auditAction,
    targetType: "workspace",
    targetId: workspaceId,
    before: {
      step,
      completedSteps: progress.completedSteps
    },
    after: {
      step,
      completedSteps: updatedProgress.completedSteps
    },
    now
  });
  const batch = db.batch();

  batch.set(workspaceRef, stripUndefined(updatedWorkspace), { merge: true });
  batch.set(progressRef, stripUndefined(updatedProgress), { merge: true });
  batch.set(db.doc(`audit_log/${auditEvent.eventId}`), stripUndefined(auditEvent));
  await batch.commit();

  return {
    ...sourceMeta(),
    ok: true,
    workspacePrepared: true,
    workspace: updatedWorkspace,
    progress: updatedProgress,
    auditEvent
  };
}

export async function saveFirstCourseDraft({
  actor,
  payload
}: {
  actor: VerifiedInfluencer;
  payload: unknown;
}): Promise<WorkspaceCourseDraftResponse> {
  const values: FirstCourseDraftPayload = validateFirstCourseDraftPayload(payload);
  const { db } = getFirebaseAdminClients();
  const workspaceId = actor.workspaceId;
  const now = new Date().toISOString();
  const workspaceRef = db.doc(`workspaces/${workspaceId}`);
  const progressRef = db.doc(`workspaces/${workspaceId}/onboarding/current`);
  const courseRef = db.doc(`workspaces/${workspaceId}/courses/${COURSE_DRAFT_ID}`);
  const [workspaceSnapshot, progressSnapshot, courseSnapshot] = await Promise.all([
    workspaceRef.get(),
    progressRef.get(),
    courseRef.get()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_prepared", "The owner has not prepared this workspace shell yet.");
  }

  const currentProgress = mapOnboardingProgressRecord(
    progressSnapshot.exists ? recordFromSnapshot(progressSnapshot, "progressId") : null,
    workspaceId
  );
  const progress = completeOnboardingStep(currentProgress, "first_course", now);
  const existingCourse = courseSnapshot.exists
    ? mapCourseDraftRecord(recordFromSnapshot(courseSnapshot, "courseId"), COURSE_DRAFT_ID)
    : null;
  const courseDraft = {
    courseId: COURSE_DRAFT_ID,
    title: values.title,
    description: values.description,
    accessTier: values.accessTier,
    published: false as const,
    sections: values.sections.map((title, index) => ({
      id: `section_${index + 1}`,
      title,
      order: index + 1
    })),
    createdAt: existingCourse?.createdAt ?? now,
    updatedAt: now
  };
  const auditEvent = buildAuditEvent({
    actor,
    action: existingCourse ? "workspace.course_draft.update" : "workspace.course_draft.create",
    targetType: "workspace",
    targetId: workspaceId,
    before: existingCourse ? { courseId: existingCourse.courseId, title: existingCourse.title } : undefined,
    after: { courseId: courseDraft.courseId, title: courseDraft.title, published: false },
    now
  });
  const batch = db.batch();

  batch.set(courseRef, stripUndefined(courseDraft), { merge: false });
  batch.set(progressRef, stripUndefined(progress), { merge: true });
  batch.set(db.doc(`audit_log/${auditEvent.eventId}`), stripUndefined(auditEvent));
  await batch.commit();

  return {
    ...sourceMeta(),
    ok: true,
    workspacePrepared: true,
    courseDraft,
    progress,
    auditEvent
  };
}

export async function createWorkspaceShellForApplication({
  actor,
  payload
}: {
  actor: VerifiedSuperAdmin;
  payload: unknown;
}): Promise<AdminWorkspaceCreateResponse> {
  const values = validateAdminWorkspaceCreatePayload(payload);
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const applicationRef = db.doc(`workspace_applications/${values.applicationId}`);
  const workspaceRef = db.doc(`workspaces/${values.workspaceId}`);
  const progressRef = db.doc(`workspaces/${values.workspaceId}/onboarding/current`);
  const [applicationSnapshot, workspaceSnapshot] = await Promise.all([
    applicationRef.get(),
    workspaceRef.get()
  ]);

  if (!applicationSnapshot.exists) {
    throw new AdminApiError(404, "application_not_found", "That application was not found.");
  }

  if (workspaceSnapshot.exists) {
    throw new AdminApiError(409, "workspace_already_exists", "That workspace shell already exists.");
  }

  const application = mapApplicationRecord(recordFromSnapshot(applicationSnapshot, "applicationId"));

  if (application.status === "rejected" || application.vettingOutcome === "rejected") {
    throw new AdminApiError(400, "application_rejected", "Rejected applications cannot create workspace shells.");
  }

  const workspace = createWorkspaceShellFromApplication(application, values, now);
  const progress = createDefaultOnboardingProgress(values.workspaceId, application.applicationId, now);
  const updatedApplication: WorkspaceApplication = {
    ...application,
    status: application.status === "activated" ? "activated" : "workspace_created",
    workspaceCreationStatus: "created",
    workspaceId: values.workspaceId,
    updatedAt: now
  };
  const auditEvent = buildAuditEvent({
    actor,
    action: "workspace.shell.create",
    targetType: "workspace",
    targetId: values.workspaceId,
    before: { applicationId: application.applicationId, workspaceCreationStatus: application.workspaceCreationStatus },
    after: { applicationId: application.applicationId, workspaceId: values.workspaceId },
    now
  });
  const batch = db.batch();

  batch.set(workspaceRef, stripUndefined(workspace), { merge: false });
  batch.set(progressRef, stripUndefined(progress), { merge: false });
  batch.update(applicationRef, {
    status: updatedApplication.status,
    workspaceCreationStatus: updatedApplication.workspaceCreationStatus,
    workspaceId: updatedApplication.workspaceId,
    updatedAt: now
  });
  batch.set(db.doc(`audit_log/${auditEvent.eventId}`), stripUndefined(auditEvent));
  await batch.commit();

  return {
    ...sourceMeta(),
    ok: true,
    workspace,
    progress,
    application: updatedApplication,
    auditEvent
  };
}

export async function patchWorkspaceShell({
  actor,
  workspaceId,
  payload
}: {
  actor: VerifiedSuperAdmin;
  workspaceId: string;
  payload: unknown;
}): Promise<AdminWorkspacePatchResponse> {
  const values = validateAdminWorkspacePatchPayload(payload);
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const workspaceRef = db.doc(`workspaces/${workspaceId}`);
  const snapshot = await workspaceRef.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "That workspace was not found.");
  }

  const current = mapWorkspaceRecord(recordFromSnapshot(snapshot, "workspaceId"), workspaceId);
  const workspace: Workspace = {
    ...current,
    ...values,
    updatedAt: now
  };
  const auditEvent = buildAuditEvent({
    actor,
    action: "workspace.shell.patch",
    targetType: "workspace",
    targetId: workspaceId,
    before: values,
    after: values,
    now
  });
  const batch = db.batch();

  batch.set(workspaceRef, stripUndefined(workspace), { merge: true });
  batch.set(db.doc(`audit_log/${auditEvent.eventId}`), stripUndefined(auditEvent));
  await batch.commit();

  return {
    ...sourceMeta(),
    ok: true,
    workspace,
    auditEvent
  };
}
