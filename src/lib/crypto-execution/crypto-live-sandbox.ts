import "server-only";

import crypto from "crypto";
import { mapSubscriptionRecord, recordFromSnapshot as billingRecordFromSnapshot } from "@/lib/billing/billing-mappers";
import {
  evaluateStaleSignalPolicy,
  mapCrossAssetAutoCopyPreferencesRecord
} from "@/lib/crypto-execution/auto-copy-preferences";
import { isTradeCopierBillingActive } from "@/lib/student-copier/student-copier-billing";
import { loadExchangeCredential } from "@/lib/crypto-execution/credential-vault";
import {
  mapExchangeConnectionRecord,
  recordFromSnapshot as cryptoRecordFromSnapshot,
  toExchangeConnectionSummary
} from "@/lib/crypto-execution/crypto-execution-mappers";
import {
  getExchangeOrderCancelAdapter,
  getExchangeOrderPlacementAdapter,
  getExchangeOrderStatusAdapter
} from "@/lib/crypto-execution/exchanges/order-placement";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { isPublishedRoutableTradeHubSignalForMarket } from "@/lib/signals/tradehub-signal-source-guards";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import {
  mapWorkspaceForDashboard
} from "@/lib/workspace/dashboard-mappers";
import {
  canonicalSignalPair,
  normalizeSignalPairForMarket
} from "@/lib/workspace/signal-symbols";
import type {
  CryptoExchangeId,
  CrossAssetAutoCopyPreferencesRecord,
  CryptoLiveSandboxIntentStatus,
  ExchangeConnectionSummary,
  LiveSandboxAllowlistRecord,
  LiveSandboxCancelResponse,
  LiveSandboxConsentRecord,
  LiveSandboxExecutionControlRecord,
  LiveSandboxExecutionIntentRecord,
  LiveSandboxExecutionPreferencesRecord,
  LiveSandboxExecutionPreview,
  LiveSandboxOrderAttemptRecord,
  LiveSandboxReconciliationRecord,
  LiveSandboxReconciliationRunResponse,
  LiveSandboxRoutingSummary,
  LiveSandboxWorkerRunResponse
} from "@/types/crypto-execution";
import type { StudentEntitlementSummary } from "@/types/entitlements";
import type { WorkspaceSignalRecord } from "@/types/workspace-dashboard";

const LIVE_SANDBOX_CANDIDATE_LIMIT = 25;
const LIVE_SANDBOX_WORKER_LIMIT = 5;
const LIVE_SANDBOX_WORKER_MAX_LIMIT = 10;
const LIVE_SANDBOX_PREVIEW_LIMIT = 4;
const LIVE_SANDBOX_READ_LIMIT = LIVE_SANDBOX_PREVIEW_LIMIT + 1;
const CONNECTION_STALE_MS = 1000 * 60 * 60 * 24;
const DEFAULT_NOTIONAL_USDT = 10;
const LIVE_SANDBOX_RECONCILABLE_STATUSES: CryptoLiveSandboxIntentStatus[] = [
  "submitted_live",
  "partially_filled_live",
  "cancel_requested",
  "cancel_submitted",
  "reconcile_required"
];

type LiveSandboxGateDecision = {
  allowed: boolean;
  checks: Array<{
    key: string;
    status: "allowed" | "blocked";
    message: string;
  }>;
  blockedReason?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

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

function createSourceMeta(warnings: string[] = []) {
  return {
    source: "firestore" as const,
    sourceLabel: "Firestore live",
    sourceMessage: "Live sandbox execution data was handled through server-side Firebase Admin SDK routes.",
    warnings
  };
}

function sanitizeWorkspaceId(value: unknown) {
  return asString(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function normalizeLimit(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function canonicalSymbol(value: string) {
  return canonicalSignalPair(value);
}

function firstNumericLevel(value: string) {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function directionLevelsValid(signal: WorkspaceSignalRecord) {
  const entry = firstNumericLevel(signal.entry);
  const takeProfit = firstNumericLevel(signal.takeProfit);
  const stopLoss = firstNumericLevel(signal.stopLoss);

  if (!entry || !takeProfit || !stopLoss) {
    return false;
  }

  return signal.direction === "buy"
    ? takeProfit > entry && stopLoss < entry
    : takeProfit < entry && stopLoss > entry;
}

function signalVersionHash(signal: WorkspaceSignalRecord) {
  return crypto
    .createHash("sha256")
    .update([
      signal.signalId,
      signal.updatedAt,
      signal.pair,
      signal.direction,
      signal.entry,
      signal.takeProfit,
      signal.stopLoss
    ].join("|"))
    .digest("hex")
    .slice(0, 16);
}

function deterministicId(prefix: string, parts: string[], max = 120) {
  return `${prefix}_${parts.join("_")}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, max);
}

function exchangeClientOrderId(intentId: string) {
  return `thl_${crypto.createHash("sha256").update(intentId).digest("hex").slice(0, 28)}`;
}

function testnetOrdersEnabled() {
  return process.env.CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED === "true";
}

function maskReference(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();

  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}...${normalized.slice(-2)}`;
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

function check(key: string, allowed: boolean, message: string) {
  return {
    key,
    status: allowed ? "allowed" as const : "blocked" as const,
    message
  };
}

function normalizeControl(
  value: Record<string, unknown> | null,
  scope: "platform" | "workspace",
  workspaceId?: string
): LiveSandboxExecutionControlRecord {
  return {
    scope,
    workspaceId,
    sandboxTestnetEnabled: asBoolean(value?.sandboxTestnetEnabled, false),
    killSwitchEnabled: asBoolean(value?.killSwitchEnabled, false),
    killSwitchReason: asString(value?.killSwitchReason) || undefined,
    allowedExchanges: Array.isArray(value?.allowedExchanges)
      ? value.allowedExchanges.filter((entry): entry is CryptoExchangeId => entry === "binance" || entry === "bybit")
      : [],
    allowedSymbols: Array.isArray(value?.allowedSymbols)
      ? value.allowedSymbols.map((entry) => canonicalSymbol(String(entry))).filter(Boolean)
      : [],
    maxNotionalUsdt: asNumber(value?.maxNotionalUsdt, DEFAULT_NOTIONAL_USDT),
    maxDailyNotionalUsdt: asNumber(value?.maxDailyNotionalUsdt, 50),
    maxOpenOrdersPerStudent: asNumber(value?.maxOpenOrdersPerStudent, 1),
    updatedAt: asString(value?.updatedAt) || new Date().toISOString(),
    updatedBy: asString(value?.updatedBy) || undefined
  };
}

function normalizeConsent(value: Record<string, unknown> | null, workspaceId: string, studentId: string): LiveSandboxConsentRecord {
  const status = value?.status === "accepted" || value?.status === "revoked" || value?.status === "paused"
    ? value.status
    : "not_started";

  return {
    workspaceId,
    studentId,
    status,
    consentVersion: asString(value?.consentVersion) || "stage15h-live-sandbox-v1",
    acceptedAt: asString(value?.acceptedAt) || undefined,
    revokedAt: asString(value?.revokedAt) || undefined,
    pausedAt: asString(value?.pausedAt) || undefined,
    source: value?.source === "student_app" || value?.source === "fixture" || value?.source === "admin_seed"
      ? value.source
      : "fixture",
    personalExchangeConfirmed: asBoolean(value?.personalExchangeConfirmed, false),
    notFundedOrPropFirmConfirmed: asBoolean(value?.notFundedOrPropFirmConfirmed, false),
    withdrawalsDisabledConfirmed: asBoolean(value?.withdrawalsDisabledConfirmed, false),
    liveLossRiskConfirmed: asBoolean(value?.liveLossRiskConfirmed, false),
    updatedAt: asString(value?.updatedAt) || new Date().toISOString()
  };
}

function normalizePreferences(
  value: Record<string, unknown> | null,
  workspaceId: string,
  studentId: string
): LiveSandboxExecutionPreferencesRecord {
  return {
    workspaceId,
    studentId,
    studentPaused: asBoolean(value?.studentPaused, false),
    fixedNotionalUsdt: Math.max(1, asNumber(value?.fixedNotionalUsdt, DEFAULT_NOTIONAL_USDT)),
    maxDailyNotionalUsdt: Math.max(1, asNumber(value?.maxDailyNotionalUsdt, 50)),
    maxOpenOrders: Math.max(1, asNumber(value?.maxOpenOrders, 1)),
    allowedSymbols: Array.isArray(value?.allowedSymbols)
      ? value.allowedSymbols.map((entry) => canonicalSymbol(String(entry))).filter(Boolean)
      : [],
    updatedAt: asString(value?.updatedAt) || new Date().toISOString(),
    updatedBy: asString(value?.updatedBy) || undefined
  };
}

function normalizeAllowlist(
  value: Record<string, unknown> | null,
  workspaceId: string,
  allowlistId: "students" | "exchanges" | "symbols"
): LiveSandboxAllowlistRecord {
  return {
    workspaceId,
    allowlistId,
    studentIds: Array.isArray(value?.studentIds) ? value.studentIds.map(String) : [],
    exchanges: Array.isArray(value?.exchanges)
      ? value.exchanges.filter((entry): entry is CryptoExchangeId => entry === "binance" || entry === "bybit")
      : [],
    symbols: Array.isArray(value?.symbols)
      ? value.symbols.map((entry) => canonicalSymbol(String(entry))).filter(Boolean)
      : [],
    updatedAt: asString(value?.updatedAt) || new Date().toISOString(),
    updatedBy: asString(value?.updatedBy) || undefined
  };
}

async function getLiveSandboxControls(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const [platformSnapshot, workspaceSnapshot] = await Promise.all([
    db.doc("platform_live_execution_controls/current").get(),
    db.doc(`workspaces/${workspaceId}/live_execution_controls/current`).get()
  ]);

  return {
    platformControl: normalizeControl(
      platformSnapshot.exists ? cryptoRecordFromSnapshot(platformSnapshot, "controlId") : null,
      "platform"
    ),
    workspaceControl: normalizeControl(
      workspaceSnapshot.exists ? cryptoRecordFromSnapshot(workspaceSnapshot, "controlId") : null,
      "workspace",
      workspaceId
    )
  };
}

async function getLiveSandboxAllowlists(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const [students, exchanges, symbols] = await Promise.all([
    db.doc(`workspaces/${workspaceId}/live_allowlists/students`).get(),
    db.doc(`workspaces/${workspaceId}/live_allowlists/exchanges`).get(),
    db.doc(`workspaces/${workspaceId}/live_allowlists/symbols`).get()
  ]);

  return {
    students: normalizeAllowlist(students.exists ? cryptoRecordFromSnapshot(students, "allowlistId") : null, workspaceId, "students"),
    exchanges: normalizeAllowlist(exchanges.exists ? cryptoRecordFromSnapshot(exchanges, "allowlistId") : null, workspaceId, "exchanges"),
    symbols: normalizeAllowlist(symbols.exists ? cryptoRecordFromSnapshot(symbols, "allowlistId") : null, workspaceId, "symbols")
  };
}

function pickSandboxConnection(connections: ExchangeConnectionSummary[]) {
  return [...connections]
    .filter((connection) => connection.status === "verified" && connection.environment === "sandbox")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

function permissionFresh(connection: ExchangeConnectionSummary | undefined) {
  if (!connection?.lastVerifiedAt) {
    return false;
  }

  const verifiedAt = Date.parse(connection.lastVerifiedAt);
  return Number.isFinite(verifiedAt) && Date.now() - verifiedAt <= CONNECTION_STALE_MS;
}

function evaluateLiveSandboxGate({
  signal,
  entitlements,
  consent,
  preferences,
  autoCopyPreferences,
  connections,
  platformControl,
  workspaceControl,
  allowlists
}: {
  signal: WorkspaceSignalRecord;
  entitlements: StudentEntitlementSummary;
  consent: LiveSandboxConsentRecord;
  preferences: LiveSandboxExecutionPreferencesRecord;
  autoCopyPreferences: CrossAssetAutoCopyPreferencesRecord;
  connections: ExchangeConnectionSummary[];
  platformControl: LiveSandboxExecutionControlRecord;
  workspaceControl: LiveSandboxExecutionControlRecord;
  allowlists: Awaited<ReturnType<typeof getLiveSandboxAllowlists>>;
}): LiveSandboxGateDecision & {
  connection?: ExchangeConnectionSummary;
  symbol: string;
  notionalUsdt: number;
} {
  const symbol = normalizeSignalPairForMarket(signal.pair, "crypto") ?? "";
  const connection = pickSandboxConnection(connections);
  const exchange = connection?.exchange;
  const staleDecision = evaluateStaleSignalPolicy({
    signal,
    preferences: autoCopyPreferences
  });
  const notionalUsdt = Math.min(
    preferences.fixedNotionalUsdt,
    platformControl.maxNotionalUsdt,
    workspaceControl.maxNotionalUsdt
  );
  const checks = [
    check("signal_status", signal.status === "published", "Only newly published signals can create live sandbox intents."),
    check("signal_market", signal.market === "crypto", "Only crypto signals can create live sandbox intents."),
    check("signal_symbol", symbol !== "", "crypto_symbol_invalid_for_market"),
    check("signal_directional_levels", directionLevelsValid(signal), "Signal entry, take-profit, and stop-loss must match direction."),
    check("entitlement_auto_copy", entitlements.features.autoCopy.access === "allowed", entitlements.features.autoCopy.reason),
    check("subscription_active", entitlements.subscriptionActive, "Subscription must be active for sandbox live execution."),
    check("risk_posture", entitlements.riskPosture === "personal_account", "Funded-account and prop-firm students remain Signal Alerts only."),
    check("live_consent", consent.status === "accepted", "Explicit live sandbox consent is required."),
    check("live_consent_confirmations", consent.personalExchangeConfirmed && consent.notFundedOrPropFirmConfirmed && consent.withdrawalsDisabledConfirmed && consent.liveLossRiskConfirmed, "Live sandbox consent confirmations must all be accepted."),
    check("execution_mode", autoCopyPreferences.executionMode === "full_auto", autoCopyPreferences.executionMode === "confirm_before_execute" ? "Student requires confirmation before sandbox/testnet live execution." : "Student selected alerts-only mode."),
    check("stale_signal", staleDecision.outcome === "route_normally", staleDecision.safeMessage),
    check("student_pause", !preferences.studentPaused && !autoCopyPreferences.studentPaused && consent.status !== "paused" && autoCopyPreferences.consentStatus !== "paused" && autoCopyPreferences.consentStatus !== "revoked", "Student live sandbox pause or shared revoke state must be off."),
    check("platform_live_sandbox_enabled", platformControl.sandboxTestnetEnabled, "Platform live sandbox/testnet control must be enabled."),
    check("workspace_live_sandbox_enabled", workspaceControl.sandboxTestnetEnabled, "Workspace live sandbox/testnet control must be enabled."),
    check("platform_kill_switch", !platformControl.killSwitchEnabled, platformControl.killSwitchReason || "Platform live sandbox kill switch must be off."),
    check("workspace_kill_switch", !workspaceControl.killSwitchEnabled, workspaceControl.killSwitchReason || "Workspace live sandbox kill switch must be off."),
    check("student_allowlist", allowlists.students.studentIds?.includes(consent.studentId) === true, "Student must be live sandbox allowlisted."),
    check("symbol_allowlist", symbol !== "" && allowlists.symbols.symbols?.includes(symbol) === true, "Symbol must be live sandbox allowlisted."),
    check("sandbox_connection", Boolean(connection), "Verified sandbox/testnet exchange connection is required."),
    check("production_connection_block", connection?.environment === "sandbox", "Production exchange connections cannot be used by Stage 15H."),
    check("exchange_allowlist", Boolean(exchange && allowlists.exchanges.exchanges?.includes(exchange)), "Exchange must be live sandbox allowlisted."),
    check("permission_verification", connection?.permissionVerification === "passed", "Sandbox/testnet permission verification must have passed."),
    check("withdrawal_permission", connection?.withdrawalPermission === "confirmed_disabled", "Withdrawal permission must be confirmed disabled or impossible."),
    check("connection_freshness", permissionFresh(connection), "Sandbox/testnet permission verification must be fresh."),
    check("notional_cap", notionalUsdt > 0 && notionalUsdt <= platformControl.maxNotionalUsdt && notionalUsdt <= workspaceControl.maxNotionalUsdt, "Fixed notional must fit platform and workspace caps."),
    check("student_symbol_preferences", preferences.allowedSymbols.length === 0 || preferences.allowedSymbols.includes(symbol), "Student live sandbox symbol preferences must allow this symbol.")
  ];
  const blocked = checks.find((entry) => entry.status === "blocked");

  return {
    allowed: !blocked,
    checks,
    blockedReason: blocked?.message,
    connection,
    symbol,
    notionalUsdt
  };
}

function mapExchangeStatus(value: string | undefined): CryptoLiveSandboxIntentStatus {
  switch ((value ?? "").toLowerCase()) {
    case "new":
    case "accepted":
    case "created":
    case "submitted":
      return "submitted_live";
    case "partially_filled":
    case "partiallyfilled":
    case "partialfilled":
      return "partially_filled_live";
    case "filled":
      return "filled_live";
    case "rejected":
      return "rejected_live";
    case "canceled":
    case "cancelled":
      return "cancelled_live";
    case "expired":
      return "expired_live";
    case "cancel_requested":
      return "cancel_submitted";
    default:
      return "reconcile_required";
  }
}

async function appendLiveAuditEvent({
  actorType,
  actorId,
  workspaceId,
  studentId,
  action,
  targetType,
  targetId,
  safeMessage,
  after,
  severity = "info"
}: {
  actorType: "system" | "student" | "influencer" | "super_admin";
  actorId: string;
  workspaceId: string;
  studentId?: string;
  action: string;
  targetType: string;
  targetId: string;
  safeMessage: string;
  after?: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
}) {
  const { db } = getFirebaseAdminClients();
  const eventRef = db.collection(`workspaces/${workspaceId}/live_execution_audit_events`).doc();

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

export async function routePublishedCryptoSignalForLiveSandboxExecution({
  actor,
  signal
}: {
  actor: VerifiedInfluencer;
  signal: WorkspaceSignalRecord;
}): Promise<LiveSandboxRoutingSummary> {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const warnings: string[] = [];
  let readyCount = 0;
  let blockedCount = 0;
  let intentCount = 0;

  if (!isPublishedRoutableTradeHubSignalForMarket(signal, "crypto")) {
    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      routed: false,
      candidateLimit: LIVE_SANDBOX_CANDIDATE_LIMIT,
      candidateCount: 0,
      readyCount,
      blockedCount,
      intentCount,
      bounded: false,
      warnings: ["Live sandbox routing skipped because the signal is not a published crypto signal."],
      completedAt: now
    };
  }

  const workspaceSnapshot = await db.doc(`workspaces/${signal.workspaceId}`).get();

  if (!workspaceSnapshot.exists) {
    warnings.push("Live sandbox routing skipped because the workspace record was missing.");
    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      routed: false,
      candidateLimit: LIVE_SANDBOX_CANDIDATE_LIMIT,
      candidateCount: 0,
      readyCount,
      blockedCount,
      intentCount,
      bounded: false,
      warnings,
      completedAt: now
    };
  }

  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, signal.workspaceId);
  const [{ platformControl, workspaceControl }, allowlists, studentSnapshot] = await Promise.all([
    getLiveSandboxControls(signal.workspaceId),
    getLiveSandboxAllowlists(signal.workspaceId),
    db.collection(`workspaces/${signal.workspaceId}/students`).limit(LIVE_SANDBOX_CANDIDATE_LIMIT).get()
  ]);
  const bounded = studentSnapshot.docs.length === LIVE_SANDBOX_CANDIDATE_LIMIT;
  const version = signalVersionHash(signal);

  if (bounded) {
    warnings.push("Live sandbox routing reached the bounded student candidate window.");
  }

  for (const studentDoc of studentSnapshot.docs) {
    const studentRecord = cryptoRecordFromSnapshot(studentDoc, "studentId");
    const studentId = asString(studentRecord.studentId) || studentDoc.id;
    const [
      subscriptionSnapshot,
      consentSnapshot,
      preferencesSnapshot,
      autoCopyPreferenceSnapshot,
      connectionsSnapshot
    ] = await Promise.all([
      db.doc(`workspaces/${signal.workspaceId}/students/${studentId}/subscriptions/current`).get(),
      db.doc(`workspaces/${signal.workspaceId}/students/${studentId}/live_consents/current`).get(),
      db.doc(`workspaces/${signal.workspaceId}/students/${studentId}/live_execution_preferences/current`).get(),
      db.doc(`workspaces/${signal.workspaceId}/students/${studentId}/auto_copy_preferences/crypto`).get(),
      db.collection(`workspaces/${signal.workspaceId}/students/${studentId}/exchange_connections`)
        .orderBy("updatedAt", "desc")
        .limit(10)
        .get()
    ]);
    const subscription = subscriptionSnapshot.exists
      ? mapSubscriptionRecord(
          billingRecordFromSnapshot(subscriptionSnapshot, "subscriptionId"),
          signal.workspaceId,
          studentId
        )
      : null;
    const entitlements = resolveStudentEntitlements({
      workspace,
      studentRecord,
      subscription,
      claimedTierId: asString(studentRecord.tierId) || null
    });
    const consent = normalizeConsent(
      consentSnapshot.exists ? cryptoRecordFromSnapshot(consentSnapshot, "consentId") : null,
      signal.workspaceId,
      studentId
    );
    const preferences = normalizePreferences(
      preferencesSnapshot.exists ? cryptoRecordFromSnapshot(preferencesSnapshot, "preferenceId") : null,
      signal.workspaceId,
      studentId
    );
    const autoCopyPreferences = mapCrossAssetAutoCopyPreferencesRecord({
      record: autoCopyPreferenceSnapshot.exists
        ? cryptoRecordFromSnapshot(autoCopyPreferenceSnapshot, "preferenceId")
        : null,
      workspaceId: signal.workspaceId,
      studentId,
      market: "crypto"
    });
    const connections = connectionsSnapshot.docs.map((snapshot) =>
      toExchangeConnectionSummary(mapExchangeConnectionRecord(
        cryptoRecordFromSnapshot(snapshot, "connectionId"),
        { workspaceId: signal.workspaceId, studentId, connectionId: snapshot.id }
      ))
    );
    const decision = evaluateLiveSandboxGate({
      signal,
      entitlements,
      consent,
      preferences,
      autoCopyPreferences,
      connections,
      platformControl,
      workspaceControl,
      allowlists
    });
    const connectionId = decision.connection?.connectionId ?? "none";
    const intentId = deterministicId("live_sandbox", [
      signal.workspaceId,
      signal.signalId,
      studentId,
      connectionId,
      version
    ]);
    const decisionId = `live_gate_${intentId}`.slice(0, 140);
    const batch = db.batch();

    batch.set(db.doc(`workspaces/${signal.workspaceId}/live_gate_decisions/${decisionId}`), stripUndefined({
      decisionId,
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      studentId,
      connectionId,
      status: decision.allowed ? "allowed" : "blocked",
      checks: decision.checks,
      blockedReason: decision.blockedReason,
      decidedAt: now,
      decidedBy: "live-sandbox-risk-engine:v1"
    }), { merge: true });

    if (decision.allowed && decision.connection) {
      const clientOrderId = exchangeClientOrderId(intentId);
      const intent: LiveSandboxExecutionIntentRecord = {
        intentId,
        workspaceId: signal.workspaceId,
        signalId: signal.signalId,
        studentId,
        connectionId: decision.connection.connectionId,
        exchange: decision.connection.exchange,
        environment: "sandbox",
        executionMode: "live_sandbox",
        market: "crypto",
        symbol: decision.symbol,
        side: signal.direction,
        orderType: "market",
        quoteOrderQty: decision.notionalUsdt.toFixed(2),
        notionalUsdt: decision.notionalUsdt,
        status: "ready_for_live",
        idempotencyKey: [
          "crypto-live-sandbox-intent",
          signal.workspaceId,
          signal.signalId,
          studentId,
          decision.connection.connectionId,
          version
        ].join(":"),
        sourceSignalVersion: signal.updatedAt,
        liveGateDecisionId: decisionId,
        exchangeClientOrderId: clientOrderId,
        entitlementSnapshot: {
          tierId: entitlements.tierId,
          tierLabel: entitlements.tierLabel,
          subscriptionStatus: entitlements.subscriptionStatus,
          riskPosture: entitlements.riskPosture,
          autoCopyAccess: entitlements.features.autoCopy.access
        },
        gateSnapshot: {
          platformSandboxEnabled: platformControl.sandboxTestnetEnabled,
          workspaceSandboxEnabled: workspaceControl.sandboxTestnetEnabled,
          studentAllowlisted: true,
          exchangeAllowlisted: true,
          symbolAllowlisted: true,
          productionBlocked: true
        },
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(Date.parse(now) + 1000 * 60 * 60).toISOString()
      };
      batch.set(db.doc(`workspaces/${signal.workspaceId}/live_execution_intents/${intentId}`), stripUndefined(intent), { merge: true });
      readyCount += 1;
      intentCount += 1;
    } else {
      blockedCount += 1;
    }

    await batch.commit();
    await appendLiveAuditEvent({
      actorType: "influencer",
      actorId: actor.uid,
      workspaceId: signal.workspaceId,
      studentId,
      action: decision.allowed ? "live_sandbox.intent.ready" : "live_sandbox.intent.blocked",
      targetType: decision.allowed ? "live_execution_intent" : "live_gate_decision",
      targetId: decision.allowed ? intentId : decisionId,
      safeMessage: decision.allowed
        ? "Live sandbox intent created for a TradeHub-published signal."
        : decision.blockedReason || "Live sandbox routing blocked this student.",
      after: {
        signalId: signal.signalId,
        status: decision.allowed ? "ready_for_live" : "blocked_live",
        symbol: decision.symbol
      },
      severity: decision.allowed ? "info" : "warning"
    });
  }

  return {
    workspaceId: signal.workspaceId,
    signalId: signal.signalId,
    routed: true,
    candidateLimit: LIVE_SANDBOX_CANDIDATE_LIMIT,
    candidateCount: studentSnapshot.docs.length,
    readyCount,
    blockedCount,
    intentCount,
    bounded,
    warnings,
    completedAt: new Date().toISOString()
  };
}

function normalizeLiveIntent(record: Record<string, unknown>): LiveSandboxExecutionIntentRecord {
  const rawStatus = asString(record.status);
  const status: CryptoLiveSandboxIntentStatus = [
    "proposed_live",
    "blocked_live",
    "ready_for_live",
    "queued_live",
    "submitting_live",
    "submitted_live",
    "partially_filled_live",
    "filled_live",
    "rejected_live",
    "dry_run_live",
    "cancel_requested",
    "cancel_submitted",
    "cancelled_live",
    "expired_live",
    "reconcile_required",
    "failed_live"
  ].includes(rawStatus) ? rawStatus as CryptoLiveSandboxIntentStatus : "blocked_live";

  return {
    intentId: asString(record.intentId),
    workspaceId: asString(record.workspaceId),
    signalId: asString(record.signalId),
    studentId: asString(record.studentId),
    connectionId: asString(record.connectionId),
    exchange: record.exchange === "bybit" ? "bybit" : "binance",
    environment: "sandbox",
    executionMode: "live_sandbox",
    market: "crypto",
    symbol: canonicalSymbol(asString(record.symbol)),
    side: record.side === "sell" ? "sell" : "buy",
    orderType: record.orderType === "limit" ? "limit" : "market",
    quantity: asString(record.quantity) || undefined,
    quoteOrderQty: asString(record.quoteOrderQty) || undefined,
    limitPrice: asString(record.limitPrice) || undefined,
    notionalUsdt: asNumber(record.notionalUsdt, DEFAULT_NOTIONAL_USDT),
    status,
    idempotencyKey: asString(record.idempotencyKey),
    sourceSignalVersion: asString(record.sourceSignalVersion) || undefined,
    liveGateDecisionId: asString(record.liveGateDecisionId) || undefined,
    exchangeClientOrderId: asString(record.exchangeClientOrderId),
    entitlementSnapshot: isRecord(record.entitlementSnapshot)
      ? record.entitlementSnapshot as LiveSandboxExecutionIntentRecord["entitlementSnapshot"]
      : {
          tierId: "unknown",
          tierLabel: "Unknown tier",
          subscriptionStatus: "unknown",
          riskPosture: "unknown",
          autoCopyAccess: "feature_not_enabled"
        },
    gateSnapshot: isRecord(record.gateSnapshot)
      ? record.gateSnapshot as LiveSandboxExecutionIntentRecord["gateSnapshot"]
      : {
          platformSandboxEnabled: false,
          workspaceSandboxEnabled: false,
          studentAllowlisted: false,
          exchangeAllowlisted: false,
          symbolAllowlisted: false,
          productionBlocked: true
        },
    createdAt: asString(record.createdAt) || new Date().toISOString(),
    updatedAt: asString(record.updatedAt) || new Date().toISOString(),
    expiresAt: asString(record.expiresAt) || undefined
  };
}

function buildAttemptId(intentId: string) {
  return deterministicId("live_attempt", [intentId, "1"], 140);
}

async function writeAttemptForIntent({
  intent,
  status,
  exchangeOrderId,
  failureCode,
  failureReason
}: {
  intent: LiveSandboxExecutionIntentRecord;
  status: CryptoLiveSandboxIntentStatus;
  exchangeOrderId?: string;
  failureCode?: string;
  failureReason?: string;
}) {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const attempt: LiveSandboxOrderAttemptRecord = stripUndefined({
    orderAttemptId: buildAttemptId(intent.intentId),
    workspaceId: intent.workspaceId,
    intentId: intent.intentId,
    signalId: intent.signalId,
    studentId: intent.studentId,
    connectionId: intent.connectionId,
    exchange: intent.exchange,
    environment: "sandbox",
    executionMode: "live_sandbox",
    symbol: intent.symbol,
    side: intent.side,
    orderType: intent.orderType,
    status,
    idempotencyKey: `${intent.idempotencyKey}:attempt:1`,
    exchangeClientOrderId: intent.exchangeClientOrderId,
    exchangeOrderId,
    requestedQuantity: intent.quantity,
    requestedQuoteOrderQty: intent.quoteOrderQty,
    requestedPrice: intent.limitPrice,
    sanitizedFailureCode: failureCode,
    sanitizedFailureReason: failureReason,
    submittedAt: status === "submitted_live" || status === "filled_live" ? now : undefined,
    acknowledgedAt: status === "submitted_live" || status === "filled_live" ? now : undefined,
    completedAt: status === "filled_live" || status === "rejected_live" || status === "failed_live" ? now : undefined,
    updatedAt: now
  });

  await db.doc(`workspaces/${intent.workspaceId}/live_order_attempts/${attempt.orderAttemptId}`).set(attempt, { merge: true });
  return attempt;
}

export async function runLiveSandboxExecutionWorker(
  actor: VerifiedSuperAdmin,
  payload: unknown
): Promise<LiveSandboxWorkerRunResponse> {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid live sandbox worker payload.");
  }

  const workspaceId = sanitizeWorkspaceId(payload.workspaceId);

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before running the live sandbox worker.");
  }

  const limit = normalizeLimit(payload.limit, LIVE_SANDBOX_WORKER_LIMIT, LIVE_SANDBOX_WORKER_MAX_LIMIT);
  const enabled = testnetOrdersEnabled();
  const warnings: string[] = [];
  const { db } = getFirebaseAdminClients();
  const [{ platformControl, workspaceControl }, snapshot] = await Promise.all([
    getLiveSandboxControls(workspaceId),
    db.collection(`workspaces/${workspaceId}/live_execution_intents`)
      .where("executionMode", "==", "live_sandbox")
      .where("status", "==", "ready_for_live")
      .orderBy("updatedAt", "asc")
      .limit(limit)
      .get()
  ]);
  let processedCount = 0;
  let submittedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  if (!enabled) {
    warnings.push("CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED is not true, so no sandbox/testnet exchange calls were made.");
  }

  if (platformControl.killSwitchEnabled || workspaceControl.killSwitchEnabled) {
    warnings.push("Live sandbox worker did not process intents because a live sandbox kill switch is enabled.");
    return {
      ...createSourceMeta(warnings),
      ok: true,
      workspaceId,
      testnetOrdersEnabled: enabled,
      candidateLimit: limit,
      candidateCount: snapshot.docs.length,
      processedCount,
      submittedCount,
      skippedCount: snapshot.docs.length,
      failedCount,
      bounded: snapshot.docs.length === limit,
      warnings,
      updatedAt: new Date().toISOString()
    };
  }

  for (const intentSnapshot of snapshot.docs) {
    const rawIntent = cryptoRecordFromSnapshot(intentSnapshot, "intentId");
    const rawEnvironment = asString(rawIntent.environment);
    const intent = normalizeLiveIntent(rawIntent);
    const attemptId = buildAttemptId(intent.intentId);
    const attemptRef = db.doc(`workspaces/${workspaceId}/live_order_attempts/${attemptId}`);
    const existingAttempt = await attemptRef.get();

    if (existingAttempt.exists) {
      skippedCount += 1;
      continue;
    }

    if (
      intent.executionMode !== "live_sandbox" ||
      intent.status !== "ready_for_live" ||
      rawEnvironment !== "sandbox" ||
      intent.environment !== "sandbox"
    ) {
      await appendLiveAuditEvent({
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        action: "live_sandbox.order.skipped",
        targetType: "live_execution_intent",
        targetId: intent.intentId,
        safeMessage: "Live sandbox worker skipped a non-sandbox or non-ready intent.",
        after: { intentId: intent.intentId, status: intent.status, environment: rawEnvironment || intent.environment },
        severity: "warning"
      });
      skippedCount += 1;
      continue;
    }

    if (!enabled) {
      await appendLiveAuditEvent({
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        action: "live_sandbox.order.skipped",
        targetType: "live_execution_intent",
        targetId: intent.intentId,
        safeMessage: "Live sandbox worker skipped exchange submission because testnet orders are disabled.",
        after: { intentId: intent.intentId, testnetOrdersEnabled: false },
        severity: "warning"
      });
      skippedCount += 1;
      continue;
    }

    const cryptoAutoCopyBilling = await isTradeCopierBillingActive(workspaceId, intent.studentId);

    if (!cryptoAutoCopyBilling.active) {
      await writeAttemptForIntent({
        intent,
        status: "failed_live",
        failureCode: "crypto_autocopy_subscription_required",
        failureReason: cryptoAutoCopyBilling.reason
      });
      await db.doc(`workspaces/${workspaceId}/live_execution_intents/${intent.intentId}`).set(
        { status: "failed_live", updatedAt: new Date().toISOString() },
        { merge: true }
      );
      await appendLiveAuditEvent({
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        action: "live_sandbox.order.failed",
        targetType: "live_execution_intent",
        targetId: intent.intentId,
        safeMessage: "Live sandbox worker blocked an intent because paid Crypto AutoCopy billing was missing or inactive.",
        after: { intentId: intent.intentId, cryptoAutoCopyStatus: cryptoAutoCopyBilling.status },
        severity: "warning"
      });
      failedCount += 1;
      continue;
    }

    const connectionSnapshot = await db.doc(`workspaces/${workspaceId}/students/${intent.studentId}/exchange_connections/${intent.connectionId}`).get();
    const connection = connectionSnapshot.exists
      ? mapExchangeConnectionRecord(cryptoRecordFromSnapshot(connectionSnapshot, "connectionId"), {
          workspaceId,
          studentId: intent.studentId,
          connectionId: intent.connectionId
        })
      : null;

    if (
      !connection ||
      connection.environment !== "sandbox" ||
      connection.status !== "verified" ||
      connection.permissionVerification !== "passed" ||
      connection.withdrawalPermission !== "confirmed_disabled"
    ) {
      await writeAttemptForIntent({
        intent,
        status: "failed_live",
        failureCode: "live_sandbox_connection_not_executable",
        failureReason: "Sandbox/testnet connection is no longer executable."
      });
      await db.doc(`workspaces/${workspaceId}/live_execution_intents/${intent.intentId}`).set(
        { status: "failed_live", updatedAt: new Date().toISOString() },
        { merge: true }
      );
      failedCount += 1;
      continue;
    }

    let credential;

    try {
      credential = await loadExchangeCredential({
        workspaceId,
        studentId: intent.studentId,
        connectionId: intent.connectionId
      });
    } catch {
      await writeAttemptForIntent({
        intent,
        status: "failed_live",
        failureCode: "live_sandbox_credential_unavailable",
        failureReason: "Encrypted sandbox/testnet credential is unavailable, so no exchange call was made."
      });
      await db.doc(`workspaces/${workspaceId}/live_execution_intents/${intent.intentId}`).set(
        { status: "failed_live", updatedAt: new Date().toISOString() },
        { merge: true }
      );
      failedCount += 1;
      continue;
    }

    const claimed = await db.runTransaction(async (transaction) => {
      const freshIntent = await transaction.get(db.doc(`workspaces/${workspaceId}/live_execution_intents/${intent.intentId}`));
      const freshAttempt = await transaction.get(attemptRef);

      if (!freshIntent.exists || freshAttempt.exists) {
        return false;
      }

      const freshRawIntent = cryptoRecordFromSnapshot(freshIntent, "intentId");
      const current = normalizeLiveIntent(freshRawIntent);

      if (current.status !== "ready_for_live" || asString(freshRawIntent.environment) !== "sandbox" || current.environment !== "sandbox") {
        return false;
      }

      transaction.set(freshIntent.ref, {
        status: "submitting_live",
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return true;
    });

    if (!claimed) {
      await appendLiveAuditEvent({
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        action: "live_sandbox.order.skipped",
        targetType: "live_execution_intent",
        targetId: intent.intentId,
        safeMessage: "Live sandbox worker skipped an intent that was already claimed or no longer ready.",
        after: { intentId: intent.intentId, status: "not_claimed" },
        severity: "warning"
      });
      skippedCount += 1;
      continue;
    }

    const result = await getExchangeOrderPlacementAdapter(intent.exchange)({
      apiKey: credential.apiKey,
      apiSecret: credential.apiSecret,
      environment: "sandbox",
      symbol: intent.symbol,
      side: intent.side,
      orderType: intent.orderType,
      quantity: intent.quantity,
      quoteOrderQty: intent.quoteOrderQty,
      price: intent.limitPrice,
      clientOrderId: intent.exchangeClientOrderId
    });
    const nextStatus = result.ok ? mapExchangeStatus(result.status) : "failed_live";
    const attempt = await writeAttemptForIntent({
      intent,
      status: result.ok ? nextStatus : "failed_live",
      exchangeOrderId: result.exchangeOrderId,
      failureCode: result.sanitizedFailureCode,
      failureReason: result.sanitizedFailureReason
    });

    await db.doc(`workspaces/${workspaceId}/live_execution_intents/${intent.intentId}`).set(
      {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
    await appendLiveAuditEvent({
      actorType: "super_admin",
      actorId: actor.uid,
      workspaceId,
      studentId: intent.studentId,
      action: result.ok ? "live_sandbox.order.submitted" : "live_sandbox.order.failed",
      targetType: "live_order_attempt",
      targetId: attempt.orderAttemptId,
      safeMessage: result.safeMessage,
      after: {
        intentId: intent.intentId,
        status: nextStatus,
        exchange: intent.exchange,
        environment: "sandbox"
      },
      severity: result.ok ? "info" : "warning"
    });
    processedCount += 1;
    submittedCount += result.ok ? 1 : 0;
    failedCount += result.ok ? 0 : 1;
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId,
    testnetOrdersEnabled: enabled,
    candidateLimit: limit,
    candidateCount: snapshot.docs.length,
    processedCount,
    submittedCount,
    skippedCount,
    failedCount,
    bounded: snapshot.docs.length === limit,
    warnings,
    updatedAt: new Date().toISOString()
  };
}

export async function runLiveSandboxReconciliation(
  actor: VerifiedSuperAdmin,
  payload: unknown
): Promise<LiveSandboxReconciliationRunResponse> {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid live sandbox reconciliation payload.");
  }

  const workspaceId = sanitizeWorkspaceId(payload.workspaceId);

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before running live sandbox reconciliation.");
  }

  const limit = normalizeLimit(payload.limit, LIVE_SANDBOX_WORKER_LIMIT, LIVE_SANDBOX_WORKER_MAX_LIMIT);
  const enabled = testnetOrdersEnabled();
  const warnings: string[] = [];
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.collection(`workspaces/${workspaceId}/live_order_attempts`)
    .where("executionMode", "==", "live_sandbox")
    .where("status", "in", LIVE_SANDBOX_RECONCILABLE_STATUSES)
    .orderBy("updatedAt", "asc")
    .limit(limit)
    .get();
  let reconciledCount = 0;
  let requiresReviewCount = 0;
  let failedCount = 0;

  if (!enabled) {
    warnings.push("CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED is not true, so reconciliation did not call exchange status endpoints.");
  }

  for (const attemptSnapshot of snapshot.docs) {
    const attempt = attemptSnapshot.data() as LiveSandboxOrderAttemptRecord;

    if (!enabled || attempt.environment !== "sandbox") {
      requiresReviewCount += 1;
      continue;
    }

    const credential = await loadExchangeCredential({
      workspaceId,
      studentId: attempt.studentId,
      connectionId: attempt.connectionId
    });

    if (!credential) {
      failedCount += 1;
      continue;
    }

    const result = await getExchangeOrderStatusAdapter(attempt.exchange)({
      apiKey: credential.apiKey,
      apiSecret: credential.apiSecret,
      environment: "sandbox",
      symbol: attempt.symbol,
      clientOrderId: attempt.exchangeClientOrderId,
      exchangeOrderId: attempt.exchangeOrderId
    });
    const normalizedStatus = result.ok ? mapExchangeStatus(result.status) : "reconcile_required";
    const reconciliationId = deterministicId("reconcile", [attempt.orderAttemptId, Date.now().toString()], 140);
    const record: LiveSandboxReconciliationRecord = stripUndefined({
      reconciliationId,
      workspaceId,
      intentId: attempt.intentId,
      orderAttemptId: attempt.orderAttemptId,
      exchange: attempt.exchange,
      environment: "sandbox",
      status: result.ok && normalizedStatus !== "reconcile_required" ? "reconciled" : "requires_review",
      normalizedOrderStatus: normalizedStatus,
      safeMessage: result.safeMessage,
      sanitizedFailureCode: result.sanitizedFailureCode,
      checkedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await Promise.all([
      db.doc(`workspaces/${workspaceId}/live_reconciliation_records/${reconciliationId}`).set(record, { merge: true }),
      db.doc(`workspaces/${workspaceId}/live_order_attempts/${attempt.orderAttemptId}`).set(
        { status: normalizedStatus, updatedAt: new Date().toISOString() },
        { merge: true }
      ),
      db.doc(`workspaces/${workspaceId}/live_execution_intents/${attempt.intentId}`).set(
        { status: normalizedStatus, updatedAt: new Date().toISOString() },
        { merge: true }
      )
    ]);
    await appendLiveAuditEvent({
      actorType: "super_admin",
      actorId: actor.uid,
      workspaceId,
      studentId: attempt.studentId,
      action: "live_sandbox.order.reconciled",
      targetType: "live_order_attempt",
      targetId: attempt.orderAttemptId,
      safeMessage: result.safeMessage,
      after: { status: normalizedStatus, exchange: attempt.exchange, environment: "sandbox" },
      severity: normalizedStatus === "reconcile_required" ? "warning" : "info"
    });
    reconciledCount += result.ok ? 1 : 0;
    requiresReviewCount += result.ok ? 0 : 1;
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId,
    candidateLimit: limit,
    candidateCount: snapshot.docs.length,
    reconciledCount,
    requiresReviewCount,
    failedCount,
    bounded: snapshot.docs.length === limit,
    warnings,
    updatedAt: new Date().toISOString()
  };
}

export async function cancelLiveSandboxOrder(
  actor: VerifiedSuperAdmin,
  workspaceIdInput: string,
  attemptIdInput: string
): Promise<LiveSandboxCancelResponse> {
  const workspaceId = sanitizeWorkspaceId(workspaceIdInput);
  const attemptId = asString(attemptIdInput).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 160);

  if (!workspaceId || !attemptId) {
    throw new AdminApiError(400, "invalid_cancel_target", "Choose a workspace and live sandbox order attempt.");
  }

  const { db } = getFirebaseAdminClients();
  const attemptSnapshot = await db.doc(`workspaces/${workspaceId}/live_order_attempts/${attemptId}`).get();

  if (!attemptSnapshot.exists) {
    throw new AdminApiError(404, "live_sandbox_attempt_not_found", "That live sandbox order attempt was not found.");
  }

  const attempt = attemptSnapshot.data() as LiveSandboxOrderAttemptRecord;

  if (attempt.environment !== "sandbox" || attempt.executionMode !== "live_sandbox") {
    throw new AdminApiError(400, "production_cancel_rejected", "Stage 15H can cancel sandbox/testnet attempts only.");
  }

  if (!testnetOrdersEnabled()) {
    await appendLiveAuditEvent({
      actorType: "super_admin",
      actorId: actor.uid,
      workspaceId,
      studentId: attempt.studentId,
      action: "live_sandbox.cancel.skipped",
      targetType: "live_order_attempt",
      targetId: attempt.orderAttemptId,
      safeMessage: "Cancel skipped because testnet order calls are disabled.",
      severity: "warning"
    });

    return {
      ...createSourceMeta(["CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED is not true, so no exchange cancel call was made."]),
      ok: true,
      workspaceId,
      orderAttemptId: attempt.orderAttemptId,
      status: "reconcile_required",
      safeMessage: "Cancel requires testnet order calls to be enabled.",
      updatedAt: new Date().toISOString()
    };
  }

  const credential = await loadExchangeCredential({
    workspaceId,
    studentId: attempt.studentId,
    connectionId: attempt.connectionId
  });

  if (!credential) {
    throw new AdminApiError(409, "live_sandbox_credential_unavailable", "Encrypted sandbox/testnet credential is unavailable.");
  }

  const result = await getExchangeOrderCancelAdapter(attempt.exchange)({
    apiKey: credential.apiKey,
    apiSecret: credential.apiSecret,
    environment: "sandbox",
    symbol: attempt.symbol,
    clientOrderId: attempt.exchangeClientOrderId,
    exchangeOrderId: attempt.exchangeOrderId
  });
  const status = result.ok ? mapExchangeStatus(result.status) : "reconcile_required";

  await Promise.all([
    db.doc(`workspaces/${workspaceId}/live_order_attempts/${attempt.orderAttemptId}`).set(
      {
        status,
        sanitizedFailureCode: result.sanitizedFailureCode,
        sanitizedFailureReason: result.sanitizedFailureReason,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    ),
    db.doc(`workspaces/${workspaceId}/live_execution_intents/${attempt.intentId}`).set(
      { status, updatedAt: new Date().toISOString() },
      { merge: true }
    )
  ]);
  await appendLiveAuditEvent({
    actorType: "super_admin",
    actorId: actor.uid,
    workspaceId,
    studentId: attempt.studentId,
    action: result.ok ? "live_sandbox.cancel.submitted" : "live_sandbox.cancel.failed",
    targetType: "live_order_attempt",
    targetId: attempt.orderAttemptId,
    safeMessage: result.safeMessage,
    after: { status, exchange: attempt.exchange, environment: "sandbox" },
    severity: result.ok ? "info" : "warning"
  });

  return {
    ...createSourceMeta(),
    ok: true,
    workspaceId,
    orderAttemptId: attempt.orderAttemptId,
    status,
    safeMessage: result.safeMessage,
    updatedAt: new Date().toISOString()
  };
}

export async function loadLiveSandboxExecutionPreview(
  workspaceId: string,
  studentId?: string
): Promise<LiveSandboxExecutionPreview> {
  const { db } = getFirebaseAdminClients();
  const intentQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/live_execution_intents`).where("studentId", "==", studentId).orderBy("updatedAt", "desc").limit(LIVE_SANDBOX_READ_LIMIT)
    : db.collection(`workspaces/${workspaceId}/live_execution_intents`).orderBy("updatedAt", "desc").limit(LIVE_SANDBOX_READ_LIMIT);
  const attemptQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/live_order_attempts`).where("studentId", "==", studentId).orderBy("updatedAt", "desc").limit(LIVE_SANDBOX_READ_LIMIT)
    : db.collection(`workspaces/${workspaceId}/live_order_attempts`).orderBy("updatedAt", "desc").limit(LIVE_SANDBOX_READ_LIMIT);
  const reconciliationQuery = db.collection(`workspaces/${workspaceId}/live_reconciliation_records`)
    .orderBy("updatedAt", "desc")
    .limit(LIVE_SANDBOX_READ_LIMIT);
  const auditQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/live_execution_audit_events`).where("studentId", "==", studentId).orderBy("createdAt", "desc").limit(LIVE_SANDBOX_READ_LIMIT)
    : db.collection(`workspaces/${workspaceId}/live_execution_audit_events`).orderBy("createdAt", "desc").limit(LIVE_SANDBOX_READ_LIMIT);
  const [intents, attempts, reconciliations, audits] = await Promise.all([
    intentQuery.get(),
    attemptQuery.get(),
    reconciliationQuery.get(),
    auditQuery.get()
  ]);

  const safeIntentDocs = intents.docs.filter((doc) =>
    asString(doc.data().environment) === "sandbox" &&
    Boolean(normalizeSignalPairForMarket(asString(doc.data().symbol), "crypto"))
  );
  const safeAttemptDocs = attempts.docs.filter((doc) =>
    asString(doc.data().environment) === "sandbox" &&
    Boolean(normalizeSignalPairForMarket(asString(doc.data().symbol), "crypto"))
  );
  const safeReconciliationDocs = reconciliations.docs.filter((doc) => asString(doc.data().environment) === "sandbox");
  const hiddenNonSandboxCount =
    (intents.docs.length - safeIntentDocs.length) +
    (attempts.docs.length - safeAttemptDocs.length) +
    (reconciliations.docs.length - safeReconciliationDocs.length);
  const warnings = hiddenNonSandboxCount > 0
    ? ["One or more non-sandbox or invalid-market live records were hidden from this support-safe live sandbox preview."]
    : [];

  return {
    visibleLimit: LIVE_SANDBOX_PREVIEW_LIMIT,
    intents: safeIntentDocs.slice(0, LIVE_SANDBOX_PREVIEW_LIMIT).map((doc) => {
      const record = normalizeLiveIntent(cryptoRecordFromSnapshot(doc, "intentId"));
      return {
        intentId: record.intentId,
        signalId: record.signalId,
        studentId: record.studentId,
        connectionId: record.connectionId,
        exchange: record.exchange,
        environment: "sandbox",
        symbol: record.symbol,
        side: record.side,
        orderType: record.orderType,
        notionalUsdt: record.notionalUsdt,
        status: record.status,
        exchangeClientOrderId: record.exchangeClientOrderId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      };
    }),
    orderAttempts: safeAttemptDocs.slice(0, LIVE_SANDBOX_PREVIEW_LIMIT).map((doc) => {
      const record = doc.data() as LiveSandboxOrderAttemptRecord;
      return {
        orderAttemptId: record.orderAttemptId || doc.id,
        intentId: record.intentId,
        signalId: record.signalId,
        studentId: record.studentId,
        exchange: record.exchange,
        environment: "sandbox",
        symbol: record.symbol,
        side: record.side,
        orderType: record.orderType,
        status: record.status,
        exchangeClientOrderId: record.exchangeClientOrderId,
        exchangeOrderRef: maskReference(record.exchangeOrderId),
        sanitizedFailureCode: record.sanitizedFailureCode,
        sanitizedFailureReason: record.sanitizedFailureReason,
        submittedAt: record.submittedAt,
        completedAt: record.completedAt,
        updatedAt: record.updatedAt
      };
    }),
    reconciliations: safeReconciliationDocs.slice(0, LIVE_SANDBOX_PREVIEW_LIMIT).map((doc) => {
      const record = doc.data() as LiveSandboxReconciliationRecord;
      return {
        reconciliationId: record.reconciliationId || doc.id,
        intentId: record.intentId,
        orderAttemptId: record.orderAttemptId,
        exchange: record.exchange,
        environment: "sandbox",
        status: record.status,
        normalizedOrderStatus: record.normalizedOrderStatus,
        safeMessage: record.safeMessage,
        sanitizedFailureCode: record.sanitizedFailureCode,
        checkedAt: record.checkedAt,
        updatedAt: record.updatedAt
      };
    }),
    auditEvents: audits.docs.slice(0, LIVE_SANDBOX_PREVIEW_LIMIT).map((doc) => {
      const record = doc.data();
      return {
        eventId: asString(record.eventId) || doc.id,
        action: asString(record.action),
        actorType: record.actorType === "student" || record.actorType === "influencer" || record.actorType === "super_admin" ? record.actorType : "system",
        studentId: asString(record.studentId) || undefined,
        targetType: asString(record.targetType),
        targetId: asString(record.targetId),
        safeMessage: asString(record.safeMessage),
        severity: record.severity === "warning" || record.severity === "critical" ? record.severity : "info",
        createdAt: asString(record.createdAt) || new Date().toISOString()
      };
    }),
    bounded: {
      intents: safeIntentDocs.length > LIVE_SANDBOX_PREVIEW_LIMIT,
      orderAttempts: safeAttemptDocs.length > LIVE_SANDBOX_PREVIEW_LIMIT,
      reconciliations: safeReconciliationDocs.length > LIVE_SANDBOX_PREVIEW_LIMIT,
      auditEvents: audits.docs.length > LIVE_SANDBOX_PREVIEW_LIMIT
    },
    warnings
  };
}
