import type {
  AdminAuditEvent,
  AdminAuditTargetType,
  AdminDataSource,
  AdminSourceMeta,
  PlatformSummary,
  PublicApplicationReceipt
} from "@/types/admin-api";
import type { AuditEventSummary, WorkspaceApplication } from "@/types/tradehub";

export function createSourceMeta(source: AdminDataSource, warnings: string[] = []): AdminSourceMeta {
  if (source === "firestore") {
    return {
      source,
      sourceLabel: "Firestore live",
      sourceMessage: "This data was loaded through server-side Firebase Admin SDK routes.",
      warnings
    };
  }

  return {
    source,
    sourceLabel: "Mock fallback",
    sourceMessage:
      "This is visible development data. Configure Firebase Admin SDK credentials to read and write production Firestore.",
    warnings
  };
}

function normalizeIsoDate(value: unknown, fallback = new Date(0).toISOString()) {
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

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function mapApplicationRecord(record: Record<string, unknown>): WorkspaceApplication {
  const now = new Date().toISOString();

  return {
    applicationId: asString(record.applicationId),
    name: asString(record.name),
    email: asString(record.email),
    primaryPlatform: asString(record.primaryPlatform) as WorkspaceApplication["primaryPlatform"],
    handleOrChannel: asString(record.handleOrChannel),
    audienceSize: asNumber(record.audienceSize),
    market: asString(record.market, "forex") as WorkspaceApplication["market"],
    studentAccountMix: asString(
      record.studentAccountMix,
      "unknown"
    ) as WorkspaceApplication["studentAccountMix"],
    monetizationMethod: asString(record.monetizationMethod),
    productOfferings: Array.isArray(record.productOfferings)
      ? (record.productOfferings as WorkspaceApplication["productOfferings"])
      : [],
    currentCustomerCount:
      typeof record.currentCustomerCount === "number" ? record.currentCustomerCount : undefined,
    solanaPayInterest: asBoolean(record.solanaPayInterest),
    noResultsPromiseAccepted: asBoolean(record.noResultsPromiseAccepted),
    notes: asString(record.notes),
    status: asString(record.status, "new") as WorkspaceApplication["status"],
    vettingOutcome: asString(record.vettingOutcome, "pending") as WorkspaceApplication["vettingOutcome"],
    vettingNotes: asString(record.vettingNotes),
    setupFeeStatus: asString(record.setupFeeStatus, "not_required") as WorkspaceApplication["setupFeeStatus"],
    workspaceId: asString(record.workspaceId) || undefined,
    source: asString(record.source, "landing_page") as WorkspaceApplication["source"],
    workspaceCreationStatus: asString(
      record.workspaceCreationStatus,
      "not_started"
    ) as WorkspaceApplication["workspaceCreationStatus"],
    createdAt: normalizeIsoDate(record.createdAt, now),
    updatedAt: normalizeIsoDate(record.updatedAt, now),
    firstPayingStudentAt: record.firstPayingStudentAt
      ? normalizeIsoDate(record.firstPayingStudentAt, now)
      : undefined
  };
}

export function mapPlatformSummaryRecord(record?: Record<string, unknown> | null): PlatformSummary {
  const now = new Date().toISOString();

  if (!record) {
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
      updatedAt: now
    };
  }

  return {
    activeWorkspaceCount: asNumber(record.activeWorkspaceCount),
    activeStudentCount: asNumber(record.activeStudentCount),
    monthlyGrossRevenueNgn: asNumber(record.monthlyGrossRevenueNgn),
    monthlyPlatformRevenueNgn: asNumber(record.monthlyPlatformRevenueNgn),
    paystackVolumeNgn: asNumber(record.paystackVolumeNgn),
    solanaVolumeUsdc: asNumber(record.solanaVolumeUsdc),
    openDisputeCount: asNumber(record.openDisputeCount),
    pendingApplicationCount: asNumber(record.pendingApplicationCount),
    riskFlagCount: asNumber(record.riskFlagCount),
    latestSignalAt: record.latestSignalAt ? normalizeIsoDate(record.latestSignalAt) : undefined,
    updatedAt: normalizeIsoDate(record.updatedAt, now)
  };
}

export function mapAuditEventRecord(record: Record<string, unknown>): AdminAuditEvent {
  return {
    eventId: asString(record.eventId),
    actorUid: asString(record.actorUid),
    actorEmail: asString(record.actorEmail) || undefined,
    action: asString(record.action),
    targetType: asString(record.targetType, "workspace_application") as AdminAuditTargetType,
    targetId: asString(record.targetId),
    before: typeof record.before === "object" && record.before !== null ? record.before as Record<string, unknown> : undefined,
    after: typeof record.after === "object" && record.after !== null ? record.after as Record<string, unknown> : undefined,
    createdAt: normalizeIsoDate(record.createdAt, new Date().toISOString())
  };
}

export function mapLegacyAuditEvent(event: AuditEventSummary): AdminAuditEvent {
  return {
    eventId: event.eventId,
    actorUid: event.actor,
    action: event.action,
    targetType: event.target.startsWith("disp")
      ? "dispute"
      : event.target.startsWith("risk")
        ? "risk_flag"
        : event.target.startsWith("ws")
          ? "workspace"
          : "workspace_application",
    targetId: event.target,
    createdAt: event.timestamp
  };
}

export function toPublicApplicationReceipt(
  application: WorkspaceApplication,
  persisted: boolean
): PublicApplicationReceipt {
  return {
    applicationId: application.applicationId,
    name: application.name,
    email: application.email,
    primaryPlatform: application.primaryPlatform,
    handleOrChannel: application.handleOrChannel,
    audienceSize: application.audienceSize,
    market: application.market,
    studentAccountMix: application.studentAccountMix,
    monetizationMethod: application.monetizationMethod,
    productOfferings: application.productOfferings,
    currentCustomerCount: application.currentCustomerCount,
    solanaPayInterest: application.solanaPayInterest,
    noResultsPromiseAccepted: application.noResultsPromiseAccepted ?? false,
    notes: application.notes,
    status: application.status,
    source: application.source,
    workspaceCreationStatus: application.workspaceCreationStatus,
    createdAt: application.createdAt,
    persisted
  };
}
