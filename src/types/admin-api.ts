import type {
  ApplicationSource,
  ApplicationStatus,
  Dispute,
  PrimaryPlatform,
  ProductOffering,
  RiskFlag,
  SetupFeeStatus,
  VettingOutcome,
  WorkspaceApplication
} from "@/types/tradehub";
import type {
  AdminWorkspaceBrandingOverview,
  AdminWorkspaceEnterpriseDeploymentOverview,
  AdminWorkspaceEnterpriseIntegrationOverview,
  AdminWorkspacePackageOverview
} from "@/types/workspace-package";

export type AdminDataSource = "firestore" | "mock_fallback";

export type AdminSourceMeta = {
  source: AdminDataSource;
  sourceLabel: string;
  sourceMessage: string;
  warnings: string[];
};

export type PlatformSummary = {
  activeWorkspaceCount: number;
  activeStudentCount: number;
  monthlyGrossRevenueNgn: number;
  monthlyPlatformRevenueNgn: number;
  paystackVolumeNgn: number;
  solanaVolumeUsdc: number;
  openDisputeCount: number;
  pendingApplicationCount: number;
  riskFlagCount: number;
  latestSignalAt?: string;
  updatedAt: string;
};

export type AdminAuditTargetType =
  | "workspace_application"
  | "workspace"
  | "payment_intent"
  | "solana_settlement"
  | "subscription"
  | "paystack_webhook"
  | "summary"
  | "risk_flag"
  | "dispute";

export type AdminAuditEvent = {
  eventId: string;
  actorUid: string;
  actorEmail?: string;
  action: string;
  targetType: AdminAuditTargetType;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
};

export type AdminOverviewPayload = {
  summary: PlatformSummary;
  workspacePackages: AdminWorkspacePackageOverview;
  workspaceBranding: AdminWorkspaceBrandingOverview;
  workspaceEnterpriseDeployment: AdminWorkspaceEnterpriseDeploymentOverview;
  workspaceEnterpriseIntegrations: AdminWorkspaceEnterpriseIntegrationOverview;
  paymentRails: {
    paystack: {
      volumeNgn: number;
      verifiedCount: number;
      label: string;
    };
    solana: {
      volumeUsdc: number;
      verifiedCount: number;
      label: string;
    };
  };
  disputes: Dispute[];
  riskFlags: RiskFlag[];
  recentApplications: WorkspaceApplication[];
};

export type AdminOverviewResponse = AdminSourceMeta & AdminOverviewPayload;

export type AdminApplicationFilters = {
  status?: ApplicationStatus | "all";
  q?: string;
  source?: ApplicationSource | "all";
  market?: WorkspaceApplication["market"] | "all";
  solana?: "all" | "interested" | "not_interested";
  limit: number;
  cursor?: string;
};

export type AdminApplicationListResponse = AdminSourceMeta & {
  applications: WorkspaceApplication[];
  pageInfo: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
    totalLoaded: number;
  };
};

export type AdminApplicationPatch = Partial<{
  status: ApplicationStatus;
  vettingOutcome: VettingOutcome;
  vettingNotes: string;
  setupFeeStatus: SetupFeeStatus;
  workspaceCreationStatus: WorkspaceApplication["workspaceCreationStatus"];
  workspaceId: string;
  firstPayingStudentAt: string;
}>;

export type AdminApplicationUpdateResponse = AdminSourceMeta & {
  application: WorkspaceApplication;
  auditEvent?: AdminAuditEvent;
};

export type AdminAuditLogResponse = AdminSourceMeta & {
  events: AdminAuditEvent[];
  pageInfo: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type PublicApplicationPayload = {
  fullName: string;
  email: string;
  primaryPlatform: PrimaryPlatform | "";
  handle: string;
  audienceSize: string | number;
  market: WorkspaceApplication["market"] | "";
  studentAccountMix: WorkspaceApplication["studentAccountMix"] | "";
  monetizationMethod: string;
  productOfferings: ProductOffering[];
  currentCustomerCount?: string | number;
  solanaPayInterest?: boolean;
  notes: string;
  noResultsPromiseAccepted: boolean;
  companyWebsite?: string;
};

export type PublicApplicationReceipt = {
  applicationId: string;
  name: string;
  email: string;
  primaryPlatform?: PrimaryPlatform;
  handleOrChannel: string;
  audienceSize: number;
  market: WorkspaceApplication["market"];
  studentAccountMix: WorkspaceApplication["studentAccountMix"];
  monetizationMethod: string;
  productOfferings?: ProductOffering[];
  currentCustomerCount?: number;
  solanaPayInterest?: boolean;
  noResultsPromiseAccepted: boolean;
  notes: string;
  status: ApplicationStatus;
  source: ApplicationSource;
  workspaceCreationStatus: WorkspaceApplication["workspaceCreationStatus"];
  createdAt: string;
  persisted: boolean;
};

export type PublicApplicationResponse = {
  ok: true;
  source: AdminDataSource;
  persisted: boolean;
  message: string;
  application: PublicApplicationReceipt;
};

export type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};
