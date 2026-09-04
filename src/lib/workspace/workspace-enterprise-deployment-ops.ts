import { createHash } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { mapWorkspaceRecord } from "@/lib/workspace/onboarding-mappers";
import {
  deriveWorkspaceEnterpriseDeploymentReadiness,
  toAdminWorkspaceEnterpriseDeploymentInsight
} from "@/lib/workspace/workspace-enterprise-readiness";
import {
  deriveWorkspacePackageStatus,
  maskedWorkspaceRef,
  sanitizeWorkspacePackageAdminText
} from "@/lib/workspace/workspace-package-licence";
import type { Workspace } from "@/types/workspace";
import type {
  AdminWorkspaceEnterpriseDeploymentAction,
  AdminWorkspaceEnterpriseDeploymentOpsPatchPayload,
  AdminWorkspaceEnterpriseDeploymentOpsUpdateResponse,
  WorkspaceEnterpriseBackupRestoreStatus,
  WorkspaceEnterpriseDeploymentMode,
  WorkspaceEnterpriseDeploymentStatus,
  WorkspaceEnterpriseSlaStatus,
  WorkspaceEnterpriseDeploymentReadiness
} from "@/types/workspace-package";

const ENTERPRISE_OPS_WORKSPACE_SCAN_LIMIT = 100;
const ENTERPRISE_OPS_ACTIVE_STUDENT_LIMIT = 501;
const enterpriseActions: AdminWorkspaceEnterpriseDeploymentAction[] = [
  "mark_requested",
  "mark_scoping",
  "mark_security_review",
  "mark_ready_for_contract",
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

function parseWorkspaceEnterpriseDeploymentOpsPayload(
  payload: unknown
): AdminWorkspaceEnterpriseDeploymentOpsPatchPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_enterprise_deployment_payload", "Send a valid Enterprise deployment ops payload.");
  }

  const workspaceRef = typeof payload.workspaceRef === "string" ? payload.workspaceRef.trim() : "";
  const action = typeof payload.action === "string" ? payload.action : "";

  if (!/^workspace_[a-f0-9]{10}$/.test(workspaceRef)) {
    throw new AdminApiError(400, "invalid_workspace_ref", "Choose a valid masked workspace reference.");
  }

  if (!enterpriseActions.includes(action as AdminWorkspaceEnterpriseDeploymentAction)) {
    throw new AdminApiError(400, "invalid_enterprise_deployment_action", "Choose a valid Enterprise deployment action.");
  }

  return {
    workspaceRef,
    action: action as AdminWorkspaceEnterpriseDeploymentAction,
    adminNote: sanitizeWorkspacePackageAdminText(payload.adminNote, 500),
    statusReason: sanitizeWorkspacePackageAdminText(payload.statusReason, 240)
  };
}

async function countActiveStudents(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students`)
    .where("status", "==", "active")
    .limit(ENTERPRISE_OPS_ACTIVE_STUDENT_LIMIT)
    .get();

  return snapshot.docs.length;
}

async function resolveWorkspaceByMaskedRef(workspaceRef: string): Promise<WorkspaceResolution> {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection("workspaces")
    .orderBy("updatedAt", "desc")
    .limit(ENTERPRISE_OPS_WORKSPACE_SCAN_LIMIT)
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
    "That masked workspace reference was not found in the bounded Enterprise deployment ops window."
  );
}

function deploymentStatusForAction(
  action: AdminWorkspaceEnterpriseDeploymentAction
): WorkspaceEnterpriseDeploymentStatus {
  if (action === "mark_requested") {
    return "requested";
  }

  if (action === "mark_scoping") {
    return "scoping";
  }

  if (action === "mark_security_review") {
    return "security_review";
  }

  if (action === "mark_ready_for_contract") {
    return "ready_for_contract";
  }

  if (action === "mark_active") {
    return "active";
  }

  if (action === "mark_blocked") {
    return "blocked";
  }

  return "custom_review";
}

function modeForStatus(status: WorkspaceEnterpriseDeploymentStatus): WorkspaceEnterpriseDeploymentMode {
  if (status === "active" || status === "ready_for_contract") {
    return "dedicated_deployment_ready";
  }

  if (status === "requested" || status === "scoping" || status === "security_review") {
    return "isolated_tenant_ready";
  }

  return "custom_contract";
}

function slaForStatus(status: WorkspaceEnterpriseDeploymentStatus): WorkspaceEnterpriseSlaStatus {
  if (status === "active" || status === "ready_for_contract") {
    return "enterprise_sla_ready";
  }

  if (status === "blocked") {
    return "support_limited";
  }

  return "custom_review";
}

function backupForStatus(status: WorkspaceEnterpriseDeploymentStatus): WorkspaceEnterpriseBackupRestoreStatus {
  if (status === "active" || status === "ready_for_contract") {
    return "documented";
  }

  if (status === "blocked") {
    return "not_configured";
  }

  return "custom_review";
}

function messageForAction(action: AdminWorkspaceEnterpriseDeploymentAction) {
  if (action === "mark_requested") {
    return "Enterprise deployment request recorded as metadata only.";
  }

  if (action === "mark_scoping") {
    return "Enterprise deployment moved to scoping. No infrastructure provider action was performed.";
  }

  if (action === "mark_security_review") {
    return "Enterprise deployment moved to security review. No provider, credential, or DNS change was made.";
  }

  if (action === "mark_ready_for_contract") {
    return "Enterprise deployment marked ready for contract review only.";
  }

  if (action === "mark_active") {
    return "Enterprise deployment marked active in admin metadata only.";
  }

  if (action === "mark_blocked") {
    return "Enterprise deployment marked blocked for support review.";
  }

  return "Enterprise deployment moved to custom review.";
}

export async function updateWorkspaceEnterpriseDeploymentOps({
  actor,
  payload
}: {
  actor: VerifiedSuperAdmin;
  payload: unknown;
}): Promise<AdminWorkspaceEnterpriseDeploymentOpsUpdateResponse> {
  const parsed = parseWorkspaceEnterpriseDeploymentOpsPayload(payload);
  const { workspace, docRef } = await resolveWorkspaceByMaskedRef(parsed.workspaceRef);
  const now = new Date().toISOString();
  const deploymentStatus = deploymentStatusForAction(parsed.action);
  const dataResidencyStatus: WorkspaceEnterpriseDeploymentReadiness["dataResidencyStatus"] =
    deploymentStatus === "not_configured" ? "not_requested" : "custom_review";
  const nextEnterpriseDeployment = {
    ...workspace.enterpriseDeployment,
    deploymentMode: modeForStatus(deploymentStatus),
    deploymentStatus,
    slaStatus: slaForStatus(deploymentStatus),
    backupRestoreStatus: backupForStatus(deploymentStatus),
    dataResidencyStatus,
    adminReviewNote: parsed.adminNote ?? workspace.enterpriseDeployment?.adminReviewNote,
    adminStatusReason: parsed.statusReason ?? parsed.adminNote ?? workspace.enterpriseDeployment?.adminStatusReason,
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
      enterpriseDeployment: nextEnterpriseDeployment,
      updatedAt: now
    },
    { merge: true }
  );

  await db.collection(`workspaces/${workspace.workspaceId}/enterprise_deployment_ops`).doc().set({
    workspaceRef: parsed.workspaceRef,
    actorRef: maskedActorRef(actor),
    action: parsed.action,
    deploymentMode: nextEnterpriseDeployment.deploymentMode,
    deploymentStatus,
    slaStatus: nextEnterpriseDeployment.slaStatus,
    backupRestoreStatus: nextEnterpriseDeployment.backupRestoreStatus,
    dataResidencyStatus: nextEnterpriseDeployment.dataResidencyStatus,
    adminNoteSummary: parsed.adminNote,
    statusReason: parsed.statusReason,
    safeBoundary:
      "Metadata only. No infrastructure provisioning, provider call, DNS automation, payment automation, or live execution occurred.",
    createdAt: now
  });

  const enterpriseReadiness = deriveWorkspaceEnterpriseDeploymentReadiness({
    workspace: {
      ...workspace,
      enterpriseDeployment: nextEnterpriseDeployment,
      updatedAt: now
    },
    packageStatus
  });
  const workspaceInsight = toAdminWorkspaceEnterpriseDeploymentInsight({
    workspace,
    packageStatus,
    enterpriseReadiness
  });

  return {
    ok: true,
    workspace: workspaceInsight,
    message: messageForAction(parsed.action)
  };
}
