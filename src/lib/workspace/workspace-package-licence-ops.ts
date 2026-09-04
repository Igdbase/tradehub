import { createHash } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { mapWorkspaceRecord } from "@/lib/workspace/onboarding-mappers";
import {
  defaultWorkspacePackageLicense,
  deriveWorkspacePackageStatus,
  maskedWorkspaceRef,
  sanitizeWorkspacePackageAdminText,
  toAdminWorkspacePackageInsight
} from "@/lib/workspace/workspace-package-licence";
import type { Workspace } from "@/types/workspace";
import type {
  AdminWorkspacePackageLicenceAction,
  AdminWorkspacePackageLicenceOpsPatchPayload,
  AdminWorkspacePackageLicenceOpsUpdateResponse,
  WorkspacePackageLicenseRecord
} from "@/types/workspace-package";

const LICENCE_OPS_WORKSPACE_SCAN_LIMIT = 100;
const LICENCE_OPS_ACTIVE_STUDENT_LIMIT = 501;
const licenceActions: AdminWorkspacePackageLicenceAction[] = [
  "mark_maintenance_active",
  "mark_maintenance_waived",
  "mark_custom_review",
  "mark_suspended"
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

function parseWorkspacePackageLicenceOpsPayload(
  payload: unknown
): AdminWorkspacePackageLicenceOpsPatchPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_package_licence_payload", "Send a valid licence ops payload.");
  }

  const workspaceRef = typeof payload.workspaceRef === "string" ? payload.workspaceRef.trim() : "";
  const action = typeof payload.action === "string" ? payload.action : "";

  if (!/^workspace_[a-f0-9]{10}$/.test(workspaceRef)) {
    throw new AdminApiError(400, "invalid_workspace_ref", "Choose a valid masked workspace reference.");
  }

  if (!licenceActions.includes(action as AdminWorkspacePackageLicenceAction)) {
    throw new AdminApiError(400, "invalid_licence_action", "Choose a valid licence ops action.");
  }

  return {
    workspaceRef,
    action: action as AdminWorkspacePackageLicenceAction,
    adminNote: sanitizeWorkspacePackageAdminText(payload.adminNote, 500),
    statusReason: sanitizeWorkspacePackageAdminText(payload.statusReason, 240)
  };
}

async function countActiveStudents(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students`)
    .where("status", "==", "active")
    .limit(LICENCE_OPS_ACTIVE_STUDENT_LIMIT)
    .get();

  return snapshot.docs.length;
}

async function resolveWorkspaceByMaskedRef(workspaceRef: string): Promise<WorkspaceResolution> {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection("workspaces")
    .orderBy("updatedAt", "desc")
    .limit(LICENCE_OPS_WORKSPACE_SCAN_LIMIT)
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
    "That masked workspace reference was not found in the bounded licence ops window."
  );
}

function patchLicenseForAction({
  license,
  action,
  now,
  note,
  reason
}: {
  license: WorkspacePackageLicenseRecord;
  action: AdminWorkspacePackageLicenceAction;
  now: string;
  note?: string;
  reason?: string;
}): WorkspacePackageLicenseRecord {
  const nextDue = new Date(now);
  nextDue.setUTCFullYear(nextDue.getUTCFullYear() + 1);
  const base: WorkspacePackageLicenseRecord = {
    ...license,
    adminNoteSummary: note ?? license.adminNoteSummary,
    adminStatusReason: reason ?? note ?? license.adminStatusReason,
    lastReviewedAt: now,
    updatedAt: now
  };

  if (action === "mark_maintenance_active") {
    return {
      ...base,
      licenseStatus: "active",
      maintenanceState: "current",
      maintenanceRenewalStatus: "active",
      maintenanceRenewalDueDate: nextDue.toISOString(),
      supportStatus: "maintenance_active"
    };
  }

  if (action === "mark_maintenance_waived") {
    return {
      ...base,
      licenseStatus: "active",
      maintenanceState: "current",
      maintenanceRenewalStatus: "waived",
      supportStatus: "maintenance_active"
    };
  }

  if (action === "mark_custom_review") {
    return {
      ...base,
      licenseStatus: "custom_review",
      maintenanceState: "custom_review",
      maintenanceRenewalStatus: "custom_review",
      supportStatus: "custom_review"
    };
  }

  return {
    ...base,
    licenseStatus: "suspended",
    maintenanceState: "custom_review",
    supportStatus: "suspended"
  };
}

function messageForAction(action: AdminWorkspacePackageLicenceAction) {
  if (action === "mark_maintenance_active") {
    return "Workspace maintenance marked active. No payment automation was performed.";
  }

  if (action === "mark_maintenance_waived") {
    return "Workspace maintenance marked waived. No payment automation was performed.";
  }

  if (action === "mark_custom_review") {
    return "Workspace licence moved to custom review.";
  }

  return "Workspace licence marked suspended for support review.";
}

export async function updateWorkspacePackageLicenceOps({
  actor,
  payload
}: {
  actor: VerifiedSuperAdmin;
  payload: unknown;
}): Promise<AdminWorkspacePackageLicenceOpsUpdateResponse> {
  const parsed = parseWorkspacePackageLicenceOpsPayload(payload);
  const { workspace, docRef } = await resolveWorkspaceByMaskedRef(parsed.workspaceRef);
  const now = new Date().toISOString();
  const currentLicense = workspace.packageLicense ?? defaultWorkspacePackageLicense(workspace);
  const nextLicense = patchLicenseForAction({
    license: currentLicense,
    action: parsed.action,
    now,
    note: parsed.adminNote,
    reason: parsed.statusReason
  });
  const activeStudentCount = await countActiveStudents(workspace.workspaceId);
  const { db } = getFirebaseAdminClients();

  await docRef.set(
    {
      packageLicense: nextLicense,
      updatedAt: now
    },
    { merge: true }
  );

  await db.collection(`workspaces/${workspace.workspaceId}/package_licence_ops`).doc().set({
    workspaceRef: parsed.workspaceRef,
    actorRef: maskedActorRef(actor),
    action: parsed.action,
    adminNoteSummary: parsed.adminNote,
    statusReason: parsed.statusReason,
    createdAt: now
  });

  const packageStatus = deriveWorkspacePackageStatus({
    workspace: {
      ...workspace,
      packageLicense: nextLicense,
      updatedAt: now
    },
    activeStudentCount
  });

  return {
    ok: true,
    workspace: toAdminWorkspacePackageInsight({
      workspace,
      packageStatus
    }),
    message: messageForAction(parsed.action)
  };
}
