import "server-only";

import { createHmac } from "node:crypto";
import { getStudentCryptoExecutionOverview } from "@/lib/crypto-execution/crypto-execution-repository";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import type {
  AutoCopyMarket,
  CryptoAutoCopyBillingStatus,
  ExchangeConnectionSummary,
  ForexAutoCopyBillingStatus,
  ForexProvisionedAccountSummary,
  ForexProvisioningStatus,
  StudentCryptoExecutionOverviewResponse
} from "@/types/crypto-execution";
import type {
  StudentCopierConnectionSummary,
  StudentCopierMarketControls,
  StudentCopierOverviewResponse,
  StudentCopierProductSummary,
  StudentCopierProductStatus,
  StudentCopierSetupStatus
} from "@/types/student-copier";

const ACTION_REF_PREFIX = "copier_action";
const MIN_PRODUCTION_ACTION_SECRET_LENGTH = 32;

function actionSecret() {
  const configured = process.env.STUDENT_COPIER_ACTION_REF_SECRET?.trim();

  if (process.env.NODE_ENV === "production") {
    if (!configured || configured.length < MIN_PRODUCTION_ACTION_SECRET_LENGTH) {
      throw new AdminApiError(
        500,
        "copier_action_secret_unavailable",
        "Copier connection actions are temporarily unavailable."
      );
    }

    return configured;
  }

  return configured && configured.length >= 16
    ? configured
    : "tradehub-local-student-copier-action-ref";
}

function makeConnectionActionRef(actor: VerifiedStudent, connectionId: string) {
  const digest = createHmac("sha256", actionSecret())
    .update(`${actor.workspaceId}:${actor.studentId}:${connectionId}`)
    .digest("base64url")
    .slice(0, 34);

  return `${ACTION_REF_PREFIX}_${digest}`;
}

export function resolveStudentCopierConnectionActionRef(
  actor: VerifiedStudent,
  overview: StudentCryptoExecutionOverviewResponse,
  actionRef: unknown
) {
  const cleaned = typeof actionRef === "string" ? actionRef.trim() : "";

  if (!cleaned || cleaned.length > 80 || !cleaned.startsWith(`${ACTION_REF_PREFIX}_`)) {
    throw new AdminApiError(400, "invalid_copier_action", "That Copier connection action is unavailable.");
  }

  const connection = overview.connections.find((candidate) =>
    makeConnectionActionRef(actor, candidate.connectionId) === cleaned
  );

  if (!connection) {
    throw new AdminApiError(404, "copier_action_not_found", "That Copier connection action was not found.");
  }

  return connection.connectionId;
}

function productStatus(
  value: CryptoAutoCopyBillingStatus | ForexAutoCopyBillingStatus | undefined
): StudentCopierProductStatus {
  if (value === "active_paid") return "active";
  if (value === "payment_pending") return "payment_pending";
  if (value === "past_due") return "past_due";
  if (value === "cancelled") return "cancelled";
  if (value === "non_renewing") return "non_renewing";
  if (value === "cancellation_pending") return "cancellation_pending";
  if (value === "expired") return "expired";
  if (value === "payment_failed") return "failed";
  if (value === "needs_attention" || value === "unknown") return "needs_attention";
  return "purchase_needed";
}

function productStatusLabel(value: StudentCopierProductStatus) {
  switch (value) {
    case "active":
      return "Active";
    case "payment_pending":
      return "Payment pending";
    case "past_due":
      return "Past due";
    case "failed":
      return "Failed";
    case "needs_attention":
      return "Needs attention";
    case "cancelled":
      return "Cancelled";
    case "non_renewing":
      return "Not renewing";
    case "cancellation_pending":
      return "Cancellation pending";
    case "expired":
      return "Expired";
    case "unavailable":
      return "Unavailable";
    case "purchase_needed":
    default:
      return "Purchase needed";
  }
}

function productReason(status: StudentCopierProductStatus) {
  switch (status) {
    case "active":
      return "Trade Copier is active. Crypto Setup and Forex Setup are available.";
    case "payment_pending":
      return "Trade Copier checkout is pending. Setup unlocks only after TradeHub verifies payment.";
    case "past_due":
      return "Trade Copier access is past due. Contact support or renew before setup can continue.";
    case "failed":
      return "Trade Copier payment was not completed. Start checkout again to unlock setup.";
    case "needs_attention":
      return "Trade Copier payment needs support before setup can continue.";
    case "cancelled":
      return "Trade Copier is cancelled. Purchase again before setup can continue.";
    case "non_renewing":
      return "Trade Copier will not renew. Setup is locked unless support reactivates access.";
    case "cancellation_pending":
      return "Trade Copier cancellation is being confirmed. Crypto Setup and Forex Setup are locked.";
    case "expired":
      return "Trade Copier access has expired. Contact support or purchase again to continue.";
    case "unavailable":
      return "Trade Copier is unavailable for this student profile. Contact your instructor.";
    case "purchase_needed":
    default:
      return "Purchase Trade Copier once to unlock both Crypto Setup and Forex Setup.";
  }
}

function unifiedTradeCopierSubscription({
  cryptoStatus,
  cryptoEntitled,
  cryptoCurrentPeriodEnd,
  forexStatus,
  forexEntitled,
  forexCurrentPeriodEnd
}: {
  cryptoStatus: StudentCopierProductStatus;
  cryptoEntitled: boolean;
  cryptoCurrentPeriodEnd?: string;
  forexStatus: StudentCopierProductStatus;
  forexEntitled: boolean;
  forexCurrentPeriodEnd?: string;
}): StudentCopierProductSummary {
  const entitled = cryptoEntitled || forexEntitled;
  const orderedStatuses: StudentCopierProductStatus[] = [
    "active",
    "payment_pending",
    "past_due",
    "failed",
    "needs_attention",
    "cancelled",
    "non_renewing",
    "expired",
    "unavailable",
    "purchase_needed"
  ];
  const status = entitled
    ? "active"
    : orderedStatuses.find((candidate) => candidate === cryptoStatus || candidate === forexStatus) ?? "purchase_needed";

  return {
    status,
    statusLabel: productStatusLabel(status),
    entitled,
    active: entitled,
    reason: productReason(status),
    currentPeriodEnd: cryptoCurrentPeriodEnd ?? forexCurrentPeriodEnd
  };
}

function setupStatusLabel(value: StudentCopierSetupStatus) {
  switch (value) {
    case "setup_received":
      return "Setup received";
    case "ready_for_review":
      return "Ready for review";
    case "connected":
      return "Connected";
    case "needs_attention":
      return "Needs attention";
    case "disabled":
      return "Disabled";
    case "unavailable":
      return "Unavailable";
    case "not_started":
    default:
      return "Not started";
  }
}

function cryptoConnectionStatus(connection: ExchangeConnectionSummary): StudentCopierSetupStatus {
  if (connection.status === "verified") return "connected";
  if (connection.status === "pending_verification") return "ready_for_review";
  if (connection.status === "disabled") return "disabled";
  if (connection.status === "rejected" || connection.status === "error") return "needs_attention";
  return "not_started";
}

function mapConnection(
  actor: VerifiedStudent,
  connection: ExchangeConnectionSummary
): StudentCopierConnectionSummary {
  const status = cryptoConnectionStatus(connection);

  return {
    actionRef: makeConnectionActionRef(actor, connection.connectionId),
    exchange: connection.exchange,
    accountKind: connection.environment === "production" ? "real_account" : "test_account",
    status,
    statusLabel: setupStatusLabel(status),
    connectionLabel: connection.connectionLabel || `${connection.exchange} account`,
    permissionCheck: connection.permissionVerification,
    withdrawalAccess: connection.withdrawalPermission,
    lastCheckedAt: connection.lastHealthCheckAt,
    description: status === "connected"
      ? "Permission check passed and withdrawal access is disabled."
      : status === "disabled"
        ? "This connection is disabled."
        : status === "needs_attention"
          ? "This connection needs attention before copying can continue."
          : "Submit or refresh this connection when you are ready."
  };
}

function cryptoSetupStatus(
  entitled: boolean,
  connections: ExchangeConnectionSummary[]
): StudentCopierSetupStatus {
  if (!entitled) return "unavailable";
  if (connections.some((connection) => connection.status === "verified")) return "connected";
  if (connections.some((connection) => connection.status === "rejected" || connection.status === "error")) {
    return "needs_attention";
  }
  if (connections.some((connection) => connection.status === "pending_verification")) return "ready_for_review";
  return "not_started";
}

function forexAccountStatus(account: ForexProvisionedAccountSummary | undefined): StudentCopierSetupStatus {
  if (!account) return "not_started";
  if (account.active && account.status === "provisioning_dry_run_complete") return "ready_for_review";
  if (account.active) return "connected";
  if (account.status === "disabled" || account.status === "cleanup_complete" || account.status === "cleanup_pending") {
    return "disabled";
  }
  if (account.status === "failed") return "needs_attention";
  return "setup_received";
}

function forexSetupStatus(
  entitled: boolean,
  status: ForexProvisioningStatus | undefined,
  account: ForexProvisionedAccountSummary | undefined
): StudentCopierSetupStatus {
  if (!entitled) return "unavailable";
  if (account) return forexAccountStatus(account);
  if (status === "ready_to_connect") return "not_started";
  if (status === "provisioning_dry_run_complete") return "ready_for_review";
  if (status === "disabled" || status === "cancelled" || status === "cleanup_complete" || status === "cleanup_pending") {
    return "disabled";
  }
  if (status === "failed") return "needs_attention";
  return "not_started";
}

function setupDescription(market: AutoCopyMarket, status: StudentCopierSetupStatus) {
  const marketLabel = market === "crypto" ? "Crypto Copier" : "Forex Copier";

  switch (status) {
    case "connected":
      return `${marketLabel} setup is connected. Keep consent and risk controls current.`;
    case "setup_received":
      return `${marketLabel} setup was received and is waiting for the next review step.`;
    case "ready_for_review":
      return `${marketLabel} setup is ready for review.`;
    case "needs_attention":
      return `${marketLabel} setup needs attention before copying can continue.`;
    case "disabled":
      return `${marketLabel} setup is disabled.`;
    case "unavailable":
      return `Purchase Trade Copier before ${marketLabel} setup can continue.`;
    case "not_started":
    default:
      return `Start ${marketLabel} setup when you are ready.`;
  }
}

function mapControls(
  overview: StudentCryptoExecutionOverviewResponse,
  market: AutoCopyMarket
): StudentCopierMarketControls {
  const preferences = overview.autoCopyPreferences[market];

  return {
    market,
    copyMode: preferences.executionMode,
    sizingMode: preferences.sizingMode,
    staleSignalPolicy: preferences.staleSignalPolicy,
    staleSignalMaxAgeSeconds: preferences.staleSignalMaxAgeSeconds,
    maxRiskPercentPerTrade: preferences.maxRiskPercentPerTrade,
    maxFixedNotional: preferences.maxFixedNotional,
    maxDailyLoss: preferences.maxDailyLoss,
    maxOpenTrades: preferences.maxOpenTrades,
    allowedSymbols: market === "crypto" ? preferences.allowedSymbols : preferences.allowedPairs,
    paused: preferences.studentPaused,
    consentStatus: preferences.consentStatus,
    disclosureAccepted: Boolean(preferences.executionFairnessDisclosureAcceptedAt),
    suitabilityAccepted: Boolean(preferences.suitabilityAcknowledgedAt)
  };
}

export function mapStudentCopierOverview(
  actor: VerifiedStudent,
  overview: StudentCryptoExecutionOverviewResponse
): StudentCopierOverviewResponse {
  const cryptoProductStatus = productStatus(overview.cryptoAutoCopy.billing.status);
  const forexProductStatus = productStatus(overview.forexProvisioning?.billing.status);
  const cryptoEntitled = overview.cryptoAutoCopy.billing.entitled;
  const forexEntitled = Boolean(overview.forexProvisioning?.billing.entitled);
  const subscription = unifiedTradeCopierSubscription({
    cryptoStatus: cryptoProductStatus,
    cryptoEntitled,
    cryptoCurrentPeriodEnd: overview.cryptoAutoCopy.billing.currentPeriodEnd,
    forexStatus: forexProductStatus,
    forexEntitled,
    forexCurrentPeriodEnd: undefined
  });
  const eligible = overview.student.autoCopyAccess === "allowed" &&
    overview.student.riskPosture === "personal_account";
  const setupAuthorized = subscription.entitled && eligible;
  const cryptoSetup = cryptoSetupStatus(setupAuthorized, overview.connections);
  const forexCurrentAccount = overview.forexProvisioning?.currentAccount;
  const forexSetup = forexSetupStatus(setupAuthorized, overview.forexProvisioning?.status, forexCurrentAccount);
  const updatedAt = [
    overview.cryptoAutoCopy.updatedAt,
    overview.forexProvisioning?.updatedAt
  ].filter(Boolean).sort().at(-1) ?? new Date().toISOString();

  return {
    ok: true,
    workspace: {
      name: "TradeHub Workspace"
    },
    eligibility: {
      eligible,
      riskPosture: overview.student.riskPosture,
      statusLabel: eligible ? "Eligible" : "Unavailable",
      reason: eligible
        ? "You can purchase the Trade Copier add-on and complete setup."
        : overview.student.riskPosture !== "personal_account"
          ? "Copier setup is available only for personal trading accounts."
          : "Copier setup is unavailable for this student profile. Contact your instructor."
    },
    subscription,
    products: {
      crypto: {
        setup: {
          status: cryptoSetup,
          statusLabel: setupStatusLabel(cryptoSetup),
          description: setupDescription("crypto", cryptoSetup),
          connections: overview.connections.map((connection) => mapConnection(actor, connection)),
          risk: {
            paused: overview.preferences.studentPaused,
            maxRiskPercentPerTrade: overview.preferences.maxRiskPercentPerTrade,
            maxDailyLossPercent: overview.preferences.maxDailyLossPercent,
            maxOpenTrades: overview.preferences.maxOpenTrades,
            allowedSymbols: overview.preferences.allowedSymbols
          },
          controls: mapControls(overview, "crypto")
        }
      },
      forex: {
        setup: {
          status: forexSetup,
          statusLabel: setupStatusLabel(forexSetup),
          description: setupDescription("forex", forexSetup),
          canSubmitSetup: Boolean(overview.forexProvisioning?.canSubmitBrokerDetails),
          account: forexCurrentAccount
            ? {
                platform: forexCurrentAccount.platform,
                status: forexAccountStatus(forexCurrentAccount),
                statusLabel: setupStatusLabel(forexAccountStatus(forexCurrentAccount)),
                label: forexCurrentAccount.label,
                active: forexCurrentAccount.active,
                updatedAt: forexCurrentAccount.updatedAt
              }
            : undefined,
          controls: mapControls(overview, "forex")
        }
      }
    },
    updatedAt
  };
}

export async function getStudentCopierOverview(actor: VerifiedStudent) {
  return mapStudentCopierOverview(actor, await getStudentCryptoExecutionOverview(actor));
}
