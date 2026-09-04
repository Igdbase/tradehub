type IsoDateString = string;

export type WorkspacePackageTier = "launch" | "pro" | "enterprise";

export type WorkspaceBrandingMode =
  | "tradehub_branded"
  | "co_branded"
  | "white_label_ready";

export type WorkspaceStudentBrandVisibilityStatus =
  | "tradehub_visible"
  | "co_brand_visible"
  | "workspace_brand_visible"
  | "custom_review";

export type WorkspaceCustomDomainStatus =
  | "not_configured"
  | "requested"
  | "dns_pending"
  | "verifying"
  | "active"
  | "blocked"
  | "custom_review";

export type WorkspaceDnsChecklistStatus =
  | "not_started"
  | "pending"
  | "passed"
  | "failed"
  | "custom_review";

export type WorkspaceEnterpriseDeploymentMode =
  | "shared_tradehub_cloud"
  | "isolated_tenant_ready"
  | "dedicated_deployment_ready"
  | "custom_contract";

export type WorkspaceEnterpriseDeploymentStatus =
  | "not_configured"
  | "requested"
  | "scoping"
  | "security_review"
  | "ready_for_contract"
  | "active"
  | "blocked"
  | "custom_review";

export type WorkspaceEnterpriseSlaStatus =
  | "standard_support"
  | "priority_support"
  | "enterprise_sla_ready"
  | "support_limited"
  | "suspended"
  | "custom_review";

export type WorkspaceEnterpriseBackupRestoreStatus =
  | "standard_platform"
  | "documented"
  | "custom_review"
  | "not_configured";

export type WorkspaceEnterpriseIntegrationCategory =
  | "crm"
  | "payment"
  | "analytics"
  | "broker"
  | "telegram_discord"
  | "external_lms"
  | "data_export"
  | "custom";

export type WorkspaceEnterpriseIntegrationStatus =
  | "requested"
  | "triage"
  | "scoping"
  | "approved_for_build"
  | "blocked"
  | "completed"
  | "rejected"
  | "custom_review";

export type WorkspaceEnterpriseIntegrationPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type WorkspaceEnterpriseIntegrationComplexity =
  | "small"
  | "medium"
  | "large"
  | "custom";

export type WorkspaceEnterpriseIntegrationDataSensitivityFlag =
  | "student_profile"
  | "billing_status"
  | "course_progress"
  | "practice_aggregates"
  | "manual_journal_aggregates"
  | "signals_metadata"
  | "custom_review";

export type WorkspacePackageLicenseStatus =
  | "active"
  | "pending"
  | "expired"
  | "suspended"
  | "custom_review";

export type WorkspacePackageSupportWindowState =
  | "standard"
  | "priority"
  | "custom"
  | "not_configured";

export type WorkspacePackageMaintenanceState =
  | "current"
  | "due_soon"
  | "overdue"
  | "custom_review";

export type WorkspacePackageLicenseTermType =
  | "lifetime"
  | "fixed_term"
  | "custom";

export type WorkspacePackageMaintenanceRenewalStatus =
  | "not_required"
  | "active"
  | "due_soon"
  | "overdue"
  | "waived"
  | "custom_review";

export type WorkspacePackageSupportStatus =
  | "included"
  | "maintenance_active"
  | "maintenance_due"
  | "support_limited"
  | "suspended"
  | "custom_review";

export type WorkspacePackageLicenceHealth =
  | "healthy"
  | "needs_review"
  | "support_limited"
  | "suspended"
  | "custom_review";

export type WorkspacePackageLicenseRecord = {
  packageTier: WorkspacePackageTier;
  studentSeatCap?: number | null;
  licenseStatus: WorkspacePackageLicenseStatus;
  supportWindowState: WorkspacePackageSupportWindowState;
  maintenanceState: WorkspacePackageMaintenanceState;
  licenseStartDate?: IsoDateString;
  licenseTermType: WorkspacePackageLicenseTermType;
  includedSupportWindowStart?: IsoDateString;
  includedSupportWindowEnd?: IsoDateString;
  maintenanceRenewalStatus: WorkspacePackageMaintenanceRenewalStatus;
  maintenanceRenewalDueDate?: IsoDateString;
  supportStatus?: WorkspacePackageSupportStatus;
  adminStatusReason?: string;
  adminNoteSummary?: string;
  lastReviewedAt?: IsoDateString;
  updatedAt?: IsoDateString;
};

export type WorkspacePackageStatus = {
  packageTier: WorkspacePackageTier;
  packageName: string;
  licenseStatus: WorkspacePackageLicenseStatus;
  supportWindowState: WorkspacePackageSupportWindowState;
  maintenanceState: WorkspacePackageMaintenanceState;
  licenseStartDate?: IsoDateString;
  licenseTermType: WorkspacePackageLicenseTermType;
  includedSupportWindowStart?: IsoDateString;
  includedSupportWindowEnd?: IsoDateString;
  maintenanceRenewalStatus: WorkspacePackageMaintenanceRenewalStatus;
  maintenanceRenewalDueDate?: IsoDateString;
  supportStatus: WorkspacePackageSupportStatus;
  licenceHealth: WorkspacePackageLicenceHealth;
  activeStudentCount: number;
  studentSeatCap: number | null;
  remainingSeats: number | null;
  overLimit: boolean;
  overLimitBy: number;
  enterpriseCustomCapacity: boolean;
  tradeCopierIncluded: false;
  tradeCopierAddOnLabel: string;
  upgradePrompt: string;
  supportPrompt: string;
  maintenanceSummary: string;
  adminStatusReason?: string;
  adminNoteSummary?: string;
  lastReviewedAt?: IsoDateString;
  safeSummary: string;
  updatedAt: IsoDateString;
};

export type WorkspaceBrandingReadiness = {
  brandingMode: WorkspaceBrandingMode;
  displayName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  studentFacingBrandVisibilityStatus: WorkspaceStudentBrandVisibilityStatus;
  customDomainStatus: WorkspaceCustomDomainStatus;
  requestedDomainHostname?: string;
  dnsChecklistStatus: WorkspaceDnsChecklistStatus;
  dnsChecklistSummary: string[];
  packageAvailabilityMessage: string;
  contactPrompt: string;
  adminReviewNote?: string;
  adminStatusReason?: string;
  updatedAt: IsoDateString;
};

export type WorkspaceEnterpriseDeploymentReadiness = {
  deploymentMode: WorkspaceEnterpriseDeploymentMode;
  deploymentStatus: WorkspaceEnterpriseDeploymentStatus;
  slaStatus: WorkspaceEnterpriseSlaStatus;
  backupRestoreStatus: WorkspaceEnterpriseBackupRestoreStatus;
  dataResidencyStatus: "not_requested" | "requested" | "custom_review";
  supportWindowLabel: string;
  deploymentChecklist: string[];
  rollbackChecklist: string[];
  packageAvailabilityMessage: string;
  contractScopePrompt: string;
  adminReviewNote?: string;
  adminStatusReason?: string;
  updatedAt: IsoDateString;
};

export type WorkspaceEnterpriseIntegrationRequest = {
  requestId: string;
  workspaceId: string;
  category: WorkspaceEnterpriseIntegrationCategory;
  status: WorkspaceEnterpriseIntegrationStatus;
  priority: WorkspaceEnterpriseIntegrationPriority;
  title: string;
  description: string;
  requestedProviderLabel?: string;
  requestedProviderHostname?: string;
  dataSensitivityFlags: WorkspaceEnterpriseIntegrationDataSensitivityFlag[];
  securityReviewRequired: boolean;
  legalSlaDependency: boolean;
  estimatedComplexity: WorkspaceEnterpriseIntegrationComplexity;
  workspaceVisibleNote?: string;
  adminNoteSummary?: string;
  adminStatusReason?: string;
  requestedByRef?: string;
  reviewedByRef?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type WorkspaceEnterpriseIntegrationRequestSummary = {
  requestRef: string;
  category: WorkspaceEnterpriseIntegrationCategory;
  status: WorkspaceEnterpriseIntegrationStatus;
  priority: WorkspaceEnterpriseIntegrationPriority;
  title: string;
  description: string;
  requestedProviderLabel?: string;
  requestedProviderHostname?: string;
  dataSensitivityFlags: WorkspaceEnterpriseIntegrationDataSensitivityFlag[];
  securityReviewRequired: boolean;
  legalSlaDependency: boolean;
  estimatedComplexity: WorkspaceEnterpriseIntegrationComplexity;
  workspaceVisibleNote?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type WorkspaceEnterpriseIntegrationOverview = {
  enterpriseAvailable: boolean;
  availabilityMessage: string;
  totalRequests: number;
  openRequests: number;
  blockedRequests: number;
  securityReviewRequiredCount: number;
  legalSlaDependencyCount: number;
  requests: WorkspaceEnterpriseIntegrationRequestSummary[];
  updatedAt: IsoDateString;
};

export type WorkspaceEnterpriseIntegrationCreatePayload = {
  category: WorkspaceEnterpriseIntegrationCategory;
  priority: WorkspaceEnterpriseIntegrationPriority;
  title: string;
  description: string;
  requestedProviderLabel?: string;
  requestedProviderHostname?: string;
  dataSensitivityFlags?: WorkspaceEnterpriseIntegrationDataSensitivityFlag[];
  securityReviewRequired?: boolean;
  legalSlaDependency?: boolean;
  estimatedComplexity?: WorkspaceEnterpriseIntegrationComplexity;
  workspaceVisibleNote?: string;
};

export type WorkspaceEnterpriseIntegrationRequestsResponse = {
  ok: true;
  source: "firestore";
  warnings: string[];
  overview: WorkspaceEnterpriseIntegrationOverview;
};

export type WorkspaceEnterpriseIntegrationCreateResponse = WorkspaceEnterpriseIntegrationRequestsResponse & {
  request: WorkspaceEnterpriseIntegrationRequestSummary;
  message: string;
};

export type AdminWorkspacePackageInsight = {
  workspaceRef: string;
  workspaceName: string;
  packageTier: WorkspacePackageTier;
  packageName: string;
  licenseStatus: WorkspacePackageLicenseStatus;
  activeStudentCount: number;
  studentSeatCap: number | null;
  remainingSeats: number | null;
  overLimit: boolean;
  overLimitBy: number;
  supportWindowState: WorkspacePackageSupportWindowState;
  maintenanceState: WorkspacePackageMaintenanceState;
  licenseStartDate?: IsoDateString;
  licenseTermType: WorkspacePackageLicenseTermType;
  includedSupportWindowStart?: IsoDateString;
  includedSupportWindowEnd?: IsoDateString;
  maintenanceRenewalStatus: WorkspacePackageMaintenanceRenewalStatus;
  maintenanceRenewalDueDate?: IsoDateString;
  supportStatus: WorkspacePackageSupportStatus;
  licenceHealth: WorkspacePackageLicenceHealth;
  adminStatusReason?: string;
  adminNoteSummary?: string;
  lastReviewedAt?: IsoDateString;
  updatedAt: IsoDateString;
};

export type AdminWorkspacePackageOverview = {
  totalWorkspaces: number;
  launchWorkspaces: number;
  proWorkspaces: number;
  enterpriseWorkspaces: number;
  activeLicenses: number;
  pendingLicenses: number;
  expiredLicenses: number;
  suspendedLicenses: number;
  customReviewLicenses: number;
  overLimitWorkspaces: number;
  maintenanceActive: number;
  maintenanceDueSoon: number;
  maintenanceOverdue: number;
  maintenanceWaived: number;
  supportLimited: number;
  supportSuspended: number;
  customReviewNeeded: number;
  licenceOpsUpdatedAt: IsoDateString;
  latestWorkspaces: AdminWorkspacePackageInsight[];
};

export type AdminWorkspaceBrandingInsight = {
  workspaceRef: string;
  workspaceName: string;
  packageTier: WorkspacePackageTier;
  packageName: string;
  brandingMode: WorkspaceBrandingMode;
  displayName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  studentFacingBrandVisibilityStatus: WorkspaceStudentBrandVisibilityStatus;
  customDomainStatus: WorkspaceCustomDomainStatus;
  requestedDomainHostname?: string;
  dnsChecklistStatus: WorkspaceDnsChecklistStatus;
  dnsChecklistSummary: string[];
  packageAvailabilityMessage: string;
  adminReviewNote?: string;
  adminStatusReason?: string;
  updatedAt: IsoDateString;
};

export type AdminWorkspaceBrandingOverview = {
  totalWorkspaces: number;
  tradehubBranded: number;
  coBranded: number;
  whiteLabelReady: number;
  requestedDomains: number;
  dnsPendingDomains: number;
  verifyingDomains: number;
  activeDomains: number;
  blockedDomains: number;
  customReviewDomains: number;
  brandingOpsUpdatedAt: IsoDateString;
  latestWorkspaces: AdminWorkspaceBrandingInsight[];
};

export type AdminWorkspaceEnterpriseDeploymentInsight = {
  workspaceRef: string;
  workspaceName: string;
  packageTier: WorkspacePackageTier;
  packageName: string;
  deploymentMode: WorkspaceEnterpriseDeploymentMode;
  deploymentStatus: WorkspaceEnterpriseDeploymentStatus;
  slaStatus: WorkspaceEnterpriseSlaStatus;
  backupRestoreStatus: WorkspaceEnterpriseBackupRestoreStatus;
  dataResidencyStatus: "not_requested" | "requested" | "custom_review";
  supportWindowLabel: string;
  deploymentChecklist: string[];
  rollbackChecklist: string[];
  packageAvailabilityMessage: string;
  contractScopePrompt: string;
  adminReviewNote?: string;
  adminStatusReason?: string;
  updatedAt: IsoDateString;
};

export type AdminWorkspaceEnterpriseDeploymentOverview = {
  totalWorkspaces: number;
  enterpriseWorkspaces: number;
  requestedDeployments: number;
  scopingDeployments: number;
  securityReviewDeployments: number;
  readyForContractDeployments: number;
  activeDeployments: number;
  blockedDeployments: number;
  customReviewDeployments: number;
  enterpriseSlaReady: number;
  backupDocumented: number;
  enterpriseOpsUpdatedAt: IsoDateString;
  latestWorkspaces: AdminWorkspaceEnterpriseDeploymentInsight[];
};

export type AdminWorkspaceEnterpriseIntegrationInsight = {
  requestRef: string;
  workspaceRef: string;
  workspaceName: string;
  packageTier: WorkspacePackageTier;
  packageName: string;
  category: WorkspaceEnterpriseIntegrationCategory;
  status: WorkspaceEnterpriseIntegrationStatus;
  priority: WorkspaceEnterpriseIntegrationPriority;
  title: string;
  requestedProviderLabel?: string;
  requestedProviderHostname?: string;
  dataSensitivityFlags: WorkspaceEnterpriseIntegrationDataSensitivityFlag[];
  securityReviewRequired: boolean;
  legalSlaDependency: boolean;
  estimatedComplexity: WorkspaceEnterpriseIntegrationComplexity;
  workspaceVisibleNote?: string;
  adminNoteSummary?: string;
  adminStatusReason?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type AdminWorkspaceEnterpriseIntegrationOverview = {
  totalRequests: number;
  enterpriseWorkspaceRequests: number;
  requestedRequests: number;
  triageRequests: number;
  scopingRequests: number;
  approvedForBuildRequests: number;
  blockedRequests: number;
  completedRequests: number;
  rejectedRequests: number;
  customReviewRequests: number;
  securityReviewRequired: number;
  legalSlaDependencies: number;
  integrationOpsUpdatedAt: IsoDateString;
  latestRequests: AdminWorkspaceEnterpriseIntegrationInsight[];
};

export type AdminWorkspaceEnterpriseIntegrationFilter =
  | "all"
  | WorkspaceEnterpriseIntegrationCategory
  | WorkspaceEnterpriseIntegrationStatus
  | WorkspaceEnterpriseIntegrationPriority
  | "security_review"
  | "legal_sla";

export type AdminWorkspaceEnterpriseIntegrationAction =
  | "mark_triage"
  | "mark_scoping"
  | "mark_approved_for_build"
  | "mark_blocked"
  | "mark_completed"
  | "mark_rejected"
  | "mark_custom_review"
  | "mark_security_review"
  | "mark_legal_sla_review";

export type AdminWorkspaceEnterpriseIntegrationOpsPatchPayload = {
  requestRef: string;
  action: AdminWorkspaceEnterpriseIntegrationAction;
  adminNote?: string;
  workspaceVisibleNote?: string;
  statusReason?: string;
};

export type AdminWorkspaceEnterpriseIntegrationOpsResponse = {
  ok: true;
  source: "firestore";
  warnings: string[];
  overview: AdminWorkspaceEnterpriseIntegrationOverview;
};

export type AdminWorkspaceEnterpriseIntegrationOpsUpdateResponse = {
  ok: true;
  request: AdminWorkspaceEnterpriseIntegrationInsight;
  message: string;
};

export type AdminWorkspaceEnterpriseDeploymentFilter =
  | "all"
  | "enterprise"
  | "requested"
  | "scoping"
  | "security_review"
  | "ready_for_contract"
  | "active"
  | "blocked"
  | "custom_review";

export type AdminWorkspaceEnterpriseDeploymentAction =
  | "mark_requested"
  | "mark_scoping"
  | "mark_security_review"
  | "mark_ready_for_contract"
  | "mark_active"
  | "mark_blocked"
  | "mark_custom_review";

export type AdminWorkspaceEnterpriseDeploymentOpsPatchPayload = {
  workspaceRef: string;
  action: AdminWorkspaceEnterpriseDeploymentAction;
  adminNote?: string;
  statusReason?: string;
};

export type AdminWorkspaceEnterpriseDeploymentOpsUpdateResponse = {
  ok: true;
  workspace: AdminWorkspaceEnterpriseDeploymentInsight;
  message: string;
};

export type AdminWorkspaceBrandingDomainFilter =
  | "all"
  | "requested"
  | "dns_pending"
  | "verifying"
  | "active"
  | "blocked"
  | "custom_review";

export type AdminWorkspaceBrandingDomainAction =
  | "mark_requested"
  | "mark_dns_pending"
  | "mark_verifying"
  | "mark_active"
  | "mark_blocked"
  | "mark_custom_review";

export type AdminWorkspaceBrandingDomainOpsPatchPayload = {
  workspaceRef: string;
  action: AdminWorkspaceBrandingDomainAction;
  adminNote?: string;
  statusReason?: string;
  requestedDomainHostname?: string;
};

export type AdminWorkspaceBrandingDomainOpsUpdateResponse = {
  ok: true;
  workspace: AdminWorkspaceBrandingInsight;
  message: string;
};

export type AdminWorkspacePackageLicenceFilter =
  | "all"
  | "active"
  | "due_soon"
  | "overdue"
  | "suspended"
  | "custom_review";

export type AdminWorkspacePackageLicenceAction =
  | "mark_maintenance_active"
  | "mark_maintenance_waived"
  | "mark_custom_review"
  | "mark_suspended";

export type AdminWorkspacePackageLicenceOpsPatchPayload = {
  workspaceRef: string;
  action: AdminWorkspacePackageLicenceAction;
  adminNote?: string;
  statusReason?: string;
};

export type AdminWorkspacePackageLicenceOpsUpdateResponse = {
  ok: true;
  workspace: AdminWorkspacePackageInsight;
  message: string;
};
