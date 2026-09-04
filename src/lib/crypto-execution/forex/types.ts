import type {
  ForexConnectionEnvironment,
  ForexConnectionProvider,
  ForexConnectionReadinessStatus,
  ForexConnectionStatus
} from "@/types/crypto-execution";

export type ForexConnectionVerificationInput = {
  provider: ForexConnectionProvider;
  environment: ForexConnectionEnvironment;
  metaApiToken: string;
  metaApiAccountId: string;
};

export type ForexConnectionVerificationResult = {
  ok: boolean;
  provider: ForexConnectionProvider;
  environment: ForexConnectionEnvironment;
  status: ForexConnectionStatus;
  readinessStatus: ForexConnectionReadinessStatus;
  providerAccountFingerprint?: string;
  brokerName?: string;
  platform?: "mt4" | "mt5" | "unknown";
  serverName?: string;
  baseCurrency?: string;
  providerState?: string;
  providerConnectionStatus?: string;
  safeMessage: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
};

export type ForexConnectionVerificationAdapter = (
  input: ForexConnectionVerificationInput
) => Promise<ForexConnectionVerificationResult>;

export type ForexDemoOrderInput = {
  provider: ForexConnectionProvider;
  environment: "demo";
  metaApiToken: string;
  metaApiAccountId: string;
  symbol: string;
  side: "buy" | "sell";
  volume: number;
  stopLoss?: number;
  takeProfit?: number;
  clientOrderId: string;
};

export type ForexLiveCanaryOrderInput = {
  provider: ForexConnectionProvider;
  environment: "production";
  liveCanary: true;
  metaApiToken: string;
  metaApiAccountId: string;
  symbol: string;
  side: "buy" | "sell";
  volume: number;
  stopLoss?: number;
  takeProfit?: number;
  clientOrderId: string;
};

export type ForexDemoOrderStatus =
  | "submitted"
  | "filled"
  | "partially_filled"
  | "cancelled"
  | "rejected"
  | "unknown";

export type ForexDemoOrderResult = {
  ok: boolean;
  provider: ForexConnectionProvider;
  environment: "demo" | "production";
  status: ForexDemoOrderStatus;
  providerOrderId?: string;
  providerOrderRef?: string;
  providerHttpStatus?: number;
  canonicalSymbol?: string;
  providerSymbol?: string;
  safeMessage: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
  sanitizedProviderErrorCode?: string;
  sanitizedProviderErrorMessage?: string;
};

export type ForexLiveCanaryOrderResult = ForexDemoOrderResult & {
  environment: "production";
};

export type ForexDemoOrderStatusInput = {
  provider: ForexConnectionProvider;
  environment: "demo";
  metaApiToken: string;
  metaApiAccountId: string;
  providerOrderId?: string;
  clientOrderId: string;
};

export type ForexDemoOrderCancelInput = ForexDemoOrderStatusInput;

export type ForexDemoOrderPlacementAdapter = {
  submitOrder(input: ForexDemoOrderInput): Promise<ForexDemoOrderResult>;
  lookupOrder(input: ForexDemoOrderStatusInput): Promise<ForexDemoOrderResult>;
  cancelOrder(input: ForexDemoOrderCancelInput): Promise<ForexDemoOrderResult>;
};

export type ForexLiveCanaryOrderPlacementAdapter = {
  submitOrder(input: ForexLiveCanaryOrderInput): Promise<ForexLiveCanaryOrderResult>;
};
