import type {
  WorkspaceBrandingMode,
  WorkspaceCustomDomainStatus,
  WorkspaceDnsChecklistStatus,
  WorkspaceEnterpriseBackupRestoreStatus,
  WorkspaceEnterpriseDeploymentMode,
  WorkspaceEnterpriseDeploymentStatus,
  WorkspaceEnterpriseSlaStatus,
  WorkspacePackageLicenseRecord,
  WorkspaceStudentBrandVisibilityStatus
} from "@/types/workspace-package";

export type IsoDateString = string;

export type WorkspaceStatus = "pending" | "approved" | "rejected" | "suspended";

export type WorkspaceFeatureKey =
  | "course"
  | "signalAlerts"
  | "autoCopy"
  | "journal"
  | "tagging"
  | "calculators"
  | "aiInsights";

export type PaymentRail = "paystack" | "solana";

export type PaymentRailStatus =
  | "enabled"
  | "disabled"
  | "pending_verification"
  | "partner_only";

export type BillingPeriod = "monthly" | "annual";

export interface WorkspaceBranding {
  logoMark: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  heroLabel: string;
  telegramBotHandle?: string;
  brandingMode?: WorkspaceBrandingMode;
  displayName?: string;
  studentFacingBrandVisibilityStatus?: WorkspaceStudentBrandVisibilityStatus;
  customDomainStatus?: WorkspaceCustomDomainStatus;
  requestedDomainHostname?: string;
  dnsChecklistStatus?: WorkspaceDnsChecklistStatus;
  adminReviewNote?: string;
  adminStatusReason?: string;
  updatedAt?: IsoDateString;
}

export interface WorkspaceTier {
  tierId: string;
  name: string;
  description: string;
  priceNgn: number;
  billingPeriod: BillingPeriod;
  features: WorkspaceFeatureKey[];
  featured?: boolean;
  paystackPlanCode?: string;
}

export interface WorkspaceSettings {
  singleTier: boolean;
  freeTrialDays: 0 | 3 | 7 | 14;
  noCardRequired: boolean;
  refundPolicy: string;
}

export interface WorkspaceEnterpriseDeployment {
  deploymentMode?: WorkspaceEnterpriseDeploymentMode;
  deploymentStatus?: WorkspaceEnterpriseDeploymentStatus;
  slaStatus?: WorkspaceEnterpriseSlaStatus;
  backupRestoreStatus?: WorkspaceEnterpriseBackupRestoreStatus;
  dataResidencyStatus?: "not_requested" | "requested" | "custom_review";
  adminReviewNote?: string;
  adminStatusReason?: string;
  updatedAt?: IsoDateString;
}

export interface WorkspaceRailConfig {
  rail: PaymentRail;
  status: PaymentRailStatus;
  label: string;
  settlementNote: string;
}

export interface Workspace {
  workspaceId: string;
  handle: string;
  name: string;
  ownerId: string;
  ownerEmail?: string;
  ownerDisplayName: string;
  summary: string;
  marketFocus: "forex" | "crypto" | "both";
  branding: WorkspaceBranding;
  tiers: WorkspaceTier[];
  settings: WorkspaceSettings;
  rails: WorkspaceRailConfig[];
  vettingStatus: WorkspaceStatus;
  paystackSubaccountCode?: string;
  paystackSplitCode?: string;
  solanaPayEnabled: boolean;
  solanaPayoutWallet?: string;
  solanaPartnerPlacementEnabled: boolean;
  platformSplitPercent: number;
  packageLicense?: WorkspacePackageLicenseRecord;
  enterpriseDeployment?: WorkspaceEnterpriseDeployment;
  codeOfConductAcceptedAt?: IsoDateString;
  riskDisclosureVersion: string;
  createdAt: IsoDateString;
  updatedAt?: IsoDateString;
  activatedAt?: IsoDateString;
}
