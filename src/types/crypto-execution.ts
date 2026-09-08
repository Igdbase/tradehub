import type { AdminSourceMeta } from "@/types/admin-api";
import type {
  FeatureEntitlementAccess,
  StudentEntitlementSummary,
  StudentRiskPosture
} from "@/types/entitlements";
import type { PracticeAnnotationSummary, PracticeChallengeSummary, PracticeInstructorFeedbackSummary, PracticeSessionReflection } from "@/types/practice";
import type { IsoDateString } from "@/types/workspace";

export type CryptoExchangeId = "binance" | "bybit";
export type CryptoExchangeEnvironment = "sandbox" | "production";
export type CryptoExecutionAccountKind = "personal_exchange";
export type CryptoExecutionMarket = "crypto";
export type ForexConnectionProvider = "metaapi";
export type ForexConnectionEnvironment = "demo" | "production" | "unknown";
export type ForexConnectionStatus = "pending" | "verified" | "rejected" | "disabled" | "error";
export type ForexConnectionReadinessStatus =
  | "not_connected"
  | "metadata_ready"
  | "token_storage_blocked"
  | "verification_failed"
  | "disabled"
  | "paper_only_ready";
export type ForexAutoCopyPlatform = "mt4" | "mt5";
export type ForexAutoCopyBillingStatus =
  | "not_purchased"
  | "trial_only"
  | "payment_pending"
  | "payment_failed"
  | "active_paid"
  | "past_due"
  | "cancelled"
  | "non_renewing"
  | "cancellation_pending"
  | "needs_attention"
  | "expired"
  | "unknown";
export type CryptoAutoCopyBillingStatus =
  | "not_purchased"
  | "payment_pending"
  | "payment_failed"
  | "active_paid"
  | "past_due"
  | "cancelled"
  | "non_renewing"
  | "cancellation_pending"
  | "needs_attention"
  | "expired"
  | "unknown";
export type ForexProvisioningProvider = "mock" | "metaapi";
export type ForexProvisioningProviderMode = "dry_run" | "real";
export type ForexProvisioningStatus =
  | "not_purchased"
  | "ready_to_connect"
  | "provisioning_dry_run_complete"
  | "disabled"
  | "cancelled"
  | "cleanup_pending"
  | "cleanup_complete"
  | "failed";
export type ForexProvisioningRequestStatus =
  | "requested"
  | "mock_completed"
  | "rejected"
  | "failed"
  | "cancelled";
export type AutoCopyMarket = "crypto" | "forex";
export type CrossAssetAutoCopyExecutionMode =
  | "full_auto"
  | "confirm_before_execute"
  | "alerts_only";
export type CrossAssetAutoCopyConsentStatus =
  | "missing"
  | "accepted"
  | "paused"
  | "revoked";
export type CrossAssetAutoCopySizingMode = "fixed_notional" | "risk_percent";
export type CrossAssetStaleSignalPolicy =
  | "expire_after_seconds"
  | "allow_until_manual_cancel"
  | "confirm_if_stale";
export type CrossAssetConfirmationStatus =
  | "waiting_for_student_confirmation"
  | "confirmation_expired"
  | "student_confirmed"
  | "student_skipped";
export type CrossAssetStaleSignalOutcome =
  | "route_normally"
  | "require_confirmation"
  | "expire_skip";

export type ExchangeConnectionStatus =
  | "not_connected"
  | "pending_verification"
  | "verified"
  | "rejected"
  | "disabled"
  | "error";

export type CredentialStorageState =
  | "not_collected"
  | "metadata_only"
  | "pending_encrypted_storage"
  | "encrypted_reference_ready"
  | "rotation_required"
  | "revoked";

export type PermissionVerificationStatus = "not_checked" | "passed" | "failed" | "stale";
export type WithdrawalPermissionState = "unknown" | "confirmed_disabled" | "detected_enabled";

export type StudentExecutionOptInState =
  | "not_started"
  | "opted_in_paper"
  | "live_requested"
  | "live_enabled"
  | "paused"
  | "disabled";

export type ExecutionIntentStatus =
  | "created"
  | "risk_blocked"
  | "ready_for_paper"
  | "queued_paper"
  | "completed_paper"
  | "cancelled"
  | "expired";

export type OrderAttemptStatus =
  | "not_started"
  | "queued"
  | "sent"
  | "acknowledged"
  | "partially_filled"
  | "filled"
  | "failed"
  | "timed_out"
  | "cancelled"
  | "reconciled";

export type RiskDecisionStatus = "allowed" | "blocked" | "requires_review";
export type ExecutionKillSwitchScope = "platform" | "workspace" | "student";
export type CryptoExecutionMode = "paper" | "live" | "live_sandbox";
export type CryptoLiveSandboxIntentStatus =
  | "proposed_live"
  | "blocked_live"
  | "ready_for_live"
  | "queued_live"
  | "submitting_live"
  | "submitted_live"
  | "partially_filled_live"
  | "filled_live"
  | "rejected_live"
  | "dry_run_live"
  | "cancel_requested"
  | "cancel_submitted"
  | "cancelled_live"
  | "expired_live"
  | "reconcile_required"
  | "failed_live";
export type CryptoLiveProductionIntentStatus = CryptoLiveSandboxIntentStatus;

export type CryptoLiveSandboxControlScope = "platform" | "workspace";
export type CryptoLiveSandboxConsentStatus = "not_started" | "accepted" | "revoked" | "paused";
export type CryptoLiveSandboxReconciliationStatus =
  | "not_required"
  | "pending"
  | "reconciled"
  | "requires_review"
  | "failed";
export type CryptoRiskCheckKey =
  | "signal_status"
  | "signal_market"
  | "signal_levels"
  | "signal_directional_levels"
  | "signal_symbol"
  | "entitlement_auto_copy"
  | "crypto_autocopy_billing"
  | "risk_posture"
  | "student_opt_in"
  | "student_allowlist"
  | "workspace_allowlist"
  | "student_pause"
  | "platform_kill_switch"
  | "workspace_kill_switch"
  | "sandbox_only"
  | "exchange_connection"
  | "permission_verification"
  | "withdrawal_permission"
  | "connection_freshness"
  | "symbol_allowlist"
  | "forex_provisioning"
  | "max_risk_per_trade"
  | "max_daily_loss"
  | "max_open_trades"
  | "execution_mode"
  | "stale_signal";

export type ExecutionAuditAction =
  | "routing.started"
  | "routing.completed"
  | "routing.bounded"
  | "connection.verification_attempted"
  | "connection.created"
  | "connection.verified"
  | "connection.rejected"
  | "connection.refresh_attempted"
  | "connection.refresh_failed"
  | "connection.disabled"
  | "preference.updated"
  | "preference.paused"
  | "preference.resumed"
  | "intent.created"
  | "intent.blocked"
  | "risk.allowed"
  | "risk.blocked"
  | "order.planned"
  | "order.skipped"
  | "order.queued"
  | "order.sent"
  | "order.failed"
  | "order.retried"
  | "order.reconciled"
  | "kill_switch.enabled"
  | "kill_switch.disabled";

export type ExecutionAuditActorType = "system" | "student" | "influencer" | "super_admin";
export type ExecutionAuditSeverity = "info" | "warning" | "critical";

export type ExecutionReadinessState =
  | "blocked_by_entitlement"
  | "needs_crypto_autocopy_payment"
  | "alerts_only"
  | "needs_personal_account_confirmation"
  | "needs_connection"
  | "needs_permission_verification"
  | "paused_by_student"
  | "paused_by_workspace"
  | "paused_by_platform"
  | "paper_ready"
  | "live_ready";

export interface ExchangeCredentialMetadataRecord {
  credentialMetadataId: string;
  workspaceId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  storageState: CredentialStorageState;
  permissionVerification: PermissionVerificationStatus;
  withdrawalPermission: WithdrawalPermissionState;
  keyFingerprint?: string;
  encryptedSecretRef?: string;
  verifiedAt?: IsoDateString;
  lastRotatedAt?: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ExchangeConnectionRecord {
  connectionId: string;
  workspaceId: string;
  studentId: string;
  exchange: CryptoExchangeId;
  environment: CryptoExchangeEnvironment;
  market: CryptoExecutionMarket;
  accountKind: CryptoExecutionAccountKind;
  status: ExchangeConnectionStatus;
  connectionLabel: string;
  credentialMetadataId?: string;
  credentialRefPath?: string;
  credentialStorageState: CredentialStorageState;
  permissionVerification: PermissionVerificationStatus;
  withdrawalPermission: WithdrawalPermissionState;
  keyFingerprint?: string;
  lastVerifiedAt?: IsoDateString;
  lastHealthCheckAt?: IsoDateString;
  disabledAt?: IsoDateString;
  disabledReason?: string;
  supportSafeMessage: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexBrokerConnectionRecord {
  connectionId: string;
  workspaceId: string;
  studentId: string;
  provider: ForexConnectionProvider;
  environment: ForexConnectionEnvironment;
  status: ForexConnectionStatus;
  readinessStatus: ForexConnectionReadinessStatus;
  connectionLabel: string;
  providerAccountFingerprint?: string;
  brokerName?: string;
  platform?: "mt4" | "mt5" | "unknown";
  serverName?: string;
  baseCurrency?: string;
  providerState?: string;
  providerConnectionStatus?: string;
  tokenVaultStatus: CredentialStorageState;
  tokenLastStoredAt?: IsoDateString;
  lastCheckedAt?: IsoDateString;
  disabledAt?: IsoDateString;
  disabledReason?: string;
  noTradeExecution: true;
  supportSafeMessage: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface StudentExecutionPreferencesRecord {
  workspaceId: string;
  studentId: string;
  optInState: StudentExecutionOptInState;
  paperTradingOnly: boolean;
  studentPaused: boolean;
  studentPausedAt?: IsoDateString;
  maxRiskPercentPerTrade: number;
  maxDailyLossPercent: number;
  maxOpenTrades: number;
  allowedSymbols: string[];
  riskDisclosureAcceptedAt?: IsoDateString;
  propFirmDisclosureAcceptedAt?: IsoDateString;
  updatedAt: IsoDateString;
  updatedBy?: string;
}

export interface CrossAssetAutoCopyPreferencesRecord {
  workspaceId: string;
  studentId: string;
  market: AutoCopyMarket;
  executionMode: CrossAssetAutoCopyExecutionMode;
  consentStatus: CrossAssetAutoCopyConsentStatus;
  sizingMode: CrossAssetAutoCopySizingMode;
  staleSignalPolicy: CrossAssetStaleSignalPolicy;
  staleSignalMaxAgeSeconds: number;
  maxRiskPercentPerTrade: number;
  maxFixedNotional: number;
  maxDailyLoss: number;
  maxOpenTrades: number;
  allowedSymbols: string[];
  allowedPairs: string[];
  studentPaused: boolean;
  killSwitchEnabled: boolean;
  killSwitchReason?: string;
  idempotencyKeyPrefix: string;
  executionFairnessDisclosureVersion?: string;
  executionFairnessDisclosureAcceptedAt?: IsoDateString;
  suitabilityAcknowledgmentVersion?: string;
  suitabilityAcknowledgedAt?: IsoDateString;
  forexFoundationOnly: boolean;
  updatedAt: IsoDateString;
  updatedBy?: string;
}

export interface CrossAssetAutoCopyConfirmationRecord {
  confirmationId: string;
  workspaceId: string;
  studentId: string;
  signalId: string;
  market: AutoCopyMarket;
  status: CrossAssetConfirmationStatus;
  symbolOrPair: string;
  reason: "execution_mode" | "stale_signal";
  expiresAt: IsoDateString;
  confirmedAt?: IsoDateString;
  skippedAt?: IsoDateString;
  safeMessage: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CrossAssetStaleSignalDecisionRecord {
  decisionId: string;
  workspaceId: string;
  studentId: string;
  signalId: string;
  market: AutoCopyMarket;
  policy: CrossAssetStaleSignalPolicy;
  signalAgeSeconds: number;
  maxAgeSeconds: number;
  outcome: CrossAssetStaleSignalOutcome;
  safeMessage: string;
  decidedAt: IsoDateString;
}

export interface AutoCopyRoutingPostureSummary {
  sampledStudentCount: number;
  fullAutoCount: number;
  confirmationRequiredCount: number;
  alertsOnlyCount: number;
  blockedCount: number;
  staleBlockedCount: number;
  staleConfirmationCount: number;
  forexFoundationOnlyCount: number;
  bounded: boolean;
  updatedAt: IsoDateString;
}

export interface WorkspaceExecutionControlRecord {
  workspaceId: string;
  killSwitchEnabled: boolean;
  killSwitchReason?: string;
  pausedBy?: string;
  pausedAt?: IsoDateString;
  resumedAt?: IsoDateString;
  sandboxOnly: boolean;
  updatedAt: IsoDateString;
}

export interface PlatformExecutionControlRecord {
  killSwitchEnabled: boolean;
  killSwitchReason?: string;
  pausedBy?: string;
  pausedAt?: IsoDateString;
  resumedAt?: IsoDateString;
  sandboxOnly: boolean;
  updatedAt: IsoDateString;
}

export interface SignalExecutionIntentRecord {
  intentId: string;
  workspaceId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  market: CryptoExecutionMarket;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  quantity?: string;
  quoteOrderQty?: string;
  limitPrice?: string;
  status: ExecutionIntentStatus;
  idempotencyKey: string;
  sourceSignalVersion?: string;
  riskDecisionId?: string;
  paperTradingOnly: boolean;
  entitlementSnapshot: Pick<
    StudentEntitlementSummary,
    "tierId" | "tierLabel" | "subscriptionStatus" | "riskPosture"
  > & {
    autoCopyAccess: FeatureEntitlementAccess;
  };
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  expiresAt?: IsoDateString;
}

export interface CryptoOrderAttemptRecord {
  orderAttemptId: string;
  workspaceId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  executionMode: CryptoExecutionMode;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  status: OrderAttemptStatus;
  idempotencyKey: string;
  attemptNumber: number;
  requestedQuantity?: string;
  requestedQuoteOrderQty?: string;
  requestedPrice?: string;
  exchangeOrderId?: string;
  exchangeClientOrderId?: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  requestedAt?: IsoDateString;
  acknowledgedAt?: IsoDateString;
  completedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface LiveSandboxExecutionControlRecord {
  scope: CryptoLiveSandboxControlScope;
  workspaceId?: string;
  sandboxTestnetEnabled: boolean;
  killSwitchEnabled: boolean;
  killSwitchReason?: string;
  allowedExchanges: CryptoExchangeId[];
  allowedSymbols: string[];
  maxNotionalUsdt: number;
  maxDailyNotionalUsdt: number;
  maxOpenOrdersPerStudent: number;
  updatedAt: IsoDateString;
  updatedBy?: string;
}

export interface LiveSandboxConsentRecord {
  workspaceId: string;
  studentId: string;
  status: CryptoLiveSandboxConsentStatus;
  consentVersion: string;
  acceptedAt?: IsoDateString;
  revokedAt?: IsoDateString;
  pausedAt?: IsoDateString;
  source: "student_app" | "fixture" | "admin_seed";
  personalExchangeConfirmed: boolean;
  notFundedOrPropFirmConfirmed: boolean;
  withdrawalsDisabledConfirmed: boolean;
  liveLossRiskConfirmed: boolean;
  updatedAt: IsoDateString;
}

export interface LiveSandboxExecutionPreferencesRecord {
  workspaceId: string;
  studentId: string;
  studentPaused: boolean;
  fixedNotionalUsdt: number;
  maxDailyNotionalUsdt: number;
  maxOpenOrders: number;
  allowedSymbols: string[];
  updatedAt: IsoDateString;
  updatedBy?: string;
}

export interface LiveSandboxAllowlistRecord {
  workspaceId: string;
  allowlistId: "students" | "exchanges" | "symbols";
  studentIds?: string[];
  exchanges?: CryptoExchangeId[];
  symbols?: string[];
  updatedAt: IsoDateString;
  updatedBy?: string;
}

export interface LiveSandboxExecutionIntentRecord {
  intentId: string;
  workspaceId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  environment: "sandbox";
  executionMode: "live_sandbox";
  market: CryptoExecutionMarket;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  quantity?: string;
  quoteOrderQty?: string;
  limitPrice?: string;
  notionalUsdt: number;
  status: CryptoLiveSandboxIntentStatus;
  idempotencyKey: string;
  sourceSignalVersion?: string;
  liveGateDecisionId?: string;
  exchangeClientOrderId: string;
  entitlementSnapshot: Pick<
    StudentEntitlementSummary,
    "tierId" | "tierLabel" | "subscriptionStatus" | "riskPosture"
  > & {
    autoCopyAccess: FeatureEntitlementAccess;
  };
  gateSnapshot: {
    platformSandboxEnabled: boolean;
    workspaceSandboxEnabled: boolean;
    studentAllowlisted: boolean;
    exchangeAllowlisted: boolean;
    symbolAllowlisted: boolean;
    productionBlocked: true;
  };
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  expiresAt?: IsoDateString;
}

export interface LiveSandboxOrderAttemptRecord {
  orderAttemptId: string;
  workspaceId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  environment: "sandbox";
  executionMode: "live_sandbox";
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  status: CryptoLiveSandboxIntentStatus;
  idempotencyKey: string;
  exchangeClientOrderId: string;
  exchangeOrderId?: string;
  requestedQuantity?: string;
  requestedQuoteOrderQty?: string;
  requestedPrice?: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  submittedAt?: IsoDateString;
  acknowledgedAt?: IsoDateString;
  completedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface LiveSandboxReconciliationRecord {
  reconciliationId: string;
  workspaceId: string;
  intentId: string;
  orderAttemptId: string;
  exchange: CryptoExchangeId;
  environment: "sandbox";
  status: CryptoLiveSandboxReconciliationStatus;
  normalizedOrderStatus?: CryptoLiveSandboxIntentStatus;
  safeMessage: string;
  sanitizedFailureCode?: string;
  checkedAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface LiveProductionExecutionControlRecord {
  scope: CryptoLiveSandboxControlScope;
  workspaceId?: string;
  productionBetaEnabled: boolean;
  productionOrdersEnabled: boolean;
  dryRun: boolean;
  killSwitchEnabled: boolean;
  killSwitchReason?: string;
  allowedExchanges: CryptoExchangeId[];
  allowedSymbols: string[];
  maxOrderUsdt: number;
  maxDailyNotionalUsdt: number;
  maxOpenOrdersPerStudent: number;
  updatedAt: IsoDateString;
  updatedBy?: string;
}

export interface LiveProductionConsentRecord {
  workspaceId: string;
  studentId: string;
  status: CryptoLiveSandboxConsentStatus;
  consentVersion: string;
  riskDisclosureVersion: string;
  acceptedAt?: IsoDateString;
  revokedAt?: IsoDateString;
  pausedAt?: IsoDateString;
  source: "student_app" | "fixture" | "admin_seed";
  personalExchangeConfirmed: boolean;
  notFundedOrPropFirmConfirmed: boolean;
  withdrawalsDisabledConfirmed: boolean;
  liveLossRiskConfirmed: boolean;
  tradeHubNoCustodyConfirmed: boolean;
  updatedAt: IsoDateString;
}

export interface LiveProductionExecutionPreferencesRecord {
  workspaceId: string;
  studentId: string;
  studentPaused: boolean;
  fixedNotionalUsdt: number;
  maxDailyNotionalUsdt: number;
  maxOpenOrders: number;
  allowedSymbols: string[];
  updatedAt: IsoDateString;
  updatedBy?: string;
}

export interface LiveProductionExecutionIntentRecord {
  intentId: string;
  workspaceId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  environment: "production";
  executionMode: "live";
  market: CryptoExecutionMarket;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  quantity?: string;
  quoteOrderQty?: string;
  limitPrice?: string;
  notionalUsdt: number;
  status: CryptoLiveProductionIntentStatus;
  idempotencyKey: string;
  sourceSignalVersion?: string;
  liveGateDecisionId?: string;
  exchangeClientOrderId: string;
  entitlementSnapshot: Pick<
    StudentEntitlementSummary,
    "tierId" | "tierLabel" | "subscriptionStatus" | "riskPosture"
  > & {
    autoCopyAccess: FeatureEntitlementAccess;
  };
  gateSnapshot: {
    platformProductionBetaEnabled: boolean;
    workspaceProductionBetaEnabled: boolean;
    studentAllowlisted: boolean;
    exchangeAllowlisted: boolean;
    symbolAllowlisted: boolean;
    productionVaultReady: boolean;
    dryRun: boolean;
    maxOrderUsdt: number;
  };
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  expiresAt?: IsoDateString;
}

export interface LiveProductionOrderAttemptRecord {
  orderAttemptId: string;
  workspaceId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  environment: "production";
  executionMode: "live";
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  status: CryptoLiveProductionIntentStatus;
  idempotencyKey: string;
  exchangeClientOrderId: string;
  exchangeOrderId?: string;
  exchangeOrderRef?: string;
  providerExecutionIdentity?: string;
  ledgerProjectionStatus?: AccountLinkedLedgerProjectionStatus;
  ledgerProjectionAttempts?: number;
  ledgerProjectionLastError?: string;
  ledgerProjectionNextAttemptAt?: IsoDateString;
  ledgerProjectionLeaseOwner?: string;
  ledgerProjectionLeaseExpiresAt?: IsoDateString;
  ledgerProjectedAt?: IsoDateString;
  requestedQuantity?: string;
  requestedQuoteOrderQty?: string;
  requestedPrice?: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  balancePrecheckStatus?: LiveProductionBalancePrecheckStatus;
  balancePrecheckCheckedAsset?: string;
  balancePrecheckCheckedAt?: IsoDateString;
  submittedAt?: IsoDateString;
  acknowledgedAt?: IsoDateString;
  completedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface LiveProductionReconciliationRecord {
  reconciliationId: string;
  workspaceId: string;
  intentId: string;
  orderAttemptId: string;
  exchange: CryptoExchangeId;
  environment: "production";
  status: CryptoLiveSandboxReconciliationStatus;
  normalizedOrderStatus?: CryptoLiveProductionIntentStatus;
  safeMessage: string;
  sanitizedFailureCode?: string;
  checkedAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ExecutionRiskCheck {
  key: CryptoRiskCheckKey;
  status: RiskDecisionStatus;
  message: string;
}

export interface ExecutionRiskDecisionRecord {
  decisionId: string;
  workspaceId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  status: RiskDecisionStatus;
  checks: ExecutionRiskCheck[];
  blockedReason?: string;
  decidedAt: IsoDateString;
  decidedBy: string;
}

export interface ExecutionAuditEventRecord {
  eventId: string;
  action: ExecutionAuditAction;
  actorType: ExecutionAuditActorType;
  actorId: string;
  workspaceId: string;
  studentId?: string;
  targetType:
    | "signal"
    | "connection"
    | "preference"
    | "intent"
    | "risk_decision"
    | "order_attempt"
    | "workspace_control"
    | "platform_control";
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  createdAt: IsoDateString;
}

export type ExchangeConnectionSummary = Omit<
  ExchangeConnectionRecord,
  "credentialRefPath"
>;

export type ForexBrokerConnectionSummary = ForexBrokerConnectionRecord;

export interface ForexConnectionAuditEventSummary {
  eventId: string;
  action: string;
  actorType: ExecutionAuditActorType;
  studentId?: string;
  targetType: "forex_connection" | "token_vault" | "provider_verification";
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  createdAt: IsoDateString;
}

export interface ForexConnectionReadinessPreview {
  visibleLimit: number;
  connectionCounts: Record<ForexConnectionStatus, number>;
  readinessCounts: Record<ForexConnectionReadinessStatus, number>;
  verifiedCount: number;
  disabledCount: number;
  recentFailureCount: number;
  sampledConnectionCount: number;
  connections: ForexBrokerConnectionSummary[];
  auditEvents: ForexConnectionAuditEventSummary[];
  bounded: {
    connections: boolean;
    auditEvents: boolean;
    sampledStudents?: boolean;
  };
  warnings: string[];
  liveCanarySetup?: {
    setupEnabled: boolean;
    reason: string;
    productionConnectionReady: boolean;
    providerAccountFingerprintAvailable: boolean;
  };
  updatedAt: IsoDateString;
}

export type AccountLinkedLedgerSource =
  | "manual_journal"
  | "crypto_autocopy"
  | "forex_autocopy"
  | "practice_backtest"
  | "connected_provider";

export type AccountLinkedLedgerAssetClass = "crypto" | "forex" | "forex_cfd";

export type AccountLinkedLedgerExecutionMode =
  | "manual"
  | "paper"
  | "testnet"
  | "demo"
  | "live_canary"
  | "production_gated"
  | "practice"
  | "provider_history";

export type AccountLinkedLedgerVisibility = "private" | "workspace_summary" | "support_only";

export type AccountLinkedLedgerStatus =
  | "open"
  | "closed"
  | "filled"
  | "partial"
  | "failed"
  | "blocked"
  | "cancelled"
  | "dry_run"
  | "zero_safe";

export type AccountLinkedAuthoritativePnlKind = "floating" | "realized";

export interface AccountLinkedAuthoritativePnl {
  kind: AccountLinkedAuthoritativePnlKind;
  value: number;
  currency: string;
  authoritative: true;
  source: "provider_valuation" | "provider_closure";
  valuedAt?: IsoDateString;
}

export type AccountLinkedLedgerProjectionStatus =
  | "not_applicable"
  | "pending"
  | "in_progress"
  | "projected"
  | "retry_scheduled"
  | "failed"
  | "final_failed";

export interface AccountLinkedTradeLedgerRecord {
  ledgerEntryId: string;
  workspaceId: string;
  studentId: string;
  source: AccountLinkedLedgerSource;
  assetClass: AccountLinkedLedgerAssetClass;
  executionMode: AccountLinkedLedgerExecutionMode;
  sourceRecordId: string;
  providerExecutionIdentity?: string;
  providerExecutionIdentities?: string[];
  tradeHubSignalId?: string;
  journalExecutionFingerprint?: string;
  journalConnectionRef?: string;
  importGeneration?: string;
  providerStatus?: string;
  journalLifecycle?: "open" | "partial" | "closed" | "execution_only";
  tradeOrigin?: "copied" | "provider_manual";
  providerConfirmed?: boolean;
  confirmationState?: "provider_confirmed" | "unconfirmed";
  providerClosureConfirmed?: boolean;
  performanceEligible?: boolean;
  ineligibilityReason?: string;
  symbol: string;
  side: "buy" | "sell" | "unknown";
  openedAt?: IsoDateString;
  closedAt?: IsoDateString;
  status: AccountLinkedLedgerStatus;
  notional?: number;
  volume?: number;
  authoritativePnl?: AccountLinkedAuthoritativePnl;
  pnl?: number;
  rMultiple?: number;
  riskAmount?: number;
  practiceInstrument?: import("@/types/practice").PracticeInstrumentSpecSummary;
  safeBrokerOrExchangeLabel?: string;
  maskedConnectionRef?: string;
  visibility: AccountLinkedLedgerVisibility;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type AccountLinkedTradeLedgerSummary = AccountLinkedTradeLedgerRecord;

export interface AccountLinkedReadinessSummary {
  crypto: {
    linked: boolean;
    verifiedCount: number;
    status: string;
    safeMessage: string;
  };
  forex: {
    linked: boolean;
    brokerSetupActive: boolean;
    status: string;
    safeMessage: string;
  };
}

export interface StudentAccountLinkedPerformancePreview {
  visibleLimit: number;
  manual: {
    privacyState: "private" | "workspace_visible";
    summaryState: "live" | "zero_safe";
    totalTrades30d: number;
    pnl30dNgn: number;
    winRate30d: number;
  };
  autoCopy: {
    totalLedgerItems: number;
    recentItems: AccountLinkedTradeLedgerSummary[];
    statusCounts: Partial<Record<AccountLinkedLedgerStatus, number>>;
  };
  practice: {
    status: "placeholder" | "active";
    safeMessage: string;
    totalLedgerItems?: number;
    recentItems?: AccountLinkedTradeLedgerSummary[];
    closedCount?: number;
    partialCloseCount?: number;
    fullCloseCount?: number;
    pnl?: number;
    averageR?: number;
    winRate?: number;
    playbookLabels?: string[];
    latestCompletedReflection?: PracticeSessionReflection;
    latestMainLesson?: PracticeAnnotationSummary;
    latestEventLinkedNote?: PracticeAnnotationSummary;
    latestChallengeResult?: PracticeChallengeSummary;
    latestInstructorFeedback?: PracticeInstructorFeedbackSummary;
  };
  linkedAccountReadiness: AccountLinkedReadinessSummary;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface WorkspaceAccountLinkedPerformanceSummary {
  visibleLimit: number;
  activeJournalSummaryCount: number;
  autoCopyActivityStudentCount: number;
  copiedSignalOutcomeCounts: Partial<Record<AccountLinkedLedgerStatus, number>>;
  studentsNeedingAttention: {
    failedAutoCopyAttempts: number;
    missingConsent: number;
    missingBilling: number;
    lockedSetup: number;
  };
  recentCopiedSignalItems: AccountLinkedTradeLedgerSummary[];
  bounded: boolean;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface AdminAccountLinkedLedgerDiagnostics {
  visibleLimit: number;
  sourceCounts: Partial<Record<AccountLinkedLedgerSource, number>>;
  statusCounts: Partial<Record<AccountLinkedLedgerStatus, number>>;
  failureCount: number;
  accountReadinessCounts: {
    cryptoLinked: number;
    forexLinked: number;
    lockedSetup: number;
  };
  recentEntries: AccountLinkedTradeLedgerSummary[];
  bounded: boolean;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface CryptoExecutionReadiness {
  state: ExecutionReadinessState;
  executable: boolean;
  paperTradingOnly: boolean;
  reasons: string[];
}

export type CryptoSignalRoutingTrigger = "created_published" | "patched_published";

export interface CryptoSignalRoutingSummary {
  workspaceId: string;
  signalId: string;
  trigger: CryptoSignalRoutingTrigger;
  routed: boolean;
  candidateLimit: number;
  candidateCount: number;
  allowedCount: number;
  blockedCount: number;
  requiresReviewCount: number;
  intentCount: number;
  bounded: boolean;
  warnings: string[];
  completedAt: IsoDateString;
}

export interface CryptoPaperRoutingOverview {
  recentIntentCount: number;
  readyForPaperCount: number;
  riskBlockedCount: number;
  boundedRoutingWarningCount: number;
  lastRoutedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CryptoExecutionIntentSummary {
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  status: ExecutionIntentStatus;
  paperTradingOnly: boolean;
  riskDecisionId?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  expiresAt?: IsoDateString;
}

export interface CryptoOrderAttemptSummary {
  orderAttemptId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  executionMode: CryptoExecutionMode;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  status: OrderAttemptStatus;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  requestedAt?: IsoDateString;
  completedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CryptoRiskDecisionSummary {
  decisionId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  status: RiskDecisionStatus;
  blockedReason?: string;
  checkCount: number;
  failedCheckKeys: CryptoRiskCheckKey[];
  decidedAt: IsoDateString;
}

export interface CryptoExecutionAuditEventSummary {
  eventId: string;
  action: ExecutionAuditAction;
  actorType: ExecutionAuditActorType;
  studentId?: string;
  targetType: ExecutionAuditEventRecord["targetType"];
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  createdAt: IsoDateString;
}

export interface CryptoPaperExecutionPreview {
  visibleLimit: number;
  intents: CryptoExecutionIntentSummary[];
  orderAttempts: CryptoOrderAttemptSummary[];
  riskDecisions: CryptoRiskDecisionSummary[];
  auditEvents: CryptoExecutionAuditEventSummary[];
  bounded: {
    intents: boolean;
    orderAttempts: boolean;
    riskDecisions: boolean;
    auditEvents: boolean;
  };
  warnings: string[];
}

export type ForexPaperIntentStatus =
  | "ready_for_forex_paper"
  | "completed_forex_paper"
  | "blocked_forex_paper"
  | "confirmation_required"
  | "stale_expired"
  | "failed_forex_paper";

export type ForexPaperAttemptStatus = "simulated" | "failed" | "skipped";

export interface ForexPaperExecutionIntentRecord {
  intentId: string;
  workspaceId: string;
  signalId: string;
  studentId: string;
  market: "forex";
  pair: string;
  side: "buy" | "sell";
  orderType: "paper_market" | "paper_limit";
  status: ForexPaperIntentStatus;
  executionMode: CrossAssetAutoCopyExecutionMode;
  sizingMode: CrossAssetAutoCopySizingMode;
  simulatedNotional: number;
  riskEstimateLabel: string;
  idempotencyKey: string;
  sourceSignalVersion?: string;
  riskDecisionId?: string;
  paperOnly: true;
  entitlementSnapshot: Pick<
    StudentEntitlementSummary,
    "tierId" | "tierLabel" | "subscriptionStatus" | "riskPosture"
  > & {
    autoCopyAccess: FeatureEntitlementAccess;
  };
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  expiresAt?: IsoDateString;
}

export interface ForexPaperAttemptRecord {
  attemptId: string;
  workspaceId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  market: "forex";
  pair: string;
  side: "buy" | "sell";
  status: ForexPaperAttemptStatus;
  simulatedNotional: number;
  riskEstimateLabel: string;
  idempotencyKey: string;
  safeMessage: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  simulatedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexRiskDecisionRecord {
  decisionId: string;
  workspaceId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  pair: string;
  status: RiskDecisionStatus;
  checks: ExecutionRiskCheck[];
  blockedReason?: string;
  decidedAt: IsoDateString;
  decidedBy: string;
}

export interface ForexExecutionAuditEventRecord {
  eventId: string;
  action: string;
  actorType: ExecutionAuditActorType;
  actorId: string;
  workspaceId: string;
  studentId?: string;
  targetType: "signal" | "intent" | "risk_decision" | "paper_attempt" | "confirmation";
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  after?: Record<string, unknown>;
  createdAt: IsoDateString;
}

export interface ForexPaperRoutingSummary {
  workspaceId: string;
  signalId: string;
  trigger: CryptoSignalRoutingTrigger;
  routed: boolean;
  candidateLimit: number;
  candidateCount: number;
  allowedCount: number;
  alertsOnlyCount: number;
  blockedCount: number;
  confirmationRequiredCount: number;
  staleExpiredCount: number;
  intentCount: number;
  bounded: boolean;
  warnings: string[];
  completedAt: IsoDateString;
}

export interface ForexPaperRoutingOverview {
  recentIntentCount: number;
  readyForPaperCount: number;
  completedPaperCount: number;
  confirmationRequiredCount: number;
  riskBlockedCount: number;
  boundedRoutingWarningCount: number;
  lastRoutedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexPaperIntentSummary {
  intentId: string;
  signalId: string;
  studentId: string;
  pair: string;
  side: "buy" | "sell";
  status: ForexPaperIntentStatus;
  executionMode: CrossAssetAutoCopyExecutionMode;
  sizingMode: CrossAssetAutoCopySizingMode;
  simulatedNotional: number;
  riskDecisionId?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexPaperAttemptSummary {
  attemptId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  pair: string;
  side: "buy" | "sell";
  status: ForexPaperAttemptStatus;
  simulatedNotional: number;
  safeMessage: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  simulatedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexRiskDecisionSummary {
  decisionId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  pair: string;
  status: RiskDecisionStatus;
  blockedReason?: string;
  checkCount: number;
  failedCheckKeys: CryptoRiskCheckKey[];
  decidedAt: IsoDateString;
}

export interface ForexExecutionAuditEventSummary {
  eventId: string;
  action: string;
  actorType: ExecutionAuditActorType;
  studentId?: string;
  targetType: ForexExecutionAuditEventRecord["targetType"];
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  createdAt: IsoDateString;
}

export interface ForexConfirmationSummary {
  confirmationId: string;
  signalId: string;
  studentId: string;
  status: CrossAssetConfirmationStatus;
  symbolOrPair: string;
  reason: "execution_mode" | "stale_signal";
  expiresAt: IsoDateString;
  safeMessage: string;
  updatedAt: IsoDateString;
}

export interface ForexPaperExecutionPreview {
  visibleLimit: number;
  routing: ForexPaperRoutingOverview;
  intents: ForexPaperIntentSummary[];
  attempts: ForexPaperAttemptSummary[];
  riskDecisions: ForexRiskDecisionSummary[];
  confirmations: ForexConfirmationSummary[];
  auditEvents: ForexExecutionAuditEventSummary[];
  bounded: {
    intents: boolean;
    attempts: boolean;
    riskDecisions: boolean;
    confirmations: boolean;
    auditEvents: boolean;
  };
  warnings: string[];
}

export type ForexDemoIntentStatus =
  | "ready_for_forex_demo"
  | "submitted_forex_demo"
  | "filled_forex_demo"
  | "partially_filled_forex_demo"
  | "failed_forex_demo"
  | "cancel_requested_forex_demo"
  | "cancelled_forex_demo"
  | "reconcile_required_forex_demo"
  | "skipped_forex_demo";

export interface ForexDemoExecutionControlRecord {
  scope: CryptoLiveSandboxControlScope;
  workspaceId?: string;
  demoEnabled: boolean;
  demoOrderCallsEnabled: boolean;
  dryRun: boolean;
  killSwitchEnabled: boolean;
  killSwitchReason?: string;
  allowedPairs: string[];
  maxNotionalUsd: number;
  maxOpenOrdersPerStudent: number;
  updatedAt: IsoDateString;
  updatedBy?: string;
}

export interface ForexDemoExecutionIntentRecord {
  intentId: string;
  workspaceId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  provider: ForexConnectionProvider;
  environment: "demo";
  executionMode: "forex_demo";
  market: "forex";
  pair: string;
  side: "buy" | "sell";
  orderType: "market";
  status: ForexDemoIntentStatus;
  volume: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  simulatedNotional: number;
  idempotencyKey: string;
  sourceSignalVersion?: string;
  gateDecisionId?: string;
  providerClientOrderId: string;
  demoOnly: true;
  dryRun: boolean;
  entitlementSnapshot: Pick<
    StudentEntitlementSummary,
    "tierId" | "tierLabel" | "subscriptionStatus" | "riskPosture"
  > & {
    autoCopyAccess: FeatureEntitlementAccess;
  };
  gateSnapshot: {
    platformDemoEnabled: boolean;
    workspaceDemoEnabled: boolean;
    demoOrderCallsEnabled: boolean;
    dryRun: boolean;
    pairAllowlisted: boolean;
    demoConnectionVerified: boolean;
    mockConnectionBlocked: boolean;
  };
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  expiresAt?: IsoDateString;
}

export interface ForexDemoExecutionQueueRecord {
  queueId: string;
  workspaceId: string;
  signalId: string;
  intentId: string;
  studentId: string;
  connectionId: string;
  provider: ForexConnectionProvider;
  environment: "demo";
  executionMode: "forex_demo";
  market: "forex";
  pair: string;
  side: "buy" | "sell";
  status: "queued";
  trigger: "post_signal_publish";
  idempotencyKey: string;
  demoOnly: true;
  dryRun: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexDemoOrderAttemptRecord {
  attemptId: string;
  workspaceId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  provider: ForexConnectionProvider;
  environment: "demo";
  executionMode: "forex_demo";
  pair: string;
  side: "buy" | "sell";
  orderType: "market";
  status: ForexDemoIntentStatus;
  volume: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  requestedNotionalUsd: number;
  idempotencyKey: string;
  providerClientOrderId: string;
  providerOrderId?: string;
  providerOrderRef?: string;
  providerExecutionIdentity?: string;
  providerHttpStatus?: number;
  canonicalSymbol?: string;
  providerSymbol?: string;
  dryRun: boolean;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  sanitizedProviderErrorCode?: string;
  sanitizedProviderErrorMessage?: string;
  submittedAt?: IsoDateString;
  acknowledgedAt?: IsoDateString;
  completedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexDemoReconciliationRecord {
  reconciliationId: string;
  workspaceId: string;
  intentId: string;
  attemptId: string;
  provider: ForexConnectionProvider;
  environment: "demo";
  status: CryptoLiveSandboxReconciliationStatus;
  normalizedOrderStatus?: ForexDemoIntentStatus;
  safeMessage: string;
  sanitizedFailureCode?: string;
  checkedAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexDemoGateDecisionRecord {
  decisionId: string;
  workspaceId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId?: string;
  pair: string;
  status: RiskDecisionStatus;
  checks: ExecutionRiskCheck[];
  blockedReason?: string;
  decidedAt: IsoDateString;
  decidedBy: string;
}

export interface ForexDemoAuditEventRecord {
  eventId: string;
  action: string;
  actorType: ExecutionAuditActorType;
  actorId: string;
  workspaceId: string;
  studentId?: string;
  targetType: "signal" | "intent" | "execution_queue" | "gate_decision" | "demo_attempt" | "reconciliation" | "confirmation" | "control";
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  after?: Record<string, unknown>;
  createdAt: IsoDateString;
}

export interface ForexDemoRoutingSummary {
  workspaceId: string;
  signalId: string;
  trigger: CryptoSignalRoutingTrigger;
  routed: boolean;
  candidateLimit: number;
  candidateCount: number;
  readyCount: number;
  blockedCount: number;
  confirmationRequiredCount: number;
  staleExpiredCount: number;
  intentCount: number;
  dryRunOnly: boolean;
  bounded: boolean;
  warnings: string[];
  completedAt: IsoDateString;
}

export interface ForexDemoRoutingOverview {
  recentIntentCount: number;
  readyForDemoCount: number;
  submittedDemoCount: number;
  filledDemoCount: number;
  confirmationRequiredCount: number;
  blockedCount: number;
  boundedRoutingWarningCount: number;
  lastRoutedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexDemoIntentSummary {
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  provider: ForexConnectionProvider;
  environment: "demo";
  pair: string;
  side: "buy" | "sell";
  orderType: "market";
  status: ForexDemoIntentStatus;
  volume: number;
  simulatedNotional: number;
  dryRun: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexDemoOrderAttemptSummary {
  attemptId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  provider: ForexConnectionProvider;
  environment: "demo";
  pair: string;
  side: "buy" | "sell";
  orderType: "market";
  status: ForexDemoIntentStatus;
  volume: number;
  requestedNotionalUsd: number;
  providerOrderRef?: string;
  providerExecutionIdentity?: string;
  providerHttpStatus?: number;
  canonicalSymbol?: string;
  providerSymbol?: string;
  dryRun: boolean;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  sanitizedProviderErrorCode?: string;
  sanitizedProviderErrorMessage?: string;
  submittedAt?: IsoDateString;
  completedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexDemoReconciliationSummary {
  reconciliationId: string;
  intentId: string;
  attemptId: string;
  provider: ForexConnectionProvider;
  environment: "demo";
  status: CryptoLiveSandboxReconciliationStatus;
  normalizedOrderStatus?: ForexDemoIntentStatus;
  safeMessage: string;
  sanitizedFailureCode?: string;
  checkedAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexDemoGateDecisionSummary {
  decisionId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId?: string;
  pair: string;
  status: RiskDecisionStatus;
  blockedReason?: string;
  checkCount: number;
  failedCheckKeys: CryptoRiskCheckKey[];
  decidedAt: IsoDateString;
}

export interface ForexDemoAuditEventSummary {
  eventId: string;
  action: string;
  actorType: ExecutionAuditActorType;
  studentId?: string;
  targetType: ForexDemoAuditEventRecord["targetType"];
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  createdAt: IsoDateString;
}

export interface ForexDemoExecutionPreview {
  visibleLimit: number;
  routing: ForexDemoRoutingOverview;
  env: {
    demoEnabled: boolean;
    demoOrderCallsEnabled: boolean;
    demoDryRun: boolean;
    maxNotionalUsd: number;
  };
  platformControl?: ForexDemoExecutionControlRecord;
  workspaceControl?: ForexDemoExecutionControlRecord;
  intents: ForexDemoIntentSummary[];
  attempts: ForexDemoOrderAttemptSummary[];
  reconciliations: ForexDemoReconciliationSummary[];
  gateDecisions: ForexDemoGateDecisionSummary[];
  auditEvents: ForexDemoAuditEventSummary[];
  bounded: {
    intents: boolean;
    attempts: boolean;
    reconciliations: boolean;
    gateDecisions: boolean;
    auditEvents: boolean;
  };
  warnings: string[];
}

export type ForexLiveCanaryIntentStatus =
  | "blocked_live_forex_canary"
  | "ready_live_forex_canary"
  | "dry_run_live_forex_canary"
  | "submitted_live_forex_canary"
  | "filled_live_forex_canary"
  | "partially_filled_live_forex_canary"
  | "failed_live_forex_canary"
  | "skipped_live_forex_canary";

export interface ForexLiveCanaryAccountAllowlistEntry {
  accountFingerprint: string;
  noWithdrawalCapabilityConfirmed: boolean;
}

export interface ForexLiveCanaryControlRecord {
  scope: CryptoLiveSandboxControlScope;
  workspaceId?: string;
  productionConnectionSetupEnabled: boolean;
  canaryEnabled: boolean;
  orderCallsEnabled: boolean;
  dryRun: boolean;
  killSwitchEnabled: boolean;
  killSwitchReason?: string;
  allowedWorkspaceIds: string[];
  allowedStudentIds: string[];
  allowedPairs: string[];
  accountAllowlist: ForexLiveCanaryAccountAllowlistEntry[];
  maxNotionalUsd: number;
  maxDailyNotionalUsd: number;
  maxVolume: number;
  maxOpenOrdersPerStudent: 1;
  updatedAt: IsoDateString;
  updatedBy?: string;
}

export interface ForexLiveCanaryIntentRecord {
  intentId: string;
  workspaceId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  provider: ForexConnectionProvider;
  environment: "production";
  executionMode: "forex_live_canary";
  market: "forex";
  pair: string;
  side: "buy" | "sell";
  orderType: "market";
  status: ForexLiveCanaryIntentStatus;
  volume: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  requestedNotionalUsd: number;
  dailyNotionalUsd: number;
  idempotencyKey: string;
  sourceSignalVersion?: string;
  gateDecisionId?: string;
  providerClientOrderId: string;
  liveCanary: true;
  dryRun: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  expiresAt?: IsoDateString;
}

export interface ForexLiveCanaryOrderAttemptRecord {
  attemptId: string;
  workspaceId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  provider: ForexConnectionProvider;
  environment: "production";
  executionMode: "forex_live_canary";
  pair: string;
  side: "buy" | "sell";
  orderType: "market";
  status: ForexLiveCanaryIntentStatus;
  volume: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  requestedNotionalUsd: number;
  idempotencyKey: string;
  providerClientOrderId: string;
  providerOrderId?: string;
  providerOrderRef?: string;
  providerExecutionIdentity?: string;
  ledgerProjectionStatus?: AccountLinkedLedgerProjectionStatus;
  ledgerProjectionAttempts?: number;
  ledgerProjectionLastError?: string;
  ledgerProjectionNextAttemptAt?: IsoDateString;
  ledgerProjectionLeaseOwner?: string;
  ledgerProjectionLeaseExpiresAt?: IsoDateString;
  ledgerProjectedAt?: IsoDateString;
  providerHttpStatus?: number;
  canonicalSymbol?: string;
  providerSymbol?: string;
  dryRun: boolean;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  sanitizedProviderErrorCode?: string;
  sanitizedProviderErrorMessage?: string;
  submittedAt?: IsoDateString;
  acknowledgedAt?: IsoDateString;
  completedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexLiveCanaryGateDecisionRecord {
  decisionId: string;
  workspaceId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId?: string;
  pair: string;
  status: RiskDecisionStatus;
  checks: ExecutionRiskCheck[];
  blockedReason?: string;
  decidedAt: IsoDateString;
  decidedBy: string;
}

export interface ForexLiveCanaryAuditEventRecord {
  eventId: string;
  action: string;
  actorType: ExecutionAuditActorType;
  actorId: string;
  workspaceId: string;
  studentId?: string;
  targetType: "signal" | "intent" | "gate_decision" | "live_canary_attempt" | "control";
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  after?: Record<string, unknown>;
  createdAt: IsoDateString;
}

export interface ForexLiveCanaryRoutingSummary {
  workspaceId: string;
  signalId: string;
  trigger: CryptoSignalRoutingTrigger;
  routed: boolean;
  candidateLimit: number;
  candidateCount: number;
  readyCount: number;
  blockedCount: number;
  intentCount: number;
  dryRunOnly: boolean;
  bounded: boolean;
  warnings: string[];
  completedAt: IsoDateString;
}

export interface ForexLiveCanaryRoutingOverview {
  recentIntentCount: number;
  readyCount: number;
  dryRunCount: number;
  submittedCount: number;
  filledCount: number;
  blockedCount: number;
  boundedRoutingWarningCount: number;
  lastRoutedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexLiveCanaryIntentSummary {
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  provider: ForexConnectionProvider;
  environment: "production";
  pair: string;
  side: "buy" | "sell";
  orderType: "market";
  status: ForexLiveCanaryIntentStatus;
  volume: number;
  requestedNotionalUsd: number;
  dryRun: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexLiveCanaryOrderAttemptSummary {
  attemptId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  provider: ForexConnectionProvider;
  environment: "production";
  pair: string;
  side: "buy" | "sell";
  orderType: "market";
  status: ForexLiveCanaryIntentStatus;
  volume: number;
  requestedNotionalUsd: number;
  providerOrderRef?: string;
  providerHttpStatus?: number;
  canonicalSymbol?: string;
  providerSymbol?: string;
  dryRun: boolean;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  sanitizedProviderErrorCode?: string;
  sanitizedProviderErrorMessage?: string;
  submittedAt?: IsoDateString;
  completedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexLiveCanaryGateDecisionSummary {
  decisionId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId?: string;
  pair: string;
  status: RiskDecisionStatus;
  blockedReason?: string;
  checkCount: number;
  failedCheckKeys: CryptoRiskCheckKey[];
  decidedAt: IsoDateString;
}

export interface ForexLiveCanaryAuditEventSummary {
  eventId: string;
  action: string;
  actorType: ExecutionAuditActorType;
  studentId?: string;
  targetType: ForexLiveCanaryAuditEventRecord["targetType"];
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  createdAt: IsoDateString;
}

export interface ForexLiveCanaryExecutionPreview {
  visibleLimit: number;
  routing: ForexLiveCanaryRoutingOverview;
  env: {
    liveCanaryEnabled: boolean;
    liveOrderCallsEnabled: boolean;
    liveDryRun: boolean;
    maxNotionalUsd: number;
    maxDailyNotionalUsd: number;
    maxVolume: number;
  };
  platformControl?: ForexLiveCanaryControlRecord;
  workspaceControl?: ForexLiveCanaryControlRecord;
  intents: ForexLiveCanaryIntentSummary[];
  attempts: ForexLiveCanaryOrderAttemptSummary[];
  gateDecisions: ForexLiveCanaryGateDecisionSummary[];
  auditEvents: ForexLiveCanaryAuditEventSummary[];
  bounded: {
    intents: boolean;
    attempts: boolean;
    gateDecisions: boolean;
    auditEvents: boolean;
  };
  warnings: string[];
}

export interface ForexLiveCanaryWorkerRunResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  liveOrdersEnabled: boolean;
  liveDryRun: boolean;
  candidateLimit: 1;
  candidateCount: number;
  processedCount: number;
  dryRunCount: number;
  submittedCount: number;
  skippedCount: number;
  failedCount: number;
  projectionRepair?: {
    attemptedCount: number;
    repairedCount: number;
    retryScheduledCount: number;
    finalFailedCount: number;
    skippedCount?: number;
    notApplicableCount?: number;
  };
  bounded: boolean;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface ForexAutoCopySubscriptionRecord {
  subscriptionId: string;
  workspaceId: string;
  studentId: string;
  status: ForexAutoCopyBillingStatus;
  billingState: "paid" | "pending" | "failed" | "trial" | "past_due" | "cancelled" | "expired" | "unknown";
  rail: "paystack" | "solana" | "manual" | "unknown";
  priceLabel?: string;
  latestPaymentIntentId?: string;
  latestReference?: string;
  latestReferenceRef?: string;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  lastVerifiedAt?: IsoDateString;
  currentPeriodEnd?: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexAutoCopyPaymentIntentSummary {
  paymentIntentId: string;
  studentId: string;
  status: "pending" | "checkout_opened" | "verified" | "failed" | "cancelled" | "expired";
  rail: "paystack";
  referenceRef: string;
  amountNgn: number;
  currency: "NGN";
  safeMessage: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CryptoAutoCopySubscriptionRecord {
  subscriptionId: string;
  workspaceId: string;
  studentId: string;
  status: CryptoAutoCopyBillingStatus;
  billingState: "paid" | "pending" | "failed" | "past_due" | "cancelled" | "expired" | "unknown";
  rail: "paystack" | "solana" | "manual" | "unknown";
  priceLabel?: string;
  latestPaymentIntentId?: string;
  latestReference?: string;
  latestReferenceRef?: string;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  lastVerifiedAt?: IsoDateString;
  currentPeriodEnd?: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CryptoAutoCopyPaymentIntentSummary {
  paymentIntentId: string;
  studentId: string;
  status: "pending" | "checkout_opened" | "verified" | "failed" | "cancelled" | "expired";
  rail: "paystack";
  referenceRef: string;
  amountNgn: number;
  currency: "NGN";
  safeMessage: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CryptoAutoCopySubscriptionPreview {
  billing: {
    status: CryptoAutoCopyBillingStatus;
    entitled: boolean;
    reason: string;
    priceLabel?: string;
    currentPeriodEnd?: IsoDateString;
    latestReferenceRef?: string;
  };
  paymentIntents: CryptoAutoCopyPaymentIntentSummary[];
  bounded: {
    paymentIntents: boolean;
  };
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface ForexProvisioningRequestRecord {
  requestId: string;
  workspaceId: string;
  studentId: string;
  platform: ForexAutoCopyPlatform;
  provider: ForexProvisioningProvider;
  providerMode: ForexProvisioningProviderMode;
  status: ForexProvisioningRequestStatus;
  label?: string;
  brokerServerRef: string;
  brokerLoginRef: string;
  brokerServerFingerprint: string;
  brokerLoginFingerprint: string;
  passwordHandling: "discarded_mock_dry_run" | "vault_pending" | "not_stored";
  safeMessage: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexProvisionedAccountRecord {
  accountId: string;
  requestId: string;
  workspaceId: string;
  studentId: string;
  platform: ForexAutoCopyPlatform;
  provider: ForexProvisioningProvider;
  providerMode: ForexProvisioningProviderMode;
  status: ForexProvisioningStatus;
  active: boolean;
  label?: string;
  brokerServerRef: string;
  brokerLoginRef: string;
  brokerServerFingerprint: string;
  brokerLoginFingerprint: string;
  noBrokerExecution: true;
  noMetaApiResourceCreated: boolean;
  cleanupStatus?: "not_required" | "pending" | "complete" | "failed";
  disabledAt?: IsoDateString;
  disabledReason?: string;
  safeMessage: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexProvisioningAuditEventRecord {
  eventId: string;
  action: string;
  actorType: ExecutionAuditActorType;
  actorId: string;
  workspaceId: string;
  studentId?: string;
  targetType: "subscription" | "provisioning_request" | "provisioned_account" | "cleanup" | "control";
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  after?: Record<string, unknown>;
  createdAt: IsoDateString;
}

export interface ForexProvisioningRequestSummary {
  requestId: string;
  studentId: string;
  platform: ForexAutoCopyPlatform;
  provider: ForexProvisioningProvider;
  providerMode: ForexProvisioningProviderMode;
  status: ForexProvisioningRequestStatus;
  label?: string;
  brokerServerRef: string;
  brokerLoginRef: string;
  safeMessage: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ForexProvisionedAccountSummary {
  accountId: string;
  requestId: string;
  studentId: string;
  platform: ForexAutoCopyPlatform;
  provider: ForexProvisioningProvider;
  providerMode: ForexProvisioningProviderMode;
  status: ForexProvisioningStatus;
  active: boolean;
  label?: string;
  brokerServerRef: string;
  brokerLoginRef: string;
  cleanupStatus?: "not_required" | "pending" | "complete" | "failed";
  safeMessage: string;
  updatedAt: IsoDateString;
}

export interface ForexProvisioningAuditEventSummary {
  eventId: string;
  action: string;
  actorType: ExecutionAuditActorType;
  studentId?: string;
  targetType: ForexProvisioningAuditEventRecord["targetType"];
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  createdAt: IsoDateString;
}

export interface ForexProvisioningPreview {
  visibleLimit: number;
  billing: {
    status: ForexAutoCopyBillingStatus;
    entitled: boolean;
    rail: "paystack" | "solana" | "manual" | "unknown";
    reason: string;
  };
  status: ForexProvisioningStatus;
  canSubmitBrokerDetails: boolean;
  providerMode: ForexProvisioningProviderMode;
  paidStudentCount: number;
  readyToConnectCount: number;
  mockProvisionedCount: number;
  disabledCount: number;
  failedCount: number;
  subscriptionCounts: {
    activePaid: number;
    paymentPending: number;
    paymentFailed: number;
    pastDue: number;
    cancelled: number;
    expired: number;
    notPurchased: number;
  };
  sampledStudentCount: number;
  currentAccount?: ForexProvisionedAccountSummary;
  paymentIntents: ForexAutoCopyPaymentIntentSummary[];
  requests: ForexProvisioningRequestSummary[];
  provisionedAccounts: ForexProvisionedAccountSummary[];
  auditEvents: ForexProvisioningAuditEventSummary[];
  bounded: {
    paymentIntents?: boolean;
    requests: boolean;
    provisionedAccounts: boolean;
    auditEvents: boolean;
    sampledStudents?: boolean;
  };
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface StudentForexAutoCopyCheckoutResponse extends AdminSourceMeta {
  ok: true;
  checkout: {
    paymentIntentId: string;
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amountNgn: number;
    currency: "NGN";
  };
}

export interface StudentForexAutoCopyVerifyResponse extends AdminSourceMeta {
  ok: true;
  status: "verified" | "pending" | "failed";
  message: string;
  overview: StudentCryptoExecutionOverviewResponse;
}

export interface StudentCryptoAutoCopyCheckoutResponse extends AdminSourceMeta {
  ok: true;
  checkout: {
    paymentIntentId: string;
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amountNgn: number;
    currency: "NGN";
  };
}

export interface StudentCryptoAutoCopyVerifyResponse extends AdminSourceMeta {
  ok: true;
  status: "verified" | "pending" | "failed";
  message: string;
  overview: StudentCryptoExecutionOverviewResponse;
}

export interface LiveSandboxIntentSummary {
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  environment: "sandbox";
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  notionalUsdt: number;
  status: CryptoLiveSandboxIntentStatus;
  exchangeClientOrderId: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface LiveSandboxOrderAttemptSummary {
  orderAttemptId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  exchange: CryptoExchangeId;
  environment: "sandbox";
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  status: CryptoLiveSandboxIntentStatus;
  exchangeClientOrderId: string;
  exchangeOrderRef?: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  submittedAt?: IsoDateString;
  completedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export interface LiveSandboxReconciliationSummary {
  reconciliationId: string;
  intentId: string;
  orderAttemptId: string;
  exchange: CryptoExchangeId;
  environment: "sandbox";
  status: CryptoLiveSandboxReconciliationStatus;
  normalizedOrderStatus?: CryptoLiveSandboxIntentStatus;
  safeMessage: string;
  sanitizedFailureCode?: string;
  checkedAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface LiveSandboxAuditEventSummary {
  eventId: string;
  action: string;
  actorType: ExecutionAuditActorType;
  studentId?: string;
  targetType: string;
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  createdAt: IsoDateString;
}

export interface LiveSandboxExecutionPreview {
  visibleLimit: number;
  intents: LiveSandboxIntentSummary[];
  orderAttempts: LiveSandboxOrderAttemptSummary[];
  reconciliations: LiveSandboxReconciliationSummary[];
  auditEvents: LiveSandboxAuditEventSummary[];
  bounded: {
    intents: boolean;
    orderAttempts: boolean;
    reconciliations: boolean;
    auditEvents: boolean;
  };
  warnings: string[];
}

export interface LiveProductionIntentSummary {
  intentId: string;
  signalId: string;
  studentId: string;
  connectionId: string;
  exchange: CryptoExchangeId;
  environment: "production";
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  notionalUsdt: number;
  status: CryptoLiveProductionIntentStatus;
  exchangeClientOrderId: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface LiveProductionOrderAttemptSummary {
  orderAttemptId: string;
  intentId: string;
  signalId: string;
  studentId: string;
  exchange: CryptoExchangeId;
  environment: "production";
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  status: CryptoLiveProductionIntentStatus;
  exchangeClientOrderId: string;
  exchangeOrderRef?: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  balancePrecheckStatus?: LiveProductionBalancePrecheckStatus;
  balancePrecheckCheckedAsset?: string;
  balancePrecheckCheckedAt?: IsoDateString;
  submittedAt?: IsoDateString;
  completedAt?: IsoDateString;
  updatedAt: IsoDateString;
}

export type LiveProductionBalancePrecheckStatus =
  | "sufficient"
  | "insufficient"
  | "unavailable"
  | "credential_missing"
  | "exchange_rejected"
  | "not_supported_yet";

export interface LiveProductionBalancePrecheckSummary {
  status: LiveProductionBalancePrecheckStatus;
  checkedAsset?: string;
  safeMessage: string;
  sanitizedFailureCode?: string;
  checkedAt?: IsoDateString;
}

export interface LiveProductionPreflightCheck {
  key: string;
  label: string;
  status: "ready" | "blocked" | "warning" | "unknown";
  safeMessage: string;
}

export interface LiveProductionReconciliationSummary {
  reconciliationId: string;
  intentId: string;
  orderAttemptId: string;
  exchange: CryptoExchangeId;
  environment: "production";
  status: CryptoLiveSandboxReconciliationStatus;
  normalizedOrderStatus?: CryptoLiveProductionIntentStatus;
  safeMessage: string;
  sanitizedFailureCode?: string;
  checkedAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface LiveProductionAuditEventSummary {
  eventId: string;
  action: string;
  actorType: ExecutionAuditActorType;
  studentId?: string;
  targetType: string;
  targetId: string;
  safeMessage: string;
  severity: ExecutionAuditSeverity;
  createdAt: IsoDateString;
}

export interface LiveProductionExecutionPreview {
  visibleLimit: number;
  env: {
    productionBetaEnabled: boolean;
    productionOrdersEnabled: boolean;
    productionDryRun: boolean;
    productionCanaryEnabled?: boolean;
    legacyLiveFlagIneffective: boolean;
    productionVaultReady: boolean;
  };
  platformControl?: LiveProductionExecutionControlRecord;
  workspaceControl?: LiveProductionExecutionControlRecord;
  preflightReady: boolean;
  preflightChecks: LiveProductionPreflightCheck[];
  balancePrecheck: LiveProductionBalancePrecheckSummary;
  intents: LiveProductionIntentSummary[];
  orderAttempts: LiveProductionOrderAttemptSummary[];
  reconciliations: LiveProductionReconciliationSummary[];
  auditEvents: LiveProductionAuditEventSummary[];
  bounded: {
    intents: boolean;
    orderAttempts: boolean;
    reconciliations: boolean;
    auditEvents: boolean;
  };
  warnings: string[];
}

export type BroadLiveAutoCopyLaunchGateState =
  | "blocked"
  | "dry_run_only"
  | "canary_only"
  | "cohort_ready"
  | "broad_live_blocked"
  | "broad_live_ready";

export type BroadLiveAutoCopyReadinessCheckStatus = "ready" | "blocked" | "warning" | "unknown";

export type BroadLiveAutoCopyReadinessScope = "platform" | "workspace" | "student";

export type BroadLiveAutoCopyReadinessMarket = "platform" | "workspace" | "student" | "crypto" | "forex";

export interface BroadLiveAutoCopyReadinessCheck {
  key: string;
  label: string;
  market: BroadLiveAutoCopyReadinessMarket;
  scope: BroadLiveAutoCopyReadinessScope;
  status: BroadLiveAutoCopyReadinessCheckStatus;
  safeMessage: string;
}

export interface BroadLiveAutoCopyRunbookSection {
  title: string;
  items: string[];
}

export type BroadLiveAutoCopyCohortStatus =
  | "not_configured"
  | "blocked"
  | "dry_run_only"
  | "canary_required"
  | "eligible_for_review"
  | "approved_for_cohort"
  | "cohort_paused"
  | "cohort_removed";

export type BroadLiveAutoCopyCohortAuditAction =
  | "cohort.reviewed"
  | "cohort.approved"
  | "cohort.paused"
  | "cohort.removed";

export interface BroadLiveAutoCopyCohortAuditEventSummary {
  eventId: string;
  workspaceId?: string;
  action: BroadLiveAutoCopyCohortAuditAction;
  status: BroadLiveAutoCopyCohortStatus;
  safeActorRef?: string;
  safeMessage: string;
  createdAt: IsoDateString;
}

export interface BroadLiveAutoCopyCohortGatePreview {
  status: BroadLiveAutoCopyCohortStatus;
  statusLabel: string;
  approvalsEnabled: boolean;
  orderCallsEnabled: boolean;
  dryRun: boolean;
  candidateLimit: number;
  eligibleCandidateCount: number;
  blockedCandidateCount: number;
  approvedCandidateCount: number;
  bounded: boolean;
  checks: BroadLiveAutoCopyReadinessCheck[];
  auditEvents: BroadLiveAutoCopyCohortAuditEventSummary[];
  warnings: string[];
  updatedAt: IsoDateString;
}

export type BroadLiveAutoCopyIncidentPostureStatus =
  | "ready"
  | "watch"
  | "needs_review"
  | "blocked";

export interface BroadLiveAutoCopyIncidentStreamSummary {
  label: string;
  status: BroadLiveAutoCopyIncidentPostureStatus;
  staleAttemptCount: number;
  requiresReviewCount: number;
  blockedCount: number;
  latestSafeMessage?: string;
  updatedAt?: IsoDateString;
}

export interface BroadLiveAutoCopySupportNotePolicy {
  maxLength: number;
  visibility: "super_admin_only";
  allowedActions: Array<"mark_support_review_needed" | "record_incident_note" | "record_rollback_note">;
  safeMessage: string;
}

export interface BroadLiveAutoCopyIncidentReadiness {
  status: BroadLiveAutoCopyIncidentPostureStatus;
  statusLabel: string;
  cryptoProduction: BroadLiveAutoCopyIncidentStreamSummary;
  cryptoCohortDryRun: BroadLiveAutoCopyIncidentStreamSummary;
  forexLiveCanary: BroadLiveAutoCopyIncidentStreamSummary;
  killSwitchStatus: {
    platform: "active" | "inactive" | "unknown";
    workspace: "active" | "inactive" | "unknown";
  };
  dryRunOrderCallPosture: {
    cryptoProduction: "dry_run" | "order_calls_possible" | "disabled";
    cryptoCohort: "dry_run" | "order_calls_possible" | "disabled";
    forexLiveCanary: "dry_run" | "order_calls_possible" | "disabled";
  };
  rollbackChecklist: string[];
  incidentChecklist: string[];
  auditSummary: Array<{
    label: string;
    count: number;
    safeMessage: string;
  }>;
  supportNotePolicy: BroadLiveAutoCopySupportNotePolicy;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface BroadLiveAutoCopyReadinessOverview {
  state: BroadLiveAutoCopyLaunchGateState;
  stateLabel: string;
  scope: BroadLiveAutoCopyReadinessScope;
  workspaceId?: string;
  broadLiveEnabled: boolean;
  cryptoState: BroadLiveAutoCopyLaunchGateState;
  forexState: BroadLiveAutoCopyLaunchGateState;
  cohortGate?: BroadLiveAutoCopyCohortGatePreview;
  incidentReadiness?: BroadLiveAutoCopyIncidentReadiness;
  checks: BroadLiveAutoCopyReadinessCheck[];
  runbooks: BroadLiveAutoCopyRunbookSection[];
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface StudentBroadLiveAutoCopyStatus {
  state: BroadLiveAutoCopyLaunchGateState;
  stateLabel: string;
  safeMessage: string;
  cryptoState: BroadLiveAutoCopyLaunchGateState;
  forexState: BroadLiveAutoCopyLaunchGateState;
  cohortStatus?: BroadLiveAutoCopyCohortStatus;
  cohortStatusLabel?: string;
  visibleChecks: BroadLiveAutoCopyReadinessCheck[];
  updatedAt: IsoDateString;
}

export interface LiveSandboxRoutingSummary {
  workspaceId: string;
  signalId: string;
  routed: boolean;
  candidateLimit: number;
  candidateCount: number;
  readyCount: number;
  blockedCount: number;
  intentCount: number;
  bounded: boolean;
  warnings: string[];
  completedAt: IsoDateString;
}

export interface LiveProductionRoutingSummary {
  workspaceId: string;
  signalId: string;
  routed: boolean;
  candidateLimit: number;
  candidateCount: number;
  readyCount: number;
  blockedCount: number;
  intentCount: number;
  dryRunOnly: boolean;
  bounded: boolean;
  warnings: string[];
  completedAt: IsoDateString;
}

export interface LiveSandboxWorkerRunResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  testnetOrdersEnabled: boolean;
  candidateLimit: number;
  candidateCount: number;
  processedCount: number;
  submittedCount: number;
  skippedCount: number;
  failedCount: number;
  projectionRepair?: {
    attemptedCount: number;
    repairedCount: number;
    retryScheduledCount: number;
    finalFailedCount: number;
    skippedCount?: number;
    notApplicableCount?: number;
  };
  bounded: boolean;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface LiveSandboxReconciliationRunResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  candidateLimit: number;
  candidateCount: number;
  reconciledCount: number;
  requiresReviewCount: number;
  failedCount: number;
  bounded: boolean;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface LiveSandboxCancelResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  orderAttemptId: string;
  status: CryptoLiveSandboxIntentStatus;
  safeMessage: string;
  updatedAt: IsoDateString;
}

export interface LiveProductionWorkerRunResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  env: LiveProductionExecutionPreview["env"];
  candidateLimit: number;
  candidateCount: number;
  processedCount: number;
  dryRunCount: number;
  submittedCount: number;
  skippedCount: number;
  failedCount: number;
  projectionRepair?: {
    attemptedCount: number;
    repairedCount: number;
    retryScheduledCount: number;
    finalFailedCount: number;
    skippedCount?: number;
    notApplicableCount?: number;
  };
  bounded: boolean;
  warnings: string[];
  updatedAt: IsoDateString;
}

export type CryptoLiveCohortRolloutMode = "dry_run" | "submit";

export type CryptoLiveCohortRolloutCandidateStatus =
  | "eligible"
  | "blocked"
  | "skipped"
  | "dry_run"
  | "submitted"
  | "failed";

export interface CryptoLiveCohortRolloutCandidateSummary {
  candidateRef: string;
  status: CryptoLiveCohortRolloutCandidateStatus;
  symbol: string;
  exchange: CryptoExchangeId;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  notionalUsdt: number;
  safeReason: string;
  updatedAt: IsoDateString;
}

export interface CryptoLiveCohortRolloutWorkerRunResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  mode: CryptoLiveCohortRolloutMode;
  cohortStatus: BroadLiveAutoCopyCohortStatus;
  approvalsEnabled: boolean;
  cohortOrderCallsEnabled: boolean;
  cohortDryRun: boolean;
  candidateLimit: number;
  candidateCount: number;
  processedCount: number;
  dryRunCount: number;
  submittedCount: number;
  skippedCount: number;
  blockedCount: number;
  failedCount: number;
  bounded: boolean;
  candidates: CryptoLiveCohortRolloutCandidateSummary[];
  rollbackNote: string;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface LiveProductionReconciliationRunResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  candidateLimit: number;
  candidateCount: number;
  reconciledCount: number;
  requiresReviewCount: number;
  failedCount: number;
  bounded: boolean;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface LiveProductionCancelResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  orderAttemptId: string;
  status: CryptoLiveProductionIntentStatus;
  safeMessage: string;
  updatedAt: IsoDateString;
}

export interface CryptoExecutionWorkerRunResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  liveExecutionEnabled: boolean;
  candidateLimit: number;
  candidateCount: number;
  processedCount: number;
  completedPaperCount: number;
  liveAttemptCount: number;
  skippedCount: number;
  failedCount: number;
  bounded: boolean;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface ForexPaperWorkerRunResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  candidateLimit: number;
  candidateCount: number;
  processedCount: number;
  completedPaperCount: number;
  skippedCount: number;
  failedCount: number;
  bounded: boolean;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface ForexDemoWorkerRunResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  demoOrdersEnabled: boolean;
  demoDryRun: boolean;
  candidateLimit: number;
  candidateCount: number;
  processedCount: number;
  dryRunCount: number;
  submittedCount: number;
  skippedCount: number;
  failedCount: number;
  bounded: boolean;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface ForexDemoReconciliationRunResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  candidateLimit: number;
  candidateCount: number;
  reconciledCount: number;
  requiresReviewCount: number;
  failedCount: number;
  bounded: boolean;
  warnings: string[];
  updatedAt: IsoDateString;
}

export interface ForexDemoCancelResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  attemptId: string;
  status: ForexDemoIntentStatus;
  safeMessage: string;
  updatedAt: IsoDateString;
}

export interface StudentCryptoExecutionOverviewResponse extends AdminSourceMeta {
  ok: true;
  student: {
    studentId: string;
    workspaceId: string;
    tierId: string;
    tierLabel: string;
    riskPosture: StudentRiskPosture;
    autoCopyAccess: FeatureEntitlementAccess;
    autoCopyAccessReason: string;
  };
  readiness: CryptoExecutionReadiness;
  preferences: StudentExecutionPreferencesRecord;
  autoCopyPreferences: {
    crypto: CrossAssetAutoCopyPreferencesRecord;
    forex: CrossAssetAutoCopyPreferencesRecord;
  };
  cryptoAutoCopy: CryptoAutoCopySubscriptionPreview;
  connections: ExchangeConnectionSummary[];
  forexConnections?: ForexConnectionReadinessPreview;
  forexProvisioning?: ForexProvisioningPreview;
  workspaceControl: WorkspaceExecutionControlRecord;
  platformControl: PlatformExecutionControlRecord;
  paperRouting: CryptoPaperRoutingOverview;
  paperExecution: CryptoPaperExecutionPreview;
  forexPaper?: ForexPaperExecutionPreview;
  forexDemo?: ForexDemoExecutionPreview;
  forexLiveCanary?: ForexLiveCanaryExecutionPreview;
  liveSandbox?: LiveSandboxExecutionPreview;
  liveProductionConsent?: LiveProductionConsentRecord;
  liveProduction?: LiveProductionExecutionPreview;
  broadLiveStatus?: StudentBroadLiveAutoCopyStatus;
}

export interface WorkspaceCryptoExecutionOverviewResponse extends AdminSourceMeta {
  ok: true;
  workspaceId: string;
  workspaceControl: WorkspaceExecutionControlRecord;
  summary: {
    connectionCounts: Record<ExchangeConnectionStatus, number>;
    readinessCounts: Record<ExecutionReadinessState, number>;
    recentFailureCount: number;
    sampledConnectionCount: number;
    autoCopyPosture: AutoCopyRoutingPostureSummary;
    paperRouting: CryptoPaperRoutingOverview;
    paperExecution: CryptoPaperExecutionPreview;
    forexPaper?: ForexPaperExecutionPreview;
    forexDemo?: ForexDemoExecutionPreview;
    forexLiveCanary?: ForexLiveCanaryExecutionPreview;
    forexConnections?: ForexConnectionReadinessPreview;
    forexProvisioning?: ForexProvisioningPreview;
    accountLinkedPerformance?: WorkspaceAccountLinkedPerformanceSummary;
    accountLinkedDiagnostics?: AdminAccountLinkedLedgerDiagnostics;
    liveSandbox?: LiveSandboxExecutionPreview;
    liveProduction?: LiveProductionExecutionPreview;
    broadLiveReadiness?: BroadLiveAutoCopyReadinessOverview;
    updatedAt: IsoDateString;
  };
}

export interface AdminCryptoExecutionOverviewResponse extends AdminSourceMeta {
  ok: true;
  platformControl: PlatformExecutionControlRecord;
  summary: {
    workspaceKillSwitchCount: number;
    riskyWorkspaceCount: number;
    recentFailureCount: number;
    paperRouting: CryptoPaperRoutingOverview;
    paperExecution: CryptoPaperExecutionPreview;
    forexPaper?: ForexPaperExecutionPreview;
    forexDemo?: ForexDemoExecutionPreview;
    forexLiveCanary?: ForexLiveCanaryExecutionPreview;
    forexConnections?: ForexConnectionReadinessPreview;
    forexProvisioning?: ForexProvisioningPreview;
    accountLinkedPerformance?: WorkspaceAccountLinkedPerformanceSummary;
    accountLinkedDiagnostics?: AdminAccountLinkedLedgerDiagnostics;
    liveSandbox?: LiveSandboxExecutionPreview;
    liveProduction?: LiveProductionExecutionPreview;
    broadLiveReadiness?: BroadLiveAutoCopyReadinessOverview;
    sampledWorkspaceCount: number;
    updatedAt: IsoDateString;
  };
}
