import "server-only";

import crypto from "crypto";
import { mapSubscriptionRecord, recordFromSnapshot as billingRecordFromSnapshot } from "@/lib/billing/billing-mappers";
import {
  evaluateStaleSignalPolicy,
  mapCrossAssetAutoCopyPreferencesRecord
} from "@/lib/crypto-execution/auto-copy-preferences";
import { isCryptoAutoCopyBillingActive } from "@/lib/crypto-execution/crypto-autocopy-subscription-repository";
import {
  getCredentialStorageReadiness,
  loadExchangeCredential
} from "@/lib/crypto-execution/credential-vault";
import {
  getExchangeBalancePrecheckAdapter,
  getExchangeOrderCancelAdapter,
  getExchangeOrderPlacementAdapter,
  getExchangeOrderStatusAdapter
} from "@/lib/crypto-execution/exchanges/order-placement";
import { createProviderOrderExecutionIdentity } from "@/lib/journal/provider-execution-identity";
import {
  mapExchangeConnectionRecord,
  recordFromSnapshot as cryptoRecordFromSnapshot,
  toExchangeConnectionSummary
} from "@/lib/crypto-execution/crypto-execution-mappers";
import { resolveStudentEntitlements } from "@/lib/entitlements/student-entitlements";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import { mapWorkspaceForDashboard } from "@/lib/workspace/dashboard-mappers";
import {
  canonicalSignalPair,
  normalizeSignalPairForMarket
} from "@/lib/workspace/signal-symbols";
import {
  mapCryptoProductionAttemptToLedgerEntry,
  writeAccountLinkedLedgerEntry
} from "@/lib/journal/account-linked-performance-ledger";
import type {
  CryptoExchangeId,
  CrossAssetAutoCopyPreferencesRecord,
  CryptoLiveCohortRolloutCandidateSummary,
  CryptoLiveCohortRolloutMode,
  CryptoLiveCohortRolloutWorkerRunResponse,
  CryptoLiveProductionIntentStatus,
  ExchangeConnectionSummary,
  LiveProductionCancelResponse,
  LiveProductionConsentRecord,
  LiveProductionExecutionControlRecord,
  LiveProductionExecutionIntentRecord,
  LiveProductionExecutionPreferencesRecord,
  LiveProductionExecutionPreview,
  LiveProductionOrderAttemptRecord,
  LiveProductionPreflightCheck,
  LiveProductionReconciliationRecord,
  LiveProductionReconciliationRunResponse,
  LiveProductionRoutingSummary,
  LiveProductionWorkerRunResponse
} from "@/types/crypto-execution";
import type { StudentEntitlementSummary } from "@/types/entitlements";
import type { WorkspaceSignalRecord } from "@/types/workspace-dashboard";

const PRODUCTION_LIVE_BETA_CANDIDATE_LIMIT = 10;
const PRODUCTION_WORKER_LIMIT = 1;
const PRODUCTION_WORKER_MAX_LIMIT = 3;
const PRODUCTION_CANARY_CONFIRMATION = "RUN_LIVE_CANARY";
const CRYPTO_LIVE_COHORT_CONFIRMATION = "RUN_CRYPTO_LIVE_COHORT";
const PRODUCTION_CANARY_RECONCILE_CONFIRMATION = "RECONCILE_LIVE_CANARY";
const PRODUCTION_CANARY_CANCEL_CONFIRMATION = "CANCEL_LIVE_CANARY";
const PRODUCTION_CANARY_DEFAULT_MAX_USDT = 5;
const CRYPTO_LIVE_COHORT_CANDIDATE_LIMIT = 2;
const PRODUCTION_PREVIEW_LIMIT = 4;
const PRODUCTION_READ_LIMIT = PRODUCTION_PREVIEW_LIMIT + 1;
const CONNECTION_STALE_MS = 1000 * 60 * 60 * 12;
const DEFAULT_MAX_ORDER_USDT = 25;
const PRODUCTION_RECONCILABLE_STATUSES: CryptoLiveProductionIntentStatus[] = [
  "submitted_live",
  "partially_filled_live",
  "cancel_requested",
  "cancel_submitted",
  "reconcile_required"
];
const CANCELLABLE_STATUSES: CryptoLiveProductionIntentStatus[] = [
  "submitted_live",
  "partially_filled_live",
  "cancel_requested",
  "cancel_submitted",
  "reconcile_required"
];

type LiveProductionGateDecision = {
  allowed: boolean;
  checks: Array<{
    key: string;
    status: "allowed" | "blocked";
    message: string;
  }>;
  blockedReason?: string;
  connection?: ExchangeConnectionSummary;
  symbol: string;
  notionalUsdt: number;
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
    sourceMessage: "Production live beta data was handled through server-side Firebase Admin SDK routes.",
    warnings
  };
}

function productionEnv() {
  const maxOrderFromEnv = Number(process.env.CRYPTO_EXECUTION_PRODUCTION_MAX_ORDER_USDT);
  const canaryMaxOrderFromEnv = Number(process.env.CRYPTO_EXECUTION_PRODUCTION_CANARY_MAX_ORDER_USDT);
  const vault = getCredentialStorageReadiness();

  return {
    productionBetaEnabled: process.env.CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED === "true",
    productionOrdersEnabled: process.env.CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED === "true",
    productionDryRun: process.env.CRYPTO_EXECUTION_PRODUCTION_DRY_RUN !== "false",
    productionCanaryEnabled: process.env.CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED === "true",
    legacyLiveFlagIneffective: true,
    productionVaultReady: vault.productionVaultReady,
    maxOrderUsdt: Number.isFinite(maxOrderFromEnv) && maxOrderFromEnv > 0
      ? Math.min(maxOrderFromEnv, DEFAULT_MAX_ORDER_USDT)
      : DEFAULT_MAX_ORDER_USDT,
    canaryMaxOrderUsdt: Number.isFinite(canaryMaxOrderFromEnv) && canaryMaxOrderFromEnv > 0
      ? Math.min(canaryMaxOrderFromEnv, PRODUCTION_CANARY_DEFAULT_MAX_USDT)
      : PRODUCTION_CANARY_DEFAULT_MAX_USDT,
    vaultMessage: vault.safeMessage
  };
}

function liveCohortEnv() {
  return {
    approvalsEnabled: process.env.BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED === "true",
    orderCallsEnabled: process.env.BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED === "true",
    dryRun: process.env.BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN !== "false"
  };
}

function sanitizeWorkspaceId(value: unknown) {
  return asString(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function sanitizeAttemptId(value: unknown) {
  return asString(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 160);
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

function deterministicId(prefix: string, parts: string[], max = 140) {
  return `${prefix}_${parts.join("_")}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, max);
}

function exchangeClientOrderId(intentId: string) {
  return `thp_${crypto.createHash("sha256").update(intentId).digest("hex").slice(0, 28)}`;
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

function safeCandidateRef(value: string) {
  return `cohort_${crypto.createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
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
): LiveProductionExecutionControlRecord {
  const env = productionEnv();

  return {
    scope,
    workspaceId,
    productionBetaEnabled: asBoolean(value?.productionBetaEnabled, false),
    productionOrdersEnabled: asBoolean(value?.productionOrdersEnabled, false),
    dryRun: asBoolean(value?.productionDryRun, true),
    killSwitchEnabled: asBoolean(value?.killSwitchEnabled, false),
    killSwitchReason: asString(value?.killSwitchReason) || undefined,
    allowedExchanges: Array.isArray(value?.allowedExchanges)
      ? value.allowedExchanges.filter((entry): entry is CryptoExchangeId => entry === "binance" || entry === "bybit")
      : [],
    allowedSymbols: Array.isArray(value?.allowedSymbols)
      ? value.allowedSymbols.map((entry) => canonicalSymbol(String(entry))).filter(Boolean)
      : [],
    maxOrderUsdt: Math.min(Math.max(1, asNumber(value?.maxOrderUsdt, env.maxOrderUsdt)), env.maxOrderUsdt),
    maxDailyNotionalUsdt: Math.max(1, asNumber(value?.maxDailyNotionalUsdt, env.maxOrderUsdt)),
    maxOpenOrdersPerStudent: Math.max(1, asNumber(value?.maxOpenOrdersPerStudent, 1)),
    updatedAt: asString(value?.updatedAt) || new Date().toISOString(),
    updatedBy: asString(value?.updatedBy) || undefined
  };
}

function normalizeConsent(value: Record<string, unknown> | null, workspaceId: string, studentId: string): LiveProductionConsentRecord {
  const status = value?.productionStatus === "accepted" || value?.productionStatus === "revoked" || value?.productionStatus === "paused"
    ? value.productionStatus
    : value?.status === "accepted" || value?.status === "revoked" || value?.status === "paused"
      ? value.status
      : "not_started";

  return {
    workspaceId,
    studentId,
    status,
    consentVersion: asString(value?.productionConsentVersion) || "stage15i-production-live-v1",
    riskDisclosureVersion: asString(value?.productionRiskDisclosureVersion) || "stage15i-live-risk-v1",
    acceptedAt: asString(value?.productionAcceptedAt) || asString(value?.acceptedAt) || undefined,
    revokedAt: asString(value?.productionRevokedAt) || asString(value?.revokedAt) || undefined,
    pausedAt: asString(value?.productionPausedAt) || asString(value?.pausedAt) || undefined,
    source: value?.source === "student_app" || value?.source === "fixture" || value?.source === "admin_seed"
      ? value.source
      : "fixture",
    personalExchangeConfirmed: asBoolean(value?.personalExchangeConfirmed, false),
    notFundedOrPropFirmConfirmed: asBoolean(value?.notFundedOrPropFirmConfirmed, false),
    withdrawalsDisabledConfirmed: asBoolean(value?.withdrawalsDisabledConfirmed, false),
    liveLossRiskConfirmed: asBoolean(value?.productionLiveLossRiskConfirmed, asBoolean(value?.liveLossRiskConfirmed, false)),
    tradeHubNoCustodyConfirmed: asBoolean(value?.tradeHubNoCustodyConfirmed, false),
    updatedAt: asString(value?.updatedAt) || new Date().toISOString()
  };
}

function normalizePreferences(
  value: Record<string, unknown> | null,
  workspaceId: string,
  studentId: string
): LiveProductionExecutionPreferencesRecord {
  return {
    workspaceId,
    studentId,
    studentPaused: asBoolean(value?.studentPaused, false),
    fixedNotionalUsdt: Math.max(1, asNumber(value?.fixedNotionalUsdt, 5)),
    maxDailyNotionalUsdt: Math.max(1, asNumber(value?.maxDailyNotionalUsdt, 25)),
    maxOpenOrders: Math.max(1, asNumber(value?.maxOpenOrders, 1)),
    allowedSymbols: Array.isArray(value?.allowedSymbols)
      ? value.allowedSymbols.map((entry) => canonicalSymbol(String(entry))).filter(Boolean)
      : [],
    updatedAt: asString(value?.updatedAt) || new Date().toISOString(),
    updatedBy: asString(value?.updatedBy) || undefined
  };
}

async function getProductionControls(workspaceId: string) {
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

async function getProductionAllowlists(workspaceId: string) {
  const { db } = getFirebaseAdminClients();
  const [students, exchanges, symbols] = await Promise.all([
    db.doc(`workspaces/${workspaceId}/live_allowlists/production_students`).get(),
    db.doc(`workspaces/${workspaceId}/live_allowlists/production_exchanges`).get(),
    db.doc(`workspaces/${workspaceId}/live_allowlists/production_symbols`).get()
  ]);

  return {
    studentIds: students.exists && Array.isArray(students.data()?.studentIds)
      ? students.data()!.studentIds.map(String)
      : [],
    exchanges: exchanges.exists && Array.isArray(exchanges.data()?.exchanges)
      ? exchanges.data()!.exchanges.filter((entry: unknown): entry is CryptoExchangeId => entry === "binance" || entry === "bybit")
      : [],
    symbols: symbols.exists && Array.isArray(symbols.data()?.symbols)
      ? symbols.data()!.symbols.map((entry: unknown) => canonicalSymbol(String(entry))).filter(Boolean)
      : []
  };
}

function pickProductionConnection(connections: ExchangeConnectionSummary[]) {
  return [...connections]
    .filter((connection) => connection.status === "verified" && connection.environment === "production")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

function permissionFresh(connection: ExchangeConnectionSummary | undefined) {
  if (!connection?.lastVerifiedAt) {
    return false;
  }

  const verifiedAt = Date.parse(connection.lastVerifiedAt);
  return Number.isFinite(verifiedAt) && Date.now() - verifiedAt <= CONNECTION_STALE_MS;
}

function evaluateProductionGate({
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
  consent: LiveProductionConsentRecord;
  preferences: LiveProductionExecutionPreferencesRecord;
  autoCopyPreferences: CrossAssetAutoCopyPreferencesRecord;
  connections: ExchangeConnectionSummary[];
  platformControl: LiveProductionExecutionControlRecord;
  workspaceControl: LiveProductionExecutionControlRecord;
  allowlists: Awaited<ReturnType<typeof getProductionAllowlists>>;
}): LiveProductionGateDecision {
  const env = productionEnv();
  const symbol = normalizeSignalPairForMarket(signal.pair, "crypto") ?? "";
  const connection = pickProductionConnection(connections);
  const exchange = connection?.exchange;
  const staleDecision = evaluateStaleSignalPolicy({
    signal,
    preferences: autoCopyPreferences
  });
  const notionalUsdt = Math.min(
    preferences.fixedNotionalUsdt,
    platformControl.maxOrderUsdt,
    workspaceControl.maxOrderUsdt,
    env.maxOrderUsdt
  );
  const checks = [
    check("signal_status", signal.status === "published", "Only newly published signals can create production live intents."),
    check("signal_market", signal.market === "crypto", "Only crypto signals can create production live intents."),
    check("signal_symbol", symbol !== "", "crypto_symbol_invalid_for_market"),
    check("signal_directional_levels", directionLevelsValid(signal), "Signal entry, take-profit, and stop-loss must match direction."),
    check("entitlement_auto_copy", entitlements.features.autoCopy.access === "allowed", entitlements.features.autoCopy.reason),
    check("subscription_active", entitlements.subscriptionActive, "Subscription must be active and paid for production live beta."),
    check("subscription_not_trial", entitlements.subscriptionStatus !== "trial", "Trial students are blocked from production live beta."),
    check("risk_posture", entitlements.riskPosture === "personal_account", "Funded-account and prop-firm students remain Signal Alerts only."),
    check("env_beta_enabled", env.productionBetaEnabled, "CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED must be true before production routing."),
    check("platform_production_beta_enabled", platformControl.productionBetaEnabled, "Platform production live beta control must be enabled."),
    check("workspace_production_beta_enabled", workspaceControl.productionBetaEnabled, "Workspace production live beta control must be enabled."),
    check("platform_kill_switch", !platformControl.killSwitchEnabled, platformControl.killSwitchReason || "Platform production kill switch must be off."),
    check("workspace_kill_switch", !workspaceControl.killSwitchEnabled, workspaceControl.killSwitchReason || "Workspace production kill switch must be off."),
    check("live_consent", consent.status === "accepted", "Explicit production live consent is required."),
    check("live_consent_confirmations", consent.personalExchangeConfirmed && consent.notFundedOrPropFirmConfirmed && consent.withdrawalsDisabledConfirmed && consent.liveLossRiskConfirmed && consent.tradeHubNoCustodyConfirmed, "Production live consent confirmations must all be accepted."),
    check("execution_mode", autoCopyPreferences.executionMode === "full_auto", autoCopyPreferences.executionMode === "confirm_before_execute" ? "Student requires confirmation before production live execution." : "Student selected alerts-only mode."),
    check("stale_signal", staleDecision.outcome === "route_normally", staleDecision.safeMessage),
    check("student_pause", !preferences.studentPaused && !autoCopyPreferences.studentPaused && consent.status !== "paused" && autoCopyPreferences.consentStatus !== "paused" && autoCopyPreferences.consentStatus !== "revoked", "Student production live pause or shared revoke state must be off."),
    check("student_allowlist", allowlists.studentIds.includes(consent.studentId), "Student must be production live beta allowlisted."),
    check("symbol_allowlist", symbol !== "" && allowlists.symbols.includes(symbol), "Symbol must be production live beta allowlisted."),
    check("production_connection", Boolean(connection), "Verified production exchange connection is required."),
    check("exchange_allowlist", Boolean(exchange && allowlists.exchanges.includes(exchange)), "Exchange must be production live beta allowlisted."),
    check("permission_verification", connection?.permissionVerification === "passed", "Production permission verification must have passed."),
    check("withdrawal_permission", connection?.withdrawalPermission === "confirmed_disabled", "Withdrawal permission must be confirmed disabled."),
    check("connection_freshness", permissionFresh(connection), "Production permission verification must be fresh."),
    check("production_vault_ready", env.productionVaultReady, env.vaultMessage),
    check("notional_cap", notionalUsdt > 0 && notionalUsdt <= env.maxOrderUsdt && notionalUsdt <= platformControl.maxOrderUsdt && notionalUsdt <= workspaceControl.maxOrderUsdt, "Fixed notional must fit env, platform, and workspace caps."),
    check("student_symbol_preferences", preferences.allowedSymbols.length === 0 || preferences.allowedSymbols.includes(symbol), "Student production symbol preferences must allow this symbol."),
    check("daily_cap", preferences.maxDailyNotionalUsdt >= notionalUsdt && platformControl.maxDailyNotionalUsdt >= notionalUsdt && workspaceControl.maxDailyNotionalUsdt >= notionalUsdt, "Daily notional caps must allow this order."),
    check("open_order_cap", preferences.maxOpenOrders > 0 && platformControl.maxOpenOrdersPerStudent > 0 && workspaceControl.maxOpenOrdersPerStudent > 0, "Open-order caps must allow one production beta order.")
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

function preflightCheck(
  key: string,
  label: string,
  ready: boolean,
  safeMessage: string,
  status?: LiveProductionPreflightCheck["status"]
): LiveProductionPreflightCheck {
  return {
    key,
    label,
    status: status ?? (ready ? "ready" : "blocked"),
    safeMessage
  };
}

function quoteAssetForSymbol(symbol: string) {
  const normalized = symbol.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const candidates = ["USDT", "USDC", "FDUSD", "BUSD", "USD"];
  return candidates.find((asset) => normalized.endsWith(asset)) ?? "USDT";
}

async function buildProductionPreflight({
  workspaceId,
  studentId,
  env,
  platformControl,
  workspaceControl,
  sampleAttempt
}: {
  workspaceId: string;
  studentId?: string;
  env: ReturnType<typeof productionEnv>;
  platformControl: LiveProductionExecutionControlRecord;
  workspaceControl: LiveProductionExecutionControlRecord;
  sampleAttempt?: LiveProductionOrderAttemptRecord;
}): Promise<Pick<LiveProductionExecutionPreview, "preflightReady" | "preflightChecks" | "balancePrecheck">> {
  const { db } = getFirebaseAdminClients();
  const allowlists = await getProductionAllowlists(workspaceId);
  const checks: LiveProductionPreflightCheck[] = [
    preflightCheck("env_beta_enabled", "Env beta", env.productionBetaEnabled, env.productionBetaEnabled ? "Production beta env is enabled." : "Production beta env is disabled."),
    preflightCheck("env_order_calls_enabled", "Env order calls", env.productionOrdersEnabled, env.productionOrdersEnabled ? "Production order-call env is enabled." : "Production order-call env is disabled."),
    preflightCheck("env_dry_run_off", "Env dry-run", !env.productionDryRun, env.productionDryRun ? "Production dry-run is on, so real orders are blocked." : "Production dry-run is off."),
    preflightCheck("env_canary_enabled", "Canary env", env.productionCanaryEnabled, env.productionCanaryEnabled ? "Production canary env is enabled." : "Production canary env is disabled."),
    preflightCheck("credential_vault_ready", "Credential vault", env.productionVaultReady, env.productionVaultReady ? "Production credential vault is marked ready." : env.vaultMessage),
    preflightCheck("platform_beta_enabled", "Platform beta", platformControl.productionBetaEnabled, platformControl.productionBetaEnabled ? "Platform production beta control is enabled." : "Platform production beta control is disabled."),
    preflightCheck("workspace_beta_enabled", "Workspace beta", workspaceControl.productionBetaEnabled, workspaceControl.productionBetaEnabled ? "Workspace production beta control is enabled." : "Workspace production beta control is disabled."),
    preflightCheck("platform_orders_enabled", "Platform orders", platformControl.productionOrdersEnabled, platformControl.productionOrdersEnabled ? "Platform production order-call control is enabled." : "Platform production order-call control is disabled."),
    preflightCheck("workspace_orders_enabled", "Workspace orders", workspaceControl.productionOrdersEnabled, workspaceControl.productionOrdersEnabled ? "Workspace production order-call control is enabled." : "Workspace production order-call control is disabled."),
    preflightCheck("platform_dry_run_off", "Platform dry-run", !platformControl.dryRun, platformControl.dryRun ? "Platform production dry-run is on." : "Platform production dry-run is off."),
    preflightCheck("workspace_dry_run_off", "Workspace dry-run", !workspaceControl.dryRun, workspaceControl.dryRun ? "Workspace production dry-run is on." : "Workspace production dry-run is off."),
    preflightCheck("platform_kill_switch_off", "Platform pause", !platformControl.killSwitchEnabled, platformControl.killSwitchEnabled ? platformControl.killSwitchReason || "Platform production kill switch is on." : "Platform production kill switch is off."),
    preflightCheck("workspace_kill_switch_off", "Workspace pause", !workspaceControl.killSwitchEnabled, workspaceControl.killSwitchEnabled ? workspaceControl.killSwitchReason || "Workspace production kill switch is on." : "Workspace production kill switch is off."),
    preflightCheck("student_allowlist_present", "Student allowlist", allowlists.studentIds.length > 0, allowlists.studentIds.length > 0 ? "At least one production student is allowlisted." : "No production student allowlist is configured."),
    preflightCheck("exchange_allowlist_present", "Exchange allowlist", allowlists.exchanges.length > 0, allowlists.exchanges.length > 0 ? "At least one production exchange is allowlisted." : "No production exchange allowlist is configured."),
    preflightCheck("symbol_allowlist_present", "Symbol allowlist", allowlists.symbols.length > 0, allowlists.symbols.length > 0 ? "At least one production symbol is allowlisted." : "No production symbol allowlist is configured."),
    preflightCheck("max_order_cap", "Max order cap", env.maxOrderUsdt > 0 && platformControl.maxOrderUsdt > 0 && workspaceControl.maxOrderUsdt > 0, `Max order cap is clamped by env/platform/workspace. Env cap: ${env.maxOrderUsdt} USDT.`),
    preflightCheck("daily_notional_cap", "Daily cap", platformControl.maxDailyNotionalUsdt > 0 && workspaceControl.maxDailyNotionalUsdt > 0, "Daily notional caps must be above zero."),
    preflightCheck("open_order_cap", "Open orders", platformControl.maxOpenOrdersPerStudent > 0 && workspaceControl.maxOpenOrdersPerStudent > 0, "Open-order caps must allow one canary order.")
  ];

  let balancePrecheck: LiveProductionExecutionPreview["balancePrecheck"] = {
    status: sampleAttempt?.balancePrecheckStatus ?? "unavailable",
    checkedAsset: sampleAttempt?.balancePrecheckCheckedAsset,
    safeMessage: sampleAttempt?.balancePrecheckStatus
      ? "Most recent production canary attempt recorded a support-safe balance precheck status."
      : "No production balance precheck has been run in this bounded preview.",
    sanitizedFailureCode: sampleAttempt?.sanitizedFailureCode,
    checkedAt: sampleAttempt?.balancePrecheckCheckedAt
  };

  if (!studentId) {
    checks.push(
      preflightCheck("student_context", "Student context", false, "Load a workspace with a production candidate or student preview to evaluate student-specific gates.", "unknown"),
      preflightCheck("production_connection", "Connection", false, "No student production connection was selected for this preview.", "unknown"),
      preflightCheck("balance_precheck", "Balance precheck", false, balancePrecheck.safeMessage, "unknown")
    );

    return {
      preflightReady: false,
      preflightChecks: checks,
      balancePrecheck
    };
  }

  const [workspaceSnapshot, studentSnapshot, subscriptionSnapshot, consentSnapshot, preferencesSnapshot, connectionsSnapshot] = await Promise.all([
    db.doc(`workspaces/${workspaceId}`).get(),
    db.doc(`workspaces/${workspaceId}/students/${studentId}`).get(),
    db.doc(`workspaces/${workspaceId}/students/${studentId}/subscriptions/current`).get(),
    db.doc(`workspaces/${workspaceId}/students/${studentId}/live_consents/current`).get(),
    db.doc(`workspaces/${workspaceId}/students/${studentId}/live_execution_preferences/current`).get(),
    db.collection(`workspaces/${workspaceId}/students/${studentId}/exchange_connections`)
      .orderBy("updatedAt", "desc")
      .limit(10)
      .get()
  ]);
  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, workspaceId);
  const studentRecord = studentSnapshot.exists ? cryptoRecordFromSnapshot(studentSnapshot, "studentId") : { studentId };
  const subscription = subscriptionSnapshot.exists
    ? mapSubscriptionRecord(
        billingRecordFromSnapshot(subscriptionSnapshot, "subscriptionId"),
        workspaceId,
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
    workspaceId,
    studentId
  );
  const preferences = normalizePreferences(
    preferencesSnapshot.exists ? cryptoRecordFromSnapshot(preferencesSnapshot, "preferenceId") : null,
    workspaceId,
    studentId
  );
  const connections = connectionsSnapshot.docs.map((snapshot) =>
    toExchangeConnectionSummary(mapExchangeConnectionRecord(
      cryptoRecordFromSnapshot(snapshot, "connectionId"),
      { workspaceId, studentId, connectionId: snapshot.id }
    ))
  );
  const connection = pickProductionConnection(connections);
  const symbolAllowed = preferences.allowedSymbols.length === 0 || preferences.allowedSymbols.some((symbol) => allowlists.symbols.includes(symbol));
  const studentCap = Math.min(preferences.fixedNotionalUsdt, platformControl.maxOrderUsdt, workspaceControl.maxOrderUsdt, env.maxOrderUsdt);

  checks.push(
    preflightCheck("entitlement_auto_copy", "Auto-Copy entitlement", entitlements.features.autoCopy.access === "allowed", entitlements.features.autoCopy.reason),
    preflightCheck("paid_subscription", "Paid subscription", entitlements.subscriptionActive && entitlements.subscriptionStatus !== "trial", "Student must have an active paid Auto-Copy subscription."),
    preflightCheck("risk_posture", "Risk posture", entitlements.riskPosture === "personal_account", "Student must be personal-account posture; funded and prop-firm accounts stay alerts-only."),
    preflightCheck("student_consent", "Student consent", consent.status === "accepted", `Production consent is ${consent.status}.`),
    preflightCheck("student_pause", "Student pause", !preferences.studentPaused && consent.status !== "paused", "Student production pause must be off."),
    preflightCheck("student_allowlisted", "Student allowlisted", allowlists.studentIds.includes(studentId), "Student must be production canary allowlisted."),
    preflightCheck("exchange_allowlisted", "Exchange allowlisted", Boolean(connection?.exchange && allowlists.exchanges.includes(connection.exchange)), "Selected production exchange must be allowlisted."),
    preflightCheck("symbol_allowlisted", "Symbol allowlisted", symbolAllowed && allowlists.symbols.length > 0, "At least one student/workspace production symbol must be allowlisted."),
    preflightCheck("production_connection", "Connection", Boolean(connection), "A fresh verified production exchange connection is required."),
    preflightCheck("permission_fresh", "Permission freshness", permissionFresh(connection), "Production permission verification must be fresh."),
    preflightCheck("withdrawals_disabled", "Withdrawals disabled", connection?.withdrawalPermission === "confirmed_disabled", "Withdrawal permission must be confirmed disabled."),
    preflightCheck("student_caps", "Student caps", studentCap > 0 && preferences.maxDailyNotionalUsdt >= studentCap && preferences.maxOpenOrders > 0, "Student fixed notional, daily cap, and open-order cap must allow one tiny canary.")
  );

  balancePrecheck = {
    ...balancePrecheck,
    checkedAsset: balancePrecheck.checkedAsset ?? quoteAssetForSymbol(allowlists.symbols[0] ?? "BTCUSDT"),
    safeMessage: balancePrecheck.status === "sufficient"
      ? "Most recent canary balance precheck passed."
      : balancePrecheck.safeMessage
  };
  checks.push(preflightCheck("balance_precheck", "Balance precheck", balancePrecheck.status === "sufficient", balancePrecheck.safeMessage, balancePrecheck.status === "sufficient" ? "ready" : "unknown"));

  return {
    preflightReady: checks.every((entry) => entry.status === "ready"),
    preflightChecks: checks,
    balancePrecheck
  };
}

function normalizeStatus(value: unknown): CryptoLiveProductionIntentStatus {
  const status = asString(value);
  return [
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
  ].includes(status) ? status as CryptoLiveProductionIntentStatus : "blocked_live";
}

function normalizeIntent(record: Record<string, unknown>): LiveProductionExecutionIntentRecord {
  return {
    intentId: asString(record.intentId),
    workspaceId: asString(record.workspaceId),
    signalId: asString(record.signalId),
    studentId: asString(record.studentId),
    connectionId: asString(record.connectionId),
    exchange: record.exchange === "bybit" ? "bybit" : "binance",
    environment: "production",
    executionMode: "live",
    market: "crypto",
    symbol: canonicalSymbol(asString(record.symbol)),
    side: record.side === "sell" ? "sell" : "buy",
    orderType: record.orderType === "limit" ? "limit" : "market",
    quantity: asString(record.quantity) || undefined,
    quoteOrderQty: asString(record.quoteOrderQty) || undefined,
    limitPrice: asString(record.limitPrice) || undefined,
    notionalUsdt: asNumber(record.notionalUsdt, Math.min(5, productionEnv().maxOrderUsdt)),
    status: normalizeStatus(record.status),
    idempotencyKey: asString(record.idempotencyKey),
    sourceSignalVersion: asString(record.sourceSignalVersion) || undefined,
    liveGateDecisionId: asString(record.liveGateDecisionId) || undefined,
    exchangeClientOrderId: asString(record.exchangeClientOrderId),
    entitlementSnapshot: isRecord(record.entitlementSnapshot)
      ? record.entitlementSnapshot as LiveProductionExecutionIntentRecord["entitlementSnapshot"]
      : {
          tierId: "unknown",
          tierLabel: "Unknown tier",
          subscriptionStatus: "unknown",
          riskPosture: "unknown",
          autoCopyAccess: "feature_not_enabled"
        },
    gateSnapshot: isRecord(record.gateSnapshot)
      ? record.gateSnapshot as LiveProductionExecutionIntentRecord["gateSnapshot"]
      : {
          platformProductionBetaEnabled: false,
          workspaceProductionBetaEnabled: false,
          studentAllowlisted: false,
          exchangeAllowlisted: false,
          symbolAllowlisted: false,
          productionVaultReady: false,
          dryRun: true,
          maxOrderUsdt: 0
        },
    createdAt: asString(record.createdAt) || new Date().toISOString(),
    updatedAt: asString(record.updatedAt) || new Date().toISOString(),
    expiresAt: asString(record.expiresAt) || undefined
  };
}

function buildAttemptId(intentId: string) {
  return deterministicId("live_prod_attempt", [intentId, "1"], 150);
}

function mapProductionExchangeStatus(status: string | undefined): CryptoLiveProductionIntentStatus {
  const normalized = asString(status).toLowerCase();

  switch (normalized) {
    case "filled":
      return "filled_live";
    case "partially_filled":
    case "partiallyfilled":
      return "partially_filled_live";
    case "rejected":
      return "rejected_live";
    case "cancelled":
    case "canceled":
      return "cancelled_live";
    case "expired":
      return "expired_live";
    case "accepted":
    case "new":
    case "open":
    case "created":
      return "submitted_live";
    default:
      return "reconcile_required";
  }
}

function canaryRuntimeGatesOpen({
  env,
  platformControl,
  workspaceControl
}: {
  env: ReturnType<typeof productionEnv>;
  platformControl: LiveProductionExecutionControlRecord;
  workspaceControl: LiveProductionExecutionControlRecord;
}) {
  return (
    env.productionCanaryEnabled &&
    env.productionBetaEnabled &&
    env.productionOrdersEnabled &&
    env.productionDryRun === false &&
    env.productionVaultReady &&
    platformControl.productionBetaEnabled &&
    workspaceControl.productionBetaEnabled &&
    platformControl.productionOrdersEnabled &&
    workspaceControl.productionOrdersEnabled &&
    platformControl.dryRun === false &&
    workspaceControl.dryRun === false &&
    !platformControl.killSwitchEnabled &&
    !workspaceControl.killSwitchEnabled
  );
}

async function appendProductionAuditEvent({
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

export async function routePublishedCryptoSignalForLiveProductionExecution({
  actor,
  signal
}: {
  actor: VerifiedInfluencer;
  signal: WorkspaceSignalRecord;
}): Promise<LiveProductionRoutingSummary> {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const env = productionEnv();
  const warnings: string[] = [];
  let readyCount = 0;
  let blockedCount = 0;
  let intentCount = 0;

  if (signal.status !== "published" || signal.market !== "crypto") {
    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      routed: false,
      candidateLimit: PRODUCTION_LIVE_BETA_CANDIDATE_LIMIT,
      candidateCount: 0,
      readyCount,
      blockedCount,
      intentCount,
      dryRunOnly: env.productionDryRun,
      bounded: false,
      warnings: ["Production live routing skipped because the signal is not a newly published crypto signal."],
      completedAt: now
    };
  }

  if (!env.productionBetaEnabled) {
    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      routed: false,
      candidateLimit: PRODUCTION_LIVE_BETA_CANDIDATE_LIMIT,
      candidateCount: 0,
      readyCount,
      blockedCount,
      intentCount,
      dryRunOnly: env.productionDryRun,
      bounded: false,
      warnings: ["Production live routing is disabled until CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED=true and Firestore beta controls are enabled."],
      completedAt: now
    };
  }

  const workspaceSnapshot = await db.doc(`workspaces/${signal.workspaceId}`).get();

  if (!workspaceSnapshot.exists) {
    warnings.push("Production live routing skipped because the workspace record was missing.");
    return {
      workspaceId: signal.workspaceId,
      signalId: signal.signalId,
      routed: false,
      candidateLimit: PRODUCTION_LIVE_BETA_CANDIDATE_LIMIT,
      candidateCount: 0,
      readyCount,
      blockedCount,
      intentCount,
      dryRunOnly: env.productionDryRun,
      bounded: false,
      warnings,
      completedAt: now
    };
  }

  const workspace = mapWorkspaceForDashboard(workspaceSnapshot, signal.workspaceId);
  const [{ platformControl, workspaceControl }, allowlists, studentSnapshot] = await Promise.all([
    getProductionControls(signal.workspaceId),
    getProductionAllowlists(signal.workspaceId),
    db.collection(`workspaces/${signal.workspaceId}/students`).limit(PRODUCTION_LIVE_BETA_CANDIDATE_LIMIT).get()
  ]);
  const bounded = studentSnapshot.docs.length === PRODUCTION_LIVE_BETA_CANDIDATE_LIMIT;
  const version = signalVersionHash(signal);

  if (bounded) {
    warnings.push("Production live routing reached the bounded student candidate window.");
  }

  for (const studentDoc of studentSnapshot.docs) {
    const studentRecord = cryptoRecordFromSnapshot(studentDoc, "studentId");
    const studentId = asString(studentRecord.studentId) || studentDoc.id;
    const [subscriptionSnapshot, consentSnapshot, preferencesSnapshot, autoCopyPreferenceSnapshot, connectionsSnapshot] = await Promise.all([
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
    const decision = evaluateProductionGate({
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
    const intentId = deterministicId("live_prod", [
      signal.workspaceId,
      signal.signalId,
      studentId,
      connectionId,
      "production",
      "live",
      version
    ]);
    const decisionId = `live_gate_${intentId}`.slice(0, 150);
    const batch = db.batch();

    batch.set(db.doc(`workspaces/${signal.workspaceId}/live_gate_decisions/${decisionId}`), stripUndefined({
      decisionId,
      workspaceId: signal.workspaceId,
      intentId,
      signalId: signal.signalId,
      studentId,
      connectionId,
      environment: "production",
      executionMode: "live",
      status: decision.allowed ? "allowed" : "blocked",
      checks: decision.checks,
      blockedReason: decision.blockedReason,
      decidedAt: now,
      decidedBy: "production-live-gate:v1"
    }), { merge: true });

    if (decision.allowed && decision.connection) {
      const clientOrderId = exchangeClientOrderId(intentId);
      const intent: LiveProductionExecutionIntentRecord = {
        intentId,
        workspaceId: signal.workspaceId,
        signalId: signal.signalId,
        studentId,
        connectionId: decision.connection.connectionId,
        exchange: decision.connection.exchange,
        environment: "production",
        executionMode: "live",
        market: "crypto",
        symbol: decision.symbol,
        side: signal.direction,
        orderType: "market",
        quoteOrderQty: decision.notionalUsdt.toFixed(2),
        notionalUsdt: decision.notionalUsdt,
        status: "ready_for_live",
        idempotencyKey: [
          "crypto-live-production-intent",
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
          platformProductionBetaEnabled: platformControl.productionBetaEnabled,
          workspaceProductionBetaEnabled: workspaceControl.productionBetaEnabled,
          studentAllowlisted: true,
          exchangeAllowlisted: true,
          symbolAllowlisted: true,
          productionVaultReady: env.productionVaultReady,
          dryRun: env.productionDryRun || platformControl.dryRun || workspaceControl.dryRun,
          maxOrderUsdt: decision.notionalUsdt
        },
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(Date.parse(now) + 1000 * 60 * 30).toISOString()
      };
      batch.set(db.doc(`workspaces/${signal.workspaceId}/live_execution_intents/${intentId}`), stripUndefined(intent), { merge: true });
      readyCount += 1;
      intentCount += 1;
    } else {
      blockedCount += 1;
    }

    await batch.commit();
    await appendProductionAuditEvent({
      actorType: "influencer",
      actorId: actor.uid,
      workspaceId: signal.workspaceId,
      studentId,
      action: decision.allowed ? "live_production.intent.ready" : "live_production.intent.blocked",
      targetType: decision.allowed ? "live_execution_intent" : "live_gate_decision",
      targetId: decision.allowed ? intentId : decisionId,
      safeMessage: decision.allowed
        ? "Production live beta intent created for a TradeHub-published signal."
        : decision.blockedReason || "Production live beta routing blocked this student.",
      after: {
        signalId: signal.signalId,
        status: decision.allowed ? "ready_for_live" : "blocked_live",
        environment: "production",
        executionMode: "live",
        symbol: decision.symbol
      },
      severity: decision.allowed ? "info" : "warning"
    });
  }

  return {
    workspaceId: signal.workspaceId,
    signalId: signal.signalId,
    routed: true,
    candidateLimit: PRODUCTION_LIVE_BETA_CANDIDATE_LIMIT,
    candidateCount: studentSnapshot.docs.length,
    readyCount,
    blockedCount,
    intentCount,
    dryRunOnly: env.productionDryRun || platformControl.dryRun || workspaceControl.dryRun,
    bounded,
    warnings,
    completedAt: new Date().toISOString()
  };
}

async function writeAttemptForIntent({
  intent,
  status,
  failureCode,
  failureReason,
  exchangeOrderId,
  exchangeClientOrderId,
  submittedAt,
  acknowledgedAt,
  completedAt,
  canaryRunId,
  canaryConfirmedBy,
  canaryMaxNotionalUsdt,
  productionCanaryOnly,
  balancePrecheckStatus,
  balancePrecheckCheckedAsset,
  balancePrecheckCheckedAt
}: {
  intent: LiveProductionExecutionIntentRecord;
  status: CryptoLiveProductionIntentStatus;
  failureCode?: string;
  failureReason?: string;
  exchangeOrderId?: string;
  exchangeClientOrderId?: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  completedAt?: string;
  canaryRunId?: string;
  canaryConfirmedBy?: string;
  canaryMaxNotionalUsdt?: number;
  productionCanaryOnly?: boolean;
  balancePrecheckStatus?: LiveProductionOrderAttemptRecord["balancePrecheckStatus"];
  balancePrecheckCheckedAsset?: string;
  balancePrecheckCheckedAt?: string;
}) {
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const attempt: LiveProductionOrderAttemptRecord = stripUndefined({
    orderAttemptId: buildAttemptId(intent.intentId),
    workspaceId: intent.workspaceId,
    intentId: intent.intentId,
    signalId: intent.signalId,
    studentId: intent.studentId,
    connectionId: intent.connectionId,
    exchange: intent.exchange,
    environment: "production",
    executionMode: "live",
    symbol: intent.symbol,
    side: intent.side,
    orderType: intent.orderType,
    status,
    idempotencyKey: `${intent.idempotencyKey}:attempt:1`,
    exchangeClientOrderId: exchangeClientOrderId ?? intent.exchangeClientOrderId,
    exchangeOrderId,
    exchangeOrderRef: maskReference(exchangeOrderId),
    providerExecutionIdentity: createProviderOrderExecutionIdentity({
      provider: intent.exchange,
      symbol: intent.symbol,
      side: intent.side,
      providerOrderId: exchangeOrderId,
      clientOrderId: exchangeClientOrderId ?? intent.exchangeClientOrderId
    }),
    canaryRunId,
    canaryConfirmedBy,
    canaryConfirmedAt: canaryConfirmedBy ? now : undefined,
    canaryMaxNotionalUsdt,
    productionCanaryOnly,
    balancePrecheckStatus,
    balancePrecheckCheckedAsset,
    balancePrecheckCheckedAt,
    requestedQuantity: intent.quantity,
    requestedQuoteOrderQty: intent.quoteOrderQty,
    requestedPrice: intent.limitPrice,
    sanitizedFailureCode: failureCode,
    sanitizedFailureReason: failureReason,
    submittedAt: submittedAt ?? (status === "dry_run_live" ? now : undefined),
    acknowledgedAt: acknowledgedAt ?? (status === "dry_run_live" ? now : undefined),
    completedAt: completedAt ?? (status === "dry_run_live" || status === "failed_live" || status === "rejected_live" || status === "filled_live" || status === "cancelled_live" ? now : undefined),
    updatedAt: now
  });

  await db.doc(`workspaces/${intent.workspaceId}/live_order_attempts/${attempt.orderAttemptId}`).set(attempt, { merge: true });
  if ((status === "filled_live" || status === "partially_filled_live") && attempt.providerExecutionIdentity) {
    await writeAccountLinkedLedgerEntry(mapCryptoProductionAttemptToLedgerEntry({
      ...attempt,
      workspaceId: intent.workspaceId,
      connectionId: intent.connectionId
    }));
  }
  return attempt;
}

export async function runLiveProductionExecutionWorker(
  actor: VerifiedSuperAdmin,
  payload: unknown
): Promise<LiveProductionWorkerRunResponse> {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid production live worker payload.");
  }

  const workspaceId = sanitizeWorkspaceId(payload.workspaceId);

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before running the production live worker.");
  }

  const env = productionEnv();
  const limit = normalizeLimit(payload.limit, PRODUCTION_WORKER_LIMIT, PRODUCTION_WORKER_MAX_LIMIT);
  const warnings: string[] = [];
  const { db } = getFirebaseAdminClients();
  const [{ platformControl, workspaceControl }, snapshot] = await Promise.all([
    getProductionControls(workspaceId),
    db.collection(`workspaces/${workspaceId}/live_execution_intents`)
      .where("executionMode", "==", "live")
      .where("environment", "==", "production")
      .where("status", "==", "ready_for_live")
      .orderBy("updatedAt", "asc")
      .limit(limit)
      .get()
  ]);
  let processedCount = 0;
  let dryRunCount = 0;
  const submittedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  if (!env.productionBetaEnabled || !platformControl.productionBetaEnabled || !workspaceControl.productionBetaEnabled) {
    warnings.push("Production worker skipped all intents because env, platform, and workspace production beta gates are not all enabled.");
    skippedCount = snapshot.docs.length;
  } else if (platformControl.killSwitchEnabled || workspaceControl.killSwitchEnabled) {
    warnings.push("Production worker skipped all intents because a production live kill switch is enabled.");
    skippedCount = snapshot.docs.length;
  } else {
    for (const intentSnapshot of snapshot.docs) {
      const rawIntent = cryptoRecordFromSnapshot(intentSnapshot, "intentId");
      const intent = normalizeIntent(rawIntent);
      const attemptId = buildAttemptId(intent.intentId);
      const attemptRef = db.doc(`workspaces/${workspaceId}/live_order_attempts/${attemptId}`);
      const existingAttempt = await attemptRef.get();

      if (existingAttempt.exists) {
        skippedCount += 1;
        continue;
      }

      if (
        asString(rawIntent.environment) !== "production" ||
        asString(rawIntent.executionMode) !== "live" ||
        intent.status !== "ready_for_live"
      ) {
        await appendProductionAuditEvent({
          actorType: "super_admin",
          actorId: actor.uid,
          workspaceId,
          studentId: intent.studentId,
          action: "live_production.order.skipped",
          targetType: "live_execution_intent",
          targetId: intent.intentId,
          safeMessage: "Production worker skipped a non-production or non-ready intent.",
          after: { intentId: intent.intentId, status: intent.status },
          severity: "warning"
        });
        skippedCount += 1;
        continue;
      }

      const cryptoAutoCopyBilling = await isCryptoAutoCopyBillingActive(workspaceId, intent.studentId);

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
        await appendProductionAuditEvent({
          actorType: "super_admin",
          actorId: actor.uid,
          workspaceId,
          studentId: intent.studentId,
          action: "live_production.order.failed",
          targetType: "live_execution_intent",
          targetId: intent.intentId,
          safeMessage: "Production worker blocked an intent because paid Crypto AutoCopy billing was missing or inactive.",
          after: { intentId: intent.intentId, cryptoAutoCopyStatus: cryptoAutoCopyBilling.status },
          severity: "warning"
        });
        failedCount += 1;
        continue;
      }

      const dryRun = env.productionDryRun || platformControl.dryRun || workspaceControl.dryRun || intent.gateSnapshot.dryRun;

      if (!dryRun && (!env.productionOrdersEnabled || !platformControl.productionOrdersEnabled || !workspaceControl.productionOrdersEnabled)) {
        await writeAttemptForIntent({
          intent,
          status: "failed_live",
          failureCode: "production_order_gate_disabled",
          failureReason: "Production order calls require explicit env, platform, and workspace order-call gates."
        });
        await db.doc(`workspaces/${workspaceId}/live_execution_intents/${intent.intentId}`).set(
          { status: "failed_live", updatedAt: new Date().toISOString() },
          { merge: true }
        );
        failedCount += 1;
        continue;
      }

      if (!dryRun && !env.productionVaultReady) {
        await writeAttemptForIntent({
          intent,
          status: "failed_live",
          failureCode: "credential_storage_unavailable",
          failureReason: "Production credential vault is unavailable, so no exchange call was made."
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
        const current = normalizeIntent(freshRawIntent);

        if (current.status !== "ready_for_live" || asString(freshRawIntent.environment) !== "production" || asString(freshRawIntent.executionMode) !== "live") {
          return false;
        }

        transaction.set(freshIntent.ref, {
          status: dryRun ? "dry_run_live" : "submitting_live",
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return true;
      });

      if (!claimed) {
        skippedCount += 1;
        continue;
      }

      if (dryRun) {
        const attempt = await writeAttemptForIntent({
          intent,
          status: "dry_run_live",
          failureCode: "production_dry_run",
          failureReason: "Production dry-run recorded a safe no-exchange-call attempt."
        });
        await appendProductionAuditEvent({
          actorType: "super_admin",
          actorId: actor.uid,
          workspaceId,
          studentId: intent.studentId,
          action: "live_production.order.dry_run",
          targetType: "live_order_attempt",
          targetId: attempt.orderAttemptId,
          safeMessage: "Production dry-run recorded a safe no-exchange-call attempt. No production exchange endpoint was called.",
          after: { intentId: intent.intentId, status: "dry_run_live", environment: "production" },
          severity: "warning"
        });
        processedCount += 1;
        dryRunCount += 1;
        continue;
      }

      await writeAttemptForIntent({
        intent,
        status: "failed_live",
        failureCode: "production_exchange_submission_deferred",
        failureReason: "Production exchange order submission remains fail-closed until KMS-backed credential loading is implemented."
      });
      await db.doc(`workspaces/${workspaceId}/live_execution_intents/${intent.intentId}`).set(
        { status: "failed_live", updatedAt: new Date().toISOString() },
        { merge: true }
      );
      failedCount += 1;
    }
  }

  if (env.productionDryRun) {
    warnings.push("CRYPTO_EXECUTION_PRODUCTION_DRY_RUN is active by default, so no production exchange call can be made.");
  }

  if (!env.productionVaultReady) {
    warnings.push(env.vaultMessage);
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId,
    env: {
      productionBetaEnabled: env.productionBetaEnabled,
      productionOrdersEnabled: env.productionOrdersEnabled,
      productionDryRun: env.productionDryRun,
      productionCanaryEnabled: env.productionCanaryEnabled,
      legacyLiveFlagIneffective: true,
      productionVaultReady: env.productionVaultReady
    },
    candidateLimit: limit,
    candidateCount: snapshot.docs.length,
    processedCount,
    dryRunCount,
    submittedCount,
    skippedCount,
    failedCount,
    bounded: snapshot.docs.length === limit,
    warnings,
    updatedAt: new Date().toISOString()
  };
}

function cohortRuntimeGatesOpen({
  cohort,
  env,
  platformControl,
  workspaceControl
}: {
  cohort: ReturnType<typeof liveCohortEnv>;
  env: ReturnType<typeof productionEnv>;
  platformControl: LiveProductionExecutionControlRecord;
  workspaceControl: LiveProductionExecutionControlRecord;
}) {
  return (
    cohort.approvalsEnabled &&
    cohort.orderCallsEnabled &&
    cohort.dryRun === false &&
    env.productionBetaEnabled &&
    env.productionOrdersEnabled &&
    env.productionDryRun === false &&
    env.productionVaultReady &&
    platformControl.productionBetaEnabled &&
    workspaceControl.productionBetaEnabled &&
    platformControl.productionOrdersEnabled &&
    workspaceControl.productionOrdersEnabled &&
    platformControl.dryRun === false &&
    workspaceControl.dryRun === false &&
    !platformControl.killSwitchEnabled &&
    !workspaceControl.killSwitchEnabled
  );
}

function cohortCandidateSummary({
  intent,
  status,
  safeReason
}: {
  intent: LiveProductionExecutionIntentRecord;
  status: CryptoLiveCohortRolloutCandidateSummary["status"];
  safeReason: string;
}): CryptoLiveCohortRolloutCandidateSummary {
  return {
    candidateRef: safeCandidateRef(intent.intentId),
    status,
    symbol: intent.symbol,
    exchange: intent.exchange,
    side: intent.side,
    orderType: intent.orderType,
    notionalUsdt: intent.notionalUsdt,
    safeReason,
    updatedAt: new Date().toISOString()
  };
}

export async function runCryptoLiveCohortRolloutWorker(
  actor: VerifiedSuperAdmin,
  payload: unknown
): Promise<CryptoLiveCohortRolloutWorkerRunResponse> {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid crypto live cohort payload.");
  }

  const workspaceId = sanitizeWorkspaceId(payload.workspaceId);

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before running the crypto live cohort check.");
  }

  const mode: CryptoLiveCohortRolloutMode = payload.mode === "submit" ? "submit" : "dry_run";

  if (mode === "submit" && asString(payload.confirmation) !== CRYPTO_LIVE_COHORT_CONFIRMATION) {
    throw new AdminApiError(400, "cohort_confirmation_required", `Type ${CRYPTO_LIVE_COHORT_CONFIRMATION} before submitting a crypto live cohort run.`);
  }

  const env = productionEnv();
  const cohort = liveCohortEnv();
  const candidateLimit = CRYPTO_LIVE_COHORT_CANDIDATE_LIMIT;
  const warnings = [
    "Stage 25C crypto cohort rollout is bounded and crypto-only; Forex and broad live rollout remain separate.",
    "External signal preview candidates remain non-executable and cannot seed this cohort path.",
    mode === "dry_run"
      ? "Dry-run mode evaluates candidates and writes support-safe audit only; no exchange endpoint is called."
      : "Submit mode is rejected unless every cohort and production live gate is explicitly open."
  ];
  const { db } = getFirebaseAdminClients();
  const [{ platformControl, workspaceControl }, snapshot] = await Promise.all([
    getProductionControls(workspaceId),
    db.collection(`workspaces/${workspaceId}/live_execution_intents`)
      .where("executionMode", "==", "live")
      .where("environment", "==", "production")
      .where("status", "==", "ready_for_live")
      .orderBy("updatedAt", "asc")
      .limit(candidateLimit)
      .get()
  ]);
  const gatesOpen = cohortRuntimeGatesOpen({ cohort, env, platformControl, workspaceControl });

  if (mode === "submit" && !gatesOpen) {
    throw new AdminApiError(
      400,
      "crypto_live_cohort_gate_closed",
      "Crypto live cohort submit is closed until cohort approvals, cohort order calls, cohort dry-run, production env, vault, platform, workspace, and kill-switch gates all pass."
    );
  }

  const candidates: CryptoLiveCohortRolloutCandidateSummary[] = [];
  let processedCount = 0;
  let dryRunCount = 0;
  const submittedCount = 0;
  let skippedCount = 0;
  let blockedCount = 0;
  const failedCount = 0;

  for (const intentSnapshot of snapshot.docs) {
    const rawIntent = cryptoRecordFromSnapshot(intentSnapshot, "intentId");
    const intent = normalizeIntent(rawIntent);
    const safeRef = safeCandidateRef(intent.intentId);
    let status: CryptoLiveCohortRolloutCandidateSummary["status"] = "eligible";
    let safeReason = "Candidate passed the bounded crypto cohort dry-run checks.";

    if (
      asString(rawIntent.environment) !== "production" ||
      asString(rawIntent.executionMode) !== "live" ||
      intent.status !== "ready_for_live" ||
      !normalizeSignalPairForMarket(intent.symbol, "crypto")
    ) {
      status = "skipped";
      safeReason = "Candidate is not a ready production crypto live intent.";
      skippedCount += 1;
    } else {
      const [preflight, cryptoAutoCopyBilling] = await Promise.all([
        buildProductionPreflight({
          workspaceId,
          studentId: intent.studentId,
          env,
          platformControl,
          workspaceControl
        }),
        isCryptoAutoCopyBillingActive(workspaceId, intent.studentId)
      ]);
      const blockedCheck = preflight.preflightChecks.find((entry) => entry.status === "blocked");

      if (!cryptoAutoCopyBilling.active) {
        status = "blocked";
        safeReason = cryptoAutoCopyBilling.reason || "Paid Crypto AutoCopy billing is not active.";
        blockedCount += 1;
      } else if (blockedCheck) {
        status = "blocked";
        safeReason = blockedCheck.safeMessage;
        blockedCount += 1;
      } else if (mode === "dry_run") {
        status = "dry_run";
        safeReason = "Crypto live cohort dry-run passed for this candidate; no exchange endpoint was called.";
        dryRunCount += 1;
        processedCount += 1;
      } else {
        status = "skipped";
        safeReason = "Crypto live cohort submit remains operator-controlled; use the existing production canary/worker path after review.";
        skippedCount += 1;
      }
    }

    candidates.push(cohortCandidateSummary({ intent, status, safeReason }));
    await appendProductionAuditEvent({
      actorType: "super_admin",
      actorId: actor.uid,
      workspaceId,
      studentId: intent.studentId,
      action: `live_production.cohort.${status}`,
      targetType: "live_execution_intent",
      targetId: safeRef,
      safeMessage: safeReason,
      after: {
        candidateRef: safeRef,
        mode,
        status,
        symbol: intent.symbol,
        exchange: intent.exchange,
        cohortDryRun: cohort.dryRun,
        cohortOrderCallsEnabled: cohort.orderCallsEnabled
      },
      severity: status === "dry_run" ? "info" : "warning"
    });
  }

  if (mode === "submit") {
    warnings.push("Stage 25C did not broaden the live order worker; submitted count remains zero unless a separately reviewed worker path is opened.");
  }

  if (!cohort.approvalsEnabled) {
    warnings.push("BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED is disabled by default.");
  }

  if (!cohort.orderCallsEnabled) {
    warnings.push("BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED is disabled by default.");
  }

  if (cohort.dryRun) {
    warnings.push("BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN remains on by default.");
  }

  if (platformControl.killSwitchEnabled || workspaceControl.killSwitchEnabled) {
    warnings.push("Platform or workspace kill switch blocks crypto live cohort rollout.");
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId,
    mode,
    cohortStatus: gatesOpen ? "approved_for_cohort" : mode === "dry_run" ? "dry_run_only" : "blocked",
    approvalsEnabled: cohort.approvalsEnabled,
    cohortOrderCallsEnabled: cohort.orderCallsEnabled,
    cohortDryRun: cohort.dryRun,
    candidateLimit,
    candidateCount: snapshot.docs.length,
    processedCount,
    dryRunCount,
    submittedCount,
    skippedCount,
    blockedCount,
    failedCount,
    bounded: snapshot.docs.length === candidateLimit,
    candidates,
    rollbackNote: "Rollback remains env-first: disable cohort order calls, restore cohort dry-run, then use platform/workspace kill switches and reconciliation review.",
    warnings,
    updatedAt: new Date().toISOString()
  };
}

export async function runLiveProductionCanaryWorker(
  actor: VerifiedSuperAdmin,
  payload: unknown
): Promise<LiveProductionWorkerRunResponse> {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid production canary payload.");
  }

  const workspaceId = sanitizeWorkspaceId(payload.workspaceId);

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before running the production canary.");
  }

  if (asString(payload.confirmation) !== PRODUCTION_CANARY_CONFIRMATION) {
    throw new AdminApiError(400, "canary_confirmation_required", `Type ${PRODUCTION_CANARY_CONFIRMATION} before running one live production canary.`);
  }

  const env = productionEnv();
  const warnings: string[] = [];
  const canaryRunId = deterministicId("prod_canary", [workspaceId, actor.uid, Date.now().toString()], 120);
  const { db } = getFirebaseAdminClients();
  const [{ platformControl, workspaceControl }, snapshot] = await Promise.all([
    getProductionControls(workspaceId),
    db.collection(`workspaces/${workspaceId}/live_execution_intents`)
      .where("executionMode", "==", "live")
      .where("environment", "==", "production")
      .where("status", "==", "ready_for_live")
      .orderBy("updatedAt", "asc")
      .limit(1)
      .get()
  ]);
  const canaryEnvOpen =
    env.productionCanaryEnabled &&
    env.productionBetaEnabled &&
    env.productionOrdersEnabled &&
    env.productionDryRun === false &&
    env.productionVaultReady;
  const canaryControlsOpen =
    platformControl.productionBetaEnabled &&
    workspaceControl.productionBetaEnabled &&
    platformControl.productionOrdersEnabled &&
    workspaceControl.productionOrdersEnabled &&
    platformControl.dryRun === false &&
    workspaceControl.dryRun === false &&
    !platformControl.killSwitchEnabled &&
    !workspaceControl.killSwitchEnabled;

  let processedCount = 0;
  let submittedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  if (!canaryEnvOpen) {
    warnings.push("Production canary is closed until canary, beta, order-call, dry-run, and vault env gates all pass.");
    return {
      ...createSourceMeta(warnings),
      ok: true,
      workspaceId,
      env: {
        productionBetaEnabled: env.productionBetaEnabled,
        productionOrdersEnabled: env.productionOrdersEnabled,
        productionDryRun: env.productionDryRun,
        productionCanaryEnabled: env.productionCanaryEnabled,
        legacyLiveFlagIneffective: true,
        productionVaultReady: env.productionVaultReady
      },
      candidateLimit: 1,
      candidateCount: 0,
      processedCount,
      dryRunCount: 0,
      submittedCount,
      skippedCount: snapshot.docs.length,
      failedCount,
      bounded: snapshot.docs.length === 1,
      warnings,
      updatedAt: new Date().toISOString()
    };
  }

  if (!canaryControlsOpen) {
    warnings.push("Production canary skipped because platform/workspace live beta, order-call, dry-run, or kill-switch controls are not open.");
    return {
      ...createSourceMeta(warnings),
      ok: true,
      workspaceId,
      env: {
        productionBetaEnabled: env.productionBetaEnabled,
        productionOrdersEnabled: env.productionOrdersEnabled,
        productionDryRun: env.productionDryRun,
        productionCanaryEnabled: env.productionCanaryEnabled,
        legacyLiveFlagIneffective: true,
        productionVaultReady: env.productionVaultReady
      },
      candidateLimit: 1,
      candidateCount: snapshot.docs.length,
      processedCount,
      dryRunCount: 0,
      submittedCount,
      skippedCount: snapshot.docs.length,
      failedCount,
      bounded: snapshot.docs.length === 1,
      warnings,
      updatedAt: new Date().toISOString()
    };
  }

  for (const intentSnapshot of snapshot.docs) {
    const rawIntent = cryptoRecordFromSnapshot(intentSnapshot, "intentId");
    const intent = normalizeIntent(rawIntent);
    const attemptId = buildAttemptId(intent.intentId);
    const attemptRef = db.doc(`workspaces/${workspaceId}/live_order_attempts/${attemptId}`);
    const connectionRef = db.doc(`workspaces/${workspaceId}/students/${intent.studentId}/exchange_connections/${intent.connectionId}`);
    const connectionSnapshot = await connectionRef.get();
    const connection = connectionSnapshot.exists
      ? toExchangeConnectionSummary(mapExchangeConnectionRecord(
          cryptoRecordFromSnapshot(connectionSnapshot, "connectionId"),
          { workspaceId, studentId: intent.studentId, connectionId: intent.connectionId }
        ))
      : null;
    const notional = Math.min(intent.notionalUsdt, env.canaryMaxOrderUsdt, platformControl.maxOrderUsdt, workspaceControl.maxOrderUsdt);

    if (
      asString(rawIntent.environment) !== "production" ||
      asString(rawIntent.executionMode) !== "live" ||
      intent.status !== "ready_for_live"
    ) {
      skippedCount += 1;
      continue;
    }

    const cryptoAutoCopyBilling = await isCryptoAutoCopyBillingActive(workspaceId, intent.studentId);

    if (!cryptoAutoCopyBilling.active) {
      await writeAttemptForIntent({
        intent,
        status: "failed_live",
        failureCode: "crypto_autocopy_subscription_required",
        failureReason: cryptoAutoCopyBilling.reason,
        canaryRunId,
        canaryConfirmedBy: actor.uid,
        canaryMaxNotionalUsdt: env.canaryMaxOrderUsdt,
        productionCanaryOnly: true
      });
      await intentSnapshot.ref.set({ status: "failed_live", updatedAt: new Date().toISOString() }, { merge: true });
      await appendProductionAuditEvent({
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        action: "live_production.canary.failed",
        targetType: "live_execution_intent",
        targetId: intent.intentId,
        safeMessage: "Production canary blocked an intent because paid Crypto AutoCopy billing was missing or inactive.",
        after: { intentId: intent.intentId, cryptoAutoCopyStatus: cryptoAutoCopyBilling.status },
        severity: "warning"
      });
      failedCount += 1;
      continue;
    }

    if (intent.side !== "buy") {
      await writeAttemptForIntent({
        intent,
        status: "failed_live",
        failureCode: "production_canary_sell_deferred",
        failureReason: "Production canary supports spot BUY market orders only in Stage 15L.",
        canaryRunId,
        canaryConfirmedBy: actor.uid,
        canaryMaxNotionalUsdt: env.canaryMaxOrderUsdt,
        productionCanaryOnly: true
      });
      await intentSnapshot.ref.set({ status: "failed_live", updatedAt: new Date().toISOString() }, { merge: true });
      failedCount += 1;
      continue;
    }

    if (intent.orderType !== "market" || !intent.quoteOrderQty || notional <= 0 || notional > PRODUCTION_CANARY_DEFAULT_MAX_USDT) {
      await writeAttemptForIntent({
        intent,
        status: "failed_live",
        failureCode: "production_canary_size_invalid",
        failureReason: "Production canary requires a tiny spot market buy quote-notional order within every configured cap.",
        canaryRunId,
        canaryConfirmedBy: actor.uid,
        canaryMaxNotionalUsdt: env.canaryMaxOrderUsdt,
        productionCanaryOnly: true
      });
      await intentSnapshot.ref.set({ status: "failed_live", updatedAt: new Date().toISOString() }, { merge: true });
      failedCount += 1;
      continue;
    }

    if (
      !connection ||
      connection.environment !== "production" ||
      connection.status !== "verified" ||
      connection.permissionVerification !== "passed" ||
      connection.withdrawalPermission !== "confirmed_disabled" ||
      !permissionFresh(connection)
    ) {
      await writeAttemptForIntent({
        intent,
        status: "failed_live",
        failureCode: "production_canary_connection_blocked",
        failureReason: "Production canary requires a fresh verified production connection with withdrawals disabled.",
        canaryRunId,
        canaryConfirmedBy: actor.uid,
        canaryMaxNotionalUsdt: env.canaryMaxOrderUsdt,
        productionCanaryOnly: true
      });
      await intentSnapshot.ref.set({ status: "failed_live", updatedAt: new Date().toISOString() }, { merge: true });
      failedCount += 1;
      continue;
    }

    const claimed = await db.runTransaction(async (transaction) => {
      const freshIntent = await transaction.get(intentSnapshot.ref);
      const freshAttempt = await transaction.get(attemptRef);

      if (!freshIntent.exists || freshAttempt.exists) {
        return false;
      }

      const freshRawIntent = cryptoRecordFromSnapshot(freshIntent, "intentId");
      const current = normalizeIntent(freshRawIntent);

      if (current.status !== "ready_for_live" || asString(freshRawIntent.environment) !== "production" || asString(freshRawIntent.executionMode) !== "live") {
        return false;
      }

      transaction.set(freshIntent.ref, {
        status: "submitting_live",
        productionCanaryOnly: true,
        canaryRunId,
        canaryConfirmedBy: actor.uid,
        canaryConfirmedAt: new Date().toISOString(),
        canaryMaxNotionalUsdt: notional,
        gateRecheckedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      transaction.set(attemptRef, stripUndefined({
        orderAttemptId: attemptId,
        workspaceId,
        intentId: intent.intentId,
        signalId: intent.signalId,
        studentId: intent.studentId,
        connectionId: intent.connectionId,
        exchange: intent.exchange,
        environment: "production",
        executionMode: "live",
        symbol: intent.symbol,
        side: intent.side,
        orderType: intent.orderType,
        status: "submitting_live",
        idempotencyKey: `${intent.idempotencyKey}:attempt:1`,
        exchangeClientOrderId: intent.exchangeClientOrderId,
        requestedQuoteOrderQty: notional.toFixed(2),
        canaryRunId,
        canaryConfirmedBy: actor.uid,
        canaryConfirmedAt: new Date().toISOString(),
        canaryMaxNotionalUsdt: notional,
        productionCanaryOnly: true,
        updatedAt: new Date().toISOString()
      }), { merge: true });

      return true;
    });

    if (!claimed) {
      skippedCount += 1;
      continue;
    }

    const credential = await loadExchangeCredential({
      workspaceId,
      studentId: intent.studentId,
      connectionId: intent.connectionId
    });
    const balancePrecheck = await getExchangeBalancePrecheckAdapter(intent.exchange)({
      apiKey: credential.apiKey,
      apiSecret: credential.apiSecret,
      environment: "production",
      symbol: intent.symbol,
      quoteAsset: quoteAssetForSymbol(intent.symbol),
      requiredQuoteAmount: notional.toFixed(2),
      productionCanary: true
    });

    if (!balancePrecheck.ok || balancePrecheck.status !== "sufficient") {
      const attempt = await writeAttemptForIntent({
        intent: {
          ...intent,
          quoteOrderQty: notional.toFixed(2),
          notionalUsdt: notional
        },
        status: "failed_live",
        failureCode: balancePrecheck.sanitizedFailureCode ?? `production_canary_balance_${balancePrecheck.status}`,
        failureReason: balancePrecheck.safeMessage,
        canaryRunId,
        canaryConfirmedBy: actor.uid,
        canaryMaxNotionalUsdt: notional,
        productionCanaryOnly: true,
        balancePrecheckStatus: balancePrecheck.status,
        balancePrecheckCheckedAsset: balancePrecheck.checkedAsset,
        balancePrecheckCheckedAt: balancePrecheck.checkedAt
      });
      await intentSnapshot.ref.set({
        status: "failed_live",
        sanitizedFailureCode: balancePrecheck.sanitizedFailureCode ?? `production_canary_balance_${balancePrecheck.status}`,
        sanitizedFailureReason: balancePrecheck.safeMessage,
        gateRecheckedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      await appendProductionAuditEvent({
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: intent.studentId,
        action: "live_production.canary.balance_blocked",
        targetType: "live_order_attempt",
        targetId: attempt.orderAttemptId,
        safeMessage: balancePrecheck.safeMessage,
        after: {
          status: "failed_live",
          balancePrecheckStatus: balancePrecheck.status,
          checkedAsset: balancePrecheck.checkedAsset,
          exchange: intent.exchange,
          symbol: intent.symbol,
          canaryRunId
        },
        severity: "warning"
      });
      processedCount += 1;
      failedCount += 1;
      continue;
    }

    const placement = getExchangeOrderPlacementAdapter(intent.exchange);
    const result = await placement({
      apiKey: credential.apiKey,
      apiSecret: credential.apiSecret,
      environment: "production",
      symbol: intent.symbol,
      side: "buy",
      orderType: "market",
      quoteOrderQty: notional.toFixed(2),
      clientOrderId: intent.exchangeClientOrderId,
      productionCanary: true
    });
    const status = result.ok ? mapProductionExchangeStatus(result.status) : "rejected_live";
    const terminalAt = status === "filled_live" || status === "rejected_live" || status === "failed_live" ? new Date().toISOString() : undefined;
    const attempt = await writeAttemptForIntent({
      intent: {
        ...intent,
        quoteOrderQty: notional.toFixed(2),
        notionalUsdt: notional
      },
      status,
      failureCode: result.ok ? undefined : result.sanitizedFailureCode,
      failureReason: result.ok ? undefined : result.sanitizedFailureReason,
      exchangeOrderId: result.exchangeOrderId,
      exchangeClientOrderId: result.exchangeClientOrderId,
      submittedAt: new Date().toISOString(),
      acknowledgedAt: result.ok ? new Date().toISOString() : undefined,
      completedAt: terminalAt,
      canaryRunId,
      canaryConfirmedBy: actor.uid,
      canaryMaxNotionalUsdt: notional,
      productionCanaryOnly: true,
      balancePrecheckStatus: balancePrecheck.status,
      balancePrecheckCheckedAsset: balancePrecheck.checkedAsset,
      balancePrecheckCheckedAt: balancePrecheck.checkedAt
    });

    await intentSnapshot.ref.set({
      status,
      canaryRunId,
      gateRecheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    await appendProductionAuditEvent({
      actorType: "super_admin",
      actorId: actor.uid,
      workspaceId,
      studentId: intent.studentId,
      action: result.ok ? "live_production.canary.submitted" : "live_production.canary.rejected",
      targetType: "live_order_attempt",
      targetId: attempt.orderAttemptId,
      safeMessage: result.ok
        ? "Production canary submitted one tiny spot market buy order through the server-only worker."
        : result.safeMessage,
      after: {
        status,
        environment: "production",
        exchange: intent.exchange,
        symbol: intent.symbol,
        maskedOrderRef: attempt.exchangeOrderRef,
        canaryRunId
      },
      severity: result.ok ? "critical" : "warning"
    });
    processedCount += 1;
    submittedCount += result.ok ? 1 : 0;
    failedCount += result.ok ? 0 : 1;
  }

  warnings.push("Production canary requires a server-only balance precheck before any exchange order submission.");

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId,
    env: {
      productionBetaEnabled: env.productionBetaEnabled,
      productionOrdersEnabled: env.productionOrdersEnabled,
      productionDryRun: env.productionDryRun,
      productionCanaryEnabled: env.productionCanaryEnabled,
      legacyLiveFlagIneffective: true,
      productionVaultReady: env.productionVaultReady
    },
    candidateLimit: 1,
    candidateCount: snapshot.docs.length,
    processedCount,
    dryRunCount: 0,
    submittedCount,
    skippedCount,
    failedCount,
    bounded: snapshot.docs.length === 1,
    warnings,
    updatedAt: new Date().toISOString()
  };
}

export async function runLiveProductionReconciliation(
  actor: VerifiedSuperAdmin,
  payload: unknown
): Promise<LiveProductionReconciliationRunResponse> {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid production live reconciliation payload.");
  }

  const workspaceId = sanitizeWorkspaceId(payload.workspaceId);

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before running production live reconciliation.");
  }

  const limit = normalizeLimit(payload.limit, PRODUCTION_WORKER_LIMIT, PRODUCTION_WORKER_MAX_LIMIT);
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.collection(`workspaces/${workspaceId}/live_order_attempts`)
    .where("executionMode", "==", "live")
    .where("environment", "==", "production")
    .where("status", "in", PRODUCTION_RECONCILABLE_STATUSES)
    .orderBy("updatedAt", "asc")
    .limit(limit)
    .get();
  const reconciledCount = 0;
  let requiresReviewCount = 0;

  for (const attemptSnapshot of snapshot.docs) {
    const attempt = attemptSnapshot.data() as LiveProductionOrderAttemptRecord;
    const reconciliationId = deterministicId("prod_reconcile", [attempt.orderAttemptId, Date.now().toString()], 150);
    const record: LiveProductionReconciliationRecord = {
      reconciliationId,
      workspaceId,
      intentId: attempt.intentId,
      orderAttemptId: attempt.orderAttemptId,
      exchange: attempt.exchange,
      environment: "production",
      status: "requires_review",
      normalizedOrderStatus: "reconcile_required",
      safeMessage: "Production reconciliation is bounded and fail-closed until production exchange status lookup is enabled with KMS-backed credentials.",
      sanitizedFailureCode: "production_reconciliation_deferred",
      checkedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.doc(`workspaces/${workspaceId}/live_reconciliation_records/${reconciliationId}`).set(record, { merge: true });
    await appendProductionAuditEvent({
      actorType: "super_admin",
      actorId: actor.uid,
      workspaceId,
      studentId: attempt.studentId,
      action: "live_production.order.reconcile_required",
      targetType: "live_order_attempt",
      targetId: attempt.orderAttemptId,
      safeMessage: record.safeMessage,
      after: { status: "reconcile_required", environment: "production" },
      severity: "warning"
    });
    requiresReviewCount += 1;
  }

  return {
    ...createSourceMeta(["Production reconciliation only checked bounded unsettled records and did not call exchange endpoints in Stage 15I automated QA."]),
    ok: true,
    workspaceId,
    candidateLimit: limit,
    candidateCount: snapshot.docs.length,
    reconciledCount,
    requiresReviewCount,
    failedCount: 0,
    bounded: snapshot.docs.length === limit,
    warnings: [],
    updatedAt: new Date().toISOString()
  };
}

export async function runLiveProductionCanaryReconciliation(
  actor: VerifiedSuperAdmin,
  payload: unknown
): Promise<LiveProductionReconciliationRunResponse> {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid production canary reconciliation payload.");
  }

  const workspaceId = sanitizeWorkspaceId(payload.workspaceId);

  if (!workspaceId) {
    throw new AdminApiError(400, "workspace_required", "Choose a workspace before reconciling the production canary.");
  }

  if (asString(payload.confirmation) !== PRODUCTION_CANARY_RECONCILE_CONFIRMATION) {
    throw new AdminApiError(400, "canary_reconcile_confirmation_required", `Type ${PRODUCTION_CANARY_RECONCILE_CONFIRMATION} before reconciling production canary attempts.`);
  }

  const env = productionEnv();
  const { db } = getFirebaseAdminClients();
  const [{ platformControl, workspaceControl }, snapshot] = await Promise.all([
    getProductionControls(workspaceId),
    db.collection(`workspaces/${workspaceId}/live_order_attempts`)
      .where("executionMode", "==", "live")
      .where("environment", "==", "production")
      .where("productionCanaryOnly", "==", true)
      .where("status", "in", PRODUCTION_RECONCILABLE_STATUSES)
      .orderBy("updatedAt", "asc")
      .limit(1)
      .get()
  ]);
  const warnings: string[] = [];
  let reconciledCount = 0;
  let requiresReviewCount = 0;
  let failedCount = 0;

  if (!canaryRuntimeGatesOpen({ env, platformControl, workspaceControl })) {
    warnings.push("Production canary reconciliation is closed until env, vault, dry-run, order-call, and Firestore controls are all open.");
    return {
      ...createSourceMeta(warnings),
      ok: true,
      workspaceId,
      candidateLimit: 1,
      candidateCount: snapshot.docs.length,
      reconciledCount,
      requiresReviewCount: snapshot.docs.length,
      failedCount,
      bounded: snapshot.docs.length === 1,
      warnings,
      updatedAt: new Date().toISOString()
    };
  }

  for (const attemptSnapshot of snapshot.docs) {
    const attempt = attemptSnapshot.data() as LiveProductionOrderAttemptRecord & { productionCanaryOnly?: boolean };

    if (!attempt.productionCanaryOnly || attempt.environment !== "production" || attempt.executionMode !== "live") {
      requiresReviewCount += 1;
      continue;
    }

    try {
      const credential = await loadExchangeCredential({
        workspaceId,
        studentId: attempt.studentId,
        connectionId: attempt.connectionId
      });
      const lookup = getExchangeOrderStatusAdapter(attempt.exchange);
      const result = await lookup({
        apiKey: credential.apiKey,
        apiSecret: credential.apiSecret,
        environment: "production",
        symbol: attempt.symbol,
        clientOrderId: attempt.exchangeClientOrderId,
        exchangeOrderId: attempt.exchangeOrderId,
        productionCanary: true
      });
      const normalizedStatus = result.ok ? mapProductionExchangeStatus(result.status) : "reconcile_required";
      const reconciliationId = deterministicId("prod_canary_reconcile", [attempt.orderAttemptId, Date.now().toString()], 150);
      const record: LiveProductionReconciliationRecord = {
        reconciliationId,
        workspaceId,
        intentId: attempt.intentId,
        orderAttemptId: attempt.orderAttemptId,
        exchange: attempt.exchange,
        environment: "production",
        status: result.ok && normalizedStatus !== "reconcile_required" ? "reconciled" : "requires_review",
        normalizedOrderStatus: normalizedStatus,
        safeMessage: result.safeMessage,
        sanitizedFailureCode: result.sanitizedFailureCode,
        checkedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.doc(`workspaces/${workspaceId}/live_reconciliation_records/${reconciliationId}`).set(stripUndefined(record), { merge: true });
      await attemptSnapshot.ref.set(stripUndefined({
        status: normalizedStatus,
        exchangeOrderId: result.exchangeOrderId ?? attempt.exchangeOrderId,
        exchangeOrderRef: maskReference(result.exchangeOrderId ?? attempt.exchangeOrderId),
        sanitizedFailureCode: result.sanitizedFailureCode,
        sanitizedFailureReason: result.sanitizedFailureReason,
        updatedAt: new Date().toISOString()
      }), { merge: true });
      await db.doc(`workspaces/${workspaceId}/live_execution_intents/${attempt.intentId}`).set({
        status: normalizedStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      await appendProductionAuditEvent({
        actorType: "super_admin",
        actorId: actor.uid,
        workspaceId,
        studentId: attempt.studentId,
        action: "live_production.canary.reconciled",
        targetType: "live_order_attempt",
        targetId: attempt.orderAttemptId,
        safeMessage: record.safeMessage,
        after: { status: normalizedStatus, maskedOrderRef: maskReference(result.exchangeOrderId ?? attempt.exchangeOrderId) },
        severity: normalizedStatus === "reconcile_required" ? "warning" : "critical"
      });
      reconciledCount += result.ok ? 1 : 0;
      requiresReviewCount += result.ok && normalizedStatus !== "reconcile_required" ? 0 : 1;
    } catch {
      failedCount += 1;
      requiresReviewCount += 1;
    }
  }

  return {
    ...createSourceMeta(warnings),
    ok: true,
    workspaceId,
    candidateLimit: 1,
    candidateCount: snapshot.docs.length,
    reconciledCount,
    requiresReviewCount,
    failedCount,
    bounded: snapshot.docs.length === 1,
    warnings,
    updatedAt: new Date().toISOString()
  };
}

export async function cancelLiveProductionOrder(
  actor: VerifiedSuperAdmin,
  workspaceIdInput: string,
  attemptIdInput: string
): Promise<LiveProductionCancelResponse> {
  const workspaceId = sanitizeWorkspaceId(workspaceIdInput);
  const attemptId = sanitizeAttemptId(attemptIdInput);

  if (!workspaceId || !attemptId) {
    throw new AdminApiError(400, "invalid_cancel_target", "Choose a workspace and production order attempt.");
  }

  const { db } = getFirebaseAdminClients();
  const attemptSnapshot = await db.doc(`workspaces/${workspaceId}/live_order_attempts/${attemptId}`).get();

  if (!attemptSnapshot.exists) {
    throw new AdminApiError(404, "live_production_attempt_not_found", "That production live order attempt was not found.");
  }

  const attempt = attemptSnapshot.data() as LiveProductionOrderAttemptRecord;

  if (attempt.environment !== "production" || attempt.executionMode !== "live") {
    throw new AdminApiError(400, "production_cancel_rejected", "Production cancel can target production live attempts only.");
  }

  if (!CANCELLABLE_STATUSES.includes(attempt.status)) {
    throw new AdminApiError(409, "production_attempt_not_cancellable", "That production attempt is not in a cancellable state.");
  }

  await db.doc(`workspaces/${workspaceId}/live_order_attempts/${attempt.orderAttemptId}`).set(
    {
      status: "reconcile_required",
      sanitizedFailureCode: "production_cancel_deferred",
      sanitizedFailureReason: "Production cancellation remains fail-closed until production exchange cancel is enabled with KMS-backed credentials.",
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
  await appendProductionAuditEvent({
    actorType: "super_admin",
    actorId: actor.uid,
    workspaceId,
    studentId: attempt.studentId,
    action: "live_production.cancel.deferred",
    targetType: "live_order_attempt",
    targetId: attempt.orderAttemptId,
    safeMessage: "Production cancel was recorded as reconcile-required; no exchange cancel endpoint was called.",
    after: { status: "reconcile_required", environment: "production" },
    severity: "critical"
  });

  return {
    ...createSourceMeta(["Production cancel is fail-closed until KMS-backed production credential loading and explicit order-call approval are configured."]),
    ok: true,
    workspaceId,
    orderAttemptId: attempt.orderAttemptId,
    status: "reconcile_required",
    safeMessage: "Production cancel recorded safely without an exchange call.",
    updatedAt: new Date().toISOString()
  };
}

export async function cancelLiveProductionCanaryOrder(
  actor: VerifiedSuperAdmin,
  payload: unknown,
  attemptIdInput: string
): Promise<LiveProductionCancelResponse> {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid production canary cancel payload.");
  }

  const workspaceId = sanitizeWorkspaceId(payload.workspaceId);
  const attemptId = sanitizeAttemptId(attemptIdInput);

  if (!workspaceId || !attemptId) {
    throw new AdminApiError(400, "invalid_cancel_target", "Choose a workspace and production canary order attempt.");
  }

  if (asString(payload.confirmation) !== PRODUCTION_CANARY_CANCEL_CONFIRMATION) {
    throw new AdminApiError(400, "canary_cancel_confirmation_required", `Type ${PRODUCTION_CANARY_CANCEL_CONFIRMATION} before cancelling a production canary attempt.`);
  }

  const env = productionEnv();
  const { db } = getFirebaseAdminClients();
  const [{ platformControl, workspaceControl }, attemptSnapshot] = await Promise.all([
    getProductionControls(workspaceId),
    db.doc(`workspaces/${workspaceId}/live_order_attempts/${attemptId}`).get()
  ]);

  if (!attemptSnapshot.exists) {
    throw new AdminApiError(404, "live_production_attempt_not_found", "That production canary order attempt was not found.");
  }

  const attempt = attemptSnapshot.data() as LiveProductionOrderAttemptRecord & { productionCanaryOnly?: boolean };

  if (!attempt.productionCanaryOnly || attempt.environment !== "production" || attempt.executionMode !== "live") {
    throw new AdminApiError(400, "production_canary_cancel_rejected", "Production canary cancel can target canary production live attempts only.");
  }

  if (!CANCELLABLE_STATUSES.includes(attempt.status)) {
    throw new AdminApiError(409, "production_attempt_not_cancellable", "That production canary attempt is not in a cancellable state.");
  }

  if (!canaryRuntimeGatesOpen({ env, platformControl, workspaceControl })) {
    await attemptSnapshot.ref.set({
      status: "reconcile_required",
      sanitizedFailureCode: "production_canary_cancel_gate_closed",
      sanitizedFailureReason: "Production canary cancel gates are closed; operator review is required.",
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return {
      ...createSourceMeta(["Production canary cancel did not call the exchange because one or more canary gates are closed."]),
      ok: true,
      workspaceId,
      orderAttemptId: attempt.orderAttemptId,
      status: "reconcile_required",
      safeMessage: "Production canary cancel was blocked by closed gates and marked for reconciliation.",
      updatedAt: new Date().toISOString()
    };
  }

  const credential = await loadExchangeCredential({
    workspaceId,
    studentId: attempt.studentId,
    connectionId: attempt.connectionId
  });
  const cancel = getExchangeOrderCancelAdapter(attempt.exchange);
  const result = await cancel({
    apiKey: credential.apiKey,
    apiSecret: credential.apiSecret,
    environment: "production",
    symbol: attempt.symbol,
    clientOrderId: attempt.exchangeClientOrderId,
    exchangeOrderId: attempt.exchangeOrderId,
    productionCanary: true
  });
  const status = result.ok ? mapProductionExchangeStatus(result.status) : "reconcile_required";

  await attemptSnapshot.ref.set(stripUndefined({
    status,
    exchangeOrderId: result.exchangeOrderId ?? attempt.exchangeOrderId,
    exchangeOrderRef: maskReference(result.exchangeOrderId ?? attempt.exchangeOrderId),
    sanitizedFailureCode: result.sanitizedFailureCode,
    sanitizedFailureReason: result.sanitizedFailureReason,
    updatedAt: new Date().toISOString()
  }), { merge: true });
  await appendProductionAuditEvent({
    actorType: "super_admin",
    actorId: actor.uid,
    workspaceId,
    studentId: attempt.studentId,
    action: result.ok ? "live_production.canary.cancel_submitted" : "live_production.canary.cancel_failed",
    targetType: "live_order_attempt",
    targetId: attempt.orderAttemptId,
    safeMessage: result.safeMessage,
    after: { status, maskedOrderRef: maskReference(result.exchangeOrderId ?? attempt.exchangeOrderId) },
    severity: "critical"
  });

  return {
    ...createSourceMeta([]),
    ok: true,
    workspaceId,
    orderAttemptId: attempt.orderAttemptId,
    status,
    safeMessage: result.safeMessage,
    updatedAt: new Date().toISOString()
  };
}

export async function loadLiveProductionExecutionPreview(
  workspaceId: string,
  studentId?: string
): Promise<LiveProductionExecutionPreview> {
  const { db } = getFirebaseAdminClients();
  const env = productionEnv();
  const [{ platformControl, workspaceControl }] = await Promise.all([
    getProductionControls(workspaceId)
  ]);
  const intentQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/live_execution_intents`).where("studentId", "==", studentId).orderBy("updatedAt", "desc").limit(PRODUCTION_READ_LIMIT)
    : db.collection(`workspaces/${workspaceId}/live_execution_intents`).orderBy("updatedAt", "desc").limit(PRODUCTION_READ_LIMIT);
  const attemptQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/live_order_attempts`).where("studentId", "==", studentId).orderBy("updatedAt", "desc").limit(PRODUCTION_READ_LIMIT)
    : db.collection(`workspaces/${workspaceId}/live_order_attempts`).orderBy("updatedAt", "desc").limit(PRODUCTION_READ_LIMIT);
  const reconciliationQuery = db.collection(`workspaces/${workspaceId}/live_reconciliation_records`)
    .orderBy("updatedAt", "desc")
    .limit(PRODUCTION_READ_LIMIT);
  const auditQuery = studentId
    ? db.collection(`workspaces/${workspaceId}/live_execution_audit_events`).where("studentId", "==", studentId).orderBy("createdAt", "desc").limit(PRODUCTION_READ_LIMIT)
    : db.collection(`workspaces/${workspaceId}/live_execution_audit_events`).orderBy("createdAt", "desc").limit(PRODUCTION_READ_LIMIT);
  const [intents, attempts, reconciliations, audits] = await Promise.all([
    intentQuery.get(),
    attemptQuery.get(),
    reconciliationQuery.get(),
    auditQuery.get()
  ]);
  const productionIntentDocs = intents.docs.filter((doc) =>
    asString(doc.data().environment) === "production" &&
    asString(doc.data().executionMode) === "live" &&
    Boolean(normalizeSignalPairForMarket(asString(doc.data().symbol), "crypto"))
  );
  const productionAttemptDocs = attempts.docs.filter((doc) =>
    asString(doc.data().environment) === "production" &&
    asString(doc.data().executionMode) === "live" &&
    Boolean(normalizeSignalPairForMarket(asString(doc.data().symbol), "crypto"))
  );
  const productionReconciliationDocs = reconciliations.docs.filter((doc) => asString(doc.data().environment) === "production");
  const hiddenNonProductionCount =
    (intents.docs.length - productionIntentDocs.length) +
    (attempts.docs.length - productionAttemptDocs.length) +
    (reconciliations.docs.length - productionReconciliationDocs.length);
  const warnings = [
    "Production live beta is disabled by default and dry-run unless every env, control, allowlist, consent, entitlement, vault, and cap gate passes.",
    env.vaultMessage,
    ...(hiddenNonProductionCount > 0 ? ["Non-production or invalid-market live records were hidden from this production beta preview."] : [])
  ];
  const sampleAttempt = productionAttemptDocs[0]?.data() as LiveProductionOrderAttemptRecord | undefined;
  const sampleStudentId =
    studentId ||
    asString(productionIntentDocs[0]?.data().studentId) ||
    sampleAttempt?.studentId;
  const preflight = await buildProductionPreflight({
    workspaceId,
    studentId: sampleStudentId,
    env,
    platformControl,
    workspaceControl,
    sampleAttempt
  });

  return {
    visibleLimit: PRODUCTION_PREVIEW_LIMIT,
    env: {
      productionBetaEnabled: env.productionBetaEnabled,
      productionOrdersEnabled: env.productionOrdersEnabled,
      productionDryRun: env.productionDryRun,
      productionCanaryEnabled: env.productionCanaryEnabled,
      legacyLiveFlagIneffective: true,
      productionVaultReady: env.productionVaultReady
    },
    platformControl,
    workspaceControl,
    preflightReady: preflight.preflightReady,
    preflightChecks: preflight.preflightChecks,
    balancePrecheck: preflight.balancePrecheck,
    intents: productionIntentDocs.slice(0, PRODUCTION_PREVIEW_LIMIT).map((doc) => {
      const record = normalizeIntent(cryptoRecordFromSnapshot(doc, "intentId"));
      return {
        intentId: record.intentId,
        signalId: record.signalId,
        studentId: record.studentId,
        connectionId: record.connectionId,
        exchange: record.exchange,
        environment: "production",
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
    orderAttempts: productionAttemptDocs.slice(0, PRODUCTION_PREVIEW_LIMIT).map((doc) => {
      const record = doc.data() as LiveProductionOrderAttemptRecord;
      return {
        orderAttemptId: record.orderAttemptId || doc.id,
        intentId: record.intentId,
        signalId: record.signalId,
        studentId: record.studentId,
        exchange: record.exchange,
        environment: "production",
        symbol: record.symbol,
        side: record.side,
        orderType: record.orderType,
        status: record.status,
        exchangeClientOrderId: record.exchangeClientOrderId,
        exchangeOrderRef: record.exchangeOrderRef || maskReference(record.exchangeOrderId),
        sanitizedFailureCode: record.sanitizedFailureCode,
        sanitizedFailureReason: record.sanitizedFailureReason,
        balancePrecheckStatus: record.balancePrecheckStatus,
        balancePrecheckCheckedAsset: record.balancePrecheckCheckedAsset,
        balancePrecheckCheckedAt: record.balancePrecheckCheckedAt,
        submittedAt: record.submittedAt,
        completedAt: record.completedAt,
        updatedAt: record.updatedAt
      };
    }),
    reconciliations: productionReconciliationDocs.slice(0, PRODUCTION_PREVIEW_LIMIT).map((doc) => {
      const record = doc.data() as LiveProductionReconciliationRecord;
      return {
        reconciliationId: record.reconciliationId || doc.id,
        intentId: record.intentId,
        orderAttemptId: record.orderAttemptId,
        exchange: record.exchange,
        environment: "production",
        status: record.status,
        normalizedOrderStatus: record.normalizedOrderStatus,
        safeMessage: record.safeMessage,
        sanitizedFailureCode: record.sanitizedFailureCode,
        checkedAt: record.checkedAt,
        updatedAt: record.updatedAt
      };
    }),
    auditEvents: audits.docs.slice(0, PRODUCTION_PREVIEW_LIMIT).map((doc) => {
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
      intents: productionIntentDocs.length > PRODUCTION_PREVIEW_LIMIT,
      orderAttempts: productionAttemptDocs.length > PRODUCTION_PREVIEW_LIMIT,
      reconciliations: productionReconciliationDocs.length > PRODUCTION_PREVIEW_LIMIT,
      auditEvents: audits.docs.length > PRODUCTION_PREVIEW_LIMIT
    },
    warnings
  };
}
