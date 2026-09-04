import { createHash } from "node:crypto";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { Workspace } from "@/types/workspace";
import type {
  AdminWorkspacePackageInsight,
  AdminWorkspacePackageOverview,
  WorkspacePackageLicenceHealth,
  WorkspacePackageLicenseRecord,
  WorkspacePackageLicenseStatus,
  WorkspacePackageLicenseTermType,
  WorkspacePackageMaintenanceRenewalStatus,
  WorkspacePackageMaintenanceState,
  WorkspacePackageStatus,
  WorkspacePackageSupportStatus,
  WorkspacePackageSupportWindowState,
  WorkspacePackageTier
} from "@/types/workspace-package";

const LAUNCH_SEAT_CAP = 50;
const PRO_SEAT_CAP = 500;
const INCLUDED_SUPPORT_MONTHS = 12;
const MAINTENANCE_DUE_SOON_DAYS = 30;

const packageNames: Record<WorkspacePackageTier, string> = {
  launch: "Launch Workspace",
  pro: "Pro Workspace",
  enterprise: "Enterprise Workspace"
};

const packageTiers: WorkspacePackageTier[] = ["launch", "pro", "enterprise"];
const licenseStatuses: WorkspacePackageLicenseStatus[] = [
  "active",
  "pending",
  "expired",
  "suspended",
  "custom_review"
];
const supportWindowStates: WorkspacePackageSupportWindowState[] = [
  "standard",
  "priority",
  "custom",
  "not_configured"
];
const licenseTermTypes: WorkspacePackageLicenseTermType[] = ["lifetime", "fixed_term", "custom"];
const maintenanceRenewalStatuses: WorkspacePackageMaintenanceRenewalStatus[] = [
  "not_required",
  "active",
  "due_soon",
  "overdue",
  "waived",
  "custom_review"
];
const supportStatuses: WorkspacePackageSupportStatus[] = [
  "included",
  "maintenance_active",
  "maintenance_due",
  "support_limited",
  "suspended",
  "custom_review"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function normalizeOptionalIsoDate(value: unknown) {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeIsoDate(value);
  return Number.isFinite(Date.parse(normalized)) ? normalized : undefined;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? value as T : fallback;
}

function normalizeSeatCap(value: unknown) {
  const parsed = asNumber(value, Number.NaN);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function addMonthsIso(value: string, months: number) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return undefined;
  }

  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next.toISOString();
}

function daysUntil(value: string, now = new Date()) {
  const target = new Date(value);

  if (!Number.isFinite(target.getTime())) {
    return Number.NaN;
  }

  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

export function sanitizeWorkspacePackageAdminText(value: unknown, maxLength = 240) {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return cleaned || undefined;
}

export function maskedWorkspaceRef(workspaceId: string) {
  const digest = createHash("sha256").update(workspaceId).digest("hex").slice(0, 10);

  return `workspace_${digest}`;
}

export function defaultWorkspacePackageLicense(
  workspace: Pick<Workspace, "vettingStatus" | "updatedAt" | "createdAt">
): WorkspacePackageLicenseRecord {
  const start = workspace.createdAt;
  const supportEnd = addMonthsIso(start, INCLUDED_SUPPORT_MONTHS);

  return {
    packageTier: "launch",
    studentSeatCap: LAUNCH_SEAT_CAP,
    licenseStatus: workspace.vettingStatus === "approved" ? "active" : "pending",
    supportWindowState: "standard",
    maintenanceState: "current",
    licenseStartDate: start,
    licenseTermType: "lifetime",
    includedSupportWindowStart: start,
    includedSupportWindowEnd: supportEnd,
    maintenanceRenewalStatus: workspace.vettingStatus === "approved" ? "active" : "not_required",
    maintenanceRenewalDueDate: supportEnd,
    supportStatus: workspace.vettingStatus === "approved" ? "included" : "custom_review",
    lastReviewedAt: workspace.updatedAt ?? workspace.createdAt,
    updatedAt: workspace.updatedAt ?? workspace.createdAt
  };
}

export function mapWorkspacePackageLicenseRecord(
  record: Record<string, unknown>,
  workspace: Pick<Workspace, "vettingStatus" | "updatedAt" | "createdAt">
): WorkspacePackageLicenseRecord {
  const packageRecord = isRecord(record.packageLicense)
    ? record.packageLicense
    : isRecord(record.packageLicence)
      ? record.packageLicence
      : isRecord(record.license)
        ? record.license
        : {};
  const packageTier = oneOf(
    packageRecord.packageTier ?? record.packageTier ?? record.workspacePackageTier,
    packageTiers,
    "launch"
  );
  const explicitSeatCap = normalizeSeatCap(
    packageRecord.studentSeatCap ?? packageRecord.seatCap ?? record.studentSeatCap ?? record.packageSeatCap
  );
  const defaultSeatCap = packageTier === "launch"
    ? LAUNCH_SEAT_CAP
    : packageTier === "pro"
      ? PRO_SEAT_CAP
      : null;
  const licenseStartDate = normalizeOptionalIsoDate(
    packageRecord.licenseStartDate ?? packageRecord.licenceStartDate ?? record.licenseStartDate
  ) ?? workspace.createdAt;
  const includedSupportWindowEnd = normalizeOptionalIsoDate(
    packageRecord.includedSupportWindowEnd ?? packageRecord.supportWindowEnd ?? record.includedSupportWindowEnd
  ) ?? addMonthsIso(licenseStartDate, INCLUDED_SUPPORT_MONTHS);

  return {
    packageTier,
    studentSeatCap: explicitSeatCap ?? defaultSeatCap,
    licenseStatus: oneOf(
      packageRecord.licenseStatus ?? record.licenseStatus,
      licenseStatuses,
      workspace.vettingStatus === "approved" ? "active" : "pending"
    ),
    supportWindowState: oneOf(
      packageRecord.supportWindowState ?? record.supportWindowState,
      supportWindowStates,
      packageTier === "enterprise" ? "custom" : "standard"
    ),
    maintenanceState: oneOf(
      packageRecord.maintenanceState ?? record.maintenanceState,
      ["current", "due_soon", "overdue", "custom_review"],
      packageTier === "enterprise" ? "custom_review" : "current"
    ),
    licenseStartDate,
    licenseTermType: oneOf(
      packageRecord.licenseTermType ?? packageRecord.licenceTermType ?? record.licenseTermType,
      licenseTermTypes,
      "lifetime"
    ),
    includedSupportWindowStart: normalizeOptionalIsoDate(
      packageRecord.includedSupportWindowStart ?? packageRecord.supportWindowStart ?? record.includedSupportWindowStart
    ) ?? licenseStartDate,
    includedSupportWindowEnd,
    maintenanceRenewalStatus: oneOf(
      packageRecord.maintenanceRenewalStatus ?? packageRecord.maintenanceStatus ?? record.maintenanceRenewalStatus,
      maintenanceRenewalStatuses,
      packageTier === "enterprise" ? "custom_review" : "active"
    ),
    maintenanceRenewalDueDate: normalizeOptionalIsoDate(
      packageRecord.maintenanceRenewalDueDate ?? packageRecord.maintenanceDueDate ?? record.maintenanceRenewalDueDate
    ) ?? includedSupportWindowEnd,
    supportStatus: oneOf(
      packageRecord.supportStatus ?? record.supportStatus,
      supportStatuses,
      workspace.vettingStatus === "approved" ? "included" : "custom_review"
    ),
    adminStatusReason: sanitizeWorkspacePackageAdminText(
      packageRecord.adminStatusReason ?? record.adminStatusReason,
      240
    ),
    adminNoteSummary: sanitizeWorkspacePackageAdminText(
      packageRecord.adminNoteSummary ?? record.adminNoteSummary,
      320
    ),
    lastReviewedAt: normalizeOptionalIsoDate(packageRecord.lastReviewedAt ?? record.lastReviewedAt),
    updatedAt: packageRecord.updatedAt || record.packageUpdatedAt || workspace.updatedAt
      ? normalizeIsoDate(packageRecord.updatedAt ?? record.packageUpdatedAt ?? workspace.updatedAt)
      : workspace.createdAt
  };
}

function deriveMaintenanceRenewalStatus(
  license: WorkspacePackageLicenseRecord,
  now = new Date()
): WorkspacePackageMaintenanceRenewalStatus {
  if (license.licenseStatus === "pending") {
    return "not_required";
  }

  if (
    license.licenseStatus === "suspended" ||
    license.licenseStatus === "expired" ||
    license.licenseStatus === "custom_review" ||
    license.maintenanceRenewalStatus === "waived" ||
    license.maintenanceRenewalStatus === "custom_review"
  ) {
    return license.maintenanceRenewalStatus;
  }

  const dueDate = license.maintenanceRenewalDueDate ?? license.includedSupportWindowEnd;

  if (!dueDate) {
    return "custom_review";
  }

  const remainingDays = daysUntil(dueDate, now);

  if (!Number.isFinite(remainingDays)) {
    return "custom_review";
  }

  if (remainingDays < 0) {
    return "overdue";
  }

  if (remainingDays <= MAINTENANCE_DUE_SOON_DAYS) {
    return "due_soon";
  }

  return "active";
}

function mapMaintenanceState(status: WorkspacePackageMaintenanceRenewalStatus): WorkspacePackageMaintenanceState {
  if (status === "due_soon") {
    return "due_soon";
  }

  if (status === "overdue") {
    return "overdue";
  }

  if (status === "custom_review") {
    return "custom_review";
  }

  return "current";
}

function deriveSupportStatus(
  license: WorkspacePackageLicenseRecord,
  maintenanceRenewalStatus: WorkspacePackageMaintenanceRenewalStatus,
  now = new Date()
): WorkspacePackageSupportStatus {
  if (license.licenseStatus === "suspended" || license.licenseStatus === "expired") {
    return "suspended";
  }

  if (license.licenseStatus === "custom_review" || maintenanceRenewalStatus === "custom_review") {
    return "custom_review";
  }

  if (license.includedSupportWindowEnd && daysUntil(license.includedSupportWindowEnd, now) >= 0) {
    return "included";
  }

  if (maintenanceRenewalStatus === "active" || maintenanceRenewalStatus === "waived") {
    return "maintenance_active";
  }

  if (maintenanceRenewalStatus === "due_soon") {
    return "maintenance_due";
  }

  if (maintenanceRenewalStatus === "overdue") {
    return "support_limited";
  }

  return license.supportStatus ?? "custom_review";
}

function deriveLicenceHealth({
  license,
  supportStatus,
  maintenanceRenewalStatus,
  overLimit
}: {
  license: WorkspacePackageLicenseRecord;
  supportStatus: WorkspacePackageSupportStatus;
  maintenanceRenewalStatus: WorkspacePackageMaintenanceRenewalStatus;
  overLimit: boolean;
}): WorkspacePackageLicenceHealth {
  if (license.licenseStatus === "suspended" || supportStatus === "suspended") {
    return "suspended";
  }

  if (supportStatus === "support_limited") {
    return "support_limited";
  }

  if (
    license.licenseStatus === "custom_review" ||
    supportStatus === "custom_review" ||
    maintenanceRenewalStatus === "custom_review"
  ) {
    return "custom_review";
  }

  if (overLimit || supportStatus === "maintenance_due" || maintenanceRenewalStatus === "due_soon") {
    return "needs_review";
  }

  return "healthy";
}

function supportPromptFor(status: WorkspacePackageSupportStatus, overLimit: boolean) {
  if (overLimit) {
    return "Contact TradeHub support to upgrade this workspace package before adding more active students.";
  }

  if (status === "included") {
    return "Included support is active for this licence window.";
  }

  if (status === "maintenance_active") {
    return "Maintenance support is active for this workspace.";
  }

  if (status === "maintenance_due") {
    return "Maintenance is due soon. Contact TradeHub to keep support uninterrupted.";
  }

  if (status === "support_limited") {
    return "Support is limited until maintenance is reviewed with TradeHub.";
  }

  if (status === "suspended") {
    return "This licence is suspended. Contact TradeHub support before changing student capacity.";
  }

  return "This licence is in custom review. Contact TradeHub for the current support terms.";
}

function maintenanceSummaryFor(status: WorkspacePackageMaintenanceRenewalStatus, dueDate?: string) {
  const dueSuffix = dueDate ? ` Due ${new Date(dueDate).toLocaleDateString("en-US", { dateStyle: "medium" })}.` : "";

  if (status === "not_required") {
    return "Maintenance renewal is not required yet.";
  }

  if (status === "active") {
    return `Maintenance is active.${dueSuffix}`;
  }

  if (status === "due_soon") {
    return `Maintenance renewal is due soon.${dueSuffix}`;
  }

  if (status === "overdue") {
    return `Maintenance renewal is overdue.${dueSuffix}`;
  }

  if (status === "waived") {
    return "Maintenance renewal is waived by TradeHub admin.";
  }

  return "Maintenance renewal needs custom review by TradeHub.";
}

export function deriveWorkspacePackageStatus({
  workspace,
  activeStudentCount
}: {
  workspace: Pick<Workspace, "workspaceId" | "name" | "vettingStatus" | "packageLicense" | "createdAt" | "updatedAt">;
  activeStudentCount: number;
}): WorkspacePackageStatus {
  const license = workspace.packageLicense ?? defaultWorkspacePackageLicense(workspace);
  const studentSeatCap = license.studentSeatCap ?? null;
  const remainingSeats = studentSeatCap === null
    ? null
    : Math.max(0, studentSeatCap - activeStudentCount);
  const overLimitBy = studentSeatCap === null
    ? 0
    : Math.max(0, activeStudentCount - studentSeatCap);
  const overLimit = overLimitBy > 0;
  const enterpriseCustomCapacity = license.packageTier === "enterprise" && studentSeatCap === null;
  const maintenanceRenewalStatus = deriveMaintenanceRenewalStatus(license);
  const supportStatus = deriveSupportStatus(license, maintenanceRenewalStatus);
  const licenceHealth = deriveLicenceHealth({
    license,
    supportStatus,
    maintenanceRenewalStatus,
    overLimit
  });
  const maintenanceState = mapMaintenanceState(maintenanceRenewalStatus);

  return {
    packageTier: license.packageTier,
    packageName: packageNames[license.packageTier],
    licenseStatus: license.licenseStatus,
    supportWindowState: license.supportWindowState,
    maintenanceState,
    licenseStartDate: license.licenseStartDate,
    licenseTermType: license.licenseTermType,
    includedSupportWindowStart: license.includedSupportWindowStart,
    includedSupportWindowEnd: license.includedSupportWindowEnd,
    maintenanceRenewalStatus,
    maintenanceRenewalDueDate: license.maintenanceRenewalDueDate,
    supportStatus,
    licenceHealth,
    activeStudentCount,
    studentSeatCap,
    remainingSeats,
    overLimit,
    overLimitBy,
    enterpriseCustomCapacity,
    tradeCopierIncluded: false,
    tradeCopierAddOnLabel: "Trade Copier is a separate optional add-on.",
    upgradePrompt: overLimit
      ? "Contact TradeHub support to upgrade this workspace package before adding more active students."
      : enterpriseCustomCapacity
        ? "Enterprise capacity is custom-reviewed by TradeHub support."
        : "Contact TradeHub support when this workspace needs more student seats.",
    supportPrompt: supportPromptFor(supportStatus, overLimit),
    maintenanceSummary: maintenanceSummaryFor(maintenanceRenewalStatus, license.maintenanceRenewalDueDate),
    adminStatusReason: license.adminStatusReason,
    adminNoteSummary: license.adminNoteSummary,
    lastReviewedAt: license.lastReviewedAt,
    safeSummary: studentSeatCap === null
      ? `${packageNames[license.packageTier]} uses custom reviewed capacity.`
      : `${packageNames[license.packageTier]} supports up to ${studentSeatCap} active students.`,
    updatedAt: license.updatedAt ?? new Date().toISOString()
  };
}

export function assertWorkspacePackageSeatAvailable(status: WorkspacePackageStatus) {
  if (status.licenseStatus === "suspended" || status.licenseStatus === "expired") {
    throw new AdminApiError(
      403,
      "workspace_license_not_active",
      "This workspace licence is not active. Contact TradeHub support before adding active students."
    );
  }

  if (status.studentSeatCap !== null && status.activeStudentCount >= status.studentSeatCap) {
    throw new AdminApiError(
      403,
      "workspace_package_seat_cap_reached",
      "This workspace has reached its active student seat cap. Contact TradeHub support to upgrade before adding more active students."
    );
  }
}

export function toAdminWorkspacePackageInsight({
  workspace,
  packageStatus
}: {
  workspace: Pick<Workspace, "workspaceId" | "name">;
  packageStatus: WorkspacePackageStatus;
}): AdminWorkspacePackageInsight {
  return {
    workspaceRef: maskedWorkspaceRef(workspace.workspaceId),
    workspaceName: workspace.name,
    packageTier: packageStatus.packageTier,
    packageName: packageStatus.packageName,
    licenseStatus: packageStatus.licenseStatus,
    activeStudentCount: packageStatus.activeStudentCount,
    studentSeatCap: packageStatus.studentSeatCap,
    remainingSeats: packageStatus.remainingSeats,
    overLimit: packageStatus.overLimit,
    overLimitBy: packageStatus.overLimitBy,
    supportWindowState: packageStatus.supportWindowState,
    maintenanceState: packageStatus.maintenanceState,
    licenseStartDate: packageStatus.licenseStartDate,
    licenseTermType: packageStatus.licenseTermType,
    includedSupportWindowStart: packageStatus.includedSupportWindowStart,
    includedSupportWindowEnd: packageStatus.includedSupportWindowEnd,
    maintenanceRenewalStatus: packageStatus.maintenanceRenewalStatus,
    maintenanceRenewalDueDate: packageStatus.maintenanceRenewalDueDate,
    supportStatus: packageStatus.supportStatus,
    licenceHealth: packageStatus.licenceHealth,
    adminStatusReason: packageStatus.adminStatusReason,
    adminNoteSummary: packageStatus.adminNoteSummary,
    lastReviewedAt: packageStatus.lastReviewedAt,
    updatedAt: packageStatus.updatedAt
  };
}

export function summarizeAdminWorkspacePackages(
  insights: AdminWorkspacePackageInsight[]
): AdminWorkspacePackageOverview {
  return {
    totalWorkspaces: insights.length,
    launchWorkspaces: insights.filter((insight) => insight.packageTier === "launch").length,
    proWorkspaces: insights.filter((insight) => insight.packageTier === "pro").length,
    enterpriseWorkspaces: insights.filter((insight) => insight.packageTier === "enterprise").length,
    activeLicenses: insights.filter((insight) => insight.licenseStatus === "active").length,
    pendingLicenses: insights.filter((insight) => insight.licenseStatus === "pending").length,
    expiredLicenses: insights.filter((insight) => insight.licenseStatus === "expired").length,
    suspendedLicenses: insights.filter((insight) => insight.licenseStatus === "suspended").length,
    customReviewLicenses: insights.filter((insight) => insight.licenseStatus === "custom_review").length,
    overLimitWorkspaces: insights.filter((insight) => insight.overLimit).length,
    maintenanceActive: insights.filter((insight) => insight.maintenanceRenewalStatus === "active").length,
    maintenanceDueSoon: insights.filter((insight) => insight.maintenanceRenewalStatus === "due_soon").length,
    maintenanceOverdue: insights.filter((insight) => insight.maintenanceRenewalStatus === "overdue").length,
    maintenanceWaived: insights.filter((insight) => insight.maintenanceRenewalStatus === "waived").length,
    supportLimited: insights.filter((insight) => insight.supportStatus === "support_limited").length,
    supportSuspended: insights.filter((insight) => insight.supportStatus === "suspended").length,
    customReviewNeeded: insights.filter((insight) =>
      insight.licenseStatus === "custom_review" ||
      insight.maintenanceRenewalStatus === "custom_review" ||
      insight.supportStatus === "custom_review" ||
      insight.licenceHealth === "custom_review"
    ).length,
    licenceOpsUpdatedAt: new Date().toISOString(),
    latestWorkspaces: insights
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 8)
  };
}

export const workspacePackageSeatCaps = {
  launch: LAUNCH_SEAT_CAP,
  pro: PRO_SEAT_CAP,
  enterprise: null
} as const;
