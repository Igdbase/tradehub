import type {
  AutoCopyMarket,
  CrossAssetAutoCopyConsentStatus,
  CrossAssetAutoCopyExecutionMode,
  CrossAssetAutoCopySizingMode,
  CrossAssetStaleSignalPolicy,
  CryptoExchangeId,
  PermissionVerificationStatus,
  WithdrawalPermissionState
} from "@/types/crypto-execution";
import type { StudentRiskPosture } from "@/types/entitlements";
import type { IsoDateString } from "@/types/workspace";

export type StudentCopierProductStatus =
  | "purchase_needed"
  | "payment_pending"
  | "active"
  | "past_due"
  | "cancelled"
  | "non_renewing"
  | "cancellation_pending"
  | "expired"
  | "failed"
  | "needs_attention"
  | "unavailable";

export type StudentCopierSetupStatus =
  | "not_started"
  | "setup_received"
  | "ready_for_review"
  | "connected"
  | "needs_attention"
  | "disabled"
  | "unavailable";

export type StudentCopierCheckoutStartResponse = {
  ok: true;
  authorizationUrl: string;
};

export type StudentCopierMutationResponse = {
  ok: true;
  message?: string;
  overview: StudentCopierOverviewResponse;
};

export type StudentCopierConnectionSummary = {
  actionRef: string;
  exchange: CryptoExchangeId;
  accountKind: "test_account" | "real_account";
  status: StudentCopierSetupStatus;
  statusLabel: string;
  connectionLabel: string;
  permissionCheck: PermissionVerificationStatus;
  withdrawalAccess: WithdrawalPermissionState;
  lastCheckedAt?: IsoDateString;
  description: string;
};

export type StudentCopierRiskSettings = {
  paused: boolean;
  maxRiskPercentPerTrade: number;
  maxDailyLossPercent: number;
  maxOpenTrades: number;
  allowedSymbols: string[];
};

export type StudentCopierMarketControls = {
  market: AutoCopyMarket;
  copyMode: CrossAssetAutoCopyExecutionMode;
  sizingMode: CrossAssetAutoCopySizingMode;
  staleSignalPolicy: CrossAssetStaleSignalPolicy;
  staleSignalMaxAgeSeconds: number;
  maxRiskPercentPerTrade: number;
  maxFixedNotional: number;
  maxDailyLoss: number;
  maxOpenTrades: number;
  allowedSymbols: string[];
  paused: boolean;
  consentStatus: CrossAssetAutoCopyConsentStatus;
  disclosureAccepted: boolean;
  suitabilityAccepted: boolean;
};

export type StudentCopierProductSummary = {
  status: StudentCopierProductStatus;
  statusLabel: string;
  entitled: boolean;
  active: boolean;
  reason: string;
  currentPeriodEnd?: IsoDateString;
};

export type StudentCopierCryptoSetup = {
  status: StudentCopierSetupStatus;
  statusLabel: string;
  description: string;
  connections: StudentCopierConnectionSummary[];
  risk: StudentCopierRiskSettings;
  controls: StudentCopierMarketControls;
};

export type StudentCopierForexSetup = {
  status: StudentCopierSetupStatus;
  statusLabel: string;
  description: string;
  canSubmitSetup: boolean;
  account?: {
    platform: "mt4" | "mt5";
    status: StudentCopierSetupStatus;
    statusLabel: string;
    label?: string;
    active: boolean;
    updatedAt: IsoDateString;
  };
  controls: StudentCopierMarketControls;
};

export type StudentCopierOverviewResponse = {
  ok: true;
  workspace: {
    name: string;
    handle?: string;
  };
  eligibility: {
    eligible: boolean;
    riskPosture: StudentRiskPosture;
    statusLabel: string;
      reason: string;
  };
  subscription: StudentCopierProductSummary;
  products: {
    crypto: {
      setup: StudentCopierCryptoSetup;
    };
    forex: {
      setup: StudentCopierForexSetup;
    };
  };
  updatedAt: IsoDateString;
};
