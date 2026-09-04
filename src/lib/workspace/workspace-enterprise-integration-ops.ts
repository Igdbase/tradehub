import { createHash } from "node:crypto";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import {
  containsEnterpriseIntegrationSecretLikeText,
  resolveEnterpriseIntegrationRequestByRef,
  sanitizeEnterpriseIntegrationText,
  summarizeAdminWorkspaceEnterpriseIntegrations,
  toAdminWorkspaceEnterpriseIntegrationInsight
} from "@/lib/workspace/workspace-enterprise-integration-requests";
import { maskedWorkspaceRef, sanitizeWorkspacePackageAdminText } from "@/lib/workspace/workspace-package-licence";
import type {
  AdminWorkspaceEnterpriseIntegrationAction,
  AdminWorkspaceEnterpriseIntegrationOpsPatchPayload,
  AdminWorkspaceEnterpriseIntegrationOpsUpdateResponse,
  WorkspaceEnterpriseIntegrationStatus
} from "@/types/workspace-package";

const enterpriseIntegrationActions: AdminWorkspaceEnterpriseIntegrationAction[] = [
  "mark_triage",
  "mark_scoping",
  "mark_approved_for_build",
  "mark_blocked",
  "mark_completed",
  "mark_rejected",
  "mark_custom_review",
  "mark_security_review",
  "mark_legal_sla_review"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function maskedActorRef(actor: VerifiedSuperAdmin) {
  return `admin_${createHash("sha256").update(actor.uid).digest("hex").slice(0, 10)}`;
}

function assertAdminNoteSafe(value: unknown, label: string) {
  if (containsEnterpriseIntegrationSecretLikeText(value)) {
    throw new AdminApiError(
      400,
      "enterprise_integration_admin_note_secret_like",
      `${label} must not include credentials, tokens, webhook secrets, provider payloads, account IDs, broker passwords, vault refs, or private integration internals.`
    );
  }
}

function parsePayload(payload: unknown): AdminWorkspaceEnterpriseIntegrationOpsPatchPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(
      400,
      "invalid_enterprise_integration_ops_payload",
      "Send a valid Enterprise integration ops payload."
    );
  }

  const requestRef = typeof payload.requestRef === "string" ? payload.requestRef.trim() : "";
  const action = typeof payload.action === "string" ? payload.action : "";

  if (!/^integration_[a-f0-9]{12}$/.test(requestRef)) {
    throw new AdminApiError(
      400,
      "invalid_enterprise_integration_ref",
      "Choose a valid masked Enterprise integration request reference."
    );
  }

  if (!enterpriseIntegrationActions.includes(action as AdminWorkspaceEnterpriseIntegrationAction)) {
    throw new AdminApiError(
      400,
      "invalid_enterprise_integration_action",
      "Choose a valid Enterprise integration queue action."
    );
  }

  assertAdminNoteSafe(payload.adminNote, "Admin note");
  assertAdminNoteSafe(payload.workspaceVisibleNote, "Workspace-visible note");
  assertAdminNoteSafe(payload.statusReason, "Status reason");

  return {
    requestRef,
    action: action as AdminWorkspaceEnterpriseIntegrationAction,
    adminNote: sanitizeWorkspacePackageAdminText(payload.adminNote, 500),
    workspaceVisibleNote: sanitizeEnterpriseIntegrationText(payload.workspaceVisibleNote, 360),
    statusReason: sanitizeWorkspacePackageAdminText(payload.statusReason, 240)
  };
}

function statusForAction(action: AdminWorkspaceEnterpriseIntegrationAction): WorkspaceEnterpriseIntegrationStatus {
  if (action === "mark_triage") {
    return "triage";
  }

  if (action === "mark_scoping") {
    return "scoping";
  }

  if (action === "mark_approved_for_build") {
    return "approved_for_build";
  }

  if (action === "mark_blocked") {
    return "blocked";
  }

  if (action === "mark_completed") {
    return "completed";
  }

  if (action === "mark_rejected") {
    return "rejected";
  }

  return "custom_review";
}

function messageForAction(action: AdminWorkspaceEnterpriseIntegrationAction) {
  if (action === "mark_triage") {
    return "Enterprise integration request moved to triage. No adapter or provider call was created.";
  }

  if (action === "mark_scoping") {
    return "Enterprise integration request moved to scoping metadata only.";
  }

  if (action === "mark_approved_for_build") {
    return "Enterprise integration request marked approved for future build review only. No adapter was built.";
  }

  if (action === "mark_blocked") {
    return "Enterprise integration request marked blocked for support review.";
  }

  if (action === "mark_completed") {
    return "Enterprise integration request marked completed as admin metadata only.";
  }

  if (action === "mark_rejected") {
    return "Enterprise integration request marked rejected.";
  }

  if (action === "mark_security_review") {
    return "Enterprise integration request flagged for security review.";
  }

  if (action === "mark_legal_sla_review") {
    return "Enterprise integration request flagged for legal/SLA review.";
  }

  return "Enterprise integration request moved to custom review.";
}

export async function updateWorkspaceEnterpriseIntegrationOps({
  actor,
  payload
}: {
  actor: VerifiedSuperAdmin;
  payload: unknown;
}): Promise<AdminWorkspaceEnterpriseIntegrationOpsUpdateResponse> {
  const parsed = parsePayload(payload);
  const resolution = await resolveEnterpriseIntegrationRequestByRef(parsed.requestRef);
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const status = statusForAction(parsed.action);
  const nextRequest = {
    ...resolution.request,
    status,
    securityReviewRequired:
      resolution.request.securityReviewRequired || parsed.action === "mark_security_review",
    legalSlaDependency:
      resolution.request.legalSlaDependency || parsed.action === "mark_legal_sla_review",
    workspaceVisibleNote:
      parsed.workspaceVisibleNote ?? resolution.request.workspaceVisibleNote,
    adminNoteSummary:
      parsed.adminNote ?? resolution.request.adminNoteSummary,
    adminStatusReason:
      parsed.statusReason ?? parsed.adminNote ?? resolution.request.adminStatusReason,
    reviewedByRef: maskedActorRef(actor),
    updatedAt: now
  };

  await resolution.requestRef.set(nextRequest, { merge: true });

  await db.collection(`workspaces/${resolution.workspace.workspaceId}/enterprise_integration_ops`).doc().set({
    requestRef: parsed.requestRef,
    workspaceRef: maskedWorkspaceRef(resolution.workspace.workspaceId),
    actorRef: maskedActorRef(actor),
    action: parsed.action,
    category: nextRequest.category,
    status: nextRequest.status,
    priority: nextRequest.priority,
    securityReviewRequired: nextRequest.securityReviewRequired,
    legalSlaDependency: nextRequest.legalSlaDependency,
    adminNoteSummary: parsed.adminNote,
    workspaceVisibleNote: parsed.workspaceVisibleNote,
    statusReason: parsed.statusReason,
    safeBoundary:
      "Metadata only. No CRM, payment, analytics, broker, Telegram, Discord, LMS, provider, webhook, credential, or AutoCopy adapter was created.",
    createdAt: now
  });

  const request = toAdminWorkspaceEnterpriseIntegrationInsight({
    workspace: resolution.workspace,
    packageStatus: resolution.packageStatus,
    request: nextRequest
  });

  return {
    ok: true,
    request,
    message: messageForAction(parsed.action)
  };
}

export function emptyAdminEnterpriseIntegrationOverview() {
  return summarizeAdminWorkspaceEnterpriseIntegrations([]);
}
