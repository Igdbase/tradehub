import type {
  AdminApplicationFilters,
  AdminApplicationPatch,
  AdminAuditEvent,
  AdminDataSource,
  AdminOverviewPayload,
  PlatformSummary
} from "@/types/admin-api";
import type { WorkspaceApplication } from "@/types/tradehub";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";

export type ApplicationListResult = {
  source: AdminDataSource;
  warnings: string[];
  applications: WorkspaceApplication[];
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type AuditLogResult = {
  source: AdminDataSource;
  warnings: string[];
  events: AdminAuditEvent[];
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type ApplicationUpdateResult = {
  source: AdminDataSource;
  warnings: string[];
  application: WorkspaceApplication;
  auditEvent?: AdminAuditEvent;
};

export type AdminRepository = {
  source: AdminDataSource;
  getOverview(): Promise<AdminOverviewPayload & { warnings: string[] }>;
  listApplications(filters: AdminApplicationFilters): Promise<ApplicationListResult>;
  getApplication(applicationId: string): Promise<WorkspaceApplication | null>;
  createApplication(application: WorkspaceApplication): Promise<WorkspaceApplication>;
  updateApplication(
    applicationId: string,
    patch: AdminApplicationPatch,
    actor: VerifiedSuperAdmin
  ): Promise<ApplicationUpdateResult>;
  listAuditEvents(limit: number, cursor?: string): Promise<AuditLogResult>;
};

export function createEmptyPlatformSummary(): PlatformSummary {
  return {
    activeWorkspaceCount: 0,
    activeStudentCount: 0,
    monthlyGrossRevenueNgn: 0,
    monthlyPlatformRevenueNgn: 0,
    paystackVolumeNgn: 0,
    solanaVolumeUsdc: 0,
    openDisputeCount: 0,
    pendingApplicationCount: 0,
    riskFlagCount: 0,
    updatedAt: new Date().toISOString()
  };
}
