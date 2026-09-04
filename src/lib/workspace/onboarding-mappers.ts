import type {
  AdminAuditEvent,
  AdminAuditTargetType
} from "@/types/admin-api";
import type {
  AdminWorkspaceCreatePayload,
  OnboardingProgressDocument,
  WorkspaceCourseDraft,
  WorkspaceOnboardingStepKey,
  WorkspaceOnboardingStepStatus
} from "@/types/onboarding";
import type { Workspace, WorkspaceRailConfig, WorkspaceTier } from "@/types/workspace";
import type { WorkspaceApplication } from "@/types/admin";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import {
  optionalWorkspaceOnboardingSteps,
  requiredWorkspaceOnboardingSteps,
  workspaceOnboardingSteps
} from "@/lib/workspace/onboarding-validation";
import { mapWorkspacePackageLicenseRecord } from "@/lib/workspace/workspace-package-licence";
import {
  sanitizeWorkspaceBrandColor,
  sanitizeWorkspaceBrandText,
  sanitizeWorkspaceDomainHostname,
  sanitizeWorkspaceLogoUrl
} from "@/lib/workspace/workspace-branding-readiness";

type Actor = VerifiedInfluencer | VerifiedSuperAdmin;

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

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function mapTier(record: Record<string, unknown>, index: number): WorkspaceTier {
  return {
    tierId: asString(record.tierId, `tier_${index + 1}`),
    name: asString(record.name, `Tier ${index + 1}`),
    description: asString(record.description),
    priceNgn: asNumber(record.priceNgn),
    billingPeriod: asString(record.billingPeriod, "monthly") as WorkspaceTier["billingPeriod"],
    features: stringArray(record.features) as WorkspaceTier["features"],
    featured: asBoolean(record.featured),
    paystackPlanCode: asString(record.paystackPlanCode) || undefined
  };
}

function mapRail(record: Record<string, unknown>, fallbackRail: WorkspaceRailConfig["rail"]): WorkspaceRailConfig {
  return {
    rail: asString(record.rail, fallbackRail) as WorkspaceRailConfig["rail"],
    status: asString(record.status, "disabled") as WorkspaceRailConfig["status"],
    label: asString(record.label, fallbackRail === "paystack" ? "Paystack local checkout" : "Solana Pay / USDC"),
    settlementNote: asString(record.settlementNote)
  };
}

function defaultRails(): WorkspaceRailConfig[] {
  return [
    {
      rail: "paystack",
      status: "pending_verification",
      label: "Paystack local checkout",
      settlementNote: "Owner will create the subaccount and split in the Paystack dashboard."
    },
    {
      rail: "solana",
      status: "disabled",
      label: "Optional Solana Pay / USDC",
      settlementNote: "Public wallet can be reviewed later before checkout is enabled."
    }
  ];
}

function defaultTier(workspaceId: string): WorkspaceTier {
  return {
    tierId: `tier_${workspaceId.replace(/^ws_/, "") || "starter"}`,
    name: "Starter",
    description: "Course access, signal alerts where appropriate, and student journal support.",
    priceNgn: 15000,
    billingPeriod: "monthly",
    features: ["course", "signalAlerts", "journal", "calculators"],
    featured: true
  };
}

export function mapWorkspaceRecord(record: Record<string, unknown>, workspaceIdFallback: string): Workspace {
  const workspaceId = asString(record.workspaceId, workspaceIdFallback);
  const rails = recordArray(record.rails);
  const tiers = recordArray(record.tiers);
  const branding = isRecord(record.branding) ? record.branding : {};
  const enterpriseDeployment = isRecord(record.enterpriseDeployment) ? record.enterpriseDeployment : null;
  const settings = isRecord(record.settings) ? record.settings : {};

  const baseWorkspace = {
    workspaceId,
    handle: asString(record.handle, workspaceId.replace(/^ws_/, "")),
    name: asString(record.name, "Untitled workspace"),
    ownerId: asString(record.ownerId, "pending_auth_claim"),
    ownerEmail: asString(record.ownerEmail) || undefined,
    ownerDisplayName: asString(record.ownerDisplayName, "Workspace owner"),
    summary: asString(record.summary),
    marketFocus: asString(record.marketFocus, "forex") as Workspace["marketFocus"],
    branding: {
      logoMark: asString(branding.logoMark, "TH"),
      logoUrl: sanitizeWorkspaceLogoUrl(branding.logoUrl),
      primaryColor: sanitizeWorkspaceBrandColor(branding.primaryColor, "locked_tradehub_surface"),
      accentColor: sanitizeWorkspaceBrandColor(branding.accentColor, "accent"),
      heroLabel: asString(branding.heroLabel, "Trading education workspace"),
      telegramBotHandle: asString(branding.telegramBotHandle) || undefined,
      brandingMode: asString(branding.brandingMode) as Workspace["branding"]["brandingMode"],
      displayName: sanitizeWorkspaceBrandText(branding.displayName, "", 80) || undefined,
      studentFacingBrandVisibilityStatus: asString(
        branding.studentFacingBrandVisibilityStatus
      ) as Workspace["branding"]["studentFacingBrandVisibilityStatus"],
      customDomainStatus: asString(branding.customDomainStatus) as Workspace["branding"]["customDomainStatus"],
      requestedDomainHostname: sanitizeWorkspaceDomainHostname(branding.requestedDomainHostname),
      dnsChecklistStatus: asString(branding.dnsChecklistStatus) as Workspace["branding"]["dnsChecklistStatus"],
      adminReviewNote: sanitizeWorkspaceBrandText(branding.adminReviewNote, "", 320) || undefined,
      adminStatusReason: sanitizeWorkspaceBrandText(branding.adminStatusReason, "", 240) || undefined,
      updatedAt: branding.updatedAt ? normalizeIsoDate(branding.updatedAt) : undefined
    },
    tiers: tiers.length > 0 ? tiers.map(mapTier) : [defaultTier(workspaceId)],
    settings: {
      singleTier: asBoolean(settings.singleTier, true),
      freeTrialDays: asNumber(settings.freeTrialDays, 0) as Workspace["settings"]["freeTrialDays"],
      noCardRequired: asBoolean(settings.noCardRequired),
      refundPolicy: asString(settings.refundPolicy, "Refunds are reviewed by the workspace owner before checkout goes live.")
    },
    rails: rails.length > 0 ? rails.map((rail, index) => mapRail(rail, index === 0 ? "paystack" : "solana")) : defaultRails(),
    vettingStatus: asString(record.vettingStatus, "approved") as Workspace["vettingStatus"],
    paystackSubaccountCode: asString(record.paystackSubaccountCode) || undefined,
    paystackSplitCode: asString(record.paystackSplitCode) || undefined,
    solanaPayEnabled: asBoolean(record.solanaPayEnabled),
    solanaPayoutWallet: asString(record.solanaPayoutWallet) || undefined,
    solanaPartnerPlacementEnabled: asBoolean(record.solanaPartnerPlacementEnabled),
    platformSplitPercent: asNumber(record.platformSplitPercent, 10),
    codeOfConductAcceptedAt: record.codeOfConductAcceptedAt
      ? normalizeIsoDate(record.codeOfConductAcceptedAt)
      : undefined,
    riskDisclosureVersion: asString(record.riskDisclosureVersion, "influencer-code-v1.0"),
    createdAt: normalizeIsoDate(record.createdAt),
    updatedAt: record.updatedAt ? normalizeIsoDate(record.updatedAt) : undefined,
    activatedAt: record.activatedAt ? normalizeIsoDate(record.activatedAt) : undefined
  };

  return {
    ...baseWorkspace,
    packageLicense: mapWorkspacePackageLicenseRecord(record, baseWorkspace),
    enterpriseDeployment: enterpriseDeployment
      ? {
          deploymentMode: asString(
            enterpriseDeployment.deploymentMode
          ) as NonNullable<Workspace["enterpriseDeployment"]>["deploymentMode"],
          deploymentStatus: asString(
            enterpriseDeployment.deploymentStatus
          ) as NonNullable<Workspace["enterpriseDeployment"]>["deploymentStatus"],
          slaStatus: asString(enterpriseDeployment.slaStatus) as NonNullable<Workspace["enterpriseDeployment"]>["slaStatus"],
          backupRestoreStatus: asString(
            enterpriseDeployment.backupRestoreStatus
          ) as NonNullable<Workspace["enterpriseDeployment"]>["backupRestoreStatus"],
          dataResidencyStatus: asString(
            enterpriseDeployment.dataResidencyStatus
          ) as NonNullable<Workspace["enterpriseDeployment"]>["dataResidencyStatus"],
          adminReviewNote: sanitizeWorkspaceBrandText(enterpriseDeployment.adminReviewNote, "", 320) || undefined,
          adminStatusReason: sanitizeWorkspaceBrandText(enterpriseDeployment.adminStatusReason, "", 240) || undefined,
          updatedAt: enterpriseDeployment.updatedAt ? normalizeIsoDate(enterpriseDeployment.updatedAt) : undefined
        }
      : undefined
  };
}

function initialStepStatus(): Record<WorkspaceOnboardingStepKey, WorkspaceOnboardingStepStatus> {
  return workspaceOnboardingSteps.reduce(
    (status, step) => {
      status[step] = optionalWorkspaceOnboardingSteps.includes(step) ? "optional" : "upcoming";
      return status;
    },
    {} as Record<WorkspaceOnboardingStepKey, WorkspaceOnboardingStepStatus>
  );
}

export function createDefaultOnboardingProgress(
  workspaceId: string,
  applicationId?: string,
  now = new Date().toISOString()
): OnboardingProgressDocument {
  const stepStatus = initialStepStatus();
  stepStatus.branding = "current";

  return {
    workspaceId,
    applicationId,
    currentStep: "branding",
    completedSteps: [],
    stepStatus,
    updatedAt: now
  };
}

export function mapOnboardingProgressRecord(
  record: Record<string, unknown> | null,
  workspaceId: string,
  applicationId?: string
): OnboardingProgressDocument {
  if (!record) {
    return createDefaultOnboardingProgress(workspaceId, applicationId);
  }

  const completedSteps = stringArray(record.completedSteps).filter(
    (step): step is WorkspaceOnboardingStepKey =>
      workspaceOnboardingSteps.includes(step as WorkspaceOnboardingStepKey)
  );
  const currentStep = workspaceOnboardingSteps.includes(record.currentStep as WorkspaceOnboardingStepKey)
    ? record.currentStep as WorkspaceOnboardingStepKey
    : "branding";
  const baseStatus = initialStepStatus();
  const savedStatus = isRecord(record.stepStatus) ? record.stepStatus : {};

  for (const step of workspaceOnboardingSteps) {
    if (completedSteps.includes(step)) {
      baseStatus[step] = "complete";
    } else if (savedStatus[step] && typeof savedStatus[step] === "string") {
      baseStatus[step] = savedStatus[step] as WorkspaceOnboardingStepStatus;
    }
  }

  if (!completedSteps.includes(currentStep)) {
    baseStatus[currentStep] = "current";
  }

  return {
    workspaceId: asString(record.workspaceId, workspaceId),
    applicationId: asString(record.applicationId, applicationId ?? "") || undefined,
    currentStep,
    completedSteps,
    stepStatus: baseStatus,
    updatedAt: normalizeIsoDate(record.updatedAt),
    reviewSubmittedAt: record.reviewSubmittedAt ? normalizeIsoDate(record.reviewSubmittedAt) : undefined
  };
}

export function completeOnboardingStep(
  progress: OnboardingProgressDocument,
  completedStep: WorkspaceOnboardingStepKey,
  now = new Date().toISOString()
): OnboardingProgressDocument {
  const completedSteps = Array.from(new Set([...progress.completedSteps, completedStep]));
  const stepStatus = initialStepStatus();

  for (const step of workspaceOnboardingSteps) {
    if (completedSteps.includes(step)) {
      stepStatus[step] = "complete";
      continue;
    }

    if (optionalWorkspaceOnboardingSteps.includes(step)) {
      stepStatus[step] = "optional";
    }
  }

  const requiredIncomplete = requiredWorkspaceOnboardingSteps.find((step) => !completedSteps.includes(step));
  const currentStep = requiredIncomplete ?? "review";

  if (!completedSteps.includes(currentStep)) {
    stepStatus[currentStep] = "current";
  }

  return {
    ...progress,
    currentStep,
    completedSteps,
    stepStatus,
    updatedAt: now
  };
}

export function createWorkspaceShellFromApplication(
  application: WorkspaceApplication,
  payload: AdminWorkspaceCreatePayload,
  now = new Date().toISOString()
): Workspace {
  const logoSeed = payload.handle
    .split("-")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();

  return {
    workspaceId: payload.workspaceId,
    handle: payload.handle,
    name: payload.handle
      .split("-")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ") || application.name,
    ownerId: "pending_auth_claim",
    ownerEmail: payload.ownerEmail,
    ownerDisplayName: payload.ownerDisplayName,
    summary: application.notes || "Approved TradeHub educator workspace awaiting activation setup.",
    marketFocus: application.market,
    branding: {
      logoMark: logoSeed || "TH",
      primaryColor: "locked_tradehub_surface",
      accentColor: "accent",
      heroLabel: "Trading education workspace"
    },
    tiers: [defaultTier(payload.workspaceId)],
    settings: {
      singleTier: true,
      freeTrialDays: 0,
      noCardRequired: false,
      refundPolicy: "Refund policy will be confirmed before checkout is enabled."
    },
    rails: defaultRails(),
    vettingStatus: "approved",
    solanaPayEnabled: false,
    solanaPartnerPlacementEnabled: false,
    platformSplitPercent: 10,
    riskDisclosureVersion: "influencer-code-v1.0",
    createdAt: now,
    updatedAt: now
  };
}

export function mapCourseDraftRecord(
  record: Record<string, unknown> | null,
  courseIdFallback = "draft_first_course"
): WorkspaceCourseDraft | null {
  if (!record) {
    return null;
  }

  return {
    courseId: asString(record.courseId, courseIdFallback),
    title: asString(record.title),
    description: asString(record.description),
    accessTier: asString(record.accessTier, "all"),
    published: false,
    sections: recordArray(record.sections).map((section, index) => ({
      id: asString(section.id, `section_${index + 1}`),
      title: asString(section.title, `Section ${index + 1}`),
      order: asNumber(section.order, index + 1)
    })),
    createdAt: normalizeIsoDate(record.createdAt),
    updatedAt: normalizeIsoDate(record.updatedAt)
  };
}

export function buildAuditEvent({
  actor,
  action,
  targetType,
  targetId,
  before,
  after,
  now = new Date().toISOString()
}: {
  actor: Actor;
  action: string;
  targetType: AdminAuditTargetType;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  now?: string;
}): AdminAuditEvent {
  return {
    eventId: `audit_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    action,
    targetType,
    targetId,
    before,
    after,
    createdAt: now
  };
}
