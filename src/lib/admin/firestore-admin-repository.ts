import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { DocumentData, DocumentSnapshot, Query } from "firebase-admin/firestore";
import {
  mapApplicationRecord,
  mapAuditEventRecord,
  mapPlatformSummaryRecord
} from "@/lib/admin/admin-mappers";
import { mapWorkspaceRecord } from "@/lib/workspace/onboarding-mappers";
import {
  deriveWorkspacePackageStatus,
  summarizeAdminWorkspacePackages,
  toAdminWorkspacePackageInsight
} from "@/lib/workspace/workspace-package-licence";
import {
  deriveWorkspaceBrandingReadiness,
  summarizeAdminWorkspaceBranding,
  toAdminWorkspaceBrandingInsight
} from "@/lib/workspace/workspace-branding-readiness";
import {
  deriveWorkspaceEnterpriseDeploymentReadiness,
  summarizeAdminWorkspaceEnterpriseDeployment,
  toAdminWorkspaceEnterpriseDeploymentInsight
} from "@/lib/workspace/workspace-enterprise-readiness";
import { buildAdminWorkspaceEnterpriseIntegrationOverview } from "@/lib/workspace/workspace-enterprise-integration-requests";
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

const ADMIN_PACKAGE_WORKSPACE_LIMIT = 50;
const ADMIN_PACKAGE_STUDENT_COUNT_LIMIT = 501;

function recordFromSnapshot(
  snapshot: DocumentSnapshot<DocumentData>
) {
  const data = snapshot.data() ?? {};
  return {
    ...data,
    applicationId: data.applicationId ?? snapshot.id,
    eventId: data.eventId ?? snapshot.id
  };
}

function applyLoadedFilters(
  applications: WorkspaceApplication[],
  filters: AdminApplicationFilters
) {
  const q = filters.q?.toLowerCase().trim();

  return applications.filter((application) => {
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

function buildAuditEvent(
  applicationId: string,
  actor: VerifiedSuperAdmin,
  before: WorkspaceApplication,
  after: WorkspaceApplication,
  patch: AdminApplicationPatch
): AdminAuditEvent {
  return {
    eventId: `audit_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "application.update",
    targetType: "workspace_application",
    targetId: applicationId,
    before: { ...before } as Record<string, unknown>,
    after: { ...patch } as Record<string, unknown>,
    createdAt: new Date().toISOString()
  };
}

async function countActiveStudentsForPackage(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students`)
    .where("status", "==", "active")
    .limit(ADMIN_PACKAGE_STUDENT_COUNT_LIMIT)
    .get();

  return snapshot.docs.length;
}

async function buildWorkspacePackageOverview() {
  const { db } = getFirebaseAdminClients();
  const workspaceSnapshot = await db
    .collection("workspaces")
    .orderBy("updatedAt", "desc")
    .limit(ADMIN_PACKAGE_WORKSPACE_LIMIT)
    .get();
  const insights = await Promise.all(
    workspaceSnapshot.docs.map(async (doc) => {
      const workspace = mapWorkspaceRecord(
        {
          ...doc.data(),
          workspaceId: doc.data().workspaceId ?? doc.id
        },
        doc.id
      );
      const activeStudentCount = await countActiveStudentsForPackage(workspace.workspaceId);
      const packageStatus = deriveWorkspacePackageStatus({
        workspace,
        activeStudentCount
      });

      return toAdminWorkspacePackageInsight({
        workspace,
        packageStatus
      });
    })
  );

  return {
    packageOverview: summarizeAdminWorkspacePackages(insights),
    capped: workspaceSnapshot.docs.length === ADMIN_PACKAGE_WORKSPACE_LIMIT
  };
}

async function buildWorkspaceBrandingOverview() {
  const { db } = getFirebaseAdminClients();
  const workspaceSnapshot = await db
    .collection("workspaces")
    .orderBy("updatedAt", "desc")
    .limit(ADMIN_PACKAGE_WORKSPACE_LIMIT)
    .get();
  const insights = await Promise.all(
    workspaceSnapshot.docs.map(async (doc) => {
      const workspace = mapWorkspaceRecord(
        {
          ...doc.data(),
          workspaceId: doc.data().workspaceId ?? doc.id
        },
        doc.id
      );
      const activeStudentCount = await countActiveStudentsForPackage(workspace.workspaceId);
      const packageStatus = deriveWorkspacePackageStatus({
        workspace,
        activeStudentCount
      });
      const brandingReadiness = deriveWorkspaceBrandingReadiness({
        workspace,
        packageStatus
      });

      return toAdminWorkspaceBrandingInsight({
        workspace,
        packageStatus,
        brandingReadiness
      });
    })
  );

  return {
    brandingOverview: summarizeAdminWorkspaceBranding(insights),
    capped: workspaceSnapshot.docs.length === ADMIN_PACKAGE_WORKSPACE_LIMIT
  };
}

async function buildWorkspaceEnterpriseDeploymentOverview() {
  const { db } = getFirebaseAdminClients();
  const workspaceSnapshot = await db
    .collection("workspaces")
    .orderBy("updatedAt", "desc")
    .limit(ADMIN_PACKAGE_WORKSPACE_LIMIT)
    .get();
  const insights = await Promise.all(
    workspaceSnapshot.docs.map(async (doc) => {
      const workspace = mapWorkspaceRecord(
        {
          ...doc.data(),
          workspaceId: doc.data().workspaceId ?? doc.id
        },
        doc.id
      );
      const activeStudentCount = await countActiveStudentsForPackage(workspace.workspaceId);
      const packageStatus = deriveWorkspacePackageStatus({
        workspace,
        activeStudentCount
      });
      const enterpriseReadiness = deriveWorkspaceEnterpriseDeploymentReadiness({
        workspace,
        packageStatus
      });

      return toAdminWorkspaceEnterpriseDeploymentInsight({
        workspace,
        packageStatus,
        enterpriseReadiness
      });
    })
  );

  return {
    enterpriseOverview: summarizeAdminWorkspaceEnterpriseDeployment(insights),
    capped: workspaceSnapshot.docs.length === ADMIN_PACKAGE_WORKSPACE_LIMIT
  };
}

export function createFirestoreAdminRepository(): AdminRepository {
  const { db } = getFirebaseAdminClients();

  return {
    source: "firestore",

    async getOverview() {
      const summarySnapshot = await db.doc("platform_summaries/current").get();
      const warnings: string[] = [];
      const workspacePackageResult = await buildWorkspacePackageOverview();
      const workspaceBrandingResult = await buildWorkspaceBrandingOverview();
      const workspaceEnterpriseResult = await buildWorkspaceEnterpriseDeploymentOverview();
      const workspaceEnterpriseIntegrationResult = await buildAdminWorkspaceEnterpriseIntegrationOverview();

      if (!summarySnapshot.exists) {
        warnings.push(
          "platform_summaries/current is missing, so dashboard totals are shown as zero instead of scanning raw collections."
        );
      }

      if (workspacePackageResult.capped) {
        warnings.push(
          "Workspace package overview is bounded to the latest workspace window and uses support-safe package/student counts only."
        );
      }

      if (workspaceBrandingResult.capped) {
        warnings.push(
          "Workspace branding/domain overview is bounded to the latest workspace window and uses masked workspace references only."
        );
      }

      if (workspaceEnterpriseResult.capped) {
        warnings.push(
          "Workspace Enterprise deployment/SLA overview is bounded to the latest workspace window and uses masked workspace references only."
        );
      }

      if (workspaceEnterpriseIntegrationResult.capped) {
        warnings.push(
          "Workspace Enterprise integration request queue is bounded to the latest workspace/request window and uses masked workspace references only."
        );
      }

      const applicationsSnapshot = await db
        .collection("workspace_applications")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

      const recentApplications = applicationsSnapshot.docs.map((doc) =>
        mapApplicationRecord(recordFromSnapshot(doc))
      );
      const summary = mapPlatformSummaryRecord(summarySnapshot.data() ?? null);

      return {
        warnings,
        summary,
        workspacePackages: workspacePackageResult.packageOverview,
        workspaceBranding: workspaceBrandingResult.brandingOverview,
        workspaceEnterpriseDeployment: workspaceEnterpriseResult.enterpriseOverview,
        workspaceEnterpriseIntegrations: workspaceEnterpriseIntegrationResult.overview,
        paymentRails: {
          paystack: {
            volumeNgn: summary.paystackVolumeNgn,
            verifiedCount: 0,
            label: "Paystack local checkout"
          },
          solana: {
            volumeUsdc: summary.solanaVolumeUsdc,
            verifiedCount: 0,
            label: "Optional Solana Pay / USDC"
          }
        },
        disputes: [],
        riskFlags: [],
        recentApplications
      } satisfies AdminOverviewPayload & { warnings: string[] };
    },

    async listApplications(filters) {
      let query: Query<DocumentData> = db
        .collection("workspace_applications");

      if (filters.status && filters.status !== "all") {
        query = query.where("status", "==", filters.status);
      }

      if (filters.source && filters.source !== "all") {
        query = query.where("source", "==", filters.source);
      }

      query = query.orderBy("createdAt", "desc");

      if (filters.cursor) {
        query = query.startAfter(filters.cursor);
      }

      const snapshot = await query.limit(filters.limit).get();
      const loaded = snapshot.docs.map((doc) => mapApplicationRecord(recordFromSnapshot(doc)));
      const applications = applyLoadedFilters(loaded, filters);
      const nextCursor =
        snapshot.docs.length === filters.limit
          ? mapApplicationRecord(recordFromSnapshot(snapshot.docs[snapshot.docs.length - 1])).createdAt
          : null;
      const warnings: string[] = [];

      if (filters.q || (filters.market && filters.market !== "all") || filters.solana !== "all") {
        warnings.push(
          "Search, market, and Solana filters are applied to the limited page because full-text search is not configured yet."
        );
      }

      return {
        source: "firestore",
        warnings,
        applications,
        limit: filters.limit,
        nextCursor,
        hasMore: Boolean(nextCursor)
      };
    },

    async getApplication(applicationId) {
      const snapshot = await db.doc(`workspace_applications/${applicationId}`).get();

      if (!snapshot.exists) {
        return null;
      }

      return mapApplicationRecord(recordFromSnapshot(snapshot));
    },

    async createApplication(application) {
      await db.doc(`workspace_applications/${application.applicationId}`).set(application, {
        merge: false
      });

      return application;
    },

    async updateApplication(applicationId, patch, actor) {
      const docRef = db.doc(`workspace_applications/${applicationId}`);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        throw new AdminApiError(404, "application_not_found", "That application was not found.");
      }

      const current = mapApplicationRecord(recordFromSnapshot(snapshot));
      const updated = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString()
      };
      const auditEvent = buildAuditEvent(applicationId, actor, current, updated, patch);
      const batch = db.batch();

      batch.update(docRef, {
        ...patch,
        updatedAt: updated.updatedAt
      });
      batch.set(db.doc(`audit_log/${auditEvent.eventId}`), auditEvent);
      await batch.commit();

      return {
        source: "firestore",
        warnings: [],
        application: updated,
        auditEvent
      };
    },

    async listAuditEvents(limit, cursor) {
      let query: Query<DocumentData> = db
        .collection("audit_log")
        .orderBy("createdAt", "desc");

      if (cursor) {
        query = query.startAfter(cursor);
      }

      const snapshot = await query.limit(limit).get();
      const events = snapshot.docs.map((doc) => mapAuditEventRecord(recordFromSnapshot(doc)));
      const nextCursor =
        snapshot.docs.length === limit
          ? mapAuditEventRecord(recordFromSnapshot(snapshot.docs[snapshot.docs.length - 1])).createdAt
          : null;

      return {
        source: "firestore",
        warnings: [],
        events,
        limit,
        nextCursor,
        hasMore: Boolean(nextCursor)
      };
    }
  };
}
