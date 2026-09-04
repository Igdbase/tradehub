import { createHash, randomUUID } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { mapWorkspaceRecord } from "@/lib/workspace/onboarding-mappers";
import {
  deriveWorkspacePackageStatus,
  maskedWorkspaceRef,
  sanitizeWorkspacePackageAdminText
} from "@/lib/workspace/workspace-package-licence";
import type { Workspace } from "@/types/workspace";
import type {
  AdminWorkspaceEnterpriseIntegrationInsight,
  AdminWorkspaceEnterpriseIntegrationOverview,
  WorkspaceEnterpriseIntegrationCategory,
  WorkspaceEnterpriseIntegrationComplexity,
  WorkspaceEnterpriseIntegrationCreatePayload,
  WorkspaceEnterpriseIntegrationCreateResponse,
  WorkspaceEnterpriseIntegrationDataSensitivityFlag,
  WorkspaceEnterpriseIntegrationOverview,
  WorkspaceEnterpriseIntegrationPriority,
  WorkspaceEnterpriseIntegrationRequest,
  WorkspaceEnterpriseIntegrationRequestsResponse,
  WorkspaceEnterpriseIntegrationRequestSummary,
  WorkspaceEnterpriseIntegrationStatus,
  WorkspacePackageStatus
} from "@/types/workspace-package";

const WORKSPACE_REQUEST_LIMIT = 25;
const ADMIN_WORKSPACE_SCAN_LIMIT = 75;
const ADMIN_REQUEST_SCAN_LIMIT = 25;
const ACTIVE_STUDENT_COUNT_LIMIT = 501;

export const enterpriseIntegrationCategories: WorkspaceEnterpriseIntegrationCategory[] = [
  "crm",
  "payment",
  "analytics",
  "broker",
  "telegram_discord",
  "external_lms",
  "data_export",
  "custom"
];

export const enterpriseIntegrationStatuses: WorkspaceEnterpriseIntegrationStatus[] = [
  "requested",
  "triage",
  "scoping",
  "approved_for_build",
  "blocked",
  "completed",
  "rejected",
  "custom_review"
];

export const enterpriseIntegrationPriorities: WorkspaceEnterpriseIntegrationPriority[] = [
  "low",
  "medium",
  "high",
  "critical"
];

export const enterpriseIntegrationComplexities: WorkspaceEnterpriseIntegrationComplexity[] = [
  "small",
  "medium",
  "large",
  "custom"
];

export const enterpriseIntegrationDataSensitivityFlags: WorkspaceEnterpriseIntegrationDataSensitivityFlag[] = [
  "student_profile",
  "billing_status",
  "course_progress",
  "practice_aggregates",
  "manual_journal_aggregates",
  "signals_metadata",
  "custom_review"
];

type WorkspaceLoadResult = {
  workspace: Workspace;
  docRef: DocumentReference;
  packageStatus: WorkspacePackageStatus;
};

type AdminRequestResolution = WorkspaceLoadResult & {
  request: WorkspaceEnterpriseIntegrationRequest;
  requestRef: DocumentReference;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? value as T : fallback;
}

function normalizeIsoDate(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date ? date.toISOString() : fallback;
  }

  return fallback;
}

export function enterpriseIntegrationRequestRef(workspaceId: string, requestId: string) {
  const digest = createHash("sha256")
    .update(`${workspaceId}:${requestId}`)
    .digest("hex")
    .slice(0, 12);

  return `integration_${digest}`;
}

function maskedActorRef(uid: string, prefix: "admin" | "workspace_owner") {
  const digest = createHash("sha256").update(uid).digest("hex").slice(0, 10);

  return `${prefix}_${digest}`;
}

export function sanitizeEnterpriseIntegrationText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return cleaned || undefined;
}

export function containsEnterpriseIntegrationSecretLikeText(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  return /\b(api[-_\s]?key|access[-_\s]?token|refresh[-_\s]?token|bearer|client[-_\s]?secret|webhook[-_\s]?secret|password|private[-_\s]?key|vault|credential|broker[-_\s]?login|broker[-_\s]?server)\b/i
    .test(value);
}

function containsUrlLikeText(value: unknown) {
  return typeof value === "string" && /https?:\/\/|www\./i.test(value);
}

function assertSupportSafeFreeText(value: unknown, fieldLabel: string) {
  if (containsEnterpriseIntegrationSecretLikeText(value) || containsUrlLikeText(value)) {
    throw new AdminApiError(
      400,
      "enterprise_integration_secret_like_text",
      `${fieldLabel} must not include credentials, tokens, webhook secrets, private URLs, broker passwords, vault refs, or provider payloads. Use the safe hostname field for public provider domains.`
    );
  }
}

export function sanitizeEnterpriseProviderHostname(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const trimmed = value.trim().toLowerCase();
  let candidate = trimmed;

  if (trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      candidate = parsed.hostname;

      if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
        throw new Error("unsafe-url-shape");
      }
    } catch {
      throw new AdminApiError(
        400,
        "invalid_enterprise_integration_hostname",
        "Use a public hostname only, such as crm.example.com. Do not include paths, credentials, private hosts, query strings, or secrets."
      );
    }
  }

  if (
    !/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(candidate) ||
    candidate.includes("localhost") ||
    candidate.endsWith(".local") ||
    candidate.startsWith("127.") ||
    candidate.startsWith("10.") ||
    candidate.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(candidate)
  ) {
    throw new AdminApiError(
      400,
      "invalid_enterprise_integration_hostname",
      "Use a public hostname only, such as crm.example.com. Do not include paths, credentials, private hosts, query strings, or secrets."
    );
  }

  if (containsEnterpriseIntegrationSecretLikeText(candidate)) {
    throw new AdminApiError(
      400,
      "enterprise_integration_hostname_secret_like",
      "Provider hostname must not include credentials, tokens, webhook secrets, vault refs, or provider payloads."
    );
  }

  return candidate.slice(0, 120);
}

function normalizeDataSensitivityFlags(value: unknown): WorkspaceEnterpriseIntegrationDataSensitivityFlag[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value.filter((entry): entry is WorkspaceEnterpriseIntegrationDataSensitivityFlag =>
      typeof entry === "string" &&
      enterpriseIntegrationDataSensitivityFlags.includes(entry as WorkspaceEnterpriseIntegrationDataSensitivityFlag)
    )
  )).slice(0, 6);
}

function parseCreatePayload(payload: unknown): WorkspaceEnterpriseIntegrationCreatePayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(
      400,
      "invalid_enterprise_integration_payload",
      "Send a valid Enterprise integration request payload."
    );
  }

  assertSupportSafeFreeText(payload.title, "Title");
  assertSupportSafeFreeText(payload.description, "Description");
  assertSupportSafeFreeText(payload.requestedProviderLabel, "Provider label");
  assertSupportSafeFreeText(payload.workspaceVisibleNote, "Workspace-visible note");

  const title = sanitizeEnterpriseIntegrationText(payload.title, 96);
  const description = sanitizeEnterpriseIntegrationText(payload.description, 700);

  if (!title || title.length < 4) {
    throw new AdminApiError(400, "enterprise_integration_title_required", "Add a short integration request title.");
  }

  if (!description || description.length < 12) {
    throw new AdminApiError(
      400,
      "enterprise_integration_description_required",
      "Add a bounded description of the business workflow, without secrets."
    );
  }

  const category = oneOf(payload.category, enterpriseIntegrationCategories, "custom");
  const priority = oneOf(payload.priority, enterpriseIntegrationPriorities, "medium");
  const estimatedComplexity = oneOf(payload.estimatedComplexity, enterpriseIntegrationComplexities, "custom");
  const dataSensitivityFlags = normalizeDataSensitivityFlags(payload.dataSensitivityFlags);

  return {
    category,
    priority,
    title,
    description,
    requestedProviderLabel: sanitizeEnterpriseIntegrationText(payload.requestedProviderLabel, 80),
    requestedProviderHostname: sanitizeEnterpriseProviderHostname(payload.requestedProviderHostname),
    dataSensitivityFlags,
    securityReviewRequired:
      Boolean(payload.securityReviewRequired) ||
      dataSensitivityFlags.length > 0 ||
      category === "broker" ||
      category === "payment" ||
      category === "telegram_discord",
    legalSlaDependency: Boolean(payload.legalSlaDependency) || priority === "critical",
    estimatedComplexity,
    workspaceVisibleNote: sanitizeEnterpriseIntegrationText(payload.workspaceVisibleNote, 360)
  };
}

function mapIntegrationRequestRecord(
  record: Record<string, unknown>,
  requestId: string
): WorkspaceEnterpriseIntegrationRequest {
  const workspaceId = typeof record.workspaceId === "string" ? record.workspaceId : "";
  const createdAt = normalizeIsoDate(record.createdAt);
  const updatedAt = normalizeIsoDate(record.updatedAt, createdAt);

  return {
    requestId,
    workspaceId,
    category: oneOf(record.category, enterpriseIntegrationCategories, "custom"),
    status: oneOf(record.status, enterpriseIntegrationStatuses, "requested"),
    priority: oneOf(record.priority, enterpriseIntegrationPriorities, "medium"),
    title: sanitizeEnterpriseIntegrationText(record.title, 96) ?? "Enterprise integration request",
    description: sanitizeEnterpriseIntegrationText(record.description, 700) ?? "Support-safe Enterprise integration metadata.",
    requestedProviderLabel: sanitizeEnterpriseIntegrationText(record.requestedProviderLabel, 80),
    requestedProviderHostname: sanitizeEnterpriseIntegrationText(record.requestedProviderHostname, 120),
    dataSensitivityFlags: normalizeDataSensitivityFlags(record.dataSensitivityFlags),
    securityReviewRequired: Boolean(record.securityReviewRequired),
    legalSlaDependency: Boolean(record.legalSlaDependency),
    estimatedComplexity: oneOf(record.estimatedComplexity, enterpriseIntegrationComplexities, "custom"),
    workspaceVisibleNote: sanitizeEnterpriseIntegrationText(record.workspaceVisibleNote, 360),
    adminNoteSummary: sanitizeWorkspacePackageAdminText(record.adminNoteSummary, 500),
    adminStatusReason: sanitizeWorkspacePackageAdminText(record.adminStatusReason, 240),
    requestedByRef: sanitizeEnterpriseIntegrationText(record.requestedByRef, 80),
    reviewedByRef: sanitizeEnterpriseIntegrationText(record.reviewedByRef, 80),
    createdAt,
    updatedAt
  };
}

function summarizeRequestForWorkspace(
  request: WorkspaceEnterpriseIntegrationRequest
): WorkspaceEnterpriseIntegrationRequestSummary {
  return {
    requestRef: enterpriseIntegrationRequestRef(request.workspaceId, request.requestId),
    category: request.category,
    status: request.status,
    priority: request.priority,
    title: request.title,
    description: request.description,
    requestedProviderLabel: request.requestedProviderLabel,
    requestedProviderHostname: request.requestedProviderHostname,
    dataSensitivityFlags: request.dataSensitivityFlags,
    securityReviewRequired: request.securityReviewRequired,
    legalSlaDependency: request.legalSlaDependency,
    estimatedComplexity: request.estimatedComplexity,
    workspaceVisibleNote: request.workspaceVisibleNote,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  };
}

function enterpriseAvailabilityMessage(packageStatus: WorkspacePackageStatus) {
  if (packageStatus.packageTier === "enterprise") {
    return "Enterprise workspaces can request custom integration scoping. TradeHub records metadata only until a future approved build stage.";
  }

  return `${packageStatus.packageName} uses standard TradeHub integrations. Contact TradeHub about Enterprise before requesting custom CRM, broker, LMS, analytics, or data-export work.`;
}

function buildWorkspaceIntegrationOverview({
  packageStatus,
  requests
}: {
  packageStatus: WorkspacePackageStatus;
  requests: WorkspaceEnterpriseIntegrationRequest[];
}): WorkspaceEnterpriseIntegrationOverview {
  const summaries = requests
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(summarizeRequestForWorkspace);

  return {
    enterpriseAvailable: packageStatus.packageTier === "enterprise",
    availabilityMessage: enterpriseAvailabilityMessage(packageStatus),
    totalRequests: summaries.length,
    openRequests: summaries.filter((request) =>
      ["requested", "triage", "scoping", "approved_for_build", "custom_review"].includes(request.status)
    ).length,
    blockedRequests: summaries.filter((request) => request.status === "blocked").length,
    securityReviewRequiredCount: summaries.filter((request) => request.securityReviewRequired).length,
    legalSlaDependencyCount: summaries.filter((request) => request.legalSlaDependency).length,
    requests: summaries,
    updatedAt: new Date().toISOString()
  };
}

async function countActiveStudents(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students`)
    .where("status", "==", "active")
    .limit(ACTIVE_STUDENT_COUNT_LIMIT)
    .get();

  return snapshot.docs.length;
}

async function loadWorkspace(workspaceId: string): Promise<WorkspaceLoadResult> {
  const { db } = getFirebaseAdminClients();
  const docRef = db.doc(`workspaces/${workspaceId}`);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "That workspace was not found.");
  }

  const workspace = mapWorkspaceRecord(
    {
      ...snapshot.data(),
      workspaceId: snapshot.data()?.workspaceId ?? snapshot.id
    },
    snapshot.id
  );
  const activeStudentCount = await countActiveStudents(workspace.workspaceId);
  const packageStatus = deriveWorkspacePackageStatus({
    workspace,
    activeStudentCount
  });

  return {
    workspace,
    docRef,
    packageStatus
  };
}

async function listRequestsForWorkspace(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/enterprise_integration_requests`)
    .orderBy("updatedAt", "desc")
    .limit(WORKSPACE_REQUEST_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapIntegrationRequestRecord(
      {
        ...doc.data(),
        requestId: doc.data().requestId ?? doc.id,
        workspaceId: doc.data().workspaceId ?? workspaceId
      },
      doc.id
    )
  );
}

export async function listWorkspaceEnterpriseIntegrationRequests(
  actor: VerifiedInfluencer
): Promise<WorkspaceEnterpriseIntegrationRequestsResponse> {
  const { packageStatus } = await loadWorkspace(actor.workspaceId);
  const requests = await listRequestsForWorkspace(actor.workspaceId);

  return {
    ok: true,
    source: "firestore",
    warnings: [],
    overview: buildWorkspaceIntegrationOverview({
      packageStatus,
      requests
    })
  };
}

export async function createWorkspaceEnterpriseIntegrationRequest({
  actor,
  payload
}: {
  actor: VerifiedInfluencer;
  payload: unknown;
}): Promise<WorkspaceEnterpriseIntegrationCreateResponse> {
  const parsed = parseCreatePayload(payload);
  const { packageStatus } = await loadWorkspace(actor.workspaceId);

  if (packageStatus.packageTier !== "enterprise") {
    throw new AdminApiError(
      403,
      "enterprise_integration_not_available",
      "Custom integration requests are available for Enterprise workspaces only. Contact TradeHub about Enterprise scoping."
    );
  }

  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const requestId = `integration_${randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const request: WorkspaceEnterpriseIntegrationRequest = {
    requestId,
    workspaceId: actor.workspaceId,
    status: "requested",
    requestedByRef: maskedActorRef(actor.uid, "workspace_owner"),
    createdAt: now,
    updatedAt: now,
    ...parsed,
    dataSensitivityFlags: parsed.dataSensitivityFlags ?? [],
    securityReviewRequired: Boolean(parsed.securityReviewRequired),
    legalSlaDependency: Boolean(parsed.legalSlaDependency),
    estimatedComplexity: parsed.estimatedComplexity ?? "custom"
  };

  await db
    .doc(`workspaces/${actor.workspaceId}/enterprise_integration_requests/${requestId}`)
    .set(request, { merge: false });

  const requests = [request, ...(await listRequestsForWorkspace(actor.workspaceId))]
    .filter((entry, index, all) => all.findIndex((candidate) => candidate.requestId === entry.requestId) === index);
  const summary = summarizeRequestForWorkspace(request);

  return {
    ok: true,
    source: "firestore",
    warnings: [],
    overview: buildWorkspaceIntegrationOverview({
      packageStatus,
      requests
    }),
    request: summary,
    message: "Enterprise integration request recorded for TradeHub review. No adapter, provider call, credential collection, or automation was created."
  };
}

export function toAdminWorkspaceEnterpriseIntegrationInsight({
  workspace,
  packageStatus,
  request
}: {
  workspace: Workspace;
  packageStatus: WorkspacePackageStatus;
  request: WorkspaceEnterpriseIntegrationRequest;
}): AdminWorkspaceEnterpriseIntegrationInsight {
  return {
    requestRef: enterpriseIntegrationRequestRef(workspace.workspaceId, request.requestId),
    workspaceRef: maskedWorkspaceRef(workspace.workspaceId),
    workspaceName: workspace.name,
    packageTier: packageStatus.packageTier,
    packageName: packageStatus.packageName,
    category: request.category,
    status: request.status,
    priority: request.priority,
    title: request.title,
    requestedProviderLabel: request.requestedProviderLabel,
    requestedProviderHostname: request.requestedProviderHostname,
    dataSensitivityFlags: request.dataSensitivityFlags,
    securityReviewRequired: request.securityReviewRequired,
    legalSlaDependency: request.legalSlaDependency,
    estimatedComplexity: request.estimatedComplexity,
    workspaceVisibleNote: request.workspaceVisibleNote,
    adminNoteSummary: request.adminNoteSummary,
    adminStatusReason: request.adminStatusReason,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  };
}

export function summarizeAdminWorkspaceEnterpriseIntegrations(
  insights: AdminWorkspaceEnterpriseIntegrationInsight[]
): AdminWorkspaceEnterpriseIntegrationOverview {
  return {
    totalRequests: insights.length,
    enterpriseWorkspaceRequests: insights.filter((insight) => insight.packageTier === "enterprise").length,
    requestedRequests: insights.filter((insight) => insight.status === "requested").length,
    triageRequests: insights.filter((insight) => insight.status === "triage").length,
    scopingRequests: insights.filter((insight) => insight.status === "scoping").length,
    approvedForBuildRequests: insights.filter((insight) => insight.status === "approved_for_build").length,
    blockedRequests: insights.filter((insight) => insight.status === "blocked").length,
    completedRequests: insights.filter((insight) => insight.status === "completed").length,
    rejectedRequests: insights.filter((insight) => insight.status === "rejected").length,
    customReviewRequests: insights.filter((insight) => insight.status === "custom_review").length,
    securityReviewRequired: insights.filter((insight) => insight.securityReviewRequired).length,
    legalSlaDependencies: insights.filter((insight) => insight.legalSlaDependency).length,
    integrationOpsUpdatedAt: new Date().toISOString(),
    latestRequests: insights
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 20)
  };
}

export async function buildAdminWorkspaceEnterpriseIntegrationOverview() {
  const { db } = getFirebaseAdminClients();
  const workspaceSnapshot = await db
    .collection("workspaces")
    .orderBy("updatedAt", "desc")
    .limit(ADMIN_WORKSPACE_SCAN_LIMIT)
    .get();
  const insights: AdminWorkspaceEnterpriseIntegrationInsight[] = [];

  for (const doc of workspaceSnapshot.docs) {
    const workspace = mapWorkspaceRecord(
      {
        ...doc.data(),
        workspaceId: doc.data().workspaceId ?? doc.id
      },
      doc.id
    );
    const activeStudentCount = await countActiveStudents(workspace.workspaceId);
    const packageStatus = deriveWorkspacePackageStatus({
      workspace,
      activeStudentCount
    });
    const requestSnapshot = await db
      .collection(`workspaces/${workspace.workspaceId}/enterprise_integration_requests`)
      .orderBy("updatedAt", "desc")
      .limit(ADMIN_REQUEST_SCAN_LIMIT)
      .get();

    insights.push(
      ...requestSnapshot.docs.map((requestDoc) =>
        toAdminWorkspaceEnterpriseIntegrationInsight({
          workspace,
          packageStatus,
          request: mapIntegrationRequestRecord(
            {
              ...requestDoc.data(),
              requestId: requestDoc.data().requestId ?? requestDoc.id,
              workspaceId: requestDoc.data().workspaceId ?? workspace.workspaceId
            },
            requestDoc.id
          )
        })
      )
    );
  }

  return {
    overview: summarizeAdminWorkspaceEnterpriseIntegrations(insights),
    capped:
      workspaceSnapshot.docs.length === ADMIN_WORKSPACE_SCAN_LIMIT ||
      insights.length >= ADMIN_WORKSPACE_SCAN_LIMIT * ADMIN_REQUEST_SCAN_LIMIT
  };
}

export async function resolveEnterpriseIntegrationRequestByRef(
  requestRef: string
): Promise<AdminRequestResolution> {
  if (!/^integration_[a-f0-9]{12}$/.test(requestRef)) {
    throw new AdminApiError(400, "invalid_enterprise_integration_ref", "Choose a valid masked integration request reference.");
  }

  const { db } = getFirebaseAdminClients();
  const workspaceSnapshot = await db
    .collection("workspaces")
    .orderBy("updatedAt", "desc")
    .limit(ADMIN_WORKSPACE_SCAN_LIMIT)
    .get();

  for (const workspaceDoc of workspaceSnapshot.docs) {
    const workspace = mapWorkspaceRecord(
      {
        ...workspaceDoc.data(),
        workspaceId: workspaceDoc.data().workspaceId ?? workspaceDoc.id
      },
      workspaceDoc.id
    );
    const requestSnapshot = await db
      .collection(`workspaces/${workspace.workspaceId}/enterprise_integration_requests`)
      .orderBy("updatedAt", "desc")
      .limit(ADMIN_REQUEST_SCAN_LIMIT)
      .get();

    for (const requestDoc of requestSnapshot.docs) {
      const request = mapIntegrationRequestRecord(
        {
          ...requestDoc.data(),
          requestId: requestDoc.data().requestId ?? requestDoc.id,
          workspaceId: requestDoc.data().workspaceId ?? workspace.workspaceId
        },
        requestDoc.id
      );

      if (enterpriseIntegrationRequestRef(workspace.workspaceId, request.requestId) === requestRef) {
        const activeStudentCount = await countActiveStudents(workspace.workspaceId);
        const packageStatus = deriveWorkspacePackageStatus({
          workspace,
          activeStudentCount
        });

        return {
          workspace,
          docRef: workspaceDoc.ref,
          packageStatus,
          request,
          requestRef: requestDoc.ref
        };
      }
    }
  }

  throw new AdminApiError(
    404,
    "enterprise_integration_ref_not_found",
    "That masked Enterprise integration request was not found in the bounded admin queue."
  );
}
