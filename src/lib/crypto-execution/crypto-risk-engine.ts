import "server-only";

import {
  evaluateStaleSignalPolicy,
  defaultCrossAssetAutoCopyPreferences
} from "@/lib/crypto-execution/auto-copy-preferences";
import {
  canonicalSignalPair,
  normalizeSignalPairForMarket
} from "@/lib/workspace/signal-symbols";
import type {
  CrossAssetAutoCopyPreferencesRecord,
  CryptoExchangeEnvironment,
  CryptoExecutionReadiness,
  CryptoRiskCheckKey,
  ExchangeConnectionSummary,
  ExecutionRiskCheck,
  PlatformExecutionControlRecord,
  RiskDecisionStatus,
  StudentExecutionPreferencesRecord,
  WorkspaceExecutionControlRecord
} from "@/types/crypto-execution";
import type { StudentEntitlementSummary } from "@/types/entitlements";
import type { WorkspaceSignalRecord } from "@/types/workspace-dashboard";

const CONNECTION_PERMISSION_STALE_MS = 1000 * 60 * 60 * 24 * 30;

export type CryptoRiskCandidate = {
  studentId: string;
  entitlements: StudentEntitlementSummary;
  cryptoAutoCopyBilling?: {
    active: boolean;
    reason: string;
  };
  preferences: StudentExecutionPreferencesRecord;
  autoCopyPreferences?: CrossAssetAutoCopyPreferencesRecord;
  connections: ExchangeConnectionSummary[];
  readiness: CryptoExecutionReadiness;
  workspaceControl: WorkspaceExecutionControlRecord;
  platformControl: PlatformExecutionControlRecord;
};

export type CryptoRiskEvaluationResult = {
  status: RiskDecisionStatus;
  checks: ExecutionRiskCheck[];
  blockedReason?: string;
  symbol: string;
  connection?: ExchangeConnectionSummary;
};

function canonicalSymbol(value: string) {
  return canonicalSignalPair(value);
}

export function normalizeCryptoSignalSymbol(value: string) {
  return normalizeSignalPairForMarket(value, "crypto") ?? "";
}

function firstNumericLevel(value: string) {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildCheck(
  key: CryptoRiskCheckKey,
  status: RiskDecisionStatus,
  message: string
): ExecutionRiskCheck {
  return { key, status, message };
}

function pickVerifiedConnection(connections: ExchangeConnectionSummary[], preferSandbox: boolean) {
  const verifiedConnections = connections
    .filter((connection) => connection.status === "verified")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  if (preferSandbox) {
    return verifiedConnections.find((connection) => connection.environment === "sandbox")
      ?? verifiedConnections[0];
  }

  return verifiedConnections[0];
}

function isConnectionFresh(connection: ExchangeConnectionSummary, now: Date) {
  if (!connection.lastVerifiedAt) {
    return false;
  }

  const verifiedAt = Date.parse(connection.lastVerifiedAt);
  return Number.isFinite(verifiedAt) && now.getTime() - verifiedAt <= CONNECTION_PERMISSION_STALE_MS;
}

function sandboxMessage({
  platformSandboxOnly,
  workspaceSandboxOnly,
  environment
}: {
  platformSandboxOnly: boolean;
  workspaceSandboxOnly: boolean;
  environment?: CryptoExchangeEnvironment;
}) {
  if (!platformSandboxOnly && !workspaceSandboxOnly) {
    return "Sandbox-only controls are off; Stage 15C still creates paper intents only.";
  }

  if (environment === "production") {
    return "Sandbox-only controls are active, so production exchange connections cannot receive paper execution intents.";
  }

  if (platformSandboxOnly && workspaceSandboxOnly) {
    return "Platform and workspace controls are sandbox-only; paper routing can continue on sandbox/testnet metadata.";
  }

  return platformSandboxOnly
    ? "Platform controls are sandbox-only; paper routing can continue on sandbox/testnet metadata."
    : "Workspace controls are sandbox-only; paper routing can continue on sandbox/testnet metadata.";
}

function directionalLevelsAreValid({
  side,
  entry,
  takeProfit,
  stopLoss
}: {
  side: WorkspaceSignalRecord["direction"];
  entry: number | null;
  takeProfit: number | null;
  stopLoss: number | null;
}) {
  if (!entry || !takeProfit || !stopLoss) {
    return false;
  }

  return side === "buy"
    ? takeProfit > entry && stopLoss < entry
    : takeProfit < entry && stopLoss > entry;
}

export function evaluateCryptoSignalRiskCandidate({
  signal,
  candidate,
  now = new Date()
}: {
  signal: WorkspaceSignalRecord;
  candidate: CryptoRiskCandidate;
  now?: Date;
}): CryptoRiskEvaluationResult {
  const checks: ExecutionRiskCheck[] = [];
  const symbol = normalizeCryptoSignalSymbol(signal.pair);
  const entry = firstNumericLevel(signal.entry);
  const takeProfit = firstNumericLevel(signal.takeProfit);
  const stopLoss = firstNumericLevel(signal.stopLoss);
  const autoCopyEntitlement = candidate.entitlements.features.autoCopy;
  const autoCopyPreferences = candidate.autoCopyPreferences ?? defaultCrossAssetAutoCopyPreferences({
    workspaceId: signal.workspaceId,
    studentId: candidate.studentId,
    market: "crypto"
  });
  const staleDecision = evaluateStaleSignalPolicy({
    signal,
    preferences: autoCopyPreferences,
    now
  });
  const platformSandboxOnly = candidate.platformControl.sandboxOnly;
  const workspaceSandboxOnly = candidate.workspaceControl.sandboxOnly;
  const sandboxOnly = platformSandboxOnly || workspaceSandboxOnly;
  const selectedConnection = pickVerifiedConnection(candidate.connections, sandboxOnly);

  checks.push(buildCheck(
    "signal_status",
    signal.status === "published" ? "allowed" : "blocked",
    signal.status === "published"
      ? "Signal is published."
      : "Only published signals can create paper execution intents."
  ));
  checks.push(buildCheck(
    "signal_market",
    signal.market === "crypto" ? "allowed" : "blocked",
    signal.market === "crypto"
      ? "Signal market is crypto."
      : "Forex signals do not create crypto execution intents."
  ));
  checks.push(buildCheck(
    "signal_levels",
    entry && takeProfit && stopLoss ? "allowed" : "blocked",
    entry && takeProfit && stopLoss
      ? "Entry, take-profit, and stop-loss levels are present."
      : "Entry, take-profit, and stop-loss levels are required before routing."
  ));
  checks.push(buildCheck(
    "signal_directional_levels",
    directionalLevelsAreValid({
      side: signal.direction,
      entry,
      takeProfit,
      stopLoss
    }) ? "allowed" : "blocked",
    directionalLevelsAreValid({
      side: signal.direction,
      entry,
      takeProfit,
      stopLoss
    })
      ? "Signal entry, take-profit, and stop-loss levels match the trade direction."
      : signal.direction === "buy"
        ? "Buy signals require take-profit above entry and stop-loss below entry."
        : "Sell signals require take-profit below entry and stop-loss above entry."
  ));
  checks.push(buildCheck(
    "signal_symbol",
    symbol ? "allowed" : "blocked",
    symbol
      ? `Signal symbol normalized to supported crypto spot symbol ${symbol}.`
      : "crypto_symbol_invalid_for_market"
  ));
  checks.push(buildCheck(
    "entitlement_auto_copy",
    autoCopyEntitlement.access === "allowed" ? "allowed" : "blocked",
    autoCopyEntitlement.access === "allowed"
      ? "Stage 16 Auto-Copy entitlement allows this student."
      : autoCopyEntitlement.reason
  ));
  checks.push(buildCheck(
    "crypto_autocopy_billing",
    candidate.cryptoAutoCopyBilling?.active ? "allowed" : "blocked",
    candidate.cryptoAutoCopyBilling?.active
      ? "Paid Crypto AutoCopy add-on is active."
      : candidate.cryptoAutoCopyBilling?.reason ?? "Paid Crypto AutoCopy add-on is required before routing."
  ));
  checks.push(buildCheck(
    "risk_posture",
    candidate.entitlements.riskPosture === "personal_account" ? "allowed" : "blocked",
    candidate.entitlements.riskPosture === "personal_account"
      ? "Student risk posture is personal account."
      : "Funded-account, prop-firm, or unknown risk posture stays Signal Alerts only."
  ));
  checks.push(buildCheck(
    "student_opt_in",
    candidate.preferences.optInState === "opted_in_paper" && candidate.preferences.paperTradingOnly
      ? "allowed"
      : "blocked",
    candidate.preferences.optInState === "opted_in_paper" && candidate.preferences.paperTradingOnly
      ? "Student opted into paper-mode crypto Auto-Copy."
      : "Student has not opted into paper-mode crypto Auto-Copy."
  ));
  checks.push(buildCheck(
    "student_pause",
    candidate.preferences.studentPaused ||
      candidate.preferences.optInState === "paused" ||
      autoCopyPreferences.studentPaused ||
      autoCopyPreferences.consentStatus === "paused" ||
      autoCopyPreferences.consentStatus === "revoked"
      ? "blocked"
      : "allowed",
    candidate.preferences.studentPaused ||
      candidate.preferences.optInState === "paused" ||
      autoCopyPreferences.studentPaused ||
      autoCopyPreferences.consentStatus === "paused" ||
      autoCopyPreferences.consentStatus === "revoked"
      ? "Student paused crypto Auto-Copy."
      : "Student pause is off."
  ));
  checks.push(buildCheck(
    "execution_mode",
    autoCopyPreferences.executionMode === "full_auto"
      ? "allowed"
      : autoCopyPreferences.executionMode === "confirm_before_execute"
        ? "requires_review"
        : "blocked",
    autoCopyPreferences.executionMode === "full_auto"
      ? "Student shared Auto-Copy mode allows full-auto crypto routing."
      : autoCopyPreferences.executionMode === "confirm_before_execute"
        ? "Student requires confirmation before execution."
        : "Student selected alerts-only mode."
  ));
  checks.push(buildCheck(
    "stale_signal",
    staleDecision.outcome === "route_normally"
      ? "allowed"
      : staleDecision.outcome === "require_confirmation"
        ? "requires_review"
        : "blocked",
    staleDecision.safeMessage
  ));
  checks.push(buildCheck(
    "platform_kill_switch",
    candidate.platformControl.killSwitchEnabled ? "blocked" : "allowed",
    candidate.platformControl.killSwitchEnabled
      ? candidate.platformControl.killSwitchReason || "Platform crypto Auto-Copy kill switch is enabled."
      : "Platform kill switch is off."
  ));
  checks.push(buildCheck(
    "workspace_kill_switch",
    candidate.workspaceControl.killSwitchEnabled ? "blocked" : "allowed",
    candidate.workspaceControl.killSwitchEnabled
      ? candidate.workspaceControl.killSwitchReason || "Workspace crypto Auto-Copy kill switch is enabled."
      : "Workspace kill switch is off."
  ));
  checks.push(buildCheck(
    "exchange_connection",
    selectedConnection ? "allowed" : "blocked",
    selectedConnection
      ? `Verified ${selectedConnection.exchange} connection metadata exists.`
      : "No verified Binance or Bybit connection metadata exists."
  ));
  checks.push(buildCheck(
    "permission_verification",
    selectedConnection?.permissionVerification === "passed" ? "allowed" : "blocked",
    selectedConnection?.permissionVerification === "passed"
      ? "Exchange permission verification passed."
      : "Exchange permission verification has not passed."
  ));
  checks.push(buildCheck(
    "withdrawal_permission",
    selectedConnection?.withdrawalPermission === "confirmed_disabled" ? "allowed" : "blocked",
    selectedConnection?.withdrawalPermission === "confirmed_disabled"
      ? "Withdrawals are confirmed disabled."
      : "Withdrawal permission is enabled, unknown, or unverified."
  ));
  checks.push(buildCheck(
    "connection_freshness",
    selectedConnection && isConnectionFresh(selectedConnection, now) ? "allowed" : "blocked",
    selectedConnection && isConnectionFresh(selectedConnection, now)
      ? "Exchange permission metadata was verified within the Stage 15C freshness window."
      : "Exchange permission metadata is missing or stale and must be refreshed."
  ));
  checks.push(buildCheck(
    "sandbox_only",
    selectedConnection && (platformSandboxOnly || workspaceSandboxOnly) && selectedConnection.environment === "production"
      ? "blocked"
      : "allowed",
    sandboxMessage({
      platformSandboxOnly,
      workspaceSandboxOnly,
      environment: selectedConnection?.environment
    })
  ));

  const allowedSymbolSet = new Set(candidate.preferences.allowedSymbols.map(canonicalSymbol));
  checks.push(buildCheck(
    "symbol_allowlist",
    allowedSymbolSet.size === 0 || allowedSymbolSet.has(canonicalSymbol(symbol)) ? "allowed" : "blocked",
    allowedSymbolSet.size === 0 || allowedSymbolSet.has(canonicalSymbol(symbol))
      ? "Student symbol allowlist permits this signal."
      : "Student symbol allowlist does not permit this signal."
  ));
  checks.push(buildCheck(
    "max_risk_per_trade",
    candidate.preferences.maxRiskPercentPerTrade > 0 && candidate.preferences.maxRiskPercentPerTrade <= 10
      ? "allowed"
      : "blocked",
    candidate.preferences.maxRiskPercentPerTrade > 0 && candidate.preferences.maxRiskPercentPerTrade <= 10
      ? `Max risk per trade is capped at ${candidate.preferences.maxRiskPercentPerTrade}%.`
      : "Max risk per trade is outside server-bounded limits."
  ));
  checks.push(buildCheck(
    "max_daily_loss",
    candidate.preferences.maxDailyLossPercent > 0 && candidate.preferences.maxDailyLossPercent <= 50
      ? "allowed"
      : "blocked",
    candidate.preferences.maxDailyLossPercent > 0 && candidate.preferences.maxDailyLossPercent <= 50
      ? "Daily loss limit is recorded for the future worker; Stage 15C has no fill ledger yet."
      : "Daily loss limit is outside server-bounded limits."
  ));
  checks.push(buildCheck(
    "max_open_trades",
    candidate.preferences.maxOpenTrades > 0 && candidate.preferences.maxOpenTrades <= 25
      ? "allowed"
      : "blocked",
    candidate.preferences.maxOpenTrades > 0 && candidate.preferences.maxOpenTrades <= 25
      ? "Max open trades is recorded for the future worker; Stage 15C has no open-order ledger yet."
      : "Max open trades is outside server-bounded limits."
  ));

  const blockedCheck = checks.find((check) => check.status === "blocked");

  if (blockedCheck) {
    return {
      status: "blocked",
      checks,
      blockedReason: blockedCheck.message,
      symbol,
      connection: selectedConnection
    };
  }

  const reviewCheck = checks.find((check) => check.status === "requires_review");

  if (reviewCheck) {
    return {
      status: "requires_review",
      checks,
      blockedReason: reviewCheck.message,
      symbol,
      connection: selectedConnection
    };
  }

  return {
    status: "allowed",
    checks,
    symbol,
    connection: selectedConnection
  };
}
