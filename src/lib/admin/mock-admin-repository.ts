import { mockApplications, mockAuditEvents, mockDisputes, mockRiskFlags, mockSignals } from "@/data";
import {
  getPaymentRailTotals,
  getPlatformOverview
} from "@/lib/mock-selectors";
import {
  mapLegacyAuditEvent
} from "@/lib/admin/admin-mappers";
import type {
  AdminApplicationFilters,
  AdminApplicationPatch,
  AdminAuditEvent,
  AdminOverviewPayload
} from "@/types/admin-api";
import type { AdminRepository } from "@/lib/admin/admin-repository";
import type { WorkspaceApplication } from "@/types/tradehub";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import { AdminApiError } from "@/lib/firebase/admin-errors";

const fallbackWarnings = [
  "Firebase Admin SDK credentials are not configured, so this response uses Stage 03 mock data."
];

function sortApplications(applications: WorkspaceApplication[]) {
  return applications
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function filterApplications(applications: WorkspaceApplication[], filters: AdminApplicationFilters) {
  const q = filters.q?.toLowerCase().trim();

  return applications.filter((application) => {
    if (filters.status && filters.status !== "all" && application.status !== filters.status) {
      return false;
    }

    if (filters.source && filters.source !== "all" && application.source !== filters.source) {
      return false;
    }

    if (filters.market && filters.market !== "all" && application.market !== filters.market) {
      return false;
    }

    if (filters.solana === "interested" && !application.solanaPayInterest) {
      return false;
    }

    if (filters.solana === "not_interested" && application.solanaPayInterest) {
      return false;
    }

    if (!q) {
      return true;
    }

    return [application.name, application.email, application.handleOrChannel]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

function createMockAuditEvent(
  applicationId: string,
  patch: AdminApplicationPatch,
  actor: VerifiedSuperAdmin
): AdminAuditEvent {
  return {
    eventId: `audit_mock_${Date.now().toString(36)}`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "application.update",
    targetType: "workspace_application",
    targetId: applicationId,
    after: patch,
    createdAt: new Date().toISOString()
  };
}

export function createMockAdminRepository(): AdminRepository {
  return {
    source: "mock_fallback",

    async getOverview() {
      const overview = getPlatformOverview();
      const paymentTotals = getPaymentRailTotals();
      const latestSignalAt = mockSignals
        .slice()
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0]?.timestamp;

      return {
        warnings: fallbackWarnings,
        summary: {
          activeWorkspaceCount: overview.activeWorkspaces,
          activeStudentCount: overview.activeSubscribers,
          monthlyGrossRevenueNgn: overview.monthlyRevenueNgn,
          monthlyPlatformRevenueNgn: overview.monthlyPlatformRevenueNgn,
          paystackVolumeNgn: paymentTotals.paystack.volumeNgn,
          solanaVolumeUsdc: paymentTotals.solana.volumeUsdc,
          openDisputeCount: overview.openDisputes,
          pendingApplicationCount: mockApplications.filter((application) =>
            ["new", "vetting", "approved"].includes(application.status)
          ).length,
          riskFlagCount: mockRiskFlags.length,
          latestSignalAt,
          updatedAt: new Date().toISOString()
        },
        workspacePackages: {
          totalWorkspaces: overview.activeWorkspaces,
          launchWorkspaces: Math.max(overview.activeWorkspaces - 1, 0),
          proWorkspaces: overview.activeWorkspaces > 0 ? 1 : 0,
          enterpriseWorkspaces: 0,
          activeLicenses: overview.activeWorkspaces,
          pendingLicenses: 0,
          expiredLicenses: 0,
          suspendedLicenses: 0,
          customReviewLicenses: 0,
          overLimitWorkspaces: 0,
          maintenanceActive: overview.activeWorkspaces,
          maintenanceDueSoon: 0,
          maintenanceOverdue: 0,
          maintenanceWaived: 0,
          supportLimited: 0,
          supportSuspended: 0,
          customReviewNeeded: 0,
          licenceOpsUpdatedAt: new Date().toISOString(),
          latestWorkspaces: [
            {
              workspaceRef: "workspace_mock_demo",
              workspaceName: "Mock workspace",
              packageTier: "launch",
              packageName: "Launch Workspace",
              licenseStatus: "active",
              activeStudentCount: Math.min(overview.activeSubscribers, 50),
              studentSeatCap: 50,
              remainingSeats: Math.max(0, 50 - Math.min(overview.activeSubscribers, 50)),
              overLimit: false,
              overLimitBy: 0,
              supportWindowState: "standard",
              maintenanceState: "current",
              licenseStartDate: new Date().toISOString(),
              licenseTermType: "lifetime",
              includedSupportWindowStart: new Date().toISOString(),
              includedSupportWindowEnd: new Date(Date.now() + 31536000000).toISOString(),
              maintenanceRenewalStatus: "active",
              maintenanceRenewalDueDate: new Date(Date.now() + 31536000000).toISOString(),
              supportStatus: "included",
              licenceHealth: "healthy",
              lastReviewedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        },
        workspaceBranding: {
          totalWorkspaces: overview.activeWorkspaces,
          tradehubBranded: Math.max(overview.activeWorkspaces - 1, 0),
          coBranded: overview.activeWorkspaces > 0 ? 1 : 0,
          whiteLabelReady: 0,
          requestedDomains: 0,
          dnsPendingDomains: 0,
          verifyingDomains: 0,
          activeDomains: 0,
          blockedDomains: 0,
          customReviewDomains: 0,
          brandingOpsUpdatedAt: new Date().toISOString(),
          latestWorkspaces: [
            {
              workspaceRef: "workspace_mock_demo",
              workspaceName: "Mock workspace",
              packageTier: "launch",
              packageName: "Launch Workspace",
              brandingMode: "co_branded",
              displayName: "Mock workspace",
              primaryColor: "locked_tradehub_surface",
              accentColor: "accent",
              studentFacingBrandVisibilityStatus: "co_brand_visible",
              customDomainStatus: "not_configured",
              dnsChecklistStatus: "not_started",
              dnsChecklistSummary: [
                "No custom domain is configured.",
                "The workspace remains on TradeHub-hosted student surfaces.",
                "Domain automation, DNS changes, and uploads are not enabled here."
              ],
              packageAvailabilityMessage:
                "Launch workspaces can use TradeHub-branded or light co-branded student-facing surfaces.",
              updatedAt: new Date().toISOString()
            }
          ]
        },
        workspaceEnterpriseDeployment: {
          totalWorkspaces: overview.activeWorkspaces,
          enterpriseWorkspaces: 0,
          requestedDeployments: 0,
          scopingDeployments: 0,
          securityReviewDeployments: 0,
          readyForContractDeployments: 0,
          activeDeployments: 0,
          blockedDeployments: 0,
          customReviewDeployments: 0,
          enterpriseSlaReady: 0,
          backupDocumented: 0,
          enterpriseOpsUpdatedAt: new Date().toISOString(),
          latestWorkspaces: [
            {
              workspaceRef: "workspace_mock_demo",
              workspaceName: "Mock workspace",
              packageTier: "launch",
              packageName: "Launch Workspace",
              deploymentMode: "shared_tradehub_cloud",
              deploymentStatus: "not_configured",
              slaStatus: "standard_support",
              backupRestoreStatus: "standard_platform",
              dataResidencyStatus: "not_requested",
              supportWindowLabel: "Standard package support applies. Enterprise SLA is not included.",
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
              packageAvailabilityMessage:
                "Launch workspaces use the standard TradeHub cloud. Enterprise deployment and SLA terms require an Enterprise agreement.",
              contractScopePrompt:
                "Enterprise deployment is not configured. Treat dedicated infrastructure and SLA terms as contact-sales only.",
              updatedAt: new Date().toISOString()
            }
          ]
        },
        workspaceEnterpriseIntegrations: {
          totalRequests: 0,
          enterpriseWorkspaceRequests: 0,
          requestedRequests: 0,
          triageRequests: 0,
          scopingRequests: 0,
          approvedForBuildRequests: 0,
          blockedRequests: 0,
          completedRequests: 0,
          rejectedRequests: 0,
          customReviewRequests: 0,
          securityReviewRequired: 0,
          legalSlaDependencies: 0,
          integrationOpsUpdatedAt: new Date().toISOString(),
          latestRequests: []
        },
        paymentRails: {
          paystack: {
            volumeNgn: paymentTotals.paystack.volumeNgn,
            verifiedCount: paymentTotals.paystack.verifiedCount,
            label: "Paystack local checkout"
          },
          solana: {
            volumeUsdc: paymentTotals.solana.volumeUsdc,
            verifiedCount: paymentTotals.solana.verifiedCount,
            label: "Optional Solana Pay / USDC"
          }
        },
        disputes: mockDisputes.filter((dispute) => dispute.status !== "resolved").slice(0, 5),
        riskFlags: mockRiskFlags.slice(0, 5),
        recentApplications: sortApplications(mockApplications).slice(0, 5)
      } satisfies AdminOverviewPayload & { warnings: string[] };
    },

    async listApplications(filters) {
      const filtered = filterApplications(sortApplications(mockApplications), filters);
      const startIndex = filters.cursor
        ? Math.max(
            0,
            filtered.findIndex((application) => application.createdAt === filters.cursor) + 1
          )
        : 0;
      const page = filtered.slice(startIndex, startIndex + filters.limit);
      const nextCursor = page.length === filters.limit ? page[page.length - 1]?.createdAt ?? null : null;

      return {
        source: "mock_fallback",
        warnings: fallbackWarnings,
        applications: page,
        limit: filters.limit,
        nextCursor,
        hasMore: Boolean(nextCursor)
      };
    },

    async getApplication(applicationId) {
      return mockApplications.find((application) => application.applicationId === applicationId) ?? null;
    },

    async createApplication(application) {
      return application;
    },

    async updateApplication(applicationId, patch, actor) {
      const current = mockApplications.find((application) => application.applicationId === applicationId);

      if (!current) {
        throw new AdminApiError(404, "application_not_found", "That application was not found.");
      }

      const updated = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString()
      };

      return {
        source: "mock_fallback",
        warnings: [
          ...fallbackWarnings,
          "The mock update is returned to the browser but is not persisted between requests."
        ],
        application: updated,
        auditEvent: createMockAuditEvent(applicationId, patch, actor)
      };
    },

    async listAuditEvents(limit, cursor) {
      const events = mockAuditEvents
        .map(mapLegacyAuditEvent)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const startIndex = cursor
        ? Math.max(
            0,
            events.findIndex((event) => event.createdAt === cursor) + 1
          )
        : 0;
      const page = events.slice(startIndex, startIndex + limit);
      const nextCursor = page.length === limit ? page[page.length - 1]?.createdAt ?? null : null;

      return {
        source: "mock_fallback",
        warnings: fallbackWarnings,
        events: page,
        limit,
        nextCursor,
        hasMore: Boolean(nextCursor)
      };
    }
  };
}
