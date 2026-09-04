import type { Workspace } from "@/types/workspace";
import type {
  AdminWorkspaceEnterpriseDeploymentInsight,
  AdminWorkspaceEnterpriseDeploymentOverview,
  WorkspaceEnterpriseBackupRestoreStatus,
  WorkspaceEnterpriseDeploymentMode,
  WorkspaceEnterpriseDeploymentReadiness,
  WorkspaceEnterpriseDeploymentStatus,
  WorkspaceEnterpriseSlaStatus,
  WorkspacePackageStatus
} from "@/types/workspace-package";
import { maskedWorkspaceRef, sanitizeWorkspacePackageAdminText } from "@/lib/workspace/workspace-package-licence";

const deploymentModes: WorkspaceEnterpriseDeploymentMode[] = [
  "shared_tradehub_cloud",
  "isolated_tenant_ready",
  "dedicated_deployment_ready",
  "custom_contract"
];
const deploymentStatuses: WorkspaceEnterpriseDeploymentStatus[] = [
  "not_configured",
  "requested",
  "scoping",
  "security_review",
  "ready_for_contract",
  "active",
  "blocked",
  "custom_review"
];
const slaStatuses: WorkspaceEnterpriseSlaStatus[] = [
  "standard_support",
  "priority_support",
  "enterprise_sla_ready",
  "support_limited",
  "suspended",
  "custom_review"
];
const backupRestoreStatuses: WorkspaceEnterpriseBackupRestoreStatus[] = [
  "standard_platform",
  "documented",
  "custom_review",
  "not_configured"
];
const dataResidencyStatuses = ["not_requested", "requested", "custom_review"] as const;

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? value as T : fallback;
}

function checklistFor(status: WorkspaceEnterpriseDeploymentStatus) {
  if (status === "active") {
    return {
      deploymentChecklist: [
        "Enterprise deployment is marked active in TradeHub admin records.",
        "Contract scope, operations owner, and support route are documented outside the browser.",
        "No infrastructure provider action is triggered by this status."
      ],
      rollbackChecklist: [
        "Rollback owner is identified in the contract.",
        "Support escalation path is documented.",
        "Production disable remains controlled by existing kill switches."
      ],
      contractScopePrompt: "Enterprise deployment is active in admin metadata. Keep the signed scope and support terms current."
    };
  }

  if (status === "requested" || status === "scoping" || status === "security_review") {
    return {
      deploymentChecklist: [
        "Capture requested deployment model and expected support window.",
        "Review data boundaries, tenant scope, backup/restore responsibility, and launch gates.",
        "Keep dedicated infrastructure as contract-scoped until TradeHub approves the architecture."
      ],
      rollbackChecklist: [
        "Define emergency disable owner before any production launch.",
        "Document rollback contact route and recovery expectation.",
        "Confirm frozen product boundaries remain unchanged."
      ],
      contractScopePrompt: "Enterprise deployment is still in review. Do not promise live dedicated infrastructure until contract scope is signed."
    };
  }

  if (status === "ready_for_contract") {
    return {
      deploymentChecklist: [
        "Deployment scope is ready for contract review.",
        "SLA language, support coverage, and backup/restore duties need customer sign-off.",
        "Infrastructure activation remains manual and future-approved."
      ],
      rollbackChecklist: [
        "Rollback checklist must be attached to the signed scope.",
        "Incident contact owner must be named before activation.",
        "Live AutoCopy gates remain separate from deployment readiness."
      ],
      contractScopePrompt: "Ready for contract review. This is not an automatic deployment or live execution approval."
    };
  }

  if (status === "blocked") {
    return {
      deploymentChecklist: [
        "Enterprise deployment is blocked for support review.",
        "Do not promise dedicated hosting, custom SLA, or data residency until unblocked.",
        "Use current TradeHub shared cloud posture until reviewed."
      ],
      rollbackChecklist: [
        "Document why deployment readiness is blocked.",
        "Keep emergency disable and rollback runbooks separate from sales copy.",
        "Re-review before any contract commitment."
      ],
      contractScopePrompt: "Enterprise deployment is blocked. Contact TradeHub before including it in a proposal."
    };
  }

  if (status === "custom_review") {
    return {
      deploymentChecklist: [
        "Enterprise deployment needs custom TradeHub review.",
        "Data residency, dedicated deployment, SLA, and backup/restore terms are contract-scoped.",
        "No provider, credential, or infrastructure metadata is browser-visible."
      ],
      rollbackChecklist: [
        "Custom rollback and support language must be negotiated.",
        "Incident response expectations must be written before launch.",
        "Existing kill switches stay the operational control layer."
      ],
      contractScopePrompt: "Custom Enterprise review is required before promising deployment or SLA details."
    };
  }

  return {
    deploymentChecklist: [
      "No Enterprise deployment is configured.",
      "The workspace uses the standard TradeHub shared cloud posture.",
      "Dedicated deployment, SLA, and data residency remain custom contract items."
    ],
    rollbackChecklist: [
      "Use standard TradeHub support and existing platform rollback posture.",
      "No dedicated rollback runbook is attached to this workspace.",
      "Contact TradeHub before promising Enterprise operations terms."
    ],
    contractScopePrompt: "Enterprise deployment is not configured. Treat dedicated infrastructure and SLA terms as contact-sales only."
  };
}

function packageAvailabilityMessage(packageStatus: WorkspacePackageStatus) {
  if (packageStatus.packageTier === "enterprise") {
    return "Enterprise workspaces can be scoped for isolated tenant or dedicated deployment through a custom agreement.";
  }

  if (packageStatus.packageTier === "pro") {
    return "Pro workspaces use the standard TradeHub cloud. Enterprise deployment and SLA terms require an Enterprise agreement.";
  }

  return "Launch workspaces use the standard TradeHub cloud. Enterprise deployment and SLA terms require an Enterprise agreement.";
}

export function deriveWorkspaceEnterpriseDeploymentReadiness({
  workspace,
  packageStatus
}: {
  workspace: Pick<Workspace, "workspaceId" | "updatedAt"> & Partial<Pick<Workspace, "enterpriseDeployment">>;
  packageStatus: WorkspacePackageStatus;
}): WorkspaceEnterpriseDeploymentReadiness {
  const enterprise = workspace.enterpriseDeployment;
  const isEnterprise = packageStatus.packageTier === "enterprise";
  const deploymentMode = isEnterprise
    ? oneOf(enterprise?.deploymentMode, deploymentModes, "custom_contract")
    : "shared_tradehub_cloud";
  const deploymentStatus = isEnterprise
    ? oneOf(enterprise?.deploymentStatus, deploymentStatuses, "custom_review")
    : "not_configured";
  const slaStatus = isEnterprise
    ? oneOf(enterprise?.slaStatus, slaStatuses, "custom_review")
    : packageStatus.supportStatus === "suspended"
      ? "suspended"
      : "standard_support";
  const backupRestoreStatus = isEnterprise
    ? oneOf(enterprise?.backupRestoreStatus, backupRestoreStatuses, "custom_review")
    : "standard_platform";
  const dataResidencyStatus = isEnterprise
    ? oneOf(enterprise?.dataResidencyStatus, dataResidencyStatuses, "custom_review")
    : "not_requested";
  const checklist = checklistFor(deploymentStatus);

  return {
    deploymentMode,
    deploymentStatus,
    slaStatus,
    backupRestoreStatus,
    dataResidencyStatus,
    supportWindowLabel: isEnterprise
      ? "Enterprise support is contract-scoped and reviewed by TradeHub."
      : "Standard package support applies. Enterprise SLA is not included.",
    deploymentChecklist: checklist.deploymentChecklist,
    rollbackChecklist: checklist.rollbackChecklist,
    packageAvailabilityMessage: packageAvailabilityMessage(packageStatus),
    contractScopePrompt: checklist.contractScopePrompt,
    adminReviewNote: sanitizeWorkspacePackageAdminText(enterprise?.adminReviewNote, 320),
    adminStatusReason: sanitizeWorkspacePackageAdminText(enterprise?.adminStatusReason, 240),
    updatedAt: enterprise?.updatedAt ?? workspace.updatedAt ?? new Date().toISOString()
  };
}

export function toAdminWorkspaceEnterpriseDeploymentInsight({
  workspace,
  packageStatus,
  enterpriseReadiness
}: {
  workspace: Pick<Workspace, "workspaceId" | "name">;
  packageStatus: WorkspacePackageStatus;
  enterpriseReadiness: WorkspaceEnterpriseDeploymentReadiness;
}): AdminWorkspaceEnterpriseDeploymentInsight {
  return {
    workspaceRef: maskedWorkspaceRef(workspace.workspaceId),
    workspaceName: workspace.name,
    packageTier: packageStatus.packageTier,
    packageName: packageStatus.packageName,
    deploymentMode: enterpriseReadiness.deploymentMode,
    deploymentStatus: enterpriseReadiness.deploymentStatus,
    slaStatus: enterpriseReadiness.slaStatus,
    backupRestoreStatus: enterpriseReadiness.backupRestoreStatus,
    dataResidencyStatus: enterpriseReadiness.dataResidencyStatus,
    supportWindowLabel: enterpriseReadiness.supportWindowLabel,
    deploymentChecklist: enterpriseReadiness.deploymentChecklist,
    rollbackChecklist: enterpriseReadiness.rollbackChecklist,
    packageAvailabilityMessage: enterpriseReadiness.packageAvailabilityMessage,
    contractScopePrompt: enterpriseReadiness.contractScopePrompt,
    adminReviewNote: enterpriseReadiness.adminReviewNote,
    adminStatusReason: enterpriseReadiness.adminStatusReason,
    updatedAt: enterpriseReadiness.updatedAt
  };
}

export function summarizeAdminWorkspaceEnterpriseDeployment(
  insights: AdminWorkspaceEnterpriseDeploymentInsight[]
): AdminWorkspaceEnterpriseDeploymentOverview {
  return {
    totalWorkspaces: insights.length,
    enterpriseWorkspaces: insights.filter((insight) => insight.packageTier === "enterprise").length,
    requestedDeployments: insights.filter((insight) => insight.deploymentStatus === "requested").length,
    scopingDeployments: insights.filter((insight) => insight.deploymentStatus === "scoping").length,
    securityReviewDeployments: insights.filter((insight) => insight.deploymentStatus === "security_review").length,
    readyForContractDeployments: insights.filter((insight) => insight.deploymentStatus === "ready_for_contract").length,
    activeDeployments: insights.filter((insight) => insight.deploymentStatus === "active").length,
    blockedDeployments: insights.filter((insight) => insight.deploymentStatus === "blocked").length,
    customReviewDeployments: insights.filter((insight) => insight.deploymentStatus === "custom_review").length,
    enterpriseSlaReady: insights.filter((insight) => insight.slaStatus === "enterprise_sla_ready").length,
    backupDocumented: insights.filter((insight) => insight.backupRestoreStatus === "documented").length,
    enterpriseOpsUpdatedAt: new Date().toISOString(),
    latestWorkspaces: insights
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 8)
  };
}
