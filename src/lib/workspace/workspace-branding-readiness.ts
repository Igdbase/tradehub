import type { Workspace } from "@/types/workspace";
import type {
  AdminWorkspaceBrandingInsight,
  AdminWorkspaceBrandingOverview,
  WorkspaceBrandingMode,
  WorkspaceBrandingReadiness,
  WorkspaceCustomDomainStatus,
  WorkspaceDnsChecklistStatus,
  WorkspacePackageStatus,
  WorkspaceStudentBrandVisibilityStatus
} from "@/types/workspace-package";
import { maskedWorkspaceRef, sanitizeWorkspacePackageAdminText } from "@/lib/workspace/workspace-package-licence";

const brandingModes: WorkspaceBrandingMode[] = [
  "tradehub_branded",
  "co_branded",
  "white_label_ready"
];
const customDomainStatuses: WorkspaceCustomDomainStatus[] = [
  "not_configured",
  "requested",
  "dns_pending",
  "verifying",
  "active",
  "blocked",
  "custom_review"
];
const dnsChecklistStatuses: WorkspaceDnsChecklistStatus[] = [
  "not_started",
  "pending",
  "passed",
  "failed",
  "custom_review"
];

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? value as T : fallback;
}

export function sanitizeWorkspaceBrandText(value: unknown, fallback = "", maxLength = 80) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return cleaned || fallback;
}

export function sanitizeWorkspaceBrandColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    return cleaned;
  }

  if (/^[a-z][a-z0-9_-]{0,39}$/.test(cleaned)) {
    return cleaned;
  }

  return fallback;
}

export function sanitizeWorkspaceLogoUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString().slice(0, 240) : undefined;
  } catch {
    return undefined;
  }
}

export function sanitizeWorkspaceDomainHostname(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const raw = value.trim().toLowerCase();
  const candidate = raw.startsWith("https://") || raw.startsWith("http://")
    ? (() => {
        try {
          const url = new URL(raw);
          return url.hostname;
        } catch {
          return "";
        }
      })()
    : raw.replace(/^\/+/, "").split("/")[0] ?? "";

  if (
    candidate.length > 253 ||
    candidate.includes("..") ||
    candidate === "localhost" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(candidate)
  ) {
    return undefined;
  }

  const labels = candidate.split(".");
  const valid = labels.length >= 2 && labels.every((label) =>
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
  );

  return valid ? candidate : undefined;
}

function allowedBrandingModes(packageStatus: WorkspacePackageStatus): WorkspaceBrandingMode[] {
  if (packageStatus.packageTier === "launch") {
    return ["tradehub_branded", "co_branded"];
  }

  return brandingModes;
}

function packageAvailabilityMessage(packageStatus: WorkspacePackageStatus, mode: WorkspaceBrandingMode) {
  if (packageStatus.packageTier === "launch") {
    return mode === "white_label_ready"
      ? "Launch workspaces stay TradeHub-branded or lightly co-branded. White-label controls require Pro or Enterprise review."
      : "Launch workspaces can use TradeHub-branded or light co-branded student-facing surfaces.";
  }

  if (packageStatus.packageTier === "pro") {
    return "Pro workspaces can use co-branded and white-label-ready controls. Custom domains still require TradeHub admin review.";
  }

  return "Enterprise branding, white-label posture, and custom domains are custom-reviewed by TradeHub.";
}

function visibilityForMode(
  mode: WorkspaceBrandingMode,
  domainStatus: WorkspaceCustomDomainStatus
): WorkspaceStudentBrandVisibilityStatus {
  if (domainStatus === "blocked" || domainStatus === "custom_review") {
    return "custom_review";
  }

  if (mode === "white_label_ready") {
    return "workspace_brand_visible";
  }

  if (mode === "co_branded") {
    return "co_brand_visible";
  }

  return "tradehub_visible";
}

function checklistFor(status: WorkspaceCustomDomainStatus): {
  dnsChecklistStatus: WorkspaceDnsChecklistStatus;
  dnsChecklistSummary: string[];
  contactPrompt: string;
} {
  if (status === "active") {
    return {
      dnsChecklistStatus: "passed",
      dnsChecklistSummary: [
        "Domain request is active in TradeHub admin records.",
        "DNS and SSL are marked reviewed outside the browser.",
        "No DNS provider automation is performed from this app."
      ],
      contactPrompt: "Custom domain status is active in TradeHub admin records."
    };
  }

  if (status === "requested" || status === "dns_pending" || status === "verifying") {
    return {
      dnsChecklistStatus: "pending",
      dnsChecklistSummary: [
        "Domain request is recorded as metadata only.",
        "DNS ownership and SSL review are still pending.",
        "TradeHub will review setup outside the app before activation."
      ],
      contactPrompt: "Contact TradeHub support to continue domain verification."
    };
  }

  if (status === "blocked") {
    return {
      dnsChecklistStatus: "failed",
      dnsChecklistSummary: [
        "Domain readiness is blocked for support review.",
        "No DNS, SSL, or hosting change was made by TradeHub.",
        "Use the current TradeHub domain until review is complete."
      ],
      contactPrompt: "Contact TradeHub support before using this domain."
    };
  }

  if (status === "custom_review") {
    return {
      dnsChecklistStatus: "custom_review",
      dnsChecklistSummary: [
        "Domain readiness needs custom TradeHub review.",
        "Provider records and DNS details are not exposed in this dashboard.",
        "Activation remains manual and admin-reviewed."
      ],
      contactPrompt: "Contact TradeHub support for custom domain review."
    };
  }

  return {
    dnsChecklistStatus: "not_started",
    dnsChecklistSummary: [
      "No custom domain is configured.",
      "The workspace remains on TradeHub-hosted student surfaces.",
      "Domain automation, DNS changes, and uploads are not enabled here."
    ],
    contactPrompt: "Contact TradeHub support when this workspace needs co-branding or custom domain review."
  };
}

export function deriveWorkspaceBrandingReadiness({
  workspace,
  packageStatus
}: {
  workspace: Pick<Workspace, "name" | "updatedAt"> & Partial<Pick<Workspace, "branding">>;
  packageStatus: WorkspacePackageStatus;
}): WorkspaceBrandingReadiness {
  const branding = workspace.branding;
  const requestedMode = oneOf(
    branding?.brandingMode,
    brandingModes,
    packageStatus.packageTier === "launch" ? "tradehub_branded" : "co_branded"
  );
  const allowedModes = allowedBrandingModes(packageStatus);
  const brandingMode = allowedModes.includes(requestedMode)
    ? requestedMode
    : packageStatus.packageTier === "launch"
      ? "co_branded"
      : "tradehub_branded";
  const customDomainStatus = oneOf(
    branding?.customDomainStatus,
    customDomainStatuses,
    "not_configured"
  );
  const checklist = checklistFor(customDomainStatus);
  const explicitDnsStatus = oneOf(
    branding?.dnsChecklistStatus,
    dnsChecklistStatuses,
    checklist.dnsChecklistStatus
  );
  const displayName = sanitizeWorkspaceBrandText(branding?.displayName, workspace.name, 80);
  const adminReviewNote = sanitizeWorkspacePackageAdminText(branding?.adminReviewNote, 320);
  const adminStatusReason = sanitizeWorkspacePackageAdminText(branding?.adminStatusReason, 240);

  return {
    brandingMode,
    displayName,
    logoUrl: sanitizeWorkspaceLogoUrl(branding?.logoUrl),
    primaryColor: sanitizeWorkspaceBrandColor(branding?.primaryColor, "locked_tradehub_surface"),
    accentColor: sanitizeWorkspaceBrandColor(branding?.accentColor, "accent"),
    studentFacingBrandVisibilityStatus: visibilityForMode(brandingMode, customDomainStatus),
    customDomainStatus,
    requestedDomainHostname: sanitizeWorkspaceDomainHostname(branding?.requestedDomainHostname),
    dnsChecklistStatus: explicitDnsStatus,
    dnsChecklistSummary: checklist.dnsChecklistSummary,
    packageAvailabilityMessage: packageAvailabilityMessage(packageStatus, requestedMode),
    contactPrompt: checklist.contactPrompt,
    adminReviewNote,
    adminStatusReason,
    updatedAt: branding?.updatedAt ?? workspace.updatedAt ?? new Date().toISOString()
  };
}

export function toAdminWorkspaceBrandingInsight({
  workspace,
  packageStatus,
  brandingReadiness
}: {
  workspace: Pick<Workspace, "workspaceId" | "name">;
  packageStatus: WorkspacePackageStatus;
  brandingReadiness: WorkspaceBrandingReadiness;
}): AdminWorkspaceBrandingInsight {
  return {
    workspaceRef: maskedWorkspaceRef(workspace.workspaceId),
    workspaceName: workspace.name,
    packageTier: packageStatus.packageTier,
    packageName: packageStatus.packageName,
    brandingMode: brandingReadiness.brandingMode,
    displayName: brandingReadiness.displayName,
    logoUrl: brandingReadiness.logoUrl,
    primaryColor: brandingReadiness.primaryColor,
    accentColor: brandingReadiness.accentColor,
    studentFacingBrandVisibilityStatus: brandingReadiness.studentFacingBrandVisibilityStatus,
    customDomainStatus: brandingReadiness.customDomainStatus,
    requestedDomainHostname: brandingReadiness.requestedDomainHostname,
    dnsChecklistStatus: brandingReadiness.dnsChecklistStatus,
    dnsChecklistSummary: brandingReadiness.dnsChecklistSummary,
    packageAvailabilityMessage: brandingReadiness.packageAvailabilityMessage,
    adminReviewNote: brandingReadiness.adminReviewNote,
    adminStatusReason: brandingReadiness.adminStatusReason,
    updatedAt: brandingReadiness.updatedAt
  };
}

export function summarizeAdminWorkspaceBranding(
  insights: AdminWorkspaceBrandingInsight[]
): AdminWorkspaceBrandingOverview {
  return {
    totalWorkspaces: insights.length,
    tradehubBranded: insights.filter((insight) => insight.brandingMode === "tradehub_branded").length,
    coBranded: insights.filter((insight) => insight.brandingMode === "co_branded").length,
    whiteLabelReady: insights.filter((insight) => insight.brandingMode === "white_label_ready").length,
    requestedDomains: insights.filter((insight) => insight.customDomainStatus === "requested").length,
    dnsPendingDomains: insights.filter((insight) => insight.customDomainStatus === "dns_pending").length,
    verifyingDomains: insights.filter((insight) => insight.customDomainStatus === "verifying").length,
    activeDomains: insights.filter((insight) => insight.customDomainStatus === "active").length,
    blockedDomains: insights.filter((insight) => insight.customDomainStatus === "blocked").length,
    customReviewDomains: insights.filter((insight) => insight.customDomainStatus === "custom_review").length,
    brandingOpsUpdatedAt: new Date().toISOString(),
    latestWorkspaces: insights
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 8)
  };
}
