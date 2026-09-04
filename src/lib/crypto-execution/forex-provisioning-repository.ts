import "server-only";

import { createHash } from "node:crypto";
import { mapSubscriptionRecord } from "@/lib/billing/billing-mappers";
import { mapPlatformExecutionControlRecord, mapWorkspaceExecutionControlRecord, normalizeIsoDate, recordFromSnapshot } from "@/lib/crypto-execution/crypto-execution-mappers";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import {
  mapStudentProfile,
  mapWorkspaceForStudent,
  recordFromSnapshot as studentRecordFromSnapshot
} from "@/lib/student-app/student-app-mappers";
import type {
  ExecutionAuditSeverity,
  ForexAutoCopyBillingStatus,
  ForexAutoCopyPaymentIntentSummary,
  ForexAutoCopyPlatform,
  ForexProvisionedAccountRecord,
  ForexProvisionedAccountSummary,
  ForexProvisioningAuditEventSummary,
  ForexProvisioningPreview,
  ForexProvisioningProviderMode,
  ForexProvisioningRequestRecord,
  ForexProvisioningRequestSummary,
  PlatformExecutionControlRecord,
  WorkspaceExecutionControlRecord
} from "@/types/crypto-execution";
import type { StudentEntitlementSummary } from "@/types/entitlements";
import type { StudentSubscription } from "@/types/payments";
import type { StudentAppProfile } from "@/types/student-app";
import type { Workspace } from "@/types/workspace";

const FOREX_PROVISIONING_VISIBLE_LIMIT = 4;
const FOREX_PROVISIONING_READ_LIMIT = FOREX_PROVISIONING_VISIBLE_LIMIT + 1;
const FOREX_PROVISIONING_WORKSPACE_STUDENT_SAMPLE_LIMIT = 50;
const BILLING_DISABLED_STATUSES = new Set<ForexAutoCopyBillingStatus>([
  "past_due",
  "cancelled",
  "expired"
]);

type StudentForexProvisioningBase = {
  workspace: Workspace;
  student: StudentAppProfile;
  studentRecord: Record<string, unknown>;
  subscription: StudentSubscription | null;
  entitlements: StudentEntitlementSummary;
  workspaceControl: WorkspaceExecutionControlRecord;
  platformControl: PlatformExecutionControlRecord;
  forexBilling: ForexBillingState;
};

type ForexBillingState = {
  status: ForexAutoCopyBillingStatus;
  entitled: boolean;
  rail: "paystack" | "solana" | "manual" | "unknown";
  reason: string;
};

type BrokerProvisioningPayload = {
  platform: ForexAutoCopyPlatform;
  brokerServer: string;
  brokerLogin: string;
  brokerPassword: string;
  label?: string;
  billingAcknowledged: boolean;
  dryRunAcknowledged: boolean;
  noOrderAcknowledged: boolean;
  personalAccountAcknowledged: boolean;
};

type ServerManagedMetaApiProvisioningInput = {
  workspaceId: string;
  studentId: string;
  platform: ForexAutoCopyPlatform;
  brokerServer: string;
  brokerLogin: string;
  passwordForOneTimeSubmission: string;
};

type ServerManagedMetaApiProvisioningResult = {
  provider: "mock";
  providerMode: "dry_run";
  status: "not_configured";
  passwordHandling: "discarded_mock_dry_run";
  noMetaApiResourceCreated: true;
  safeMessage: string;
};

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry)) as T;
  }

  if (typeof value === "object" && value !== null) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        cleaned[key] = stripUndefined(entry);
      }
    }

    return cleaned as T;
  }

  return value;
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function hashRef(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function shortRef(value: string, prefix: string) {
  const trimmed = value.trim();
  const clean = trimmed.replace(/\s+/g, "");

  if (!clean) {
    return `${prefix}:unknown`;
  }

  return `${prefix}:${clean.length <= 4 ? "****" : `...${clean.slice(-4)}`}`;
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function maskPaymentReference(value?: string) {
  const clean = safeString(value).replace(/\s+/g, "");

  if (!clean) {
    return "ref:not_recorded";
  }

  return clean.length <= 8 ? `ref:${clean}` : `ref:${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

function deterministicId(parts: string[], maxLength = 150) {
  const base = parts
    .map((part) => safeString(part).toLowerCase().replace(/[^a-z0-9_-]/g, "_"))
    .filter(Boolean)
    .join("_");
  const digest = hashRef(parts.join(":")).slice(0, 14);

  return `${base}_${digest}`.slice(0, maxLength);
}

function providerMode(): ForexProvisioningProviderMode {
  return "dry_run";
}

async function prepareServerManagedMetaApiProvisioning(
  input: ServerManagedMetaApiProvisioningInput
): Promise<ServerManagedMetaApiProvisioningResult> {
  void input.passwordForOneTimeSubmission;

  return {
    provider: "mock",
    providerMode: "dry_run",
    status: "not_configured",
    passwordHandling: "discarded_mock_dry_run",
    noMetaApiResourceCreated: true,
    safeMessage: "TradeHub-managed MetaAPI provisioning is not configured yet; broker credentials were accepted only for one-time server dry-run handling."
  };
}

function validateBrokerProvisioningPayload(payload: unknown): BrokerProvisioningPayload {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "forex_provisioning_payload_invalid", "Broker account details are required.");
  }

  const record = payload as Record<string, unknown>;
  const platform = record.platform === "mt4" || record.platform === "mt5" ? record.platform : null;
  const brokerServer = safeString(record.brokerServer).slice(0, 140);
  const brokerLogin = safeString(record.brokerLogin).slice(0, 90);
  const brokerPassword = safeString(record.brokerPassword);

  if (!platform) {
    throw new AdminApiError(400, "forex_platform_invalid", "Choose MT4 or MT5 for this broker account.");
  }

  if (brokerServer.length < 3) {
    throw new AdminApiError(400, "forex_broker_server_required", "Enter the broker server for this MT4/MT5 account.");
  }

  if (brokerLogin.length < 2) {
    throw new AdminApiError(400, "forex_broker_login_required", "Enter the broker login for this MT4/MT5 account.");
  }

  if (brokerPassword.length < 6 || brokerPassword.length > 512) {
    throw new AdminApiError(400, "forex_broker_password_invalid", "Enter the broker password for one-time server-side provisioning.");
  }

  if (!safeBoolean(record.billingAcknowledged)) {
    throw new AdminApiError(400, "forex_billing_ack_required", "Confirm Forex AutoCopy is billed separately before connecting a broker account.");
  }

  if (!safeBoolean(record.dryRunAcknowledged)) {
    throw new AdminApiError(400, "forex_dry_run_ack_required", "Confirm this stage records provisioning dry-run metadata only.");
  }

  if (!safeBoolean(record.noOrderAcknowledged)) {
    throw new AdminApiError(400, "forex_no_order_ack_required", "Confirm no demo or live broker order will be placed.");
  }

  if (!safeBoolean(record.personalAccountAcknowledged)) {
    throw new AdminApiError(400, "forex_personal_account_ack_required", "Confirm this is your personal broker account.");
  }

  return {
    platform,
    brokerServer,
    brokerLogin,
    brokerPassword,
    label: safeString(record.label).slice(0, 80) || undefined,
    billingAcknowledged: true,
    dryRunAcknowledged: true,
    noOrderAcknowledged: true,
    personalAccountAcknowledged: true
  };
}

async function getWorkspaceExecutionControl(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc(`workspaces/${workspaceId}/execution_controls/current`).get();

  return mapWorkspaceExecutionControlRecord(
    snapshot.exists ? recordFromSnapshot(snapshot, "controlId") : null,
    workspaceId
  );
}

async function getPlatformExecutionControl() {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc("platform_execution_controls/current").get();

  return mapPlatformExecutionControlRecord(
    snapshot.exists ? recordFromSnapshot(snapshot, "controlId") : null
  );
}

function mapForexBillingState(record: Record<string, unknown> | null): ForexBillingState {
  const rawStatus = safeString(record?.status);
  const status: ForexAutoCopyBillingStatus =
    rawStatus === "active_paid" ||
    rawStatus === "trial_only" ||
    rawStatus === "payment_pending" ||
    rawStatus === "payment_failed" ||
    rawStatus === "past_due" ||
    rawStatus === "cancelled" ||
    rawStatus === "expired" ||
    rawStatus === "not_purchased"
      ? rawStatus
      : "not_purchased";
  const rail =
    record?.rail === "paystack" || record?.rail === "solana" || record?.rail === "manual"
      ? record.rail
      : "unknown";

  if (status === "active_paid") {
    return {
      status,
      entitled: true,
      rail,
      reason: "Forex AutoCopy is purchased and active for this student."
    };
  }

  if (status === "trial_only") {
    return {
      status,
      entitled: false,
      rail,
      reason: "Forex AutoCopy requires a paid subscription before broker provisioning."
    };
  }

  if (status === "payment_pending") {
    return {
      status,
      entitled: false,
      rail,
      reason: "Forex AutoCopy checkout is pending. Broker provisioning unlocks only after payment is verified."
    };
  }

  if (status === "payment_failed") {
    return {
      status,
      entitled: false,
      rail,
      reason: "Forex AutoCopy payment was not completed. Start checkout again to unlock broker provisioning."
    };
  }

  if (status === "past_due" || status === "cancelled" || status === "expired") {
    return {
      status,
      entitled: false,
      rail,
      reason: "Forex AutoCopy billing is not active enough for broker provisioning."
    };
  }

  return {
    status: "not_purchased",
    entitled: false,
    rail,
    reason: "Purchase Forex AutoCopy before connecting an MT4/MT5 broker account."
  };
}

async function loadForexBillingState(workspaceId: string, studentId: string): Promise<ForexBillingState> {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc(`workspaces/${workspaceId}/students/${studentId}/forex_autocopy_subscriptions/current`).get();

  return mapForexBillingState(snapshot.exists ? snapshot.data() ?? null : null);
}

export async function getForexAutoCopyBillingState(workspaceId: string, studentId: string) {
  return loadForexBillingState(workspaceId, studentId);
}

async function getStudentForexProvisioningBase(actor: VerifiedStudent): Promise<StudentForexProvisioningBase> {
  const { db } = getFirebaseAdminClients();
  const [
    workspaceSnapshot,
    studentSnapshot,
    subscriptionSnapshot,
    workspaceControl,
    platformControl,
    forexBilling
  ] = await Promise.all([
    db.doc(`workspaces/${actor.workspaceId}`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}`).get(),
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/subscriptions/current`).get(),
    getWorkspaceExecutionControl(actor.workspaceId),
    getPlatformExecutionControl(),
    loadForexBillingState(actor.workspaceId, actor.studentId)
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This student workspace is not prepared yet.");
  }

  if (!studentSnapshot.exists) {
    throw new AdminApiError(403, "student_record_required", "This student account has not been provisioned inside this workspace yet.");
  }

  const workspace = mapWorkspaceForStudent(
    studentRecordFromSnapshot(workspaceSnapshot, "workspaceId"),
    actor.workspaceId
  );
  const rawStudentRecord = studentRecordFromSnapshot(studentSnapshot, "studentId");
  const subscription = mapSubscriptionRecord(
    subscriptionSnapshot.exists
      ? studentRecordFromSnapshot(subscriptionSnapshot, "subscriptionId")
      : null,
    actor.workspaceId,
    actor.studentId
  );
  const entitlements = resolveStudentEntitlements({
    workspace,
    studentRecord: rawStudentRecord,
    subscription,
    claimedTierId: actor.tierId
  });
  const student = mapStudentProfile(rawStudentRecord, actor.workspaceId, actor.studentId, entitlements);

  return {
    workspace,
    student,
    studentRecord: rawStudentRecord,
    subscription,
    entitlements,
    workspaceControl,
    platformControl,
    forexBilling
  };
}

function assertForexProvisioningAllowed(base: StudentForexProvisioningBase) {
  const autoCopyEntitlement = base.entitlements.features.autoCopy;

  if (autoCopyEntitlement.access !== "allowed") {
    throw new AdminApiError(403, "auto_copy_not_entitled", autoCopyEntitlement.reason);
  }

  if (base.entitlements.riskPosture !== "personal_account") {
    throw new AdminApiError(403, "personal_account_required", "Forex AutoCopy provisioning is only available for personal broker accounts.");
  }

  if (base.entitlements.subscriptionStatus === "trial" || base.entitlements.subscriptionStatus === "past_due" || base.entitlements.subscriptionStatus === "cancelled" || base.entitlements.subscriptionStatus === "expired") {
    throw new AdminApiError(403, "paid_subscription_required", "Forex AutoCopy requires active paid billing. Trial, past-due, cancelled, and expired students cannot provision broker accounts.");
  }

  if (!base.forexBilling.entitled) {
    throw new AdminApiError(403, "forex_autocopy_not_purchased", base.forexBilling.reason);
  }

  if (base.platformControl.killSwitchEnabled) {
    throw new AdminApiError(423, "platform_execution_paused", base.platformControl.killSwitchReason || "Platform Auto-Copy setup is paused.");
  }

  if (base.workspaceControl.killSwitchEnabled) {
    throw new AdminApiError(423, "workspace_execution_paused", base.workspaceControl.killSwitchReason || "Workspace Auto-Copy setup is paused.");
  }
}

function toRequestSummary(record: ForexProvisioningRequestRecord): ForexProvisioningRequestSummary {
  return {
    requestId: record.requestId,
    studentId: record.studentId,
    platform: record.platform,
    provider: record.provider,
    providerMode: record.providerMode,
    status: record.status,
    label: record.label,
    brokerServerRef: record.brokerServerRef,
    brokerLoginRef: record.brokerLoginRef,
    safeMessage: record.safeMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function toAccountSummary(record: ForexProvisionedAccountRecord): ForexProvisionedAccountSummary {
  return {
    accountId: record.accountId,
    requestId: record.requestId,
    studentId: record.studentId,
    platform: record.platform,
    provider: record.provider,
    providerMode: record.providerMode,
    status: record.status,
    active: record.active,
    label: record.label,
    brokerServerRef: record.brokerServerRef,
    brokerLoginRef: record.brokerLoginRef,
    cleanupStatus: record.cleanupStatus,
    safeMessage: record.safeMessage,
    updatedAt: record.updatedAt
  };
}

function mapRequest(record: Record<string, unknown>, ids: { workspaceId: string; studentId: string; requestId: string }): ForexProvisioningRequestRecord {
  const now = new Date().toISOString();

  return {
    requestId: safeString(record.requestId) || ids.requestId,
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    studentId: safeString(record.studentId) || ids.studentId,
    platform: record.platform === "mt5" ? "mt5" : "mt4",
    provider: "mock",
    providerMode: "dry_run",
    status: record.status === "mock_completed" || record.status === "rejected" || record.status === "failed" || record.status === "cancelled"
      ? record.status
      : "requested",
    label: safeString(record.label) || undefined,
    brokerServerRef: safeString(record.brokerServerRef) || "server:masked",
    brokerLoginRef: safeString(record.brokerLoginRef) || "login:masked",
    brokerServerFingerprint: safeString(record.brokerServerFingerprint) || "not_recorded",
    brokerLoginFingerprint: safeString(record.brokerLoginFingerprint) || "not_recorded",
    passwordHandling: "discarded_mock_dry_run",
    safeMessage: safeString(record.safeMessage) || "Forex AutoCopy provisioning request was recorded in dry-run mode.",
    createdAt: normalizeIsoDate(record.createdAt ?? now),
    updatedAt: normalizeIsoDate(record.updatedAt ?? now)
  };
}

function mapAccount(record: Record<string, unknown>, ids: { workspaceId: string; accountId: string }): ForexProvisionedAccountRecord {
  const now = new Date().toISOString();
  const status: ForexProvisionedAccountRecord["status"] =
    record.status === "ready_to_connect" ||
    record.status === "provisioning_dry_run_complete" ||
    record.status === "disabled" ||
    record.status === "cancelled" ||
    record.status === "cleanup_pending" ||
    record.status === "cleanup_complete" ||
    record.status === "failed"
      ? record.status
      : "failed";

  return {
    accountId: safeString(record.accountId) || ids.accountId,
    requestId: safeString(record.requestId) || "unknown_request",
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    studentId: safeString(record.studentId) || "unknown_student",
    platform: record.platform === "mt5" ? "mt5" : "mt4",
    provider: "mock",
    providerMode: "dry_run",
    status,
    active: record.active === true,
    label: safeString(record.label) || undefined,
    brokerServerRef: safeString(record.brokerServerRef) || "server:masked",
    brokerLoginRef: safeString(record.brokerLoginRef) || "login:masked",
    brokerServerFingerprint: safeString(record.brokerServerFingerprint) || "not_recorded",
    brokerLoginFingerprint: safeString(record.brokerLoginFingerprint) || "not_recorded",
    noBrokerExecution: true,
    noMetaApiResourceCreated: record.noMetaApiResourceCreated !== false,
    cleanupStatus: record.cleanupStatus === "pending" || record.cleanupStatus === "complete" || record.cleanupStatus === "failed"
      ? record.cleanupStatus
      : "not_required",
    disabledAt: record.disabledAt ? normalizeIsoDate(record.disabledAt) : undefined,
    disabledReason: safeString(record.disabledReason) || undefined,
    safeMessage: safeString(record.safeMessage) || "Mock Forex AutoCopy provisioning metadata is support-safe.",
    createdAt: normalizeIsoDate(record.createdAt ?? now),
    updatedAt: normalizeIsoDate(record.updatedAt ?? now)
  };
}

function mapAudit(record: Record<string, unknown>, eventId: string): ForexProvisioningAuditEventSummary {
  return {
    eventId,
    action: safeString(record.action) || "forex_provisioning.event",
    actorType: record.actorType === "student" || record.actorType === "super_admin" || record.actorType === "influencer"
      ? record.actorType
      : "system",
    studentId: safeString(record.studentId) || undefined,
    targetType: record.targetType === "subscription" ||
      record.targetType === "provisioning_request" ||
      record.targetType === "provisioned_account" ||
      record.targetType === "cleanup" ||
      record.targetType === "control"
      ? record.targetType
      : "provisioning_request",
    targetId: safeString(record.targetId) || "unknown",
    safeMessage: safeString(record.safeMessage) || "Forex provisioning audit event recorded.",
    severity: record.severity === "warning" || record.severity === "critical" ? record.severity : "info",
    createdAt: normalizeIsoDate(record.createdAt)
  };
}

function mapPaymentIntentSummary(record: Record<string, unknown>, paymentIntentId: string): ForexAutoCopyPaymentIntentSummary {
  const status =
    record.status === "checkout_opened" ||
    record.status === "verified" ||
    record.status === "failed" ||
    record.status === "cancelled" ||
    record.status === "expired"
      ? record.status
      : "pending";

  return {
    paymentIntentId,
    studentId: safeString(record.studentId) || "unknown_student",
    status,
    rail: "paystack",
    referenceRef: maskPaymentReference(safeString(record.paystackReference) || safeString(record.reference)),
    amountNgn: safeNumber(record.amountNgn),
    currency: "NGN",
    safeMessage: safeString(record.safeMessage) || "Forex AutoCopy Paystack payment intent is support-safe.",
    createdAt: normalizeIsoDate(record.createdAt),
    updatedAt: normalizeIsoDate(record.updatedAt ?? record.createdAt)
  };
}

async function appendForexProvisioningAuditEvent({
  workspaceId,
  studentId,
  actorId,
  actorType = "student",
  action,
  targetType,
  targetId,
  safeMessage,
  after,
  severity = "info"
}: {
  workspaceId: string;
  studentId: string;
  actorId: string;
  actorType?: "student" | "super_admin" | "influencer" | "system";
  action: string;
  targetType: ForexProvisioningAuditEventSummary["targetType"];
  targetId: string;
  safeMessage: string;
  after?: Record<string, unknown>;
  severity?: ExecutionAuditSeverity;
}) {
  const { db } = getFirebaseAdminClients();
  const eventRef = db.collection(`workspaces/${workspaceId}/forex_provisioning_audit_events`).doc();

  await eventRef.set(stripUndefined({
    eventId: eventRef.id,
    action,
    actorType,
    actorId,
    workspaceId,
    studentId,
    targetType,
    targetId,
    safeMessage,
    severity,
    after,
    createdAt: new Date().toISOString()
  }));
}

async function listPaymentIntents(workspaceId: string, studentId?: string) {
  const { db } = getFirebaseAdminClients();
  const query = studentId
    ? db
        .collection(`workspaces/${workspaceId}/forex_autocopy_payment_intents`)
        .where("studentId", "==", studentId)
        .orderBy("updatedAt", "desc")
        .limit(FOREX_PROVISIONING_READ_LIMIT)
    : db
        .collection(`workspaces/${workspaceId}/forex_autocopy_payment_intents`)
        .orderBy("updatedAt", "desc")
        .limit(FOREX_PROVISIONING_READ_LIMIT);
  const snapshot = await query.get();

  return snapshot.docs.map((doc) => mapPaymentIntentSummary(doc.data(), doc.id));
}

async function listStudentRequests(workspaceId: string, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students/${studentId}/forex_provisioning_requests`)
    .orderBy("updatedAt", "desc")
    .limit(FOREX_PROVISIONING_READ_LIMIT)
    .get();

  return snapshot.docs.map((doc) => mapRequest(doc.data(), { workspaceId, studentId, requestId: doc.id }));
}

async function listStudentAccounts(workspaceId: string, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/forex_provisioned_accounts`)
    .where("studentId", "==", studentId)
    .orderBy("updatedAt", "desc")
    .limit(FOREX_PROVISIONING_READ_LIMIT)
    .get();

  return snapshot.docs.map((doc) => mapAccount(doc.data(), { workspaceId, accountId: doc.id }));
}

async function listAuditEvents(workspaceId: string, studentId?: string) {
  const { db } = getFirebaseAdminClients();
  const query = studentId
    ? db
        .collection(`workspaces/${workspaceId}/forex_provisioning_audit_events`)
        .where("studentId", "==", studentId)
        .orderBy("createdAt", "desc")
        .limit(FOREX_PROVISIONING_READ_LIMIT)
    : db
        .collection(`workspaces/${workspaceId}/forex_provisioning_audit_events`)
        .orderBy("createdAt", "desc")
        .limit(FOREX_PROVISIONING_READ_LIMIT);
  const snapshot = await query.get();

  return snapshot.docs.map((doc) => mapAudit(doc.data(), doc.id));
}

function emptyPreview(now = new Date().toISOString()): ForexProvisioningPreview {
  return {
    visibleLimit: FOREX_PROVISIONING_VISIBLE_LIMIT,
    billing: {
      status: "not_purchased",
      entitled: false,
      rail: "unknown",
      reason: "Select a workspace or purchase Forex AutoCopy before provisioning."
    },
    status: "not_purchased",
    canSubmitBrokerDetails: false,
    providerMode: "dry_run",
    paidStudentCount: 0,
    readyToConnectCount: 0,
    mockProvisionedCount: 0,
    disabledCount: 0,
    failedCount: 0,
    subscriptionCounts: {
      activePaid: 0,
      paymentPending: 0,
      paymentFailed: 0,
      pastDue: 0,
      cancelled: 0,
      expired: 0,
      notPurchased: 0
    },
    sampledStudentCount: 0,
    paymentIntents: [],
    requests: [],
    provisionedAccounts: [],
    auditEvents: [],
    bounded: {
      paymentIntents: false,
      requests: false,
      provisionedAccounts: false,
      auditEvents: false
    },
    warnings: ["Select a workspace to load Forex AutoCopy provisioning."],
    updatedAt: now
  };
}

export function emptyForexProvisioningPreview(updatedAt = new Date().toISOString()) {
  return emptyPreview(updatedAt);
}

export async function loadForexProvisioningPreview({
  workspaceId,
  studentId
}: {
  workspaceId: string;
  studentId?: string;
}): Promise<ForexProvisioningPreview> {
  const now = new Date().toISOString();

  if (studentId) {
    const [billing, paymentIntents, requests, accounts, auditEvents] = await Promise.all([
      loadForexBillingState(workspaceId, studentId),
      listPaymentIntents(workspaceId, studentId),
      listStudentRequests(workspaceId, studentId),
      listStudentAccounts(workspaceId, studentId),
      listAuditEvents(workspaceId, studentId)
    ]);
    const currentAccount = accounts.find((account) => account.active) ?? accounts[0];
    const status = currentAccount?.status ?? (billing.entitled ? "ready_to_connect" : "not_purchased");

    return {
      visibleLimit: FOREX_PROVISIONING_VISIBLE_LIMIT,
      billing,
      status,
      canSubmitBrokerDetails: billing.entitled && status !== "disabled" && status !== "cancelled",
      providerMode: providerMode(),
      paidStudentCount: billing.entitled ? 1 : 0,
      readyToConnectCount: billing.entitled && !currentAccount ? 1 : 0,
      mockProvisionedCount: accounts.filter((account) => account.status === "provisioning_dry_run_complete").length,
      disabledCount: accounts.filter((account) => account.status === "disabled" || account.status === "cleanup_complete").length,
      failedCount: accounts.filter((account) => account.status === "failed").length,
      subscriptionCounts: {
        activePaid: billing.status === "active_paid" ? 1 : 0,
        paymentPending: billing.status === "payment_pending" ? 1 : 0,
        paymentFailed: billing.status === "payment_failed" ? 1 : 0,
        pastDue: billing.status === "past_due" ? 1 : 0,
        cancelled: billing.status === "cancelled" ? 1 : 0,
        expired: billing.status === "expired" ? 1 : 0,
        notPurchased: billing.status === "not_purchased" ? 1 : 0
      },
      sampledStudentCount: 1,
      currentAccount: currentAccount ? toAccountSummary(currentAccount) : undefined,
      paymentIntents: paymentIntents.slice(0, FOREX_PROVISIONING_VISIBLE_LIMIT),
      requests: requests.slice(0, FOREX_PROVISIONING_VISIBLE_LIMIT).map(toRequestSummary),
      provisionedAccounts: accounts.slice(0, FOREX_PROVISIONING_VISIBLE_LIMIT).map(toAccountSummary),
      auditEvents: auditEvents.slice(0, FOREX_PROVISIONING_VISIBLE_LIMIT),
      bounded: {
        paymentIntents: paymentIntents.length > FOREX_PROVISIONING_VISIBLE_LIMIT,
        requests: requests.length > FOREX_PROVISIONING_VISIBLE_LIMIT,
        provisionedAccounts: accounts.length > FOREX_PROVISIONING_VISIBLE_LIMIT,
        auditEvents: auditEvents.length > FOREX_PROVISIONING_VISIBLE_LIMIT
      },
      warnings: [
        billing.reason,
        "Forex provisioning is dry-run/mock only. No MetaAPI account, cloud terminal, demo order, or live broker order is created."
      ],
      updatedAt: [
        ...requests.map((request) => request.updatedAt),
        ...paymentIntents.map((intent) => intent.updatedAt),
        ...accounts.map((account) => account.updatedAt),
        ...auditEvents.map((event) => event.createdAt),
        now
      ].sort((left, right) => right.localeCompare(left))[0]
    };
  }

  const { db } = getFirebaseAdminClients();
  const studentSnapshot = await db
    .collection(`workspaces/${workspaceId}/students`)
    .limit(FOREX_PROVISIONING_WORKSPACE_STUDENT_SAMPLE_LIMIT)
    .get();
  let paidStudentCount = 0;
  let readyToConnectCount = 0;
  let mockProvisionedCount = 0;
  let disabledCount = 0;
  let failedCount = 0;
  const subscriptionCounts = {
    activePaid: 0,
    paymentPending: 0,
    paymentFailed: 0,
    pastDue: 0,
    cancelled: 0,
    expired: 0,
    notPurchased: 0
  };
  const accounts: ForexProvisionedAccountRecord[] = [];

  await Promise.all(studentSnapshot.docs.map(async (studentDoc) => {
    const [billing, studentAccounts] = await Promise.all([
      loadForexBillingState(workspaceId, studentDoc.id),
      listStudentAccounts(workspaceId, studentDoc.id)
    ]);

    if (billing.entitled) {
      paidStudentCount += 1;
    }

    if (billing.status === "active_paid") {
      subscriptionCounts.activePaid += 1;
    } else if (billing.status === "payment_pending") {
      subscriptionCounts.paymentPending += 1;
    } else if (billing.status === "payment_failed") {
      subscriptionCounts.paymentFailed += 1;
    } else if (billing.status === "past_due") {
      subscriptionCounts.pastDue += 1;
    } else if (billing.status === "cancelled") {
      subscriptionCounts.cancelled += 1;
    } else if (billing.status === "expired") {
      subscriptionCounts.expired += 1;
    } else {
      subscriptionCounts.notPurchased += 1;
    }

    if (billing.entitled && studentAccounts.length === 0) {
      readyToConnectCount += 1;
    }

    for (const account of studentAccounts) {
      accounts.push(account);
      if (account.status === "provisioning_dry_run_complete") {
        mockProvisionedCount += 1;
      } else if (account.status === "disabled" || account.status === "cleanup_complete") {
        disabledCount += 1;
      } else if (account.status === "failed") {
        failedCount += 1;
      }
    }
  }));

  const [paymentIntents, auditEvents] = await Promise.all([
    listPaymentIntents(workspaceId),
    listAuditEvents(workspaceId)
  ]);
  const recentAccounts = accounts
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, FOREX_PROVISIONING_VISIBLE_LIMIT);

  return {
    visibleLimit: FOREX_PROVISIONING_VISIBLE_LIMIT,
    billing: {
      status: paidStudentCount > 0 ? "active_paid" : "not_purchased",
      entitled: paidStudentCount > 0,
      rail: "unknown",
      reason: "Workspace Forex AutoCopy provisioning is sampled from paid provisioning records."
    },
    status: mockProvisionedCount > 0 ? "provisioning_dry_run_complete" : paidStudentCount > 0 ? "ready_to_connect" : "not_purchased",
    canSubmitBrokerDetails: false,
    providerMode: providerMode(),
    paidStudentCount,
    readyToConnectCount,
    mockProvisionedCount,
    disabledCount,
    failedCount,
    subscriptionCounts,
    sampledStudentCount: studentSnapshot.docs.length,
    paymentIntents: paymentIntents.slice(0, FOREX_PROVISIONING_VISIBLE_LIMIT),
    provisionedAccounts: recentAccounts.map(toAccountSummary),
    requests: [],
    auditEvents: auditEvents.slice(0, FOREX_PROVISIONING_VISIBLE_LIMIT),
    bounded: {
      paymentIntents: paymentIntents.length > FOREX_PROVISIONING_VISIBLE_LIMIT,
      requests: false,
      provisionedAccounts: accounts.length > FOREX_PROVISIONING_VISIBLE_LIMIT,
      auditEvents: auditEvents.length > FOREX_PROVISIONING_VISIBLE_LIMIT,
      sampledStudents: studentSnapshot.docs.length === FOREX_PROVISIONING_WORKSPACE_STUDENT_SAMPLE_LIMIT
    },
    warnings: [
      "Forex AutoCopy provisioning is billing-gated and sampled. Broker passwords, raw broker server/login, provider credentials, account refs, and provider payloads are not returned.",
      "Stage 15R provisioning uses a mock/dry-run provider only and creates no MetaAPI resources."
    ],
    updatedAt: [
      ...accounts.map((account) => account.updatedAt),
      ...paymentIntents.map((intent) => intent.updatedAt),
      ...auditEvents.map((event) => event.createdAt),
      now
    ].sort((left, right) => right.localeCompare(left))[0]
  };
}

export async function cleanupForexProvisioningForSubscriptionLifecycle({
  workspaceId,
  studentId,
  actorId,
  actorType = "system",
  reason
}: {
  workspaceId: string;
  studentId: string;
  actorId: string;
  actorType?: "student" | "super_admin" | "influencer" | "system";
  reason: ForexAutoCopyBillingStatus | "student_disabled";
}) {
  if (reason !== "student_disabled" && !BILLING_DISABLED_STATUSES.has(reason)) {
    return false;
  }

  const { db } = getFirebaseAdminClients();
  const currentRef = db.doc(`workspaces/${workspaceId}/students/${studentId}/forex_provisioning/current`);
  const currentSnapshot = await currentRef.get();

  if (!currentSnapshot.exists) {
    await appendForexProvisioningAuditEvent({
      workspaceId,
      studentId,
      actorId,
      actorType,
      action: "forex_provisioning.cleanup_not_required",
      targetType: "cleanup",
      targetId: "current",
      safeMessage: "Forex AutoCopy billing is no longer active; no active mock provisioning account needed cleanup.",
      after: { reason, providerMode: "dry_run" }
    });
    return false;
  }

  const current = mapAccount(currentSnapshot.data() ?? {}, {
    workspaceId,
    accountId: safeString(currentSnapshot.get("accountId")) || "current"
  });

  if (!current.active && current.cleanupStatus === "complete") {
    return false;
  }

  const now = new Date().toISOString();
  const patch = {
    status: "cleanup_complete" as const,
    active: false,
    cleanupStatus: "complete" as const,
    disabledAt: now,
    disabledReason: reason,
    safeMessage: "Forex AutoCopy provisioning was disabled after billing changed. Mock cleanup completed without MetaAPI provider cost.",
    updatedAt: now
  };
  const batch = db.batch();

  batch.set(currentRef, patch, { merge: true });
  batch.set(db.doc(`workspaces/${workspaceId}/forex_provisioned_accounts/${current.accountId}`), patch, { merge: true });
  await batch.commit();

  await appendForexProvisioningAuditEvent({
    workspaceId,
    studentId,
    actorId,
    actorType,
    action: "forex_provisioning.billing_cleanup_complete",
    targetType: "cleanup",
    targetId: current.accountId,
    safeMessage: "Forex AutoCopy billing is no longer active. Mock provisioning account was marked inactive without MetaAPI calls.",
    after: {
      reason,
      provider: "mock",
      providerMode: "dry_run",
      cleanupStatus: "complete"
    },
    severity: "warning"
  });

  return true;
}

export async function createStudentForexProvisioning(actor: VerifiedStudent, payload: unknown) {
  const input = validateBrokerProvisioningPayload(payload);
  const base = await getStudentForexProvisioningBase(actor);
  assertForexProvisioningAllowed(base);
  const now = new Date().toISOString();
  const brokerServerFingerprint = hashRef(input.brokerServer);
  const brokerLoginFingerprint = hashRef(input.brokerLogin);
  const requestId = deterministicId(["forex_provisioning_request", actor.workspaceId, actor.studentId, input.platform, brokerServerFingerprint, brokerLoginFingerprint], 130);
  const accountId = deterministicId(["forex_provisioned_account", actor.workspaceId, actor.studentId, input.platform, brokerServerFingerprint, brokerLoginFingerprint], 130);
  const brokerServerRef = `server:${brokerServerFingerprint.slice(0, 8)}`;
  const brokerLoginRef = shortRef(input.brokerLogin, "login");
  const serverManagedBoundary = await prepareServerManagedMetaApiProvisioning({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    platform: input.platform,
    brokerServer: input.brokerServer,
    brokerLogin: input.brokerLogin,
    passwordForOneTimeSubmission: input.brokerPassword
  });
  const request: ForexProvisioningRequestRecord = {
    requestId,
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    platform: input.platform,
    provider: serverManagedBoundary.provider,
    providerMode: serverManagedBoundary.providerMode,
    status: "mock_completed",
    label: input.label,
    brokerServerRef,
    brokerLoginRef,
    brokerServerFingerprint,
    brokerLoginFingerprint,
    passwordHandling: serverManagedBoundary.passwordHandling,
    safeMessage: "Forex AutoCopy provisioning was recorded in mock dry-run mode. No MetaAPI resource, terminal, demo order, or live order was created.",
    createdAt: now,
    updatedAt: now
  };
  const account: ForexProvisionedAccountRecord = {
    accountId,
    requestId,
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    platform: input.platform,
    provider: serverManagedBoundary.provider,
    providerMode: serverManagedBoundary.providerMode,
    status: "provisioning_dry_run_complete",
    active: true,
    label: input.label,
    brokerServerRef,
    brokerLoginRef,
    brokerServerFingerprint,
    brokerLoginFingerprint,
    noBrokerExecution: true,
    noMetaApiResourceCreated: serverManagedBoundary.noMetaApiResourceCreated,
    cleanupStatus: "not_required",
    safeMessage: "Mock Forex AutoCopy account is provisioned for readiness only. No MetaAPI cost or broker execution is active.",
    createdAt: now,
    updatedAt: now
  };
  const { db } = getFirebaseAdminClients();
  const batch = db.batch();

  batch.set(db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/forex_provisioning/current`), stripUndefined(account), { merge: true });
  batch.set(db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/forex_provisioning_requests/${requestId}`), stripUndefined(request), { merge: true });
  batch.set(db.doc(`workspaces/${actor.workspaceId}/forex_provisioned_accounts/${accountId}`), stripUndefined(account), { merge: true });
  await batch.commit();

  await appendForexProvisioningAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: "forex_provisioning.mock_completed",
    targetType: "provisioned_account",
    targetId: accountId,
    safeMessage: "Paid Forex AutoCopy student submitted broker details and mock dry-run provisioning completed without storing the broker password.",
    after: {
      platform: input.platform,
      provider: "mock",
      providerMode: "dry_run",
      brokerServerRef,
      brokerLoginRef,
      passwordHandling: serverManagedBoundary.passwordHandling,
      noMetaApiResourceCreated: serverManagedBoundary.noMetaApiResourceCreated,
      serverManagedMetaApiProvisioningStatus: serverManagedBoundary.status,
      noBrokerExecution: true
    }
  });
}

export async function disableStudentForexProvisioning(actor: VerifiedStudent) {
  const base = await getStudentForexProvisioningBase(actor);
  assertForexProvisioningAllowed(base);
  const cleaned = await cleanupForexProvisioningForSubscriptionLifecycle({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    actorType: "student",
    reason: "student_disabled"
  });

  if (!cleaned) {
    throw new AdminApiError(404, "forex_provisioning_not_found", "No Forex AutoCopy provisioning record is active for this student.");
  }
}

export async function loadStudentForexProvisioningForExecution(workspaceId: string, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const [billing, currentSnapshot] = await Promise.all([
    loadForexBillingState(workspaceId, studentId),
    db.doc(`workspaces/${workspaceId}/students/${studentId}/forex_provisioning/current`).get()
  ]);

  if (!billing.entitled || !currentSnapshot.exists) {
    return null;
  }

  const account = mapAccount(currentSnapshot.data() ?? {}, {
    workspaceId,
    accountId: safeString(currentSnapshot.get("accountId")) || "current"
  });

  if (
    account.provider !== "mock" ||
    account.providerMode !== "dry_run" ||
    account.status !== "provisioning_dry_run_complete" ||
    account.noBrokerExecution !== true ||
    account.noMetaApiResourceCreated !== true ||
    !account.active
  ) {
    return null;
  }

  return account;
}
