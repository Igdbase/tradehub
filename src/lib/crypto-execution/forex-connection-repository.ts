import "server-only";

import {
  loadForexMetaApiToken,
  revokeForexMetaApiToken,
  storeForexMetaApiToken
} from "@/lib/crypto-execution/credential-vault";
import { loadForexLiveCanarySetupGate } from "@/lib/crypto-execution/forex-live-canary-execution";
import { getForexAutoCopyBillingState } from "@/lib/crypto-execution/forex-provisioning-repository";
import { getForexConnectionVerificationAdapter } from "@/lib/crypto-execution/forex";
import { mapSubscriptionRecord } from "@/lib/billing/billing-mappers";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import {
  mapStudentProfile,
  mapWorkspaceForStudent,
  recordFromSnapshot as studentRecordFromSnapshot
} from "@/lib/student-app/student-app-mappers";
import type {
  CredentialStorageState,
  ExecutionAuditSeverity,
  ForexAutoCopyBillingStatus,
  ForexBrokerConnectionRecord,
  ForexBrokerConnectionSummary,
  ForexConnectionAuditEventSummary,
  ForexConnectionEnvironment,
  ForexConnectionProvider,
  ForexConnectionReadinessPreview,
  ForexConnectionReadinessStatus,
  ForexConnectionStatus,
  PlatformExecutionControlRecord,
  WorkspaceExecutionControlRecord
} from "@/types/crypto-execution";
import type { StudentEntitlementSummary } from "@/types/entitlements";
import type { StudentSubscription } from "@/types/payments";
import type { StudentAppProfile } from "@/types/student-app";
import type { Workspace } from "@/types/workspace";
import {
  mapPlatformExecutionControlRecord,
  mapWorkspaceExecutionControlRecord,
  normalizeIsoDate,
  recordFromSnapshot
} from "@/lib/crypto-execution/crypto-execution-mappers";

const FOREX_CONNECTION_VISIBLE_LIMIT = 4;
const FOREX_CONNECTION_READ_LIMIT = FOREX_CONNECTION_VISIBLE_LIMIT + 1;
const FOREX_CONNECTION_STUDENT_LIMIT = 10;
const FOREX_CONNECTION_WORKSPACE_STUDENT_SAMPLE_LIMIT = 50;
const FOREX_LIVE_CANARY_NO_WITHDRAWAL_CONFIRMATION = "NO_WITHDRAWAL_NO_CUSTODY";

type StudentForexConnectionBase = {
  workspace: Workspace;
  student: StudentAppProfile;
  subscription: StudentSubscription | null;
  entitlements: StudentEntitlementSummary;
  workspaceControl: WorkspaceExecutionControlRecord;
  platformControl: PlatformExecutionControlRecord;
  forexBilling: {
    status: ForexAutoCopyBillingStatus;
    entitled: boolean;
    reason: string;
  };
};

type ForexConnectionPayload = {
  provider: ForexConnectionProvider;
  environment: ForexConnectionEnvironment;
  metaApiToken: string;
  metaApiAccountId: string;
  connectionLabel?: string;
  personalAccountAcknowledged: boolean;
  riskAcknowledged: boolean;
};

type ForexLiveCanaryConnectionPayload = {
  provider: ForexConnectionProvider;
  environment: "production";
  metaApiToken: string;
  metaApiAccountId: string;
  connectionLabel?: string;
  personalAccountAcknowledged: boolean;
  notFundedOrPropFirmAcknowledged: boolean;
  realMoneyRiskAcknowledged: boolean;
  noWithdrawalNoCustodyConfirmationText: string;
};

type OperatorForexLiveCanaryConnectionPayload = ForexLiveCanaryConnectionPayload & {
  workspaceId: string;
  studentId: string;
  tierId: string | null;
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

function safeConnectionId(value: unknown) {
  const normalized = safeString(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 90);

  if (!normalized) {
    throw new AdminApiError(400, "forex_connection_id_required", "A forex connection ID is required.");
  }

  return normalized;
}

function safeTargetId(value: unknown, code: string, message: string) {
  const normalized = safeString(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 90);

  if (!normalized) {
    throw new AdminApiError(400, code, message);
  }

  return normalized;
}

function deterministicConnectionId(provider: ForexConnectionProvider, fingerprint: string) {
  return `${provider}_${fingerprint}`.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 90);
}

function validateForexConnectionPayload(payload: unknown): ForexConnectionPayload {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "forex_connection_payload_invalid", "Forex connection details are required.");
  }

  const record = payload as Record<string, unknown>;
  const provider = record.provider === "metaapi" ? "metaapi" : null;
  const environment =
    record.environment === "demo" ||
    record.environment === "production" ||
    record.environment === "unknown"
      ? record.environment
      : null;
  const metaApiToken = safeString(record.metaApiToken);
  const metaApiAccountId = safeString(record.metaApiAccountId);

  if (!provider) {
    throw new AdminApiError(400, "forex_provider_invalid", "Choose MetaAPI as the forex connection provider.");
  }

  if (!environment) {
    throw new AdminApiError(400, "forex_environment_invalid", "Choose demo, production, or unknown for this MetaAPI connection.");
  }

  if (metaApiToken.length < 12 || metaApiToken.length > 4096) {
    throw new AdminApiError(400, "forex_token_invalid", "Enter a valid MetaAPI token for one-time server verification.");
  }

  if (metaApiAccountId.length < 6 || metaApiAccountId.length > 160) {
    throw new AdminApiError(400, "forex_account_id_invalid", "Enter the MetaAPI account ID to verify.");
  }

  if (!safeBoolean(record.personalAccountAcknowledged)) {
    throw new AdminApiError(400, "forex_personal_account_ack_required", "Confirm this is your personal broker/MetaAPI account.");
  }

  if (!safeBoolean(record.riskAcknowledged)) {
    throw new AdminApiError(400, "forex_paper_only_ack_required", "Confirm forex remains paper-only and cannot place broker trades yet.");
  }

  return {
    provider,
    environment,
    metaApiToken,
    metaApiAccountId,
    connectionLabel: safeString(record.connectionLabel).slice(0, 80) || undefined,
    personalAccountAcknowledged: true,
    riskAcknowledged: true
  };
}

function validateForexLiveCanaryConnectionPayload(payload: unknown): ForexLiveCanaryConnectionPayload {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "forex_live_canary_connection_payload_invalid", "Production MetaAPI connection details are required.");
  }

  const record = payload as Record<string, unknown>;
  const provider = record.provider === "metaapi" ? "metaapi" : null;
  const environment = record.environment === "production" ? "production" : null;
  const metaApiToken = safeString(record.metaApiToken);
  const metaApiAccountId = safeString(record.metaApiAccountId);
  const noWithdrawalNoCustodyConfirmationText = safeString(record.noWithdrawalNoCustodyConfirmationText);

  if (!provider) {
    throw new AdminApiError(400, "forex_provider_invalid", "Choose MetaAPI as the forex connection provider.");
  }

  if (!environment) {
    throw new AdminApiError(400, "forex_live_canary_production_required", "This setup flow accepts production MetaAPI accounts only.");
  }

  if (metaApiToken.length < 12 || metaApiToken.length > 4096) {
    throw new AdminApiError(400, "forex_token_invalid", "Enter a valid MetaAPI token for one-time server verification.");
  }

  if (metaApiAccountId.length < 6 || metaApiAccountId.length > 160) {
    throw new AdminApiError(400, "forex_account_id_invalid", "Enter the MetaAPI account ID to verify.");
  }

  if (!safeBoolean(record.personalAccountAcknowledged)) {
    throw new AdminApiError(400, "forex_personal_account_ack_required", "Confirm this is your personal MetaAPI broker account.");
  }

  if (!safeBoolean(record.notFundedOrPropFirmAcknowledged)) {
    throw new AdminApiError(400, "forex_no_funded_prop_ack_required", "Confirm this is not a funded-account or prop-firm broker account.");
  }

  if (!safeBoolean(record.realMoneyRiskAcknowledged)) {
    throw new AdminApiError(400, "forex_live_money_risk_ack_required", "Confirm you understand tiny live Forex canary setup involves real-money risk if every later order gate is enabled.");
  }

  if (noWithdrawalNoCustodyConfirmationText !== FOREX_LIVE_CANARY_NO_WITHDRAWAL_CONFIRMATION) {
    throw new AdminApiError(
      400,
      "forex_no_withdrawal_no_custody_confirmation_required",
      `Type ${FOREX_LIVE_CANARY_NO_WITHDRAWAL_CONFIRMATION} to confirm no withdrawal or custody capability is being granted to TradeHub.`
    );
  }

  return {
    provider,
    environment,
    metaApiToken,
    metaApiAccountId,
    connectionLabel: safeString(record.connectionLabel).slice(0, 80) || undefined,
    personalAccountAcknowledged: true,
    notFundedOrPropFirmAcknowledged: true,
    realMoneyRiskAcknowledged: true,
    noWithdrawalNoCustodyConfirmationText
  };
}

function validateOperatorForexLiveCanaryConnectionPayload(
  payload: unknown
): OperatorForexLiveCanaryConnectionPayload {
  const input = validateForexLiveCanaryConnectionPayload(payload);

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "forex_live_canary_connection_payload_invalid", "Production MetaAPI connection details are required.");
  }

  const record = payload as Record<string, unknown>;

  return {
    ...input,
    workspaceId: safeTargetId(record.workspaceId, "workspace_required", "Choose a workspace for operator MetaAPI canary setup."),
    studentId: safeTargetId(record.studentId, "student_required", "Choose a student for operator MetaAPI canary setup."),
    tierId: safeString(record.tierId) || null
  };
}

function zeroConnectionCounts(): Record<ForexConnectionStatus, number> {
  return {
    pending: 0,
    verified: 0,
    rejected: 0,
    disabled: 0,
    error: 0
  };
}

function zeroReadinessCounts(): Record<ForexConnectionReadinessStatus, number> {
  return {
    not_connected: 0,
    metadata_ready: 0,
    token_storage_blocked: 0,
    verification_failed: 0,
    disabled: 0,
    paper_only_ready: 0
  };
}

function mapForexConnectionRecord(
  record: Record<string, unknown>,
  ids: { workspaceId: string; studentId: string; connectionId: string }
): ForexBrokerConnectionRecord {
  const status: ForexConnectionStatus =
    record.status === "verified" ||
    record.status === "pending" ||
    record.status === "rejected" ||
    record.status === "disabled" ||
    record.status === "error"
      ? record.status
      : "pending";
  const readinessStatus: ForexConnectionReadinessStatus =
    record.readinessStatus === "metadata_ready" ||
    record.readinessStatus === "token_storage_blocked" ||
    record.readinessStatus === "verification_failed" ||
    record.readinessStatus === "disabled" ||
    record.readinessStatus === "paper_only_ready"
      ? record.readinessStatus
      : "not_connected";
  const environment: ForexConnectionEnvironment =
    record.environment === "demo" ||
    record.environment === "production" ||
    record.environment === "unknown"
      ? record.environment
      : "unknown";
  const platform = record.platform === "mt4" || record.platform === "mt5"
    ? record.platform
    : "unknown";
  const storageState: CredentialStorageState =
    record.tokenVaultStatus === "metadata_only" ||
    record.tokenVaultStatus === "pending_encrypted_storage" ||
    record.tokenVaultStatus === "encrypted_reference_ready" ||
    record.tokenVaultStatus === "rotation_required" ||
    record.tokenVaultStatus === "revoked"
      ? record.tokenVaultStatus
      : "not_collected";

  return {
    connectionId: ids.connectionId,
    workspaceId: safeString(record.workspaceId) || ids.workspaceId,
    studentId: safeString(record.studentId) || ids.studentId,
    provider: "metaapi",
    environment,
    status,
    readinessStatus,
    connectionLabel: safeString(record.connectionLabel) || "MetaAPI broker connection",
    providerAccountFingerprint: safeString(record.providerAccountFingerprint) || undefined,
    brokerName: safeString(record.brokerName) || undefined,
    platform,
    serverName: safeString(record.serverName) || undefined,
    baseCurrency: safeString(record.baseCurrency) || undefined,
    providerState: safeString(record.providerState) || undefined,
    providerConnectionStatus: safeString(record.providerConnectionStatus) || undefined,
    tokenVaultStatus: storageState,
    tokenLastStoredAt: record.tokenLastStoredAt ? normalizeIsoDate(record.tokenLastStoredAt) : undefined,
    lastCheckedAt: record.lastCheckedAt ? normalizeIsoDate(record.lastCheckedAt) : undefined,
    disabledAt: record.disabledAt ? normalizeIsoDate(record.disabledAt) : undefined,
    disabledReason: safeString(record.disabledReason) || undefined,
    noTradeExecution: true,
    supportSafeMessage: safeString(record.supportSafeMessage) || "Forex connection metadata is pending verification.",
    createdAt: normalizeIsoDate(record.createdAt),
    updatedAt: normalizeIsoDate(record.updatedAt)
  };
}

function toForexConnectionSummary(record: ForexBrokerConnectionRecord): ForexBrokerConnectionSummary {
  return record;
}

function mapForexAuditEvent(record: Record<string, unknown>, eventId: string): ForexConnectionAuditEventSummary {
  const targetType =
    record.targetType === "token_vault" ||
    record.targetType === "provider_verification" ||
    record.targetType === "forex_connection"
      ? record.targetType
      : "forex_connection";
  const severity: ExecutionAuditSeverity =
    record.severity === "warning" || record.severity === "critical" ? record.severity : "info";

  return {
    eventId,
    action: safeString(record.action) || "forex_connection.event",
    actorType: record.actorType === "student" || record.actorType === "system" || record.actorType === "super_admin"
      ? record.actorType
      : "system",
    studentId: safeString(record.studentId) || undefined,
    targetType,
    targetId: safeString(record.targetId) || "unknown",
    safeMessage: safeString(record.safeMessage) || "Forex connection audit event recorded.",
    severity,
    createdAt: normalizeIsoDate(record.createdAt)
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

async function getStudentForexConnectionBase(actor: VerifiedStudent): Promise<StudentForexConnectionBase> {
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
    getForexAutoCopyBillingState(actor.workspaceId, actor.studentId)
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This student workspace is not prepared yet.");
  }

  if (!studentSnapshot.exists) {
    throw new AdminApiError(
      403,
      "student_record_required",
      "This student account has not been provisioned inside this workspace yet."
    );
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
    subscription,
    entitlements,
    workspaceControl,
    platformControl,
    forexBilling
  };
}

function assertEligibleForForexConnection(base: StudentForexConnectionBase) {
  const autoCopyEntitlement = base.entitlements.features.autoCopy;

  if (autoCopyEntitlement.access !== "allowed") {
    throw new AdminApiError(403, "auto_copy_not_entitled", autoCopyEntitlement.reason);
  }

  if (base.entitlements.riskPosture !== "personal_account") {
    throw new AdminApiError(
      403,
      "personal_account_required",
      "Only personal broker/MetaAPI accounts can be prepared for future forex Auto-Copy."
    );
  }

  if (base.platformControl.killSwitchEnabled) {
    throw new AdminApiError(
      423,
      "platform_execution_paused",
      base.platformControl.killSwitchReason || "Platform Auto-Copy setup is paused."
    );
  }

  if (base.workspaceControl.killSwitchEnabled) {
    throw new AdminApiError(
      423,
      "workspace_execution_paused",
      base.workspaceControl.killSwitchReason || "Workspace Auto-Copy setup is paused."
    );
  }
}

function assertForexConnectionCreationAllowed(
  base: StudentForexConnectionBase,
  environment: ForexConnectionEnvironment
) {
  if (!base.forexBilling.entitled) {
    throw new AdminApiError(
      403,
      "forex_autocopy_not_purchased",
      base.forexBilling.reason
    );
  }

  if (environment !== "demo") {
    throw new AdminApiError(
      403,
      "forex_metaapi_demo_only",
      "MetaAPI proof is demo-only until live Forex trading is explicitly enabled."
    );
  }
}

async function assertForexLiveCanaryConnectionSetupAllowed(base: StudentForexConnectionBase) {
  if (base.forexBilling.status !== "active_paid" || !base.forexBilling.entitled) {
    throw new AdminApiError(
      403,
      "forex_autocopy_not_purchased",
      base.forexBilling.reason
    );
  }

  const setupGate = await loadForexLiveCanarySetupGate(base.workspace.workspaceId);

  if (!setupGate.setupEnabled) {
    throw new AdminApiError(
      403,
      "forex_live_canary_setup_disabled",
      setupGate.reason
    );
  }
}

function assertForexConnectionRefreshAllowed(
  base: StudentForexConnectionBase,
  connection: ForexBrokerConnectionRecord
) {
  if (!base.forexBilling.entitled) {
    throw new AdminApiError(
      403,
      "forex_autocopy_not_purchased",
      base.forexBilling.reason
    );
  }

  if (connection.environment !== "demo") {
    throw new AdminApiError(
      403,
      "forex_metaapi_demo_only",
      "MetaAPI refresh proof is demo-only until live Forex trading is explicitly enabled."
    );
  }
}

async function appendForexConnectionAuditEvent({
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
  actorType?: "student" | "system" | "super_admin";
  action: string;
  targetType: ForexConnectionAuditEventSummary["targetType"];
  targetId: string;
  safeMessage: string;
  after?: Record<string, unknown>;
  severity?: ExecutionAuditSeverity;
}) {
  const { db } = getFirebaseAdminClients();
  const eventRef = db.collection(`workspaces/${workspaceId}/forex_connection_audit_events`).doc();

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

async function writeForexConnectionMetadata(input: Partial<ForexBrokerConnectionRecord> & {
  workspaceId: string;
  studentId: string;
  connectionId: string;
}) {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();

  await db
    .doc(`workspaces/${input.workspaceId}/students/${input.studentId}/forex_connections/${input.connectionId}`)
    .set(stripUndefined({
      provider: "metaapi",
      noTradeExecution: true,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
      ...input
    }), { merge: true });
}

async function getStudentForexConnectionRecord(actor: VerifiedStudent, connectionIdValue: unknown) {
  const connectionId = safeConnectionId(connectionIdValue);
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/forex_connections/${connectionId}`)
    .get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "forex_connection_not_found", "That forex connection was not found.");
  }

  return mapForexConnectionRecord(recordFromSnapshot(snapshot, "connectionId"), {
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId
  });
}

export async function createStudentForexConnection(actor: VerifiedStudent, payload: unknown) {
  const input = validateForexConnectionPayload(payload);
  const base = await getStudentForexConnectionBase(actor);
  assertEligibleForForexConnection(base);
  assertForexConnectionCreationAllowed(base, input.environment);
  const adapter = getForexConnectionVerificationAdapter(input.provider);
  const verification = await adapter(input);
  const connectionId = deterministicConnectionId(
    input.provider,
    verification.providerAccountFingerprint ?? `${Date.now()}`
  );

  await appendForexConnectionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: "forex_connection.verification_attempted",
    targetType: "provider_verification",
    targetId: connectionId,
    safeMessage: "MetaAPI account metadata verification was attempted.",
    after: {
      provider: input.provider,
      environment: input.environment
    }
  });

  if (!verification.ok) {
    await writeForexConnectionMetadata({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId,
      provider: input.provider,
      environment: input.environment,
      status: verification.status,
      readinessStatus: verification.readinessStatus,
      connectionLabel: input.connectionLabel ?? "MetaAPI broker connection",
      providerAccountFingerprint: verification.providerAccountFingerprint,
      tokenVaultStatus: "not_collected",
      lastCheckedAt: new Date().toISOString(),
      noTradeExecution: true,
      supportSafeMessage: verification.safeMessage,
      disabledReason: verification.sanitizedFailureCode
    });
    await appendForexConnectionAuditEvent({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      actorId: actor.uid,
      action: "forex_connection.rejected",
      targetType: "forex_connection",
      targetId: connectionId,
      safeMessage: verification.safeMessage,
      after: {
        provider: input.provider,
        status: verification.status,
        sanitizedFailureCode: verification.sanitizedFailureCode
      },
      severity: "warning"
    });

    throw new AdminApiError(
      400,
      verification.sanitizedFailureCode ?? "forex_connection_verification_failed",
      verification.safeMessage
    );
  }

  let storedToken;

  try {
    storedToken = await storeForexMetaApiToken({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId,
      provider: input.provider,
      environment: verification.environment,
      metaApiToken: input.metaApiToken,
      metaApiAccountId: input.metaApiAccountId
    });
  } catch (error) {
    const message = error instanceof AdminApiError
      ? error.message
      : "Forex token storage is unavailable.";

    await writeForexConnectionMetadata({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId,
      provider: input.provider,
      environment: verification.environment,
      status: "error",
      readinessStatus: "token_storage_blocked",
      connectionLabel: input.connectionLabel ?? "MetaAPI broker connection",
      providerAccountFingerprint: verification.providerAccountFingerprint,
      brokerName: verification.brokerName,
      platform: verification.platform,
      serverName: verification.serverName,
      baseCurrency: verification.baseCurrency,
      providerState: verification.providerState,
      providerConnectionStatus: verification.providerConnectionStatus,
      tokenVaultStatus: "pending_encrypted_storage",
      lastCheckedAt: new Date().toISOString(),
      noTradeExecution: true,
      supportSafeMessage: message,
      disabledReason: "forex_token_storage_unavailable"
    });

    throw error;
  }

  await writeForexConnectionMetadata({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId,
    provider: input.provider,
    environment: verification.environment,
    status: "verified",
    readinessStatus: "paper_only_ready",
    connectionLabel: input.connectionLabel ?? "MetaAPI broker connection",
    providerAccountFingerprint: verification.providerAccountFingerprint,
    brokerName: verification.brokerName,
    platform: verification.platform,
    serverName: verification.serverName,
    baseCurrency: verification.baseCurrency,
    providerState: verification.providerState,
    providerConnectionStatus: verification.providerConnectionStatus,
    tokenVaultStatus: storedToken.storageState,
    tokenLastStoredAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    noTradeExecution: true,
    supportSafeMessage: verification.safeMessage
  });
  await appendForexConnectionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: "forex_connection.verified",
    targetType: "forex_connection",
    targetId: connectionId,
    safeMessage: verification.safeMessage,
    after: {
      provider: input.provider,
      environment: verification.environment,
      status: "verified",
      tokenVaultStatus: storedToken.storageState,
      noTradeExecution: true
    }
  });
}

export async function createStudentForexLiveCanaryConnection(
  actor: VerifiedStudent,
  payload: unknown,
  auditActorType: "student" | "super_admin" = "student"
) {
  const input = validateForexLiveCanaryConnectionPayload(payload);
  const base = await getStudentForexConnectionBase(actor);
  assertEligibleForForexConnection(base);
  await assertForexLiveCanaryConnectionSetupAllowed(base);

  const adapter = getForexConnectionVerificationAdapter(input.provider);
  const verification = await adapter({
    provider: input.provider,
    environment: "production",
    metaApiToken: input.metaApiToken,
    metaApiAccountId: input.metaApiAccountId
  });
  const connectionId = deterministicConnectionId(
    input.provider,
    verification.providerAccountFingerprint ?? `${Date.now()}`
  );

  await appendForexConnectionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    actorType: auditActorType,
    action: "forex_live_canary_connection.production_verification_attempted",
    targetType: "provider_verification",
    targetId: connectionId,
    safeMessage: "Production MetaAPI account metadata verification was attempted for tiny live Forex canary setup. No order endpoint was called.",
    after: {
      provider: input.provider,
      environment: "production"
    }
  });

  const productionVerified = verification.ok && verification.environment === "production";

  if (!productionVerified) {
    const sanitizedFailureCode = verification.ok
      ? "forex_live_canary_production_account_required"
      : verification.sanitizedFailureCode ?? "forex_live_canary_connection_verification_failed";
    const safeMessage = verification.ok
      ? "Tiny live Forex canary setup requires production MetaAPI account metadata; demo accounts must use the demo-only flow."
      : verification.safeMessage;

    await writeForexConnectionMetadata({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId,
      provider: input.provider,
      environment: verification.environment,
      status: verification.ok ? "rejected" : verification.status,
      readinessStatus: verification.ok ? "verification_failed" : verification.readinessStatus,
      connectionLabel: input.connectionLabel ?? "Production MetaAPI connection for tiny live Forex canary",
      providerAccountFingerprint: verification.providerAccountFingerprint,
      tokenVaultStatus: "not_collected",
      lastCheckedAt: new Date().toISOString(),
      noTradeExecution: true,
      supportSafeMessage: safeMessage,
      disabledReason: sanitizedFailureCode
    });
    await appendForexConnectionAuditEvent({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      actorId: actor.uid,
      actorType: auditActorType,
      action: "forex_live_canary_connection.rejected",
      targetType: "forex_connection",
      targetId: connectionId,
      safeMessage,
      after: {
        provider: input.provider,
        environment: verification.environment,
        status: verification.ok ? "rejected" : verification.status,
        sanitizedFailureCode
      },
      severity: "warning"
    });

    throw new AdminApiError(400, sanitizedFailureCode, safeMessage);
  }

  let storedToken;

  try {
    storedToken = await storeForexMetaApiToken({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId,
      provider: input.provider,
      environment: "production",
      metaApiToken: input.metaApiToken,
      metaApiAccountId: input.metaApiAccountId
    });
  } catch (error) {
    const message = error instanceof AdminApiError
      ? error.message
      : "Forex token storage is unavailable.";

    await writeForexConnectionMetadata({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      connectionId,
      provider: input.provider,
      environment: "production",
      status: "error",
      readinessStatus: "token_storage_blocked",
      connectionLabel: input.connectionLabel ?? "Production MetaAPI connection for tiny live Forex canary",
      providerAccountFingerprint: verification.providerAccountFingerprint,
      brokerName: verification.brokerName,
      platform: verification.platform,
      serverName: verification.serverName,
      baseCurrency: verification.baseCurrency,
      providerState: verification.providerState,
      providerConnectionStatus: verification.providerConnectionStatus,
      tokenVaultStatus: "pending_encrypted_storage",
      lastCheckedAt: new Date().toISOString(),
      noTradeExecution: true,
      supportSafeMessage: message,
      disabledReason: "forex_live_canary_token_storage_unavailable"
    });

    throw error;
  }

  await writeForexConnectionMetadata({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId,
    provider: input.provider,
    environment: "production",
    status: "verified",
    readinessStatus: "paper_only_ready",
    connectionLabel: input.connectionLabel ?? "Production MetaAPI connection for tiny live Forex canary",
    providerAccountFingerprint: verification.providerAccountFingerprint,
    brokerName: verification.brokerName,
    platform: verification.platform,
    serverName: verification.serverName,
    baseCurrency: verification.baseCurrency,
    providerState: verification.providerState,
    providerConnectionStatus: verification.providerConnectionStatus,
    tokenVaultStatus: storedToken.storageState,
    tokenLastStoredAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    noTradeExecution: true,
    supportSafeMessage: "Production MetaAPI account metadata verified for tiny live Forex canary setup. Live order calls remain separately gated."
  });
  await appendForexConnectionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    actorType: auditActorType,
    action: "forex_live_canary_connection.verified",
    targetType: "forex_connection",
    targetId: connectionId,
    safeMessage: "Production MetaAPI account metadata was verified and the access token was stored server-side encrypted. No order endpoint was called.",
    after: {
      provider: input.provider,
      environment: "production",
      status: "verified",
      providerAccountFingerprint: verification.providerAccountFingerprint,
      tokenVaultStatus: storedToken.storageState,
      noTradeExecution: true
    }
  });
}

export async function createOperatorForexLiveCanaryConnection(
  actor: VerifiedSuperAdmin,
  payload: unknown
) {
  const input = validateOperatorForexLiveCanaryConnectionPayload(payload);
  const targetActor: VerifiedStudent = {
    uid: actor.uid,
    email: actor.email,
    workspaceId: input.workspaceId,
    studentId: input.studentId,
    tierId: input.tierId,
    token: actor.token
  };

  await createStudentForexLiveCanaryConnection(targetActor, input, "super_admin");

  return {
    workspaceId: input.workspaceId,
    studentId: input.studentId
  };
}

export async function refreshStudentForexConnection(actor: VerifiedStudent, connectionIdValue: unknown) {
  const base = await getStudentForexConnectionBase(actor);
  assertEligibleForForexConnection(base);
  const connection = await getStudentForexConnectionRecord(actor, connectionIdValue);
  assertForexConnectionRefreshAllowed(base, connection);

  await appendForexConnectionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: "forex_connection.refresh_attempted",
    targetType: "provider_verification",
    targetId: connection.connectionId,
    safeMessage: "MetaAPI connection metadata refresh was attempted.",
    after: {
      provider: connection.provider,
      environment: connection.environment
    }
  });

  const credential = await loadForexMetaApiToken({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId: connection.connectionId
  });
  const adapter = getForexConnectionVerificationAdapter(connection.provider);
  const verification = await adapter({
    provider: connection.provider,
    environment: connection.environment,
    metaApiToken: credential.metaApiToken,
    metaApiAccountId: credential.metaApiAccountId
  });

  await writeForexConnectionMetadata({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId: connection.connectionId,
    provider: connection.provider,
    environment: verification.environment,
    status: verification.ok ? "verified" : "error",
    readinessStatus: verification.ok ? "paper_only_ready" : "verification_failed",
    brokerName: verification.brokerName,
    platform: verification.platform,
    serverName: verification.serverName,
    baseCurrency: verification.baseCurrency,
    providerState: verification.providerState,
    providerConnectionStatus: verification.providerConnectionStatus,
    lastCheckedAt: new Date().toISOString(),
    supportSafeMessage: verification.safeMessage,
    disabledReason: verification.ok ? undefined : verification.sanitizedFailureCode
  });

  if (!verification.ok) {
    await appendForexConnectionAuditEvent({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      actorId: actor.uid,
      action: "forex_connection.refresh_failed",
      targetType: "forex_connection",
      targetId: connection.connectionId,
      safeMessage: verification.safeMessage,
      after: {
        provider: connection.provider,
        status: "error",
        sanitizedFailureCode: verification.sanitizedFailureCode
      },
      severity: "warning"
    });

    throw new AdminApiError(
      400,
      verification.sanitizedFailureCode ?? "forex_connection_refresh_failed",
      verification.safeMessage
    );
  }
}

export async function disableStudentForexConnection(actor: VerifiedStudent, connectionIdValue: unknown) {
  const base = await getStudentForexConnectionBase(actor);
  assertEligibleForForexConnection(base);
  const connection = await getStudentForexConnectionRecord(actor, connectionIdValue);
  const now = new Date().toISOString();

  await revokeForexMetaApiToken({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId: connection.connectionId
  });
  await writeForexConnectionMetadata({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    connectionId: connection.connectionId,
    status: "disabled",
    readinessStatus: "disabled",
    tokenVaultStatus: "revoked",
    disabledAt: now,
    disabledReason: "student_disabled",
    supportSafeMessage: "The student disabled this MetaAPI connection. Forex remains paper-only."
  });
  await appendForexConnectionAuditEvent({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    actorId: actor.uid,
    action: "forex_connection.disabled",
    targetType: "forex_connection",
    targetId: connection.connectionId,
    safeMessage: "Student disabled a MetaAPI forex connection.",
    after: {
      provider: connection.provider,
      status: "disabled"
    }
  });
}

export function emptyForexConnectionReadinessPreview(updatedAt = new Date().toISOString()): ForexConnectionReadinessPreview {
  return {
    visibleLimit: FOREX_CONNECTION_VISIBLE_LIMIT,
    connectionCounts: zeroConnectionCounts(),
    readinessCounts: zeroReadinessCounts(),
    verifiedCount: 0,
    disabledCount: 0,
    recentFailureCount: 0,
    sampledConnectionCount: 0,
    connections: [],
    auditEvents: [],
    bounded: {
      connections: false,
      auditEvents: false
    },
    warnings: ["Select a workspace to load forex connection readiness."],
    liveCanarySetup: {
      setupEnabled: false,
      reason: "Select a workspace to load tiny live Forex canary setup status.",
      productionConnectionReady: false,
      providerAccountFingerprintAvailable: false
    },
    updatedAt
  };
}

function isProductionCanaryConnectionReady(connection: ForexBrokerConnectionRecord) {
  return connection.provider === "metaapi" &&
    connection.environment === "production" &&
    connection.status === "verified" &&
    connection.readinessStatus === "paper_only_ready" &&
    connection.tokenVaultStatus === "encrypted_reference_ready" &&
    Boolean(connection.providerAccountFingerprint);
}

async function listStudentConnections(workspaceId: string, studentId: string) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students/${studentId}/forex_connections`)
    .orderBy("updatedAt", "desc")
    .limit(FOREX_CONNECTION_READ_LIMIT)
    .get();

  return snapshot.docs.map((doc) =>
    mapForexConnectionRecord(recordFromSnapshot(doc, "connectionId"), {
      workspaceId,
      studentId,
      connectionId: doc.id
    })
  );
}

async function listAuditEvents(workspaceId: string, studentId?: string) {
  const { db } = getFirebaseAdminClients();
  let query = db
    .collection(`workspaces/${workspaceId}/forex_connection_audit_events`)
    .orderBy("createdAt", "desc")
    .limit(FOREX_CONNECTION_READ_LIMIT);

  if (studentId) {
    query = db
      .collection(`workspaces/${workspaceId}/forex_connection_audit_events`)
      .where("studentId", "==", studentId)
      .orderBy("createdAt", "desc")
      .limit(FOREX_CONNECTION_READ_LIMIT);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => mapForexAuditEvent(doc.data(), doc.id));
}

export async function loadForexConnectionReadinessPreview({
  workspaceId,
  studentId
}: {
  workspaceId: string;
  studentId?: string;
}): Promise<ForexConnectionReadinessPreview> {
  if (studentId) {
    const [connections, auditEvents, liveCanarySetupGate] = await Promise.all([
      listStudentConnections(workspaceId, studentId),
      listAuditEvents(workspaceId, studentId),
      loadForexLiveCanarySetupGate(workspaceId)
    ]);
    const visibleConnections = connections.slice(0, FOREX_CONNECTION_VISIBLE_LIMIT);
    const visibleAuditEvents = auditEvents.slice(0, FOREX_CONNECTION_VISIBLE_LIMIT);
    const connectionCounts = zeroConnectionCounts();
    const readinessCounts = zeroReadinessCounts();

    for (const connection of connections) {
      connectionCounts[connection.status] += 1;
      readinessCounts[connection.readinessStatus] += 1;
    }

    return {
      visibleLimit: FOREX_CONNECTION_VISIBLE_LIMIT,
      connectionCounts,
      readinessCounts,
      verifiedCount: connectionCounts.verified,
      disabledCount: connectionCounts.disabled,
      recentFailureCount: connectionCounts.error + connectionCounts.rejected,
      sampledConnectionCount: connections.length,
      connections: visibleConnections.map(toForexConnectionSummary),
      auditEvents: visibleAuditEvents,
      bounded: {
        connections: connections.length > FOREX_CONNECTION_VISIBLE_LIMIT,
        auditEvents: auditEvents.length > FOREX_CONNECTION_VISIBLE_LIMIT
      },
      warnings: [
        "Forex connections are readiness metadata only. No MetaAPI trade, broker demo order, or live forex order is enabled."
      ],
      liveCanarySetup: {
        setupEnabled: liveCanarySetupGate.setupEnabled,
        reason: liveCanarySetupGate.reason,
        productionConnectionReady: connections.some(isProductionCanaryConnectionReady),
        providerAccountFingerprintAvailable: connections.some((connection) =>
          connection.environment === "production" && Boolean(connection.providerAccountFingerprint)
        )
      },
      updatedAt: latestIso([
        ...connections.map((connection) => connection.updatedAt),
        ...auditEvents.map((event) => event.createdAt)
      ]) ?? new Date().toISOString()
    };
  }

  const { db } = getFirebaseAdminClients();
  const studentSnapshot = await db
    .collection(`workspaces/${workspaceId}/students`)
    .limit(FOREX_CONNECTION_WORKSPACE_STUDENT_SAMPLE_LIMIT)
    .get();
  const connectionCounts = zeroConnectionCounts();
  const readinessCounts = zeroReadinessCounts();
  const connections: ForexBrokerConnectionRecord[] = [];

  await Promise.all(studentSnapshot.docs.map(async (studentDoc) => {
    const studentConnections = await db
      .collection(`workspaces/${workspaceId}/students/${studentDoc.id}/forex_connections`)
      .orderBy("updatedAt", "desc")
      .limit(FOREX_CONNECTION_STUDENT_LIMIT)
      .get();

    for (const connectionDoc of studentConnections.docs) {
      const connection = mapForexConnectionRecord(recordFromSnapshot(connectionDoc, "connectionId"), {
        workspaceId,
        studentId: studentDoc.id,
        connectionId: connectionDoc.id
      });

      connections.push(connection);
      connectionCounts[connection.status] += 1;
      readinessCounts[connection.readinessStatus] += 1;
    }
  }));

  const [auditEvents, liveCanarySetupGate] = await Promise.all([
    listAuditEvents(workspaceId),
    loadForexLiveCanarySetupGate(workspaceId)
  ]);
  const recentConnections = [...connections]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, FOREX_CONNECTION_VISIBLE_LIMIT);

  return {
    visibleLimit: FOREX_CONNECTION_VISIBLE_LIMIT,
    connectionCounts,
    readinessCounts,
    verifiedCount: connectionCounts.verified,
    disabledCount: connectionCounts.disabled,
    recentFailureCount: connectionCounts.error + connectionCounts.rejected,
    sampledConnectionCount: connections.length,
    connections: recentConnections.map(toForexConnectionSummary),
    auditEvents: auditEvents.slice(0, FOREX_CONNECTION_VISIBLE_LIMIT),
    bounded: {
      connections: connections.length > FOREX_CONNECTION_VISIBLE_LIMIT,
      auditEvents: auditEvents.length > FOREX_CONNECTION_VISIBLE_LIMIT,
      sampledStudents: studentSnapshot.docs.length === FOREX_CONNECTION_WORKSPACE_STUDENT_SAMPLE_LIMIT
    },
    warnings: [
      "Workspace forex connection readiness is sampled and support-safe. Token refs, broker account IDs, balances, and raw provider payloads are not returned."
    ],
    liveCanarySetup: {
      setupEnabled: liveCanarySetupGate.setupEnabled,
      reason: liveCanarySetupGate.reason,
      productionConnectionReady: connections.some(isProductionCanaryConnectionReady),
      providerAccountFingerprintAvailable: connections.some((connection) =>
        connection.environment === "production" && Boolean(connection.providerAccountFingerprint)
      )
    },
    updatedAt: latestIso([
      ...connections.map((connection) => connection.updatedAt),
      ...auditEvents.map((event) => event.createdAt)
    ]) ?? new Date().toISOString()
  };
}

function latestIso(values: string[]) {
  return values
    .filter((value) => value && Number.isFinite(Date.parse(value)))
    .sort((left, right) => right.localeCompare(left))[0];
}
