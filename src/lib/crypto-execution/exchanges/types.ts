import type {
  CryptoExchangeEnvironment,
  CryptoExchangeId,
  PermissionVerificationStatus,
  WithdrawalPermissionState
} from "@/types/crypto-execution";

export type ExchangePermissionCheckInput = {
  apiKey: string;
  apiSecret: string;
  environment: CryptoExchangeEnvironment;
};

export type ExchangeOrderPlacementInput = ExchangePermissionCheckInput & {
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  quantity?: string;
  quoteOrderQty?: string;
  price?: string;
  clientOrderId: string;
  productionCanary?: boolean;
};

export type ExchangeOrderLookupInput = ExchangePermissionCheckInput & {
  symbol: string;
  clientOrderId: string;
  exchangeOrderId?: string;
  productionCanary?: boolean;
};

export type ExchangeBalancePrecheckStatus =
  | "sufficient"
  | "insufficient"
  | "unavailable"
  | "credential_missing"
  | "exchange_rejected"
  | "not_supported_yet";

export type ExchangeBalancePrecheckInput = ExchangePermissionCheckInput & {
  symbol: string;
  quoteAsset?: string;
  requiredQuoteAmount: string;
  productionCanary?: boolean;
};

export type ExchangePermissionCheckResult = {
  ok: boolean;
  exchange: CryptoExchangeId;
  permissionVerification: PermissionVerificationStatus;
  withdrawalPermission: WithdrawalPermissionState;
  keyFingerprint?: string;
  safeMessage: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
};

export type ExchangePermissionAdapter = (
  input: ExchangePermissionCheckInput
) => Promise<ExchangePermissionCheckResult>;

export type ExchangeOrderPlacementResult = {
  ok: boolean;
  exchange: CryptoExchangeId;
  exchangeOrderId?: string;
  exchangeClientOrderId?: string;
  status?: string;
  safeMessage: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
};

export type ExchangeOrderPlacementAdapter = (
  input: ExchangeOrderPlacementInput
) => Promise<ExchangeOrderPlacementResult>;

export type ExchangeOrderLookupResult = ExchangeOrderPlacementResult & {
  cumulativeFilledQuantity?: string;
  cumulativeFilledValue?: string;
};

export type ExchangeOrderLookupAdapter = (
  input: ExchangeOrderLookupInput
) => Promise<ExchangeOrderLookupResult>;

export type ExchangeBalancePrecheckResult = {
  ok: boolean;
  exchange: CryptoExchangeId;
  environment: CryptoExchangeEnvironment;
  status: ExchangeBalancePrecheckStatus;
  checkedAsset?: string;
  safeMessage: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  checkedAt: string;
};

export type ExchangeBalancePrecheckAdapter = (
  input: ExchangeBalancePrecheckInput
) => Promise<ExchangeBalancePrecheckResult>;
