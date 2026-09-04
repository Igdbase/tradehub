import { createHash } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { mapWorkspaceRecord } from "@/lib/workspace/onboarding-mappers";
import {
  deriveWorkspaceBrandingReadiness,
  sanitizeWorkspaceDomainHostname,
  toAdminWorkspaceBrandingInsight
} from "@/lib/workspace/workspace-branding-readiness";
import {
  deriveWorkspacePackageStatus,
  maskedWorkspaceRef,
  sanitizeWorkspacePackageAdminText
} from "@/lib/workspace/workspace-package-licence";
import type { Workspace } from "@/types/workspace";
import type {
  AdminWorkspaceBrandingDomainAction,
  AdminWorkspaceBrandingDomainOpsPatchPayload,
  AdminWorkspaceBrandingDomainOpsUpdateResponse,
  WorkspaceCustomDomainStatus,
  WorkspaceDnsChecklistStatus
} from "@/types/workspace-package";

const BRANDING_OPS_WORKSPACE_SCAN_LIMIT = 100;
const BRANDING_OPS_ACTIVE_STUDENT_LIMIT = 501;
const brandingActions: AdminWorkspaceBrandingDomainAction[] = [
  "mark_requested",
  "mark_dns_pending",
  "mark_verifying",
  "mark_active",
  "mark_blocked",
  "mark_custom_review"
];

type WorkspaceResolution = {
  workspace: Workspace;
  docRef: DocumentReference;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function maskedActorRef(actor: VerifiedSuperAdmin) {
  return `admin_${createHash("sha256").update(actor.uid).digest("hex").slice(0, 10)}`;
}

function parseWorkspaceBrandingDomainOpsPayload(
  payload: unknown
): AdminWorkspaceBrandingDomainOpsPatchPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_branding_domain_payload", "Send a valid branding/domain ops payload.");
  }

  const workspaceRef = typeof payload.workspaceRef === "string" ? payload.workspaceRef.trim() : "";
  const action = typeof payload.action === "string" ? payload.action : "";
  const requestedDomainHostname = sanitizeWorkspaceDomainHostname(payload.requestedDomainHostname);

  if (!/^workspace_[a-f0-9]{10}$/.test(workspaceRef)) {
    throw new AdminApiError(400, "invalid_workspace_ref", "Choose a valid masked workspace reference.");
  }

  if (!brandingActions.includes(action as AdminWorkspaceBrandingDomainAction)) {
    throw new AdminApiError(400, "invalid_branding_domain_action", "Choose a valid branding/domain action.");
  }

  if (payload.requestedDomainHostname && !requestedDomainHostname) {
    throw new AdminApiError(400, "invalid_domain_hostname", "Use a valid public domain hostname for custom domain metadata.");
  }

  return {
    workspaceRef,
    action: action as AdminWorkspaceBrandingDomainAction,
    adminNote: sanitizeWorkspacePackageAdminText(payload.adminNote, 500),
    statusReason: sanitizeWorkspacePackageAdminText(payload.statusReason, 240),
    requestedDomainHostname
  };
}

async function countActiveStudents(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students`)
    .where("status", "==", "active")
    .limit(BRANDING_OPS_ACTIVE_STUDENT_LIMIT)
    .get();

  return snapshot.docs.length;
}

async function resolveWorkspaceByMaskedRef(workspaceRef: string): Promise<WorkspaceResolution> {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection("workspaces")
    .orderBy("updatedAt", "desc")
    .limit(BRANDING_OPS_WORKSPACE_SCAN_LIMIT)
    .get();

  for (const doc of snapshot.docs) {
    const workspace = mapWorkspaceRecord(
      {
        ...doc.data(),
        workspaceId: doc.data().workspaceId ?? doc.id
      },
      doc.id
    );

    if (maskedWorkspaceRef(workspace.workspaceId) === workspaceRef) {
      return {
        workspace,
        docRef: doc.ref
      };
    }
  }

  throw new AdminApiError(
    404,
    "workspace_ref_not_found",
    "That masked workspace reference was not found in the bounded branding/domain ops window."
  );
}

function domainStatusForAction(action: AdminWorkspaceBrandingDomainAction): WorkspaceCustomDomainStatus {
  if (action === "mark_requested") {
    return "requested";
  }

  if (action === "mark_dns_pending") {
    return "dns_pending";
  }

  if (action === "mark_verifying") {
    return "verifying";
  }

  if (action === "mark_active") {
    return "active";
  }

  if (action === "mark_blocked") {
    return "blocked";
  }

  return "custom_review";
}

function dnsStatusForDomainStatus(status: WorkspaceCustomDomainStatus): WorkspaceDnsChecklistStatus {
  if (status === "active") {
    return "passed";
  }

  if (status === "blocked") {
    return "failed";
  }

  if (status === "custom_review") {
    return "custom_review";
  }

  if (status === "requested" || status === "dns_pending" || status === "verifying") {
    return "pending";
  }

  return "not_started";
}

function messageForAction(action: AdminWorkspaceBrandingDomainAction) {
  if (action === "mark_requested") {
    return "Workspace domain request recorded as metadata only.";
  }

  if (action === "mark_dns_pending") {
    return "Workspace domain marked DNS pending. No DNS automation was performed.";
  }

  if (action === "mark_verifying") {
    return "Workspace domain marked verifying. No provider call was made.";
  }

  if (action === "mark_active") {
    return "Workspace domain marked active in admin metadata only.";
  }

  if (action === "mark_blocked") {
    return "Workspace domain marked blocked for support review.";
  }

  return "Workspace branding/domain moved to custom review.";
}

export async function updateWorkspaceBrandingDomainOps({
  actor,
  payload
}: {
  actor: VerifiedSuperAdmin;
  payload: unknown;
}): Promise<AdminWorkspaceBrandingDomainOpsUpdateResponse> {
  const parsed = parseWorkspaceBrandingDomainOpsPayload(payload);
  const { workspace, docRef } = await resolveWorkspaceByMaskedRef(parsed.workspaceRef);
  const now = new Date().toISOString();
  const customDomainStatus = domainStatusForAction(parsed.action);
  const nextBranding = {
    ...workspace.branding,
    customDomainStatus,
    requestedDomainHostname: parsed.requestedDomainHostname ?? workspace.branding?.requestedDomainHostname,
    dnsChecklistStatus: dnsStatusForDomainStatus(customDomainStatus),
    adminReviewNote: parsed.adminNote ?? workspace.branding?.adminReviewNote,
    adminStatusReason: parsed.statusReason ?? parsed.adminNote ?? workspace.branding?.adminStatusReason,
    updatedAt: now
  };
  const activeStudentCount = await countActiveStudents(workspace.workspaceId);
  const packageStatus = deriveWorkspacePackageStatus({
    workspace,
    activeStudentCount
  });
  const { db } = getFirebaseAdminClients();

  await docRef.set(
    {
      branding: nextBranding,
      updatedAt: now
    },
    { merge: true }
  );

  await db.collection(`workspaces/${workspace.workspaceId}/branding_domain_ops`).doc().set({
    workspaceRef: parsed.workspaceRef,
    actorRef: maskedActorRef(actor),
    action: parsed.action,
    customDomainStatus,
    requestedDomainHostname: nextBranding.requestedDomainHostname,
    adminNoteSummary: parsed.adminNote,
    statusReason: parsed.statusReason,
    createdAt: now
  });

  const brandingReadiness = deriveWorkspaceBrandingReadiness({
    workspace: {
      ...workspace,
      branding: nextBranding,
      updatedAt: now
    },
    packageStatus
  });
  const workspaceInsight = toAdminWorkspaceBrandingInsight({
    workspace,
    packageStatus,
    brandingReadiness
  });

  return {
    ok: true,
    workspace: workspaceInsight,
    message: messageForAction(parsed.action)
  };
}
